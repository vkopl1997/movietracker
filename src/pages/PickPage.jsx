// PickPage — "What should I watch tonight?"
//
// 9 layers of targeting:
//   1. Library taste profile  — auto-bias toward genres in user's favorites
//   2. Free-text prompt        — keyword-matched to genres/themes/filters
//   3. Similar-to reference    — type a movie you love → biases toward it
//   4. Theme keywords          — heist, time-travel, coming-of-age, etc.
//   5. Multi-mood selection    — pick up to 2 moods to combine
//   6. Occasion-based picker   — "first date", "hangover sunday", etc.
//   7. "Show me less" feedback — ✕ on a card down-weights its genres
//   8. International filter    — Korean, Japanese, French, Spanish, etc.
//   9. Pace slider             — slow burn ←→ fast-paced

import { useEffect, useMemo, useRef, useState } from 'react'

// Always enforce at least this TMDb rating, even when the strict filter is
// too restrictive and we have to widen other constraints.
const HIGH_RATING_FLOOR = 7

// sessionStorage key — picker state survives navigating to a detail page
// and clicking back. Cleared when the user clicks "Start over".
const SESSION_KEY = 'mt_pick_state_v1'
import { motion, AnimatePresence } from 'framer-motion'
import { useFavorites } from '../lib/FavoritesContext'
import {
  discoverMovies,
  searchMulti,
  findKeywordId,
  getMovieRecommendations,
  getMediaDetails,
} from '../lib/tmdb'
import { useAuth } from '../lib/AuthContext'
import { usePageTitle } from '../lib/usePageTitle'
import MediaCard from '../components/MediaCard'

const GENRE = {
  action: 28,    adventure: 12,  animation: 16, comedy: 35,    crime: 80,
  doc:    99,    drama: 18,       family: 10751, fantasy: 14,  history: 36,
  horror: 27,    music: 10402,    mystery: 9648, romance: 10749,
  scifi:  878,   thriller: 53,    war: 10752,    western: 37,
}

const GENRE_NAMES = {
  28: 'action',   12: 'adventure', 16: 'animation', 35: 'comedy',
  80: 'crime',    99: 'doc',       18: 'drama',     10751: 'family',
  14: 'fantasy',  36: 'history',   27: 'horror',    10402: 'music',
  9648: 'mystery', 10749: 'romance', 878: 'scifi',  53: 'thriller',
  10752: 'war',   37: 'western',
}

// ── Moods (multi-select up to 2) ─────────────────────────────────────
const MOODS = [
  { value: 'funny',    label: 'Funny / happy',       genres: [GENRE.comedy, GENRE.animation, GENRE.family] },
  { value: 'intense',  label: 'Intense / thrilling',  genres: [GENRE.thriller, GENRE.action, GENRE.crime, GENRE.mystery] },
  { value: 'deep',     label: 'Thought-provoking',    genres: [GENRE.drama, GENRE.scifi, GENRE.history, GENRE.doc] },
  { value: 'cozy',     label: 'Cozy / comfort',       genres: [GENRE.romance, GENRE.family, GENRE.animation] },
  { value: 'epic',     label: 'Epic / adventure',     genres: [GENRE.adventure, GENRE.fantasy, GENRE.action, GENRE.scifi] },
  { value: 'dark',     label: 'Dark / gritty',        genres: [GENRE.crime, GENRE.horror, GENRE.thriller, GENRE.drama] },
  { value: 'classic',  label: 'Classic / timeless',   genres: [], beforeYear: 2000 },
  { value: 'surprise', label: 'Surprise me',           genres: [] },
]

// ── Occasions (replaces "watching with") ─────────────────────────────
const OCCASIONS = [
  { value: 'hangover',  label: 'Hangover Sunday',        runtimeMax: 110, minRating: 7.2, sortBy: 'vote_average.desc' },
  { value: 'firstdate', label: 'First date',              runtimeMin: 90,  runtimeMax: 130, withoutGenres: [GENRE.horror, GENRE.war] },
  { value: 'friends',   label: 'Friends over',            withoutGenres: [GENRE.drama, GENRE.romance] },
  { value: 'family',    label: 'With family',             familyFriendly: true },
  { value: 'partner',   label: 'Partner — quiet night',   withoutGenres: [GENRE.horror, GENRE.war] },
  { value: 'alone',     label: 'Alone' },
  { value: 'late',      label: '3 AM insomnia',           genres: [GENRE.mystery, GENRE.thriller, GENRE.scifi] },
  { value: 'rainy',     label: 'Rainy afternoon',         runtimeMin: 100, genres: [GENRE.drama, GENRE.romance] },
  { value: 'background', label: 'Just background',         familyFriendly: false, sortBy: 'popularity.desc' },
]

const ERAS = [
  { value: 'any',     label: 'Any era' },
  { value: 'modern',  label: 'Modern (2015+)',     releaseAfter: 2015 },
  { value: 'recent',  label: 'Recent (2000-2015)', releaseAfter: 2000, releaseBefore: 2015 },
  { value: 'classic', label: 'Pre-2000 classics',  releaseBefore: 1999 },
]

const LENGTHS = [
  { value: 'any',    label: 'Any length' },
  { value: 'short',  label: 'Under 90 min',  runtimeMax: 90 },
  { value: 'medium', label: '90-130 min',    runtimeMin: 80, runtimeMax: 130 },
  { value: 'long',   label: '2+ hours',      runtimeMin: 120 },
]

const AVOID_OPTIONS = [
  { id: GENRE.horror,   label: 'Horror' },
  { id: GENRE.music,    label: 'Musical' },
  { id: GENRE.doc,      label: 'Documentary' },
  { id: GENRE.romance,  label: 'Romance' },
  { id: GENRE.drama,    label: 'Heavy drama' },
  { id: GENRE.war,      label: 'War' },
]

// ── Themes ────────────────────────────────────────────────────────────
// Grouped into four categories so users scan by intent rather than scrolling
// a flat blob. Each name is a TMDb keyword; ids are looked up on demand by
// findKeywordId() and a miss falls back silently to "no keyword filter".
const THEME_GROUPS = [
  {
    group: 'Plot device',
    items: ['heist', 'time travel', 'revenge', 'twist ending', 'amnesia', 'conspiracy', 'kidnapping', 'survival'],
  },
  {
    group: 'Setting',
    items: ['space', 'dystopia', 'post apocalypse', 'road trip', 'high school', 'small town', 'new york', 'one night'],
  },
  {
    group: 'Tone & flavor',
    items: ['based on novel', 'based on true story', 'coming of age', 'found family', 'forbidden love', 'supernatural', 'friendship', 'feel good'],
  },
  {
    group: 'Character',
    items: ['assassin', 'spy', 'detective', 'serial killer', 'hacker', 'vampire', 'zombie', 'underdog'],
  },
]
// Flat list used by parsePrompt() — order doesn't matter for substring scan.
const THEMES = THEME_GROUPS.flatMap((g) => g.items)

const LANGUAGES = [
  { code: 'ko', label: 'Korean' },
  { code: 'ja', label: 'Japanese' },
  { code: 'fr', label: 'French' },
  { code: 'es', label: 'Spanish' },
  { code: 'it', label: 'Italian' },
  { code: 'de', label: 'German' },
  { code: 'hi', label: 'Hindi' },
  { code: 'sv', label: 'Scandinavian' },
]

