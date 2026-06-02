// ──────────────────────────────────────────────────────────────────────
// TMDb API helper
//
// All TMDb calls go through this file so the rest of the app doesn't
// need to know about URLs, tokens, or response shapes.
// ──────────────────────────────────────────────────────────────────────

// Vite exposes environment variables that start with VITE_ to the browser.
// .replace(/\s+/g, '') strips ALL whitespace anywhere in the string — spaces,
// tabs, AND newlines. Tokens shouldn't contain whitespace, so this is safe.
// HTTP header values can't contain CR/LF — fetch() throws "Invalid value"
// if they do, which can happen when a long token is pasted into env var UIs.
const RAW_TOKEN = import.meta.env.VITE_TMDB_TOKEN
const TOKEN = typeof RAW_TOKEN === 'string' ? RAW_TOKEN.replace(/\s+/g, '') : ''

const BASE_URL = 'https://api.themoviedb.org/3'
const IMAGE_BASE      = 'https://image.tmdb.org/t/p/w500'  // 500px-wide posters
const BACKDROP_BASE   = 'https://image.tmdb.org/t/p/original' // full-bleed hero backdrops

// Shared fetch wrapper — adds auth header, parses JSON, throws on errors.
async function tmdbFetch(path) {
  if (!TOKEN) {
    throw new Error(
      'Missing VITE_TMDB_TOKEN. Create .env.local in the project root with:\n' +
      'VITE_TMDB_TOKEN=your_token_here\n' +
      'then restart the dev server.'
    )
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: 'application/json',
    },
  })

  if (!res.ok) {
    throw new Error(`TMDb error ${res.status}: ${res.statusText}`)
  }

  return res.json()
}

// ──────────────────────────────────────────────────────────────────────
// Normalize a TMDb result.
// Movies have `title` + `release_date`; TV shows have `name` + `first_air_date`.
// We squash both into one shape so MediaCard doesn't care which it got.
// ──────────────────────────────────────────────────────────────────────
function normalize(item) {
  const isTv = item.media_type === 'tv'
  const dateStr = isTv ? item.first_air_date : item.release_date
  const year = dateStr ? Number(dateStr.slice(0, 4)) : null

  return {
    id: item.id,
    title: isTv ? item.name : item.title,
    overview: item.overview,
    year,
    mediaType: item.media_type,                                  // 'movie' | 'tv'
    posterUrl:   item.poster_path   ? `${IMAGE_BASE}${item.poster_path}`     : null,
    backdropUrl: item.backdrop_path ? `${BACKDROP_BASE}${item.backdrop_path}` : null,
    // TMDb gives a 0–10 score; round to 1 decimal for display.
    rating: typeof item.vote_average === 'number'
      ? Math.round(item.vote_average * 10) / 10
      : null,
    // Preserve genre ids (returned by /discover and most list endpoints) so
    // downstream features (Pick tags, smart filters) can map them to names.
    genreIds: Array.isArray(item.genre_ids) ? item.genre_ids : [],
  }
}

// Public functions used by the rest of the app.

// Upcoming theatrical releases. Returns normalized items + raw release_date
// so the UI can show "Jun 5" style date labels.
export async function getUpcomingMovies(region = 'US') {
  const data = await tmdbFetch(`/movie/upcoming?region=${region}`)
  return (data.results ?? [])
    .filter((m) => m.backdrop_path)   // skip items without a usable hero image
    .map((m) => ({
      ...normalize({ ...m, media_type: 'movie' }),
      releaseDate: m.release_date,
    }))
}

// ── Smart pick recommendations ────────────────────────────────────────
// TMDb /discover/movie with our filter set. Lets us recommend by
// mood (genre), available time (runtime), and family-friendliness.
// See https://developer.themoviedb.org/reference/discover-movie for params.
// Look up a TMDb keyword id by its name. Returns null if not found.
// Used by the Pick page to convert theme labels into discover-compatible ids.
export async function findKeywordId(name) {
  try {
    const data = await tmdbFetch(`/search/keyword?query=${encodeURIComponent(name)}`)
    return data.results?.[0]?.id ?? null
  } catch {
    return null
  }
}

// Live-search TMDb keywords for autocomplete. Returns up to 10 matches as
// { id, name } pairs. The full TMDb keyword catalogue is ~30k entries, way
// more than our curated bank of 99 — this is what makes hashtags genuinely
// powerful instead of being limited to whatever we hardcoded.
export async function searchKeywords(query) {
  if (!query?.trim()) return []
  try {
    const data = await tmdbFetch(`/search/keyword?query=${encodeURIComponent(query)}`)
    return (data.results ?? []).slice(0, 10).map((k) => ({ id: k.id, name: k.name }))
  } catch {
    return []
  }
}

