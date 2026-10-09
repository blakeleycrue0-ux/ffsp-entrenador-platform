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

        /* ── LA PORTADA TIENE SU PROPIA LETRA, Y NO ES UN CAPRICHO ──────────
           Dentro de la aplicación manda Schibsted Grotesk y no se toca: hay
           un sistema entero medido alrededor de ella, y cambiarla movería
           cada tabla y cada botón de sitio.

           Pero una portada no es una herramienta. Lo que allí hace falta es
           carácter en dos palabras, no neutralidad en mil pantallas. Así que
           la portada —y sólo la portada— va con otras dos:

             `titulo`  Space Grotesk. Una grotesca con rarezas a propósito
                       (la «a», la «g», el «1», el «ó») que a cuerpo grande
                       se reconoce. A cuerpo pequeño sería ruido; por eso no
                       entra en la aplicación.
             `prosa`   Plus Jakarta Sans. Humanista y abierta, descansa al
                       lado de la anterior sin parecer la misma mal elegida.

           Dos grotescas PARECIDAS se leen como descuido; dos que contrastan
           de verdad se leen como intención. De ahí el salto. */
        titulo: ['Space Grotesk', 'Schibsted Grotesk', 'system-ui', 'sans-serif'],
        prosa: ['Plus Jakarta Sans', 'Schibsted Grotesk', 'system-ui', 'sans-serif'],
      },
      colors: {
        /* ────────────────────────────────────────────────────────────────────
           NEGRO · BLANCO · GRAFITO
           ────────────────────────────────────────────────────────────────────
           No hay color de marca. Ninguno. La jerarquía la hacen el negro, el
           blanco y lo que hay entre medias; el color queda reservado a lo que
           SIGNIFICA algo —una lesión, un aviso, un borrado— y aun ahí va
           apagado. Un producto que usa un cuerpo técnico todos los días no
           necesita que la interfaz llame la atención: necesita que no la
           llame.

           La escala `ink` va AL REVÉS: el 900 es blanco y el 0 negro. Así las
           clases de toda la aplicación (`text-ink-900` = «lo que más se lee»)
           siguen significando lo mismo sobre negro. */
        ink: {
          0:   '#000000',  // texto sobre blanco
          50:  '#0A0A0A',
          100: '#141414',
          200: '#1E1E1E',  // esqueletos, separadores fuertes
          300: '#2E2E2E',
          400: '#4A4A4A',
          500: '#696969',  // terciario: sellos, marcas de tiempo
          600: '#8A8A8A',
          700: '#A1A1A1',  // secundario: párrafos, descripciones
          800: '#F5F5F5',  // primario
          900: '#FFFFFF',  // énfasis y lo que se pulsa
        },

        /* LAS CUATRO SUPERFICIES. Opacas y numeradas, no transparencias
           sueltas: así dos paneles anidados no se suman y acaban más claros
           que el de al lado. */
        surface: '#050505',   // nivel 0 · el fondo
        panel: '#0A0A0A',     // nivel 1 · un bloque
        raised: '#101010',    // nivel 2 · algo por encima
        sunken: '#171717',    // nivel 3 · un hueco: campos, celdas

        /* Tres bordes y nada más. El sutil agrupa, el normal separa, el
           fuerte marca lo que está seleccionado. */
        line: 'rgba(255,255,255,0.12)',
        'line-sutil': 'rgba(255,255,255,0.08)',
        'line-fuerte': 'rgba(255,255,255,0.20)',

        muted: '#A1A1A1',
        night: '#050505',

        /* ────────────────────────────────────────────────────────────────────
           EL AZUL, Y DÓNDE VIVE
           ────────────────────────────────────────────────────────────────────
           SÓLO EN LA PORTADA. La aplicación por dentro sigue siendo negra,
           blanca y grafito, y eso no es incoherencia: son dos trabajos
           distintos. La portada tiene que detener a alguien que no sabe qué es
           esto; la herramienta tiene que desaparecer mientras se usa ocho
           horas a la semana. Stripe hace exactamente lo mismo: una portada
           llena de color y un panel de control casi gris.
           Por eso el azul va en su propio espacio de nombres —`marca-*`— y no
           sustituye a `ink`. Así es imposible que se cuele dentro por un
           descuido: una clase `bg-marca-600` en una pantalla del producto se
           ve a la legua en una revisión. */
        marca: {
          50:  '#EFF5FF',
          100: '#DCE8FF',
          200: '#C0D6FF',
          300: '#94BCFF',
          400: '#5F98FF',
          500: '#168BFF',  // azul eléctrico
          600: '#0868F9',  // el azul de marca
          700: '#0A52CC',
          800: '#0F449F',
          900: '#123B7D',
        },
        cielo: '#36C8FF',    // el claro, para los realces
        lavanda: '#6965FF',  // el frío, sólo en los degradados
        tinta: '#10131A',    // el casi negro de la portada
        grisis: '#727988',   // el gris de los párrafos sobre blanco
        /* El azul profundo de las secciones oscuras de la portada. No es el
           negro de la aplicación: lleva azul dentro, para que una captura de
           la aplicación puesta encima se vea COMO UNA PANTALLA y no como un
           agujero del mismo color que el fondo. */
        abismo: '#060C1B',
        abismo2: '#0A1427',
        /* UN SOLO ACENTO, Y CASI NUNCA. Verde lima: aparece en un sello, en
           un subrayado y en el punto de «en directo». En cuanto se usa en
           tres sitios más deja de ser un acento y pasa a ser un segundo color
           de marca, que es justo lo que no queremos. */
        lima: '#CFFF48',

        /* LAS POSICIONES, en grises. Eran cuatro colores —naranja, azul,
           verde, rojo— y cuatro colores en una plantilla es un semáforo. En
           grises se leen igual de bien y además se ordenan solas: la portera
           es la más clara y la delantera la más apagada, que es el orden en
           el que están sobre el campo. */
        pos: {
          portera: '#FFFFFF',
          defensa: '#C8C8C8',
          medio: '#919191',
          delantera: '#636363',
        },

        /* Color SÓLO donde significa algo, y apagado. Un verde chillón de
           «disponible» al lado de un rojo de «lesionada» convierte una
           plantilla en un árbol de Navidad. */
        ok: '#4F9E78',
        warn: '#B48A2E',
        bad: '#C4564C',
      },
      boxShadow: {
        card: 'none',
        raised: 'inset 0 1px 0 rgba(255,255,255,0.06)',
        /* Lo que flota de verdad. Si se ve la sombra, sobra. */
        pop: '0 16px 50px rgba(0,0,0,0.45)',
        lift: '0 12px 40px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.08)',
      },

      /**
       * LAS CAPAS TIENEN NOMBRE.
       * Con números sueltos, cada componente nuevo elegía uno más alto que el
       * anterior para «asegurarse», y así se llega a un z-index de seis cifras
       * y a que nadie sepa qué tapa a qué. Estos siete valen para todo el
       * producto y se leen: `z-nav` está por encima de `z-flotante` porque la
       * navegación manda sobre un botón flotante.
       */
      zIndex: {
        contenido: '0',
        /* Lo que se queda pegado dentro de su propio desplazamiento. */
        fijo: '10',
        /* Botones y barras que flotan sobre la página. */
        flotante: '20',
        /* La navegación: por encima de todo lo de la página. */
        nav: '30',
        /* El velo que apaga la aplicación detrás de una hoja. */
        velo: '40',
        /* Hojas, diálogos y menús contextuales. */
        hoja: '50',
        /* Los avisos, que tienen que verse incluso sobre una hoja. */
        aviso: '60',
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
      /* ESCALA TIPOGRÁFICA.
         El interletraje va EN LA ESCALA, no suelto por los archivos: una
         grotesca a 64 px con el espaciado de un párrafo se deshace, y a 12 px
         con el espaciado de un titular se junta. Cuanto más grande, más
         apretado. Es casi toda la diferencia entre una tipografía que parece
         cara y una que parece la de por defecto. */
      fontSize: {
        '2xs': ['11px', { lineHeight: '15px', letterSpacing: '0.04em' }],
        xs:   ['12px', { lineHeight: '17px', letterSpacing: '0' }],
        sm:   ['13px', { lineHeight: '19px', letterSpacing: '-0.004em' }],
        base: ['15px', { lineHeight: '23px', letterSpacing: '-0.008em' }],
        md:   ['16px', { lineHeight: '24px', letterSpacing: '-0.011em' }],
        lg:   ['18px', { lineHeight: '26px', letterSpacing: '-0.016em' }],
        xl:   ['21px', { lineHeight: '28px', letterSpacing: '-0.021em' }],
        '2xl':['25px', { lineHeight: '31px', letterSpacing: '-0.026em' }],
        '3xl':['31px', { lineHeight: '35px', letterSpacing: '-0.031em' }],
        '4xl':['40px', { lineHeight: '42px', letterSpacing: '-0.036em' }],
        '5xl':['52px', { lineHeight: '1.02', letterSpacing: '-0.04em' }],
        '6xl':['64px', { lineHeight: '1.0', letterSpacing: '-0.042em' }],
        '7xl':['76px', { lineHeight: '0.98', letterSpacing: '-0.044em' }],
        '8xl':['88px', { lineHeight: '0.96', letterSpacing: '-0.046em' }],
      },
      transitionDuration: {
        120: '120ms',
        250: '250ms',
        400: '400ms',
        700: '700ms',
        900: '900ms',
      },
      /* UNA SOLA CURVA para todo el producto. Sale despacio y frena largo:
         es lo que hace que un movimiento parezca que tiene peso en vez de
         parecer que el navegador ha terminado de calcular. Nada rebota. */
      transitionTimingFunction: {
        suave: 'cubic-bezier(0.16, 1, 0.3, 1)',
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
        /* La entrada de la portada: aparece desde abajo y de desenfocado a
           nítido. El desenfoque es lo que hace que no parezca un `fade`.
           ⚠ EL ÚLTIMO FOTOGRAMA ACABA EN `none`, NO EN `blur(0)`. No es lo
           mismo, y la diferencia se ve. La animación lleva `both`, así que el
           valor final se queda puesto para siempre; y `filter`, aunque sea de
           cero, basta para que el elemento pase a su propia capa compuesta.
           Safari rasteriza esa capa y la deja fija, con lo que el texto pierde
           el suavizado subpíxel y TODA la portada se ve blanda —sin que nada
           aparente estar desenfocado—. Con `none` no hay capa y el texto lo
           pinta el motor de tipografía, como debe. */
        'entra': {
          '0%': { opacity: '0', transform: 'translateY(14px)', filter: 'blur(6px)' },
          '100%': { opacity: '1', transform: 'none', filter: 'none' },
        },
        /* El reflejo que cruza un control metálico al pasar por encima. */
        'reflejo': {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-60% 0' },
        },
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
        /* `backwards`, NO `both`, y la diferencia se ve en la pantalla.
           Con `both` el último fotograma se queda puesto para siempre, y
           `filter: none` al final de una animación que empieza en `blur(6px)`
           NO computa como `none`: el motor interpola hacia la identidad del
           filtro de origen, o sea `blur(0px)`. Un filtro de cero sigue siendo
           un filtro: promueve el elemento a su propia capa compuesta, Safari la
           rasteriza y el texto pierde el suavizado subpíxel. Resultado: toda la
           portada se ve blanda sin que nada parezca desenfocado.
           Con `backwards` el primer fotograma sigue aplicándose durante la
           espera —que es lo que hace falta para escalonar las entradas— y, al
           acabar, el elemento vuelve a su estilo normal: sin filtro y sin capa.
           Lo comprueba `pruebas/portada.mjs`. */
        'entra': 'entra .9s cubic-bezier(0.16,1,0.3,1) backwards',
      },
    },
  },
  plugins: [],
};
