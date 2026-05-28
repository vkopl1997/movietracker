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
        // Cavea-inspired gold accent. Used for the brand, ratings, hearts.
        brand: {
          DEFAULT: '#d4af37', // warm gold
          light:   '#f5d061',
          dark:    '#a0801f',
        },
      },
      fontFamily: {
        // Inter — modern geometric sans-serif, loaded from Google Fonts in index.css.
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
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
