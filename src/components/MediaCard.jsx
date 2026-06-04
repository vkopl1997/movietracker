import { memo } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useFavorites } from '../lib/FavoritesContext'
import { MediaActionsCompact } from './MediaActions'

function MediaCard({ id, title, year, mediaType, posterUrl, rating }) {
  const { isWatched, getUserRating } = useFavorites()
  const location = useLocation()
  const item = { id, title, year, mediaType, posterUrl, rating }
  const watched = isWatched(item)
  const myRating = getUserRating(item)

  // Capture where this card was clicked from so MediaDetailPage can render a
  // contextual "back" link that returns the user to exactly where they came
  // from (the picker, favorites, an actor's page, etc.) instead of always
  // dumping them on /. We include search so "/?q=heat" round-trips correctly.
  const backState = { from: location.pathname + location.search }

  return (
    <div className="group relative">
      <Link to={`/${mediaType}/${id}`} state={backState} className="block">
        {/* Poster — flat rounded-md surface, single subtle ring, no
            translate-y or coloured glow on hover. Watched titles dim
            slightly via opacity instead of saturate filter. */}
        <div className={`
          relative aspect-[2/3] overflow-hidden rounded-md
          bg-white/[0.04]
          ring-1 ring-white/10
          transition
          group-hover:ring-brand
          ${watched ? 'opacity-70' : ''}
        `}>
          {posterUrl ? (
            <img
              src={posterUrl}
              alt={title}
              loading="lazy"
              className="w-full h-full object-cover transition duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-5xl bg-white/[0.04]">
              {mediaType === 'tv' ? '📺' : '🎬'}
            </div>
          )}

          {/* TMDb rating (top-left) — single solid chip, no blur */}
          {rating !== null && rating > 0 && (
            <div className="absolute top-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-black/70 text-[11px] font-semibold text-white">
              <span className="text-brand">★</span> {rating.toFixed(1)}
            </div>
          )}

          {/* Media type tag (top-right) — solid minimalistic so the user
              can tell movies from TV at a glance in mixed lists like
              the picker results. Watched takes precedence in the same
              corner: when an item is watched we show the green check
              instead, and the type info is still readable from the
              title's meta line under the poster. */}
          {watched ? (
            <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center" title="Watched">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-black">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
          ) : (
            <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md bg-black/70 text-[10px] font-bold tracking-wider uppercase text-white">
              {mediaType === 'tv' ? 'TV' : 'Movie'}
            </div>
          )}

          {/* Action cluster lives INSIDE the poster so its absolute
              positioning is relative to the poster, not the outer
              card wrapper (which also includes the title row). */}
          <MediaActionsCompact item={item} />
        </div>

        {/* Title + year — sit on the dark page surface, not on the
            poster. Cleanest possible: one line title + one line meta
            with the user's rating tucked in if present. */}
        <div className="mt-2 px-0.5">
          <div className="text-[13px] font-semibold leading-tight text-white/90 group-hover:text-white transition-colors line-clamp-1">
            {title}
          </div>
          <div className="flex items-center justify-between mt-0.5 text-[11px]">
            <span className="text-white/45">{year || ''}</span>
            {myRating != null && (
              <span className="text-brand font-medium">
                ★ {myRating}/5
              </span>
            )}
          </div>
        </div>
      </Link>

    </div>
  )
}

// memo() prevents re-renders when props haven't changed.
// Critical for INP: typing in the search bar triggers BrowsePage to re-render,
// but each card's props are stable until results actually change — memo bails
// the cards out, keeping the grid render cheap.
export default memo(MediaCard)
