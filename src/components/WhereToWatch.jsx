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
import CountryPicker from './CountryPicker'

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

  // Countries that have ANY provider data for this title.
  // The picker is searchable across all countries, but uses this list to
  // grey out the ones that won't show anything useful when selected.
  const countriesWithData = useMemo(
    () => providers ? Object.keys(providers) : [],
    [providers]
  )

  if (loading) return null
  if (!providers) return null

  const regionData = providers[country]

  // Group categories into two columns to match Linear's Status/Personal
  // pattern. Left = ways to watch as part of a subscription / free; Right =
  // transactional (rent / buy). Stream and Buy end up at the top of each
  // column, sitting next to each other as requested.
  const leftHasAny  = regionData && (regionData.flatrate?.length || regionData.free?.length || regionData.ads?.length)
  const rightHasAny = regionData && (regionData.rent?.length || regionData.buy?.length)

  return (
    <section className="mb-12 w-full">
      <div className="
        rounded-3xl bg-gradient-to-br from-brand/[0.10] via-white/[0.02] to-transparent border border-brand/30
        shadow-2xl shadow-black/30
        overflow-hidden
      ">

        {/* ── Section: header (title + region context line) ── */}
        <div className="px-5 sm:px-6 pt-4 pb-4 border-b border-white/[0.06]">
          <h2 className="text-[15px] font-semibold tracking-tight text-white">
            Where to watch
          </h2>
          {/* Linear-style context line — small label + inline picker chip */}
          <div className="mt-1.5 flex items-center gap-2 text-[12px] text-white/45">
            <span>Showing providers for</span>
            <CountryPicker
              value={country}
              onChange={setCountry}
              withData={countriesWithData}
            />
          </div>
        </div>

        {/* ── Section: body — empty state OR 2-column provider grid ── */}
        {!regionData && (
          <div className="px-5 sm:px-6 py-5 text-[13px] text-white/65 border-b border-white/[0.06]">
            Not available to stream in <strong className="text-white/85">{countryName(country)}</strong>.
            Try switching regions above, or check <a
              href="https://www.justwatch.com" target="_blank" rel="noopener noreferrer"
              className="text-brand hover:underline"
            >JustWatch</a>.
          </div>
        )}

        {regionData && (leftHasAny || rightHasAny) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 sm:divide-x divide-white/[0.06] border-b border-white/[0.06]">
            {/* Left column — subscription / free */}
            <div className="p-4 sm:p-5 space-y-4">
              <ProviderRow label="Stream"   providers={regionData.flatrate} title={title} fallbackLink={regionData.link} />
              <ProviderRow label="Free"     providers={regionData.free}     title={title} fallbackLink={regionData.link} />
              <ProviderRow label="With ads" providers={regionData.ads}      title={title} fallbackLink={regionData.link} />
            </div>

            {/* Right column — transactional */}
            <div className="p-4 sm:p-5 space-y-4 border-t sm:border-t-0 border-white/[0.06]">
              <ProviderRow label="Buy"  providers={regionData.buy}  title={title} fallbackLink={regionData.link} />
              <ProviderRow label="Rent" providers={regionData.rent} title={title} fallbackLink={regionData.link} />
            </div>
          </div>
        )}

        {/* ── Section: footer (JustWatch link + attribution) ── */}
        <div className="px-5 sm:px-6 py-3.5 flex items-center justify-between gap-3 flex-wrap">
          {regionData?.link ? (
            <a
              href={regionData.link}
              target="_blank" rel="noopener noreferrer"
              className="text-[13px] text-white/55 hover:text-white transition"
            >
              See full details on JustWatch ↗
            </a>
          ) : <span />}
          <p className="text-[11px] text-white/35">
            via <a
              href="https://www.justwatch.com" target="_blank" rel="noopener noreferrer"
              className="hover:text-white/60 transition"
            >JustWatch</a>
          </p>
        </div>
      </div>
    </section>
  )
}

// One labeled row of provider logo links. Hidden if the category is empty.
function ProviderRow({ label, providers, title, fallbackLink }) {
  if (!providers || providers.length === 0) return null
  const sorted = [...providers].sort((a, b) => (a.display_priority ?? 99) - (b.display_priority ?? 99))

  return (
    <div>
      <div className="text-[10px] font-medium tracking-[0.15em] uppercase text-white/40 mb-2">
        {label}
      </div>
      <div className="flex flex-wrap gap-2">
        {sorted.map((p) => (
          <a
            key={p.provider_id}
            href={getProviderLink(p, title, fallbackLink)}
            target="_blank"
            rel="noopener noreferrer"
            title={`Open "${title}" on ${p.provider_name}`}
            className="
              block w-10 h-10 rounded-md overflow-hidden shrink-0
              ring-1 ring-white/10
              transition hover:ring-brand hover:-translate-y-0.5
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
