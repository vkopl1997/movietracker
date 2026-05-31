// MobileMenu — slide-in drawer for navigation + search on phones.
//
// Only mounted/rendered on small screens. Trigger is a burger button in Navbar.
//
// Patterns used:
//   - Portal-style fixed-position drawer (right side, full height)
//   - AnimatePresence so it animates in AND out
//   - Body scroll lock while open (same trick as TrailerModal)
//   - Escape key + backdrop click + nav-link click all close it

import { startTransition, useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuth } from '../lib/AuthContext'
import { useTheme } from '../lib/ThemeContext'
import Logo from './Logo'

function MobileMenu({ open, onClose }) {
  const { user, signInWithGoogle, signOut } = useAuth()
  const { theme, toggleTheme } = useTheme()

  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()
  const urlQuery = searchParams.get('q') || ''
  const [localValue, setLocalValue] = useState(urlQuery)
  const inputRef = useRef(null)

  // Sync local input with URL query when drawer is opened
  useEffect(() => {
    if (open) {
      setLocalValue(urlQuery)
      // small delay so the animation can start before focus pulls keyboard up on mobile
      const t = setTimeout(() => inputRef.current?.focus(), 200)
      return () => clearTimeout(t)
    }
  }, [open, urlQuery])

  // Lock body scroll while open
  useEffect(() => {
    if (!open) return
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = original }
  }, [open])

  // Escape closes
  useEffect(() => {
    if (!open) return
    function onKey(e) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  function onSearchChange(value) {
    setLocalValue(value)
    startTransition(() => {
      if (location.pathname !== '/') {
        navigate(value ? `/?q=${encodeURIComponent(value)}` : '/')
        return
      }
      if (value) setSearchParams({ q: value })
      else setSearchParams({})
    })
  }

  // NavLink class generator — active = filled brand, inactive = subtle
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
          {/* Backdrop — clicking it closes the drawer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm md:hidden"
          />

          {/* Drawer panel — slides in from the right */}
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
              <Link to="/" onClick={onClose} className="flex items-center gap-2">
                <Logo size={28} />
                <span className="font-bold tracking-wide text-brand">MovieTracker</span>
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

            {/* Search */}
            <div className="px-4 py-4 border-b border-black/5 dark:border-white/10">
              <input
                ref={inputRef}
                type="text"
                value={localValue}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search movies & TV shows…"
                className="
                  w-full px-4 py-3 rounded-full text-base
                  bg-black/5 dark:bg-white/5
                  border border-black/10 dark:border-white/10
                  text-neutral-900 dark:text-white
                  placeholder:text-neutral-400 dark:placeholder:text-white/40
                  focus:outline-none focus:border-brand
                  transition
                "
              />
            </div>

            {/* Nav links */}
            <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
              <NavLink to="/" end onClick={onClose} className={navClass}>
                <span className="text-lg">🎬</span>
                Browse
              </NavLink>

              {user && (
                <NavLink to="/favorites" onClick={onClose} className={navClass}>
                  <span className="text-lg text-brand">♥</span>
                  My Library
                </NavLink>
              )}
            </nav>

            {/* Footer: theme toggle + auth action */}
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
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}

export default MobileMenu
