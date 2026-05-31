// useScrollArrows — wires up horizontal-scroll state for any element.
//
// Returns:
//   - ref: callback ref — attach to the scrolling container (overflow-x-auto)
//   - canLeft / canRight: booleans for whether arrows should be shown
//   - scrollLeft() / scrollRight(): smooth-scroll one "page" in that direction
//
// Why a callback ref instead of useRef:
//   The consumer often hides the scroller behind `if (loading) return null`.
//   With useRef + useEffect([]), the effect runs ONCE on mount when there's
//   no element yet, then never re-runs when the element appears later.
//   A callback ref fires every time the DOM node attaches/detaches, so we
//   reliably observe the real scroller as soon as it mounts.

import { useCallback, useRef, useState } from 'react'

export function useScrollArrows() {
  const nodeRef    = useRef(null)   // for the scroll helpers
  const cleanupRef = useRef(null)   // teardown for the current observers
  const [canLeft,  setCanLeft]  = useState(false)
  const [canRight, setCanRight] = useState(false)

  // Callback ref — invoked with the DOM node each time it attaches/detaches.
  const ref = useCallback((node) => {
    // Tear down anything from the previous node
    if (cleanupRef.current) {
      cleanupRef.current()
      cleanupRef.current = null
    }

    nodeRef.current = node
    if (!node) return

    function update() {
      const { scrollLeft, scrollWidth, clientWidth } = node
      // 5px tolerance to avoid sub-pixel flicker
      setCanLeft(scrollLeft > 5)
      setCanRight(scrollLeft + clientWidth < scrollWidth - 5)
    }

    update()

    node.addEventListener('scroll', update, { passive: true })

    // Observe container resize + each child (images expanding it later)
    const ro = new ResizeObserver(update)
    ro.observe(node)
    for (const child of node.children) ro.observe(child)

    // Observe child additions/removals (e.g. async data loading more items)
    const mo = new MutationObserver(() => {
      for (const child of node.children) ro.observe(child)
      update()
    })
    mo.observe(node, { childList: true, subtree: true })

    cleanupRef.current = () => {
      node.removeEventListener('scroll', update)
      ro.disconnect()
      mo.disconnect()
    }
  }, [])

  const scrollLeft = useCallback(() => {
    const el = nodeRef.current
    if (!el) return
    el.scrollBy({ left: -el.clientWidth * 0.8, behavior: 'smooth' })
  }, [])

  const scrollRight = useCallback(() => {
    const el = nodeRef.current
    if (!el) return
    el.scrollBy({ left: el.clientWidth * 0.8, behavior: 'smooth' })
  }, [])

  return { ref, canLeft, canRight, scrollLeft, scrollRight }
}
