/**
 * Qué trae cada plan.
 * ---------------------------------------------------------------------------
 * UN SOLO SITIO. La alternativa —`if (plan === 'pro')` repartido por las
 * pantallas— envejece fatal: el día que una capacidad cambia de plan hay que
 * buscarla por todo el proyecto, y el día que se añade un plan hay que tocar
 * cada comparación. Aquí las capacidades son datos y las pantallas preguntan.
 *
 * LOS LÍMITES SON DE LA BASE DE DATOS, NO DE AQUÍ. Cuántos equipos caben lo
 * dice `plans.max_teams`, y quien lo IMPONE es la política de RLS que cuenta
 * los equipos del club al insertar. Esto de aquí sirve para que la interfaz no
 * ofrezca lo que el servidor va a rechazar; esconder un botón nunca ha sido
 * autorización.
 *
 * NADA SE APAGA MIENTRAS NO SE PUEDA COMPRAR. Todavía no hay precio decidido,
 * así que ningún club puede contratar Pro ni Max. Cerrar hoy una capacidad
 * detrás de un plan que nadie puede pagar no es un incentivo: es una función
 * rota para todo el mundo. Por eso, mientras ningún plan sea contratable,
 * `puede()` dice que sí a todo — y el día que haya precios, el mismo código
 * empieza a distinguir sin tocar una sola pantalla.
 *
 * Y NO SE ANUNCIA LO QUE NO EXISTE. Cada capacidad dice si está construida.
 * Las que no lo están no se enseñan en la pantalla de planes: prometerlas para
 * vender un plan sería vender humo.
 */

import type { Plan, PlanTier, Subscription } from './billing';
import { planEfectivo, NIVELES } from './billing';

export type Capacidad =
  | 'plantilla'
  | 'asistencia'
  | 'disponibilidad'
  | 'entrenamientos'
  | 'ejercicios'
  | 'partidos'
  | 'calendario'
  | 'pizarra'
  | 'analiticas'
  | 'cuerpo-tecnico'
  /* De Pro en adelante */
  | 'pizarra-avanzada'
  | 'exportar-video'
  | 'analiticas-avanzadas'
  | 'informes'
  /* De Max en adelante */
  | 'panel-de-club'
  | 'analiticas-entre-equipos'
  | 'roles-y-permisos';

interface Ficha {
  /** Cómo se llama en la interfaz. */
  nombre: string;
  /** El plan más bajo que la trae. */
  desde: PlanTier;
  /**
   * Si está construida y funcionando HOY. Lo que está a `false` no aparece en
   * ninguna lista de plan: se añade aquí cuando se termina, no antes.
   */
  lista: boolean;
}

/**
 * El catálogo. Cambiar de plan una capacidad es mover una palabra en esta
 * tabla; no hay ningún otro sitio donde tocar.
 */
export const CAPACIDADES: Record<Capacidad, Ficha> = {
  plantilla: { nombre: 'Plantilla', desde: 'free', lista: true },
  asistencia: { nombre: 'Asistencia', desde: 'free', lista: true },
  disponibilidad: { nombre: 'Disponibilidad y lesiones', desde: 'free', lista: true },
  entrenamientos: { nombre: 'Entrenamientos', desde: 'free', lista: true },
  ejercicios: { nombre: 'Biblioteca de ejercicios', desde: 'free', lista: true },
  partidos: { nombre: 'Partidos y convocatorias', desde: 'free', lista: true },
  calendario: { nombre: 'Calendario', desde: 'free', lista: true },
  pizarra: { nombre: 'Pizarra táctica', desde: 'free', lista: true },
  analiticas: { nombre: 'Analíticas', desde: 'free', lista: true },
  'cuerpo-tecnico': { nombre: 'Cuerpo técnico', desde: 'free', lista: true },

  /* Aún por construir (fases G–J). No se anuncian todavía. */
  'pizarra-avanzada': { nombre: 'Pizarra táctica avanzada', desde: 'pro', lista: false },
  'exportar-video': { nombre: 'Exportar jugadas en vídeo', desde: 'pro', lista: false },
  'analiticas-avanzadas': { nombre: 'Analíticas avanzadas', desde: 'pro', lista: false },
  informes: { nombre: 'Informes', desde: 'pro', lista: false },

  'panel-de-club': { nombre: 'Panel del club', desde: 'max', lista: false },
  'analiticas-entre-equipos': { nombre: 'Analíticas entre equipos', desde: 'max', lista: false },
  'roles-y-permisos': { nombre: 'Roles y permisos', desde: 'max', lista: false },
};

