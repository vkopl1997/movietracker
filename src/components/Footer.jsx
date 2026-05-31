// Site-wide footer. Sits at the bottom of every page via Layout.
//
// Contents:
//   - Logo + wordmark (consistent with the navbar)
//   - Small set of in-app nav links
//   - Tech stack credits (TMDb attribution is required by their terms)
//   - Personal credit + copyright

import { Link } from 'react-router-dom'
import Logo from './Logo'

const YEAR = new Date().getFullYear()

function Footer() {
  return (
    <footer className="
      mt-20 border-t border-black/5 dark:border-white/5
      bg-neutral-100/50 dark:bg-black/40
      transition-colors
    ">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        {/* Brand */}
        <div className="flex items-center justify-center gap-2.5 mb-6">
          <Logo size={28} />
          <span className="font-display text-2xl tracking-[0.08em] leading-none text-brand">
            MOVIETRACKER
          </span>
        </div>

        {/* Nav links */}
        <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 mb-8 text-sm">
          <Link to="/"        className="text-neutral-500 hover:text-neutral-900 dark:text-white/60 dark:hover:text-white transition">Browse</Link>
          <Link to="/actors"  className="text-neutral-500 hover:text-neutral-900 dark:text-white/60 dark:hover:text-white transition">Actors</Link>
          <Link to="/users"   className="text-neutral-500 hover:text-neutral-900 dark:text-white/60 dark:hover:text-white transition">Users</Link>
          <Link to="/favorites" className="text-neutral-500 hover:text-neutral-900 dark:text-white/60 dark:hover:text-white transition">My List</Link>
        </nav>

        {/* Tech credits — required attribution + recognition */}
        <div className="text-center mb-8">
          <p className="text-xs text-neutral-500 dark:text-white/50 leading-relaxed">
            Movie & TV data from{' '}
            <a
              href="https://www.themoviedb.org"
              target="_blank" rel="noopener noreferrer"
              className="text-brand hover:underline"
            >
              The Movie Database (TMDb)
            </a>
          </p>
          <p className="text-[11px] text-neutral-400 dark:text-white/40 mt-1">
            Built with React · Tailwind · Supabase · deployed on Vercel
          </p>
        </div>

        {/* Personal credit + copyright */}
        <div className="text-center">
          <p className="text-sm">
            Made by{' '}
            <a
              href="https://github.com/vkopl1997"
              target="_blank" rel="noopener noreferrer"
              className="font-semibold hover:text-brand transition"
            >
              Vazha Koplatadze
            </a>
          </p>
          <p className="text-[11px] text-neutral-400 dark:text-white/40 mt-1">
            © {YEAR} MovieTracker · Personal project, not affiliated with TMDb
          </p>
        </div>
      </div>
    </footer>
  )
}

export default Footer
