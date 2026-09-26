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
        //
        // La escala llega hasta el 800 por una razón concreta: el 600 sobre
        // texto blanco no llega al contraste mínimo para leerse bien (queda en
        // 3,9 y hace falta 4,5). Los botones usan el 700, que sí llega. Un
        // verde bonito que no se lee no sirve de nada.
        pitch: {
          50: '#ECFDF3',
          100: '#D1FADF',
          200: '#A6F4C5',
          300: '#6CE9A6',
          400: '#32D583',
          500: '#12B76A',
          600: '#039855',
          700: '#027A48',
          800: '#05603A',
          900: '#054F31',
        },

        /* Color CON SIGNIFICADO, que es el único que se permite de adorno:
           cada línea del campo tiene el suyo, así una plantilla se lee de un
           vistazo sin tener que ir leyendo la columna «posición». No se usa
           nunca como única información: siempre acompaña a la palabra. */
        pos: {
          portera: '#B25E09',
          defensa: '#1F63B8',
          medio: '#047A4E',
          delantera: '#B3372C',
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
        // Para lo que de verdad manda en la pantalla, no para todo
        lift: '0 1px 2px rgba(16,28,45,.06), 0 8px 20px -10px rgba(16,28,45,.18)',
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
