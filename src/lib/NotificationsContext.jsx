// NotificationsContext — persistent notification history (bell + dropdown).
//
// vs. ToastContext:
//   - Toasts = transient, auto-dismiss after 2.5s, immediate feedback
//   - Notifications = persistent log, you can scroll through history, unread count
//
// Persisted to localStorage so notifications survive page refresh.

import { createContext, useCallback, useContext, useEffect, useState } from 'react'

const NotificationsContext = createContext(null)

const STORAGE_KEY = 'mt_notifications'
const MAX_STORED  = 50              // cap to keep localStorage tiny

let nextId = Date.now()

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function NotificationsProvider({ children }) {
  const [items, setItems] = useState(loadFromStorage)

  // Sync state → localStorage on every change.
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)) }
    catch { /* quota exceeded — silently ignore */ }
  }, [items])

  // Derived: count of unread items. Re-computed each render — no need to store.
  const unreadCount = items.filter((n) => !n.read).length

  const addNotification = useCallback((message, { type = 'add', link = null } = {}) => {
    setItems((prev) => {
      const next = [
        { id: ++nextId, message, type, link, createdAt: new Date().toISOString(), read: false },
        ...prev,
      ]
      return next.slice(0, MAX_STORED)  // drop oldest if over cap
    })
  }, [])

  const markAllRead = useCallback(() => {
    setItems((prev) => prev.every((n) => n.read) ? prev : prev.map((n) => ({ ...n, read: true })))
  }, [])

  const clearAll = useCallback(() => setItems([]), [])

  const value = { notifications: items, unreadCount, addNotification, markAllRead, clearAll }

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  )
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext)
  if (!ctx) throw new Error('useNotifications must be used inside <NotificationsProvider>')
  return ctx
}