// ── Free-text prompt → filter dispatcher ─────────────────────────────
// Tiny "NLP" — turns "twisty mystery without too much violence" into
// concrete filter tweaks. Keyword spotting, no AI.
function parsePrompt(text) {
  // Always return the full shape so callers can safely spread .boostGenres /
  // .excludeGenres / .themes without null-checking each one.
  const filters = { boostGenres: [], excludeGenres: [], themes: [] }
  const t = (text || '').toLowerCase()
  if (!t.trim()) return filters
  const keyword = (re, fn) => { if (re.test(t)) fn(filters) }

  // Direct genre nudges
  keyword(/\b(funny|laugh|comedy|hilarious)\b/, f => f.boostGenres.push(GENRE.comedy))
  keyword(/\b(scary|horror|spook|haunt)\b/,     f => f.boostGenres.push(GENRE.horror))
  keyword(/\b(sci-?fi|space|alien|future)\b/,   f => f.boostGenres.push(GENRE.scifi))
  keyword(/\b(romance|love|date)\b/,            f => f.boostGenres.push(GENRE.romance))
  keyword(/\b(thrill|tense|edge.of)\b/,         f => f.boostGenres.push(GENRE.thriller))
  keyword(/\b(epic|adventure|grand)\b/,         f => f.boostGenres.push(GENRE.adventure))
  keyword(/\b(animate|cartoon|pixar)\b/,        f => f.boostGenres.push(GENRE.animation))
  keyword(/\b(drama|emotional|serious)\b/,      f => f.boostGenres.push(GENRE.drama))

  // Exclusions
  keyword(/\b(not.+(violent|gory|scary))|no\s+(horror|gore)\b/, f => {
    f.excludeGenres.push(GENRE.horror)
  })
  keyword(/\b(not.+sad|no\s+drama|nothing\s+heavy)\b/, f => f.excludeGenres.push(GENRE.drama))
  keyword(/\b(no\s+romance|not.+romantic)\b/,         f => f.excludeGenres.push(GENRE.romance))

  // Theme keywords spotted in text
  for (const theme of THEMES) {
    if (t.includes(theme)) filters.themes.push(theme)
  }
  if (/\b(twist|twisty|surprise.ending)\b/.test(t)) filters.themes.push('twist ending')
  if (/\b(time.travel)\b/.test(t))                  filters.themes.push('time travel')

  return filters
}

const SORT_ROTATION = ['vote_average.desc', 'popularity.desc', 'vote_count.desc']

// Reasoning sentence template based on user's selections
function reasonFor(item, moods, occasionLabel) {
  const ratingTag = item.rating >= 8 ? 'Critically loved' : item.rating >= 7 ? 'Highly rated' : 'Well reviewed'
  const moodPhrases = {
    funny:    'fun and lifting',
    intense:  'tense and gripping',
    deep:     'one that lingers',
    cozy:     'soft and comforting',
    epic:     'big-screen scale',
    dark:     'gritty and bold',
    classic:  'an enduring favorite',
    surprise: 'a little different',
  }
  const moodPart = moods.map((m) => moodPhrases[m] || 'a solid pick').join(', ')
  return `${ratingTag} · ${moodPart}${occasionLabel ? ` · ${occasionLabel.toLowerCase()}` : ''}.`
}

// Hashtags per pick
function tagsFor(pick, moods, occasion) {
  const tags = []
  for (const id of (pick.genreIds || []).slice(0, 2)) {
    const name = GENRE_NAMES[id]
    if (name) tags.push(name)
  }
  if (pick.rating >= 8) tags.push('critically-loved')
  else if (pick.rating >= 7.5) tags.push('highly-rated')
  if (pick.year && pick.year < 1990) tags.push('classic')
  else if (pick.year && pick.year >= 2020) tags.push('fresh')
  if (occasion === 'family')    tags.push('family-friendly')
  if (occasion === 'firstdate') tags.push('date-night')
  if (occasion === 'friends')   tags.push('group-watch')
  if (moods.length > 1)         tags.push(`${moods[0]}-${moods[1]}`)
  return [...new Set(tags)].slice(0, 5)
}

// Score a single candidate against the user's situation + taste profile.
// Higher score = more user-targeted. We sort by this and pick top 3 — no
// random shuffle. This is the whole reason the recommender stops feeling random.
// Returns 0-100 (floored AND capped, so the UI shows clean numbers).
function scoreCandidate(movie, ctx) {
  let score = 5                                                 // small base — any survivor still > 0
  const movieGenres = new Set(movie.genreIds || [])

  // (1) Genre overlap with user's favorites. Weight is reduced in explicit
  // mode so the user's "make it feel like X" choice isn't outvoted by their
  // inferred long-term taste.
  if (ctx.topGenres?.length) {
    const matches = ctx.topGenres.filter((g) => movieGenres.has(g)).length
    const weight  = ctx.explicitMode ? 25 : 40
    score += (matches / Math.min(3, ctx.topGenres.length)) * weight
  }

  // (2) Tonight's mood — genre overlap (0-25). Always rewards even partial fit.
  if (ctx.moodGenres?.length) {
    const matches = ctx.moodGenres.filter((g) => movieGenres.has(g)).length
    score += (matches / Math.min(3, ctx.moodGenres.length)) * 25
  }

  // (3) Era match (0-15) — user pick takes priority over inferred dominant era
  const targetEra = ctx.era !== 'any' ? ctx.era : ctx.dominantEra
  if (targetEra && movie.year) {
    const inModern  = movie.year >= 2015
    const inRecent  = movie.year >= 2000 && movie.year < 2015
    const inClassic = movie.year < 2000
    const hit = (targetEra === 'modern' && inModern) ||
                (targetEra === 'recent' && inRecent) ||
                (targetEra === 'classic' && inClassic)
    score += hit ? 15 : (movie.year ? 4 : 0)   // small consolation for adjacent
  }

  // (4) Quality — rating above the 7 floor (0-15).
  if (movie.rating) {
    score += Math.min(15, Math.max(0, (movie.rating - 7) * 7.5))
  }

  // (5) Bonus: came from "similar to <movie>" / themes / favorites' recs.
  // Explicit signal gets a bigger bump so the user's intent dominates.
  if (ctx.boostedIds?.has(movie.id)) {
    score += ctx.explicitMode ? 25 : 12
  }

  // (6) Penalty: down-weighted genres — capped at -20 total.
  let penalty = 0
  for (const g of movieGenres) {
    if (ctx.downGenres[g]) penalty += 8 * ctx.downGenres[g]
  }
  score -= Math.min(penalty, 20)

  // Clean 0-100 range so "Top match: 102/100" can never appear again.
  return Math.max(0, Math.min(100, score))
}

