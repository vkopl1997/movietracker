// ──────────────────────────────────────────────────────────────────────
// MovieTracker service worker — hand-rolled, no Workbox.
//
// Cache strategies:
//   1. Static built assets (/assets/*) → CacheFirst (hashed filenames are safe)
//   2. TMDb images                     → CacheFirst (immutable URLs)
//   3. TMDb API                        → NetworkFirst (5s timeout)
//   4. Same-origin HTML / nav          → NetworkFirst with offline fallback
//
// Bumping CACHE_VERSION on deploy invalidates ALL caches.
// We update the version with each deploy via a sed step (see scripts).
// ──────────────────────────────────────────────────────────────────────

const CACHE_VERSION = 'v7'
const SHELL_CACHE   = `mt-shell-${CACHE_VERSION}`
const IMAGE_CACHE   = `mt-images-${CACHE_VERSION}`
const API_CACHE     = `mt-api-${CACHE_VERSION}`
const MY_CACHES     = [SHELL_CACHE, IMAGE_CACHE, API_CACHE]

// ── Install ─────────────────────────────────────────────────────────
// IMPORTANT: use `cache: 'reload'` so the install bypasses the HTTP cache
// AND any older SW cache layer. Otherwise a stale `index.html` (pointing
// at the previous bundle's hashed JS) can get baked into the new SW's
// shell cache on first install and stick around until the next bump.
self.addEventListener('install', (event) => {
  const urls = ['/', '/index.html', '/favicon.svg', '/manifest.webmanifest']
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) =>
      Promise.all(
        urls.map((url) =>
          fetch(new Request(url, { cache: 'reload' }))
            .then((res) => res.ok ? cache.put(url, res) : null)
            .catch(() => { /* first-install offline — non-fatal */ })
        )
      )
    )
  )
  self.skipWaiting()
})

// ── Activate — clean up old caches + notify clients to reload ──────
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys()
    await Promise.all(
      names
        .filter((n) => n.startsWith('mt-') && !MY_CACHES.includes(n))
        .map((n) => caches.delete(n))
    )
    await self.clients.claim()

    // Belt-and-suspenders: broadcast to any controlled clients in case the
    // `controllerchange` listener on the page didn't fire (older browsers,
    // edge cases). Pages can choose to reload on receiving this.
    const clients = await self.clients.matchAll({ type: 'window' })
    for (const client of clients) {
      client.postMessage({ type: 'SW_UPDATED', version: CACHE_VERSION })
    }
  })())
})

// ── Fetch — route requests through strategies ──────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)

  if (url.hostname === 'image.tmdb.org') {
    event.respondWith(cacheFirst(request, IMAGE_CACHE))
    return
  }

  if (url.hostname === 'api.themoviedb.org') {
    event.respondWith(networkFirst(request, API_CACHE, 5000))
    return
  }

  if (url.origin === self.location.origin) {
    if (url.pathname.startsWith('/assets/')) {
      event.respondWith(cacheFirst(request, SHELL_CACHE))
    } else {
      event.respondWith(networkFirst(request, SHELL_CACHE, 3000))
    }
  }
  // Cross-origin (Supabase, Google Fonts) — let browser handle it
})

// ── Strategy helpers ───────────────────────────────────────────────
// cacheFirst: serve from cache when present, otherwise go to network.
// If the network returns a hard failure (404 / 5xx), evict the entry
// from cache and DO NOT cache the failure. This matters for hashed
// /assets/* — when a stale `index.html` references a JS hash Vercel
// has since deleted, we want the request to fail in a way the bail-out
// in index.html can detect, not silently cache a 404.
async function cacheFirst(request, cacheName) {
  const cache  = await caches.open(cacheName)
  const cached = await cache.match(request)
  if (cached) return cached
  try {
    const res = await fetch(request)
    if (res.ok) {
      cache.put(request, res.clone())
    } else {
      // Don't poison the cache with errors.
      await cache.delete(request)
    }
    return res
  } catch {
    return new Response('Offline', { status: 503 })
  }
}

async function networkFirst(request, cacheName, timeoutMs) {
  const cache = await caches.open(cacheName)
  try {
    const res = await Promise.race([
      fetch(request),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), timeoutMs)
      ),
    ])
    if (res.ok) cache.put(request, res.clone())
    return res
  } catch {
    const cached = await cache.match(request)
    if (cached) return cached
    return (await cache.match('/index.html')) ??
           new Response('Offline', { status: 503 })
  }
}
