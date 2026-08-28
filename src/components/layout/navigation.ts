import {
  BarChart3, CalendarDays, ClipboardList, Dumbbell, Home, MessageSquare,
  Settings, Shield, Sparkles, Swords, Users, UserSquare2, type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Coincidencia por prefijo para marcar activo el ítem en rutas de detalle. */
  match?: string;
}

export interface NavGroup {
  id: string;
  label?: string;
  items: NavItem[];
}

export const NAV: NavGroup[] = [
  {
    id: 'inicio',
    items: [{ to: '/app', label: 'Inicio', icon: Home }],
  },
  {
    id: 'gestion',
    label: 'Gestión',
    items: [
      { to: '/app/equipos', label: 'Mis equipos', icon: Shield },
      { to: '/app/jugadoras', label: 'Jugadoras', icon: Users },
      { to: '/app/calendario', label: 'Calendario', icon: CalendarDays },
      { to: '/app/partidos', label: 'Partidos', icon: Swords },
      { to: '/app/asistencia', label: 'Asistencia', icon: ClipboardList },
    ],
  },
  {
    id: 'formacion',
    label: 'Formación',
    items: [
      { to: '/app/planificaciones', label: 'Planificaciones', icon: UserSquare2 },
      { to: '/app/ejercicios', label: 'Ejercicios', icon: Dumbbell },
    ],
  },
  {
    id: 'comunicacion',
    label: 'Comunicación',
    items: [
      { to: '/app/mensajes', label: 'Mensajes', icon: MessageSquare },
      { to: '/app/asistente', label: 'Asistente IA', icon: Sparkles },
    ],
  },
  {
    id: 'analisis',
    label: 'Análisis',
    items: [
      { to: '/app/estadisticas', label: 'Estadísticas', icon: BarChart3 },
      { to: '/app/configuracion', label: 'Configuración', icon: Settings },
    ],
  },
];

export const isActive = (pathname: string, item: NavItem): boolean => {
  if (item.to === '/app') return pathname === '/app' || pathname === '/app/';
  return pathname.startsWith(item.match ?? item.to);
};
