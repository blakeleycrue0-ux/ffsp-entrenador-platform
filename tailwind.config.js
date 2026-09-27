/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      /* UNA SOLA FAMILIA para todo: Schibsted Grotesk.
         Antes había dos (Inter para la interfaz, Archivo para titulares) y
         mezclar dos grotescas parecidas no se nota como intención, se nota
         como descuido. Con una sola, la jerarquía la hace el TAMAÑO y el
         PESO, que es lo que de verdad se ve.

         Se elige ésta por sus cifras: los números grandes son la mitad de
         este producto —una hora, un porcentaje, un dorsal— y aquí salen
         limpios y de ancho constante. */
      fontFamily: {
        sans: ['Schibsted Grotesk', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        display: ['Schibsted Grotesk', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        /* ────────────────────────────────────────────────────────────────────
           NEGRO · BLANCO · AZUL ELÉCTRICO · CRISTAL
           ────────────────────────────────────────────────────────────────────
           La escala `ink` va AL REVÉS: el 900 es blanco y el 50 casi negro.
           Así las clases de toda la aplicación (`text-ink-900` = «lo que más
           se lee») siguen significando lo mismo sobre negro. */
        ink: {
          0:   '#050506',  // texto sobre claro
          50:  '#09090B',
          100: '#101014',
          200: '#1C1C21',  // separadores fuertes, esqueletos
          300: '#33333B',
          400: '#5E5E69',  // texto terciario
          500: '#8A8A96',  // texto secundario
          600: '#A8A8B4',
          700: '#C8C8D0',  // párrafos
          800: '#E6E6EA',
          900: '#FFFFFF',
        },

        /* NIVEL 0 · el fondo. Casi negro, no negro puro: el negro absoluto
           aplasta el cristal que va encima, porque no hay nada que filtrar. */
        surface: '#050506',

        /* NIVEL 1 · superficie normal. Es BLANCO AL 4,5 %, no un gris opaco:
           así se funde con el fondo en vez de recortarse contra él, y coge el
           tono de lo que tenga detrás. */
        panel: 'rgba(255,255,255,0.045)',
        raised: 'rgba(255,255,255,0.075)',
        line: 'rgba(255,255,255,0.07)',
        muted: '#8A8A96',

        /* EL AZUL. Es el acento del producto, no su fondo: va en lo que se
           pulsa, lo que está activo y lo que avanza. Nunca en una tarjeta
           entera ni en un titular. */
        azul: {
          300: '#7FC2FF',
          400: '#3FA3FF',
          500: '#168BFF',
          600: '#0A8CFF',
          700: '#006FE8',
          800: '#0058B8',
        },

        night: '#050506',

        /* Color CON SIGNIFICADO: la línea del campo de cada posición. */
        pos: {
          portera: '#E0913D',
          defensa: '#5AA0FF',
          medio: '#3FD08A',
          delantera: '#FF7A70',
        },

        ok: '#3FD08A',
        warn: '#E8B23F',
        bad: '#FF6B5E',
        info: '#0A8CFF',
      },
      boxShadow: {
        card: 'none',
        raised: 'inset 0 1px 0 rgba(255,255,255,0.06)',
        /* Lo que flota de verdad. Si se ve la sombra, sobra. */
        pop: '0 16px 50px rgba(0,0,0,0.45)',
        lift: '0 12px 40px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.08)',
        /* Iluminación azul de lo activo. Es el máximo: si alguien piensa
           «brillo», ya es demasiado. */
        azul: '0 0 24px rgba(10,140,255,0.12)',
      },
      borderRadius: {
        DEFAULT: '10px',
        md: '12px',
        lg: '14px',
        xl: '16px',
        '2xl': '18px',
        '3xl': '22px',
        '4xl': '28px',
      },
      /* Escala contenida. Nada de titulares de 60 px en un móvil: lo que
         ordena la pantalla es el contraste entre tamaños, no el tamaño. */
      fontSize: {
        '2xs': ['11px', '15px'],   // rótulo
        xs:   ['12px', '17px'],
        sm:   ['13px', '19px'],    // secundario
        base: ['15px', '22px'],    // cuerpo
        md:   ['16px', '24px'],
        lg:   ['18px', '25px'],    // H3
        xl:   ['21px', '28px'],
        '2xl':['25px', '31px'],    // H2
        '3xl':['31px', '35px'],    // H1
        '4xl':['40px', '42px'],    // display
        '5xl':['52px', '52px'],
        '6xl':['64px', '1.02'],
        '7xl':['76px', '1.01'],
        '8xl':['96px', '0.98'],
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
        /* El paso entra desde la derecha y el anterior se ha ido: dice que
           se ha avanzado, no que la pantalla se ha recargado. */
        'paso': {
          '0%': { opacity: 0, transform: 'translateX(15px)' },
          '100%': { opacity: 1, transform: 'none' },
        },
        'pop-in': {
          '0%': { transform: 'scale(.8)', opacity: 0 },
          '60%': { transform: 'scale(1.06)', opacity: 1 },
          '100%': { transform: 'scale(1)', opacity: 1 },
        },
        /* El código no coincide: los puntos se sacuden en horizontal. Es el
           gesto que ya conoce cualquiera de la pantalla de bloqueo del móvil,
           y dice «otra vez» sin tener que leer nada. */
        'temblor': {
          '0%, 100%': { transform: 'translateX(0)' },
          '15%': { transform: 'translateX(-9px)' },
          '30%': { transform: 'translateX(8px)' },
          '45%': { transform: 'translateX(-6px)' },
          '60%': { transform: 'translateX(4px)' },
          '80%': { transform: 'translateX(-2px)' },
        },
        /* Acierto: los cuatro puntos se juntan y de ahí sale un anillo. */
        'juntar': {
          '0%': { transform: 'scale(1)', opacity: 1 },
          '100%': { transform: 'scale(.34)', opacity: 0 },
        },
        'anillo': {
          '0%': { transform: 'scale(.4)', opacity: 0 },
          '35%': { opacity: 1 },
          '100%': { transform: 'scale(1)', opacity: 1 },
        },
        'trazo': { '0%': { strokeDashoffset: '26' }, '100%': { strokeDashoffset: '0' } },
      },
      animation: {
        'fade-in': 'fade-in .15s ease-out both',
        'fade-up': 'fade-up .2s ease-out both',
        'slide-up': 'slide-up .22s cubic-bezier(.22,1,.36,1) both',
        'sheet-in': 'sheet-in .42s cubic-bezier(.16,1,.3,1) both',
        'pop-in': 'pop-in .45s cubic-bezier(.34,1.56,.64,1) both',
        'paso': 'paso .25s cubic-bezier(.22,1,.36,1) both',
        'temblor': 'temblor .45s cubic-bezier(.36,.07,.19,.97) both',
        'juntar': 'juntar .22s cubic-bezier(.4,0,1,1) both',
        'anillo': 'anillo .34s cubic-bezier(.34,1.56,.64,1) .14s both',
        'trazo': 'trazo .26s ease-out .34s both',
      },
    },
  },
  plugins: [],
};
