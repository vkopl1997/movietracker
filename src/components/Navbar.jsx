import { startTransition, useEffect, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { useTheme } from '../lib/ThemeContext'
import UserMenu from './UserMenu'
import Logo from './Logo'
import NotificationBell from './NotificationBell'
import MobileMenu from './MobileMenu'

function Navbar() {
  const { user, signInWithGoogle } = useAuth()
  const { theme, toggleTheme } = useTheme()

  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()
  const urlQuery = searchParams.get('q') || ''

  // Local state for instant typing feedback; URL update in startTransition.
  const [localValue, setLocalValue] = useState(urlQuery)
  useEffect(() => { setLocalValue(urlQuery) }, [urlQuery])

  // Mobile menu open state
  const [menuOpen, setMenuOpen] = useState(false)

  function onChange(value) {
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

  return (
    <>
      <nav className="
        sticky top-0 z-50 backdrop-blur
        bg-white/80 dark:bg-black/70
        border-b border-black/5 dark:border-white/5
        transition-colors
      ">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center gap-3 sm:gap-6">

          {/* ── Mobile-only burger button (left side) ───────────── */}
          <button
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            className="
              md:hidden shrink-0 w-9 h-9 rounded-full flex items-center justify-center
              bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10
              border border-black/10 dark:border-white/10
              transition
            "
          >
            {/* Burger icon — three lines */}
            <svg viewBox="0 0 18 18" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="2" y1="5"  x2="16" y2="5"  />
              <line x1="2" y1="9"  x2="16" y2="9"  />
              <line x1="2" y1="13" x2="16" y2="13" />
            </svg>
          </button>

          {/* ── Brand ───────────────────────────────────────────── */}
          <Link to="/" className="flex items-center gap-2.5 shrink-0 group">
            <Logo size={32} className="transition-transform group-hover:scale-110" />
            <span className="
              font-display text-2xl sm:text-3xl tracking-[0.08em] leading-none
              text-brand
            ">
              MOVIETRACKER
            </span>
          </Link>

          {/* ── Desktop-only nav links + search ─────────────────── */}
          <div className="hidden md:flex items-center gap-1 shrink-0">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-full text-sm transition ${
                  isActive
                    ? 'bg-black/10 text-neutral-900 dark:bg-white/10 dark:text-white'
                    : 'text-neutral-500 hover:text-neutral-900 dark:text-white/60 dark:hover:text-white'
                }`
              }
            >
              Browse
            </NavLink>
            <NavLink
              to="/actors"
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-full text-sm transition ${
                  isActive
                    ? 'bg-black/10 text-neutral-900 dark:bg-white/10 dark:text-white'
                    : 'text-neutral-500 hover:text-neutral-900 dark:text-white/60 dark:hover:text-white'
                }`
              }
            >
              Actors
            </NavLink>
            {user && (
              <NavLink
                to="/favorites"
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-full text-sm transition flex items-center gap-1 ${
                    isActive
                      ? 'bg-black/10 text-neutral-900 dark:bg-white/10 dark:text-white'
                      : 'text-neutral-500 hover:text-neutral-900 dark:text-white/60 dark:hover:text-white'
                  }`
                }
              >
                <span className="text-brand">♥</span>
                Library
              </NavLink>
            )}
          </div>

          {/* Desktop search — hidden on mobile (search lives in drawer) */}
          <div className="hidden md:block flex-1 max-w-xl">
            <input
              type="text"
              value={localValue}
              onChange={(e) => onChange(e.target.value)}
              placeholder="Search movies & TV shows…"
              className="
                w-full px-4 py-2 rounded-full
                bg-black/5 dark:bg-white/5
                border border-black/10 dark:border-white/10
                text-sm text-neutral-900 dark:text-white
                placeholder:text-neutral-400 dark:placeholder:text-white/40
                focus:outline-none focus:border-brand focus:bg-black/10 dark:focus:bg-white/10
                transition
              "
            />
          </div>

          {/* ── Right-side actions group ───────────────────────── */}
          <div className="ml-auto flex items-center gap-2 sm:gap-3 shrink-0">

            {/* Theme toggle — hidden on smallest mobile, lives in drawer */}
            <button
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              className="
                hidden sm:flex w-9 h-9 rounded-full items-center justify-center
                bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10
                border border-black/10 dark:border-white/10
                transition text-lg
              "
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>

            {/* Notification bell — only when signed in */}
            {user && <NotificationBell />}

            {/* Auth area */}
            {user ? (
              <UserMenu />
            ) : (
              /* Compact sign-in for mobile: icon only. Full pill for sm+. */
              <button
                onClick={signInWithGoogle}
                className="
                  flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full
                  bg-brand hover:bg-brand-light text-black font-medium text-sm
                  transition
                "
              >
                <svg className="w-4 h-4" viewBox="0 0 48 48">
                  <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z"/>
                  <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
                  <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.4-4.5 2.4-7.2 2.4-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
                  <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4.1 5.6l6.2 5.2c-.4.4 6.6-4.8 6.6-14.8 0-1.3-.1-2.3-.4-3.5z"/>
                </svg>
                <span className="hidden sm:inline">Sign in</span>
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile drawer — only rendered on small screens */}
      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  )
}

export default Navbar
