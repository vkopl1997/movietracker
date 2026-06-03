/** @type {import('tailwindcss').Config} */
export default {
  // 'class' = manual toggle: dark styles apply when <html class="dark">.
  // Lets us control theme from JS instead of following the OS automatically.
  darkMode: 'class',

  // `content` tells Tailwind which files to scan for class names so it can
  // generate ONLY the CSS you actually use.
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Linear's brand purple. Used wherever we previously used gold:
        // primary buttons, ratings, accents, headers. Light/dark variants
        // for hover/pressed states.
        brand: {
          DEFAULT: '#5e6ad2', // Linear primary purple
          light:   '#8b91e6', // hover / highlight
          dark:    '#4a52ba', // pressed / shadow tint
        },
        // Linear's surface ladder — very subtle steps for layered content.
        // Use these directly when you want a Linear-true look:
        //   bg-surface          = the page bg
        //   bg-surface-1        = cards on the page
        //   bg-surface-2        = elevated cards / hovered rows
        //   bg-surface-3        = modal dialogs
        surface: {
          DEFAULT: '#08080A',
          1:       '#0e0e10',
          2:       '#16161B',
          3:       '#1C1C21',
        },
      },
      fontFamily: {
        // Inter — used everywhere. Linear uses their own Inter-derivative
        // ("Inter Display" with display-optimized glyphs); plain Inter is
        // the closest publicly available match.
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        // Display font is now Inter too — but heavier weight + tighter
        // tracking applied at usage. Drops the "cinema poster" Bebas Neue
        // in favor of Linear's geometric-sans aesthetic.
        display: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      keyframes: {
        // Shimmer for loading skeletons — slides the gradient from left to right.
        shimmer: {
          '0%':   { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.6s linear infinite',
      },
    },
  },
  plugins: [],
}