// Fetch the TMDb keywords attached to a movie OR a TV show. Used to bridge
// the "Make it feel like" choice into the Themes section ("Themes from
// Scavengers Reign: #dystopia #survival…") so the two inputs feed each other.
//
// TMDb is inconsistent: movies return { keywords: [...] }, TV returns
// { results: [...] }. Normalize both shapes here.
export async function getKeywords(mediaType, id) {
  try {
    const data = await tmdbFetch(`/${mediaType}/${id}/keywords`)
    const raw = data.keywords ?? data.results ?? []
    return raw.map((k) => ({ id: k.id, name: k.name }))
  } catch {
    return []
  }
}
export const getMovieKeywords = (id) => getKeywords('movie', id)

// Get TMDb "recommendations" for a single movie OR tv show. Used by the
// "Make it feel like ___" feature so the user can seed the picker with
// either kind of reference. Movie variant kept as a thin wrapper so old
// call sites don't break.
export async function getRecommendations(mediaType, id, page = 1) {
  const data = await tmdbFetch(`/${mediaType}/${id}/recommendations?page=${page}`)
  return (data.results ?? [])
    .filter((m) => m.poster_path)
    .map((m) => normalize({ ...m, media_type: mediaType }))
}
export const getMovieRecommendations = (id, page = 1) =>
  getRecommendations('movie', id, page)

export async function discoverMovies({
  genres = [],              // array of TMDb genre ids to include
  withoutGenres = [],       // array of TMDb genre ids to EXCLUDE
  keywords = [],            // array of TMDb keyword ids
  withLanguages = [],       // array of ISO-639-1 language codes (e.g. 'ko', 'ja', 'fr')
  runtimeMin,
  runtimeMax,
  minRating = 6.5,          // skip mediocre stuff
  minVoteCount = 200,       // skip obscure / unrated movies
  familyFriendly = false,   // limits to PG / lower MPAA where data exists
  releaseBefore,            // year — for "classic" mood
  releaseAfter,             // year — for "modern" mood
  sortBy = 'vote_average.desc',
  page = 1,
} = {}) {
  const params = new URLSearchParams()
  if (genres.length)               params.set('with_genres', genres.join(','))
  if (withoutGenres.length)        params.set('without_genres', withoutGenres.join(','))
  if (keywords.length)             params.set('with_keywords', keywords.join(','))
  if (withLanguages.length)        params.set('with_original_language', withLanguages.join('|'))
  if (Number.isFinite(runtimeMin)) params.set('with_runtime.gte', String(runtimeMin))
  if (Number.isFinite(runtimeMax)) params.set('with_runtime.lte', String(runtimeMax))
  if (Number.isFinite(releaseBefore)) params.set('primary_release_date.lte', `${releaseBefore}-12-31`)
  if (Number.isFinite(releaseAfter))  params.set('primary_release_date.gte', `${releaseAfter}-01-01`)
  params.set('vote_average.gte', String(minRating))
  params.set('vote_count.gte',   String(minVoteCount))
  params.set('sort_by', sortBy)
  params.set('page', String(page))
  if (familyFriendly) {
    params.set('certification_country', 'US')
    params.set('certification.lte', 'PG')
  }

  const data = await tmdbFetch(`/discover/movie?${params.toString()}`)
  return (data.results ?? [])
    .filter((m) => m.poster_path)
    .map((m) => normalize({ ...m, media_type: 'movie' }))
}

// Trending TV shows only for the week.
export async function getTrendingTv() {
  const data = await tmdbFetch('/trending/tv/week')
  return (data.results ?? [])
    .map((item) => normalize({ ...item, media_type: 'tv' }))
    .filter((i) => i.posterUrl)
}

// All-time top-rated movies (TMDb's curated list — the "IMDb Top 250" equivalent).
export async function getTopRatedMovies() {
  const data = await tmdbFetch('/movie/top_rated')
  return (data.results ?? [])
    .map((item) => normalize({ ...item, media_type: 'movie' }))
    .filter((i) => i.posterUrl)
}

// Trending movies + TV shows for the week (mixed).
export async function getTrending() {
  const data = await tmdbFetch('/trending/all/week')
  return data.results
    // multi endpoints sometimes include "person" — we only want movies/tv.
    .filter((item) => item.media_type === 'movie' || item.media_type === 'tv')
    .map(normalize)
}

// ── People (actors / crew) ────────────────────────────────────────────
// Profile photos use the same TMDb image base. w500 is generous for cards;
// the browser scales it down without quality loss.
function normalizePerson(p) {
  return {
    id:        p.id,
    name:      p.name,
    photoUrl:  p.profile_path ? `${IMAGE_BASE}${p.profile_path}` : null,
    knownFor:  p.known_for_department || 'Acting',
    knownForWorks: (p.known_for || [])
      .map((w) => w.title || w.name)
      .filter(Boolean)
      .slice(0, 3),
    popularity: p.popularity ?? 0,
  }
}

export async function getTrendingPeople() {
  const data = await tmdbFetch('/trending/person/week')
  return (data.results ?? []).map(normalizePerson)
}