function PickPage() {
  usePageTitle('What should I watch?')
  const { items } = useFavorites()
  const { user } = useAuth()

  // ── Required state ────────────────────────────────────────────────
  const [moods, setMoods]       = useState([])               // [#5] multi-select
  const [occasion, setOccasion] = useState(null)              // [#6]

  // ── Optional state ────────────────────────────────────────────────
  const [era, setEra]               = useState('any')
  const [length, setLength]         = useState('any')
  const [pace, setPace]             = useState(50)            // [#9] 0=slow, 100=fast
  const [avoidIds, setAvoidIds]     = useState(() => new Set())
  const [pickedThemes, setPickedThemes] = useState(() => new Set())  // [#4]
  const [languages, setLanguages]   = useState(() => new Set())  // [#8]
  const [prompt, setPrompt]         = useState('')             // [#2]
  const [similarTo, setSimilarTo]   = useState(null)           // [#3] {id, title}
  const [advancedOpen, setAdvancedOpen] = useState(false)

  // ── Session memory ────────────────────────────────────────────────
  const [seenIds, setSeenIds]       = useState(() => new Set())
  const [downGenres, setDownGenres] = useState({})            // [#7] genreId → count
  const [sortIdx, setSortIdx]       = useState(0)
  const [round, setRound]           = useState(0)
  const [hasPicked, setHasPicked]   = useState(false)

  // ── Run state ─────────────────────────────────────────────────────
  const [loading, setLoading]       = useState(false)
  const [picks, setPicks]           = useState(null)
  const [topScore, setTopScore]     = useState(null)          // best score in the picked set
  const [error, setError]           = useState(null)

  // Top-5 genres from user's favorites — populated async, cached locally
  const [topGenres, setTopGenres]   = useState([])

  const watchedIds = useMemo(
    () => new Set(items.filter((i) => i.isWatched && i.mediaType === 'movie').map((i) => i.id)),
    [items]
  )

  // ── Persist state across navigations ──────────────────────────────
  // When the user opens a movie from the results, PickPage unmounts.
  // sessionStorage lets us restore the entire picker — selections + picks +
  // memory — when they hit back. Cleared by reset().
  const restoredRef = useRef(false)
  useEffect(() => {
    if (restoredRef.current) return
    restoredRef.current = true
    try {
      const raw = sessionStorage.getItem(SESSION_KEY)
      if (!raw) return
      const s = JSON.parse(raw)
      if (Array.isArray(s.moods))     setMoods(s.moods)
      if (s.occasion)                 setOccasion(s.occasion)
      if (s.era)                      setEra(s.era)
      if (s.length)                   setLength(s.length)
      if (typeof s.pace === 'number') setPace(s.pace)
      setAvoidIds(new Set(s.avoidIds || []))
      setPickedThemes(new Set(s.pickedThemes || []))
      setLanguages(new Set(s.languages || []))
      if (typeof s.prompt === 'string') setPrompt(s.prompt)
      if (s.similarTo)                setSimilarTo(s.similarTo)
      setSeenIds(new Set(s.seenIds || []))
      if (s.downGenres)               setDownGenres(s.downGenres)
      if (typeof s.sortIdx === 'number') setSortIdx(s.sortIdx)
      if (typeof s.round === 'number')   setRound(s.round)
      if (s.hasPicked)                setHasPicked(true)
      if (Array.isArray(s.picks))     setPicks(s.picks)
      if (typeof s.topScore === 'number') setTopScore(s.topScore)
      if (s.advancedOpen)             setAdvancedOpen(true)
    } catch { /* corrupted — ignore */ }
  }, [])

  // Save the whole picker state on every change. JSON is small (a few KB)
  // so this is cheap; sessionStorage writes are synchronous and quick.
  useEffect(() => {
    if (!restoredRef.current) return
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({
        moods, occasion, era, length, pace,
        avoidIds:     [...avoidIds],
        pickedThemes: [...pickedThemes],
        languages:    [...languages],
        prompt, similarTo,
        seenIds:      [...seenIds],
        downGenres, sortIdx, round, hasPicked, picks, topScore, advancedOpen,
      }))
    } catch { /* quota / disabled — ignore */ }
  }, [moods, occasion, era, length, pace, avoidIds, pickedThemes, languages,
      prompt, similarTo, seenIds, downGenres, sortIdx, round, hasPicked, picks, topScore, advancedOpen])

  // ── [#1] Library taste profile — analyze user's favorites ─────────
  // Counts year buckets + rating preference + media type ratio.
  // Genre data isn't stored on favorites yet (future work), so we infer
  // taste from years + tmdb ratings the user has favorited.
  const tasteProfile = useMemo(() => {
    const favs = items.filter((i) => i.isFavorite)
    if (favs.length < 3) return null

    let modern = 0, recent = 0, classic = 0
    let avgRating = 0, rated = 0
    let movies = 0, tv = 0
    for (const f of favs) {
      if (f.year) {
        if (f.year >= 2015) modern++
        else if (f.year >= 2000) recent++
        else classic++
      }
      if (typeof f.rating === 'number') { avgRating += f.rating; rated++ }
      if (f.mediaType === 'movie') movies++
      else if (f.mediaType === 'tv') tv++
    }
    avgRating = rated ? Math.round((avgRating / rated) * 10) / 10 : null

    // Find the dominant era
    let dominantEra = null
    const eraMax = Math.max(modern, recent, classic)
    if (eraMax >= 2) {
      if (modern === eraMax)       dominantEra = 'modern'
      else if (recent === eraMax)  dominantEra = 'recent'
      else                         dominantEra = 'classic'
    }

    return { dominantEra, avgRating, movies, tv, totalFavs: favs.length }
  }, [items])

  // ── Fetch real genre signature from user's favorites ───────────────
  // Favorites only carry id/title/year — no genres. We hit /movie/{id} (or /tv)
  // for each favorite, count genre occurrences, and keep the top 5.
  // Cached in localStorage keyed by (user, signature-of-favorites) so we only
  // pay the N requests when the favorites set actually changes.
  useEffect(() => {
    const favs = items.filter((i) => i.isFavorite).slice(0, 12)
    if (favs.length < 3) { setTopGenres([]); return }

    const userKey = user?.id || 'guest'
    const cacheKey = `mt_taste_genres_v1_${userKey}`
    const sig = favs
      .map((f) => `${f.mediaType}:${f.id}`)
      .sort()
      .join(',')

    try {
      const cached = JSON.parse(localStorage.getItem(cacheKey) || 'null')
      if (cached?.sig === sig && Array.isArray(cached.topGenres)) {
        setTopGenres(cached.topGenres)
        return
      }
    } catch { /* corrupted — refetch */ }

    let cancelled = false
    Promise.all(
      favs.map((f) => getMediaDetails(f.mediaType, f.id).catch(() => null))
    ).then((details) => {
      if (cancelled) return
      const count = {}
      for (const d of details) {
        if (!d?.genres) continue
        for (const g of d.genres) count[g.id] = (count[g.id] || 0) + 1
      }
      const ranked = Object.entries(count)
        .sort((a, b) => b[1] - a[1])
        .map(([id]) => Number(id))
        .slice(0, 5)
      setTopGenres(ranked)
      try { localStorage.setItem(cacheKey, JSON.stringify({ sig, topGenres: ranked })) } catch {}
    })

    return () => { cancelled = true }
  }, [items, user?.id])

  function toggleSet(set, value) {
    const next = new Set(set)
    next.has(value) ? next.delete(value) : next.add(value)
    return next
  }

  function toggleMood(value) {
    setMoods((prev) => {
      if (prev.includes(value)) return prev.filter((v) => v !== value)
      if (prev.length >= 2)      return [prev[1], value]   // rotate out the older one
      return [...prev, value]
    })
  }

  // ── [#3] Similar-to autocomplete ────────────────────────────────────
  const [similarQuery, setSimilarQuery] = useState('')
  const [similarResults, setSimilarResults] = useState([])
  const [similarOpen, setSimilarOpen] = useState(false)
  useEffect(() => {
    const q = similarQuery.trim()
    if (!q || similarTo) { setSimilarResults([]); return }
    let cancelled = false
    const t = setTimeout(() => {
      searchMulti(q)
        .then((res) => {
          if (cancelled) return
          setSimilarResults(res.filter((r) => r.mediaType === 'movie').slice(0, 6))
        })
        .catch(() => !cancelled && setSimilarResults([]))
    }, 220)
    return () => { cancelled = true; clearTimeout(t) }
  }, [similarQuery, similarTo])

  // ── Generate ──────────────────────────────────────────────────────
  async function generate() {
    if (moods.length === 0 || !occasion) return
    setLoading(true); setError(null); setPicks(null); setTopScore(null)

    const occasionOpt = OCCASIONS.find((o) => o.value === occasion) || {}
    const eraOpt    = ERAS.find((e) => e.value === era)       || {}
    const lengthOpt = LENGTHS.find((l) => l.value === length) || {}
    const promptFilters = parsePrompt(prompt)

    // Merge mood genres from all selected moods (deduped)
    const moodGenres = [...new Set(moods.flatMap((m) => MOODS.find((x) => x.value === m)?.genres || []))]
    // Boost from prompt
    const genres = [...new Set([...moodGenres, ...promptFilters.boostGenres])]

    // Library taste profile bias [#1]: nudge minRating upward if user has high standards
    let minRating = HIGH_RATING_FLOOR
    if (tasteProfile?.avgRating && tasteProfile.avgRating >= 8) minRating = 7.5
    // If user has dominant era, prefer it when user hasn't set one explicitly
    let releaseAfter  = eraOpt.releaseAfter  ?? occasionOpt.releaseAfter
    let releaseBefore = eraOpt.releaseBefore ?? occasionOpt.releaseBefore ?? MOODS.find(m => m.value === moods[0])?.beforeYear
    if (era === 'any' && tasteProfile?.dominantEra && !releaseAfter && !releaseBefore) {
      if      (tasteProfile.dominantEra === 'modern')  releaseAfter  = 2015
      else if (tasteProfile.dominantEra === 'recent')  { releaseAfter = 2000; releaseBefore = 2015 }
      else if (tasteProfile.dominantEra === 'classic') releaseBefore = 1999
    }

    // Down-weighted genres from "Show me less" feedback [#7]
    const downGenreIds = Object.entries(downGenres)
      .filter(([, count]) => count >= 1)
      .map(([id]) => Number(id))

    // Look up theme keyword ids [#4]
    let keywords = []
    const themeNames = [...pickedThemes, ...promptFilters.themes]
    if (themeNames.length > 0) {
      const ids = await Promise.all(themeNames.map((n) => findKeywordId(n)))
      keywords = ids.filter(Boolean)
    }

    // Pace [#9] → sort axis bias
    let sortBy = SORT_ROTATION[sortIdx % SORT_ROTATION.length]
    if (occasionOpt.sortBy) sortBy = occasionOpt.sortBy
    // pace 0-30 → slow (vote_average), 30-70 → mixed, 70-100 → fast (popularity)
    if (pace < 30)       sortBy = 'vote_average.desc'
    else if (pace > 70)  sortBy = 'popularity.desc'

    const baseFilter = {
      genres,
      withoutGenres: [
        ...avoidIds,
        ...(occasionOpt.withoutGenres || []),
        ...(promptFilters.excludeGenres || []),
        ...downGenreIds,
      ],
      keywords,
      withLanguages: [...languages],
      familyFriendly: !!occasionOpt.familyFriendly,
      minRating: Math.max(minRating, occasionOpt.minRating || 0),
      minVoteCount: 300,
      sortBy,
      releaseAfter,
      releaseBefore,
      runtimeMin: lengthOpt.runtimeMin ?? occasionOpt.runtimeMin,
      runtimeMax: lengthOpt.runtimeMax ?? occasionOpt.runtimeMax,
    }

    try {
      let pool = []
      // boostedIds = candidates that came from an explicit "similar to X" or
      // the user's favorites' recommendation set. The scorer rewards these.
      const boostedIds = new Set()

      // Explicit mode = the user gave a direct signal ("feel like Heat",
      // theme = heist). When true, we tighten the pool so first picks honor
      // that signal instead of being diluted by broad discover results.
      const explicitMode = !!similarTo?.id || pickedThemes.size > 0
      // Strict mode = first round (no Pick again yet) AND explicit. Subsequent
      // rounds can widen to keep variety — but the first three cards stay
      // tightly aligned with what the user explicitly asked for.
      const strictMode = explicitMode && round === 0

      // [#3] Similar-to reference: pull 2 pages of recommendations so the
      // pool is dominated by movies adjacent to the user's pick.
      if (similarTo?.id) {
        const [recs1, recs2] = await Promise.all([
          getMovieRecommendations(similarTo.id, 1).catch(() => []),
          getMovieRecommendations(similarTo.id, 2).catch(() => []),
        ])
        for (const r of [...recs1, ...recs2]) {
          if ((r.rating ?? 0) >= HIGH_RATING_FLOOR) {
            pool.push(r)
            boostedIds.add(r.id)
          }
        }
      }

      // [#1] Auto-boost from user's top 3 favorited MOVIES — but ONLY when
      // they haven't been explicit. The user's library is great context for
      // a generic "pick something", but it would water down "feel like Heat".
      // After round 0 we re-enable it even in explicit mode for variety.
      if (!strictMode) {
        const topFavMovies = items
          .filter((i) => i.isFavorite && i.mediaType === 'movie')
          .slice(0, 3)
        if (topFavMovies.length > 0) {
          const recArrays = await Promise.all(
            topFavMovies.map((f) => getMovieRecommendations(f.id).catch(() => []))
          )
          for (const recs of recArrays) {
            for (const r of recs) {
              if ((r.rating ?? 0) >= HIGH_RATING_FLOOR) {
                pool.push(r)
                boostedIds.add(r.id)
              }
            }
          }
        }
      }

      // Discover query for variety. In strict-explicit mode we still run it
      // (it's already keyword/genre filtered) but only one page so similar-to
      // recommendations stay dominant.
      const pageA = Math.floor(Math.random() * 3) + 1
      const pageB = pageA + 3
      const discoverPages = strictMode
        ? [discoverMovies({ ...baseFilter, page: pageA })]
        : [discoverMovies({ ...baseFilter, page: pageA }),
           discoverMovies({ ...baseFilter, page: pageB })]
      const discoverResults = await Promise.all(discoverPages)
      for (const arr of discoverResults) pool.push(...arr)

      // Dedupe + skip seen/watched + ENFORCE rating floor client-side
      // (defense-in-depth — sometimes TMDb returns just-below-threshold items)
      const dedupe = new Set()
      pool = pool
        .filter((m) => (m.rating ?? 0) >= HIGH_RATING_FLOOR)
        .filter((m) => dedupe.has(m.id) ? false : (dedupe.add(m.id), true))
        .filter((m) => !watchedIds.has(m.id) && !seenIds.has(m.id))

      // If too few, widen OBSCURITY (vote_count) but never the rating floor
      if (pool.length < 3) {
        const relaxed = await discoverMovies({
          ...baseFilter,
          minRating: HIGH_RATING_FLOOR,   // unchanged
          minVoteCount: 100,              // smaller indie films too
          page: Math.floor(Math.random() * 4) + 1,
        })
        const extra = relaxed.filter((m) =>
          (m.rating ?? 0) >= HIGH_RATING_FLOOR &&
          !watchedIds.has(m.id) && !seenIds.has(m.id) && !pool.some((p) => p.id === m.id)
        )
        pool = [...pool, ...extra]
      }

      if (pool.length === 0) {
        // Exhausted every fresh match. We render a designed empty card
        // (ResultsView -> ExhaustedState) and clear the session memory so
        // the next Pick again is fully fresh.
        setSeenIds(new Set())
        setPicks([])
        setHasPicked(true)
        requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'smooth' }))
        return
      }

      // ── DETERMINISTIC SCORING (no random shuffle) ────────────────────
      // Every candidate is scored against:
      //   • top genres in user's favorites      (0-40)
      //   • mood genres for tonight             (0-25)
      //   • era preference                      (0-15)
      //   • rating quality                      (0-10)
      //   • boost: similar to favorites         (+12)
      //   • penalty: down-weighted genres       (-20 per hit)
      // Sort descending and take top 3. This is what makes picks feel
      // targeted instead of random.
      const ctx = {
        topGenres,
        moodGenres,
        era,
        dominantEra: tasteProfile?.dominantEra,
        downGenres,
        boostedIds,
        explicitMode,
      }
      const scored = pool
        .map((m) => ({ movie: m, score: scoreCandidate(m, ctx) }))
        .sort((a, b) => b.score - a.score)

      // Diversify primary genre — avoid 3 picks that are all the same genre.
      // We take the top-scoring movie unconditionally, then prefer movies
      // whose primary genre we haven't already used.
      const finalPicks = []
      const usedPrimary = new Set()
      for (const s of scored) {
        if (finalPicks.length >= 3) break
        const primary = s.movie.genreIds?.[0]
        if (finalPicks.length > 0 && primary && usedPrimary.has(primary)) continue
        finalPicks.push(s.movie)
        if (primary) usedPrimary.add(primary)
      }
      // If diversification left us short (rare — small pool), fill from score order.
      if (finalPicks.length < 3) {
        for (const s of scored) {
          if (finalPicks.length >= 3) break
          if (!finalPicks.find((p) => p.id === s.movie.id)) finalPicks.push(s.movie)
        }
      }

      setPicks(finalPicks)
      setTopScore(Math.round(scored[0]?.score ?? 0))
      setSeenIds((prev) => {
        const next = new Set(prev)
        for (const m of finalPicks) next.add(m.id)
        return next
      })
      setSortIdx((i) => i + 1)
      setRound((r) => r + 1)
      setHasPicked(true)

      requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'smooth' }))
    } catch (err) {
      setError(err.message || 'Something went wrong picking movies.')
    } finally {
      setLoading(false)
    }
  }

  function reset() {
    setMoods([]); setOccasion(null); setEra('any'); setLength('any')
    setPace(50); setAvoidIds(new Set()); setPickedThemes(new Set())
    setLanguages(new Set()); setPrompt(''); setSimilarTo(null)
    setSimilarQuery(''); setSimilarResults([])
    setSeenIds(new Set()); setDownGenres({}); setSortIdx(0); setRound(0)
    setHasPicked(false); setPicks(null); setTopScore(null); setError(null)
    try { sessionStorage.removeItem(SESSION_KEY) } catch {}
  }

  // [#7] "Show me less" — dismiss a card, down-weight its genres
  function dismissPick(pick) {
    setPicks((prev) => prev?.filter((p) => p.id !== pick.id))
    setSeenIds((prev) => new Set(prev).add(pick.id))
    setDownGenres((prev) => {
      const next = { ...prev }
      for (const gid of (pick.genreIds || []).slice(0, 2)) {
        next[gid] = (next[gid] || 0) + 1
      }
      return next
    })
  }

  // Quick summary of what's active in the optional section
  const advancedSummary = useMemo(() => {
    const parts = []
    if (era !== 'any')     parts.push(ERAS.find((e) => e.value === era)?.label)
    if (length !== 'any')  parts.push(LENGTHS.find((l) => l.value === length)?.label)
    if (avoidIds.size)     parts.push(`-${avoidIds.size}`)
    if (pickedThemes.size) parts.push(`+${pickedThemes.size} themes`)
    if (languages.size)    parts.push(`${languages.size} langs`)
    if (similarTo)         parts.push(`like ${similarTo.title}`)
    if (prompt.trim())     parts.push('custom prompt')
    if (pace !== 50)       parts.push(pace < 50 ? 'slow' : 'fast')
    return parts.join(' · ')
  }, [era, length, avoidIds, pickedThemes, languages, similarTo, prompt, pace])

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <header className="text-center mb-6">
        <div className="text-[11px] font-bold tracking-[0.3em] text-brand uppercase mb-2 flex items-center justify-center gap-3">
          <span className="h-px w-8 bg-brand/40" />
          AI PICK
          <span className="h-px w-8 bg-brand/40" />
        </div>
        <h1 className="font-display text-4xl sm:text-5xl tracking-[0.02em] mb-1">
          What should I watch?
        </h1>
        <p className="text-sm text-neutral-500 dark:text-white/60">
          Two quick questions — or dial it in.
        </p>
      </header>

      <AnimatePresence mode="wait">
        {hasPicked ? (
          <ResultsView
            key="results"
            picks={picks}
            loading={loading}
            round={round}
            moods={moods}
            occasion={occasion}
            occasionLabel={OCCASIONS.find((o) => o.value === occasion)?.label}
            seenCount={seenIds.size}
            tasteProfile={tasteProfile}
            topScore={topScore}
            topGenres={topGenres}
            onPickAgain={generate}
            onReset={reset}
            onDismiss={dismissPick}
          />
        ) : loading ? (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center py-16">
            <PickLoader />
            <motion.p
              className="text-neutral-500 dark:text-white/60 mt-6"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.6, repeat: Infinity }}
            >
              Finding tonight's pick<ThinkingDots />
            </motion.p>
          </motion.div>
        ) : (
          <motion.section key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">

            <VibePanel
              moods={moods}
              occasion={occasion}
              toggleMood={toggleMood}
              setOccasion={setOccasion}
            />

            <FineTuneToggle open={advancedOpen} summary={advancedSummary} onToggle={() => setAdvancedOpen((v) => !v)}>
              <FineTune
                era={era} setEra={setEra}
                length={length} setLength={setLength}
                avoidIds={avoidIds} setAvoidIds={setAvoidIds}
                pickedThemes={pickedThemes} setPickedThemes={setPickedThemes}
                languages={languages} setLanguages={setLanguages}
                pace={pace} setPace={setPace}
                prompt={prompt} setPrompt={setPrompt}
                similarTo={similarTo} setSimilarTo={setSimilarTo}
                similarQuery={similarQuery} setSimilarQuery={setSimilarQuery}
                similarResults={similarResults}
                similarOpen={similarOpen} setSimilarOpen={setSimilarOpen}
              />
            </FineTuneToggle>

            {/* [#1] Library taste transparency */}
            {tasteProfile && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center text-xs text-neutral-500 dark:text-white/50"
              >
                Tuning to your taste — {tasteProfile.totalFavs} favorites,{' '}
                {tasteProfile.dominantEra ? `mostly ${tasteProfile.dominantEra}` : 'mixed eras'}
                {tasteProfile.avgRating ? `, average rating ${tasteProfile.avgRating}` : ''}
                {topGenres.length > 0 && (
                  <> · favors{' '}
                    <span className="text-brand">
                      {topGenres.slice(0, 3).map((id) => GENRE_NAMES[id]).filter(Boolean).join(', ')}
                    </span>
                  </>
                )}
                .
              </motion.div>
            )}

            {error && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-300 text-sm text-center"
              >
                {error}
              </motion.div>
            )}

            <AnimatePresence>
              {moods.length > 0 && occasion && (
                <motion.div
                  initial={{ opacity: 0, y: 12, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 12 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                  className="text-center pt-2"
                >
                  <motion.button
                    onClick={generate}
                    whileHover={{ scale: 1.05, boxShadow: '0 12px 50px -10px rgba(212,175,55,0.7)' }}
                    whileTap={{ scale: 0.97 }}
                    className="px-10 py-3.5 rounded-full text-base font-semibold bg-gradient-to-br from-brand via-brand to-brand-light text-black shadow-xl shadow-brand/40 transition-shadow"
                  >
                    Find me something
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

// ───────────────────────────────────────────────────────────────────────
//  ──── Subcomponents ─────────────────────────────────────────────────
// ───────────────────────────────────────────────────────────────────────

// Unified Mood + Occasion panel. Replaces two separate numbered cards with
// one continuous surface so the "set the vibe" decision feels like a single
// thought instead of a stepped form. Live elements:
//   • pulsing brand-gold "live" dot in the header
//   • two ambient drifting glow blobs in the background (slow, ~14s loops)
//   • a 2-dot progress strip on the right of the header
//   • a real-time tagline in the divider that updates as you choose
//     ("tonight: intense + first date") with smooth in/out transitions
function VibePanel({ moods, occasion, toggleMood, setOccasion }) {
  // Compact label for the live preview: first word of each mood label.
  const moodWords = MOODS
    .filter((m) => moods.includes(m.value))
    .map((m) => m.label.split(/\s*\/\s*/)[0].toLowerCase())
  const occLabel = OCCASIONS.find((o) => o.value === occasion)?.label?.toLowerCase() || null
  const livePreview = moodWords.length > 0 && occLabel
    ? `${moodWords.join(' + ')} · ${occLabel}`
    : null

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="relative p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-white/[0.04] via-white/[0.02] to-transparent border border-white/10 shadow-2xl shadow-black/30 overflow-hidden"
    >
      {/* Ambient drifting glow — subtle, never distracting */}
      <motion.div
        aria-hidden
        className="absolute -top-28 -right-28 w-72 h-72 bg-brand/[0.12] rounded-full blur-3xl pointer-events-none"
        animate={{ x: [0, 25, 0], y: [0, 12, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        aria-hidden
        className="absolute -bottom-28 -left-28 w-72 h-72 bg-brand/[0.06] rounded-full blur-3xl pointer-events-none"
        animate={{ x: [0, -18, 0], y: [0, -12, 0] }}
        transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Header — live dot + title + progress */}
      <div className="relative flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <span className="relative flex w-2.5 h-2.5">
            <motion.span
              aria-hidden
              className="absolute inset-0 rounded-full bg-brand"
              animate={{ scale: [1, 2.4, 1], opacity: [0.65, 0, 0.65] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
            />
            <span className="relative w-2.5 h-2.5 rounded-full bg-brand shadow-[0_0_10px_rgba(212,175,55,0.7)]" />
          </span>
          <h2 className="text-[11px] font-bold tracking-[0.25em] uppercase text-brand">
            Set the vibe
          </h2>
        </div>
        <div className="flex items-center gap-1.5" aria-label="progress">
          <ProgressDot active={moods.length > 0} />
          <ProgressDot active={!!occasion} />
        </div>
      </div>

      {/* Mood sub-section */}
      <div className="relative">
        <div className="flex items-baseline justify-between mb-2.5">
          <h3 className="text-sm sm:text-base font-bold">Mood</h3>
          <span className="text-[10px] text-neutral-500 dark:text-white/40 tracking-[0.15em] uppercase">
            pick up to 2
          </span>
        </div>
        <MultiChips options={MOODS} values={moods} onToggle={toggleMood} max={2} />
      </div>

      {/* Live connection divider — the "feel" of the choice in one line */}
      <div className="relative my-5 flex items-center gap-3">
        <span className="h-px flex-1 bg-gradient-to-r from-transparent via-white/15 to-transparent" />
        <AnimatePresence mode="wait">
          {livePreview ? (
            <motion.span
              key={livePreview}
              initial={{ opacity: 0, y: 4, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.94 }}
              transition={{ duration: 0.28, ease: 'easeOut' }}
              className="text-[10px] font-bold tracking-[0.18em] uppercase text-brand whitespace-nowrap"
            >
              tonight: {livePreview}
            </motion.span>
          ) : (
            <motion.span
              key="waiting"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="text-[10px] tracking-[0.18em] uppercase text-neutral-400 dark:text-white/30 whitespace-nowrap"
            >
              {moods.length === 0 ? 'pick a mood…' : 'and an occasion'}
            </motion.span>
          )}
        </AnimatePresence>
        <span className="h-px flex-1 bg-gradient-to-r from-transparent via-white/15 to-transparent" />
      </div>

      {/* Occasion sub-section */}
      <div className="relative">
        <div className="flex items-baseline justify-between mb-2.5">
          <h3 className="text-sm sm:text-base font-bold">Occasion</h3>
          <span className="text-[10px] text-neutral-500 dark:text-white/40 tracking-[0.15em] uppercase">
            what's tonight?
          </span>
        </div>
        <Chips options={OCCASIONS} value={occasion} onSelect={setOccasion} />
      </div>
    </motion.div>
  )
}

// Small filled circle that springs from grey -> brand when its step is done.
function ProgressDot({ active }) {
  return (
    <motion.span
      animate={active ? { scale: [1, 1.4, 1] } : { scale: 1 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      className={`block w-1.5 h-1.5 rounded-full transition-colors ${
        active ? 'bg-brand shadow-[0_0_8px_rgba(212,175,55,0.7)]' : 'bg-white/15'
      }`}
    />
  )
}

function Chips({ options, value, onSelect }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const active = value === opt.value
        return (
          <motion.button
            key={opt.value}
            onClick={() => onSelect(opt.value)}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.95 }}
            className={`px-3.5 py-2 rounded-full text-sm font-medium transition-colors ${
              active
                ? 'bg-brand text-black border border-brand shadow-md shadow-brand/30'
                : 'bg-white/[0.04] hover:bg-white/10 border border-white/10 text-neutral-700 dark:text-white/80'
            }`}
          >
            {opt.label}
          </motion.button>
        )
      })}
    </div>
  )
}

function MultiChips({ options, values, onToggle, max = 2 }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const active = values.includes(opt.value)
        const atMax = values.length >= max && !active
        return (
          <motion.button
            key={opt.value}
            onClick={() => onToggle(opt.value)}
            whileHover={{ scale: atMax ? 1 : 1.03 }}
            whileTap={{ scale: 0.95 }}
            className={`px-3.5 py-2 rounded-full text-sm font-medium transition-colors ${
              active
                ? 'bg-brand text-black border border-brand shadow-md shadow-brand/30'
                : atMax
                ? 'bg-white/[0.02] border border-white/5 text-neutral-500 dark:text-white/30 cursor-not-allowed'
                : 'bg-white/[0.04] hover:bg-white/10 border border-white/10 text-neutral-700 dark:text-white/80'
            }`}
          >
            {opt.label}
          </motion.button>
        )
      })}
    </div>
  )
}

