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
      {/* Inner wrapper holds both the close button and the player as siblings,
          so the X sits OUTSIDE the iframe and doesn't overlap YouTube's controls. */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-5xl cursor-default"
      >
        {/* Close button — floats ABOVE the player, top-right of the wrapper.
            Outside the iframe so it can't conflict with YouTube's own controls. */}
        <button
          onClick={onClose}
          aria-label="Close trailer"
          className="
            absolute -top-12 right-0
            flex items-center gap-2
            px-4 h-10 rounded-full
            bg-white/10 hover:bg-white/20 text-white text-sm font-medium
            border border-white/20 backdrop-blur
            transition
          "
        >
          <span className="text-base leading-none">×</span>
          Close
        </button>

        {/* YouTube embed with autoplay */}
        <div className="aspect-video bg-black rounded-xl overflow-hidden shadow-2xl">
          <iframe
            src={`https://www.youtube.com/embed/${videoKey}?autoplay=1&rel=0`}
            title={`${title} trailer`}
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
            className="w-full h-full"
          />
        </div>
      </motion.div>
    </motion.div>
  )
}

export default TrailerModal
