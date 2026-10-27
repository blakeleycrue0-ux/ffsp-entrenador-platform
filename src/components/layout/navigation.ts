/**
 * CUATRO SITIOS. No once.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Había once secciones en una lista plana con cuatro títulos de grupo: Inicio,
 * Calendario, Plantilla, Disponibilidad y lesiones, Entrenamientos, Biblioteca
 * de ejercicios, Pizarra táctica, Partidos, Analíticas, Equipo técnico, y
 * Ajustes y ayuda. Once decisiones antes de poder hacer nada, y cinco de ellas
 * —entrenamientos, partidos, disponibilidad, analíticas, ejercicios— son
 * respuestas a preguntas que un entrenador no se hace por separado.
 *
 * Porque nadie piensa «voy a Disponibilidad»: piensa «¿con quién cuento el
 * jueves?», y eso es una pregunta sobre su equipo. Nadie piensa «voy a
 * Analíticas»: piensa «¿quién está faltando?». Y nadie piensa «voy a
 * Entrenamientos» y «voy a Partidos» como dos cosas distintas: piensa «¿qué
 * hay esta semana?».
 *
 * Así que son cuatro, y cada una contesta una pregunta entera:
 *
 *   INICIO       ¿qué toca ahora?
 *   CALENDARIO   ¿qué hay esta semana?        · agenda, entrenos, partidos
 *   EQUIPO       ¿con quién cuento?           · plantilla, disponibilidad,
 *                                               datos, equipos
 *   EJERCICIOS   ¿qué hacemos en el campo?    · biblioteca
 *
 * Y la cuenta —perfil, ajustes, plan— no es una sección: es quien eres, y vive
 * detrás de tu avatar, como en cualquier aplicación del teléfono.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * NO SE HA BORRADO NINGUNA PANTALLA, Y NINGUNA DIRECCIÓN HA CAMBIADO.
 *
 * `/app/disponibilidad` sigue siendo `/app/disponibilidad`: lo que cambia es
 * que se llega a ella desde Equipo, con sus hermanas a la vista en una fila de
 * pestañas, en vez de buscarla en una lista de once. Un enlace de hace tres
 * meses, un aviso del registro de actividad o un marcador del navegador siguen
 * funcionando igual.
 *
 * LAS PESTAÑAS SE PINTAN SOLAS, y sustituyen al título de la pantalla. Antes
 * cada una de esas nueve pantallas gastaba un titular y una frase de
 * explicación para decir dónde estabas; la pestaña encendida ya lo dice, y de
 * paso enseña a dónde más se puede ir desde ahí. Las pantallas de dentro
 * —fichas, formularios— no llevan pestañas: ahí se está haciendo una cosa, y
 * lo que hace falta es volver.
 */

import { CalendarDays, Home, LayoutGrid, UsersRound } from 'lucide-react';

export interface Pagina {
  to: string;
  /** La palabra de la pestaña. Corta: tienen que caber cuatro a 320 px. */
  label: string;
}

export interface Seccion {
  /** Lo que se abre al tocar la sección: siempre la primera de `paginas`. */
  to: string;
  /** La palabra de la navegación. */
  label: string;
  icono: typeof Home;
  /**
   * Las pantallas que SON esta sección, en pestañas. Vacío = la sección es una
   * sola pantalla y no se pintan pestañas.
   */
  paginas: Pagina[];
  /**
   * Prefijos que pertenecen a la sección sin ser pestaña: fichas, formularios
   * y pantallas de detalle. Sirven para que la navegación siga marcando dónde
   * estás cuando entras en una jugador o editas un partido.
   */
  tambien?: string[];
}

