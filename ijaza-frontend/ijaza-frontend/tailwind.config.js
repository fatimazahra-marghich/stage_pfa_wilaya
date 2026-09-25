/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class', // <--- Ajoutez cette ligne
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}