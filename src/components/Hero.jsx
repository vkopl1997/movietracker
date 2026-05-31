import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuth } from '../lib/AuthContext'
import { useFavorites } from '../lib/FavoritesContext'

// Hero — rotating carousel of featured items.
// Accepts an array of items (e.g. top 5 trending). Auto-advances every 7s.
// Pauses while the user is hovering over the hero. Dots at the bottom show
// progress and allow manual navigation.

const ROTATE_MS = 7000

function Hero({ items }) {
  const { user, signInWithGoogle } = useAuth()
  const { isFavorite, toggleFavorite } = useFavorites()

  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)

  // Auto-advance. Pauses on hover.
  useEffect(() => {
    if (!items || items.length <= 1 || paused) return
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % items.length)
    }, ROTATE_MS)
    return () => clearInterval(timer)
  }, [items, paused])

  // Reset to first slide whenever the source list changes
  useEffect(() => { setIndex(0) }, [items?.length])

  if (!items || items.length === 0) return null
  const item = items[index]
  if (!item || !item.backdropUrl) return null

  const fav = isFavorite(item)

  return (
    <section
      className="relative h-[60vh] min-h-[420px] max-h-[700px] overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Backdrop — cross-fades between items */}
      <AnimatePresence mode="wait">
        <motion.img
          key={item.id + '-bg'}
          src={item.backdropUrl}
          alt={item.title}
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="absolute inset-0 w-full h-full object-cover"
        />
      </AnimatePresence>

      {/* Gradient overlays — fade into page bg + add reading contrast */}
      <div className="absolute inset-0 bg-gradient-to-t from-neutral-50 via-neutral-50/40 to-transparent dark:from-neutral-950 dark:via-neutral-950/60 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-r from-neutral-950/70 to-transparent pointer-events-none" />

      {/* Content — cross-fades + slides in from below */}
      <div className="relative h-full max-w-7xl mx-auto px-4 sm:px-6 flex items-end pb-16">
        <AnimatePresence mode="wait">
          <motion.div
            key={item.id + '-content'}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="max-w-xl"
          >
            <div className="text-brand text-xs font-bold tracking-[0.2em] uppercase mb-3">
              ★ Featured · {item.mediaType === 'tv' ? 'TV Series' : 'Movie'}
            </div>

            <h1 className="font-display text-5xl sm:text-6xl md:text-7xl tracking-[0.02em] leading-[0.95] drop-shadow-lg mb-3 text-white">
              {item.title}
            </h1>

            <div className="flex items-center gap-3 text-sm text-white/70 mb-4">
              {item.year && <span>{item.year}</span>}
              {item.rating > 0 && (
                <>
                  <span>·</span>
                  <span className="text-brand font-semibold">★ {item.rating.toFixed(1)}</span>
                </>
              )}
            </div>

            {item.overview && (
              <p className="text-white/80 leading-relaxed line-clamp-3 mb-6">
                {item.overview}
              </p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => user ? toggleFavorite(item) : signInWithGoogle()}
                className="px-5 py-2.5 rounded-full font-semibold text-sm transition bg-brand hover:bg-brand-light text-black"
              >
                {fav ? '♥ Favorited' : '♡ Add to favorites'}
              </button>
              <Link
                to={`/${item.mediaType}/${item.id}`}
                className="px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white font-medium text-sm transition backdrop-blur-sm"
              >
                More info
              </Link>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Dot navigation (bottom-center) — only when there's > 1 item */}
      {items.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2">
          {items.map((_, i) => {
            const active = i === index
            return (
              <button
                key={i}
                onClick={() => setIndex(i)}
                aria-label={`Show featured item ${i + 1} of ${items.length}`}
                className={`
                  relative overflow-hidden rounded-full transition-all
                  ${active
                    ? 'w-8 h-2 bg-white/30'
                    : 'w-2 h-2 bg-white/40 hover:bg-white/60'}
                `}
              >
                {/* Progress fill — only on the active dot, restarts when index changes */}
                {active && (
                  <motion.span
                    key={`fill-${index}-${paused}`}
                    initial={{ width: 0 }}
                    animate={{ width: paused ? '0%' : '100%' }}
                    transition={{ duration: paused ? 0 : ROTATE_MS / 1000, ease: 'linear' }}
                    className="absolute inset-y-0 left-0 bg-brand"
                  />
                )}
              </button>
            )
          })}
        </div>
      )}
    </section>
  )
}

export default Hero
