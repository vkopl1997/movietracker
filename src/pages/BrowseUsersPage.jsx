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
      <section className="w-full">
        <div className="
          rounded-3xl bg-gradient-to-br from-brand/[0.10] via-white/[0.02] to-transparent border border-brand/30
          shadow-2xl shadow-black/30
          overflow-hidden
        ">
          {/* ── Section: header (title + subtitle + count) ── */}
          <div className="px-5 sm:px-6 py-4 flex items-baseline justify-between gap-3 flex-wrap border-b border-white/[0.06]">
            <div>
              <h1 className="text-[15px] font-semibold tracking-tight text-white">Users</h1>
              <p className="mt-1.5 text-[12px] text-white/45">
                Everyone tracking movies on MovieTracker.
              </p>
            </div>
            {!loading && (
              <span className="text-[12px] text-white/45">
                {visible.length} {visible.length === 1 ? 'user' : 'users'}
              </span>
            )}
          </div>

          {/* ── Section: filters (search input + sort dropdown) ── */}
          <div className="px-5 sm:px-6 py-3.5 flex flex-wrap items-center gap-3 border-b border-white/[0.06]">
            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter by name…"
              className="
                flex-1 max-w-md min-w-[200px] px-3 py-1.5 rounded-md text-[13px]
                bg-white/[0.04] hover:bg-white/[0.06]
                border border-white/[0.06]
                text-white placeholder:text-white/35
                focus:outline-none focus:border-white/20 focus:bg-white/[0.06]
                transition
              "
            />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="
                px-2.5 py-1 rounded-md text-[12px] font-medium
                bg-white/[0.04] hover:bg-white/[0.06]
                border border-white/[0.06]
                text-white/70 hover:text-white
                focus:outline-none focus:border-white/20 transition
              "
            >
              <option value="likes"  className="bg-surface-1 text-white">Sort: Most liked</option>
              <option value="recent" className="bg-surface-1 text-white">Sort: Recently joined</option>
              <option value="alpha"  className="bg-surface-1 text-white">Sort: A → Z</option>
            </select>
          </div>

          {/* ── Section: body (loading / error / empty / grid) ── */}
          <div className="p-5 sm:p-6">
            {loading && <p className="text-[13px] text-white/50">Loading…</p>}

            {error && (
              <div className="p-4 rounded-md bg-red-500/10 border border-red-500/30 text-red-300 text-[13px]">
                ⚠️ {error}
                <div className="mt-2 text-[11px] opacity-80">
                  If you see "relation … does not exist" — run the Supabase SQL from chat.
                </div>
              </div>
            )}

            {!loading && !error && visible.length === 0 && (
              <p className="text-[13px] text-white/50">
                {filter ? `No users matching "${filter}"` : 'No users yet.'}
              </p>
            )}

            {visible.length > 0 && (
              <motion.div
                key={`${filter}-${sort}`}
                variants={gridContainer}
                initial="hidden"
                animate="show"
                className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5"
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
          </div>
        </div>
      </section>
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
      {/* Avatar + name → link to profile. Rectangular w/ rounded-md
          corners to match the Linear table design. */}
      <Link to={`/user/${id}`} className="block">
        <div className="
          aspect-square rounded-md overflow-hidden
          bg-white/[0.04]
          ring-1 ring-white/10
          mb-2.5 transition
          group-hover:ring-brand
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
            <div className="w-full h-full flex items-center justify-center text-4xl font-display text-brand bg-gradient-to-br from-neutral-700 to-neutral-900">
              {initial}
            </div>
          )}
        </div>

        <div className="text-[13px] font-semibold leading-tight line-clamp-1 text-white/85 group-hover:text-white transition-colors">
          {name}
        </div>

        <div className="text-[11px] text-white/45 mt-0.5">
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
