// Shared Framer Motion variants used across the app.
// "Variants" are named animation states — you pass them via initial/animate/exit
// and the children inherit via `variants={item}`.

// ── Grid stagger ──────────────────────────────────────────────────────
// Use on a container — children with `variants={cardVariant}` will fade in
// one by one with a small delay between each.
export const gridContainer = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.05,  // 50ms between each child
      delayChildren: 0.1,     // start 100ms after the page mounts
    },
  },
}

// Each card fades up and in.
export const cardVariant = {
  hidden: { opacity: 0, y: 20 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
}

// ── Fade-up — for hero, headings, content blocks ──────────────────────
export const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
}

// ── Dropdown / popover slide-in ───────────────────────────────────────
export const dropdownVariant = {
  hidden: { opacity: 0, y: -6, scale: 0.96 },
  show:   { opacity: 1, y: 0,  scale: 1, transition: { duration: 0.15, ease: 'easeOut' } },
  exit:   { opacity: 0, y: -6, scale: 0.96, transition: { duration: 0.1 } },
}
