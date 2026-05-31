// useScrollArrows — wires up horizontal-scroll state for any element.
//
// Returns:
//   - ref: attach to the scrolling container (the one with overflow-x-auto)
//   - canLeft / canRight: booleans for whether arrows should be shown
//   - scrollLeft() / scrollRight(): smooth-scroll one "page" in that direction
//
// Uses a ResizeObserver so canRight stays correct even if children load late
// (e.g. images arriving and expanding the scrollWidth).

import { useCallback, useEffect, useRef, useState } from 'react'

export function useScrollArrows() {
  const ref = useRef(null)
  const [canLeft,  setCanLeft]  = useState(false)
  const [canRight, setCanRight] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    function update() {
      const { scrollLeft, scrollWidth, clientWidth } = el
      // 5px tolerance so sub-pixel scroll positions don't flicker
      setCanLeft(scrollLeft > 5)
      setCanRight(scrollLeft + clientWidth < scrollWidth - 5)
    }

    update()
    el.addEventListener('scroll', update, { passive: true })

    // Watch for size or content changes
    const ro = new ResizeObserver(update)
    ro.observe(el)
    // Also re-check when child sizes change (images arriving late)
    for (const child of el.children) ro.observe(child)

    return () => {
      el.removeEventListener('scroll', update)
      ro.disconnect()
    }
  }, [])

  const scrollLeft = useCallback(() => {
    const el = ref.current
    if (!el) return
    el.scrollBy({ left: -el.clientWidth * 0.8, behavior: 'smooth' })
  }, [])

  const scrollRight = useCallback(() => {
    const el = ref.current
    if (!el) return
    el.scrollBy({ left: el.clientWidth * 0.8, behavior: 'smooth' })
  }, [])

  return { ref, canLeft, canRight, scrollLeft, scrollRight }
}
