import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import BrowsePage from './pages/BrowsePage'
import MediaDetailPage from './pages/MediaDetailPage'
import FavoritesPage from './pages/FavoritesPage'
import './App.css'

// All app routes are declared here.
//
// The pattern:
//   <Route element={<Layout />}>     ← shared chrome (Navbar) for child routes
//     <Route index ... />            ← / (the "index" child of Layout)
//     <Route path="movie/:id" ... /> ← /movie/603 etc.
//     ...
//   </Route>
//
// Each child route renders inside Layout's <Outlet />.
function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<BrowsePage />} />
        <Route path="movie/:id" element={<MediaDetailPage mediaType="movie" />} />
        <Route path="tv/:id"    element={<MediaDetailPage mediaType="tv" />} />
        <Route
          path="favorites"
          element={
            <ProtectedRoute>
              <FavoritesPage />
            </ProtectedRoute>
          }
        />
        {/* Catch-all: anything else (bad URLs, /asdfasdf, etc.) → bounce home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default App
