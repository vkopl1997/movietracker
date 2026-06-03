// MovieTracker logo — Linear-style: a clean geometric "M" in currentColor
// (so the parent's text color controls fill), no background, no gold.
// Pairs with the "MovieTracker" wordmark in the navbar at semibold Inter.

function Logo({ size = 22, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M 4 20 L 4 4 L 7 4 L 12 12.5 L 17 4 L 20 4 L 20 20 L 17.4 20 L 17.4 8.8 L 12 17 L 6.6 8.8 L 6.6 20 Z"
        fill="currentColor"
      />
    </svg>
  )
}

export default Logo
