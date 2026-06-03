import { useEffect, useState } from 'react'
import { useParams, Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { getMediaDetails } from '../lib/tmdb'
import { fadeUp } from '../lib/motion'
import { usePageTitle } from '../lib/usePageTitle'
import { AnimatePresence } from 'framer-motion'
import { MediaActionsFull } from '../components/MediaActions'
import WhereToWatch from '../components/WhereToWatch'
import TrailerModal from '../components/TrailerModal'
import HorizontalRow from '../components/HorizontalRow'

// Map a "from" path to a human label for the back link. Falls back to
// "browse" so we never render a blank "Back to" word if state is missing.
function backLabelForPath(from) {
  if (!from || from === '/' || from.startsWith('/?')) return 'browse'
  if (from.startsWith('/pick'))      return 'picker'
  if (from.startsWith('/favorites')) return 'My List'
  if (from.startsWith('/actors'))    return 'actors'
  if (from.startsWith('/users'))     return 'users'
  if (from.startsWith('/person/'))   return 'this actor'
  if (from.startsWith('/user/'))     return 'this profile'
  if (from.startsWith('/movie/') || from.startsWith('/tv/')) return 'the previous title'
  return 'browse'
}

// One component handles both /movie/:id and /tv/:id.
// We pass mediaType as a prop from the route definition.
function MediaDetailPage({ mediaType }) {
  const { id } = useParams()
  const location = useLocation()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showTrailer, setShowTrailer] = useState(false)

  // Source page passed via Link state when the user clicked into this title.
  // Lets us render "Back to picker" / "Back to My List" / etc. instead of
  // always sending the user to /. Defaults to '/' if no state present
  // (e.g. user arrived via a direct URL or refresh).
  const from      = location.state?.from || '/'
  const backLabel = backLabelForPath(from)

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
        <Link to={from} className="text-brand hover:underline">← Back to {backLabel}</Link>
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
          {/* Poster (overlapping the backdrop).
              - aspect-[2/3] + object-cover force the standard poster ratio so
                the img never stretches even when the text column is taller.
              - self-start prevents the flex container from stretching the img
                to match the column's height. */}
          {data.posterUrl && (
            <img
              src={data.posterUrl}
              alt={data.title}
              className="
                w-48 md:w-64 aspect-[2/3] object-cover
                rounded-xl shadow-2xl ring-1 ring-white/10
                shrink-0 self-start
              "
            />
          )}

          {/* Title + meta + overview — wrapped in ONE Linear-style framed
              card. Each major content block is its own section, separated
              by hairline borders, matching Linear's issue/properties panel. */}
          <div className="flex-1 pt-4 md:pt-32">
            <div className="
              w-full max-w-2xl mb-12
              rounded-lg bg-surface-1 border border-white/[0.08]
              shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_8px_24px_-12px_rgba(0,0,0,0.5)]
              overflow-hidden
            ">
              {/* ── Section: header (type label + title + tagline + meta) ── */}
              <div className="px-5 sm:px-6 pt-5 pb-5 border-b border-white/[0.06]">
                <div className="text-[10px] tracking-[0.18em] uppercase text-brand font-medium mb-2">
                  {mediaType === 'tv' ? 'TV Series' : 'Movie'}
                </div>
                <h1 className="font-display text-3xl md:text-4xl tracking-[-0.03em] leading-[1.05] mb-2 text-white">
                  {data.title}
                </h1>
                {data.tagline && (
                  <p className="text-white/55 italic text-[14px] mb-3">{data.tagline}</p>
                )}

                {/* Meta row */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-white/60">
                  {data.year && <span>{data.year}</span>}
                  {data.rating > 0 && (
                    <>
                      <span className="text-white/25">·</span>
                      <span className="text-brand font-medium">★ {data.rating.toFixed(1)}</span>
                    </>
                  )}
                  {data.runtime && (
                    <>
                      <span className="text-white/25">·</span>
                      <span>{Math.floor(data.runtime / 60)}h {data.runtime % 60}m</span>
                    </>
                  )}
                  {data.seasons && (
                    <>
                      <span className="text-white/25">·</span>
                      <span>{data.seasons} {data.seasons === 1 ? 'season' : 'seasons'}</span>
                    </>
                  )}
                  {data.genres.length > 0 && (
                    <>
                      <span className="text-white/25">·</span>
                      <span>{data.genres.map((g) => g.name).join(', ')}</span>
                    </>
                  )}
                </div>
              </div>

              {/* ── Section: overview ── */}
              <div className="px-5 sm:px-6 py-4 border-b border-white/[0.06]">
                <p className="text-[14px] text-white/75 leading-relaxed">
                  {data.overview || 'No overview available.'}
                </p>
              </div>

              {/* ── Section: status + personal (embedded, no nested frame) ── */}
              <div className="border-b border-white/[0.06]">
                <MediaActionsFull
                  framed={false}
                  item={{
                    id: Number(id),
                    title: data.title,
                    year: data.year,
                    rating: data.rating,
                    mediaType,
                    posterUrl: data.posterUrl,
                  }}
                />
              </div>

              {/* ── Section: footer (back link + Watch Trailer CTA) ── */}
              <div className="px-5 sm:px-6 py-4 flex items-center justify-between gap-3">
                <Link
                  to={from}
                  className="text-[13px] text-white/55 hover:text-white transition"
                >
                  ← Back to {backLabel}
                </Link>

                {data.trailerKey && (
                  <button
                    onClick={() => setShowTrailer(true)}
                    className="
                      inline-flex items-center gap-2
                      px-3.5 py-2 rounded-md
                      bg-brand hover:bg-brand-light text-white
                      text-[13px] font-medium transition
                    "
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                      <polygon points="6 4 20 12 6 20 6 4" />
                    </svg>
                    Watch Trailer
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ─── Where to watch ─── */}
        <WhereToWatch mediaType={mediaType} id={id} title={data.title} />

        {/* ─── Cast ─── */}
        {data.cast.length > 0 && (
          <section className="mb-12 w-full">
            <div className="
              rounded-lg bg-surface-1 border border-white/[0.08]
              shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_8px_24px_-12px_rgba(0,0,0,0.5)]
              overflow-hidden
            ">
              {/* ── Section: header ── */}
              <div className="px-5 sm:px-6 py-4 border-b border-white/[0.06]">
                <h2 className="text-[15px] font-semibold tracking-tight text-white">
                  Cast
                </h2>
                <div className="mt-1.5 text-[12px] text-white/45">
                  {data.cast.length} {data.cast.length === 1 ? 'credit' : 'credits'}
                </div>
              </div>

              {/* ── Section: body — grid of cast cards ── */}
              <div className="p-5 sm:p-6">
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-10 gap-4">
                  {data.cast.map((person) => (
                    <Link
                      key={person.id}
                      to={`/person/${person.id}`}
                      className="group text-center"
                    >
                      <div className="
                        aspect-square overflow-hidden rounded-md
                        bg-white/[0.04]
                        ring-1 ring-white/10
                        mb-2 transition
                        group-hover:ring-brand
                      ">
                        <CastImage person={person} />
                        {/* Branded fallback rendered inside CastImage when no photo
                            or image fails to load — see component below. */}
                      </div>
                      <div className="text-xs font-semibold leading-tight text-white/85 group-hover:text-white transition-colors">
                        {person.name}
                      </div>
                      {person.character && (
                        <div className="text-[10px] text-white/45 mt-0.5 leading-tight">
                          {person.character}
                        </div>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ─── More like this ─── */}
        <HorizontalRow title="More like this" items={data.similar} />

        {/* ─── Recommended ─── */}
        <div className="pb-16">
          <HorizontalRow title="Recommended for you" items={data.recommendations} />
        </div>
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

// Cast photo with a branded fallback that activates if the image fails to load
// or there's no photoUrl. Shows a gold initial on a soft gradient.
function CastImage({ person }) {
  const [failed, setFailed] = useState(false)
  const initial = (person.name || '?').trim().charAt(0).toUpperCase()
  const showImage = person.photoUrl && !failed
  if (showImage) {
    return (
      <img
        src={person.photoUrl}
        alt={person.name}
        loading="lazy"
        onError={() => setFailed(true)}
        className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
      />
    )
  }
  return (
    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-neutral-300 to-neutral-200 dark:from-neutral-700 dark:to-neutral-900">
      <span className="font-display text-4xl text-brand drop-shadow leading-none">
        {initial}
      </span>
    </div>
  )
}

export default MediaDetailPage
