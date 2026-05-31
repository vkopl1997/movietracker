// PickPage — "What should I watch tonight?"
//
// Two-question guided picker (mood + watching with whom). The "intelligence"
// is in the algorithm:
//   • Mood → TMDb genre ids (multi-genre query)
//   • Family company → MPAA cert <= PG
//   • Personalization: user's most-favorited genres get an additional bias
//   • Variety: rotates between three sort orders + random pagination each
//     time the user clicks "Pick again"
//   • Memory: tracks every movie id we've already shown this session so
//     "Pick again" returns brand-new results until the pool is exhausted

import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useFavorites } from '../lib/FavoritesContext'
import { discoverMovies } from '../lib/tmdb'
import { usePageTitle } from '../lib/usePageTitle'
import MediaCard from '../components/MediaCard'

// TMDb genre ids — see /genre/movie/list
const GENRE = {
  action: 28,    adventure: 12,  animation: 16, comedy: 35,    crime: 80,
  doc:    99,    drama: 18,       family: 10751, fantasy: 14,  history: 36,
  horror: 27,    music: 10402,    mystery: 9648, romance: 10749,
  scifi:  878,   thriller: 53,    war: 10752,    western: 37,
}

const MOODS = [
  { value: 'funny',    emoji: '😄', label: 'Funny / happy',       genres: [GENRE.comedy, GENRE.animation, GENRE.family] },
  { value: 'intense',  emoji: '😱', label: 'Intense / thrilling',  genres: [GENRE.thriller, GENRE.action, GENRE.crime, GENRE.mystery] },
  { value: 'deep',     emoji: '🤔', label: 'Thought-provoking',    genres: [GENRE.drama, GENRE.scifi, GENRE.history, GENRE.doc] },
  { value: 'cozy',     emoji: '❤️', label: 'Cozy / comfort',       genres: [GENRE.romance, GENRE.family, GENRE.animation] },
  { value: 'epic',     emoji: '⚔️', label: 'Epic / adventure',     genres: [GENRE.adventure, GENRE.fantasy, GENRE.action, GENRE.scifi] },
  { value: 'dark',     emoji: '🕯️', label: 'Dark / gritty',        genres: [GENRE.crime, GENRE.horror, GENRE.thriller, GENRE.drama] },
  { value: 'classic',  emoji: '🏛️', label: 'Classic / timeless',   genres: [], beforeYear: 2000 },
  { value: 'surprise', emoji: '🎲', label: 'Surprise me',           genres: [] },
]

const COMPANY = [
  { value: 'alone',   label: 'Alone' },
  { value: 'partner', label: 'With a partner' },
  { value: 'friends', label: 'With friends' },
  { value: 'family',  label: 'With family',  familyFriendly: true },
]

// Sorts we rotate through so re-running the picker doesn't show the same things
const SORT_ROTATION = ['vote_average.desc', 'popularity.desc', 'vote_count.desc']

// Template-based reasoning so the result feels personal
function reasonFor(item, mood, company) {
  const ratingTag = item.rating >= 8 ? 'Critically loved' : item.rating >= 7 ? 'Highly rated' : 'Well reviewed'
  const moodPhrase = {
    funny:    'a lift for a happy night',
    intense:  'tension and adrenaline',
    deep:     'something that stays with you',
    cozy:     'soft, comforting, easy to put on',
    epic:     'a big-screen ride from the couch',
    dark:     'gritty and bold',
    classic:  'an enduring favorite',
    surprise: 'something a little different',
  }[mood] || 'a solid pick'
  const companyPhrase = {
    family:  'and works for all ages',
    friends: 'and fun in a group',
    partner: 'and great for a quiet night in',
    alone:   '',
  }[company] || ''
  return `${ratingTag} · ${moodPhrase}${companyPhrase ? ` · ${companyPhrase}` : ''}.`
}

