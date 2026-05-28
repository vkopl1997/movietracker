import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'

// Background switches with theme. Text inherits from body (set in index.css).
function Layout() {
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white transition-colors">
      <Navbar />
      <Outlet />
    </div>
  )
}

export default Layout
