/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Plus Jakarta Sans', '-apple-system', 'sans-serif'],
        mono: ['DM Mono', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
};
