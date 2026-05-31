import { useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { getPersonDetails } from '../lib/tmdb'
import { fadeUp, gridContainer, cardVariant } from '../lib/motion'
import { usePageTitle } from '../lib/usePageTitle'
import MediaCard from '../components/MediaCard'

const SORT_OPTIONS = [
  { value: 'recent',     label: 'Newest first' },
  { value: 'oldest',     label: 'Oldest first' },
  { value: 'rating',     label: 'TMDb rating' },
  { value: 'popularity', label: 'Most popular' },
  { value: 'alpha',      label: 'A → Z' },
]

// Birthday "1963-12-18" → "December 18, 1963" + computed age
function formatBirthday(birthday, deathday) {
  if (!birthday) return null
  const parts = birthday.split('-').map(Number)
  const date = new Date(parts[0], parts[1] - 1, parts[2])
  const formatted = date.toLocaleDateString(undefined, {
    year: 'numeric', month: 'long', day: 'numeric',
  })
  if (deathday) return formatted   // age in obit context isn't shown
  const today = new Date()
  let age = today.getFullYear() - date.getFullYear()
  const m = today.getMonth() - date.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < date.getDate())) age--
  return `${formatted} (age ${age})`
}

function PersonDetailPage() {
  const { id } = useParams()
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  usePageTitle(data?.name)

  const [sort, setSort]   = useState('recent')
  const [type, setType]   = useState('all')   // all | movie | tv

  useEffect(() => {
    let cancelled = false
    setLoading(true); setError(null)
    getPersonDetails(id)
      .then((d) => { if (!cancelled) setData(d) })
      .catch((err) => { if (!cancelled) setError(err.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [id])

  // Filter + sort filmography. Memoized so it doesn't recompute on every render.
  const visible = useMemo(() => {
    if (!data) return []
    const filtered = type === 'all'
      ? data.credits
      : data.credits.filter((c) => c.mediaType === type)

    return [...filtered].sort((a, b) => {
      switch (sort) {
        case 'oldest':     return (a.year ?? 9999) - (b.year ?? 9999)
        case 'rating':     return (b.rating ?? -1) - (a.rating ?? -1)
        case 'popularity': return (b.popularity ?? 0) - (a.popularity ?? 0)
        case 'alpha':      return a.title.localeCompare(b.title)
        case 'recent':
        default:           return (b.year ?? 0) - (a.year ?? 0)
      }
    })
  }, [data, sort, type])

  if (loading) {
    return <div className="max-w-7xl mx-auto px-6 py-20 text-neutral-500 dark:text-white/50">Loading…</div>
  }
  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-20">
        <p className="text-red-700 dark:text-red-300 mb-4">⚠️ {error}</p>
        <Link to="/actors" className="text-brand hover:underline">← Back to Actors</Link>
      </div>
    )
  }
  if (!data) return null

  const movieCount = data.credits.filter((c) => c.mediaType === 'movie').length
  const tvCount    = data.credits.filter((c) => c.mediaType === 'tv').length

  return (
    <motion.article
      key={id}
      variants={fadeUp}
      initial="hidden"
      animate="show"
      className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12"
    >
      {/* ── Hero: photo + bio side-by-side on desktop, stacked on mobile ── */}
      <section className="flex flex-col md:flex-row gap-6 md:gap-10 mb-12">
        {/* Photo */}
        <div className="shrink-0 mx-auto md:mx-0">
          {data.photoUrl ? (
            <img
              src={data.photoUrl}
              alt={data.name}
              className="w-48 md:w-72 aspect-[2/3] object-cover rounded-2xl shadow-2xl ring-1 ring-black/10 dark:ring-white/10"
            />
          ) : (
            <div className="w-48 md:w-72 aspect-[2/3] rounded-2xl bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center text-8xl">
              👤
            </div>
          )}
        </div>

        {/* Bio + facts */}
        <div className="flex-1 min-w-0">
          <div className="text-brand text-xs font-bold tracking-[0.2em] uppercase mb-2">
            {data.knownFor}
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold leading-tight mb-4">
            {data.name}
          </h1>

          {/* Facts row */}
          <dl className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-neutral-600 dark:text-white/70 mb-6">
            {data.birthday && (
              <div>
                <dt className="text-[11px] uppercase tracking-wider text-neutral-400 dark:text-white/40">Born</dt>
                <dd>{formatBirthday(data.birthday, data.deathday)}</dd>
              </div>
            )}
            {data.deathday && (
              <div>
                <dt className="text-[11px] uppercase tracking-wider text-neutral-400 dark:text-white/40">Died</dt>
                <dd>{new Date(data.deathday).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</dd>
              </div>
            )}
            {data.placeOfBirth && (
              <div>
                <dt className="text-[11px] uppercase tracking-wider text-neutral-400 dark:text-white/40">From</dt>
                <dd>{data.placeOfBirth}</dd>
              </div>
            )}
          </dl>

          {data.biography ? (
            <p className="text-neutral-700 dark:text-white/85 leading-relaxed max-w-3xl whitespace-pre-line">
              {data.biography.length > 600
                ? <BioCollapsible text={data.biography} />
                : data.biography}
            </p>
          ) : (
            <p className="text-neutral-500 dark:text-white/50 italic">No biography available.</p>
          )}

          <div className="mt-6">
            <Link to="/actors" className="text-sm text-neutral-500 dark:text-white/60 hover:text-brand transition">
              ← Back to Actors
            </Link>
          </div>
        </div>
      </section>

      {/* ── Filmography ────────────────────────────────────────────── */}
      <section>
        <div className="flex items-baseline justify-between flex-wrap gap-3 mb-5">
          <h2 className="text-xl font-bold">Filmography</h2>
          <span className="text-sm text-neutral-500 dark:text-white/50">
            {visible.length} of {data.credits.length}
          </span>
        </div>

        {/* Filter + sort controls */}
        <div className="flex flex-wrap items-center gap-3 mb-8">
          {/* Type filter */}
          <div className="flex rounded-full bg-black/5 dark:bg-white/5 p-1 border border-black/10 dark:border-white/10">
            {[
              { v: 'all',   label: `All (${data.credits.length})` },
              { v: 'movie', label: `Movies (${movieCount})` },
              { v: 'tv',    label: `TV (${tvCount})` },
            ].map((opt) => (
              <button
                key={opt.v}
                onClick={() => setType(opt.v)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                  type === opt.v
                    ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow'
                    : 'text-neutral-500 dark:text-white/60'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Sort dropdown */}
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="
              px-3 py-1.5 rounded-full text-sm
              bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10
              border border-black/10 dark:border-white/10
              text-neutral-700 dark:text-white/70
              focus:outline-none focus:border-brand transition
            "
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>Sort: {o.label}</option>
            ))}
          </select>
        </div>

        {/* Grid — same MediaCard component as everywhere else */}
        {visible.length > 0 ? (
          <motion.div
            key={`${sort}-${type}`}
            variants={gridContainer}
            initial="hidden"
            animate="show"
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5"
          >
            {visible.map((item) => (
              <motion.div key={`${item.mediaType}-${item.id}`} variants={cardVariant}>
                <MediaCard {...item} />
                {item.character && (
                  <div className="mt-1 px-1 text-[11px] text-neutral-500 dark:text-white/50 line-clamp-1">
                    as <span className="text-neutral-700 dark:text-white/80">{item.character}</span>
                  </div>
                )}
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <p className="text-neutral-500 dark:text-white/50">
            No {type === 'movie' ? 'movies' : type === 'tv' ? 'TV shows' : 'credits'} on file.
          </p>
        )}
      </section>
    </motion.article>
  )
}

// Long bios get a "Show more / Show less" toggle.
function BioCollapsible({ text }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <span className={open ? '' : 'line-clamp-5'}>{text}</span>
      <button
        onClick={() => setOpen((o) => !o)}
        className="mt-2 text-sm text-brand hover:underline block"
      >
        {open ? 'Show less' : 'Show more'}
      </button>
    </>
  )
}

export default PersonDetailPage
