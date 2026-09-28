/**
 * Las secciones NO LLEVAN ICONO, y es una decisión.
 * ---------------------------------------------------------------------------
 * Un icono sólo se gana su sitio si se reconoce más rápido que la palabra.
 * «Plantilla», «Entrenamientos» o «Pizarra táctica» no tienen un dibujo
 * universal: cualquier cosa que se ponga hay que aprendérsela, y mientras
 * tanto lo único que aporta es ruido a la izquierda del texto.
 *
 * Sin ellos, la navegación la ordenan el peso y el espacio, que es lo que de
 * verdad se lee. Los iconos que quedan en el producto son los funcionales
 * —buscar, cerrar, una flecha—, donde la forma SÍ es más rápida que la
 * palabra.
 */

export interface NavItem {
  to: string;
  label: string;
  /** Etiqueta corta para la barra inferior en móvil. */
  short?: string;
  /** Coincidencia por prefijo para marcar activo el ítem en rutas de detalle. */
  match?: string;
  /** Sólo visible para quien administra el club. */
  adminOnly?: boolean;
}

export interface NavGroup {
  id: string;
  label?: string;
  items: NavItem[];
}

/**
 * Las secciones del producto. El orden es el del trabajo real de una
 * entrenadora: qué toca hoy, qué hay planificado, con quién cuenta.
 */
export const NAV: NavGroup[] = [
  {
    id: 'hoy',
    items: [
      { to: '/app', label: 'Inicio' },
      { to: '/app/calendario', label: 'Calendario', short: 'Agenda' },
    ],
  },
  {
    id: 'equipo',
    label: 'Equipo',
    items: [
      { to: '/app/plantilla', label: 'Plantilla' },
      { to: '/app/disponibilidad', label: 'Disponibilidad y lesiones', short: 'Disponibilidad' },
    ],
  },
  {
    id: 'trabajo',
    label: 'Trabajo en campo',
    items: [
      { to: '/app/entrenamientos', label: 'Entrenamientos', short: 'Entrenos' },
      { to: '/app/ejercicios', label: 'Biblioteca de ejercicios', short: 'Ejercicios' },
      { to: '/app/pizarra', label: 'Pizarra táctica', short: 'Pizarra' },
      { to: '/app/partidos', label: 'Partidos' },
    ],
  },
  {
    id: 'club',
    label: 'Club',
    items: [
      { to: '/app/analiticas', label: 'Analíticas' },
      { to: '/app/equipo-tecnico', label: 'Equipo técnico' },
      { to: '/app/ajustes', label: 'Ajustes y ayuda', short: 'Ajustes' },
    ],
  },
];

/** Atajos de la barra inferior en móvil; el resto vive en «Más». */
export const MOBILE_NAV: string[] = ['/app', '/app/calendario', '/app/entrenamientos', '/app/plantilla'];

export const ALL_NAV_ITEMS: NavItem[] = NAV.flatMap((g) => g.items);

export const isActive = (pathname: string, item: NavItem): boolean => {
  if (item.to === '/app') return pathname === '/app' || pathname === '/app/';
  return pathname.startsWith(item.match ?? item.to);
};

/**
 * ¿Tiene sentido un botón de «crear» flotante en esta pantalla?
 *
 * NO EN TODAS, y ésa es la decisión. Un botón redondo azul fijo en la esquina
 * de cada pantalla deja de significar nada: en asistencia competía con
 * «Guardar», en la pizarra tapaba las herramientas y en ajustes no había nada
 * que crear. Se queda donde de verdad se empieza algo nuevo.
 *
 * Fuera de aquí: cualquier formulario (`/nuevo`, `/editar`), porque ahí ya se
 * está creando algo; y las pantallas que se miran o se rellenan, no se
 * llenan de elementos nuevos.
 */
const SIN_CREAR = [
  '/app/asistencia',
  '/app/disponibilidad',
  '/app/analiticas',
  '/app/ajustes',
  '/app/perfil',
  '/app/pizarra',
];

export const admiteCrear = (pathname: string): boolean => {
  if (/\/(nuevo|nueva|editar|asistencia)(\/|$)/.test(pathname)) return false;
  return !SIN_CREAR.some((r) => pathname.startsWith(r));
};
