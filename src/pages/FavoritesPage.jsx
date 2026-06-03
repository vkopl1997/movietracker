import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../lib/AuthContext'
import { useFavorites } from '../lib/FavoritesContext'
import { supabase } from '../lib/supabase'
import MediaCard from '../components/MediaCard'
import { SkeletonGrid } from '../components/SkeletonCard'
import LikeButton from '../components/LikeButton'
import { gridContainer, cardVariant } from '../lib/motion'
import { usePageTitle } from '../lib/usePageTitle'

// Format a join-month label: "Joined May 2026"
function joinedLabel(iso) {
  if (!iso) return null
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long' })
}

// Tabs:
//   all       → everything you've interacted with
//   favorites → ♥
//   watched   → ✓
//   watchlist → 🔖
//   movies    → media_type filter overlay
//   tv        → media_type filter overlay
//
// Sort options: recent, alphabetical, your rating, year, tmdb rating

const STATUS_TABS = [
  { value: 'all',       label: 'All',       icon: null,    color: 'bg-brand' },
  { value: 'favorites', label: 'Favorites', icon: '♥',     color: 'bg-brand' },
  { value: 'watched',   label: 'Watched',   icon: '✓',     color: 'bg-emerald-500' },
  { value: 'watchlist', label: 'Watchlist', icon: '🔖',    color: 'bg-sky-500' },
]

const SORT_OPTIONS = [
  { value: 'recent',     label: 'Recently added' },
  { value: 'alpha',      label: 'A → Z' },
  { value: 'my-rating',  label: 'My rating' },
  { value: 'tmdb',       label: 'TMDb rating' },
  { value: 'year',       label: 'Year' },
]

