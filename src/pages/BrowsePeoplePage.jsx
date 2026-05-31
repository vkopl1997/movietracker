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
      <header className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold mb-1">Actors</h1>
        <p className="text-sm text-neutral-500 dark:text-white/50">
          Trending this week — or search for anyone in TMDb's people catalog.
        </p>
      </header>

      {/* Search bar — sits on the page, not in the navbar */}
      <div className="mb-8 max-w-2xl">
        <input
          type="text"
          value={localValue}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search actors, directors…"
          className="
            w-full px-4 py-3 rounded-full text-base
            bg-black/5 dark:bg-white/5
            border border-black/10 dark:border-white/10
            text-neutral-900 dark:text-white
            placeholder:text-neutral-400 dark:placeholder:text-white/40
            focus:outline-none focus:border-brand focus:bg-black/10 dark:focus:bg-white/10
            transition
          "
        />
      </div>

      <div className="flex items-baseline justify-between mb-6">
        <h2 className="text-lg font-bold">
          {urlQuery ? `Results for "${urlQuery}"` : 'Trending this week'}
        </h2>
        {!loading && (
          <span className="text-sm text-neutral-500 dark:text-white/50">
            {people.length} {people.length === 1 ? 'person' : 'people'}
          </span>
        )}
      </div>

      {loading && <SkeletonGrid count={12} />}

      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-300 text-sm">
          ⚠️ {error}
        </div>
      )}

      {!loading && !error && people.length === 0 && (
        <p className="text-neutral-500 dark:text-white/50">No people found.</p>
      )}

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
    </main>
  )
}

export default BrowsePeoplePage
