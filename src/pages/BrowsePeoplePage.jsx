import { startTransition, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { getTrendingPeople, searchPeople } from '../lib/tmdb'
import { gridContainer, cardVariant } from '../lib/motion'
import { usePageTitle } from '../lib/usePageTitle'
import PersonCard from '../components/PersonCard'
import { SkeletonGrid } from '../components/SkeletonCard'

// Mirror of BrowsePage but for people. Lives at /actors.
// Has its OWN search bar at the top — independent of the navbar search
// (which stays focused on movies/TV).
function BrowsePeoplePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const urlQuery = searchParams.get('q') || ''
  usePageTitle(urlQuery ? `Actors: ${urlQuery}` : 'Actors')

  // Local input state for instant typing (same INP pattern as Navbar)
  const [localValue, setLocalValue] = useState(urlQuery)
  useEffect(() => { setLocalValue(urlQuery) }, [urlQuery])

  function onSearchChange(value) {
    setLocalValue(value)
    startTransition(() => {
      if (value) setSearchParams({ q: value })
      else setSearchParams({})
    })
  }

  const [people, setPeople] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Same debounced-search pattern as BrowsePage
  useEffect(() => {
    const trimmed = urlQuery.trim()

    if (!trimmed) {
      let cancelled = false
      setLoading(true); setError(null)
      getTrendingPeople()
        .then((items) => { if (!cancelled) setPeople(items) })
        .catch((err) => { if (!cancelled) setError(err.message) })
        .finally(() => { if (!cancelled) setLoading(false) })
      return () => { cancelled = true }
    }

    let cancelled = false
    const timer = setTimeout(() => {
      setLoading(true); setError(null)
      searchPeople(trimmed)
        .then((items) => { if (!cancelled) setPeople(items) })
        .catch((err) => { if (!cancelled) setError(err.message) })
        .finally(() => { if (!cancelled) setLoading(false) })
    }, 300)

    return () => { cancelled = true; clearTimeout(timer) }
  }, [urlQuery])

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <section className="w-full">
        <div className="
          rounded-lg bg-surface-1 border border-white/[0.08]
          shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_8px_24px_-12px_rgba(0,0,0,0.5)]
          overflow-hidden
        ">
          {/* ── Section: header (title + subtitle + count) ── */}
          <div className="px-5 sm:px-6 py-4 flex items-baseline justify-between gap-3 flex-wrap border-b border-white/[0.06]">
            <div>
              <h1 className="text-[15px] font-semibold tracking-tight text-white">Actors</h1>
              <p className="mt-1.5 text-[12px] text-white/45">
                Trending this week — or search for anyone in TMDb's people catalog.
              </p>
            </div>
            {!loading && (
              <span className="text-[12px] text-white/45">
                {people.length} {people.length === 1 ? 'person' : 'people'}
              </span>
            )}
          </div>

          {/* ── Section: search ── */}
          <div className="px-5 sm:px-6 py-3.5 border-b border-white/[0.06]">
            <div className="relative max-w-md">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                value={localValue}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search actors, directors…"
                className="
                  w-full pl-9 pr-3 py-1.5 rounded-md text-[13px]
                  bg-white/[0.04] hover:bg-white/[0.06]
                  border border-white/[0.06]
                  text-white placeholder:text-white/35
                  focus:outline-none focus:border-white/20 focus:bg-white/[0.06]
                  transition
                "
              />
            </div>
          </div>

          {/* ── Section: results header (Trending / Results for) ── */}
          <div className="px-5 sm:px-6 py-3 border-b border-white/[0.06]">
            <h2 className="text-[13px] font-medium text-white/70">
              {urlQuery ? `Results for "${urlQuery}"` : 'Trending this week'}
            </h2>
          </div>

          {/* ── Section: body (skeleton / error / empty / grid) ── */}
          <div className="p-5 sm:p-6">
            {loading && <SkeletonGrid count={12} />}

            {error && (
              <div className="p-4 rounded-md bg-red-500/10 border border-red-500/30 text-red-300 text-[13px]">
                ⚠️ {error}
              </div>
            )}

            {!loading && !error && people.length === 0 && (
              <p className="text-[13px] text-white/50">No people found.</p>
            )}

            {!loading && !error && people.length > 0 && (
              <motion.div
                key={urlQuery}
                variants={gridContainer}
                initial="hidden"
                animate="show"
                className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5"
              >
                {people.map((p) => (
                  <motion.div key={p.id} variants={cardVariant}>
                    <PersonCard {...p} />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </div>
        </div>
      </section>
    </main>
  )
}

export default BrowsePeoplePage
