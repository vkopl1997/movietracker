import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import MediaCard from '../components/MediaCard'
import Hero from '../components/Hero'
import UpcomingRow from '../components/UpcomingRow'
import PopularPeopleRow from '../components/PopularPeopleRow'
import { TrendingTvRow, TopRatedMoviesRow } from '../components/HomeContentRows'
import TopUsersRow from '../components/TopUsersRow'
import { SkeletonGrid } from '../components/SkeletonCard'
import { getTrending, searchMulti } from '../lib/tmdb'
import { gridContainer, cardVariant } from '../lib/motion'
import { usePageTitle } from '../lib/usePageTitle'

function BrowsePage() {
  // ──────────────────────────────────────────────────────────────────
  // useSearchParams is React Router's hook for reading/writing the
  // URL query string (the part after the ?). Here we treat it as state.
  //
  // - URL `/`               → no query → show trending
  // - URL `/?q=interstellar` → search results for "interstellar"
  //
  // Why use the URL instead of useState? Because then:
  //   • Refreshing the page keeps your search
  //   • The browser back/forward buttons work
  //   • You can share/bookmark a search URL
  // ──────────────────────────────────────────────────────────────────
  const [searchParams] = useSearchParams()
  const searchQuery = searchParams.get('q') || ''

  // Tab title: "Search: dune · MovieTracker" when searching, just "MovieTracker" on home.
  usePageTitle(searchQuery ? `Search: ${searchQuery}` : null)

  const [media, setMedia] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Debounced fetch — same pattern as before.
  useEffect(() => {
    const trimmed = searchQuery.trim()

    // Empty query → load trending immediately.
    if (!trimmed) {
      let cancelled = false
      setLoading(true)
      setError(null)
      getTrending()
        .then((items) => { if (!cancelled) setMedia(items) })
        .catch((err) => { if (!cancelled) setError(err.message) })
        .finally(() => { if (!cancelled) setLoading(false) })
      return () => { cancelled = true }
    }

    // Non-empty → debounce by 300ms, then search.
    let cancelled = false
    const timer = setTimeout(() => {
      setLoading(true)
      setError(null)
      searchMulti(trimmed)
        .then((items) => { if (!cancelled) setMedia(items) })
        .catch((err) => { if (!cancelled) setError(err.message) })
        .finally(() => { if (!cancelled) setLoading(false) })
    }, 300)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [searchQuery])

  // Use top 5 trending as the hero slider.
  // The grid shows the NEXT 10 (so 15 items total on the home view).
  const heroItems = !searchQuery && media.length > 0 ? media.slice(0, 5) : []
  const gridItems = heroItems.length > 0
    ? media.slice(heroItems.length, heroItems.length + 10)
    : media

  return (
    <>
      <Hero items={heroItems} />

      <main className="max-w-7xl mx-auto px-6 py-10">
        {/* ── Trending / Search results — Linear framed table ── */}
        <section className="mb-16 w-full">
          <div className="
            rounded-lg bg-surface-1 border border-white/[0.08]
            shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_8px_24px_-12px_rgba(0,0,0,0.5)]
            overflow-hidden
          ">
            {/* Header: section title + item count */}
            <div className="px-5 sm:px-6 py-4 flex items-baseline justify-between gap-3 flex-wrap border-b border-white/[0.06]">
              <h2 className="text-[15px] font-semibold tracking-tight text-white">
                {searchQuery
                  ? `Results for "${searchQuery}"`
                  : 'Trending this week'}
              </h2>
              {!loading && (
                <span className="text-[12px] text-white/45">
                  {gridItems.length} {gridItems.length === 1 ? 'item' : 'items'}
                </span>
              )}
            </div>

            {/* Body: skeleton / error / empty / grid */}
            <div className="p-5 sm:p-6">
              {loading && <SkeletonGrid count={12} />}

              {error && (
                <div className="p-4 rounded-md bg-red-500/10 border border-red-500/30 text-red-300 whitespace-pre-wrap text-[13px]">
                  ⚠️ {error}
                </div>
              )}

              {!loading && !error && gridItems.length === 0 && (
                <p className="text-[13px] text-white/50">No results. Try a different search.</p>
              )}

              {!loading && !error && gridItems.length > 0 && (
                /* `key` on the motion grid resets the stagger when the search
                   query changes — new results pop in fresh. */
                <motion.div
                  key={searchQuery}
                  variants={gridContainer}
                  initial="hidden"
                  animate="show"
                  className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5"
                >
                  {gridItems.map((item) => (
                    <motion.div key={`${item.mediaType}-${item.id}`} variants={cardVariant}>
                      <MediaCard {...item} />
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </div>
          </div>
        </section>

        {/* Bonus rows — only on the default home view, not on search results */}
        {!searchQuery && (
          <>
            <UpcomingRow />
            <PopularPeopleRow />
            <TrendingTvRow />
            <TopRatedMoviesRow />
            <TopUsersRow />
          </>
        )}
      </main>
    </>
  )
}

export default BrowsePage