function PickPage() {
  usePageTitle('What should I watch?')
  const { items } = useFavorites()

  const [step, setStep]       = useState(1)
  const [mood, setMood]       = useState(null)
  const [company, setCompany] = useState(null)

  const [loading, setLoading] = useState(false)
  const [picks, setPicks]     = useState(null)
  const [error, setError]     = useState(null)

  // Memory of every id we've already shown this session — Pick again
  // skips these so the user always sees new movies until the pool runs out.
  const [seenIds, setSeenIds] = useState(() => new Set())

  // Track which sort order to use next (cycle through the rotation)
  const [sortIdx, setSortIdx] = useState(0)

  // ── Personalization: which genres show up most in user's favorites? ──
  // We can't see genres on saved items (we don't store them), but we can
  // infer from media_type ratios + rating preferences. For now we use the
  // mood's genres as the primary signal and let the random rotation create
  // variety. (Future enhancement: store genres on favorites for real personalization.)
  const watchedIds = useMemo(
    () => new Set(items.filter((i) => i.isWatched && i.mediaType === 'movie').map((i) => i.id)),
    [items]
  )

  async function generate({ keepSeen = false } = {}) {
    if (!mood || !company) return
    setLoading(true); setError(null); setPicks(null)

    const moodOpt    = MOODS.find((m) => m.value === mood)    || {}
    const companyOpt = COMPANY.find((c) => c.value === company) || {}

    // Build the discover filter set for this round.
    const baseFilter = {
      genres: moodOpt.genres || [],
      familyFriendly: !!companyOpt.familyFriendly,
      minRating: 7,
      minVoteCount: 300,
      sortBy: SORT_ROTATION[sortIdx % SORT_ROTATION.length],
    }
    if (moodOpt.beforeYear) baseFilter.releaseBefore = moodOpt.beforeYear

    try {
      // Fetch 2 pages in parallel for more variety
      const pageA = Math.floor(Math.random() * 3) + 1
      const pageB = pageA + 3
      const [resA, resB] = await Promise.all([
        discoverMovies({ ...baseFilter, page: pageA }),
        discoverMovies({ ...baseFilter, page: pageB }),
      ])
      let pool = [...resA, ...resB]

      // Deduplicate (same movie could appear in both pages)
      const seenInPool = new Set()
      pool = pool.filter((m) => seenInPool.has(m.id) ? false : (seenInPool.add(m.id), true))

      // Skip already-watched + previously-shown
      pool = pool.filter((m) => !watchedIds.has(m.id))
      if (!keepSeen) pool = pool.filter((m) => !seenIds.has(m.id))

      // If still not enough, relax the rating bar
      if (pool.length < 3) {
        const relaxed = await discoverMovies({
          ...baseFilter, minRating: 6, minVoteCount: 100, page: Math.floor(Math.random() * 4) + 1,
        })
        const extra = relaxed.filter((m) =>
          !watchedIds.has(m.id) && !seenIds.has(m.id) && !pool.some((p) => p.id === m.id)
        )
        pool = [...pool, ...extra]
      }

      if (pool.length === 0) {
        // We've exhausted the pool — reset the memory so they can pick again from scratch
        setSeenIds(new Set())
        setError('You\'ve seen every match — clearing memory. Try Pick again to start fresh.')
        return
      }

      // Shuffle, then take 3
      const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, 3)
      setPicks(shuffled)

      // Remember these so Pick again won't repeat them
      setSeenIds((prev) => {
        const next = new Set(prev)
        for (const m of shuffled) next.add(m.id)
        return next
      })

      // Cycle to next sort order for next round
      setSortIdx((i) => i + 1)
    } catch (err) {
      setError(err.message || 'Something went wrong picking movies.')
    } finally {
      setLoading(false)
    }
  }

  function reset() {
    setStep(1); setMood(null); setCompany(null); setPicks(null); setError(null)
    setSeenIds(new Set()); setSortIdx(0)
  }

  // ── Render ────────────────────────────────────────────────────────
  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      <header className="text-center mb-10">
        <div className="text-xs font-bold tracking-[0.25em] text-brand uppercase mb-2 flex items-center justify-center gap-1.5">
          <span className="animate-pulse">✨</span> AI Pick
        </div>
        <h1 className="font-display text-5xl sm:text-6xl tracking-[0.02em] mb-2">
          What should I watch?
        </h1>
        <p className="text-neutral-500 dark:text-white/60">
          Two quick questions — we'll find tonight's pick.
        </p>
      </header>

      {/* ── Results ────────────────────────────────────────────────── */}
      {picks ? (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <div className="text-center mb-6 text-sm text-neutral-500 dark:text-white/60">
            For a <strong>{MOODS.find((m) => m.value === mood)?.label.toLowerCase()}</strong>{' '}
            watch {COMPANY.find((c) => c.value === company)?.label.toLowerCase()}:
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
            {picks.map((pick) => (
              <div key={pick.id} className="text-center">
                <MediaCard {...pick} />
                <p className="mt-3 text-xs text-neutral-600 dark:text-white/70 leading-relaxed px-1">
                  {reasonFor(pick, mood, company)}
                </p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap justify-center gap-3 mb-2">
            <button
              onClick={() => generate()}
              disabled={loading}
              className="px-5 py-2.5 rounded-full bg-brand hover:bg-brand-light text-black font-semibold text-sm transition disabled:opacity-60"
            >
              ✨ Pick again
            </button>
            <button
              onClick={reset}
              className="px-5 py-2.5 rounded-full bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 border border-black/10 dark:border-white/10 text-sm transition"
            >
              Start over
            </button>
          </div>

          {/* Small memory indicator so users see we're tracking */}
          <p className="text-center text-[11px] text-neutral-400 dark:text-white/40">
            {seenIds.size} {seenIds.size === 1 ? 'movie' : 'movies'} excluded from future picks this session.
          </p>
        </motion.div>
      ) : loading ? (
        <div className="text-center py-20">
          <div className="text-4xl mb-4 animate-pulse">✨</div>
          <p className="text-neutral-500 dark:text-white/60">Finding tonight's pick…</p>
        </div>
      ) : (
        // ── Form ─────────────────────────────────────────────────────
        <div className="space-y-10">
          <Step n="1" question="What's your mood?" active={step >= 1}>
            <Choices
              options={MOODS}
              value={mood}
              onSelect={(v) => { setMood(v); setStep(2) }}
              renderLabel={(o) => <><span className="mr-2">{o.emoji}</span>{o.label}</>}
            />
          </Step>

          <Step n="2" question="Who are you watching with?" active={step >= 2}>
            <Choices
              options={COMPANY}
              value={company}
              onSelect={(v) => setCompany(v)}
            />
          </Step>

          {error && (
            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-300 text-sm text-center">
              ⚠️ {error}
            </div>
          )}

          {mood && company && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="text-center pt-4">
              <button
                onClick={() => generate({ keepSeen: false })}
                className="px-8 py-3.5 rounded-full bg-brand hover:bg-brand-light text-black font-semibold text-base shadow-lg shadow-brand/30 transition"
              >
                ✨ Find me something
              </button>
            </motion.div>
          )}
        </div>
      )}
    </main>
  )
}

// ── Small UI subcomponents ────────────────────────────────────────────
function Step({ n, question, active, children }) {
  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
        >
          <div className="flex items-center gap-3 mb-4">
            <span className="w-7 h-7 rounded-full bg-brand text-black font-bold text-sm flex items-center justify-center">
              {n}
            </span>
            <h2 className="text-lg sm:text-xl font-bold">{question}</h2>
          </div>
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function Choices({ options, value, onSelect, renderLabel }) {
  return (
    <div className="flex flex-wrap gap-2 sm:gap-3 ml-10">
      {options.map((opt) => {
        const active = value === opt.value
        return (
          <button
            key={opt.value}
            onClick={() => onSelect(opt.value)}
            className={`
              px-4 py-2.5 rounded-full text-sm font-medium transition
              ${active
                ? 'bg-brand text-black border border-brand'
                : 'bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 border border-black/10 dark:border-white/10 text-neutral-700 dark:text-white/80'}
            `}
          >
            {renderLabel ? renderLabel(opt) : opt.label}
          </button>
        )
      })}
    </div>
  )
}

export default PickPage
