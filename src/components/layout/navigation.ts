import {
  Activity, BarChart3, CalendarDays, ClipboardList, Dumbbell, Home,
  LayoutGrid, Settings, Swords, Users, type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  /** Etiqueta corta para la barra inferior en móvil. */
  short?: string;
  icon: LucideIcon;
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
      { to: '/app', label: 'Inicio', icon: Home },
      { to: '/app/calendario', label: 'Calendario', icon: CalendarDays },
    ],
  },
  {
    id: 'equipo',
    label: 'Equipo',
    items: [
      { to: '/app/plantilla', label: 'Plantilla', icon: Users },
      { to: '/app/disponibilidad', label: 'Disponibilidad y lesiones', short: 'Disponibilidad', icon: Activity },
    ],
  },
  {
    id: 'trabajo',
    label: 'Trabajo en campo',
    items: [
      { to: '/app/entrenamientos', label: 'Entrenamientos', icon: ClipboardList },
      { to: '/app/ejercicios', label: 'Biblioteca de ejercicios', short: 'Ejercicios', icon: Dumbbell },
      { to: '/app/pizarra', label: 'Pizarra táctica', short: 'Pizarra', icon: LayoutGrid },
      { to: '/app/partidos', label: 'Partidos', icon: Swords },
    ],
  },
  {
    id: 'club',
    label: 'Club',
    items: [
      { to: '/app/analiticas', label: 'Analíticas', icon: BarChart3 },
      { to: '/app/equipo-tecnico', label: 'Equipo técnico', icon: Users },
      { to: '/app/ajustes', label: 'Ajustes y ayuda', short: 'Ajustes', icon: Settings },
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
