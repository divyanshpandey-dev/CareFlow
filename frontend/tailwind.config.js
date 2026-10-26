/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        brand: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
        },
        clinical: {
          blue: '#0284c7',
          teal: '#0d9488',
          amber: '#d97706',
          rose: '#e11d48',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          '"Noto Sans Devanagari"',
          '"Noto Sans Bengali"',
          '"Noto Sans Tamil"',
          '"Noto Sans Telugu"',
          '"Noto Sans Gujarati"',
          '"Noto Sans Kannada"',
          '"Noto Sans Malayalam"',
          '"Noto Sans Gurmukhi"',
          '"Noto Sans Oriya"',
          '"Noto Nastaliq Urdu"',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
};
