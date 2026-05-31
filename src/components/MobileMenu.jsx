// MobileMenu — slide-in drawer for navigation + search on phones.
//
// Two modes inside the drawer:
//   - Idle (no search query): brand + nav links + theme + auth
//   - Searching: brand + search input + LIVE RESULTS LIST (nav/footer hidden)
//
// This avoids the bug where results were hidden behind the drawer's high z-index.

import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useNavigate, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuth } from '../lib/AuthContext'
import { useTheme } from '../lib/ThemeContext'
import { searchMulti } from '../lib/tmdb'
import Logo from './Logo'

function MobileMenu({ open, onClose }) {
  const { user, signInWithGoogle, signOut } = useAuth()
  const { theme, toggleTheme } = useTheme()

  // The drawer holds its OWN search state — independent of the URL.
  // This way typing here doesn't trigger BrowsePage to refetch in the background.
  // The URL is only updated when the user *commits* by clicking "See all results".
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const urlQuery = searchParams.get('q') || ''
  const [localValue, setLocalValue] = useState(urlQuery)
  const inputRef = useRef(null)

  // ── Inline search results ──────────────────────────────────────────
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)

  const searchTerm = localValue.trim()
  const isSearching = searchTerm.length > 0

  // Fetch live results when typing (debounced).
  // Same pattern as BrowsePage but capped at 8 items for compactness.
  useEffect(() => {
    if (!open || !isSearching) {
      setResults([])
      return
    }
    let cancelled = false
    const timer = setTimeout(() => {
      setLoading(true)
      searchMulti(searchTerm)
        .then((items) => {
          if (!cancelled) setResults(items.slice(0, 8))
        })
        .catch(() => { if (!cancelled) setResults([]) })
        .finally(() => { if (!cancelled) setLoading(false) })
    }, 250)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [open, isSearching, searchTerm])

  // Sync local input with URL when drawer opens
  useEffect(() => {
    if (open) {
      setLocalValue(urlQuery)
      const t = setTimeout(() => inputRef.current?.focus(), 200)
      return () => clearTimeout(t)
    }
  }, [open, urlQuery])

  // Body scroll lock + Escape close
  useEffect(() => {
    if (!open) return
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function onKey(e) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = original
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  // Drawer search is local-only. NO URL update here.
  function onSearchChange(value) {
    setLocalValue(value)
  }

  function clearSearch() {
    setLocalValue('')
    inputRef.current?.focus()
  }

  // Navigate to a specific result. No need to commit query to URL — user picked an item.
  function pickResult(item) {
    onClose()
    navigate(`/${item.mediaType}/${item.id}`)
  }

  // "See all results" — THIS is the commit. Updates URL → BrowsePage fetches.
  function seeAllResults() {
    onClose()
    navigate(`/?q=${encodeURIComponent(searchTerm)}`)
  }

  const navClass = ({ isActive }) =>
    `flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition ${
      isActive
        ? 'bg-brand text-black'
        : 'text-neutral-700 dark:text-white/80 hover:bg-black/5 dark:hover:bg-white/5'
    }`

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm md:hidden"
          />

          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.22, ease: 'easeOut' }}
            className="
              fixed top-0 right-0 z-[70] h-full w-[88%] max-w-sm
              flex flex-col
              bg-white dark:bg-neutral-950
              border-l border-black/10 dark:border-white/10
              shadow-2xl
              md:hidden
            "
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
          >
            {/* Top row: brand + close */}
            <div className="px-4 py-4 flex items-center justify-between border-b border-black/5 dark:border-white/10">
              <Link to="/" onClick={onClose} className="flex items-center gap-2.5">
                <Logo size={30} />
                <span className="font-display text-2xl tracking-[0.08em] leading-none text-brand">
                  MOVIETRACKER
                </span>
              </Link>
              <button
                onClick={onClose}
                aria-label="Close menu"
                className="
                  w-10 h-10 rounded-full flex items-center justify-center text-xl
                  bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10
                  border border-black/10 dark:border-white/10
                  transition
                "
              >
                ×
              </button>
            </div>

            {/* Search input */}
            <div className="px-4 py-4 border-b border-black/5 dark:border-white/10">
              <div className="relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={localValue}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder="Search movies & TV shows…"
                  className="
                    w-full px-4 py-3 pr-10 rounded-full text-base
                    bg-black/5 dark:bg-white/5
                    border border-black/10 dark:border-white/10
                    text-neutral-900 dark:text-white
                    placeholder:text-neutral-400 dark:placeholder:text-white/40
                    focus:outline-none focus:border-brand
                    transition
                  "
                />
                {isSearching && (
                  <button
                    onClick={clearSearch}
                    aria-label="Clear search"
                    className="
                      absolute right-2 top-1/2 -translate-y-1/2
                      w-7 h-7 rounded-full text-lg
                      bg-black/10 dark:bg-white/10
                      text-neutral-600 dark:text-white/70
                      hover:bg-black/20 dark:hover:bg-white/20
                      flex items-center justify-center transition
                    "
                  >
                    ×
                  </button>
                )}
              </div>
            </div>

            {/* ── Body — toggles between Results and Nav ────────────── */}
            {isSearching ? (
              <ResultList
                loading={loading}
                results={results}
                onPick={pickResult}
                query={searchTerm}
                onSeeAll={seeAllResults}
              />
            ) : (
              <>
                <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
                  <NavLink to="/" end onClick={onClose} className={navClass}>
                    <span className="text-lg">🎬</span>
                    Browse
                  </NavLink>
                  <NavLink to="/actors" onClick={onClose} className={navClass}>
                    <span className="text-lg">🎭</span>
                    Actors
                  </NavLink>
                  <NavLink to="/users" onClick={onClose} className={navClass}>
                    <span className="text-lg">👥</span>
                    Users
                  </NavLink>
                  <NavLink to="/pick" onClick={onClose} className={navClass}>
                    <span className="text-lg">✨</span>
                    What should I watch?
                  </NavLink>
                  {user && (
                    <NavLink to="/favorites" onClick={onClose} className={navClass}>
                      <span className="text-lg text-brand">♥</span>
                      My Library
                    </NavLink>
                  )}
                </nav>

                {/* Footer: theme + auth */}
                <div className="px-4 py-4 border-t border-black/5 dark:border-white/10 space-y-3">
                  <button
                    onClick={toggleTheme}
                    className="
                      w-full flex items-center justify-between px-4 py-3 rounded-xl text-base
                      bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10
                      border border-black/10 dark:border-white/10
                      transition
                    "
                  >
                    <span className="text-neutral-700 dark:text-white/80">
                      {theme === 'dark' ? 'Light mode' : 'Dark mode'}
                    </span>
                    <span className="text-xl">{theme === 'dark' ? '☀️' : '🌙'}</span>
                  </button>

                  {user ? (
                    <button
                      onClick={() => { onClose(); signOut() }}
                      className="
                        w-full px-4 py-3 rounded-xl text-base font-medium
                        bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10
                        border border-black/10 dark:border-white/10
                        text-neutral-700 dark:text-white/80 transition
                      "
                    >
                      Sign out
                    </button>
                  ) : (
                    <button
                      onClick={() => { onClose(); signInWithGoogle() }}
                      className="
                        w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl
                        bg-brand hover:bg-brand-light text-black font-semibold text-base
                        transition
                      "
                    >
                      <svg className="w-5 h-5" viewBox="0 0 48 48">
                        <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z"/>
                        <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
                        <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.4-4.5 2.4-7.2 2.4-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
                        <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4.1 5.6l6.2 5.2c-.4.4 6.6-4.8 6.6-14.8 0-1.3-.1-2.3-.4-3.5z"/>
                      </svg>
                      Sign in with Google
                    </button>
                  )}
                </div>
              </>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}

// ── Search result list — vertical poster thumbnails inside the drawer ──
function ResultList({ loading, results, onPick, query, onSeeAll }) {
  return (
    <div className="flex-1 overflow-y-auto">
      {loading && (
        <p className="px-4 py-6 text-sm text-neutral-500 dark:text-white/50">
          Searching…
        </p>
      )}

      {!loading && results.length === 0 && (
        <div className="px-4 py-10 text-center">
          <div className="text-4xl mb-3 opacity-60">🔎</div>
          <p className="text-sm text-neutral-500 dark:text-white/50">
            No results for "{query}"
          </p>
        </div>
      )}

      {results.length > 0 && (
        <ul className="divide-y divide-black/5 dark:divide-white/5">
          {results.map((item) => (
            <li key={`${item.mediaType}-${item.id}`}>
              <button
                onClick={() => onPick(item)}
                className="
                  w-full flex items-start gap-3 px-4 py-3 text-left transition
                  hover:bg-black/5 dark:hover:bg-white/5
                "
              >
                {/* Poster thumb */}
                <div className="shrink-0 w-12 h-16 rounded-md overflow-hidden bg-neutral-200 dark:bg-neutral-800">
                  {item.posterUrl ? (
                    <img src={item.posterUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xl">
                      {item.mediaType === 'tv' ? '📺' : '🎬'}
                    </div>
                  )}
                </div>
                {/* Title + meta */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold leading-tight line-clamp-2">
                    {item.title}
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-neutral-500 dark:text-white/50">
                    {item.year && <span>{item.year}</span>}
                    <span className={`
                      px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider
                      ${item.mediaType === 'tv' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'}
                    `}>
                      {item.mediaType}
                    </span>
                    {item.rating > 0 && (
                      <span className="text-brand">★ {item.rating.toFixed(1)}</span>
                    )}
                  </div>
                </div>
              </button>
            </li>
          ))}

          {/* Footer link to full results page */}
          <li>
            <button
              onClick={onSeeAll}
              className="
                w-full px-4 py-3 text-sm font-semibold text-brand
                hover:bg-black/5 dark:hover:bg-white/5 transition
              "
            >
              See all results for "{query}" →
            </button>
          </li>
        </ul>
      )}
    </div>
  )
}

export default MobileMenu
