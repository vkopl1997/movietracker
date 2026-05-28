// SkeletonCard — a placeholder card with a shimmering gradient,
// shown while real data is loading. Has the SAME aspect ratio (2/3) as a real
// MediaCard so the grid layout doesn't jump when real cards arrive.
//
// The shimmer is pure CSS — a moving gradient via the `animate-shimmer` utility
// we'll define in tailwind.config.js. No JavaScript animation needed.

function SkeletonCard() {
  return (
    <div className="aspect-[2/3] rounded-xl overflow-hidden ring-1 ring-black/5 dark:ring-white/5 bg-neutral-200 dark:bg-neutral-900">
      {/* The shimmer effect — gradient that slides across infinitely */}
      <div className="
        w-full h-full
        bg-gradient-to-r
        from-transparent via-white/10 to-transparent
        dark:via-white/5
        bg-[length:200%_100%]
        animate-shimmer
      " />
    </div>
  )
}

// Renders a grid of N skeleton cards — convenient one-liner for pages.
export function SkeletonGrid({ count = 12 }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  )
}

export default SkeletonCard
