// ScrollArrows — two floating chevron buttons for horizontal carousels.
// Each shows only when there's content to scroll to in that direction.
// Visible on hover only — desktops get them, mobile users keep using touch.

import { AnimatePresence, motion } from 'framer-motion'

// Shared base classes for both buttons — brand gold, large, prominent.
// `top` value is exposed as a prop so the consumer can shift the arrows higher
// when the row contains cards with footers below the main image.
const buttonClass = `
  hidden sm:flex absolute -translate-y-1/2 z-20
  w-14 h-14 rounded-full items-center justify-center
  bg-brand hover:bg-brand-light text-black text-4xl font-bold
  shadow-2xl shadow-brand/50
  ring-2 ring-brand/30
  transition
  leading-none
`

// `topPercent` lets the consumer align the arrows with the IMAGE midline,
// not the whole row's midline (the row often has a footer that pushes the
// geometric center below the image). For UpcomingRow (image + date/title
// below), 35% sits roughly at the image's vertical center.
function ScrollArrows({ canLeft, canRight, onLeft, onRight, topPercent = '50%' }) {
  const positionStyle = { top: topPercent }
  return (
    <>
      <AnimatePresence>
        {canLeft && (
          <motion.button
            key="left"
            initial={{ opacity: 0, x: 8, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -8, scale: 0.8 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            onClick={onLeft}
            aria-label="Scroll left"
            style={positionStyle}
            className={`${buttonClass} left-3`}
          >
            <span className="-mt-1">‹</span>
          </motion.button>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {canRight && (
          <motion.button
            key="right"
            initial={{ opacity: 0, x: -8, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 8, scale: 0.8 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            onClick={onRight}
            aria-label="Scroll right"
            style={positionStyle}
            className={`${buttonClass} right-3`}
          >
            <span className="-mt-1">›</span>
          </motion.button>
        )}
      </AnimatePresence>
    </>
  )
}

export default ScrollArrows
