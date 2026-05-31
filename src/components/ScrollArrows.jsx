// ScrollArrows — two floating chevron buttons for horizontal carousels.
// Each shows only when there's content to scroll to in that direction.
// Visible on hover only — desktops get them, mobile users keep using touch.

import { AnimatePresence, motion } from 'framer-motion'

const variants = {
  initial: { opacity: 0, x: 8 },
  animate: { opacity: 1, x: 0 },
  exit:    { opacity: 0, x: -8 },
}

function ScrollArrows({ canLeft, canRight, onLeft, onRight }) {
  return (
    <>
      <AnimatePresence>
        {canLeft && (
          <motion.button
            key="left"
            initial={variants.initial}
            animate={variants.animate}
            exit={variants.exit}
            transition={{ duration: 0.15 }}
            onClick={onLeft}
            aria-label="Scroll left"
            className="
              hidden sm:flex absolute left-1 top-1/2 -translate-y-1/2 z-20
              w-12 h-12 rounded-full items-center justify-center
              bg-black/70 hover:bg-black/90 text-white text-2xl
              backdrop-blur-sm shadow-xl
              border border-white/10
              transition
            "
          >
            ‹
          </motion.button>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {canRight && (
          <motion.button
            key="right"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 8 }}
            transition={{ duration: 0.15 }}
            onClick={onRight}
            aria-label="Scroll right"
            className="
              hidden sm:flex absolute right-1 top-1/2 -translate-y-1/2 z-20
              w-12 h-12 rounded-full items-center justify-center
              bg-black/70 hover:bg-black/90 text-white text-2xl
              backdrop-blur-sm shadow-xl
              border border-white/10
              transition
            "
          >
            ›
          </motion.button>
        )}
      </AnimatePresence>
    </>
  )
}

export default ScrollArrows
