// PickPage — "What should I watch tonight?"
//
// Two-question guided picker (mood + watching with whom). The "intelligence"
// is in the algorithm:
//   • Mood → TMDb genre ids (multi-genre query)
//   • Family company → MPAA cert <= PG
//   • Variety: rotates between three sort orders + 2-page fetch each
//     time the user clicks "Pick again"
//   • Memory: tracks every movie id we've already shown this session

import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useFavorites } from '../lib/FavoritesContext'
import { discoverMovies } from '../lib/tmdb'
import { usePageTitle } from '../lib/usePageTitle'
import MediaCard from '../components/MediaCard'

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

const SORT_ROTATION = ['vote_average.desc', 'popularity.desc', 'vote_count.desc']

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
  const [round, setRound]     = useState(0)   // bumps each "Pick again" — drives AnimatePresence key
  const [hasPicked, setHasPicked] = useState(false)   // once true, we never leave the results layout

  const [seenIds, setSeenIds] = useState(() => new Set())
  const [sortIdx, setSortIdx] = useState(0)

  const watchedIds = useMemo(
    () => new Set(items.filter((i) => i.isWatched && i.mediaType === 'movie').map((i) => i.id)),
    [items]
  )

  async function generate() {
    if (!mood || !company) return
    setLoading(true); setError(null)
    // Keep the existing picks visible while loading the next round (only the
    // VERY first call has no picks to keep — that one shows the full loader).
    if (!hasPicked) setPicks(null)

    const moodOpt    = MOODS.find((m) => m.value === mood)    || {}
    const companyOpt = COMPANY.find((c) => c.value === company) || {}

    const baseFilter = {
      genres: moodOpt.genres || [],
      familyFriendly: !!companyOpt.familyFriendly,
      minRating: 7,
      minVoteCount: 300,
      sortBy: SORT_ROTATION[sortIdx % SORT_ROTATION.length],
    }
    if (moodOpt.beforeYear) baseFilter.releaseBefore = moodOpt.beforeYear

    try {
      const pageA = Math.floor(Math.random() * 3) + 1
      const pageB = pageA + 3
      const [resA, resB] = await Promise.all([
        discoverMovies({ ...baseFilter, page: pageA }),
        discoverMovies({ ...baseFilter, page: pageB }),
      ])
      let pool = [...resA, ...resB]

      const dedupe = new Set()
      pool = pool.filter((m) => dedupe.has(m.id) ? false : (dedupe.add(m.id), true))
      pool = pool.filter((m) => !watchedIds.has(m.id) && !seenIds.has(m.id))

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
        setSeenIds(new Set())
        setError("You've seen every match — clearing memory. Try Pick again to start fresh.")
        return
      }

      const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, 3)
      setPicks(shuffled)
      setHasPicked(true)
      setSeenIds((prev) => {
        const next = new Set(prev)
        for (const m of shuffled) next.add(m.id)
        return next
      })
      setSortIdx((i) => i + 1)
      setRound((r) => r + 1)
    } catch (err) {
      setError(err.message || 'Something went wrong picking movies.')
    } finally {
      setLoading(false)
    }
  }

  function reset() {
    setStep(1); setMood(null); setCompany(null); setPicks(null); setError(null)
    setSeenIds(new Set()); setSortIdx(0); setRound(0); setHasPicked(false)
  }

  // ── Render ────────────────────────────────────────────────────────
  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      <header className="text-center mb-10">
        <div className="text-xs font-bold tracking-[0.25em] text-brand uppercase mb-2 flex items-center justify-center gap-1.5">
          <motion.span
            animate={{ rotate: [0, 15, -10, 0], scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
          >
            ✨
          </motion.span>
          AI Pick
        </div>
        <h1 className="font-display text-5xl sm:text-6xl tracking-[0.02em] mb-2">
          What should I watch?
        </h1>
        <p className="text-neutral-500 dark:text-white/60">
          Two quick questions — we'll find tonight's pick.
        </p>
      </header>

      {/* One AnimatePresence at the top so form→loading→results crossfade cleanly */}
      <AnimatePresence mode="wait">
        {hasPicked ? (
          // ─── RESULTS LAYOUT (stays mounted across Pick again) ───────
          <motion.section
            key="results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <p className="text-center mb-6 text-sm text-neutral-500 dark:text-white/60">
              For a <strong>{MOODS.find((m) => m.value === mood)?.label.toLowerCase()}</strong>{' '}
              watch {COMPANY.find((c) => c.value === company)?.label.toLowerCase()}:
            </p>

            {/* Card area: swap between skeletons (loading) and real cards (loaded).
                AnimatePresence with mode='wait' makes the swap smooth — old leaves
                completely before the new enters. */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8 min-h-[400px]">
              <AnimatePresence mode="wait">
                {loading ? (
                  // SHIMMERING SKELETONS — three pulsing placeholders, same shape as the cards
                  [0, 1, 2].map((i) => (
                    <motion.div
                      key={`skel-${round}-${i}`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: i * 0.08, duration: 0.2 }}
                      className="text-center"
                    >
                      <div className="aspect-[2/3] rounded-xl overflow-hidden bg-neutral-200 dark:bg-neutral-900 ring-1 ring-black/5 dark:ring-white/5 relative">
                        <motion.div
                          className="absolute inset-0 bg-gradient-to-r from-transparent via-brand/20 to-transparent"
                          animate={{ x: ['-100%', '100%'] }}
                          transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut', delay: i * 0.2 }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center text-3xl opacity-30">✨</div>
                      </div>
                      <div className="mt-3 mx-auto h-3 rounded-full bg-neutral-200 dark:bg-neutral-800 w-3/4 overflow-hidden">
                        <motion.div
                          className="h-full w-1/3 bg-gradient-to-r from-transparent via-brand/30 to-transparent"
                          animate={{ x: ['-100%', '400%'] }}
                          transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut', delay: i * 0.2 + 0.3 }}
                        />
                      </div>
                    </motion.div>
                  ))
                ) : picks ? (
                  // REAL CARDS — dealt-in animation by round (changes each Pick again)
                  picks.map((pick, idx) => (
                    <motion.div
                      key={`pick-${round}-${pick.id}`}
                      initial={{ opacity: 0, y: 80, rotateX: 25, scale: 0.85 }}
                      animate={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -40, scale: 0.95 }}
                      transition={{
                        type: 'spring',
                        stiffness: 220,
                        damping: 22,
                        delay: idx * 0.18,
                      }}
                      className="text-center"
                      style={{ perspective: 800 }}
                    >
                      <MediaCard {...pick} />
                      <motion.p
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 + idx * 0.18, duration: 0.4 }}
                        className="mt-3 text-xs text-neutral-600 dark:text-white/70 leading-relaxed px-1"
                      >
                        {reasonFor(pick, mood, company)}
                      </motion.p>
                    </motion.div>
                  ))
                ) : null}
              </AnimatePresence>
            </div>

            {/* Action buttons — ALWAYS visible, never unmount during loading */}
            <div className="flex flex-wrap justify-center gap-3 mb-2">
              <motion.button
                onClick={generate}
                disabled={loading}
                whileHover={loading ? {} : { scale: 1.04 }}
                whileTap={loading ? {} : { scale: 0.96 }}
                className="px-5 py-2.5 rounded-full bg-brand hover:bg-brand-light text-black font-semibold text-sm transition disabled:opacity-60 disabled:cursor-wait shadow-lg shadow-brand/30 flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="inline-block"
                    >
                      ✨
                    </motion.span>
                    Picking…
                  </>
                ) : (
                  <>✨ Pick again</>
                )}
              </motion.button>
              <motion.button
                onClick={reset}
                disabled={loading}
                whileHover={loading ? {} : { scale: 1.04 }}
                whileTap={loading ? {} : { scale: 0.96 }}
                className="px-5 py-2.5 rounded-full bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 border border-black/10 dark:border-white/10 text-sm transition disabled:opacity-50"
              >
                Start over
              </motion.button>
            </div>

            <p className="text-center text-[11px] text-neutral-400 dark:text-white/40">
              {seenIds.size} {seenIds.size === 1 ? 'movie' : 'movies'} excluded from future picks this session.
            </p>
          </motion.section>
        ) : loading ? (
          <motion.section
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center py-20"
          >
            <SparkleLoader />
            <motion.p
              className="text-neutral-500 dark:text-white/60 mt-6"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.6, repeat: Infinity }}
            >
              Finding tonight's pick<ThinkingDots />
            </motion.p>
          </motion.section>
        ) : (
          <motion.section
            key="form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-10"
          >
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
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-300 text-sm text-center"
              >
                ⚠️ {error}
              </motion.div>
            )}

            <AnimatePresence>
              {mood && company && (
                <motion.div
                  initial={{ opacity: 0, y: 16, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 16 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                  className="text-center pt-4"
                >
                  <motion.button
                    onClick={generate}
                    whileHover={{ scale: 1.05, boxShadow: '0 10px 40px -10px rgba(212,175,55,0.6)' }}
                    whileTap={{ scale: 0.97 }}
                    className="px-8 py-3.5 rounded-full bg-brand text-black font-semibold text-base shadow-lg shadow-brand/30 transition-shadow"
                  >
                    ✨ Find me something
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.section>
        )}
      </AnimatePresence>
    </main>
  )
}

