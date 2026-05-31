import { Link } from 'react-router-dom'
import { useFavorites } from '../lib/FavoritesContext'
import { MediaActionsCompact } from './MediaActions'

function MediaCard({ id, title, year, mediaType, posterUrl, rating }) {
  const { isWatched, getUserRating } = useFavorites()
  const item = { id, title, year, mediaType, posterUrl, rating }
  const watched = isWatched(item)
  const myRating = getUserRating(item)

  return (
    <div className="group relative">
      <Link to={`/${mediaType}/${id}`} className="block">
        <div className={`
          relative aspect-[2/3] overflow-hidden rounded-xl
          bg-neutral-200 dark:bg-neutral-900
          ring-1 ring-black/5 dark:ring-white/5
          transition duration-300
          group-hover:ring-brand/60 group-hover:-translate-y-1
          group-hover:shadow-[0_20px_40px_-15px_rgba(212,175,55,0.4)]
          ${watched ? 'opacity-95' : ''}
        `}>
          {posterUrl ? (
            <img
              src={posterUrl}
              alt={title}
              loading="lazy"
              className={`
                w-full h-full object-cover
                transition duration-500 group-hover:scale-105
                ${watched ? 'saturate-50' : ''}
              `}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-5xl bg-neutral-300 dark:bg-neutral-800">
              {mediaType === 'tv' ? '📺' : '🎬'}
            </div>
          )}

          {/* Bottom gradient */}
          <div className="
            absolute inset-x-0 bottom-0 h-1/2
            bg-gradient-to-t from-black/90 via-black/40 to-transparent
            pointer-events-none
          " />

          {/* TMDb rating (top-left) */}
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

          {/* "Watched" indicator (top-center) — shows when marked watched */}
          {watched && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/90 text-white text-[10px] font-bold uppercase tracking-wider">
              ✓ Watched
            </div>
          )}

          {/* Title + year + your rating */}
          <div className="absolute inset-x-0 bottom-0 p-3">
            <div className="text-sm font-semibold leading-tight drop-shadow line-clamp-2 text-white">
              {title}
            </div>
            <div className="flex items-center justify-between mt-0.5">
              {year && <div className="text-xs text-white/70">{year}</div>}
              {myRating != null && (
                <div className="text-xs text-brand font-bold">
                  {'★'.repeat(myRating)}<span className="opacity-30">{'★'.repeat(5 - myRating)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </Link>

      {/* Stacked action buttons (sibling of Link) */}
      <MediaActionsCompact item={item} />
    </div>
  )
}

export default MediaCard
