// ──────────────────────────────────────────────────────────────────────
// FavoritesContext — manages the user's media tracking state.
// (Name kept for backward compat; now handles favorite + watched + watchlist
//  + user_rating + note.)
//
// Strategy:
//   - One list of items, each with multiple status flags
//   - Optimistic UI on every mutation
//   - Rows with all flags off get deleted server-side to keep table clean
// ──────────────────────────────────────────────────────────────────────
import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useAuth } from './AuthContext'
import { useToast } from './ToastContext'
import { useNotifications } from './NotificationsContext'
import {
  fetchUserMedia,
  setFavorite  as dbSetFavorite,
  setWatched   as dbSetWatched,
  setWatchlist as dbSetWatchlist,
  setUserRating as dbSetUserRating,
  setNote      as dbSetNote,
  deleteRow    as dbDeleteRow,
} from './favorites'

const FavoritesContext = createContext(null)
const keyOf = (item) => `${item.mediaType}-${item.id}`

export function FavoritesProvider({ children }) {
  const { user } = useAuth()
  const { showToast } = useToast()
  const { addNotification } = useNotifications()
  const [items, setItems]     = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  // Load on user change
  useEffect(() => {
    if (!user) { setItems([]); return }
    let cancelled = false
    setLoading(true)
    setError(null)
    fetchUserMedia()
      .then((data) => { if (!cancelled) setItems(data) })
      .catch((err) => { if (!cancelled) setError(err.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [user])

  // ── Lookups ────────────────────────────────────────────────────────
  const itemMap = new Map(items.map((i) => [keyOf(i), i]))
  function getEntry(item) { return itemMap.get(keyOf(item)) }
  function isFavorite(item)  { return !!getEntry(item)?.isFavorite }
  function isWatched(item)   { return !!getEntry(item)?.isWatched }
  function isWatchlist(item) { return !!getEntry(item)?.isWatchlist }
  function getUserRating(item) { return getEntry(item)?.userRating ?? null }
  function getNote(item)       { return getEntry(item)?.note ?? '' }

  // ── Shared optimistic-update helper ────────────────────────────────
  // 1. Updates local state right away
  // 2. Calls the DB
  // 3. If DB fails, reverts using the snapshot
  async function optimisticUpdate(item, patch, dbCall) {
    const before = items
    // Apply patch locally
    setItems((prev) => {
      const existing = prev.find((i) => keyOf(i) === keyOf(item))
      const merged = { ...item, ...existing, ...patch }
      // Remove row entirely if all status flags off → keeps "list" clean
      const stillRelevant =
        merged.isFavorite || merged.isWatched || merged.isWatchlist ||
        merged.userRating != null || (merged.note && merged.note.length > 0)
      if (!stillRelevant) {
        return prev.filter((i) => keyOf(i) !== keyOf(item))
      }
      if (existing) {
        return prev.map((i) => keyOf(i) === keyOf(item) ? merged : i)
      }
      return [merged, ...prev]
    })
    try {
      await dbCall()
    } catch (err) {
      console.error(err)
      setItems(before)
      showToast(`Couldn't save change`, { type: 'error' })
      addNotification(`Couldn't save change to "${item.title}"`, { type: 'error' })
    }
  }

  // ── Public actions ─────────────────────────────────────────────────
  const toggleFavorite = useCallback(async (item) => {
    if (!user) { showToast('Sign in to save favorites!', { type: 'error' }); return }
    const next = !isFavorite(item)
    const allOffAfter =
      !next && !isWatched(item) && !isWatchlist(item) &&
      getUserRating(item) == null && !getNote(item)
    await optimisticUpdate(item, { isFavorite: next }, async () => {
      if (allOffAfter) await dbDeleteRow(item)
      else await dbSetFavorite(user.id, item, next)
    })
    showToast(next ? `Added "${item.title}" to favorites ♥` : `Removed "${item.title}" from favorites`)
    addNotification(next ? `Added "${item.title}" to favorites` : `Removed "${item.title}" from favorites`,
      { type: next ? 'add' : 'remove' })
  }, [user, items])

  const toggleWatched = useCallback(async (item) => {
    if (!user) { showToast('Sign in to track watched!', { type: 'error' }); return }
    const next = !isWatched(item)
    await optimisticUpdate(item,
      { isWatched: next, watchedAt: next ? new Date().toISOString() : null },
      () => dbSetWatched(user.id, item, next))
    showToast(next ? `Marked "${item.title}" as watched ✓` : `Unmarked "${item.title}"`)
    addNotification(next ? `Marked "${item.title}" as watched` : `Unmarked "${item.title}" as watched`,
      { type: next ? 'add' : 'remove' })
  }, [user, items])

  const toggleWatchlist = useCallback(async (item) => {
    if (!user) { showToast('Sign in to use watchlist!', { type: 'error' }); return }
    const next = !isWatchlist(item)
    await optimisticUpdate(item, { isWatchlist: next }, () => dbSetWatchlist(user.id, item, next))
    showToast(next ? `Added "${item.title}" to watchlist 🔖` : `Removed "${item.title}" from watchlist`)
    addNotification(next ? `Added "${item.title}" to watchlist` : `Removed "${item.title}" from watchlist`,
      { type: next ? 'add' : 'remove' })
  }, [user, items])

  const setRating = useCallback(async (item, rating) => {
    if (!user) { showToast('Sign in to rate!', { type: 'error' }); return }
    await optimisticUpdate(item,
      { userRating: rating, isWatched: true, watchedAt: new Date().toISOString() },
      () => dbSetUserRating(user.id, item, rating))
    if (rating != null) {
      showToast(`Rated "${item.title}" ${rating}/5 ⭐`)
      addNotification(`Rated "${item.title}" ${rating}/5`, { type: 'add' })
    }
  }, [user, items])

  const saveNote = useCallback(async (item, note) => {
    if (!user) return
    await optimisticUpdate(item, { note }, () => dbSetNote(user.id, item, note))
  }, [user, items])

  // ── Derived lists (used by Library page tabs) ─────────────────────
  const favorites = items.filter((i) => i.isFavorite)
  const watched   = items.filter((i) => i.isWatched)
  const watchlist = items.filter((i) => i.isWatchlist)

  const value = {
    items, favorites, watched, watchlist,
    loading, error,
    isFavorite, isWatched, isWatchlist,
    getUserRating, getNote,
    toggleFavorite, toggleWatched, toggleWatchlist,
    setRating, saveNote,
  }
  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext)
  if (!ctx) throw new Error('useFavorites must be used inside <FavoritesProvider>')
  return ctx
}
