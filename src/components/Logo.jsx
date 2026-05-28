// MovieTracker logo — same artwork as /public/favicon.svg.
// Extracted so we can reuse it in the navbar, footer, splash screens, etc.

function Logo({ size = 28, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"          /* purely decorative — the text "MovieTracker" is the label */
    >
      {/* Dark rounded square background */}
      <rect width="64" height="64" rx="14" fill="#0a0a0a" />

      {/* Top film-strip perforations */}
      <rect x="0" y="6" width="64" height="6" fill="#1c1c1c" />
      <circle cx="9"  cy="9" r="1.6" fill="#0a0a0a" />
      <circle cx="20" cy="9" r="1.6" fill="#0a0a0a" />
      <circle cx="32" cy="9" r="1.6" fill="#0a0a0a" />
      <circle cx="44" cy="9" r="1.6" fill="#0a0a0a" />
      <circle cx="55" cy="9" r="1.6" fill="#0a0a0a" />

      {/* Bottom film-strip perforations */}
      <rect x="0" y="52" width="64" height="6" fill="#1c1c1c" />
      <circle cx="9"  cy="55" r="1.6" fill="#0a0a0a" />
      <circle cx="20" cy="55" r="1.6" fill="#0a0a0a" />
      <circle cx="32" cy="55" r="1.6" fill="#0a0a0a" />
      <circle cx="44" cy="55" r="1.6" fill="#0a0a0a" />
      <circle cx="55" cy="55" r="1.6" fill="#0a0a0a" />

      {/* Gold play triangle */}
      <path d="M 25 20 L 25 44 L 46 32 Z" fill="#d4af37" />
    </svg>
  )
}

export default Logo