function FavoritesPage() {
  usePageTitle('My Library')
  const { user } = useAuth()
  const { items, favorites, watched, watchlist, loading, error } = useFavorites()

  const [tab, setTab]       = useState('all')
  const [type, setType]     = useState('all')     // 'all' | 'movie' | 'tv'
  const [sort, setSort]     = useState('recent')

  // Profile header data (joined date + like count for the current user)
  const [joinedAt, setJoinedAt]   = useState(null)
  const [likeCount, setLikeCount] = useState(0)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    Promise.all([
      supabase.from('profiles').select('created_at').eq('id', user.id).maybeSingle(),
      supabase.from('user_likes').select('liker_id', { count: 'exact', head: true }).eq('liked_id', user.id),
    ])
      .then(([profileRes, likesRes]) => {
        if (cancelled) return
        setJoinedAt(profileRes.data?.created_at || user.created_at || null)
        setLikeCount(likesRes.count || 0)
      })
      .catch(() => { /* non-fatal — header just shows defaults */ })
    return () => { cancelled = true }
  }, [user])

  // Pick the base list for the current tab
  const baseList =
    tab === 'favorites' ? favorites :
    tab === 'watched'   ? watched :
    tab === 'watchlist' ? watchlist :
                          items

  // Filter by media type
  const typed = type === 'all' ? baseList : baseList.filter((i) => i.mediaType === type)

  // Sort
  const sorted = [...typed].sort((a, b) => {
    switch (sort) {
      case 'alpha':     return a.title.localeCompare(b.title)
      case 'my-rating': return (b.userRating ?? -1) - (a.userRating ?? -1)
      case 'tmdb':      return (b.rating ?? -1) - (a.rating ?? -1)
      case 'year':      return (b.year ?? 0) - (a.year ?? 0)
      case 'recent':
      default:
        return new Date(b.createdAt) - new Date(a.createdAt)
    }
  })

  // Counts for tab badges
  const counts = {
    all: items.length,
    favorites: favorites.length,
    watched: watched.length,
    watchlist: watchlist.length,
  }

  const displayName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'You'
  const avatarUrl   = user?.user_metadata?.avatar_url || user?.user_metadata?.picture
  const initial     = displayName.trim().charAt(0).toUpperCase() || '?'

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      {/* ── Profile header — rectangular avatar + framed bio card ── */}
      <section className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-10">
        {/* Avatar — smaller + rounded-md, flatter Linear ring */}
        <div className="
          shrink-0 w-28 h-28 sm:w-32 sm:h-32 rounded-md overflow-hidden
          ring-1 ring-white/10
          shadow-[0_8px_24px_-12px_rgba(0,0,0,0.5)]
        ">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={displayName}
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
            w-full rounded-lg bg-surface-1 border border-white/[0.08]
            shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_8px_24px_-12px_rgba(0,0,0,0.5)]
            overflow-hidden
          ">
            {/* Section: header (name + joined) */}
            <div className="px-5 sm:px-6 pt-4 pb-4 border-b border-white/[0.06]">
              <h1 className="font-display text-2xl sm:text-3xl tracking-[-0.02em] leading-[1.1] text-white">
                {displayName}
              </h1>
              {joinedAt && (
                <p className="mt-1.5 text-[12px] text-white/45">
                  Joined {joinedLabel(joinedAt)}
                </p>
              )}
            </div>

            {/* Section: like count (disabled for self) */}
            <div className="px-5 sm:px-6 py-3 border-b border-white/[0.06]">
              <LikeButton
                targetUserId={user?.id}
                likeCount={likeCount}
                likedByMe={false}
                size="lg"
              />
            </div>

            {/* Section: stats */}
            <div className="px-5 sm:px-6 py-3 flex flex-wrap items-center gap-2">
              <StatPill icon="♥"  label="favorites" value={favorites.length} color="text-pink-400"    />
              <StatPill icon="✓"  label="watched"   value={watched.length}   color="text-emerald-400" />
              <StatPill icon="🔖" label="watchlist" value={watchlist.length} color="text-sky-400"     />
            </div>
          </div>
        </div>
      </section>

      {/* ── Library — single framed card with all filters inside ── */}
      <section className="w-full">
        <div className="
          rounded-lg bg-surface-1 border border-white/[0.08]
          shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_8px_24px_-12px_rgba(0,0,0,0.5)]
          overflow-hidden
        ">
          {/* Header */}
          <div className="px-5 sm:px-6 py-4 flex items-baseline justify-between gap-3 flex-wrap border-b border-white/[0.06]">
            <h2 className="text-[15px] font-semibold tracking-tight text-white">My Library</h2>
            <span className="text-[12px] text-white/45">
              {sorted.length} {sorted.length === 1 ? 'item' : 'items'}
            </span>
          </div>

          {/* Filters — Linear segmented controls */}
          <div className="px-5 sm:px-6 py-3.5 flex flex-wrap items-center gap-3 border-b border-white/[0.06]">
            {/* Status tabs */}
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

            {/* Type filter */}
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

            {/* Sort dropdown */}
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
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value} className="bg-surface-1 text-white">
                  Sort: {o.label}
                </option>
              ))}
            </select>
          </div>

          {/* Body */}
          <div className="p-5 sm:p-6">
            {loading && <SkeletonGrid count={8} />}

            {error && (
              <div className="p-4 rounded-md bg-red-500/10 border border-red-500/30 text-red-300 text-[13px]">
                ⚠️ {error}
              </div>
            )}

            {!loading && !error && sorted.length === 0 && (
              <div className="py-10 text-center">
                <div className="text-4xl mb-3 opacity-60">
                  {tab === 'favorites' ? '💔' : tab === 'watched' ? '👀' : tab === 'watchlist' ? '🗒️' : '🎬'}
                </div>
                <h3 className="text-[14px] font-semibold text-white/85 mb-2">
                  {emptyMessage(tab, type)}
                </h3>
                <p className="text-[12px] text-white/55 mb-5 max-w-sm mx-auto">
                  Browse trending and use the heart, eye, or bookmark icons on any title.
                </p>
                <Link
                  to="/"
                  className="inline-block px-3.5 py-2 rounded-md bg-white hover:bg-white/90 text-black font-medium text-[13px] transition"
                >
                  Browse
                </Link>
              </div>
            )}

            {!loading && !error && sorted.length > 0 && (
              <motion.div
                key={`${tab}-${type}-${sort}`}
                variants={gridContainer}
                initial="hidden"
                animate="show"
                className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5"
              >
                {sorted.map((item) => (
                  <motion.div key={`${item.mediaType}-${item.id}`} variants={cardVariant}>
                    <MediaCard {...item} />
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

function emptyMessage(tab, type) {
  const what = type === 'movie' ? 'movies' : type === 'tv' ? 'TV shows' : 'items'
  if (tab === 'favorites') return `No favorited ${what} yet`
  if (tab === 'watched')   return `No watched ${what} yet`
  if (tab === 'watchlist') return `Your watchlist is empty`
  return `Nothing in your library yet`
}

// Same StatPill used on UserProfilePage. Inlined here to keep pages
// independent — Linear-style flat chip with coloured icon + count + label.
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

export default FavoritesPage
