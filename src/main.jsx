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
                <App />
              </FavoritesProvider>
            </AuthProvider>
          </NotificationsProvider>
        </ToastProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
)
