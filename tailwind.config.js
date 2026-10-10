/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#f0f4ff',
          100: '#dce6ff',
          200: '#b9cdff',
          300: '#8aaaff',
          400: '#6b8fff',
          500: '#4f70f5',
          600: '#3d55e0',
          700: '#3244c4',
          800: '#2b3a9e',
          900: '#27357c',
        },
      },
    },
  },
  plugins: [],
}
