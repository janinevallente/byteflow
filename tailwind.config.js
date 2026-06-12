/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Poppins', 'system-ui', 'sans-serif'],
        poppins: ['Poppins', 'sans-serif'],
      },
      colors: {
        text: '#9ca3af',
        textHeader: '#f3f4f6',
        backgroundColor: '#0f1015',
        backgroundCard: '#16171d',
        borderColor: '#2e303a',
        accent: '#9459d0',
        accentBg: 'rgba(192, 132, 252, 0.1)',
        accentBorder: 'rgba(192, 132, 252, 0.4)',
        shadowColor: 'rgba(0, 0, 0, 0.4) 0 4px 24px, rgba(0, 0, 0, 0.2) 0 1px 4px',
      }
    },
  },
  plugins: [],
}
