// HorizontalRow — labeled row of media cards that scrolls horizontally.
// Used for "Similar" and "Recommended for you" sections on detail pages.

import MediaCard from './MediaCard'
import { useScrollArrows } from '../lib/useScrollArrows'
import ScrollArrows from './ScrollArrows'

function HorizontalRow({ title, items, limit = 20 }) {
  if (!items || items.length === 0) return null
  const visible = items.slice(0, limit)
  const { ref, canLeft, canRight, scrollLeft, scrollRight } = useScrollArrows()

  return (
    <section className="mb-10 w-full">
      <div className="
        rounded-lg bg-surface-1 border border-white/[0.08]
        shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_8px_24px_-12px_rgba(0,0,0,0.5)]
        overflow-hidden
      ">
        {/* ── Section: header (title + count) ── */}
        {title && (
          <div className="px-5 sm:px-6 py-4 flex items-baseline justify-between gap-3 flex-wrap border-b border-white/[0.06]">
            <h2 className="text-[15px] font-semibold tracking-tight text-white">{title}</h2>
            <span className="text-[12px] text-white/45">
              {items.length} {items.length === 1 ? 'title' : 'titles'}
            </span>
          </div>
        )}

        {/* ── Section: body (horizontal scroll of cards) ── */}
        <div className="relative p-4 sm:p-5">
          <ScrollArrows
            canLeft={canLeft}
            canRight={canRight}
            onLeft={scrollLeft}
            onRight={scrollRight}
          />

          <div
            ref={ref}
            className="overflow-x-auto scrollbar-hide scroll-smooth"
          >
            <div className="flex gap-4 pb-1">
              {visible.map((item) => (
                <div
                  key={`${item.mediaType}-${item.id}`}
                  className="w-36 sm:w-40 md:w-44 shrink-0"
                >
                  <MediaCard {...item} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default HorizontalRow
