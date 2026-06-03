// MediaActions — reusable cluster of status buttons + rating + note.
// Two visual modes:
//   - "compact" (used on cards, hover-revealed icons only)
//   - "full"    (used on detail pages, Linear-style properties list)

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../lib/AuthContext'
import { useFavorites } from '../lib/FavoritesContext'

// ── Inline SVG icons in Linear's style — small, geometric, currentColor ──

function HeartIcon({ filled, className = '' }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  )
}

function CheckCircleIcon({ filled, className = '' }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <polyline points="9 12 11 14 16 9" stroke={filled ? '#08080A' : 'currentColor'} />
    </svg>
  )
}

function BookmarkIcon({ filled, className = '' }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  )
}

function StarIcon({ filled, className = '' }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  )
}

function NoteIcon({ className = '' }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
}

// ── Compact mode (cards) — unchanged behaviour, icon-only floating cluster
// `label` doubles as the styled tooltip that appears on hover. We use a
// peer / peer-hover Tailwind trick: the button is `peer`, a sibling
// `<span>` is the tooltip, and peer-hover:opacity-100 reveals it.
function StatusButton({ active, onClick, color, icon, label }) {
  return (
    <div className="relative group/btn">
      <motion.button
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClick() }}
        whileTap={{ scale: 0.85 }}
        animate={{ scale: active ? [1, 1.25, 1] : 1 }}
        transition={{ duration: 0.22 }}
        aria-label={label}
        className={`
          peer w-8 h-8 rounded-md flex items-center justify-center
          transition-colors
          ${active
            ? `${color} text-black`
            : 'bg-black/60 text-white/80 hover:bg-white/90 hover:text-black'}
        `}
      >
        {icon}
      </motion.button>
      {/* Tooltip — sits to the LEFT of the button cluster (the cluster
          is on the right edge of the poster). Hidden by default,
          revealed on per-button hover. */}
      <span className="
        pointer-events-none absolute right-full top-1/2 -translate-y-1/2 mr-2
        px-2 py-1 rounded-md
        bg-black/90 text-white text-[11px] font-medium whitespace-nowrap
        opacity-0 peer-hover:opacity-100
        transition-opacity duration-150
        z-20
      ">
        {label}
      </span>
    </div>
  )
}

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
  const anyOn = fav || watched || wl

  return (
    <div className={`
      absolute bottom-3 right-3 z-10 flex flex-col items-end gap-1.5
      ${anyOn ? '' : 'opacity-0 group-hover:opacity-100'}
      transition-opacity
    `}>
      <StatusButton
        active={fav} onClick={() => toggleFavorite(item)}
        color="bg-pink-400" icon={<HeartIcon filled />} label="Favorite"
      />
      <StatusButton
        active={watched} onClick={() => toggleWatched(item)}
        color="bg-emerald-400" icon={<CheckCircleIcon filled />} label="Watched"
      />
      <StatusButton
        active={wl} onClick={() => toggleWatchlist(item)}
        color="bg-sky-400" icon={<BookmarkIcon filled />} label="Watchlist"
      />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────
// FULL mode — Linear-style properties panel
//
// Vertical list of rows. Each row has a small icon (currentColor) + label.
// Hover: bg-white/[0.04]. Active state colors the icon and label.
// No pill buttons, no shadows, no gradients — Linear's reading rhythm.
// ─────────────────────────────────────────────────────────────────────
// `framed` (default true) wraps the panel in its own rounded surface card.
// Set to false when embedding inside a larger framed container (e.g. the
// detail page's main content card) so we don't end up with nested borders.
export function MediaActionsFull({ item, framed = true }) {
  const { user, signInWithGoogle } = useAuth()
  const {
    isFavorite, isWatched, isWatchlist, getUserRating, getNote,
    toggleFavorite, toggleWatched, toggleWatchlist, setRating, saveNote,
  } = useFavorites()

  const [noteDraft, setNoteDraft] = useState(getNote(item))
  const [noteOpen, setNoteOpen]   = useState(!!getNote(item))
  const [hoverStar, setHoverStar] = useState(0)

  if (!user) {
    return (
      <button
        onClick={signInWithGoogle}
        className="px-4 py-2 rounded-md bg-white hover:bg-white/90 text-black text-[13px] font-medium transition"
      >
        Sign in to track this
      </button>
    )
  }

  const fav = isFavorite(item)
  const watched = isWatched(item)
  const wl = isWatchlist(item)
  const userRating = getUserRating(item)

  // ── Row primitive — icon + label, optional right-side content ──────
  function Row({ icon, label, active, onClick, accent, children }) {
    const baseClass = 'w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md text-left text-[13px] transition-colors'
    const stateClass = active
      ? `text-white ${accent}` // active text white, icon coloured below
      : 'text-white/70 hover:bg-white/[0.04] hover:text-white'
    if (onClick) {
      return (
        <button onClick={onClick} className={`${baseClass} ${stateClass} group`}>
          {icon}
          <span className="flex-1">{label}</span>
          {children}
        </button>
      )
    }
    return (
      <div className={`${baseClass} ${active ? 'text-white' : 'text-white/70'}`}>
        {icon}
        <span className="flex-1">{label}</span>
        {children}
      </div>
    )
  }

  const frameClass = framed
    ? 'w-full max-w-2xl rounded-lg bg-surface-1 border border-white/[0.08] shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_8px_24px_-12px_rgba(0,0,0,0.5)] overflow-hidden'
    : 'w-full'

  return (
    <div className={frameClass}>
      <div className="grid grid-cols-1 sm:grid-cols-2 sm:divide-x divide-white/[0.06]">

        {/* ── Left column: STATUS ───────────────────────────────────── */}
        <div className="flex flex-col">
          <div className="px-3 pt-3 pb-1.5 text-[10px] tracking-[0.15em] uppercase text-white/40 font-medium border-b border-white/[0.06]">
            Status
          </div>
          <div className="p-1 space-y-0.5">
            <Row
              icon={<HeartIcon filled={fav} className={fav ? 'text-pink-400' : 'text-white/45 group-hover:text-white/80'} />}
              label={fav ? 'Favorited' : 'Favorite'}
              active={fav}
              onClick={() => toggleFavorite(item)}
            />

            <Row
              icon={<CheckCircleIcon filled={watched} className={watched ? 'text-emerald-400' : 'text-white/45 group-hover:text-white/80'} />}
              label={watched ? 'Watched' : 'Mark as watched'}
              active={watched}
              onClick={() => toggleWatched(item)}
            />

            <Row
              icon={<BookmarkIcon filled={wl} className={wl ? 'text-sky-400' : 'text-white/45 group-hover:text-white/80'} />}
              label={wl ? 'On watchlist' : 'Add to watchlist'}
              active={wl}
              onClick={() => toggleWatchlist(item)}
            />
          </div>
        </div>

        {/* ── Right column: PERSONAL ────────────────────────────────── */}
        <div className="flex flex-col border-t sm:border-t-0 border-white/[0.06]">
          <div className="px-3 pt-3 pb-1.5 text-[10px] tracking-[0.15em] uppercase text-white/40 font-medium border-b border-white/[0.06]">
            Personal
          </div>
          <div className="p-1 space-y-0.5">

            {/* Rating row — icon + label on the left, 5 stars on the right */}
            <div className="flex items-center gap-2.5 px-2 py-1.5 text-[13px]">
              <StarIcon
                filled={userRating != null}
                className={userRating != null ? 'text-brand' : 'text-white/45'}
              />
              <span className={`flex-1 ${userRating != null ? 'text-white' : 'text-white/70'}`}>
                {userRating != null ? `${userRating}/5` : 'Rate it'}
              </span>
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((n) => {
                  const active = (hoverStar || userRating || 0) >= n
                  return (
                    <button
                      key={n}
                      type="button"
                      onMouseEnter={() => setHoverStar(n)}
                      onMouseLeave={() => setHoverStar(0)}
                      onClick={() => setRating(item, n === userRating ? null : n)}
                      className={`text-sm leading-none transition-transform hover:scale-110 ${
                        active ? 'text-brand' : 'text-white/25'
                      }`}
                      aria-label={`Rate ${n} star${n === 1 ? '' : 's'}`}
                    >
                      ★
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Note row — toggles to a textarea below */}
            {!noteOpen ? (
              <Row
                icon={<NoteIcon className="text-white/45 group-hover:text-white/80" />}
                label="Add a note"
                onClick={() => setNoteOpen(true)}
              />
            ) : (
              <div className="px-2 py-1.5">
                <div className="flex items-center gap-2.5 mb-1.5 text-[13px] text-white/70">
                  <NoteIcon className="text-white/45" />
                  <span>Your note</span>
                </div>
                <textarea
                  value={noteDraft}
                  onChange={(e) => setNoteDraft(e.target.value)}
                  onBlur={() => {
                    if (noteDraft !== getNote(item)) saveNote(item, noteDraft.trim())
                  }}
                  placeholder="Private note about this title…"
                  rows={3}
                  className="w-full px-2.5 py-2 rounded-md text-[13px] bg-white/[0.04] border border-white/[0.08] text-white placeholder:text-white/30 focus:outline-none focus:border-white/20 focus:bg-white/[0.06] transition resize-none"
                />
                <div className="text-[10px] text-white/35 mt-1">
                  Saves when you click away.
                </div>
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  )
}
