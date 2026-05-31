// LikeButton — toggles a row in user_likes, shows the current count.
// Optimistic UI: count + liked state update immediately, then sync to DB.
//
// Two sizes:
//   - "sm" → compact pill for user cards (♥ 24)
//   - "lg" → full button for profile headers (♥ Liked · 24)

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabase'

function LikeButton({ targetUserId, likeCount = 0, likedByMe = false, onChange, size = 'sm' }) {
  const { user, signInWithGoogle } = useAuth()
  const [count, setCount]   = useState(likeCount)
  const [liked, setLiked]   = useState(likedByMe)

  // Re-sync when parent props change (e.g. new data fetched)
  useEffect(() => { setCount(likeCount) }, [likeCount])
  useEffect(() => { setLiked(likedByMe) },  [likedByMe])

  const isSelf = user?.id === targetUserId

  async function handleClick(e) {
    // Don't navigate the parent Link (matters when this button is inside a card)
    e.preventDefault()
    e.stopPropagation()

    if (!user) {
      signInWithGoogle()
      return
    }
    if (isSelf) return

    // Optimistic update
    const wasLiked = liked
    const nextLiked = !wasLiked
    const nextCount = count + (nextLiked ? 1 : -1)
    setLiked(nextLiked)
    setCount(nextCount)
    onChange?.({ liked: nextLiked, count: nextCount })

    try {
      if (nextLiked) {
        const { error } = await supabase
          .from('user_likes')
          .insert({ liker_id: user.id, liked_id: targetUserId })
        if (error && error.code !== '23505') throw error   // 23505 = duplicate (idempotent)
      } else {
        const { error } = await supabase
          .from('user_likes')
          .delete()
          .eq('liker_id', user.id)
          .eq('liked_id', targetUserId)
        if (error) throw error
      }
    } catch (err) {
      console.error('Like toggle failed:', err)
      // Revert
      setLiked(wasLiked)
      setCount(count)
      onChange?.({ liked: wasLiked, count })
    }
  }

  // Visual variants
  const base = 'inline-flex items-center gap-1.5 rounded-full font-medium transition select-none'
  const sizeClasses = size === 'lg'
    ? 'px-4 py-2 text-sm'
    : 'px-2.5 py-1 text-xs'
  const stateClasses = isSelf
    ? 'bg-black/5 dark:bg-white/5 text-neutral-500 dark:text-white/40 cursor-default'
    : liked
      ? 'bg-brand text-black hover:bg-brand-light'
      : 'bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 text-neutral-700 dark:text-white/80 border border-black/10 dark:border-white/10'

  return (
    <motion.button
      type="button"
      onClick={handleClick}
      whileTap={isSelf ? undefined : { scale: 0.92 }}
      animate={{ scale: liked ? [1, 1.25, 1] : 1 }}
      transition={{ duration: 0.2 }}
      title={isSelf ? 'You can\'t like yourself' : liked ? 'Unlike' : 'Like'}
      className={`${base} ${sizeClasses} ${stateClasses}`}
    >
      <span>{liked ? '♥' : '♡'}</span>
      <span>{count}</span>
      {size === 'lg' && (
        <span>{isSelf ? 'likes' : liked ? 'Liked' : 'Like'}</span>
      )}
    </motion.button>
  )
}

export default LikeButton
