// ──────────────────────────────────────────────────────────────────────
// FavoritesContext — provides the current user's favorites + helpers
// (isFavorite, toggleFavorite) to any component via useFavorites().
//
// Strategy:
//   - Keep an in-memory array of the user's favorites
//   - When user signs in → fetch from Supabase
//   - When user signs out → clear
//   - Toggle uses OPTIMISTIC UI: update local state instantly, then call
//     the DB. If DB fails, revert. This makes the heart icon feel instant.
// ──────────────────────────────────────────────────────────────────────
import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useAuth } from './AuthContext'
import { useToast } from './ToastContext'
import { useNotifications } from './NotificationsContext'
import { fetchFavorites, addFavorite, removeFavorite } from './favorites'

const FavoritesContext = createContext(null)

// Helper: turn an item into a unique key string. Used for fast isFavorite checks.
const keyOf = (item) => `${item.mediaType}-${item.id}`

export function FavoritesProvider({ children }) {
  const { user } = useAuth()
  const { showToast } = useToast()
  const { addNotification } = useNotifications()
  const [favorites, setFavorites] = useState([])  // full list
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState(null)

  // (Re)load favorites whenever the user changes (sign in or sign out).
  useEffect(() => {
    if (!user) {
      setFavorites([])
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    fetchFavorites()
      .then((data) => { if (!cancelled) setFavorites(data) })
      .catch((err) => { if (!cancelled) setError(err.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [user])

  // Build a Set of keys for O(1) "is this favorited?" checks.
  const favoriteKeys = new Set(favorites.map(keyOf))

  function isFavorite(item) {
    return favoriteKeys.has(keyOf(item))
  }

  // Toggle with optimistic UI.
  // useCallback so consumers can pass this to memoized children without re-renders.
  const toggleFavorite = useCallback(async (item) => {
    if (!user) {
      // Not signed in — could open a "please sign in" toast in the future.
      console.warn('toggleFavorite: not signed in')
      return
    }

    const currentlyFav = favoriteKeys.has(keyOf(item))

    if (currentlyFav) {
      // ── Remove ──
      setFavorites((prev) => prev.filter((f) => keyOf(f) !== keyOf(item)))
      try {
        await removeFavorite(item)
        showToast(`Removed "${item.title}" from favorites`)
        addNotification(`Removed "${item.title}" from favorites`, { type: 'remove' })
      } catch (err) {
        console.error('removeFavorite failed:', err)
        setFavorites((prev) => [...prev, item])
        showToast(`Couldn't remove "${item.title}"`, { type: 'error' })
        addNotification(`Couldn't remove "${item.title}"`, { type: 'error' })
      }
    } else {
      // ── Add ──
      const newItem = { ...item, createdAt: new Date().toISOString() }
      setFavorites((prev) => [newItem, ...prev])
      try {
        await addFavorite(user.id, item)
        showToast(`Added "${item.title}" to favorites ♥`)
        addNotification(`Added "${item.title}" to favorites`, { type: 'add' })
      } catch (err) {
        console.error('addFavorite failed:', err)
        setFavorites((prev) => prev.filter((f) => keyOf(f) !== keyOf(item)))
        showToast(`Couldn't add "${item.title}"`, { type: 'error' })
        addNotification(`Couldn't add "${item.title}"`, { type: 'error' })
      }
    }
  }, [user, favoriteKeys, showToast, addNotification])

  const value = { favorites, loading, error, isFavorite, toggleFavorite }

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  )
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext)
  if (!ctx) throw new Error('useFavorites must be used inside <FavoritesProvider>')
  return ctx
}
