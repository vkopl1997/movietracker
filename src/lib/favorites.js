// ──────────────────────────────────────────────────────────────────────
// Media tracking — Supabase data layer for user_favorites table.
// Despite the table name, this now tracks:
//   - is_favorite  ♥
//   - is_watched   ✓
//   - is_watchlist 🔖
//   - user_rating  ⭐ (1-5)
//   - note         📝
// ──────────────────────────────────────────────────────────────────────
import { supabase } from './supabase'

// ── Fetch ────────────────────────────────────────────────────────────
// Fetch the CURRENT user's media (RLS picks up auth.uid() automatically when
// no .eq() filter is set).
export async function fetchUserMedia() {
  const { data, error } = await supabase
    .from('user_favorites')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error

  return data.map(rowToItem)
}

// Fetch ANY user's media by their auth uuid. Used for public profile pages.
// Requires the "Favorites are publicly readable" RLS policy.
export async function fetchUserMediaByUserId(userId) {
  const { data, error } = await supabase
    .from('user_favorites')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data.map(rowToItem)
}

// Fetch a single profile row by user id.
export async function fetchProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url, created_at')
    .eq('id', userId)
    .single()

  if (error) throw error
  return data
}

// Map a DB row to the in-app shape used by MediaCard etc.
function rowToItem(row) {
  return {
    id:          row.tmdb_id,
    title:       row.title,
    year:        row.year,
    rating:      row.rating != null ? Number(row.rating) : null,  // TMDb rating
    mediaType:   row.media_type,
    posterUrl:   row.poster_url,
    createdAt:   row.created_at,
    // New status fields:
    isFavorite:  !!row.is_favorite,
    isWatched:   !!row.is_watched,
    isWatchlist: !!row.is_watchlist,
    userRating:  row.user_rating,
    note:        row.note,
    watchedAt:   row.watched_at,
  }
}

// ── Upsert pattern ───────────────────────────────────────────────────
// We use Postgres `upsert` (insert-or-update on conflict) so a single
// call handles both "first time interacting with this item" and "updating
// an existing row". The PK is (user_id, tmdb_id, media_type).
async function upsert(userId, item, changes) {
  const row = {
    user_id:     userId,
    tmdb_id:     item.id,
    media_type:  item.mediaType,
    title:       item.title,
    poster_url:  item.posterUrl,
    year:        item.year,
    rating:      item.rating,
    ...changes,
  }

  const { error } = await supabase
    .from('user_favorites')
    .upsert(row, { onConflict: 'user_id,tmdb_id,media_type' })

  if (error) throw error
}

// ── Status setters ───────────────────────────────────────────────────
export async function setFavorite(userId, item, value) {
  await upsert(userId, item, { is_favorite: value })
}

export async function setWatched(userId, item, value) {
  await upsert(userId, item, {
    is_watched: value,
    // Only set timestamp when marking as watched; clearing it when unmarking is OK.
    watched_at: value ? new Date().toISOString() : null,
  })
}

export async function setWatchlist(userId, item, value) {
  await upsert(userId, item, { is_watchlist: value })
}

export async function setUserRating(userId, item, rating) {
  // Marking a rating implies "watched" — auto-tick it for convenience.
  await upsert(userId, item, {
    user_rating: rating,
    is_watched: true,
    watched_at: new Date().toISOString(),
  })
}

export async function setNote(userId, item, note) {
  await upsert(userId, item, { note: note || null })
}

// ── Delete (when ALL flags are off, row is orphaned — clean it up) ───
export async function deleteRow(item) {
  const { error } = await supabase
    .from('user_favorites')
    .delete()
    .eq('tmdb_id', item.id)
    .eq('media_type', item.mediaType)
  if (error) throw error
}

// Legacy named exports — kept so existing imports don't break during refactor.
export const fetchFavorites = fetchUserMedia
export async function addFavorite(userId, item) {
  await setFavorite(userId, item, true)
}
export async function removeFavorite(item) {
  // For "remove from favorites" we just unset the flag, NOT delete the row —
  // the user might still have it as watched/watchlist.
  const { error } = await supabase
    .from('user_favorites')
    .update({ is_favorite: false })
    .eq('tmdb_id', item.id)
    .eq('media_type', item.mediaType)
  if (error) throw error
}
