/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter var"', 'Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      colors: {
        // Lila del escudo del Santa Ponsa CF (#653F8A) — suavizado en escala completa
        brand: {
          50: '#F8F6FC',
          100: '#F1ECF8',
          200: '#E3DAF1',
          300: '#CDBEE4',
          400: '#AE9AD1',
          500: '#9179BE',
          600: '#7A5CA8',
          700: '#653F8A',
          800: '#523371',
          900: '#402759',
        },
        ink: {
          900: '#1C1B22',
          800: '#2E2C38',
          700: '#44424F',
          600: '#5D5A6B',
          500: '#7B7889',
          400: '#9B98A7',
          300: '#C0BECA',
          200: '#E2E1E8',
          100: '#F0EFF4',
          50: '#F8F8FB',
        },
        pitch: '#2F8F5B',   // verde de la cruz y las estrellas
        sun: '#E9A23B',     // sol naciente del banderín
        sea: '#3A7FB5',     // azul del banderín
        danger: '#D25A52',
      },
      boxShadow: {
        card: '0 1px 2px rgba(28,27,34,.04), 0 4px 16px -6px rgba(28,27,34,.08)',
        pop: '0 4px 12px rgba(28,27,34,.06), 0 18px 40px -14px rgba(28,27,34,.18)',
        brand: '0 6px 20px -8px rgba(101,63,138,.45)',
      },
      borderRadius: { xl: '14px', '2xl': '18px', '3xl': '24px' },
      keyframes: {
        'fade-up': { '0%': { opacity: 0, transform: 'translateY(6px)' }, '100%': { opacity: 1, transform: 'none' } },
        'fade-in': { '0%': { opacity: 0 }, '100%': { opacity: 1 } },
        'scale-in': { '0%': { opacity: 0, transform: 'scale(.97)' }, '100%': { opacity: 1, transform: 'none' } },
        'slide-up': { '0%': { transform: 'translateY(100%)' }, '100%': { transform: 'none' } },
        'sheen': { '100%': { transform: 'translateX(100%)' } },
      },
      animation: {
        'fade-up': 'fade-up .28s cubic-bezier(.22,1,.36,1) both',
        'fade-in': 'fade-in .2s ease-out both',
        'scale-in': 'scale-in .18s cubic-bezier(.22,1,.36,1) both',
        'slide-up': 'slide-up .24s cubic-bezier(.22,1,.36,1) both',
      },
    },
  },
  plugins: [],
};
