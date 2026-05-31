// UpcomingRow — IMDb-style "Coming soon" horizontal scroller.
//
// Each card is a landscape backdrop with date + title underneath and a
// "+" / "✓" button that toggles the movie on the user's watchlist.
// Clicking the card takes you to /movie/:id where the trailer button lives.

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../lib/AuthContext'
import { useFavorites } from '../lib/FavoritesContext'
import { getUpcomingMovies } from '../lib/tmdb'
import { useScrollArrows } from '../lib/useScrollArrows'
import ScrollArrows from './ScrollArrows'

// "2026-06-05" → "Jun 5"
function shortDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()
}

function UpcomingRow() {
  const [items, setItems] = useState([])
  const { ref, canLeft, canRight, scrollLeft, scrollRight } = useScrollArrows()

  useEffect(() => {
    let cancelled = false
    getUpcomingMovies()
      .then((data) => { if (!cancelled) setItems(data) })
      .catch(() => { if (!cancelled) setItems([]) })
    return () => { cancelled = true }
  }, [])

  if (items.length === 0) return null

  return (
    <section className="mb-16">
      {/* Section header — gold accent bar like the IMDb screenshot */}
      <div className="mb-5">
        <h2 className="text-2xl font-bold flex items-center gap-3">
          <span className="inline-block w-1 h-7 bg-brand rounded-sm" />
          Coming soon to theaters
        </h2>
        <p className="text-sm text-neutral-500 dark:text-white/50 mt-1 ml-4">
          Upcoming releases
        </p>
      </div>

      {/* Scroller with floating arrows on each end */}
      <div className="relative">
        <ScrollArrows
          canLeft={canLeft}
          canRight={canRight}
          onLeft={scrollLeft}
          onRight={scrollRight}
        />

        <div
          ref={ref}
          className="-mx-4 sm:-mx-6 px-4 sm:px-6 overflow-x-auto scrollbar-hide scroll-smooth"
        >
          <div className="flex gap-4 pb-2">
            {items.map((item) => (
              <UpcomingCard key={item.id} item={item} />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function UpcomingCard({ item }) {
  const { user, signInWithGoogle } = useAuth()
  const { isWatchlist, toggleWatchlist } = useFavorites()
  const inWatchlist = isWatchlist(item)

  function handleWatchlistClick(e) {
    e.preventDefault()
    e.stopPropagation()
    if (!user) { signInWithGoogle(); return }
    toggleWatchlist(item)
  }

  return (
    <div className="w-72 sm:w-80 shrink-0">
      {/* Backdrop → detail page */}
      <Link
        to={`/movie/${item.id}`}
        className="block group relative aspect-video rounded-xl overflow-hidden ring-1 ring-black/5 dark:ring-white/5 bg-neutral-200 dark:bg-neutral-900 transition-shadow group-hover:ring-brand/60"
      >
        {item.backdropUrl ? (
          <img
            src={item.backdropUrl}
            alt={item.title}
            loading="lazy"
            className="w-full h-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl bg-neutral-300 dark:bg-neutral-800">🎬</div>
        )}

        {/* Subtle gradient at the bottom for readability if we ever overlay text on the image */}
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
      </Link>

      {/* Footer row: watchlist toggle + date/title */}
      <div className="mt-3 flex items-start gap-3">
        <motion.button
          type="button"
          onClick={handleWatchlistClick}
          whileTap={{ scale: 0.9 }}
          animate={{ scale: inWatchlist ? [1, 1.2, 1] : 1 }}
          transition={{ duration: 0.2 }}
          aria-label={inWatchlist ? 'Remove from watchlist' : 'Add to watchlist'}
          title={inWatchlist ? 'On your watchlist' : 'Add to watchlist'}
          className={`
            shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold transition
            ${inWatchlist
              ? 'bg-sky-500 text-white hover:bg-sky-400'
              : 'bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20 text-neutral-700 dark:text-white/80 border border-black/10 dark:border-white/10'}
          `}
        >
          {inWatchlist ? '✓' : '+'}
        </motion.button>

        <Link to={`/movie/${item.id}`} className="flex-1 min-w-0">
          {item.releaseDate && (
            <div className="text-[11px] font-bold tracking-wider text-neutral-500 dark:text-white/60 uppercase leading-tight">
              {shortDate(item.releaseDate)}
            </div>
          )}
          <div className="text-sm font-semibold leading-tight line-clamp-2 mt-0.5 hover:text-brand transition-colors">
            {item.title}
          </div>
        </Link>
      </div>
    </div>
  )
}

export default UpcomingRow
