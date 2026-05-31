// MediaActions — reusable cluster of status buttons (♥ ✓ 🔖) + rating + note.
// Two visual modes:
//   - "compact" (used on cards, hover-revealed icons only)
//   - "full"    (used on detail pages, large buttons + rating widget + note)

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../lib/AuthContext'
import { useFavorites } from '../lib/FavoritesContext'

// ── Reusable status icon button (used in compact mode) ───────────────
function StatusButton({ active, onClick, color, icon, label }) {
  return (
    <motion.button
      type="button"
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClick() }}
      whileTap={{ scale: 0.85 }}
      animate={{ scale: active ? [1, 1.25, 1] : 1 }}
      transition={{ duration: 0.22 }}
      title={label}
      aria-label={label}
      className={`
        w-9 h-9 rounded-full flex items-center justify-center text-base
        backdrop-blur-sm transition-colors
        ${active
          ? `${color} text-black`
          : 'bg-black/60 text-white hover:bg-white/90 hover:text-black'}
      `}
    >
      {icon}
    </motion.button>
  )
}

// ── Compact mode — icons only, for cards ─────────────────────────────
export function MediaActionsCompact({ item }) {
  const { user } = useAuth()
  const {
    isFavorite, isWatched, isWatchlist,
    toggleFavorite, toggleWatched, toggleWatchlist,
  } = useFavorites()

  if (!user) return null

  const fav = isFavorite(item)
  const watched = isWatched(item)
  const wl = isWatchlist(item)
  // Always show buttons that are already ON; the rest fade in on hover.
  const anyOn = fav || watched || wl

  return (
    <div className={`
      absolute bottom-3 right-3 z-10 flex flex-col items-end gap-2
      ${anyOn ? '' : 'opacity-0 group-hover:opacity-100'}
      transition-opacity
    `}>
      <StatusButton
        active={fav} onClick={() => toggleFavorite(item)}
        color="bg-brand" icon="♥" label="Favorite"
      />
      <StatusButton
        active={watched} onClick={() => toggleWatched(item)}
        color="bg-emerald-400" icon="✓" label="Watched"
      />
      <StatusButton
        active={wl} onClick={() => toggleWatchlist(item)}
        color="bg-sky-400" icon="🔖" label="Watchlist"
      />
    </div>
  )
}

// ── Full mode — labeled buttons + rating + note (for detail page) ────
export function MediaActionsFull({ item }) {
  const { user, signInWithGoogle } = useAuth()
  const {
    isFavorite, isWatched, isWatchlist, getUserRating, getNote,
    toggleFavorite, toggleWatched, toggleWatchlist, setRating, saveNote,
  } = useFavorites()

  const [noteDraft, setNoteDraft] = useState(getNote(item))
  const [noteOpen, setNoteOpen]   = useState(!!getNote(item))

  if (!user) {
    return (
      <button
        onClick={signInWithGoogle}
        className="px-5 py-2.5 rounded-full bg-brand hover:bg-brand-light text-black font-semibold text-sm transition"
      >
        Sign in to track this
      </button>
    )
  }

  const fav = isFavorite(item)
  const watched = isWatched(item)
  const wl = isWatchlist(item)
  const userRating = getUserRating(item)

  // Star rating component — 5 clickable stars, hover preview
  const [hoverStar, setHoverStar] = useState(0)
  function Stars() {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => {
          const active = (hoverStar || userRating || 0) >= n
          return (
            <button
              key={n}
              type="button"
              onMouseEnter={() => setHoverStar(n)}
              onMouseLeave={() => setHoverStar(0)}
              onClick={() => setRating(item, n === userRating ? null : n)}
              className={`text-2xl transition-transform hover:scale-125 ${
                active ? 'text-brand' : 'text-neutral-400 dark:text-white/30'
              }`}
              aria-label={`Rate ${n} star${n === 1 ? '' : 's'}`}
            >
              ★
            </button>
          )
        })}
        {userRating != null && (
          <button
            onClick={() => setRating(item, null)}
            className="ml-2 text-xs text-neutral-500 dark:text-white/50 hover:text-brand"
          >
            Clear
          </button>
        )}
      </div>
    )
  }

  // Common pill-button class
  const pillBase = 'px-4 py-2.5 rounded-full font-semibold text-sm transition flex items-center gap-2'

  return (
    <div className="space-y-5">
      {/* Status buttons row */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => toggleFavorite(item)}
          className={`${pillBase} ${fav
            ? 'bg-brand text-black hover:bg-brand-light'
            : 'bg-black/5 hover:bg-black/10 border border-black/10 text-neutral-900 dark:bg-white/10 dark:hover:bg-white/20 dark:border-white/20 dark:text-white'
          }`}
        >
          <span>{fav ? '♥' : '♡'}</span>
          {fav ? 'Favorited' : 'Favorite'}
        </button>

        <button
          onClick={() => toggleWatched(item)}
          className={`${pillBase} ${watched
            ? 'bg-emerald-500 text-white hover:bg-emerald-400'
            : 'bg-black/5 hover:bg-black/10 border border-black/10 text-neutral-900 dark:bg-white/10 dark:hover:bg-white/20 dark:border-white/20 dark:text-white'
          }`}
        >
          <span>{watched ? '✓' : '○'}</span>
          {watched ? 'Watched' : 'Mark watched'}
        </button>

        <button
          onClick={() => toggleWatchlist(item)}
          className={`${pillBase} ${wl
            ? 'bg-sky-500 text-white hover:bg-sky-400'
            : 'bg-black/5 hover:bg-black/10 border border-black/10 text-neutral-900 dark:bg-white/10 dark:hover:bg-white/20 dark:border-white/20 dark:text-white'
          }`}
        >
          <span>🔖</span>
          {wl ? 'On watchlist' : 'Watchlist'}
        </button>
      </div>

      {/* Rating */}
      <div className="flex items-center gap-4">
        <span className="text-sm text-neutral-500 dark:text-white/60">Your rating</span>
        <Stars />
      </div>

      {/* Note */}
      <div>
        {!noteOpen ? (
          <button
            onClick={() => setNoteOpen(true)}
            className="text-sm text-neutral-500 dark:text-white/60 hover:text-brand"
          >
            + Add a note
          </button>
        ) : (
          <div>
            <textarea
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              onBlur={() => {
                if (noteDraft !== getNote(item)) saveNote(item, noteDraft.trim())
              }}
              placeholder="Private note about this title…"
              rows={3}
              className="
                w-full max-w-2xl px-4 py-3 rounded-xl text-sm
                bg-black/5 dark:bg-white/5
                border border-black/10 dark:border-white/10
                text-neutral-900 dark:text-white
                placeholder:text-neutral-400 dark:placeholder:text-white/40
                focus:outline-none focus:border-brand
                transition resize-none
              "
            />
            <div className="text-[11px] text-neutral-400 dark:text-white/40 mt-1">
              Saves automatically when you click away.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
