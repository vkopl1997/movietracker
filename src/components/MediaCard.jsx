import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../lib/AuthContext'
import { useFavorites } from '../lib/FavoritesContext'

// The poster + title overlay always stays dark for readability (white text
// over a movie poster looks the same in both themes). Only the OUTER ring/shadow
// adapts to the theme.

function MediaCard({ id, title, year, mediaType, posterUrl, rating }) {
  const { user } = useAuth()
  const { isFavorite, toggleFavorite } = useFavorites()

  const item = { id, title, year, mediaType, posterUrl, rating }
  const fav = isFavorite(item)

  function handleHeartClick() {
    if (!user) {
      alert('Sign in to save favorites!')
      return
    }
    toggleFavorite(item)
  }

  return (
    <div className="group relative">
      <Link to={`/${mediaType}/${id}`} className="block">
        <div className="
          relative aspect-[2/3] overflow-hidden rounded-xl
          bg-neutral-200 dark:bg-neutral-900
          ring-1 ring-black/5 dark:ring-white/5
          transition duration-300
          group-hover:ring-brand/60 group-hover:-translate-y-1
          group-hover:shadow-[0_20px_40px_-15px_rgba(212,175,55,0.4)]
        ">
          {posterUrl ? (
            <img
              src={posterUrl}
              alt={title}
              loading="lazy"
              className="
                w-full h-full object-cover
                transition duration-500 group-hover:scale-105
              "
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-5xl bg-neutral-300 dark:bg-neutral-800">
              {mediaType === 'tv' ? '📺' : '🎬'}
            </div>
          )}

          {/* Bottom gradient — always dark for white-text readability over posters */}
          <div className="
            absolute inset-x-0 bottom-0 h-1/2
            bg-gradient-to-t from-black/90 via-black/40 to-transparent
            pointer-events-none
          " />

          {/* Rating */}
          {rating !== null && rating > 0 && (
            <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-sm text-xs font-semibold text-brand">
              ★ {rating.toFixed(1)}
            </div>
          )}

          {/* Type badge */}
          <span className={`
            absolute top-2 right-2
            px-2 py-0.5 rounded-md
            text-[10px] font-bold uppercase tracking-wider
            ${mediaType === 'tv' ? 'bg-purple-500/90 text-white' : 'bg-blue-500/90 text-white'}
          `}>
            {mediaType}
          </span>

          {/* Title + year — always white over the dark gradient */}
          <div className="absolute inset-x-0 bottom-0 p-3">
            <div className="text-sm font-semibold leading-tight drop-shadow line-clamp-2 text-white">
              {title}
            </div>
            {year && (
              <div className="text-xs text-white/70 mt-0.5">
                {year}
              </div>
            )}
          </div>
        </div>
      </Link>

      {/* Heart button (sibling of Link).
          `whileTap` shrinks slightly when pressed — feels tactile.
          `key + animate scale` makes it bounce when the state flips. */}
      <motion.button
        type="button"
        onClick={handleHeartClick}
        aria-label={fav ? 'Remove from favorites' : 'Add to favorites'}
        whileTap={{ scale: 0.85 }}
        animate={{ scale: fav ? [1, 1.3, 1] : 1 }}     /* pop when becoming favorite */
        transition={{ duration: 0.25 }}
        className={`
          absolute bottom-3 right-3 z-10
          w-9 h-9 rounded-full
          backdrop-blur-sm
          text-lg transition-colors
          ${fav
            ? 'bg-brand text-black opacity-100'
            : 'bg-black/60 text-white opacity-0 group-hover:opacity-100 hover:bg-brand hover:text-black'}
        `}
      >
        {fav ? '♥' : '♡'}
      </motion.button>
    </div>
  )
}

export default MediaCard
