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
    <section className="mb-10">
      {title && <h2 className="text-xl font-bold mb-4">{title}</h2>}

      <div className="relative">
        <ScrollArrows
          canLeft={canLeft}
          canRight={canRight}
          onLeft={scrollLeft}
          onRight={scrollRight}
        />

        {/* Negative margin pulls scroll edges to the page edge so cards can
            peek off-screen, signalling "scrollable". */}
        <div
          ref={ref}
          className="-mx-6 px-6 overflow-x-auto scrollbar-hide scroll-smooth"
        >
          <div className="flex gap-4 pb-2">
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
    </section>
  )
}

export default HorizontalRow
