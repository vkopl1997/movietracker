// MovieTracker logo — bold geometric "M" monogram.
// Cleaner, more iconic than the previous film-strip design.
// Same artwork lives in /public/favicon.svg.

function Logo({ size = 32, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Rounded square in matte black */}
      <rect width="64" height="64" rx="14" fill="#0a0a0a" />

      {/* Gold "M" monogram — bold, geometric, slight stencil feel.
          Designed so the negative space at the bottom hints at a clapperboard slot. */}
      <path
        d="M 12 50 L 12 14 L 22 14 L 32 30 L 42 14 L 52 14 L 52 50 L 44 50 L 44 28 L 36 42 L 28 42 L 20 28 L 20 50 Z"
        fill="#d4af37"
      />
    </svg>
  )
}

export default Logo
