/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        // Sólo para la marca y los titulares de la página pública. Dentro de la
        // aplicación manda la información, no la tipografía.
        display: ['Archivo', 'Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Navy mate. Sin brillos ni degradados: el 900 es el color de marca.
        navy: {
          50: '#F4F6F8',
          100: '#E7EBF0',
          200: '#DCE2E8',
          300: '#B9C3D0',
          400: '#8C99AB',
          500: '#647184',
          600: '#47556B',
          700: '#2C3B52',
          800: '#192940',
          900: '#101C2D',
        },
        // Grises de interfaz
        line: '#DCE2E8',
        muted: '#647184',
        surface: '#F4F6F8',
        // Verde de campo. Es el color de la pizarra, que es lo más
        // reconocible del producto, y por eso es el acento de la marca.
        pitch: {
          50: '#E8F8F0',
          100: '#C4EDD9',
          400: '#3ECF8E',
          500: '#19B877',
          600: '#0E9A61',
          700: '#0B7A4D',
          900: '#20573C',
        },
        // Navy más profundo, para las bandas oscuras de la página pública
        night: '#08111C',
        // Colores funcionales: sólo cuando transmiten información
        ok: '#1F7A4D',
        warn: '#9A6712',
        bad: '#B3372C',
        info: '#2C5A87',
      },
      boxShadow: {
        // Sombras mínimas, nunca decorativas
        card: '0 1px 2px rgba(16, 28, 45, 0.05)',
        raised: '0 2px 8px rgba(16, 28, 45, 0.08)',
        pop: '0 8px 28px -12px rgba(16, 28, 45, 0.28)',
      },
      borderRadius: {
        DEFAULT: '4px',
        md: '5px',
        lg: '6px',
        xl: '8px',
        '2xl': '10px',
      },
      fontSize: {
        '2xs': ['11px', '16px'],
        xs: ['12px', '18px'],
        sm: ['13px', '20px'],
        base: ['14px', '21px'],
        md: ['15px', '23px'],
        lg: ['17px', '25px'],
        xl: ['20px', '28px'],
        '2xl': ['24px', '32px'],
        '3xl': ['30px', '38px'],
        '4xl': ['38px', '46px'],
        '5xl': ['48px', '56px'],
        '6xl': ['60px', '1.04'],
        '7xl': ['76px', '1.01'],
        '8xl': ['96px', '0.98'],
      },
      transitionDuration: {
        120: '120ms',
      },
      keyframes: {
        'fade-in': { '0%': { opacity: 0 }, '100%': { opacity: 1 } },
        'fade-up': { '0%': { opacity: 0, transform: 'translateY(4px)' }, '100%': { opacity: 1, transform: 'none' } },
        'slide-up': { '0%': { transform: 'translateY(100%)' }, '100%': { transform: 'none' } },
      },
      animation: {
        'fade-in': 'fade-in .15s ease-out both',
        'fade-up': 'fade-up .2s ease-out both',
        'slide-up': 'slide-up .22s cubic-bezier(.22,1,.36,1) both',
      },
    },
  },
  plugins: [],
};
