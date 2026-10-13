// FRCC Tailwind tokens — drop into tailwind.config.js `theme.extend`.
// Mirrors the main site exactly (navy / gold / cream only).
export const frccTailwindTokens = {
  colors: {
    navy: {
      950: '#0A1730',
      900: '#0B1D3A',
      800: '#13294D',
      700: '#1B3A6B',
      100: '#DCE4F2',
      50: '#EFF3FA',
    },
    gold: {
      600: '#A9861D',
      500: '#C9A227',
      400: '#D9BC55',
      100: '#F5EAC6',
      50: '#FBF6E3',
    },
    cream: '#FAF7F0',
  },
  fontFamily: {
    display: ['"Fraunces"', 'Georgia', 'serif'],
    sans: ['Inter', 'system-ui', 'Segoe UI', 'Roboto', 'sans-serif'],
  },
  boxShadow: {
    card: '0 10px 30px -12px rgba(11,29,58,.25)',
    lift: '0 18px 40px -18px rgba(11,29,58,.35)',
  },
};

export default frccTailwindTokens;
