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

const CACHE_VERSION = 'v4'
const SHELL_CACHE   = `mt-shell-${CACHE_VERSION}`
const IMAGE_CACHE   = `mt-images-${CACHE_VERSION}`
const API_CACHE     = `mt-api-${CACHE_VERSION}`
const MY_CACHES     = [SHELL_CACHE, IMAGE_CACHE, API_CACHE]

// ── Install ─────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) =>
      cache.addAll(['/', '/index.html', '/favicon.svg', '/manifest.webmanifest'])
        .catch(() => { /* first-install offline — non-fatal */ })
    )
  )
  self.skipWaiting()
})

// ── Activate — clean up old caches ──────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((n) => n.startsWith('mt-') && !MY_CACHES.includes(n))
          .map((n) => caches.delete(n))
      )
    )
  )
  self.clients.claim()
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
async function cacheFirst(request, cacheName) {
  const cache  = await caches.open(cacheName)
  const cached = await cache.match(request)
  if (cached) return cached
  try {
    const res = await fetch(request)
    if (res.ok) cache.put(request, res.clone())
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
