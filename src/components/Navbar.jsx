import { Link, NavLink, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { useTheme } from '../lib/ThemeContext'
import UserMenu from './UserMenu'
import Logo from './Logo'
import NotificationBell from './NotificationBell'

function Navbar() {
  const { user, signInWithGoogle } = useAuth()
  const { theme, toggleTheme } = useTheme()

  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()
  const query = searchParams.get('q') || ''

  function onChange(value) {
    if (location.pathname !== '/') {
      navigate(value ? `/?q=${encodeURIComponent(value)}` : '/')
      return
    }
    if (value) setSearchParams({ q: value })
    else setSearchParams({})
  }

  return (
    <nav className="
      sticky top-0 z-40 backdrop-blur
      bg-white/80 dark:bg-black/70
      border-b border-black/5 dark:border-white/5
      transition-colors
    ">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-6">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-2 shrink-0 group">
          <Logo size={32} className="transition-transform group-hover:scale-110" />
          <span className="text-lg font-bold tracking-wide text-brand">
            MovieTracker
          </span>
        </Link>

        {/* Nav links — Favorites also appears in the user dropdown (deliberate duplication
            for discoverability: in the nav for quick access, in the dropdown for context). */}
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
              Favorites
            </NavLink>
          )}
        </div>

        {/* Search */}
        <div className="flex-1 max-w-xl">
          <input
            type="text"
            value={query}
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

        {/* Right-side group — ml-auto pushes it to the far right edge,
            absorbing any empty space between the search bar (capped at max-w-xl)
            and the navbar's right edge. */}
        <div className="ml-auto flex items-center gap-3 shrink-0">
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            className="
              w-9 h-9 rounded-full flex items-center justify-center
              bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10
              border border-black/10 dark:border-white/10
              transition text-lg
            "
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>

          {/* Notification bell — only shown when signed in, since only signed-in
              users can favorite (and thus generate notifications). */}
          {user && <NotificationBell />}

          {/* Auth area */}
          {user ? (
            <UserMenu />
          ) : (
            <button
              onClick={signInWithGoogle}
              className="
                flex items-center gap-2 px-4 py-2 rounded-full
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
            Sign in
          </button>
          )}
        </div>
      </div>
    </nav>
  )
}

export default Navbar
