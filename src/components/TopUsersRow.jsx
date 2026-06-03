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
    <section className="mb-16 w-full">
      <div className="
        rounded-3xl bg-gradient-to-br from-brand/[0.10] via-white/[0.02] to-transparent border border-brand/30
        shadow-2xl shadow-black/30
        overflow-hidden
      ">
        {/* ── Section: header ── */}
        <div className="px-5 sm:px-6 py-4 border-b border-white/[0.06]">
          <h2 className="text-[15px] font-semibold tracking-tight text-white">Top users</h2>
          <p className="mt-1.5 text-[12px] text-white/45">
            The most-liked people on MovieTracker
          </p>
        </div>

        {/* ── Section: body (horizontal scroll of compact user cards) ── */}
        <div className="relative p-4 sm:p-5">
          <ScrollArrows
            canLeft={canLeft}
            canRight={canRight}
            onLeft={scrollLeft}
            onRight={scrollRight}
            topPercent="40%"
          />

          <div
            ref={ref}
            className="overflow-x-auto scrollbar-hide scroll-smooth"
          >
            <div className="flex gap-4 pb-1">
              {users.map((u, i) => (
                <TopUserCard key={u.id} user={u} rank={i + 1} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// Solid, flat rank badge — Linear's chip aesthetic instead of glossy
// emoji medals. Top 3 get podium colors; the rest get a neutral pill.
function rankBadge(rank) {
  if (rank === 1) return { bg: 'bg-amber-400',  text: 'text-black' }   // gold
  if (rank === 2) return { bg: 'bg-zinc-300',   text: 'text-black' }   // silver
  if (rank === 3) return { bg: 'bg-amber-700',  text: 'text-white' }   // bronze
  return            { bg: 'bg-white/10',        text: 'text-white/80' }
}

function TopUserCard({ user, rank }) {
  const name = user.display_name || 'Anonymous'
  const initial = name.trim().charAt(0).toUpperCase() || '?'
  const badge = rankBadge(rank)

  return (
    <Link
      to={`/user/${user.id}`}
      className="group block w-24 sm:w-28 shrink-0 text-center"
    >
      {/* Portrait — rectangular, smaller. Rank badge floats top-left. */}
      <div className="relative mb-2">
        <div className="
          aspect-square rounded-md overflow-hidden
          bg-white/[0.04]
          ring-1 ring-white/10
          transition
          group-hover:ring-brand
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
            <div className="w-full h-full flex items-center justify-center text-4xl font-display text-brand bg-gradient-to-br from-neutral-700 to-neutral-900">
              {initial}
            </div>
          )}
        </div>

        {/* Rank badge — solid flat pill with the rank number, no emoji */}
        <span className={`
          absolute -top-1.5 -left-1.5 min-w-[20px] h-5 px-1.5
          rounded-md flex items-center justify-center
          text-[11px] font-semibold leading-none
          ring-2 ring-surface-1
          ${badge.bg} ${badge.text}
        `}>
          {rank}
        </span>
      </div>

      <div className="text-[12px] font-semibold leading-tight line-clamp-2 text-white/85 group-hover:text-white transition-colors">
        {name}
      </div>
      <div className="text-[10px] text-brand font-medium mt-0.5">
        ♥ {user.likeCount} {user.likeCount === 1 ? 'like' : 'likes'}
      </div>
    </Link>
  )
}

export default TopUsersRow
