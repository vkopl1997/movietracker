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
      {/* ── Hero: photo + framed bio card side-by-side ── */}
      <section className="flex flex-col md:flex-row gap-6 md:gap-8 mb-12">
        {/* Photo — rectangular w/ small radius, matching Linear's flatter look */}
        <div className="shrink-0 mx-auto md:mx-0">
          {data.photoUrl ? (
            <img
              src={data.photoUrl}
              alt={data.name}
              className="w-48 md:w-72 aspect-[2/3] object-cover rounded-lg ring-1 ring-white/10 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.5)]"
            />
          ) : (
            <div className="w-48 md:w-72 aspect-[2/3] rounded-lg bg-white/[0.04] ring-1 ring-white/10 flex items-center justify-center text-8xl">
              👤
            </div>
          )}
        </div>

        {/* Framed bio card */}
        <div className="flex-1 min-w-0">
          <div className="
            w-full rounded-3xl bg-gradient-to-br from-brand/[0.10] via-white/[0.02] to-transparent border border-brand/30
            shadow-2xl shadow-black/30
            overflow-hidden
          ">
            {/* ── Section: header (knownFor eyebrow + name) ── */}
            <div className="px-5 sm:px-6 pt-5 pb-5 border-b border-white/[0.06]">
              {data.knownFor && (
                <div className="text-[10px] tracking-[0.18em] uppercase text-brand font-medium mb-2">
                  {data.knownFor}
                </div>
              )}
              <h1 className="font-display text-3xl md:text-4xl tracking-[-0.03em] leading-[1.05] text-white">
                {data.name}
              </h1>
            </div>

            {/* ── Section: facts (Born / Died / From in column grid) ── */}
            {(data.birthday || data.deathday || data.placeOfBirth) && (
              <div className="px-5 sm:px-6 py-4 border-b border-white/[0.06] grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-3">
                {data.birthday && (
                  <div>
                    <div className="text-[10px] font-medium tracking-[0.15em] uppercase text-white/40 mb-1">Born</div>
                    <div className="text-[13px] text-white/85">{formatBirthday(data.birthday, data.deathday)}</div>
                  </div>
                )}
                {data.deathday && (
                  <div>
                    <div className="text-[10px] font-medium tracking-[0.15em] uppercase text-white/40 mb-1">Died</div>
                    <div className="text-[13px] text-white/85">
                      {new Date(data.deathday).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                    </div>
                  </div>
                )}
                {data.placeOfBirth && (
                  <div>
                    <div className="text-[10px] font-medium tracking-[0.15em] uppercase text-white/40 mb-1">From</div>
                    <div className="text-[13px] text-white/85">{data.placeOfBirth}</div>
                  </div>
                )}
              </div>
            )}

            {/* ── Section: biography ── */}
            <div className="px-5 sm:px-6 py-4 border-b border-white/[0.06]">
              {data.biography ? (
                <div className="text-[14px] text-white/75 leading-relaxed whitespace-pre-line">
                  {data.biography.length > 600
                    ? <BioCollapsible text={data.biography} />
                    : data.biography}
                </div>
              ) : (
                <p className="text-[14px] text-white/45 italic">No biography available.</p>
              )}
            </div>

            {/* ── Section: footer (back link) ── */}
            <div className="px-5 sm:px-6 py-4">
              <Link to="/actors" className="text-[13px] text-white/55 hover:text-white transition">
                ← Back to Actors
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Filmography — framed table card ─────────────────────────── */}
      <section className="w-full">
        <div className="
          rounded-3xl bg-gradient-to-br from-brand/[0.10] via-white/[0.02] to-transparent border border-brand/30
          shadow-2xl shadow-black/30
          overflow-hidden
        ">
          {/* ── Section: header (title + count) ── */}
          <div className="px-5 sm:px-6 py-4 flex items-baseline justify-between gap-3 flex-wrap border-b border-white/[0.06]">
            <h2 className="text-[15px] font-semibold tracking-tight text-white">Filmography</h2>
            <span className="text-[12px] text-white/45">
              {visible.length} of {data.credits.length}
            </span>
          </div>

          {/* ── Section: filters (type segmented + sort dropdown) ── */}
          <div className="px-5 sm:px-6 py-3.5 flex flex-wrap items-center gap-3 border-b border-white/[0.06]">
            {/* Linear-style segmented control — text tabs with a subtle
                pill underlay on the active option. Compact, no gradient. */}
            <div className="inline-flex items-center rounded-md bg-white/[0.04] border border-white/[0.06] p-0.5">
              {[
                { v: 'all',   label: 'All',    count: data.credits.length },
                { v: 'movie', label: 'Movies', count: movieCount },
                { v: 'tv',    label: 'TV',     count: tvCount },
              ].map((opt) => (
                <button
                  key={opt.v}
                  onClick={() => setType(opt.v)}
                  className={`px-2.5 py-1 rounded-[5px] text-[12px] font-medium transition-colors ${
                    type === opt.v
                      ? 'bg-white/[0.08] text-white'
                      : 'text-white/55 hover:text-white'
                  }`}
                >
                  {opt.label}
                  <span className={`ml-1.5 text-[11px] ${type === opt.v ? 'text-white/55' : 'text-white/35'}`}>
                    {opt.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Linear-style native dropdown — flat surface, hairline border */}
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="
                px-2.5 py-1 rounded-md text-[12px] font-medium
                bg-white/[0.04] hover:bg-white/[0.06]
                border border-white/[0.06]
                text-white/70 hover:text-white
                focus:outline-none focus:border-white/20 transition
              "
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value} className="bg-surface-1 text-white">
                  Sort: {o.label}
                </option>
              ))}
            </select>
          </div>

          {/* ── Section: body (grid) ── */}
          <div className="p-5 sm:p-6">
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
                      <div className="mt-1 px-1 text-[11px] text-white/45 line-clamp-1">
                        as <span className="text-white/80">{item.character}</span>
                      </div>
                    )}
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <p className="text-[13px] text-white/50">
                No {type === 'movie' ? 'movies' : type === 'tv' ? 'TV shows' : 'credits'} on file.
              </p>
            )}
          </div>
        </div>
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
        className="mt-2 text-[13px] text-brand hover:text-brand-light transition block"
      >
        {open ? 'Show less' : 'Show more'}
      </button>
    </>
  )
}

export default PersonDetailPage
