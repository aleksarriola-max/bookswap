/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        warm: {
          50:  '#fdf8f0',
          100: '#faefd9',
          200: '#f4dba8',
          300: '#ecc270',
          400: '#e4a340',
          500: '#d4832a',
          600: '#b86620',
          700: '#95501c',
          800: '#7a421d',
          900: '#64371c',
        },
        sage: {
          50:  '#f3f7f4',
          100: '#e3ede5',
          200: '#c4d9c8',
          300: '#98bda0',
          400: '#699b74',
          500: '#4a7d56',
          600: '#3a6444',
          700: '#305038',
          800: '#294130',
          900: '#243629',
        },
        cream: '#fdf6ec',
        parchment: '#f5ead6',
      },
      fontFamily: {
        serif: ['Georgia', 'Cambria', 'Times New Roman', 'serif'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
    },
  },
  plugins: [],
}