const ORDEN: Record<PlanTier, number> = { free: 0, pro: 1, max: 2 };

/** ¿El plan `tier` llega a lo que pide `desde`? */
const alcanza = (tier: PlanTier, desde: PlanTier) => ORDEN[tier] >= ORDEN[desde];

export interface Permisos {
  /** El plan que rige ahora mismo (una prueba caducada vuelve a `free`). */
  nivel: PlanTier;
  /** Cuántos equipos caben. `null` es sin límite. */
  limiteDeEquipos: number | null;
  /** Cuántos hay. */
  equipos: number;
  /** ¿Se puede usar esta capacidad? */
  puede: (c: Capacidad) => boolean;
  /** ¿Cabe otro equipo? Lo decide igualmente el servidor. */
  puedeCrearEquipo: () => boolean;
  /** El plan más barato que trae esta capacidad, o `null` si ya la tiene. */
  planQueLaTrae: (c: Capacidad) => PlanTier | null;
  /** Lo que trae un plan y ya está construido, para enseñarlo en una lista. */
  loQueTrae: (tier: PlanTier) => string[];
  /**
   * Si hoy se puede contratar algo. Mientras sea `false`, `puede()` dice que
   * sí a todo: no se cierra una puerta que no tiene llave a la venta.
   */
  hayQueVender: boolean;
}

export function permisosDe(
  planes: Plan[],
  suscripcion: Subscription | null,
  equipos: number,
): Permisos {
  const nivel = planEfectivo(suscripcion);
  const hayQueVender = planes.some((p) => p.contratable);
  const limiteDeEquipos = planes.find((p) => p.tier === nivel)?.maxTeams ?? null;

  const puede = (c: Capacidad) => !hayQueVender || alcanza(nivel, CAPACIDADES[c].desde);

  return {
    nivel,
    limiteDeEquipos,
    equipos,
    puede,
    puedeCrearEquipo: () => limiteDeEquipos === null || equipos < limiteDeEquipos,
    planQueLaTrae: (c) => (puede(c) ? null : CAPACIDADES[c].desde),
    loQueTrae: (tier) =>
      (Object.keys(CAPACIDADES) as Capacidad[])
        .filter((c) => CAPACIDADES[c].lista && CAPACIDADES[c].desde === tier)
        .map((c) => CAPACIDADES[c].nombre),
    hayQueVender,
  };
}

/** Todo lo que trae un plan contando lo que hereda de los de debajo. */
export function todoLoQueTrae(tier: PlanTier): string[] {
  return (Object.keys(CAPACIDADES) as Capacidad[])
    .filter((c) => CAPACIDADES[c].lista && alcanza(tier, CAPACIDADES[c].desde))
    .map((c) => CAPACIDADES[c].nombre);
}

/**
 * Lo que este plan añade y el anterior no tenía. Es lo honesto de enseñar al
 * comparar: repetir debajo de Pro las diez líneas que ya están en Gratis
 * obliga a leerlas dos veces para descubrir que son las mismas.
 */
export function loQueFalta(tier: PlanTier): string[] {
  return (Object.keys(CAPACIDADES) as Capacidad[])
    .filter((c) => CAPACIDADES[c].lista && CAPACIDADES[c].desde === tier)
    .map((c) => CAPACIDADES[c].nombre);
}

/** El plan siguiente, si lo hay. Para «¿quieres más?». */
export function siguienteNivel(tier: PlanTier): PlanTier | null {
  const i = NIVELES.indexOf(tier);
  return i >= 0 && i < NIVELES.length - 1 ? NIVELES[i + 1] : null;
}
