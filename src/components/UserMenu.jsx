// User dropdown menu — opens when you click the avatar.
//
// Patterns demonstrated:
//   - useState for open/closed
//   - useRef to track the dropdown's DOM node
//   - useEffect to attach/remove global listeners (click-outside + Escape)
//   - Conditional rendering for the menu panel

import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuth } from '../lib/AuthContext'
import { dropdownVariant } from '../lib/motion'

function UserMenu() {
  const { user, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)

  // Close when clicking outside the menu OR pressing Escape.
  useEffect(() => {
    if (!open) return  // only attach listeners while menu is open

    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }

    function handleKey(e) {
      if (e.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  if (!user) return null

  const avatar  = user.user_metadata?.avatar_url
  const name    = user.user_metadata?.full_name
  const email   = user.email

  // Helper: close menu then run an action (used by menu items).
  function close() { setOpen(false) }

  return (
    <div ref={containerRef} className="relative shrink-0">
      {/* Trigger — a clean standalone circular avatar button. No caret.
          Gold ring is always visible; on hover it brightens; when open it pulses subtly. */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Open user menu"
        className={`
          relative block w-10 h-10 rounded-full overflow-hidden
          ring-2 transition-all duration-200
          focus:outline-none focus:ring-brand-light
          ${open
            ? 'ring-brand-light scale-105 shadow-lg shadow-brand/30'
            : 'ring-brand/70 hover:ring-brand hover:scale-105'}
        `}
      >
        {avatar ? (
          <img
            src={avatar}
            alt="avatar"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-brand text-black font-bold flex items-center justify-center text-sm">
            {(name || email || '?')[0].toUpperCase()}
          </div>
        )}
      </button>

      {/* Dropdown panel — AnimatePresence lets us animate the EXIT (close) too,
          not just the entrance. Without it, the menu would just disappear instantly. */}
      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            variants={dropdownVariant}
            initial="hidden"
            animate="show"
            exit="exit"
            style={{ transformOrigin: 'top right' }}
            className="
              absolute right-0 top-full mt-2 w-64
              rounded-xl overflow-hidden
              bg-white dark:bg-neutral-900
              border border-black/10 dark:border-white/10
              shadow-2xl shadow-black/20 dark:shadow-black/60
              backdrop-blur
              z-50
            "
          >
          {/* User info header */}
          <div className="px-4 py-3 border-b border-black/5 dark:border-white/10">
            <div className="font-semibold text-sm truncate">
              {name || 'Account'}
            </div>
            <div className="text-xs text-neutral-500 dark:text-white/50 truncate">
              {email}
            </div>
          </div>

          {/* Library link */}
          <Link
            to="/favorites"
            onClick={close}
            role="menuitem"
            className="
              flex items-center gap-3 px-4 py-2.5 text-sm transition
              text-neutral-700 dark:text-white/80
              hover:bg-black/5 dark:hover:bg-white/5
            "
          >
            <span className="text-brand text-base">♥</span>
            <span>My Library</span>
          </Link>

          {/* Divider */}
          <div className="border-t border-black/5 dark:border-white/10" />

            {/* Sign out */}
            <button
              onClick={() => { close(); signOut() }}
              role="menuitem"
              className="
                w-full flex items-center gap-3 px-4 py-2.5 text-sm transition text-left
                text-neutral-700 dark:text-white/80
                hover:bg-black/5 dark:hover:bg-white/5
              "
            >
              <span className="text-base">↪</span>
              <span>Sign out</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default UserMenu
