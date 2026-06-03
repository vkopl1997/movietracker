// Navbar — Linear.app pattern.
//
// Solid near-black bg, no blur, no glass. Logo + wordmark on the left, nav
// links in plain text with white/60 -> white hover (no pill backgrounds).
// Search lives inline at small size. Right rail: divider + Log in + a white
// Sign-up pill (Linear's primary CTA pattern), or user menu when signed in.

import { startTransition, useEffect, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import UserMenu from './UserMenu'
import Logo from './Logo'
import NotificationBell from './NotificationBell'
import MobileMenu from './MobileMenu'

// Linear's nav link looks: 14px, white/60 default, white on hover/active,
// NO background pill, NO border. The active state is just colour, not chrome.
const navLinkClass = ({ isActive }) =>
  `text-[14px] leading-none transition-colors ${
    isActive
      ? 'text-white'
      : 'text-white/60 hover:text-white'
  }`

function Navbar() {
  const { user, signInWithGoogle } = useAuth()

  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()
  const urlQuery = searchParams.get('q') || ''

  const [localValue, setLocalValue] = useState(urlQuery)
  useEffect(() => { setLocalValue(urlQuery) }, [urlQuery])

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
      <nav className="sticky top-0 z-50 bg-surface border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-6">

          {/* Mobile burger */}
          <button
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            className="md:hidden shrink-0 w-8 h-8 rounded-md flex items-center justify-center text-white/70 hover:text-white hover:bg-white/5 transition"
          >
            <svg viewBox="0 0 18 18" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="2" y1="5"  x2="16" y2="5"  />
              <line x1="2" y1="9"  x2="16" y2="9"  />
              <line x1="2" y1="13" x2="16" y2="13" />
            </svg>
          </button>

          {/* Brand: small logo + wordmark, white */}
          <Link to="/" className="flex items-center gap-2 shrink-0 text-white">
            <Logo size={22} className="shrink-0" />
            <span className="font-semibold text-[15px] tracking-tight leading-none">
              MovieTracker
            </span>
          </Link>

          {/* Desktop nav links — plain text */}
          <div className="hidden md:flex items-center gap-5 shrink-0">
            <NavLink to="/" end className={navLinkClass}>Browse</NavLink>
            <NavLink to="/actors" className={navLinkClass}>Actors</NavLink>
            <NavLink to="/users" className={navLinkClass}>Users</NavLink>
            <NavLink to="/pick" className={navLinkClass}>Pick</NavLink>
          </div>

          {/* Search — small / subtle, only on desktop */}
          <div className="hidden md:block flex-1 max-w-sm ml-auto">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                value={localValue}
                onChange={(e) => onChange(e.target.value)}
                placeholder="Search"
                className="w-full pl-9 pr-3 py-1.5 rounded-md text-[13px] bg-white/[0.04] border border-white/[0.08] text-white placeholder:text-white/35 focus:outline-none focus:border-white/20 focus:bg-white/[0.06] transition"
              />
            </div>
          </div>

          {/* Right rail */}
          <div className="ml-auto md:ml-3 flex items-center gap-3 shrink-0">
            {user && (
              <NavLink to="/favorites" className={`hidden sm:block ${navLinkClass({ isActive: location.pathname === '/favorites' })}`}>
                My List
              </NavLink>
            )}

            {user && <NotificationBell />}

            {/* Vertical divider — Linear's signature touch */}
            {!user && <span className="hidden sm:block h-5 w-px bg-white/10" aria-hidden />}

            {user ? (
              <UserMenu />
            ) : (
              <>
                <button
                  onClick={signInWithGoogle}
                  className="hidden sm:block text-[14px] text-white/60 hover:text-white transition"
                >
                  Log in
                </button>
                {/* Sign-up = the white pill primary, Linear's signature CTA */}
                <button
                  onClick={signInWithGoogle}
                  className="px-3 py-1.5 rounded-md bg-white hover:bg-white/90 text-black text-[13px] font-medium transition"
                >
                  Sign up
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  )
}

export default Navbar
