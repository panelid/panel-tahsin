/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,js}"],
  theme: {
    extend: {
      colors: {
        teal: {
          600: '#0D9488',
          700: '#0F766E',
        },
        gold: {
          600: '#D4A843',
          700: '#C8923D',
        }
      }
    },
  },
  plugins: [],
}
