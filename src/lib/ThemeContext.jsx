// ──────────────────────────────────────────────────────────────────────
// ThemeContext — light/dark theme with persistence + system preference fallback.
//
// On mount we pick the initial theme in this priority:
//   1. localStorage 'theme' (if user has chosen before)
//   2. OS preference  (prefers-color-scheme: dark)
//   3. Default → 'dark' (this app is dark-first)
//
// Whenever theme changes:
//   - localStorage is updated so it persists across visits
//   - <html> gets the 'dark' class added/removed → all Tailwind dark: rules flip
// ──────────────────────────────────────────────────────────────────────
import { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext(null)

// Compute the initial theme synchronously so there's no "flash" on first render.
// Policy: always start dark (this app is dark-first), unless the user has
// previously chosen light. We do NOT follow OS preference — the brand is dark.
function getInitialTheme() {
  if (typeof window === 'undefined') return 'dark'

  const stored = localStorage.getItem('theme')
  if (stored === 'light') return 'light'

  return 'dark'
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(getInitialTheme)

  // Sync the class on <html> + persist to localStorage whenever theme changes.
  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    localStorage.setItem('theme', theme)
  }, [theme])

  function toggleTheme() {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'))
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>')
  return ctx
}
