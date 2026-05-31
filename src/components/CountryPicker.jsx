// CountryPicker — searchable country dropdown.
//
// Why a custom one (not native <select>):
//   - Native selects don't have search
//   - Lets us mark countries with/without provider data
//   - Lets us show flag emoji + country name in one line
//
// Patterns used:
//   - useRef + click-outside detection (same as UserMenu)
//   - Custom hook-like search filter via useMemo
//   - <input autoFocus> for instant typing when dropdown opens

import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { dropdownVariant } from '../lib/motion'

// All ISO 3166-1 alpha-2 country codes the browser knows about.
// Intl.supportedValuesOf('region') gives us ~250 valid codes.
// Older browsers (< Chrome 99 / Safari 15.4) return undefined → fallback empty array.
const ALL_COUNTRY_CODES = (() => {
  try { return Intl.supportedValuesOf('region') ?? [] }
  catch { return [] }
})()

let regionNames
function countryName(code) {
  if (!regionNames) {
    try { regionNames = new Intl.DisplayNames(['en'], { type: 'region' }) } catch {}
  }
  return regionNames?.of(code) ?? code
}

function countryFlag(code) {
  return [...code.toUpperCase()]
    .map((c) => String.fromCodePoint(127397 + c.charCodeAt(0)))
    .join('')
}

function CountryPicker({ value, onChange, withData = [] }) {
  const [open, setOpen]     = useState(false)
  const [query, setQuery]   = useState('')
  const containerRef        = useRef(null)
  const inputRef            = useRef(null)

  // Build the full sorted list once.
  // Show ALL countries (so user can search Georgia even if no provider data exists),
  // sort countries that DO have data to the top.
  const withDataSet = useMemo(() => new Set(withData), [withData])

  const allCountries = useMemo(() => {
    // Prefer the browser's region list; fall back to just the available data list.
    const base = ALL_COUNTRY_CODES.length > 0 ? ALL_COUNTRY_CODES : withData
    return [...base].sort((a, b) => {
      const aHas = withDataSet.has(a)
      const bHas = withDataSet.has(b)
      if (aHas !== bHas) return aHas ? -1 : 1   // with-data first
      return countryName(a).localeCompare(countryName(b))
    })
  }, [withData, withDataSet])

  // Filter by query (matches country name or code, case-insensitive).
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return allCountries
    return allCountries.filter((c) => {
      const name = countryName(c).toLowerCase()
      return name.includes(q) || c.toLowerCase().includes(q)
    })
  }, [allCountries, query])

  // Click-outside + Escape closes
  useEffect(() => {
    if (!open) return
    function onClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    function onKey(e) { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  // Focus search input when dropdown opens
  useEffect(() => {
    if (open) {
      setQuery('')
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [open])

  function pick(code) {
    onChange(code)
    setOpen(false)
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="
          flex items-center gap-2 px-3 py-1.5 rounded-full text-sm
          bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10
          border border-black/10 dark:border-white/10
          text-neutral-700 dark:text-white/70
          transition
        "
      >
        <span className="text-base leading-none">{countryFlag(value)}</span>
        <span>{countryName(value)}</span>
        <svg
          className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 12 12"
        >
          <path d="M3 5l3 3 3-3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="listbox"
            variants={dropdownVariant}
            initial="hidden" animate="show" exit="exit"
            style={{ transformOrigin: 'top right' }}
            className="
              absolute right-0 top-full mt-2 w-72
              rounded-xl overflow-hidden
              bg-white dark:bg-neutral-900
              border border-black/10 dark:border-white/10
              shadow-2xl shadow-black/20 dark:shadow-black/60
              z-50
            "
          >
            {/* Search input */}
            <div className="p-3 border-b border-black/5 dark:border-white/10">
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search country…"
                className="
                  w-full px-3 py-1.5 rounded-lg text-sm
                  bg-black/5 dark:bg-white/5
                  border border-black/10 dark:border-white/10
                  text-neutral-900 dark:text-white
                  placeholder:text-neutral-400 dark:placeholder:text-white/40
                  focus:outline-none focus:border-brand transition
                "
              />
            </div>

            {/* Scrollable country list */}
            <div className="max-h-72 overflow-y-auto">
              {filtered.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-neutral-500 dark:text-white/50">
                  No country matches "{query}"
                </div>
              ) : (
                filtered.map((code) => {
                  const selected = code === value
                  const hasData  = withDataSet.has(code)
                  return (
                    <button
                      key={code}
                      onClick={() => pick(code)}
                      role="option"
                      aria-selected={selected}
                      className={`
                        w-full flex items-center gap-3 px-4 py-2 text-sm text-left transition
                        ${selected
                          ? 'bg-brand/15 text-neutral-900 dark:text-white'
                          : 'text-neutral-700 dark:text-white/80 hover:bg-black/5 dark:hover:bg-white/5'}
                        ${!hasData ? 'opacity-50' : ''}
                      `}
                    >
                      <span className="text-base leading-none">{countryFlag(code)}</span>
                      <span className="flex-1 truncate">{countryName(code)}</span>
                      {!hasData && (
                        <span className="text-[10px] text-neutral-400 dark:text-white/40">
                          no data
                        </span>
                      )}
                      {selected && <span className="text-brand">✓</span>}
                    </button>
                  )
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default CountryPicker
