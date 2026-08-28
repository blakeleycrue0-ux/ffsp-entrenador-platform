import clsx, { type ClassValue } from 'clsx';

export const cn = (...inputs: ClassValue[]) => clsx(inputs);

/* ──────────────────────────────── Fechas ─────────────────────────────────── */

const DAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const DAYS_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MONTHS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];
const MONTHS_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

/** Fecha "hoy" del entorno de demostración. Centralizada para que todo cuadre. */
export const today = (): Date => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

export const toISODate = (d: Date): string => {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const parseISO = (iso: string): Date => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
};

export const addDays = (d: Date, n: number): Date => {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
};

export const startOfWeek = (d: Date): Date => {
  const c = new Date(d);
  const day = (c.getDay() + 6) % 7; // lunes = 0
  c.setDate(c.getDate() - day);
  c.setHours(0, 0, 0, 0);
  return c;
};

export const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export const dayName = (iso: string) => DAYS[parseISO(iso).getDay()];
export const dayShort = (iso: string) => DAYS_SHORT[parseISO(iso).getDay()];
export const monthName = (m: number) => MONTHS[m];
export const monthShort = (m: number) => MONTHS_SHORT[m];

/** "Hoy", "Mañana", "Sábado 14" o "14 nov" según la distancia. */
export const relativeDay = (iso: string): string => {
  const d = parseISO(iso);
  const diff = Math.round((d.getTime() - today().getTime()) / 86400000);
  if (diff === 0) return 'Hoy';
  if (diff === 1) return 'Mañana';
  if (diff === -1) return 'Ayer';
  if (diff > 1 && diff < 7) return cap(DAYS[d.getDay()]) + ' ' + d.getDate();
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()].toLowerCase()}`;
};

export const longDate = (iso: string): string => {
  const d = parseISO(iso);
  return `${cap(DAYS[d.getDay()])} ${d.getDate()} de ${MONTHS[d.getMonth()]}`;
};

export const shortDate = (iso: string): string => {
  const d = parseISO(iso);
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()].toLowerCase()}`;
};

export const daysFromToday = (iso: string): number =>
  Math.round((parseISO(iso).getTime() - today().getTime()) / 86400000);

export const relativeTime = (isoDateTime: string): string => {
  const then = new Date(isoDateTime).getTime();
  const mins = Math.round((Date.now() - then) / 60000);
  if (mins < 1) return 'ahora mismo';
  if (mins < 60) return `hace ${mins} min`;
  const h = Math.round(mins / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  if (d === 1) return 'ayer';
  if (d < 7) return `hace ${d} días`;
  return shortDate(isoDateTime.slice(0, 10));
};

export const minutesToLabel = (m: number) => (m >= 60 ? `${Math.floor(m / 60)}h ${m % 60 ? `${m % 60}'` : ''}`.trim() : `${m} min`);

export const addMinutes = (hhmm: string, mins: number): string => {
  const [h, m] = hhmm.split(':').map(Number);
  const total = h * 60 + m + mins;
  return `${`${Math.floor(total / 60) % 24}`.padStart(2, '0')}:${`${total % 60}`.padStart(2, '0')}`;
};

export const age = (birthISO: string): number => {
  const b = parseISO(birthISO);
  const n = new Date();
  let a = n.getFullYear() - b.getFullYear();
  const m = n.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && n.getDate() < b.getDate())) a--;
  return a;
};

/* ──────────────────────────────── Varios ─────────────────────────────────── */

export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const initials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();

export const uid = (prefix = 'id') => `${prefix}_${Math.random().toString(36).slice(2, 9)}`;

export const pct = (n: number, total: number) => (total === 0 ? 0 : Math.round((n / total) * 100));

export const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);

export function groupBy<T, K extends string>(arr: T[], key: (t: T) => K): Record<K, T[]> {
  return arr.reduce((acc, item) => {
    const k = key(item);
    (acc[k] ||= []).push(item);
    return acc;
  }, {} as Record<K, T[]>);
}

/** Normaliza acentos para la búsqueda global. */
export const normalize = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
