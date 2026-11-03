/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#0F1F3D',
          950: '#0A1730',
          900: '#0B1D3A',
          800: '#13294D',
          700: '#1B3A6B',
          100: '#DCE4F2',
          50: '#EFF3FA',
        },
        gold: {
          DEFAULT: '#C9A227',
          light: '#E6C860',
          dark: '#A8841A',
          600: '#A9861D',
          500: '#C9A227',
          400: '#D9BC55',
          100: '#F5EAC6',
          50: '#FBF6E3',
        },
        cream: '#FAF7F0',
      },
      fontFamily: {
        display: ['"Fraunces", "Georgia", serif'],
        serif: ['"Playfair Display", "Georgia", serif'],
        sans: ['Inter', 'system-ui', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        card: '0 10px 30px -12px rgba(11,29,58,.25)',
        lift: '0 18px 40px -18px rgba(11,29,58,.35)',
      },
      backgroundImage: {
        // Subtle navy-tinted grid used behind hero/header bands (same brand hue).
        'grid-navy':
          'linear-gradient(to right, rgba(11,29,58,.07) 1px, transparent 1px), linear-gradient(to bottom, rgba(11,29,58,.07) 1px, transparent 1px)',
        'grid-gold':
          'linear-gradient(to right, rgba(201,162,39,.14) 1px, transparent 1px), linear-gradient(to bottom, rgba(201,162,39,.14) 1px, transparent 1px)',
      },
      keyframes: {
        'toast-in': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      animation: {
        'toast-in': 'toast-in .25s ease-out both',
        'fade-in': 'fade-in .2s ease-out both',
      },
    },
  },
  plugins: [],
};
