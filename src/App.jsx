import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import BrowsePage from './pages/BrowsePage'
import MediaDetailPage from './pages/MediaDetailPage'
import FavoritesPage from './pages/FavoritesPage'
import BrowsePeoplePage from './pages/BrowsePeoplePage'
import PersonDetailPage from './pages/PersonDetailPage'
import BrowseUsersPage from './pages/BrowseUsersPage'
import UserProfilePage from './pages/UserProfilePage'
import './App.css'

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<BrowsePage />} />
        <Route path="movie/:id" element={<MediaDetailPage mediaType="movie" />} />
        <Route path="tv/:id"    element={<MediaDetailPage mediaType="tv" />} />

        {/* People / actors */}
        <Route path="actors"      element={<BrowsePeoplePage />} />
        <Route path="person/:id"  element={<PersonDetailPage />} />

        {/* App users */}
        <Route path="users"       element={<BrowseUsersPage />} />
        <Route path="user/:id"    element={<UserProfilePage />} />

        <Route
          path="favorites"
          element={
            <ProtectedRoute>
              <FavoritesPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default App
