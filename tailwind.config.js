/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#0F9D58',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        green: {
          brand: '#0F9D58',
          secondary: '#34A853',
          accent: '#66BB6A',
        },
      },
      fontFamily: {
        arabic: ['Cairo', 'Tajawal', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