export const SECCIONES: Seccion[] = [
  {
    to: '/app',
    label: 'Inicio',
    icono: Home,
    paginas: [],
  },
  {
    to: '/app/calendario',
    label: 'Calendario',
    icono: CalendarDays,
    paginas: [
      { to: '/app/calendario', label: 'Agenda' },
      { to: '/app/entrenamientos', label: 'Entrenos' },
      { to: '/app/partidos', label: 'Partidos' },
    ],
  },
  {
    to: '/app/plantilla',
    label: 'Equipo',
    icono: UsersRound,
    paginas: [
      { to: '/app/plantilla', label: 'Plantilla' },
      { to: '/app/disponibilidad', label: 'Disponibilidad' },
      { to: '/app/analiticas', label: 'Datos' },
      { to: '/app/equipo-tecnico', label: 'Equipos' },
    ],
  },
  {
    to: '/app/ejercicios',
    label: 'Ejercicios',
    /* NO ES UNA MANCUERNA, Y ES A PROPÓSITO. Lo era, y a 19 px en la barra
       de abajo no se reconocía: las dos bolas y la barra se juntaban y
       salía un garabato. Esto es una rejilla, que es literalmente lo que
       hay en la pantalla —una cuadrícula de ejercicios— y se lee entero a
       cualquier tamaño. Además, una mancuerna habla de gimnasio; la
       biblioteca de ejercicios es de cualquier deporte. */
    icono: LayoutGrid,
    /* UNA SOLA PANTALLA, así que sin pestañas: aquí había «Biblioteca» y
       «Pizarra», y al irse la pizarra una pestaña suelta no es una elección.
       `PestañasDeSeccion` ya no pinta nada con menos de dos, y dejar la lista
       con un elemento haría que la prueba del menú esperase una barra que no
       aparece. */
    paginas: [],
  },
];

/** La cuenta: detrás del avatar, no en la navegación. */
export const CUENTA: Pagina[] = [
  { to: '/app/perfil', label: 'Mi perfil' },
  { to: '/app/ajustes', label: 'Ajustes y ayuda' },
  { to: '/app/ajustes/plan', label: 'Plan del club' },
];

/** Todas las pantallas con nombre, para la búsqueda y para las pruebas. */
export const TODAS_LAS_PAGINAS: Pagina[] = [
  ...SECCIONES.flatMap((s) => (s.paginas.length > 0 ? s.paginas : [{ to: s.to, label: s.label }])),
  ...CUENTA,
];

const empiezaPor = (pathname: string, base: string) =>
  pathname === base || pathname.startsWith(`${base}/`);

/**
 * ¿De qué sección es esta dirección?
 *
 * Gana la coincidencia más larga, que es lo que hace que `/app/plantilla` no
 * se la quede `/app`. Si no es de ninguna —la cuenta, una dirección vieja—,
 * devuelve nulo y la navegación no marca nada, que es la verdad.
 */
export function seccionDe(pathname: string): Seccion | null {
  let mejor: Seccion | null = null;
  let largo = -1;
  for (const s of SECCIONES) {
    const bases = [s.to, ...s.paginas.map((p) => p.to), ...(s.tambien ?? [])];
    for (const base of bases) {
      /* `/app` sólo coincide exacto: si no, se quedaría con todo. */
      const coincide = base === '/app' ? pathname === '/app' || pathname === '/app/' : empiezaPor(pathname, base);
      if (coincide && base.length > largo) {
        mejor = s;
        largo = base.length;
      }
    }
  }
  return mejor;
}

/** ¿Está la navegación encendida en esta sección? */
export const seccionActiva = (pathname: string, s: Seccion) => seccionDe(pathname) === s;

/**
 * La página exacta en la que estamos, si es una de las pestañas.
 *
 * Que sea EXACTA es lo que decide si se pintan las pestañas: en
 * `/app/plantilla` sí, porque se está mirando una lista y las hermanas son
 * alternativas de verdad; en `/app/plantilla/nueva` no, porque ahí se está
 * rellenando un formulario y cambiar de pestaña sería perderlo.
 */
export function paginaExacta(pathname: string): { seccion: Seccion; pagina: Pagina } | null {
  const limpio = pathname.replace(/\/$/, '') || '/app';
  for (const seccion of SECCIONES) {
    const pagina = seccion.paginas.find((p) => p.to === limpio);
    if (pagina) return { seccion, pagina };
  }
  return null;
}
