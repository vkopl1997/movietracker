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
      {/* ── Profile header — avatar + framed bio card ─────────── */}
      <section className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-10">
        {/* Avatar — rectangular, smaller, flatter Linear-style ring */}
        <div className="
          shrink-0 w-28 h-28 sm:w-32 sm:h-32 rounded-md overflow-hidden
          ring-1 ring-white/10
          shadow-[0_8px_24px_-12px_rgba(0,0,0,0.5)]
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
            <div className="w-full h-full flex items-center justify-center text-5xl font-display text-brand bg-gradient-to-br from-neutral-700 to-neutral-900">
              {initial}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0 w-full">
          <div className="
            w-full rounded-3xl bg-gradient-to-br from-brand/[0.10] via-white/[0.02] to-transparent border border-brand/30
            shadow-2xl shadow-black/30
            overflow-hidden
          ">
            {/* ── Section: header (name + joined) ── */}
            <div className="px-5 sm:px-6 pt-4 pb-4 border-b border-white/[0.06]">
              <h1 className="font-display text-2xl sm:text-3xl tracking-[-0.02em] leading-[1.1] text-white">
                {name}
              </h1>
              {profile.created_at && (
                <p className="mt-1.5 text-[12px] text-white/45">
                  Joined {joinedLabel(profile.created_at)}
                </p>
              )}
            </div>

            {/* ── Section: like button ── */}
            <div className="px-5 sm:px-6 py-3 border-b border-white/[0.06]">
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

            {/* ── Section: library stats (3 stat pills) ── */}
            <div className="px-5 sm:px-6 py-3 flex flex-wrap items-center gap-2">
              <StatPill icon="♥"  label="favorites" value={counts.favorites} color="text-pink-400"    />
              <StatPill icon="✓"  label="watched"   value={counts.watched}   color="text-emerald-400" />
              <StatPill icon="🔖" label="watchlist" value={counts.watchlist} color="text-sky-400"     />
            </div>
          </div>
        </div>
      </section>

      {/* ── Shared with you — framed card ─────────────────────── */}
      {sharedItems.length > 0 && (
        <section className="mb-12 w-full">
          <div className="
            rounded-3xl bg-gradient-to-br from-brand/[0.10] via-white/[0.02] to-transparent border border-brand/30
            shadow-2xl shadow-black/30
            overflow-hidden
          ">
            {/* Header */}
            <div className="px-5 sm:px-6 py-4 flex items-baseline justify-between gap-3 flex-wrap border-b border-white/[0.06]">
              <h2 className="text-[15px] font-semibold tracking-tight text-white">
                You and {name} share {sharedItems.length} {sharedItems.length === 1 ? 'title' : 'titles'}
              </h2>
              <span className="text-[12px] text-white/45">
                {sharedItems.length} shared
              </span>
            </div>

            {/* Stats chips */}
            {(sharedStats.fav > 0 || sharedStats.watched > 0 || sharedStats.watchlist > 0) && (
              <div className="px-5 sm:px-6 py-3 flex flex-wrap gap-2 border-b border-white/[0.06]">
                {sharedStats.fav > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-pink-400/10 text-pink-300 text-[11px] font-medium border border-pink-400/20">
                    <span className="text-pink-400">♥</span> Both favorited
                    <span className="text-white/55 ml-0.5">{sharedStats.fav}</span>
                  </span>
                )}
                {sharedStats.watched > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-300 text-[11px] font-medium border border-emerald-500/20">
                    <span className="text-emerald-400">✓</span> Both watched
                    <span className="text-white/55 ml-0.5">{sharedStats.watched}</span>
                  </span>
                )}
                {sharedStats.watchlist > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-sky-500/10 text-sky-300 text-[11px] font-medium border border-sky-500/20">
                    <span className="text-sky-400">🔖</span> Both on watchlist
                    <span className="text-white/55 ml-0.5">{sharedStats.watchlist}</span>
                  </span>
                )}
              </div>
            )}

            {/* Embedded HorizontalRow without its own outer frame */}
            <div className="p-4 sm:p-5">
              <InlineSharedRow items={sharedItems} />
            </div>
          </div>
        </section>
      )}

      {/* ── Library grid — framed card with all filters inside ── */}
      <section className="w-full">
        <div className="
          rounded-3xl bg-gradient-to-br from-brand/[0.10] via-white/[0.02] to-transparent border border-brand/30
          shadow-2xl shadow-black/30
          overflow-hidden
        ">
          {/* Header */}
          <div className="px-5 sm:px-6 py-4 flex items-baseline justify-between gap-3 flex-wrap border-b border-white/[0.06]">
            <h2 className="text-[15px] font-semibold tracking-tight text-white">Library</h2>
            <span className="text-[12px] text-white/45">
              {visible.length} {visible.length === 1 ? 'item' : 'items'}
            </span>
          </div>

          {/* Filters — Linear segmented controls */}
          <div className="px-5 sm:px-6 py-3.5 flex flex-wrap items-center gap-3 border-b border-white/[0.06]">
            {/* Status filter — All / Favorites / Watched / Watchlist */}
            <div className="inline-flex items-center rounded-md bg-white/[0.04] border border-white/[0.06] p-0.5">
              {STATUS_TABS.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setTab(t.value)}
                  className={`px-2.5 py-1 rounded-[5px] text-[12px] font-medium transition-colors ${
                    tab === t.value
                      ? 'bg-white/[0.08] text-white'
                      : 'text-white/55 hover:text-white'
                  }`}
                >
                  {t.label}
                  <span className={`ml-1.5 text-[11px] ${tab === t.value ? 'text-white/55' : 'text-white/35'}`}>
                    {counts[t.value]}
                  </span>
                </button>
              ))}
            </div>

            {/* Type filter — All / Movies / TV */}
            <div className="inline-flex items-center rounded-md bg-white/[0.04] border border-white/[0.06] p-0.5">
              {[
                { v: 'all',   label: 'All' },
                { v: 'movie', label: 'Movies' },
                { v: 'tv',    label: 'TV' },
              ].map((t) => (
                <button
                  key={t.v}
                  onClick={() => setType(t.v)}
                  className={`px-2.5 py-1 rounded-[5px] text-[12px] font-medium transition-colors ${
                    type === t.v
                      ? 'bg-white/[0.08] text-white'
                      : 'text-white/55 hover:text-white'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Body */}
          <div className="p-5 sm:p-6">
            {visible.length === 0 ? (
              <div className="py-10 text-center">
                <div className="text-4xl mb-3 opacity-60">
                  {tab === 'favorites' ? '💔' : tab === 'watched' ? '👀' : tab === 'watchlist' ? '🗒️' : '🎬'}
                </div>
                <h3 className="text-[14px] font-semibold text-white/80">
                  {tab === 'all'
                    ? "Nothing in their library yet"
                    : tab === 'favorites'
                    ? `No favorites yet`
                    : tab === 'watched'
                    ? `Nothing marked watched yet`
                    : `Nothing on the watchlist yet`}
                </h3>
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
          </div>
        </div>
      </section>

      <div className="mt-6">
        <Link to="/users" className="text-[13px] text-white/55 hover:text-white transition">
          ← All users
        </Link>
      </div>
    </motion.article>
  )
}

// Bare horizontal scroll row — used inside the shared-titles framed
// section so we don't get a frame inside a frame.
function InlineSharedRow({ items }) {
  return (
    <div className="overflow-x-auto scrollbar-hide">
      <div className="flex gap-4 pb-1">
        {items.map((item) => (
          <div
            key={`${item.mediaType}-${item.id}`}
            className="w-36 sm:w-40 md:w-44 shrink-0"
          >
            <MediaCard {...item} />
          </div>
        ))}
      </div>
    </div>
  )
}

// Stat pill — Linear-style flat chip with coloured icon + count + label.
function StatPill({ icon, label, value, color }) {
  return (
    <span className="
      inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md
      bg-white/[0.04]
      border border-white/[0.06]
      text-[12px]
    ">
      <span className={color}>{icon}</span>
      <strong className="font-semibold text-white">{value}</strong>
      <span className="text-white/45 text-[11px]">{label}</span>
    </span>
  )
}

export default UserProfilePage
