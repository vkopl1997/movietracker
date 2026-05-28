// Custom hook — sets document.title and restores the previous one on unmount.
//
// Usage in any page component:
//   usePageTitle('Favorites')      → tab shows "Favorites · MovieTracker"
//   usePageTitle(null)             → tab shows just "MovieTracker"
//
// Why a custom hook? Three reasons:
//   1. Encapsulates the effect + cleanup logic in one reusable place
//   2. Consistent " · MovieTracker" suffix everywhere
//   3. Restores the previous title on unmount → no stale tab name flashes
//
import { useEffect } from 'react'

const APP_NAME = 'MovieTracker'

export function usePageTitle(title) {
  useEffect(() => {
    const previous = document.title
    document.title = title ? `${title} · ${APP_NAME}` : APP_NAME
    return () => {
      document.title = previous
    }
  }, [title])
}
