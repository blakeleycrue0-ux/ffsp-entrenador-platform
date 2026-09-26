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
        /* ────────────────────────────────────────────────────────────────────
           TEMA OSCURO. La escala va AL REVÉS de lo que parece: el 900 es
           blanco y el 50 es casi negro.
           ────────────────────────────────────────────────────────────────────
           No es un capricho de nombres. En toda la aplicación, `text-ink-900`
           quería decir «el texto que más se lee» y `bg-ink-100` «un fondo
           apenas distinto». Invirtiendo los valores, esas 751 clases siguen
           queriendo decir exactamente lo mismo sobre negro, sin tocarlas una
           a una. Lo que cambia es qué color hay detrás de cada nombre.

           Sólo hay grises. El color queda reservado para lo que INFORMA: un
           estado, una línea del campo, un aviso. */
        ink: {
          0:   '#000000',  // texto sobre blanco (botón principal)
          50:  '#0E0E0F',  // fondo apenas separado del negro
          100: '#18181A',  // paso del ratón por encima
          200: '#26262A',  // separadores fuertes, esqueletos de carga
          300: '#3C3C41',  // iconos apagados, bordes de control
          400: '#6E6E76',  // texto terciario
          500: '#8E8E96',  // texto secundario
          600: '#A8A8B0',
          700: '#C9C9CF',  // párrafos
          800: '#E6E6E9',
          900: '#FFFFFF',  // titulares y lo que más pesa
        },

        /* La página es negro puro, no gris oscuro: es lo que hace que el
           contenido parezca flotar en vez de estar metido en una caja. */
        surface: '#000000',
        /* Las tarjetas, los campos y las listas agrupadas. */
        panel: '#141416',
        /* Un escalón por encima, para lo que se pulsa dentro de una tarjeta. */
        raised: '#1F1F23',
        line: '#2A2A2F',
        muted: '#8E8E96',

        /* El acento ya NO es verde. En este sistema, lo que destaca destaca
           por ser BLANCO sobre negro, que es el contraste máximo que hay.
           Mantiene la escala para que el código que la usaba siga valiendo. */
        accent: {
          50:  '#141416',
          100: '#1F1F23',
          200: '#2A2A2F',
          300: '#6E6E76',
          400: '#C9C9CF',
          500: '#FFFFFF',
          600: '#FFFFFF',
          700: '#FFFFFF',
          800: '#E6E6E9',
          900: '#C9C9CF',
        },

        /* Azul sólo para enlaces dentro de un texto, como en la referencia. */
        link: '#3E8BFF',

        night: '#000000',

        /* Color CON SIGNIFICADO: la línea del campo de cada posición. Subidos
           de luminosidad respecto a la versión clara, porque sobre negro los
           tonos oscuros no se distinguen entre sí. */
        pos: {
          portera: '#E0913D',
          defensa: '#5AA0FF',
          medio: '#3FD08A',
          delantera: '#FF7A70',
        },

        /* Estados. Legibles sobre negro, no los mismos de antes. */
        ok: '#3FD08A',
        warn: '#E8B23F',
        bad: '#FF6B5E',
        info: '#5AA0FF',
      },
      boxShadow: {
        // Sombras mínimas, nunca decorativas
        /* Sobre negro una sombra no se ve: lo que separa una capa de otra es
           que sea MÁS CLARA, no que proyecte sombra. Se dejan casi a cero para
           que el código que las usaba no se rompa. */
        card: 'none',
        raised: '0 1px 0 rgba(255,255,255,0.04) inset',
        pop: '0 16px 40px -12px rgba(0,0,0,0.8)',
        lift: '0 20px 50px -16px rgba(0,0,0,0.9)',
      },
      /* Radios MUY generosos. En la referencia no hay una sola esquina viva:
         los campos y los botones son cápsulas y las tarjetas van muy
         redondeadas. Es de lo que más cambia la sensación del producto. */
      borderRadius: {
        DEFAULT: '10px',
        md: '12px',
        lg: '16px',
        xl: '20px',
        '2xl': '24px',
        '3xl': '28px',
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
        /* La oferta entra desde abajo con un punto de rebote: es lo que hace
           que se note que ha aparecido algo, sin necesidad de parpadeos. */
        'sheet-in': {
          '0%': { transform: 'translateY(110%)', opacity: 0 },
          '100%': { transform: 'translateY(0)', opacity: 1 },
        },
        'pop-in': {
          '0%': { transform: 'scale(.8)', opacity: 0 },
          '60%': { transform: 'scale(1.06)', opacity: 1 },
          '100%': { transform: 'scale(1)', opacity: 1 },
        },
      },
      animation: {
        'fade-in': 'fade-in .15s ease-out both',
        'fade-up': 'fade-up .2s ease-out both',
        'slide-up': 'slide-up .22s cubic-bezier(.22,1,.36,1) both',
        'sheet-in': 'sheet-in .42s cubic-bezier(.16,1,.3,1) both',
        'pop-in': 'pop-in .45s cubic-bezier(.34,1.56,.64,1) both',
      },
    },
  },
  plugins: [],
};
