// PickPage — "What should I watch tonight?"
//
// A guided three-question form (time / mood / company) maps to TMDb
// /discover filters. We pick 3 high-quality results that the user hasn't
// already watched, and generate a one-liner reasoning per pick from a
// template. No external AI required — TMDb's data gives us enough.

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useFavorites } from '../lib/FavoritesContext'
import { discoverMovies } from '../lib/tmdb'
import { usePageTitle } from '../lib/usePageTitle'
import MediaCard from '../components/MediaCard'

// ── TMDb genre IDs ──────────────────────────────────────────────────
// Documented at https://developer.themoviedb.org/reference/genre-movie-list
const GENRE = {
  action: 28,    adventure: 12,  animation: 16, comedy: 35,    crime: 80,
  doc:    99,    drama: 18,       family: 10751, fantasy: 14,  history: 36,
  horror: 27,    music: 10402,    mystery: 9648, romance: 10749,
  scifi:  878,   thriller: 53,    war: 10752,    western: 37,  tvMovie: 10770,
}

// ── Question definitions ────────────────────────────────────────────
const TIMES = [
  { value: 'short',    label: 'Under 90 min',   runtimeMax: 90  },
  { value: 'medium',   label: '90 – 130 min',   runtimeMin: 80,  runtimeMax: 130 },
  { value: 'long',     label: '2+ hours',       runtimeMin: 120 },
  { value: 'any',      label: 'No limit' },
]

const MOODS = [
  { value: 'funny',    emoji: '😄', label: 'Funny / happy',     genres: [GENRE.comedy, GENRE.animation, GENRE.family] },
  { value: 'intense',  emoji: '😱', label: 'Intense / thrilling', genres: [GENRE.thriller, GENRE.action, GENRE.crime, GENRE.mystery] },
  { value: 'deep',     emoji: '🤔', label: 'Thought-provoking',   genres: [GENRE.drama, GENRE.scifi, GENRE.history, GENRE.doc] },
  { value: 'cozy',     emoji: '❤️', label: 'Cozy / comfort',     genres: [GENRE.romance, GENRE.family, GENRE.animation] },
  { value: 'epic',     emoji: '⚔️', label: 'Epic / adventure',    genres: [GENRE.adventure, GENRE.fantasy, GENRE.action, GENRE.scifi] },
  { value: 'surprise', emoji: '🎲', label: 'Surprise me',        genres: [] },
]

const COMPANY = [
  { value: 'alone',   label: 'Alone' },
  { value: 'partner', label: 'With a partner' },
  { value: 'friends', label: 'With friends' },
  { value: 'family',  label: 'With family',   familyFriendly: true },
]

// Template-based reasoning. No AI, but reads warmly.
function reasonFor(item, mood, time) {
  const ratingTag = item.rating >= 8 ? 'Critically loved' : item.rating >= 7 ? 'Highly rated' : 'Well reviewed'
  const moodPhrase = {
    funny:    'a lift for a happy night',
    intense:  'pure tension and adrenaline',
    deep:     'something that sticks with you',
    cozy:     'soft, comforting, easy to put on',
    epic:     'a big-screen ride from the couch',
    surprise: 'something a little different',
  }[mood] || 'a solid pick'
  const timePhrase = time === 'short'  ? 'fits comfortably under 90 min'
                   : time === 'long'   ? 'gives you a full evening'
                   : time === 'medium' ? 'fits a normal movie night'
                   : ''
  return `${ratingTag} · ${moodPhrase}${timePhrase ? ` · ${timePhrase}` : ''}.`
}

