// TopUsersRow — leaderboard-style horizontal slider of the most-liked users.
//
// Each card: circular avatar, name, "♥ N likes", and a rank badge for the
// top 3 (👑 for #1, 🥈 #2, 🥉 #3). Click → goes to their profile.

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useScrollArrows } from '../lib/useScrollArrows'
import ScrollArrows from './ScrollArrows'

// Fetch profiles + per-user like counts and return the top N by likes.
async function fetchTopUsers(limit = 20) {
  const [profilesRes, likesRes] = await Promise.all([
    supabase.from('profiles').select('id, display_name, avatar_url'),
    supabase.from('user_likes').select('liked_id'),
  ])
  if (profilesRes.error || likesRes.error) return []

  const counts = {}
  for (const l of likesRes.data || []) {
    counts[l.liked_id] = (counts[l.liked_id] || 0) + 1
  }

  return (profilesRes.data || [])
    .map((p) => ({ ...p, likeCount: counts[p.id] || 0 }))
    .filter((p) => p.likeCount > 0)            // hide users with zero likes
    .sort((a, b) => b.likeCount - a.likeCount) // most likes first
    .slice(0, limit)
}

function TopUsersRow() {
  const [users, setUsers] = useState([])
  const { ref, canLeft, canRight, scrollLeft, scrollRight } = useScrollArrows()

  useEffect(() => {
    let cancelled = false
    fetchTopUsers().then((data) => { if (!cancelled) setUsers(data) })
    return () => { cancelled = true }
  }, [])

  if (users.length === 0) return null

  return (
    <section className="mb-16">
      <div className="mb-5">
        <h2 className="text-2xl font-bold flex items-center gap-3">
          <span className="inline-block w-1 h-7 bg-brand rounded-sm" />
          Top users
        </h2>
        <p className="text-sm text-neutral-500 dark:text-white/50 mt-1 ml-4">
          The most-liked people on MovieTracker
        </p>
      </div>

      <div className="relative">
        <ScrollArrows
          canLeft={canLeft}
          canRight={canRight}
          onLeft={scrollLeft}
          onRight={scrollRight}
          topPercent="40%"
        />

        <div
          ref={ref}
          className="-mx-4 sm:-mx-6 px-4 sm:px-6 overflow-x-auto scrollbar-hide scroll-smooth"
        >
          <div className="flex gap-5 pb-2">
            {users.map((u, i) => (
              <TopUserCard key={u.id} user={u} rank={i + 1} />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

// Top 3 get a colored medal in the rank badge; the rest get the number.
function rankBadge(rank) {
  if (rank === 1) return { emoji: '🥇', bg: 'bg-yellow-400' }
  if (rank === 2) return { emoji: '🥈', bg: 'bg-neutral-300' }
  if (rank === 3) return { emoji: '🥉', bg: 'bg-amber-600' }
  return null
}

function TopUserCard({ user, rank }) {
  const name = user.display_name || 'Anonymous'
  const initial = name.trim().charAt(0).toUpperCase() || '?'
  const badge = rankBadge(rank)

  return (
    <Link
      to={`/user/${user.id}`}
      className="group block w-32 sm:w-36 shrink-0 text-center"
    >
      {/* Portrait with rank badge floating top-left */}
      <div className="relative mb-3">
        <div className="
          aspect-square rounded-full overflow-hidden
          bg-neutral-200 dark:bg-neutral-800
          ring-1 ring-black/5 dark:ring-white/5
          transition
          group-hover:ring-2 group-hover:ring-brand
          group-hover:shadow-xl group-hover:shadow-brand/30
        ">
          {user.avatar_url ? (
            <img
              src={user.avatar_url}
              alt={name}
              referrerPolicy="no-referrer"
              loading="lazy"
              className="w-full h-full object-cover transition duration-500 group-hover:scale-105"
              onError={(e) => { e.currentTarget.style.display = 'none' }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-5xl font-display text-brand bg-gradient-to-br from-neutral-300 to-neutral-200 dark:from-neutral-700 dark:to-neutral-800">
              {initial}
            </div>
          )}
        </div>

        {/* Rank badge */}
        {badge ? (
          <span className={`
            absolute -top-1 -left-1 w-9 h-9 rounded-full flex items-center justify-center text-base
            ${badge.bg} text-black shadow-lg ring-2 ring-white dark:ring-neutral-950
          `}>
            {badge.emoji}
          </span>
        ) : (
          <span className="
            absolute -top-1 -left-1 w-7 h-7 rounded-full flex items-center justify-center
            bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-white/80
            ring-2 ring-white dark:ring-neutral-950
            text-xs font-bold
          ">
            {rank}
          </span>
        )}
      </div>

      <div className="text-sm font-semibold leading-tight line-clamp-2 group-hover:text-brand transition-colors">
        {name}
      </div>
      <div className="text-[11px] text-brand font-medium mt-0.5">
        ♥ {user.likeCount} {user.likeCount === 1 ? 'like' : 'likes'}
      </div>
    </Link>
  )
}

export default TopUsersRow
