import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { ThemeProvider } from './lib/ThemeContext.jsx'
import { ToastProvider } from './lib/ToastContext.jsx'
import { NotificationsProvider } from './lib/NotificationsContext.jsx'
import { AuthProvider } from './lib/AuthContext.jsx'
import { FavoritesProvider } from './lib/FavoritesContext.jsx'
import LikeNotifier from './components/LikeNotifier.jsx'

// ── Register the service worker (PWA) ──────────────────────────────
// Skipped in dev so changes always reload from source. Production-only.
//
// Auto-update flow:
//   1. New SW (with bumped CACHE_VERSION) is fetched in the background.
//   2. It calls skipWaiting() + clients.claim() in its install/activate.
//   3. The browser fires `controllerchange` on this page — we reload once
//      so the user instantly sees the new bundle. No hard-refresh needed.
//
// The `reloaded` flag prevents an infinite reload loop if multiple SW
// updates fire in quick succession.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .then((registration) => {
        // Check for SW updates on every page load + every 60s.
        registration.update().catch(() => {})
        setInterval(() => registration.update().catch(() => {}), 60_000)
      })
      .catch((err) => console.warn('SW registration failed:', err))

    let reloaded = false
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloaded) return
      reloaded = true
      window.location.reload()
    })
  })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* Provider chain — outer providers must be ABOVE anyone that reads them.
        FavoritesProvider depends on Auth, Toast, and Notifications, so it sits innermost. */}
    <BrowserRouter>
      <ThemeProvider>
        <ToastProvider>
          <NotificationsProvider>
            <AuthProvider>
              <FavoritesProvider>
                {/* No UI — subscribes to "someone liked me" events and adds notifications. */}
                <LikeNotifier />
                <App />
              </FavoritesProvider>
            </AuthProvider>
          </NotificationsProvider>
        </ToastProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
)