// Popular people sorted by TMDb's all-time popularity score.
// Different from getTrendingPeople which is weekly trending — these are
// the household names regardless of what's in the news this week.
export async function getPopularPeople() {
  const data = await tmdbFetch('/person/popular')
  return (data.results ?? [])
    .filter((p) => p.profile_path)   // skip people without a photo
    .map(normalizePerson)
}

export async function searchPeople(query) {
  const data = await tmdbFetch(`/search/person?query=${encodeURIComponent(query)}`)
  return (data.results ?? []).map(normalizePerson)
}

// Person details + their full filmography in ONE request via append_to_response.
// Returns bio fields + a `credits` array of normalized MediaCard-compatible items
// (each with an extra `character` field).
export async function getPersonDetails(id) {
  const data = await tmdbFetch(`/person/${id}?append_to_response=combined_credits`)

  // Deduplicate by (mediaType, id) — TV series often appear multiple times
  // when the actor recurred across seasons.
  const seen = new Set()
  const credits = (data.combined_credits?.cast ?? [])
    .filter((c) => c.media_type === 'movie' || c.media_type === 'tv')
    .filter((c) => c.poster_path)
    .filter((c) => {
      const key = `${c.media_type}-${c.id}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .map((c) => {
      const isTv = c.media_type === 'tv'
      const dateStr = isTv ? c.first_air_date : c.release_date
      return {
        id:         c.id,
        title:      isTv ? c.name : c.title,
        year:       dateStr ? Number(dateStr.slice(0, 4)) : null,
        mediaType:  c.media_type,
        posterUrl:  c.poster_path ? `${IMAGE_BASE}${c.poster_path}` : null,
        rating:     typeof c.vote_average === 'number'
          ? Math.round(c.vote_average * 10) / 10
          : null,
        character:  c.character || '',
        popularity: c.popularity ?? 0,
      }
    })

  return {
    id:           data.id,
    name:         data.name,
    biography:    data.biography || '',
    birthday:     data.birthday || null,
    deathday:     data.deathday || null,
    placeOfBirth: data.place_of_birth || null,
    photoUrl:     data.profile_path ? `${IMAGE_BASE}${data.profile_path}` : null,
    knownFor:     data.known_for_department || 'Acting',
    credits,
  }
}

// Search across movies + TV shows. URL-encode the query so it handles spaces, symbols, etc.
export async function searchMulti(query) {
  const data = await tmdbFetch(`/search/multi?query=${encodeURIComponent(query)}`)
  return data.results
    .filter((item) => item.media_type === 'movie' || item.media_type === 'tv')
    .map(normalize)
}

// Fetch streaming/rent/buy availability per country.
// Response shape: { results: { 'US': { flatrate: [...], rent: [...], buy: [...] }, 'GE': {...}, ... } }
export async function getWatchProviders(mediaType, id) {
  const data = await tmdbFetch(`/${mediaType}/${id}/watch/providers`)
  return data.results || {}
}

// Provider logos are small icons — w92 keeps them sharp and cheap to load.
export const PROVIDER_LOGO_BASE = 'https://image.tmdb.org/t/p/w92'

// Find the best trailer key from TMDb's videos list.
// Preference order: official YouTube trailer → any YouTube trailer → any teaser.
function findTrailerKey(videos) {
  if (!videos) return null
  const yt = videos.filter((v) => v.site === 'YouTube')
  const trailer =
    yt.find((v) => v.type === 'Trailer' && v.official) ??
    yt.find((v) => v.type === 'Trailer') ??
    yt.find((v) => v.type === 'Teaser') ??
    yt[0]
  return trailer?.key ?? null
}

// Fetch the full details for one movie or TV show.
// `append_to_response=credits,videos,similar,recommendations` is a TMDb power
// feature — instead of 4 separate HTTP calls, ONE request returns everything.
export async function getMediaDetails(mediaType, id) {
  const data = await tmdbFetch(
    `/${mediaType}/${id}?append_to_response=credits,videos,similar,recommendations`
  )

  // Detail endpoints don't include media_type, so add it for our normalizer.
  const normalized = normalize({ ...data, media_type: mediaType })

  // Helper: child results (similar / recommendations) inherit our mediaType.
  const normalizeChildren = (results) =>
    (results ?? [])
      .map((item) => normalize({ ...item, media_type: mediaType }))
      .filter((item) => item.posterUrl)   // skip items without posters

  return {
    ...normalized,
    genres:  data.genres ?? [],
    runtime: data.runtime ?? null,
    seasons: data.number_of_seasons ?? null,
    episodes: data.number_of_episodes ?? null,
    tagline: data.tagline ?? null,
    cast: (data.credits?.cast ?? []).slice(0, 10).map((p) => ({
      id: p.id,
      name: p.name,
      character: p.character,
      photoUrl: p.profile_path ? `${IMAGE_BASE}${p.profile_path}` : null,
    })),
    // NEW:
    trailerKey:     findTrailerKey(data.videos?.results),
    similar:        normalizeChildren(data.similar?.results),
    recommendations: normalizeChildren(data.recommendations?.results),
  }
}