function FineTuneToggle({ open, summary, onToggle, children }) {
  return (
    <div>
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-3 px-5 py-3 rounded-2xl bg-gradient-to-r from-white/[0.03] to-white/[0.01] dark:from-white/[0.04] dark:to-white/[0.02] border border-white/10 hover:border-brand/40 transition text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-brand">
              <line x1="3" y1="6" x2="14" y2="6"/><circle cx="18" cy="6" r="2"/>
              <line x1="3" y1="12" x2="8" y2="12"/><circle cx="12" cy="12" r="2"/><line x1="16" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="18" x2="16" y2="18"/><circle cx="20" cy="18" r="2"/>
            </svg>
          </span>
          <div className="min-w-0">
            <div className="text-sm font-semibold">Fine-tune (optional)</div>
            <div className="text-[11px] text-neutral-500 dark:text-white/50 truncate">
              {summary || 'Reference movie, themes, languages, era, length, pace, prompts'}
            </div>
          </div>
        </div>
        <motion.span animate={{ rotate: open ? 180 : 0 }} className="text-xs text-neutral-500 dark:text-white/50">▾</motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="mt-3 p-5 rounded-2xl space-y-5 bg-gradient-to-br from-white/[0.04] to-transparent border border-white/10">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function FineTune(props) {
  const {
    era, setEra, length, setLength,
    avoidIds, setAvoidIds, pickedThemes, setPickedThemes,
    languages, setLanguages, pace, setPace,
    prompt, setPrompt, similarTo, setSimilarTo,
    similarQuery, setSimilarQuery, similarResults,
    similarOpen, setSimilarOpen,
  } = props

  function toggleAvoid(id) { setAvoidIds((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n }) }
  function toggleTheme(name) { setPickedThemes((s) => { const n = new Set(s); n.has(name) ? n.delete(name) : n.add(name); return n }) }
  function toggleLang(code) { setLanguages((s) => { const n = new Set(s); n.has(code) ? n.delete(code) : n.add(code); return n }) }

  const inputRef = useRef(null)

  return (
    <>
      {/* [#3] Similar to */}
      <Row label="Make it feel like…">
        <div className="relative">
          {similarTo ? (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand/15 border border-brand/40 text-sm text-brand">
              {similarTo.title}
              <button onClick={() => { setSimilarTo(null); setSimilarQuery('') }} className="text-brand/70 hover:text-brand">×</button>
            </div>
          ) : (
            <input
              ref={inputRef}
              type="text"
              value={similarQuery}
              onChange={(e) => setSimilarQuery(e.target.value)}
              onFocus={() => setSimilarOpen(true)}
              onBlur={() => setTimeout(() => setSimilarOpen(false), 150)}
              placeholder="Type a movie you love…"
              className="w-full sm:max-w-sm px-3.5 py-2 rounded-full text-sm bg-white/[0.04] border border-white/10 placeholder:text-white/30 focus:outline-none focus:border-brand transition"
            />
          )}
          {similarOpen && similarResults.length > 0 && !similarTo && (
            <div className="absolute z-20 mt-1 w-full sm:max-w-sm rounded-xl bg-neutral-900 border border-white/10 shadow-xl overflow-hidden">
              {similarResults.map((m) => (
                <button
                  key={m.id}
                  onMouseDown={() => { setSimilarTo({ id: m.id, title: m.title }); setSimilarQuery(''); setSimilarOpen(false) }}
                  className="w-full flex items-center gap-3 px-3 py-2 hover:bg-white/5 text-left transition"
                >
                  {m.posterUrl && <img src={m.posterUrl} alt="" className="w-8 h-12 object-cover rounded" />}
                  <span className="text-sm flex-1 min-w-0 truncate">{m.title}</span>
                  {m.year && <span className="text-xs text-white/50">{m.year}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </Row>

      {/* [#2] Free-text prompt */}
      <Row label="Or describe the vibe in your own words">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={2}
          placeholder='e.g. "a chill movie about food" or "twisty thriller, not too violent"'
          className="w-full px-3.5 py-2 rounded-xl text-sm bg-white/[0.04] border border-white/10 placeholder:text-white/30 focus:outline-none focus:border-brand transition resize-none"
        />
      </Row>

      {/* [#4] Themes — grouped by intent so users can scan in seconds */}
      <Row label={`Themes${pickedThemes.size > 0 ? `  ·  ${pickedThemes.size} picked` : ''}`}>
        <div className="space-y-2.5">
          {THEME_GROUPS.map((g) => (
            <div key={g.group}>
              <div className="text-[9px] font-bold tracking-[0.22em] uppercase text-neutral-400 dark:text-white/30 mb-1.5">
                {g.group}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {g.items.map((t) => {
                  const active = pickedThemes.has(t)
                  return (
                    <motion.button key={t} onClick={() => toggleTheme(t)}
                      whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.94 }}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                        active
                          ? 'bg-brand text-black border border-brand shadow-md shadow-brand/30'
                          : 'bg-white/[0.04] hover:bg-white/10 border border-white/10 text-neutral-700 dark:text-white/70'
                      }`}
                    >
                      #{t.replace(/ /g, '-')}
                    </motion.button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </Row>

      {/* [#8] International */}
      <Row label="International cinema">
        <div className="flex flex-wrap gap-2">
          {LANGUAGES.map((l) => {
            const active = languages.has(l.code)
            return (
              <motion.button key={l.code} onClick={() => toggleLang(l.code)}
                whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.94 }}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  active
                    ? 'bg-brand text-black border border-brand'
                    : 'bg-white/[0.04] hover:bg-white/10 border border-white/10 text-neutral-700 dark:text-white/70'
                }`}
              >
                {l.label}
              </motion.button>
            )
          })}
        </div>
      </Row>

      {/* [#9] Pace slider */}
      <Row label="Pace">
        <div className="flex items-center gap-3">
          <span className="text-xs text-neutral-500 dark:text-white/50 w-16 text-right">slow burn</span>
          <input
            type="range" min="0" max="100" step="5" value={pace}
            onChange={(e) => setPace(Number(e.target.value))}
            className="flex-1 accent-brand"
          />
          <span className="text-xs text-neutral-500 dark:text-white/50 w-16">fast-paced</span>
        </div>
      </Row>

      {/* Era / Length / Avoid */}
      <Row label="Era">
        <SmallChips options={ERAS} value={era} onSelect={setEra} />
      </Row>
      <Row label="Length">
        <SmallChips options={LENGTHS} value={length} onSelect={setLength} />
      </Row>
      <Row label="Avoid">
        <div className="flex flex-wrap gap-2">
          {AVOID_OPTIONS.map((opt) => {
            const active = avoidIds.has(opt.id)
            return (
              <motion.button key={opt.id} onClick={() => toggleAvoid(opt.id)}
                whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.94 }}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  active
                    ? 'bg-red-500/20 text-red-300 border border-red-500/40 line-through'
                    : 'bg-white/[0.04] hover:bg-white/10 border border-white/10 text-neutral-700 dark:text-white/70'
                }`}
              >
                {opt.label}
              </motion.button>
            )
          })}
        </div>
      </Row>
    </>
  )
}

function Row({ label, children }) {
  return (
    <div className="space-y-1.5">
      <div className="text-[11px] font-bold tracking-wider uppercase text-neutral-500 dark:text-white/40">{label}</div>
      {children}
    </div>
  )
}

function SmallChips({ options, value, onSelect }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const active = value === opt.value
        return (
          <motion.button key={opt.value} onClick={() => onSelect(opt.value)}
            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.94 }}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              active ? 'bg-brand text-black border border-brand shadow-md shadow-brand/30'
                     : 'bg-white/[0.04] hover:bg-white/10 border border-white/10 text-neutral-700 dark:text-white/70'
            }`}>
            {opt.label}
          </motion.button>
        )
      })}
    </div>
  )
}

function ResultsView({ picks, loading, round, moods, occasion, occasionLabel, seenCount, tasteProfile, topScore, topGenres, onPickAgain, onReset, onDismiss }) {
  const topGenreLabels = (topGenres || [])
    .slice(0, 3)
    .map((id) => GENRE_NAMES[id])
    .filter(Boolean)
  // Only show the "Top match" / taste line when we have real picks on screen.
  const showScoreLine = picks?.length > 0 && (tasteProfile || topScore != null)
  return (
    <motion.section
      key="results"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
    >
      <p className="text-center mb-3 text-sm text-neutral-500 dark:text-white/60">
        For a <strong>{moods.join(' + ')}</strong> watch ({occasionLabel?.toLowerCase()}):
      </p>
      {showScoreLine && (
        <div className="mb-6">
          {topScore != null && <ScoreBar score={topScore} />}
          {(tasteProfile || topGenreLabels.length > 0) && (
            <p className="text-center mt-2 text-[11px] text-neutral-400 dark:text-white/40">
              {tasteProfile && <>Tuned to your taste · {tasteProfile.totalFavs} favorites</>}
              {topGenreLabels.length > 0 && (
                <> · weights {topGenreLabels.join(', ')}</>
              )}
            </p>
          )}
        </div>
      )}

      {/* Container stays grid + min-height across all three states (loading
          skeletons, real picks, exhausted card) so transitioning between
          them doesn't reflow the page. The exhausted card spans all 3 cols. */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4 max-w-2xl mx-auto min-h-[280px]">
        <AnimatePresence mode="wait">
          {loading ? (
            [0, 1, 2].map((i) => <SkeletonPickCard key={`skel-${round}-${i}`} index={i} />)
          ) : picks?.length === 0 ? (
            <div key="exhausted" className="sm:col-span-3 flex items-center justify-center">
              <ExhaustedState />
            </div>
          ) : picks?.length > 0 ? (
            picks.map((pick, idx) => (
              <motion.div
                key={`pick-${round}-${pick.id}`}
                initial={{ opacity: 0, y: 24, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -16, scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 320, damping: 28, delay: idx * 0.06 }}
                className="text-center relative group will-change-transform"
              >
                {/* [#7] Dismiss button */}
                <button
                  onClick={() => onDismiss(pick)}
                  title="Show me less like this"
                  className="absolute -top-2 -right-2 z-10 w-7 h-7 rounded-full bg-neutral-900/90 hover:bg-red-500 text-white text-sm border border-white/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow-lg"
                >
                  ×
                </button>

                <MediaCard {...pick} />

                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.18 + idx * 0.06, duration: 0.22 }}
                  className="mt-2 flex flex-wrap justify-center gap-1 px-0.5"
                >
                  {tagsFor(pick, moods, occasion).map((tag) => (
                    <span key={tag} className="text-[9px] sm:text-[10px] font-medium text-brand bg-brand/10 border border-brand/20 px-1.5 py-0.5 rounded-full leading-none whitespace-nowrap">
                      #{tag}
                    </span>
                  ))}
                </motion.div>
                <motion.p
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.26 + idx * 0.06, duration: 0.24 }}
                  className="mt-1.5 text-[10px] sm:text-[11px] text-neutral-600 dark:text-white/70 leading-snug px-0.5 line-clamp-2"
                >
                  {reasonFor(pick, moods, occasionLabel)}
                </motion.p>
              </motion.div>
            ))
          ) : null}
        </AnimatePresence>
      </div>

      <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-1">
        <motion.button onClick={onPickAgain} disabled={loading}
          whileHover={loading ? {} : { scale: 1.04 }} whileTap={loading ? {} : { scale: 0.96 }}
          className="px-5 py-2.5 rounded-full bg-brand hover:bg-brand-light text-black font-semibold text-sm transition disabled:opacity-60 disabled:cursor-wait shadow-lg shadow-brand/30 flex items-center gap-2"
        >
          {loading ? (<><Spinner /> Picking…</>) : 'Pick again'}
        </motion.button>
        <motion.button onClick={onReset} disabled={loading}
          whileHover={loading ? {} : { scale: 1.04 }} whileTap={loading ? {} : { scale: 0.96 }}
          className="px-5 py-2.5 rounded-full bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 border border-black/10 dark:border-white/10 text-sm transition disabled:opacity-50"
        >
          Start over
        </motion.button>
      </div>

      {picks?.length > 0 && seenCount > 0 && (
        <p className="text-center text-[11px] text-neutral-400 dark:text-white/40">
          {seenCount} {seenCount === 1 ? 'movie' : 'movies'} excluded from future picks this session.
        </p>
      )}
    </motion.section>
  )
}

