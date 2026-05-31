// WhereToWatch — shows streaming/rent/buy availability for a movie or TV show.
//
// Data source: TMDb /watch/providers (powered by JustWatch).
//
// Click behavior:
//   - For known providers (Netflix, Disney+, etc.) we deep-link directly to a
//     search on that service's website with the title pre-filled
//   - For everything else we fall back to TMDb's region watch page (which
//     shows all providers and lets the user click through to each)
//   - Always opens in a new tab

import { useEffect, useMemo, useState } from 'react'
import { getWatchProviders, PROVIDER_LOGO_BASE } from '../lib/tmdb'

const STORAGE_KEY = 'mt_country'

// Browser → country code ("en-US" → "US", "ka-GE" → "GE")
function detectCountry() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored && stored.length === 2) return stored
    const locale = navigator.language || navigator.languages?.[0] || 'en-US'
    const cc = locale.split('-')[1]?.toUpperCase()
    if (cc && cc.length === 2) return cc
  } catch {}
  return 'US'
}

function countryFlag(code) {
  return [...code.toUpperCase()]
    .map((c) => String.fromCodePoint(127397 + c.charCodeAt(0)))
    .join('')
}

let regionNames
function countryName(code) {
  if (!regionNames) {
    try { regionNames = new Intl.DisplayNames(['en'], { type: 'region' }) } catch {}
  }
  return regionNames?.of(code) ?? code
}

// ── Provider deep-link map ──────────────────────────────────────────
// Each entry: provider_id → function(title) returning a URL.
// IDs come from TMDb's provider list. Title gets URL-encoded.
const PROVIDER_LINKS = {
  8:    (t) => `https://www.netflix.com/search?q=${encodeURIComponent(t)}`,                    // Netflix
  9:    (t) => `https://www.primevideo.com/search/ref=atv_nb_sr?phrase=${encodeURIComponent(t)}`, // Amazon Prime Video
  119:  (t) => `https://www.primevideo.com/search/ref=atv_nb_sr?phrase=${encodeURIComponent(t)}`, // Amazon Video
  337:  (t) => `https://www.disneyplus.com/search?q=${encodeURIComponent(t)}`,                 // Disney+
  350:  (t) => `https://tv.apple.com/search?term=${encodeURIComponent(t)}`,                    // Apple TV+
  2:    (t) => `https://tv.apple.com/search?term=${encodeURIComponent(t)}`,                    // Apple TV (rent/buy)
  384:  (t) => `https://play.max.com/search?q=${encodeURIComponent(t)}`,                       // HBO Max
  1899: (t) => `https://play.max.com/search?q=${encodeURIComponent(t)}`,                       // Max
  15:   (t) => `https://www.hulu.com/search?q=${encodeURIComponent(t)}`,                       // Hulu
  531:  (t) => `https://www.paramountplus.com/shows/?searchQuery=${encodeURIComponent(t)}`,    // Paramount+
  387:  (t) => `https://www.peacocktv.com/search?q=${encodeURIComponent(t)}`,                  // Peacock
  283:  (t) => `https://www.crunchyroll.com/search?q=${encodeURIComponent(t)}`,                // Crunchyroll
  192:  (t) => `https://www.youtube.com/results?search_query=${encodeURIComponent(t + ' movie')}`, // YouTube
  3:    (t) => `https://play.google.com/store/search?q=${encodeURIComponent(t)}&c=movies`,     // Google Play
  68:   (t) => `https://www.microsoft.com/en-us/search/shop/movies?q=${encodeURIComponent(t)}`,// Microsoft Store
  35:   (t) => `https://rakuten.tv/search?q=${encodeURIComponent(t)}`,                         // Rakuten TV
  11:   (t) => `https://www.mubi.com/search/films?query=${encodeURIComponent(t)}`,             // MUBI
  381:  (t) => `https://www.youtube.com/feed/storefront/movies?searchQuery=${encodeURIComponent(t)}`, // YouTube Premium
  43:   (t) => `https://www.starz.com/us/en/search/${encodeURIComponent(t)}`,                  // Starz
  191:  (t) => `https://www.youtube.com/results?search_query=${encodeURIComponent(t)}`,        // YouTube Free
}

// Given a provider, return the best URL to open when clicked.
// Falls back to TMDb's regional watch page (which lists every provider).
function getProviderLink(provider, title, fallback) {
  const builder = PROVIDER_LINKS[provider.provider_id]
  return builder ? builder(title) : fallback
}

