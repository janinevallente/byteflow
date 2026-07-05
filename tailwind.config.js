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
        // Existing semantic names, kept as-is so no component needs to
        // change — they now resolve to CSS variables that flip with
        // light/dark mode instead of fixed hex values.
        text: 'var(--color-text-secondary)',
        textHeader: 'var(--color-text-primary)',
        backgroundColor: 'var(--color-background)',
        backgroundCard: 'var(--color-surface)',
        borderColor: 'var(--color-border)',
        accent: 'var(--color-primary)',
        accentBg: 'var(--color-primary-bg)',
        accentBorder: 'var(--color-primary-border)',
        shadowColor: 'var(--color-shadow)',

        // New palette tokens (see the color table this was built from)
        primary: 'var(--color-primary)',
        secondary: 'var(--color-secondary)',
        accentCyan: 'var(--color-accent)',
        success: 'var(--color-success)',
        successBg: 'var(--color-success-bg)',
        successBorder: 'var(--color-success-border)',
        warning: 'var(--color-warning)',
        warningBg: 'var(--color-warning-bg)',
        warningBorder: 'var(--color-warning-border)',
        error: 'var(--color-error)',
        errorBg: 'var(--color-error-bg)',
        errorBorder: 'var(--color-error-border)',
      }
    },
  },
  plugins: [],
}
