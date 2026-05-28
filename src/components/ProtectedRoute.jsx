import { Navigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'

// Wraps a route and only renders it if the user is signed in.
// Otherwise redirects to home.
//
// Usage in App.jsx:
//   <Route path="favorites" element={<ProtectedRoute><FavoritesPage /></ProtectedRoute>} />
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  // Don't redirect while we're still figuring out if a session exists —
  // that would briefly bounce signed-in users to home on every refresh.
  if (loading) {
    return <p className="text-white/50 p-12 text-center">Loading…</p>
  }

  // Signed out → redirect to home. `replace` means the user can't go "back"
  // to the protected URL (it gets replaced in browser history).
  if (!user) {
    return <Navigate to="/" replace />
  }

  return children
}

export default ProtectedRoute
