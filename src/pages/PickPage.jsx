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

// Reverse map: TMDb genre id → short kebab name we use in #tags
const GENRE_TAG = {
  28: 'action',  12: 'adventure', 16: 'animation', 35: 'comedy',
  80: 'crime',   99: 'documentary', 18: 'drama',    10751: 'family',
  14: 'fantasy', 36: 'history',  27: 'horror',     10402: 'music',
  9648: 'mystery', 10749: 'romance', 878: 'scifi', 53: 'thriller',
  10752: 'war',    37: 'western', 10770: 'tv',
}

// Derive a small set of hashtags for a pick so users see WHY it was chosen
// at a glance. Tags are pulled from real data (TMDb genres, rating, year)
// plus the user's mood/company answers.
function tagsFor(pick, mood, company) {
  const tags = []

  // 2 genre tags
  for (const id of (pick.genreIds || []).slice(0, 2)) {
    if (GENRE_TAG[id]) tags.push(GENRE_TAG[id])
  }

  // Quality
  if (pick.rating >= 8)        tags.push('critically-loved')
  else if (pick.rating >= 7.5) tags.push('highly-rated')

  // Era — only when it's notable
  const y = pick.year
  if (y && y < 1990)       tags.push('classic')
  else if (y && y >= 2020) tags.push('fresh')

  // Company match
  if (company === 'family')        tags.push('family-friendly')
  else if (company === 'partner')  tags.push('date-night')
  else if (company === 'friends')  tags.push('group-watch')

  // Cap at 5 unique tags
  return [...new Set(tags)].slice(0, 5)
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

const ERAS = [
  { value: 'any',     label: 'Any era' },
  { value: 'modern',  label: 'Modern · 2015+',       releaseAfter:  2015 },
  { value: 'recent',  label: '2000s & later',        releaseAfter:  2000 },
  { value: 'classic', label: 'Pre-2000 classics',    releaseBefore: 1999 },
]

const LENGTHS = [
  { value: 'any',    label: 'Any length' },
  { value: 'short',  label: 'Under 90 min',  runtimeMax: 90 },
  { value: 'medium', label: '90–130 min',    runtimeMin: 80, runtimeMax: 130 },
  { value: 'long',   label: '2+ hours',      runtimeMin: 120 },
]

// Genres users might want to actively avoid for the night
const AVOID_OPTIONS = [
  { id: 27,    emoji: '👻', label: 'Horror' },
  { id: 10402, emoji: '🎵', label: 'Musical' },
  { id: 99,    emoji: '📷', label: 'Documentary' },
  { id: 10749, emoji: '💕', label: 'Romance' },
  { id: 18,    emoji: '🎭', label: 'Heavy drama' },
  { id: 10752, emoji: '⚔️', label: 'War' },
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

  // Optional / advanced filters
  const [era, setEra]               = useState('any')
  const [length, setLength]         = useState('any')
  const [avoidIds, setAvoidIds]     = useState(() => new Set())
  const [advancedOpen, setAdvancedOpen] = useState(false)

  function toggleAvoid(id) {
    setAvoidIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

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

    const eraOpt    = ERAS.find((e) => e.value === era)       || {}
    const lengthOpt = LENGTHS.find((l) => l.value === length) || {}

    const baseFilter = {
      genres: moodOpt.genres || [],
      withoutGenres: [...avoidIds],          // genres the user wants to skip
      familyFriendly: !!companyOpt.familyFriendly,
      minRating: 7,
      minVoteCount: 300,
      sortBy: SORT_ROTATION[sortIdx % SORT_ROTATION.length],
      // Era filter overrides mood's classic year if user set one explicitly
      releaseAfter:  eraOpt.releaseAfter,
      releaseBefore: eraOpt.releaseBefore || moodOpt.beforeYear,
      // Length filter
      runtimeMin: lengthOpt.runtimeMin,
      runtimeMax: lengthOpt.runtimeMax,
    }

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
    setEra('any'); setLength('any'); setAvoidIds(new Set()); setAdvancedOpen(false)
  }

  // Quick string of active optional filters — shown on the toggle row
  const advancedSummary = useMemo(() => {
    const parts = []
    if (era !== 'any')    parts.push(ERAS.find((e) => e.value === era)?.label)
    if (length !== 'any') parts.push(LENGTHS.find((l) => l.value === length)?.label)
    if (avoidIds.size)    parts.push(`avoiding ${avoidIds.size}`)
    return parts.join(' · ')
  }, [era, length, avoidIds])

  // ── Render ────────────────────────────────────────────────────────
  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
      <header className="text-center mb-4">
        <div className="text-[11px] font-bold tracking-[0.25em] text-brand uppercase mb-1 flex items-center justify-center gap-1.5">
          <motion.span
            animate={{ rotate: [0, 15, -10, 0], scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
          >
            ✨
          </motion.span>
          AI Pick
        </div>
        <h1 className="font-display text-3xl sm:text-4xl tracking-[0.02em] mb-1">
          What should I watch?
        </h1>
        <p className="text-sm text-neutral-500 dark:text-white/60">
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
            <p className="text-center mb-3 text-xs sm:text-sm text-neutral-500 dark:text-white/60">
              For a <strong>{MOODS.find((m) => m.value === mood)?.label.toLowerCase()}</strong>{' '}
              watch {COMPANY.find((c) => c.value === company)?.label.toLowerCase()}:
            </p>

            {/* Card grid — slightly wider than the form view but still compact
                enough to keep the whole page in the viewport. */}
            <div className="grid grid-cols-3 gap-3 sm:gap-5 mb-5 max-w-2xl mx-auto">
              <AnimatePresence mode="wait">
                {loading ? (
                  // SKELETONS — elaborate, branded, structured like real cards
                  [0, 1, 2].map((i) => <SkeletonPickCard key={`skel-${round}-${i}`} index={i} />)
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

                      {/* Hashtag row — appears just after the card */}
                      <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 + idx * 0.18, duration: 0.35 }}
                        className="mt-2 flex flex-wrap justify-center gap-1 px-0.5"
                      >
                        {tagsFor(pick, mood, company).map((tag) => (
                          <span
                            key={tag}
                            className="
                              text-[9px] sm:text-[10px] font-medium
                              text-brand bg-brand/10
                              border border-brand/20
                              px-1.5 py-0.5 rounded-full
                              leading-none whitespace-nowrap
                            "
                          >
                            #{tag}
                          </span>
                        ))}
                      </motion.div>

                      <motion.p
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.7 + idx * 0.18, duration: 0.4 }}
                        className="mt-1.5 text-[10px] sm:text-[11px] text-neutral-600 dark:text-white/70 leading-snug px-0.5 line-clamp-2"
                      >
                        {reasonFor(pick, mood, company)}
                      </motion.p>
                    </motion.div>
                  ))
                ) : null}
              </AnimatePresence>
            </div>

            {/* Action buttons — ALWAYS visible, never unmount during loading */}
            <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-1">
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
            className="space-y-4"
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

            {/* ── Advanced (optional) section ─────────────────────── */}
            {step >= 2 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <button
                  onClick={() => setAdvancedOpen((v) => !v)}
                  className="
                    w-full flex items-center justify-between gap-3 px-5 py-3 rounded-2xl
                    bg-gradient-to-r from-white/[0.03] to-white/[0.01]
                    dark:from-white/[0.04] dark:to-white/[0.02]
                    border border-white/10 dark:border-white/10
                    hover:border-brand/40
                    transition
                    text-left
                  "
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-sm">
                      ⚙
                    </span>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold">Fine-tune (optional)</div>
                      <div className="text-[11px] text-neutral-500 dark:text-white/50 truncate">
                        {advancedSummary || 'Era, length, genres to avoid'}
                      </div>
                    </div>
                  </div>
                  <motion.span
                    animate={{ rotate: advancedOpen ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="text-xs text-neutral-500 dark:text-white/50"
                  >
                    ▾
                  </motion.span>
                </button>

                <AnimatePresence initial={false}>
                  {advancedOpen && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.25, ease: 'easeOut' }}
                      className="overflow-hidden"
                    >
                      <div className="
                        mt-3 p-5 rounded-2xl space-y-5
                        bg-gradient-to-br from-white/[0.04] to-transparent
                        border border-white/10
                      ">
                        <OptionalRow label="Era">
                          <SmallChips options={ERAS} value={era} onSelect={setEra} />
                        </OptionalRow>
                        <OptionalRow label="Length">
                          <SmallChips options={LENGTHS} value={length} onSelect={setLength} />
                        </OptionalRow>
                        <OptionalRow label="Avoid">
                          <div className="flex flex-wrap gap-2">
                            {AVOID_OPTIONS.map((opt) => {
                              const active = avoidIds.has(opt.id)
                              return (
                                <motion.button
                                  key={opt.id}
                                  onClick={() => toggleAvoid(opt.id)}
                                  whileHover={{ scale: 1.04 }}
                                  whileTap={{ scale: 0.94 }}
                                  className={`
                                    px-3 py-1.5 rounded-full text-xs font-medium transition-colors
                                    flex items-center gap-1.5
                                    ${active
                                      ? 'bg-red-500/20 text-red-300 border border-red-500/40 line-through'
                                      : 'bg-white/[0.04] dark:bg-white/[0.04] hover:bg-white/10 border border-white/10 text-neutral-700 dark:text-white/70'}
                                  `}
                                >
                                  <span>{opt.emoji}</span>
                                  <span>{opt.label}</span>
                                </motion.button>
                              )
                            })}
                          </div>
                        </OptionalRow>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

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
                  className="text-center pt-2"
                >
                  <motion.button
                    onClick={generate}
                    whileHover={{ scale: 1.05, boxShadow: '0 12px 50px -10px rgba(212,175,55,0.7)' }}
                    whileTap={{ scale: 0.97 }}
                    className="
                      px-10 py-3.5 rounded-full text-base font-semibold
                      bg-gradient-to-br from-brand via-brand to-brand-light text-black
                      shadow-xl shadow-brand/40
                      transition-shadow
                      relative overflow-hidden
                    "
                  >
                    <span className="relative z-10">✨ Find me something</span>
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

// Step container: number badge in a card-style wrapper with subtle gold accent
function Step({ n, question, active, children }) {
  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="
            relative p-5 rounded-2xl
            bg-gradient-to-br from-white/[0.04] via-white/[0.02] to-transparent
            border border-white/10
            shadow-xl shadow-black/20
          "
        >
          {/* Soft gold accent in the corner so it doesn't feel flat */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-brand/10 to-transparent rounded-tr-2xl rounded-bl-full pointer-events-none" />

          <div className="flex items-center gap-3 mb-4 relative">
            <motion.span
              initial={{ scale: 0, rotate: -45 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 18, delay: 0.1 }}
              className="
                w-9 h-9 rounded-full text-sm font-bold flex items-center justify-center
                bg-gradient-to-br from-brand to-brand-dark text-black
                shadow-lg shadow-brand/40
                ring-2 ring-brand/30
              "
            >
              {n}
            </motion.span>
            <h2 className="text-lg sm:text-xl font-bold">{question}</h2>
          </div>
          <div className="relative">
            {children}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// Optional section row: label on the left, chips on the right
function OptionalRow({ label, children }) {
  return (
    <div className="space-y-1.5">
      <div className="text-[11px] font-bold tracking-wider uppercase text-neutral-500 dark:text-white/40">
        {label}
      </div>
      {children}
    </div>
  )
}

// Smaller chip set used inside the advanced section
function SmallChips({ options, value, onSelect }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const active = value === opt.value
        return (
          <motion.button
            key={opt.value}
            onClick={() => onSelect(opt.value)}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.94 }}
            className={`
              px-3 py-1.5 rounded-full text-xs font-medium transition-colors
              ${active
                ? 'bg-brand text-black border border-brand shadow-md shadow-brand/30'
                : 'bg-white/[0.04] dark:bg-white/[0.04] hover:bg-white/10 border border-white/10 text-neutral-700 dark:text-white/70'}
            `}
          >
            {opt.label}
          </motion.button>
        )
      })}
    </div>
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

