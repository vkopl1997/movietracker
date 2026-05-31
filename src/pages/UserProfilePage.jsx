import { useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { fetchProfile, fetchUserMediaByUserId } from '../lib/favorites'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { useFavorites } from '../lib/FavoritesContext'
import { gridContainer, cardVariant, fadeUp } from '../lib/motion'
import { usePageTitle } from '../lib/usePageTitle'
import MediaCard from '../components/MediaCard'
import { SkeletonGrid } from '../components/SkeletonCard'
import LikeButton from '../components/LikeButton'
import HorizontalRow from '../components/HorizontalRow'

const STATUS_TABS = [
  { value: 'all',       label: 'All',       color: 'bg-brand' },
  { value: 'favorites', label: 'Favorites', color: 'bg-brand' },
  { value: 'watched',   label: 'Watched',   color: 'bg-emerald-500' },
  { value: 'watchlist', label: 'Watchlist', color: 'bg-sky-500' },
]

function joinedLabel(iso) {
  if (!iso) return null
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long' })
}

function UserProfilePage() {
  const { id } = useParams()
  const { user } = useAuth()
  const { items: myItems } = useFavorites()   // current user's tracked items, for overlap calc
  const [profile, setProfile] = useState(null)
  const [items, setItems]     = useState([])
  const [likeCount, setLikeCount] = useState(0)
  const [likedByMe, setLikedByMe] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [tab, setTab]         = useState('all')
  const [type, setType]       = useState('all')   // all | movie | tv

  const isOwnProfile = user?.id === id

  usePageTitle(profile?.display_name)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    Promise.all([
      fetchProfile(id),
      fetchUserMediaByUserId(id),
      supabase.from('user_likes').select('liker_id').eq('liked_id', id),
    ])
      .then(([p, m, likesRes]) => {
        if (cancelled) return
        setProfile(p)
        setItems(m)
        const likeRows = likesRes.data || []
        setLikeCount(likeRows.length)
        setLikedByMe(!!user && likeRows.some((row) => row.liker_id === user.id))
      })
      .catch((err) => { if (!cancelled) setError(err.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [id, user?.id])

  // Filter list based on tab + type
  const visible = useMemo(() => {
    const baseList =
      tab === 'favorites' ? items.filter((i) => i.isFavorite) :
      tab === 'watched'   ? items.filter((i) => i.isWatched) :
      tab === 'watchlist' ? items.filter((i) => i.isWatchlist) :
                            items
    return type === 'all' ? baseList : baseList.filter((i) => i.mediaType === type)
  }, [items, tab, type])

  const counts = {
    all:       items.length,
    favorites: items.filter((i) => i.isFavorite).length,
    watched:   items.filter((i) => i.isWatched).length,
    watchlist: items.filter((i) => i.isWatchlist).length,
  }

  // ── Compute overlap between the current user and the profile owner ──
  // Returns the profile owner's items that I also have, plus a small
  // breakdown of how our flags align (both-favorited, both-watched, etc.).
  const { sharedItems, sharedStats } = useMemo(() => {
    if (!user || isOwnProfile || items.length === 0 || myItems.length === 0) {
      return { sharedItems: [], sharedStats: { both: 0, fav: 0, watched: 0, watchlist: 0 } }
    }
    const myMap = new Map(myItems.map((m) => [`${m.mediaType}-${m.id}`, m]))
    const shared = []
    const stats  = { both: 0, fav: 0, watched: 0, watchlist: 0 }
    for (const t of items) {
      const key = `${t.mediaType}-${t.id}`
      const mine = myMap.get(key)
      if (!mine) continue
      shared.push(t)
      stats.both++
      if (mine.isFavorite  && t.isFavorite)  stats.fav++
      if (mine.isWatched   && t.isWatched)   stats.watched++
      if (mine.isWatchlist && t.isWatchlist) stats.watchlist++
    }
    return { sharedItems: shared, sharedStats: stats }
  }, [items, myItems, user, isOwnProfile])

  if (loading) {
    return (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <p className="text-neutral-500 dark:text-white/50 mb-6">Loading…</p>
        <SkeletonGrid count={8} />
      </main>
    )
  }

  if (error) {
    return (
      <main className="max-w-7xl mx-auto px-6 py-20">
        <p className="text-red-700 dark:text-red-300 mb-4">⚠️ {error}</p>
        <Link to="/users" className="text-brand hover:underline">← Back to Users</Link>
      </main>
    )
  }

  if (!profile) return null

  const name = profile.display_name || 'Anonymous'
  const initial = name.trim().charAt(0).toUpperCase() || '?'

  return (
    <motion.article
      key={id}
      variants={fadeUp}
      initial="hidden"
      animate="show"
      className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12"
    >
      {/* ── Profile header ───────────────────────────────────── */}
      <section className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-10">
        <div className="
          shrink-0 w-32 h-32 sm:w-40 sm:h-40 rounded-full overflow-hidden
          ring-1 ring-black/10 dark:ring-white/10
          shadow-xl
        ">
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={name}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
              onError={(e) => { e.currentTarget.style.display = 'none' }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-6xl font-display text-brand bg-gradient-to-br from-neutral-300 to-neutral-200 dark:from-neutral-700 dark:to-neutral-800">
              {initial}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0 text-center sm:text-left">
          <h1 className="font-display text-4xl sm:text-5xl tracking-[0.02em] leading-tight mb-2">
            {name}
          </h1>
          {profile.created_at && (
            <p className="text-sm text-neutral-500 dark:text-white/50 mb-4">
              Joined {joinedLabel(profile.created_at)}
            </p>
          )}

          {/* Like button — big variant. Disabled on own profile. */}
          <div className="mb-4 flex justify-center sm:justify-start">
            <LikeButton
              targetUserId={id}
              likeCount={likeCount}
              likedByMe={likedByMe}
              size="lg"
              onChange={({ liked, count }) => {
                setLikedByMe(liked)
                setLikeCount(count)
              }}
            />
          </div>

          {/* Stat pills */}
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <StatPill icon="♥" label="favorites" value={counts.favorites} color="text-brand" />
            <StatPill icon="✓" label="watched"   value={counts.watched}   color="text-emerald-500" />
            <StatPill icon="🔖" label="watchlist" value={counts.watchlist} color="text-sky-500" />
          </div>
        </div>
      </section>

      {/* ── Shared with you (only when signed in + not own profile) ── */}
      {sharedItems.length > 0 && (
        <section className="mb-12">
          <h2 className="text-xl font-bold mb-2">
            You and {name} share {sharedItems.length} {sharedItems.length === 1 ? 'title' : 'titles'}
          </h2>
          <div className="flex flex-wrap gap-2 mb-4">
            {sharedStats.fav > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand/10 text-brand text-xs font-medium border border-brand/30">
                ♥ Both favorited <strong>{sharedStats.fav}</strong>
              </span>
            )}
            {sharedStats.watched > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-xs font-medium border border-emerald-500/30">
                ✓ Both watched <strong>{sharedStats.watched}</strong>
              </span>
            )}
            {sharedStats.watchlist > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/10 text-sky-500 text-xs font-medium border border-sky-500/30">
                🔖 Both on watchlist <strong>{sharedStats.watchlist}</strong>
              </span>
            )}
          </div>
          <HorizontalRow title="" items={sharedItems} />
        </section>
      )}

      {/* ── Status tabs ─────────────────────────────────────── */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {STATUS_TABS.map((t) => {
          const active = tab === t.value
          return (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition flex items-center gap-2 ${
                active
                  ? `${t.color} text-black`
                  : 'bg-black/5 hover:bg-black/10 text-neutral-700 border border-black/10 dark:bg-white/5 dark:hover:bg-white/10 dark:text-white/70 dark:border-white/10'
              }`}
            >
              {t.label}
              <span className="opacity-60">({counts[t.value]})</span>
            </button>
          )
        })}
      </div>

      {/* ── Type filter ─────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-8">
        <div className="flex rounded-full bg-black/5 dark:bg-white/5 p-1 border border-black/10 dark:border-white/10">
          {['all', 'movie', 'tv'].map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                type === t
                  ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow'
                  : 'text-neutral-500 dark:text-white/60'
              }`}
            >
              {t === 'all' ? 'All' : t === 'movie' ? 'Movies' : 'TV'}
            </button>
          ))}
        </div>

        <div className="ml-auto text-xs text-neutral-500 dark:text-white/40">
          {visible.length} {visible.length === 1 ? 'item' : 'items'}
        </div>
      </div>

      {/* ── Grid ─────────────────────────────────────────────── */}
      {visible.length === 0 ? (
        <div className="p-12 rounded-2xl border border-black/10 bg-white dark:border-white/10 dark:bg-white/5 text-center">
          <div className="text-5xl mb-4">
            {tab === 'favorites' ? '💔' : tab === 'watched' ? '👀' : tab === 'watchlist' ? '🗒️' : '🎬'}
          </div>
          <h2 className="text-lg font-semibold mb-2">
            {tab === 'all'
              ? "Nothing in their library yet"
              : tab === 'favorites'
              ? `No favorites yet`
              : tab === 'watched'
              ? `Nothing marked watched yet`
              : `Nothing on the watchlist yet`}
          </h2>
        </div>
      ) : (
        <motion.div
          key={`${tab}-${type}`}
          variants={gridContainer}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5"
        >
          {visible.map((item) => (
            <motion.div key={`${item.mediaType}-${item.id}`} variants={cardVariant}>
              <MediaCard {...item} />
            </motion.div>
          ))}
        </motion.div>
      )}

      <div className="mt-10">
        <Link to="/users" className="text-sm text-neutral-500 dark:text-white/60 hover:text-brand transition">
          ← All users
        </Link>
      </div>
    </motion.article>
  )
}

function StatPill({ icon, label, value, color }) {
  return (
    <span className="
      inline-flex items-center gap-1.5 px-3 py-1 rounded-full
      bg-black/5 dark:bg-white/5
      border border-black/10 dark:border-white/10
      text-sm
    ">
      <span className={color}>{icon}</span>
      <strong className="font-semibold">{value}</strong>
      <span className="text-neutral-500 dark:text-white/50 text-xs">{label}</span>
    </span>
  )
}

export default UserProfilePage
