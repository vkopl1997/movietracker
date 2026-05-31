import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../lib/AuthContext'
import { useFavorites } from '../lib/FavoritesContext'
import MediaCard from '../components/MediaCard'
import { SkeletonGrid } from '../components/SkeletonCard'
import { gridContainer, cardVariant } from '../lib/motion'
import { usePageTitle } from '../lib/usePageTitle'

// Tabs:
//   all       → everything you've interacted with
//   favorites → ♥
//   watched   → ✓
//   watchlist → 🔖
//   movies    → media_type filter overlay
//   tv        → media_type filter overlay
//
// Sort options: recent, alphabetical, your rating, year, tmdb rating

const STATUS_TABS = [
  { value: 'all',       label: 'All',       icon: null,    color: 'bg-brand' },
  { value: 'favorites', label: 'Favorites', icon: '♥',     color: 'bg-brand' },
  { value: 'watched',   label: 'Watched',   icon: '✓',     color: 'bg-emerald-500' },
  { value: 'watchlist', label: 'Watchlist', icon: '🔖',    color: 'bg-sky-500' },
]

const SORT_OPTIONS = [
  { value: 'recent',     label: 'Recently added' },
  { value: 'alpha',      label: 'A → Z' },
  { value: 'my-rating',  label: 'My rating' },
  { value: 'tmdb',       label: 'TMDb rating' },
  { value: 'year',       label: 'Year' },
]

function FavoritesPage() {
  usePageTitle('My Library')
  const { user } = useAuth()
  const { items, favorites, watched, watchlist, loading, error } = useFavorites()

  const [tab, setTab]       = useState('all')
  const [type, setType]     = useState('all')     // 'all' | 'movie' | 'tv'
  const [sort, setSort]     = useState('recent')

  // Pick the base list for the current tab
  const baseList =
    tab === 'favorites' ? favorites :
    tab === 'watched'   ? watched :
    tab === 'watchlist' ? watchlist :
                          items

  // Filter by media type
  const typed = type === 'all' ? baseList : baseList.filter((i) => i.mediaType === type)

  // Sort
  const sorted = [...typed].sort((a, b) => {
    switch (sort) {
      case 'alpha':     return a.title.localeCompare(b.title)
      case 'my-rating': return (b.userRating ?? -1) - (a.userRating ?? -1)
      case 'tmdb':      return (b.rating ?? -1) - (a.rating ?? -1)
      case 'year':      return (b.year ?? 0) - (a.year ?? 0)
      case 'recent':
      default:
        return new Date(b.createdAt) - new Date(a.createdAt)
    }
  })

  // Counts for tab badges
  const counts = {
    all: items.length,
    favorites: favorites.length,
    watched: watched.length,
    watchlist: watchlist.length,
  }

  return (
    <main className="max-w-7xl mx-auto px-6 py-12">
      <header className="mb-8">
        <h1 className="text-3xl font-bold mb-2">My Library</h1>
        <p className="text-neutral-500 dark:text-white/50 text-sm">{user?.email}</p>
      </header>

      {/* Status tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {STATUS_TABS.map((t) => {
          const active = tab === t.value
          return (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition flex items-center gap-2 ${
                active
                  ? `${t.color} text-black`
                  : 'bg-black/5 hover:bg-black/10 text-neutral-700 border border-black/10 dark:bg-white/5 dark:hover:bg-white/10 dark:text-white/70 dark:border-white/10'
              }`}
            >
              {t.icon && <span>{t.icon}</span>}
              {t.label}
              <span className="opacity-60">({counts[t.value]})</span>
            </button>
          )
        })}
      </div>

      {/* Secondary filter row: type + sort */}
      <div className="flex flex-wrap items-center gap-3 mb-8">
        {/* Media type filter */}
        <div className="flex rounded-full bg-black/5 dark:bg-white/5 p-1 border border-black/10 dark:border-white/10">
          {['all', 'movie', 'tv'].map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                type === t
                  ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow'
                  : 'text-neutral-500 dark:text-white/60'
              }`}
            >
              {t === 'all' ? 'All' : t === 'movie' ? 'Movies' : 'TV'}
            </button>
          ))}
        </div>

        {/* Sort dropdown */}
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="
            px-3 py-1.5 rounded-full text-sm
            bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10
            border border-black/10 dark:border-white/10
            text-neutral-700 dark:text-white/70
            focus:outline-none focus:border-brand transition
          "
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>Sort: {o.label}</option>
          ))}
        </select>

        <div className="ml-auto text-xs text-neutral-500 dark:text-white/40">
          {sorted.length} {sorted.length === 1 ? 'item' : 'items'}
        </div>
      </div>

      {loading && <SkeletonGrid count={8} />}

      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-300 text-sm">
          ⚠️ {error}
        </div>
      )}

      {!loading && !error && sorted.length === 0 && (
        <div className="p-12 rounded-2xl border border-black/10 bg-white dark:border-white/10 dark:bg-white/5 text-center">
          <div className="text-5xl mb-4">
            {tab === 'favorites' ? '💔' : tab === 'watched' ? '👀' : tab === 'watchlist' ? '🗒️' : '🎬'}
          </div>
          <h2 className="text-lg font-semibold mb-2">
            {emptyMessage(tab, type)}
          </h2>
          <p className="text-neutral-500 dark:text-white/60 text-sm mb-6">
            Browse trending and use the heart, eye, or bookmark icons on any title.
          </p>
          <Link
            to="/"
            className="inline-block px-5 py-2 rounded-full bg-brand hover:bg-brand-light text-black font-semibold text-sm transition"
          >
            Browse
          </Link>
        </div>
      )}

      {sorted.length > 0 && (
        <motion.div
          key={`${tab}-${type}-${sort}`}
          variants={gridContainer}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5"
        >
          {sorted.map((item) => (
            <motion.div key={`${item.mediaType}-${item.id}`} variants={cardVariant}>
              <MediaCard {...item} />
            </motion.div>
          ))}
        </motion.div>
      )}
    </main>
  )
}

function emptyMessage(tab, type) {
  const what = type === 'movie' ? 'movies' : type === 'tv' ? 'TV shows' : 'items'
  if (tab === 'favorites') return `No favorited ${what} yet`
  if (tab === 'watched')   return `No watched ${what} yet`
  if (tab === 'watchlist') return `Your watchlist is empty`
  return `Nothing in your library yet`
}

export default FavoritesPage