// ── Subcomponents ────────────────────────────────────────────────────

// Step container: number badge bounces in, content slides up
function Step({ n, question, active, children }) {
  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          <div className="flex items-center gap-3 mb-4">
            <motion.span
              initial={{ scale: 0, rotate: -45 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 18, delay: 0.1 }}
              className="w-8 h-8 rounded-full bg-brand text-black font-bold text-sm flex items-center justify-center shadow-md shadow-brand/30"
            >
              {n}
            </motion.span>
            <h2 className="text-lg sm:text-xl font-bold">{question}</h2>
          </div>
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// Choice pills with rich hover/tap/active animations
function Choices({ options, value, onSelect, renderLabel }) {
  return (
    <div className="flex flex-wrap gap-2 sm:gap-3 ml-11">
      {options.map((opt, idx) => {
        const active = value === opt.value
        return (
          <motion.button
            key={opt.value}
            onClick={() => onSelect(opt.value)}
            initial={{ opacity: 0, y: 8 }}
            animate={{
              opacity: 1, y: 0,
              scale: active ? 1.04 : 1,
            }}
            transition={{
              opacity: { duration: 0.2, delay: idx * 0.04 },
              y:       { duration: 0.2, delay: idx * 0.04 },
              scale:   { type: 'spring', stiffness: 400, damping: 22 },
            }}
            whileHover={{ scale: active ? 1.05 : 1.03, y: -1 }}
            whileTap={{ scale: 0.95 }}
            className={`
              px-4 py-2.5 rounded-full text-sm font-medium transition-colors
              ${active
                ? 'bg-brand text-black border border-brand shadow-lg shadow-brand/40'
                : 'bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 border border-black/10 dark:border-white/10 text-neutral-700 dark:text-white/80'}
            `}
          >
            {renderLabel ? renderLabel(opt) : opt.label}
          </motion.button>
        )
      })}
    </div>
  )
}

// Multiple sparkles orbiting / pulsing during the wait
function SparkleLoader() {
  // Positions around a circle
  const sparkles = [
    { x: 0,   y: -40, delay: 0   },
    { x: 35,  y: -20, delay: 0.15 },
    { x: 40,  y: 20,  delay: 0.3 },
    { x: 0,   y: 40,  delay: 0.45 },
    { x: -40, y: 20,  delay: 0.6 },
    { x: -35, y: -20, delay: 0.75 },
  ]
  return (
    <div className="relative inline-flex items-center justify-center w-32 h-32">
      {sparkles.map((s, i) => (
        <motion.span
          key={i}
          className="absolute text-2xl"
          style={{ left: '50%', top: '50%' }}
          initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
          animate={{
            opacity: [0, 1, 0],
            scale:   [0, 1.2, 0],
            x:       [0, s.x, s.x * 0.5],
            y:       [0, s.y, s.y * 0.5],
          }}
          transition={{
            duration: 1.8,
            repeat: Infinity,
            delay: s.delay,
            ease: 'easeOut',
          }}
        >
          ✨
        </motion.span>
      ))}
      <motion.span
        className="text-5xl"
        animate={{ scale: [1, 1.15, 1], rotate: [0, 5, -5, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        🎬
      </motion.span>
    </div>
  )
}

// Animated ". . ." after "Finding tonight's pick"
function ThinkingDots() {
  return (
    <span className="inline-flex ml-0.5">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          animate={{ opacity: [0.2, 1, 0.2] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
        >
          .
        </motion.span>
      ))}
    </span>
  )
}

export default PickPage
