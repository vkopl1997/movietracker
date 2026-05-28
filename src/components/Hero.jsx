import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../lib/AuthContext'
import { useFavorites } from '../lib/FavoritesContext'
import { fadeUp } from '../lib/motion'

// The hero's backdrop is always dark — it's a movie image with overlaid text.
// The gradient fades to whatever the page background is, so we use bg-neutral-50
// in light mode and bg-neutral-950 in dark via tailwind utility colors.

function Hero({ item }) {
  const { user, signInWithGoogle } = useAuth()
  const { isFavorite, toggleFavorite } = useFavorites()

  if (!item || !item.backdropUrl) return null

  const fav = isFavorite(item)

  return (
    <section className="relative h-[60vh] min-h-[420px] max-h-[700px] overflow-hidden">
      <img
        src={item.backdropUrl}
        alt={item.title}
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Vertical fade — fades into PAGE bg color, so it blends seamlessly in both themes */}
      <div className="absolute inset-0 bg-gradient-to-t from-neutral-50 via-neutral-50/40 to-transparent dark:from-neutral-950 dark:via-neutral-950/60" />
      {/* Horizontal fade — keeps text side readable */}
      <div className="absolute inset-0 bg-gradient-to-r from-neutral-950/70 to-transparent" />

      <div className="relative h-full max-w-7xl mx-auto px-6 flex items-end pb-12">
        <motion.div
          key={item.id}                     /* re-trigger animation if hero item changes */
          variants={fadeUp}
          initial="hidden"
          animate="show"
          className="max-w-xl"
        >
          <div className="text-brand text-xs font-bold tracking-[0.2em] uppercase mb-3">
            ★ Featured · {item.mediaType === 'tv' ? 'TV Series' : 'Movie'}
          </div>

          {/* Title & overview always white because they sit over the dark gradient */}
          <h1 className="text-4xl md:text-5xl font-extrabold leading-tight drop-shadow-lg mb-3 text-white">
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
              className={`px-5 py-2.5 rounded-full font-semibold text-sm transition ${
                fav
                  ? 'bg-brand text-black hover:bg-brand-light'
                  : 'bg-brand hover:bg-brand-light text-black'
              }`}
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
      </div>
    </section>
  )
}

export default Hero
