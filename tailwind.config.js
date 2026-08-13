/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'hh-green': '#12573b',
        'hh-pink': '#f91681',
        'hh-yellow': '#ffde17',
      }
    },
  },
  plugins: [],
}