function WhereToWatch({ mediaType, id, title }) {
  const [providers, setProviders] = useState(null)
  const [loading, setLoading]     = useState(true)
  const [country, setCountry]     = useState(detectCountry)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getWatchProviders(mediaType, id)
      .then((data) => { if (!cancelled) setProviders(data) })
      .catch(() => { if (!cancelled) setProviders({}) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [mediaType, id])

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, country) } catch {}
  }, [country])

  const availableCountries = useMemo(() => {
    if (!providers) return []
    const top = ['US', 'GB', 'GE', 'DE', 'FR', 'NL', 'ES', 'IT']
    const all = Object.keys(providers).sort()
    const topInData = top.filter((c) => all.includes(c))
    const rest = all.filter((c) => !top.includes(c))
    return [...topInData, ...rest]
  }, [providers])

  if (loading) return null
  if (!providers || availableCountries.length === 0) return null

  const regionData = providers[country]

  return (
    <section className="mb-12">
      <div className="flex items-baseline justify-between flex-wrap gap-3 mb-4">
        <h2 className="text-xl font-bold">Where to watch</h2>

        <select
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          className="
            px-3 py-1.5 rounded-full text-sm
            bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10
            border border-black/10 dark:border-white/10
            text-neutral-700 dark:text-white/70
            focus:outline-none focus:border-brand transition
          "
        >
          {availableCountries.map((c) => (
            <option key={c} value={c}>
              {countryFlag(c)} {countryName(c)}
            </option>
          ))}
        </select>
      </div>

      {!regionData && (
        <div className="p-6 rounded-xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 text-sm text-neutral-600 dark:text-white/70">
          Not available to stream in <strong>{countryName(country)}</strong>.
          Try switching regions above, or check <a
            href="https://www.justwatch.com" target="_blank" rel="noopener noreferrer"
            className="text-brand hover:underline"
          >JustWatch</a>.
        </div>
      )}

      {regionData && (
        <div className="space-y-5">
          <ProviderRow label="Stream"   providers={regionData.flatrate} title={title} fallbackLink={regionData.link} />
          <ProviderRow label="Rent"     providers={regionData.rent}     title={title} fallbackLink={regionData.link} />
          <ProviderRow label="Buy"      providers={regionData.buy}      title={title} fallbackLink={regionData.link} />
          <ProviderRow label="Free"     providers={regionData.free}     title={title} fallbackLink={regionData.link} />
          <ProviderRow label="With ads" providers={regionData.ads}      title={title} fallbackLink={regionData.link} />

          {regionData.link && (
            <a
              href={regionData.link}
              target="_blank" rel="noopener noreferrer"
              className="inline-block text-sm text-neutral-500 dark:text-white/50 hover:text-brand transition"
            >
              See full details on JustWatch ↗
            </a>
          )}
        </div>
      )}

      <p className="text-[11px] text-neutral-400 dark:text-white/40 mt-4">
        Streaming data via <a
          href="https://www.justwatch.com" target="_blank" rel="noopener noreferrer"
          className="hover:underline"
        >JustWatch</a>.
      </p>
    </section>
  )
}

// One labeled row of provider logo links. Hidden if the category is empty.
function ProviderRow({ label, providers, title, fallbackLink }) {
  if (!providers || providers.length === 0) return null
  const sorted = [...providers].sort((a, b) => (a.display_priority ?? 99) - (b.display_priority ?? 99))

  return (
    <div>
      <div className="text-xs font-semibold tracking-wider uppercase text-neutral-500 dark:text-white/50 mb-2">
        {label}
      </div>
      <div className="flex flex-wrap gap-2.5">
        {sorted.map((p) => (
          <a
            key={p.provider_id}
            href={getProviderLink(p, title, fallbackLink)}
            target="_blank"
            rel="noopener noreferrer"
            title={`Open "${title}" on ${p.provider_name}`}
            className="
              block w-12 h-12 rounded-lg overflow-hidden shrink-0
              ring-1 ring-black/10 dark:ring-white/10
              transition hover:ring-brand hover:-translate-y-0.5
              hover:shadow-lg hover:shadow-brand/20
              focus:outline-none focus:ring-2 focus:ring-brand
            "
          >
            <img
              src={`${PROVIDER_LOGO_BASE}${p.logo_path}`}
              alt={p.provider_name}
              loading="lazy"
              className="w-full h-full object-cover"
            />
          </a>
        ))}
      </div>
    </div>
  )
}

export default WhereToWatch
