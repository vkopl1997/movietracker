// ──────────────────────────────────────────────────────────────────────
// TMDb API helper
//
// All TMDb calls go through this file so the rest of the app doesn't
// need to know about URLs, tokens, or response shapes.
// ──────────────────────────────────────────────────────────────────────

// Vite exposes environment variables that start with VITE_ to the browser.
// We'll keep the token in .env.local (which is git-ignored by Vite by default).
// .trim() guards against trailing newlines that sometimes sneak in when pasting
// long tokens into env var UIs (Vercel, Netlify, etc.) — fetch rejects them
// with "Invalid value" because HTTP header values can't contain newlines.
const TOKEN = import.meta.env.VITE_TMDB_TOKEN?.trim()

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
  }
}

// Public functions used by the rest of the app.

// Trending movies + TV shows for the week (mixed).
export async function getTrending() {
  const data = await tmdbFetch('/trending/all/week')
  return data.results
    // multi endpoints sometimes include "person" — we only want movies/tv.
    .filter((item) => item.media_type === 'movie' || item.media_type === 'tv')
    .map(normalize)
}

// Search across movies + TV shows. URL-encode the query so it handles spaces, symbols, etc.
export async function searchMulti(query) {
  const data = await tmdbFetch(`/search/multi?query=${encodeURIComponent(query)}`)
  return data.results
    .filter((item) => item.media_type === 'movie' || item.media_type === 'tv')
    .map(normalize)
}

// Fetch the full details for one movie or TV show, including cast.
// `append_to_response=credits` is a TMDb trick — get details + credits in ONE request.
export async function getMediaDetails(mediaType, id) {
  const data = await tmdbFetch(`/${mediaType}/${id}?append_to_response=credits`)

  // Detail endpoints don't include media_type in the response, so we add it ourselves.
  const normalized = normalize({ ...data, media_type: mediaType })

  // Add extra detail-page-only fields.
  return {
    ...normalized,
    genres:  data.genres ?? [],
    runtime: data.runtime ?? null,                  // movies (minutes)
    seasons: data.number_of_seasons ?? null,        // TV
    episodes: data.number_of_episodes ?? null,     // TV
    tagline: data.tagline ?? null,
    cast: (data.credits?.cast ?? []).slice(0, 10).map((p) => ({
      id: p.id,
      name: p.name,
      character: p.character,
      photoUrl: p.profile_path ? `${IMAGE_BASE}${p.profile_path}` : null,
    })),
  }
}