function SkeletonPickCard({ index = 0 }) {
  const titleW = ['78%', '85%', '62%'][index % 3]
  const yearW  = ['38%', '45%', '32%'][index % 3]
  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -16, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 220, damping: 22, delay: index * 0.12 }}
      className="text-center"
    >
      <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-gradient-to-br from-neutral-200 to-neutral-300 dark:from-neutral-800 dark:to-neutral-900 ring-1 ring-black/5 dark:ring-white/5">
        <div className="absolute inset-0 bg-gradient-to-br from-brand/10 via-transparent to-brand/5" />
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-brand/30 to-transparent"
          style={{ transform: 'skewX(-12deg)' }}
          animate={{ x: ['-120%', '120%'] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut', delay: index * 0.25 }}
        />
        <div className="absolute top-2 left-2 h-4 w-12 rounded-md bg-black/40" />
        <div className="absolute top-2 right-2 h-4 w-10 rounded-md bg-brand/50" />
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
        <div className="absolute inset-x-3 bottom-3 space-y-1.5">
          <div className="h-2.5 rounded-full bg-white/70" style={{ width: titleW }} />
          <div className="h-1.5 rounded-full bg-white/50" style={{ width: yearW }} />
        </div>
      </div>
    </motion.div>
  )
}

// Live colour-graded score bar shown above the picks. The fill width AND
// colour BOTH tween smoothly when topScore changes from one round to the
// next, so re-picking feels reactive rather than a flat number swap.
// Score → hue: 0=red, 60=yellow, 120=green (HSL is naturally a gradient).
function scoreToColor(score) {
  const clamped = Math.max(0, Math.min(100, score))
  const hue = (clamped / 100) * 120
  return `hsl(${hue}, 80%, 55%)`
}

