import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { gridContainer, cardVariant } from '../lib/motion'
import { usePageTitle } from '../lib/usePageTitle'
import LikeButton from '../components/LikeButton'

// Fetch profiles + aggregate counts (movies/TV per user + likes received).
// JS-side aggregation is fine while the user base is small; future versions
// could use a Postgres view or RPC for scale.
async function fetchUsersWithStats(currentUserId) {
  const [profilesRes, favsRes, likesRes] = await Promise.all([
    supabase.from('profiles').select('id, display_name, avatar_url, created_at'),
    supabase.from('user_favorites').select('user_id, media_type'),
    supabase.from('user_likes').select('liker_id, liked_id'),
  ])
  if (profilesRes.error) throw profilesRes.error
  if (favsRes.error)     throw favsRes.error
  if (likesRes.error)    throw likesRes.error

  // Per-user counters
  const movieCount = {}
  const tvCount    = {}
  for (const f of favsRes.data || []) {
    if (f.media_type === 'movie') movieCount[f.user_id] = (movieCount[f.user_id] || 0) + 1
    if (f.media_type === 'tv')    tvCount[f.user_id]    = (tvCount[f.user_id] || 0) + 1
  }

  const likeCount  = {}
  const likedByMe  = new Set()
  for (const l of likesRes.data || []) {
    likeCount[l.liked_id] = (likeCount[l.liked_id] || 0) + 1
    if (currentUserId && l.liker_id === currentUserId) likedByMe.add(l.liked_id)
  }

  return (profilesRes.data || []).map((p) => ({
    ...p,
    movieCount: movieCount[p.id] || 0,
    tvCount:    tvCount[p.id]    || 0,
    likeCount:  likeCount[p.id]  || 0,
    likedByMe:  likedByMe.has(p.id),
  }))
}

function BrowseUsersPage() {
  usePageTitle('Users')
  const { user } = useAuth()
  const [users, setUsers]     = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [filter, setFilter]   = useState('')
  const [sort, setSort]       = useState('likes')   // likes | recent | alpha

  useEffect(() => {
    let cancelled = false
    setLoading(true); setError(null)
    fetchUsersWithStats(user?.id)
      .then((data) => { if (!cancelled) setUsers(data) })
      .catch((err) => { if (!cancelled) setError(err.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [user?.id])

  const visible = useMemo(() => {
    const list = filter.trim()
      ? users.filter((u) => (u.display_name || '').toLowerCase().includes(filter.trim().toLowerCase()))
      : users

    return [...list].sort((a, b) => {
      switch (sort) {
        case 'alpha':  return (a.display_name || '').localeCompare(b.display_name || '')
        case 'recent': return new Date(b.created_at) - new Date(a.created_at)
        case 'likes':
        default:       return (b.likeCount - a.likeCount) || (b.movieCount + b.tvCount - a.movieCount - a.tvCount)
      }
    })
  }, [users, filter, sort])

  // Optimistically update a user's like state in our local list when LikeButton fires onChange
  function handleLikeChange(userId, { liked, count }) {
    setUsers((prev) => prev.map((u) =>
      u.id === userId ? { ...u, likedByMe: liked, likeCount: count } : u
    ))
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <header className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold mb-1">Users</h1>
        <p className="text-sm text-neutral-500 dark:text-white/50">
          Everyone tracking movies on MovieTracker.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-3 mb-8">
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter by name…"
          className="
            flex-1 max-w-md min-w-[200px] px-4 py-2.5 rounded-full text-sm
            bg-black/5 dark:bg-white/5
            border border-black/10 dark:border-white/10
            text-neutral-900 dark:text-white
            placeholder:text-neutral-400 dark:placeholder:text-white/40
            focus:outline-none focus:border-brand transition
          "
        />
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="
            px-3 py-2 rounded-full text-sm
            bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10
            border border-black/10 dark:border-white/10
            text-neutral-700 dark:text-white/70
            focus:outline-none focus:border-brand transition
          "
        >
          <option value="likes">Sort: Most liked</option>
          <option value="recent">Sort: Recently joined</option>
          <option value="alpha">Sort: A → Z</option>
        </select>
      </div>

      {loading && <p className="text-neutral-500 dark:text-white/50">Loading…</p>}

      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-300 text-sm">
          ⚠️ {error}
          <div className="mt-2 text-xs opacity-80">
            If you see "relation … does not exist" — run the Supabase SQL from chat.
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
          key={`${filter}-${sort}`}
          variants={gridContainer}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6"
        >
          {visible.map((u) => (
            <motion.div key={u.id} variants={cardVariant}>
              <UserCard
                {...u}
                onLikeChange={(state) => handleLikeChange(u.id, state)}
              />
            </motion.div>
          ))}
        </motion.div>
      )}
    </main>
  )
}

function UserCard({
  id, display_name, avatar_url,
  movieCount, tvCount, likeCount, likedByMe,
  onLikeChange,
}) {
  const name = display_name || 'Anonymous'
  const initial = name.trim().charAt(0).toUpperCase() || '?'

  return (
    <div className="group text-center">
      {/* Avatar + name → link to profile */}
      <Link to={`/user/${id}`} className="block">
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

        <div className="text-[11px] text-neutral-500 dark:text-white/50 mt-0.5">
          {movieCount} {movieCount === 1 ? 'movie' : 'movies'} · {tvCount} TV
        </div>
      </Link>

      {/* Like button — sibling of Link so its click doesn't navigate */}
      <div className="mt-2 flex justify-center">
        <LikeButton
          targetUserId={id}
          likeCount={likeCount}
          likedByMe={likedByMe}
          onChange={onLikeChange}
          size="sm"
        />
      </div>
    </div>
  )
}

export default BrowseUsersPage