// Polished skeleton "pick card" — mimics a real card's anatomy:
//   - Top image area with gold shimmer + tint
//   - Star rating + media-type badge in the corners
//   - Title bar overlaid at the bottom of the image
//   - Text lines below for the reasoning sentence
// Each card animates in with a slight stagger (handled by parent grid).
function SkeletonPickCard({ index = 0 }) {
  // Per-card variety so the three skeletons don't look mechanically identical
  const titleW = ['78%', '85%', '62%'][index % 3]
  const yearW  = ['38%', '45%', '32%'][index % 3]
  const lines  = [
    ['88%', '92%', '70%'],
    ['82%', '90%', '60%'],
    ['90%', '76%', '64%'],
  ][index % 3]

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -16, scale: 0.95 }}
      transition={{
        type: 'spring',
        stiffness: 220,
        damping: 22,
        delay: index * 0.12,
      }}
      className="text-center"
    >
      {/* ─── Card body: poster placeholder with rating + type badge + title bar ─── */}
      <div className="
        relative aspect-[2/3] overflow-hidden rounded-xl
        bg-gradient-to-br from-neutral-200 to-neutral-300
        dark:from-neutral-800 dark:to-neutral-900
        ring-1 ring-black/5 dark:ring-white/5
      ">
        {/* Soft gold tint over everything so it feels on-brand */}
        <div className="absolute inset-0 bg-gradient-to-br from-brand/10 via-transparent to-brand/5 pointer-events-none" />

        {/* Diagonal gold-ish shimmer sweep — repeats every 1.6s with stagger */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-brand/30 to-transparent"
          style={{ transform: 'skewX(-12deg)' }}
          animate={{ x: ['-120%', '120%'] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut', delay: index * 0.25 }}
        />

        {/* Sparkle in the middle, faint */}
        <div className="absolute inset-0 flex items-center justify-center text-5xl opacity-15">✨</div>

        {/* Top-left: pretend star rating badge */}
        <div className="absolute top-2 left-2 h-4 w-12 rounded-md bg-black/40 dark:bg-black/60 backdrop-blur-sm" />

        {/* Top-right: pretend media-type badge */}
        <div className="absolute top-2 right-2 h-4 w-10 rounded-md bg-brand/50" />

        {/* Bottom: pretend title strip (sits over the dark gradient like the real card) */}
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/70 via-black/30 to-transparent pointer-events-none" />
        <div className="absolute inset-x-3 bottom-3 space-y-1.5">
          <div className="h-2.5 rounded-full bg-white/70 dark:bg-white/40" style={{ width: titleW }} />
          <div className="h-1.5 rounded-full bg-white/50 dark:bg-white/25" style={{ width: yearW }} />
        </div>
      </div>

      {/* ─── Hashtag placeholders ─── */}
      <div className="mt-2 flex flex-wrap justify-center gap-1">
        {['48px', '56px', '40px'].map((w, j) => (
          <div
            key={`tag-${j}`}
            className="relative h-3.5 rounded-full bg-brand/10 border border-brand/20 overflow-hidden"
            style={{ width: w }}
          >
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-brand/30 to-transparent"
              animate={{ x: ['-100%', '300%'] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut', delay: index * 0.2 + j * 0.1 }}
            />
          </div>
        ))}
      </div>

      {/* ─── Reasoning placeholder: two shimmering lines ─── */}
      <div className="mt-1.5 space-y-1.5 flex flex-col items-center">
        {lines.slice(0, 2).map((w, j) => (
          <div
            key={j}
            className="relative h-2 rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden"
            style={{ width: w }}
          >
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-brand/40 to-transparent"
              animate={{ x: ['-100%', '300%'] }}
              transition={{
                duration: 1.6,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: index * 0.2 + j * 0.15,
              }}
            />
          </div>
        ))}
      </div>
    </motion.div>
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