function PickPage() {
  usePageTitle('What should I watch?')
  const { items } = useFavorites()

  const [step, setStep]       = useState(1)
  const [time, setTime]       = useState(null)
  const [mood, setMood]       = useState(null)
  const [company, setCompany] = useState(null)

  const [loading, setLoading] = useState(false)
  const [picks, setPicks]     = useState(null)
  const [error, setError]     = useState(null)

  // IDs the user has already marked watched — used to filter results
  const watchedIds = new Set(
    items.filter((i) => i.isWatched && i.mediaType === 'movie').map((i) => i.id)
  )

  async function generate() {
    setLoading(true); setError(null); setPicks(null)

    const timeOpt    = TIMES.find((t) => t.value === time)    || {}
    const moodOpt    = MOODS.find((m) => m.value === mood)    || {}
    const companyOpt = COMPANY.find((c) => c.value === company) || {}

    try {
      // Try the strict filter first
      let results = await discoverMovies({
        genres: moodOpt.genres || [],
        runtimeMin: timeOpt.runtimeMin,
        runtimeMax: timeOpt.runtimeMax,
        familyFriendly: !!companyOpt.familyFriendly,
        minRating: 7,
        minVoteCount: 300,
      })

      // Filter out already-watched
      results = results.filter((r) => !watchedIds.has(r.id))

      // If too few, relax the rating bar and try again
      if (results.length < 3) {
        const fallback = await discoverMovies({
          genres: moodOpt.genres || [],
          runtimeMin: timeOpt.runtimeMin,
          runtimeMax: timeOpt.runtimeMax,
          familyFriendly: !!companyOpt.familyFriendly,
          minRating: 6,
          minVoteCount: 100,
          page: Math.floor(Math.random() * 3) + 1,   // mix up pagination so suggestions feel fresh
        })
        results = [
          ...results,
          ...fallback.filter((r) => !watchedIds.has(r.id) && !results.some((x) => x.id === r.id)),
        ]
      }

      if (results.length === 0) {
        setError('No matches with these filters. Try a different mood or relax the time constraint.')
        return
      }

      // Shuffle slightly so re-runs don't always pick the same top 3
      results = results.slice(0, 12).sort(() => Math.random() - 0.5)

      setPicks(results.slice(0, 3))
    } catch (err) {
      setError(err.message || 'Something went wrong picking movies.')
    } finally {
      setLoading(false)
    }
  }

  function reset() {
    setStep(1); setTime(null); setMood(null); setCompany(null); setPicks(null); setError(null)
  }

  // ── Render ────────────────────────────────────────────────────────
  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      <header className="text-center mb-10">
        <h1 className="font-display text-5xl sm:text-6xl tracking-[0.02em] mb-2">
          What should I watch?
        </h1>
        <p className="text-neutral-500 dark:text-white/60">
          A 10-second guided pick — tell us your vibe and we'll suggest three.
        </p>
      </header>

      {/* ── Results screen ─────────────────────────────────────────── */}
      {picks ? (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <div className="text-center mb-6">
            <p className="text-sm text-neutral-500 dark:text-white/60">
              For a <strong>{MOODS.find((m) => m.value === mood)?.label.toLowerCase()}</strong>{' '}
              {time !== 'any' && <>under <strong>{TIMES.find((t) => t.value === time)?.label.toLowerCase()}</strong> </>}
              watch {COMPANY.find((c) => c.value === company)?.label.toLowerCase()}:
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
            {picks.map((pick) => (
              <div key={pick.id} className="text-center">
                <MediaCard {...pick} />
                <p className="mt-3 text-xs text-neutral-600 dark:text-white/70 leading-relaxed px-1">
                  {reasonFor(pick, mood, time)}
                </p>
              </div>
            ))}
          </div>

          <div className="flex justify-center gap-3">
            <button
              onClick={generate}
              className="px-5 py-2.5 rounded-full bg-brand hover:bg-brand-light text-black font-semibold text-sm transition"
            >
              🎲 Pick again
            </button>
            <button
              onClick={reset}
              className="px-5 py-2.5 rounded-full bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 border border-black/10 dark:border-white/10 text-sm transition"
            >
              Start over
            </button>
          </div>
        </motion.div>
      ) : loading ? (
        <div className="text-center py-20">
          <div className="text-4xl mb-4 animate-pulse">🎬</div>
          <p className="text-neutral-500 dark:text-white/60">Looking for tonight's pick…</p>
        </div>
      ) : (
        // ── Form ─────────────────────────────────────────────────────
        <div className="space-y-10">
          <Step n="1" question="How much time do you have?" active={step >= 1}>
            <Choices
              options={TIMES}
              value={time}
              onSelect={(v) => { setTime(v); setStep(2) }}
            />
          </Step>

          <Step n="2" question="What's your mood?" active={step >= 2}>
            <Choices
              options={MOODS}
              value={mood}
              onSelect={(v) => { setMood(v); setStep(3) }}
              renderLabel={(o) => <><span className="mr-2">{o.emoji}</span>{o.label}</>}
            />
          </Step>

          <Step n="3" question="Who are you watching with?" active={step >= 3}>
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

          {time && mood && company && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="text-center pt-4">
              <button
                onClick={generate}
                className="px-8 py-3.5 rounded-full bg-brand hover:bg-brand-light text-black font-semibold text-base shadow-lg shadow-brand/30 transition"
              >
                Find me something →
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
