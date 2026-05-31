// Standalone bell icon in the navbar (sibling of the avatar, NOT nested in it).
// Clicking it opens a panel of notifications and marks all as read.

import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useNotifications } from '../lib/NotificationsContext'
import { dropdownVariant } from '../lib/motion'

// Format an ISO timestamp as a friendly relative string: "just now", "5m ago", "2h ago", "3d ago"
function formatRelative(iso) {
  const diffSec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diffSec < 60)    return 'just now'
  if (diffSec < 3600)  return `${Math.floor(diffSec / 60)}m ago`
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`
  return `${Math.floor(diffSec / 86400)}d ago`
}

function NotificationBell() {
  const { notifications, unreadCount, markAllRead, clearAll } = useNotifications()
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)

  // When the panel opens → mark all as read so the badge clears.
  // (The notifications themselves stay visible — only their `read` flag flips.)
  useEffect(() => {
    if (open && unreadCount > 0) markAllRead()
  }, [open, unreadCount, markAllRead])

  // Click outside / Escape closes the panel.
  useEffect(() => {
    if (!open) return
    function onClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    function onKey(e) { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={containerRef} className="relative shrink-0">
      {/* Bell button — same circular style as theme toggle for visual consistency */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={`Notifications (${unreadCount} unread)`}
        title="Notifications"
        className="
          relative w-9 h-9 rounded-full flex items-center justify-center
          bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10
          border border-black/10 dark:border-white/10
          transition
        "
      >
        {/* Bell SVG */}
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" strokeLinecap="round" strokeLinejoin="round" />
        </svg>

        {/* Unread count badge — only shown when count > 0.
            Animates in/out with a small pop. */}
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 25 }}
              className="
                absolute -top-1 -right-1
                min-w-[18px] h-[18px] px-1
                rounded-full bg-brand text-black
                text-[10px] font-bold leading-none
                flex items-center justify-center
              "
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      {/* Notification panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            variants={dropdownVariant}
            initial="hidden"
            animate="show"
            exit="exit"
            style={{ transformOrigin: 'top right' }}
            className="
              absolute right-0 top-full mt-2 w-80
              rounded-xl overflow-hidden
              bg-white dark:bg-neutral-900
              border border-black/10 dark:border-white/10
              shadow-2xl shadow-black/20 dark:shadow-black/60
              z-50
            "
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-black/5 dark:border-white/10 flex items-center justify-between">
              <span className="font-semibold text-sm">Notifications</span>
              {notifications.length > 0 && (
                <button
                  onClick={clearAll}
                  className="text-xs text-neutral-500 dark:text-white/50 hover:text-brand transition"
                >
                  Clear all
                </button>
              )}
            </div>

            {/* Empty state */}
            {notifications.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <div className="text-4xl mb-3 opacity-60">🔔</div>
                <p className="text-sm text-neutral-500 dark:text-white/50">
                  No notifications yet
                </p>
              </div>
            ) : (
              /* Scrollable list — caps height so it doesn't take over the screen */
              <div className="max-h-96 overflow-y-auto">
                {notifications.map((n) => (
                  <NotificationItem
                    key={n.id}
                    notification={n}
                    onClick={() => setOpen(false)}
                  />
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Single notification row. Renders as a Link if it has a `link`; otherwise plain div.
function NotificationItem({ notification: n, onClick }) {
  // Reusable inner content (icon + message + timestamp)
  const inner = (
    <div className="flex items-start gap-3">
      <span className={`text-base mt-0.5 ${
        n.type === 'add'    ? 'text-brand' :
        n.type === 'remove' ? 'text-neutral-400' :
                              'text-red-400'
      }`}>
        {n.type === 'add' ? '♥' : n.type === 'remove' ? '✕' : '⚠'}
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-sm leading-snug">{n.message}</div>
        <div className="text-[10px] text-neutral-400 dark:text-white/40 mt-1">
          {formatRelative(n.createdAt)}
        </div>
      </div>
      {n.link && (
        <span className="text-neutral-400 dark:text-white/40 text-xs mt-1">→</span>
      )}
    </div>
  )

  // Common class for both Link and div variants
  const cls = `block px-4 py-3 border-b border-black/5 dark:border-white/10 last:border-b-0 transition ${
    n.link ? 'hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer' : ''
  }`

  if (n.link) {
    return (
      <Link to={n.link} onClick={onClick} className={cls}>
        {inner}
      </Link>
    )
  }
  return <div className={cls}>{inner}</div>
}

export default NotificationBell