function ScoreBar({ score }) {
  const color = scoreToColor(score)
  const label = score >= 80 ? 'Stellar'
              : score >= 60 ? 'Strong'
              : score >= 40 ? 'Solid'
              : 'Warm-up'
  return (
    <div className="flex items-center justify-center gap-3">
      {/* Label — color-matched, with a soft glow */}
      <motion.span
        className="text-[10px] font-bold tracking-[0.2em] uppercase whitespace-nowrap hidden sm:inline"
        animate={{ color, textShadow: `0 0 10px ${color}80` }}
        transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
      >
        Top match
      </motion.span>

      {/* Bar */}
      <div className="relative h-2 w-40 sm:w-56 rounded-full bg-white/10 overflow-hidden ring-1 ring-white/5">
        {/* faint full-range gradient hint so an empty bar still reads as red→green */}
        <div
          aria-hidden
          className="absolute inset-0 rounded-full opacity-30"
          style={{ background: 'linear-gradient(90deg, hsl(0,80%,55%), hsl(60,80%,55%), hsl(120,80%,55%))' }}
        />
        {/* coloured fill — animates both width AND colour when score changes */}
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full"
          initial={{ width: 0, backgroundColor: 'hsl(0,80%,55%)' }}
          animate={{
            width: `${score}%`,
            backgroundColor: color,
            boxShadow: `0 0 12px ${color}`,
          }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
        />
        {/* traveling shimmer on top of the fill, starts after fill lands */}
        <motion.div
          aria-hidden
          className="absolute inset-y-0 left-0 w-1/3 pointer-events-none"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.45), transparent)' }}
          initial={{ x: '-100%' }}
          animate={{ x: ['-50%', '250%'] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut', delay: 1.0 }}
        />
      </div>

      {/* Number — same colour as the bar */}
      <motion.span
        className="text-xs font-bold tabular-nums whitespace-nowrap"
        animate={{ color }}
        transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
      >
        {score}<span className="text-neutral-400 dark:text-white/40 font-normal">/100</span>
        <span className="hidden sm:inline ml-1.5 text-[10px] tracking-wider uppercase opacity-80">· {label}</span>
      </motion.span>
    </div>
  )
}

// Rendered inside ResultsView when the candidate pool is exhausted.
// The session memory has just been cleared, so "Pick again" gives a clean slate.
function ExhaustedState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 200, damping: 22 }}
      className="relative mx-auto max-w-md text-center px-8 py-12 rounded-3xl overflow-hidden bg-gradient-to-br from-white/[0.05] via-white/[0.02] to-transparent border border-white/10 shadow-2xl shadow-black/30"
    >
      {/* Decorative glow blobs */}
      <div className="absolute -top-16 -right-16 w-48 h-48 bg-brand/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-brand/10 rounded-full blur-3xl pointer-events-none" />

      {/* Brand-gold rings + check medallion */}
      <div className="relative inline-flex items-center justify-center w-20 h-20 mb-5">
        <motion.div
          className="absolute inset-0 rounded-full border border-brand/40"
          animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0, 0.6] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute inset-2 rounded-full border border-brand/30"
          animate={{ scale: [1, 1.1, 1], opacity: [0.4, 0, 0.4] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
        />
        <div className="relative w-12 h-12 rounded-full flex items-center justify-center bg-gradient-to-br from-brand to-brand-dark shadow-lg shadow-brand/40 ring-2 ring-brand/30">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-black">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      </div>

      {/* Header divider */}
      <div className="text-[10px] font-bold tracking-[0.3em] text-brand uppercase mb-2 flex items-center justify-center gap-3">
        <span className="h-px w-6 bg-brand/40" />
        That's all
        <span className="h-px w-6 bg-brand/40" />
      </div>

      <h3 className="font-display text-2xl tracking-[0.02em] mb-2">
        You've seen the best matches
      </h3>
      <p className="text-sm text-neutral-500 dark:text-white/60 leading-relaxed">
        Every high-rated pick for this vibe has been shown. Memory cleared —
        hit <span className="text-brand font-semibold">Pick again</span> for a fresh round,
        or <span className="text-brand font-semibold">Start over</span> with a different mood.
      </p>
    </motion.div>
  )
}

