// TrailerModal — full-screen overlay with an embedded YouTube trailer.
//
// Patterns used:
//   - useEffect to lock body scroll while open (UX must-have for modals)
//   - useEffect listening for Escape to close
//   - Click backdrop to close, but stopPropagation on the player so clicks
//     inside don't bubble out and close it
//   - autoplay=1 starts the video on open
//   - Framer Motion: backdrop fades, modal scales in

import { useEffect } from 'react'
import { motion } from 'framer-motion'

function TrailerModal({ videoKey, title, onClose }) {
  // Lock body scroll while open — without this, scrolling the page
  // behind the modal feels weird and accidental.
  useEffect(() => {
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = original }
  }, [])

  // Escape closes
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onClose}
      className="
        fixed inset-0 z-[100]
        bg-black/90 backdrop-blur-sm
        flex items-center justify-center p-4 sm:p-8
        cursor-pointer
      "
      role="dialog"
      aria-modal="true"
      aria-label={`Trailer for ${title}`}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        // Stop clicks inside the player from bubbling to the backdrop (which would close).
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-5xl aspect-video bg-black rounded-xl overflow-hidden shadow-2xl cursor-default"
      >
        {/* Close button (top-right, over the video) */}
        <button
          onClick={onClose}
          aria-label="Close trailer"
          className="
            absolute top-3 right-3 z-10
            w-10 h-10 rounded-full
            bg-black/70 hover:bg-black text-white
            border border-white/20
            flex items-center justify-center text-xl
            transition
          "
        >
          ×
        </button>

        {/* YouTube embed with autoplay */}
        <iframe
          src={`https://www.youtube.com/embed/${videoKey}?autoplay=1&rel=0`}
          title={`${title} trailer`}
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
          className="w-full h-full"
        />
      </motion.div>
    </motion.div>
  )
}

export default TrailerModal
