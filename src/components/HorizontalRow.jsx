// HorizontalRow — labeled row of media cards that scrolls horizontally.
// Used for "Similar" and "Recommended for you" sections on detail pages.

import MediaCard from './MediaCard'

function HorizontalRow({ title, items, limit = 20 }) {
  if (!items || items.length === 0) return null
  const visible = items.slice(0, limit)

  return (
    <section className="mb-10">
      <h2 className="text-xl font-bold mb-4">{title}</h2>

      {/* Negative margin pulls scroll edges to the page edge so cards can
          peek off-screen, signalling "scrollable". */}
      <div className="-mx-6 px-6 overflow-x-auto scrollbar-hide">
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
    </section>
  )
}

export default HorizontalRow