function Spinner({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <motion.path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"
        animate={{ rotate: 360 }} transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
        style={{ transformOrigin: '12px 12px' }} />
    </svg>
  )
}

function PickLoader() {
  return (
    <div className="relative inline-flex items-center justify-center w-28 h-28">
      <motion.div className="absolute inset-0 rounded-full border-2 border-brand/30"
        animate={{ scale: [1, 1.1, 1], opacity: [0.4, 0.1, 0.4] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }} />
      <motion.div className="absolute inset-3 rounded-full"
        style={{ background: 'conic-gradient(from 0deg, transparent 0deg, transparent 270deg, rgba(212,175,55,0.85) 360deg)', maskImage: 'radial-gradient(transparent 55%, black 56%)', WebkitMaskImage: 'radial-gradient(transparent 55%, black 56%)' }}
        animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }} />
      <div className="relative flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <motion.span key={i} className="w-2 h-2 rounded-full bg-brand"
            animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.15 }} />
        ))}
      </div>
    </div>
  )
}

function ThinkingDots() {
  return (
    <span className="inline-flex ml-0.5">
      {[0, 1, 2].map((i) => (
        <motion.span key={i} animate={{ opacity: [0.2, 1, 0.2] }} transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}>.</motion.span>
      ))}
    </span>
  )
}

export default PickPage
