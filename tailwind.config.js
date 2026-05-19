/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./sgw_pro.html'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Bebas Neue', 'sans-serif'],
        heading: ['Chivo', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        sgw: { 950: '#030712', 900: '#080f1e', 850: '#0d1526', 800: '#1a2540', 750: '#1e2d4d', 700: '#253460', 600: '#2f4080', 500: '#3a52a3' },
        cy: { 400: '#22d3ee', 500: '#06b6d4', 600: '#0891b2' },
      },
    },
  },
  corePlugins: { preflight: false },
}
