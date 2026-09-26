import type { ComponentType } from 'react';
import { CalendarDays, Home, Settings } from 'lucide-react';
import {
  IconoAnaliticas, IconoBalon, IconoCamiseta, IconoCampo, IconoCono,
  IconoCuerpoTecnico, IconoParteMedico, IconoSilbato,
} from '@/components/ui/Icons';

/** Vale tanto un icono de lucide como uno de los nuestros. */
export type NavIcon = ComponentType<{
  size?: string | number;
  strokeWidth?: string | number;
  className?: string;
}>;

export interface NavItem {
  to: string;
  label: string;
  /** Etiqueta corta para la barra inferior en móvil. */
  short?: string;
  icon: NavIcon;
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
      { to: '/app/plantilla', label: 'Plantilla', icon: IconoCamiseta },
      { to: '/app/disponibilidad', label: 'Disponibilidad y lesiones', short: 'Disponibilidad', icon: IconoParteMedico },
    ],
  },
  {
    id: 'trabajo',
    label: 'Trabajo en campo',
    items: [
      { to: '/app/entrenamientos', label: 'Entrenamientos', icon: IconoSilbato },
      { to: '/app/ejercicios', label: 'Biblioteca de ejercicios', short: 'Ejercicios', icon: IconoCono },
      { to: '/app/pizarra', label: 'Pizarra táctica', short: 'Pizarra', icon: IconoCampo },
      { to: '/app/partidos', label: 'Partidos', icon: IconoBalon },
    ],
  },
  {
    id: 'club',
    label: 'Club',
    items: [
      { to: '/app/analiticas', label: 'Analíticas', icon: IconoAnaliticas },
      /* «Plantilla» y «Equipo técnico» llevaban EL MISMO icono de personas.
         Dos secciones distintas con el mismo dibujo no orientan a nadie. */
      { to: '/app/equipo-tecnico', label: 'Equipo técnico', icon: IconoCuerpoTecnico },
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
