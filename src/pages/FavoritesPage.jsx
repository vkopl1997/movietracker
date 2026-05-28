import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../lib/AuthContext'
import { useFavorites } from '../lib/FavoritesContext'
import MediaCard from '../components/MediaCard'
import { SkeletonGrid } from '../components/SkeletonCard'
import { gridContainer, cardVariant } from '../lib/motion'
import { usePageTitle } from '../lib/usePageTitle'

function FavoritesPage() {
  usePageTitle('Favorites')
  const { user } = useAuth()
  const { favorites, loading, error } = useFavorites()
  const [filter, setFilter] = useState('all')

  const movieCount = favorites.filter((f) => f.mediaType === 'movie').length
  const tvCount    = favorites.filter((f) => f.mediaType === 'tv').length

  const visible = filter === 'all'
    ? favorites
    : favorites.filter((f) => f.mediaType === filter)

  const Tab = ({ value, label, count }) => (
    <button
      onClick={() => setFilter(value)}
      className={`px-4 py-2 rounded-full text-sm font-medium transition ${
        filter === value
          ? 'bg-brand text-black'
          : 'bg-black/5 hover:bg-black/10 text-neutral-700 border border-black/10 dark:bg-white/5 dark:hover:bg-white/10 dark:text-white/70 dark:border-white/10'
      }`}
    >
      {label} <span className="opacity-60 ml-1">({count})</span>
    </button>
  )

  return (
    <main className="max-w-7xl mx-auto px-6 py-12">
      <header className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Your Favorites</h1>
        <p className="text-neutral-500 dark:text-white/50 text-sm">
          {user?.email}
        </p>
      </header>

      <div className="flex gap-2 mb-8">
        <Tab value="all"   label="All"    count={favorites.length} />
        <Tab value="movie" label="Movies" count={movieCount} />
        <Tab value="tv"    label="TV"     count={tvCount} />
      </div>

      {loading && <SkeletonGrid count={8} />}

      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-300 text-sm">
          ⚠️ {error}
        </div>
      )}

      {!loading && !error && visible.length === 0 && (
        <div className="p-12 rounded-2xl border border-black/10 bg-white dark:border-white/10 dark:bg-white/5 text-center">
          <div className="text-5xl mb-4">💔</div>
          <h2 className="text-lg font-semibold mb-2">
            {favorites.length === 0
              ? 'No favorites yet'
              : `No ${filter === 'movie' ? 'movies' : 'TV shows'} favorited yet`}
          </h2>
          <p className="text-neutral-500 dark:text-white/60 text-sm mb-6">
            Tap the heart on any poster to start saving things you love.
          </p>
          <Link
            to="/"
            className="inline-block px-5 py-2 rounded-full bg-brand hover:bg-brand-light text-black font-semibold text-sm transition"
          >
            Browse
          </Link>
        </div>
      )}

      {visible.length > 0 && (
        <motion.div
          key={filter}
          variants={gridContainer}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5"
        >
          {visible.map((item) => (
            <motion.div key={`${item.mediaType}-${item.id}`} variants={cardVariant}>
              <MediaCard {...item} />
            </motion.div>
          ))}
        </motion.div>
      )}
    </main>
  )
}

export default FavoritesPage
