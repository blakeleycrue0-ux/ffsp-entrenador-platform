/**
 * Del horario fijo del equipo a las fechas del calendario.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Al dar de alta un equipo se pregunta qué días entrena —martes y jueves de
 * 18:00 a 19:30 en el Municipal— y eso se guarda en `trainingSlots`. Hasta
 * ahora ese dato no servía para nada: el calendario sólo pintaba las sesiones
 * creadas una a una, así que quien había dicho «entrenamos martes y jueves»
 * seguía teniendo que crear treinta entrenamientos a mano.
 *
 * Esto es la pieza que lo convierte en fechas. No guarda nada y no sabe qué es
 * un entrenamiento: recibe los horarios y dos fechas, y devuelve la lista de
 * días y horas que caen en medio. Quien decide si eso se crea, y con qué
 * nombre, es la pantalla de importar.
 *
 * `weekday` ES EL DE `Date.getDay()`: 0 domingo, 1 lunes… Es el mismo número
 * que guardan el alta y el editor de equipos, y conviene no traducirlo por el
 * camino.
 */

import type { TrainingSlot } from '@/types';

export interface CitaDelHorario {
  /** `YYYY-MM-DD`. */
  fecha: string;
  /** `HH:MM`. */
  inicio: string;
  /** Minutos entre el inicio y el fin del horario. */
  minutos: number;
  lugar: string;
}

/** Tope de seguridad: un rango absurdo no puede generar una lista infinita. */
export const TOPE_DE_CITAS = 400;

const dosCifras = (n: number) => String(n).padStart(2, '0');

const aISO = (d: Date) => `${d.getFullYear()}-${dosCifras(d.getMonth() + 1)}-${dosCifras(d.getDate())}`;

/** Minutos entre dos `HH:MM`. Si el fin no es posterior, no hay duración. */
export function minutosEntreHoras(inicio: string, fin: string): number | null {
  const a = inicio.match(/^(\d{1,2}):(\d{2})$/);
  const b = fin.match(/^(\d{1,2}):(\d{2})$/);
  if (!a || !b) return null;
  const m = (Number(b[1]) * 60 + Number(b[2])) - (Number(a[1]) * 60 + Number(a[2]));
  return m > 0 ? m : null;
}

/**
 * Las citas del horario entre dos fechas, ambas incluidas.
 *
 * Un horario sin hora de inicio se descarta: sin hora no hay entrenamiento que
 * poner en el calendario. Si falta la de fin, se queda sin duración y la
 * decide quien llame —aquí no se inventa una hora y media—.
 */
export function citasDelHorario(
  slots: TrainingSlot[],
  desde: string,
  hasta: string,
  duracionPorDefecto = 90,
): CitaDelHorario[] {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(desde) || !/^\d{4}-\d{2}-\d{2}$/.test(hasta)) return [];
  if (hasta < desde) return [];

  const utiles = slots.filter((s) => /^\d{1,2}:\d{2}$/.test(s.start ?? ''));
  if (utiles.length === 0) return [];

  const citas: CitaDelHorario[] = [];
  /* Mediodía para que ningún cambio de hora mueva el día al sumar. */
  const cursor = new Date(`${desde}T12:00:00`);
  const fin = new Date(`${hasta}T12:00:00`);

  while (cursor <= fin && citas.length < TOPE_DE_CITAS) {
    const fecha = aISO(cursor);
    const dia = cursor.getDay();
    for (const s of utiles) {
      if (s.weekday !== dia) continue;
      citas.push({
        fecha,
        inicio: s.start,
        minutos: minutosEntreHoras(s.start, s.end ?? '') ?? duracionPorDefecto,
        lugar: s.venue ?? '',
      });
      if (citas.length >= TOPE_DE_CITAS) break;
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return citas.sort((a, b) => a.fecha.localeCompare(b.fecha) || a.inicio.localeCompare(b.inicio));
}
