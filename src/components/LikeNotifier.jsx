// LikeNotifier — invisible side-effect component.
//
// When the user is signed in, this component:
//   1. Fetches likes received since their last visit (catch-up notifications)
//   2. Subscribes to Supabase Realtime for new inserts on user_likes where
//      liked_id = the current user's id
//   3. Adds a notification "X liked you" via NotificationsContext for each
//
// "Last seen" is tracked per-user in localStorage. When new likes arrive,
// the timestamp advances so we don't re-notify on the next visit.

import { useEffect } from 'react'
import { useAuth } from '../lib/AuthContext'
import { useNotifications } from '../lib/NotificationsContext'
import { supabase } from '../lib/supabase'

const LAST_SEEN_PREFIX = 'mt_last_like_seen_'
const MAX_CATCHUP = 10                  // safety cap on notifications per session

// One-shot lookup of a user's display name. Falls back to "Someone".
async function getDisplayName(userId) {
  try {
    const { data } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', userId)
      .maybeSingle()
    return data?.display_name || 'Someone'
  } catch {
    return 'Someone'
  }
}

function LikeNotifier() {
  const { user } = useAuth()
  const { addNotification } = useNotifications()

  useEffect(() => {
    if (!user) return
    const userId = user.id
    const storageKey = `${LAST_SEEN_PREFIX}${userId}`
    let cancelled = false

    // ── Step 1: catch up on likes received since last visit ─────────
    async function catchUp() {
      const lastSeen = localStorage.getItem(storageKey)

      let q = supabase
        .from('user_likes')
        .select('liker_id, created_at')
        .eq('liked_id', userId)
        .order('created_at', { ascending: false })
        .limit(MAX_CATCHUP)

      if (lastSeen) {
        q = q.gt('created_at', lastSeen)
      }

      const { data, error } = await q
      if (cancelled || error || !data || data.length === 0) {
        // Still update the timestamp so future runs don't see ancient rows
        localStorage.setItem(storageKey, new Date().toISOString())
        return
      }

      // Reverse so oldest is added first (notifications list shows newest at top)
      for (const row of [...data].reverse()) {
        if (cancelled) break
        const name = await getDisplayName(row.liker_id)
        addNotification(`${name} liked you ♥`, {
          type: 'add',
          link: `/user/${row.liker_id}`,
        })
      }
      localStorage.setItem(storageKey, new Date().toISOString())
    }
    catchUp()

    // ── Step 2: realtime subscription for new likes ─────────────────
    const channel = supabase
      .channel(`likes_for_${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_likes',
          filter: `liked_id=eq.${userId}`,
        },
        async (payload) => {
          if (cancelled) return
          const likerId = payload.new?.liker_id
          if (!likerId) return
          const name = await getDisplayName(likerId)
          addNotification(`${name} liked you ♥`, {
            type: 'add',
            link: `/user/${likerId}`,
          })
          localStorage.setItem(storageKey, new Date().toISOString())
        }
      )
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [user?.id, addNotification])

  return null   // no UI
}

export default LikeNotifier
