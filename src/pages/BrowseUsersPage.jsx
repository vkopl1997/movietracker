import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { gridContainer, cardVariant } from '../lib/motion'
import { usePageTitle } from '../lib/usePageTitle'

// Compact relative date: "joined 3d ago", "joined just now"
function formatJoined(iso) {
  const diffSec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diffSec < 60)    return 'joined just now'
  if (diffSec < 3600)  return `joined ${Math.floor(diffSec / 60)}m ago`
  if (diffSec < 86400) return `joined ${Math.floor(diffSec / 3600)}h ago`
  if (diffSec < 86400 * 30) return `joined ${Math.floor(diffSec / 86400)}d ago`
  const d = new Date(iso)
  return `joined ${d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}`
}

function BrowseUsersPage() {
  usePageTitle('Users')
  const [users, setUsers]     = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [filter, setFilter]   = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    supabase
      .from('profiles')
      .select('id, display_name, avatar_url, created_at')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) setError(error.message)
        else setUsers(data || [])
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  // Client-side filter by name
  const visible = filter.trim()
    ? users.filter((u) =>
        (u.display_name || '').toLowerCase().includes(filter.trim().toLowerCase())
      )
    : users

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <header className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold mb-1">Users</h1>
        <p className="text-sm text-neutral-500 dark:text-white/50">
          Everyone tracking movies on MovieTracker.
        </p>
      </header>

      {/* Filter input */}
      <div className="mb-8 max-w-md">
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter by name…"
          className="
            w-full px-4 py-2.5 rounded-full text-sm
            bg-black/5 dark:bg-white/5
            border border-black/10 dark:border-white/10
            text-neutral-900 dark:text-white
            placeholder:text-neutral-400 dark:placeholder:text-white/40
            focus:outline-none focus:border-brand transition
          "
        />
      </div>

      {loading && <p className="text-neutral-500 dark:text-white/50">Loading…</p>}

      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-300 text-sm">
          ⚠️ {error}
          <div className="mt-2 text-xs opacity-80">
            If you see "relation profiles does not exist" — run the Supabase SQL from chat.
          </div>
        </div>
      )}

      {!loading && !error && visible.length === 0 && (
        <p className="text-neutral-500 dark:text-white/50">
          {filter ? `No users matching "${filter}"` : 'No users yet.'}
        </p>
      )}

      {visible.length > 0 && (
        <motion.div
          key={filter}
          variants={gridContainer}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6"
        >
          {visible.map((u) => (
            <motion.div key={u.id} variants={cardVariant}>
              <UserCard {...u} />
            </motion.div>
          ))}
        </motion.div>
      )}
    </main>
  )
}

function UserCard({ id, display_name, avatar_url, created_at }) {
  const name = display_name || 'Anonymous'
  const initial = name.trim().charAt(0).toUpperCase() || '?'

  return (
    <Link to={`/user/${id}`} className="group text-center block">
      <div className="
        aspect-square rounded-full overflow-hidden
        bg-neutral-200 dark:bg-neutral-800
        ring-1 ring-black/5 dark:ring-white/5
        mb-3 transition
        group-hover:ring-2 group-hover:ring-brand
        group-hover:shadow-lg group-hover:shadow-brand/20
      ">
        {avatar_url ? (
          <img
            src={avatar_url}
            alt={name}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
            onError={(e) => { e.currentTarget.style.display = 'none' }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl font-display text-brand bg-gradient-to-br from-neutral-300 to-neutral-200 dark:from-neutral-700 dark:to-neutral-800">
            {initial}
          </div>
        )}
      </div>
      <div className="text-sm font-semibold leading-tight line-clamp-1 group-hover:text-brand transition-colors">
        {name}
      </div>
      {created_at && (
        <div className="text-[11px] text-neutral-500 dark:text-white/50 mt-0.5">
          {formatJoined(created_at)}
        </div>
      )}
    </Link>
  )
}

export default BrowseUsersPage
