// ──────────────────────────────────────────────────────────────────────
// Favorites — the Supabase data layer for the user_favorites table.
// Plain functions, no React. The Context wraps these.
// ──────────────────────────────────────────────────────────────────────
import { supabase } from './supabase'

// Fetch all favorites for the currently signed-in user.
// RLS ensures we only get rows where auth.uid() = user_id, so we don't
// need a `.eq('user_id', ...)` filter here — the database does it for us.
export async function fetchFavorites() {
  const { data, error } = await supabase
    .from('user_favorites')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error

  // Normalize so the shape matches what MediaCard / Hero expect.
  return data.map((row) => ({
    id:         row.tmdb_id,
    title:      row.title,
    year:       row.year,
    rating:     row.rating != null ? Number(row.rating) : null,
    mediaType:  row.media_type,
    posterUrl:  row.poster_url,
    createdAt:  row.created_at,
  }))
}

// Add an item to the current user's favorites.
// `userId` is required because RLS won't accept rows whose user_id doesn't
// match the signed-in user — we set it explicitly.
export async function addFavorite(userId, item) {
  const { error } = await supabase
    .from('user_favorites')
    .insert({
      user_id:    userId,
      tmdb_id:    item.id,
      media_type: item.mediaType,
      title:      item.title,
      poster_url: item.posterUrl,
      year:       item.year,
      rating:     item.rating,
    })

  if (error) throw error
}

// Remove an item from favorites by composite key (tmdb_id + media_type).
// RLS handles the user_id check automatically.
export async function removeFavorite(item) {
  const { error } = await supabase
    .from('user_favorites')
    .delete()
    .eq('tmdb_id', item.id)
    .eq('media_type', item.mediaType)

  if (error) throw error
}
