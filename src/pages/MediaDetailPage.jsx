import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { getMediaDetails } from '../lib/tmdb'
import { fadeUp } from '../lib/motion'
import { usePageTitle } from '../lib/usePageTitle'
import { AnimatePresence } from 'framer-motion'
import { MediaActionsFull } from '../components/MediaActions'
import WhereToWatch from '../components/WhereToWatch'
import TrailerModal from '../components/TrailerModal'
import HorizontalRow from '../components/HorizontalRow'

// One component handles both /movie/:id and /tv/:id.
// We pass mediaType as a prop from the route definition.
function MediaDetailPage({ mediaType }) {
  const { id } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showTrailer, setShowTrailer] = useState(false)

  // Title updates whenever new data arrives (e.g. "Inception · MovieTracker")
  usePageTitle(data?.title)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    getMediaDetails(mediaType, id)
      .then((d) => { if (!cancelled) setData(d) })
      .catch((err) => { if (!cancelled) setError(err.message) })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
    // Re-run if either mediaType or id changes (e.g. user navigates from
    // /movie/603 to /movie/27205 — same component, different URL).
  }, [mediaType, id])

  if (loading) {
    return <div className="max-w-7xl mx-auto px-6 py-20 text-neutral-500 dark:text-white/50">Loading…</div>
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-20">
        <p className="text-red-700 dark:text-red-300 mb-4">⚠️ {error}</p>
        <Link to="/" className="text-brand hover:underline">← Back to browse</Link>
      </div>
    )
  }

  if (!data) return null

  return (
    <motion.article
      key={`${mediaType}-${id}`}
      variants={fadeUp}
      initial="hidden"
      animate="show"
    >
      {/* ─── Backdrop hero ─── */}
      <div className="relative h-[55vh] min-h-[400px] max-h-[600px] overflow-hidden">
        {data.backdropUrl && (
          <img
            src={data.backdropUrl}
            alt={data.title}
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        {/* Fade the backdrop into the page bg color (light or dark). */}
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-50 via-neutral-50/40 to-transparent dark:from-neutral-950 dark:via-neutral-950/60" />
        <div className="absolute inset-0 bg-gradient-to-r from-neutral-950/70 to-transparent" />
      </div>

      {/* ─── Content (poster + details) ─── */}
      <div className="max-w-7xl mx-auto px-6 -mt-48 relative">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Poster (overlapping the backdrop) */}
          {data.posterUrl && (
            <img
              src={data.posterUrl}
              alt={data.title}
              className="w-48 md:w-64 rounded-xl shadow-2xl ring-1 ring-white/10 shrink-0"
            />
          )}

          {/* Title + meta + overview */}
          <div className="flex-1 pt-4 md:pt-32">
            <div className="text-brand text-xs font-bold tracking-[0.2em] uppercase mb-2">
              {mediaType === 'tv' ? 'TV Series' : 'Movie'}
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold leading-tight drop-shadow-lg mb-3">
              {data.title}
            </h1>
            {data.tagline && (
              <p className="text-neutral-500 dark:text-white/60 italic mb-4">{data.tagline}</p>
            )}

            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-neutral-600 dark:text-white/70 mb-6">
              {data.year && <span>{data.year}</span>}
              {data.rating > 0 && (
                <>
                  <span>·</span>
                  <span className="text-brand font-semibold">★ {data.rating.toFixed(1)}</span>
                </>
              )}
              {data.runtime && (
                <>
                  <span>·</span>
                  <span>{Math.floor(data.runtime / 60)}h {data.runtime % 60}m</span>
                </>
              )}
              {data.seasons && (
                <>
                  <span>·</span>
                  <span>{data.seasons} {data.seasons === 1 ? 'season' : 'seasons'}</span>
                </>
              )}
              {data.genres.length > 0 && (
                <>
                  <span>·</span>
                  <span>{data.genres.map((g) => g.name).join(', ')}</span>
                </>
              )}
            </div>

            <p className="text-neutral-700 dark:text-white/85 leading-relaxed max-w-2xl mb-8">
              {data.overview || 'No overview available.'}
            </p>

            {/* Full action panel: favorite/watched/watchlist + rating + note */}
            <div className="mb-12">
              <MediaActionsFull item={{
                id: Number(id),
                title: data.title,
                year: data.year,
                rating: data.rating,
                mediaType,
                posterUrl: data.posterUrl,
              }} />

              {/* Watch Trailer button — only shown when we have a video */}
              {data.trailerKey && (
                <button
                  onClick={() => setShowTrailer(true)}
                  className="
                    mt-5 inline-flex items-center gap-2
                    px-5 py-2.5 rounded-full
                    bg-red-600 hover:bg-red-500 text-white font-semibold text-sm
                    shadow-lg shadow-red-600/30
                    transition
                  "
                >
                  <span className="text-base">▶</span>
                  Watch Trailer
                </button>
              )}

              <div className="mt-4">
                <Link
                  to="/"
                  className="text-sm text-neutral-500 dark:text-white/60 hover:text-brand transition"
                >
                  ← Back to browse
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Where to watch ─── */}
        <WhereToWatch mediaType={mediaType} id={id} title={data.title} />

        {/* ─── More like this ─── */}
        <HorizontalRow title="More like this" items={data.similar} />

        {/* ─── Recommended ─── */}
        <HorizontalRow title="Recommended for you" items={data.recommendations} />

        {/* ─── Cast ─── */}
        {data.cast.length > 0 && (
          <section className="pb-16">
            <h2 className="text-xl font-bold mb-5">Cast</h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-10 gap-4">
              {data.cast.map((person) => (
                <div key={person.id} className="text-center">
                  <div className="aspect-square overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800 ring-1 ring-black/5 dark:ring-white/5 mb-2">
                    {person.photoUrl ? (
                      <img
                        src={person.photoUrl}
                        alt={person.name}
                        loading="lazy"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl text-neutral-400 dark:text-white/30">
                        👤
                      </div>
                    )}
                  </div>
                  <div className="text-xs font-semibold leading-tight">{person.name}</div>
                  {person.character && (
                    <div className="text-[10px] text-neutral-500 dark:text-white/50 mt-0.5 leading-tight">
                      {person.character}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Trailer modal — mounted at the bottom so AnimatePresence handles
          entrance + exit cleanly, and the modal sits above all other content. */}
      <AnimatePresence>
        {showTrailer && data.trailerKey && (
          <TrailerModal
            videoKey={data.trailerKey}
            title={data.title}
            onClose={() => setShowTrailer(false)}
          />
        )}
      </AnimatePresence>
    </motion.article>
  )
}

export default MediaDetailPage
