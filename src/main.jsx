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
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .catch((err) => console.warn('SW registration failed:', err))
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
