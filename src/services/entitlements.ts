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
  | 'valoraciones'
  /* De Pro en adelante */
  | 'pizarra-avanzada'
  | 'exportar-video'
  /* De Max en adelante */
  | 'cuerpo-tecnico'
  | 'analiticas-avanzadas'
  | 'comparativas'
  | 'informes'
  | 'historial'
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

  /* LA TABLA EXISTE Y LA PANTALLA NO. `session_player_ratings` está creada,
     con su clave única por sesión y jugadora y su `check (rating between 1
     and 10)`, pero NINGUNA línea del código de la aplicación la lee ni la
     escribe: buscado «rating» en todo `src/` y no aparece una sola vez. Así
     que esto todavía no se puede usar, y por eso va a `lista: false`. Se
     pondrá a `true` el día que haya dónde meter la nota, no antes. */
  valoraciones: { nombre: 'Evaluaciones de jugadoras (1–10)', desde: 'free', lista: false },

  /* Ya construidas: trayectorias a mano alzada y exportación de vídeo. */
  'pizarra-avanzada': { nombre: 'Trayectorias a mano alzada', desde: 'pro', lista: true },
  'exportar-video': { nombre: 'Exportar jugadas en vídeo', desde: 'pro', lista: true },

  /* ── De Max en adelante ────────────────────────────────────────────────
     Encuadre comercial de octubre de 2026: Pro es un entrenador con su
     equipo; Max es un club con varios equipos y varias personas.

     OJO CON `cuerpo-tecnico`. Es la única de esta lista que está CONSTRUIDA
     y que hasta ahora venía en Gratis. Moverla aquí es una decisión
     comercial, no un arreglo: el día que se abra el cobro, un club en Gratis
     o en Pro dejará de poder tener dos entrenadores en el mismo equipo. Hoy
     no cambia nada —no hay nada contratable y `puede()` dice que sí a todo—
     y además ninguna pantalla llama todavía a `puede()`, así que esto sólo
     afecta a lo que se enseña en la comparativa de planes. Volver a dejarla
     en `free` es cambiar una palabra. */
  'cuerpo-tecnico': { nombre: 'Acceso para varios entrenadores', desde: 'max', lista: true },

  /* Aún por construir. No se anuncian en ninguna lista. */
  'analiticas-avanzadas': { nombre: 'Estadísticas avanzadas', desde: 'max', lista: false },
  comparativas: { nombre: 'Comparativas de rendimiento', desde: 'max', lista: false },
  informes: { nombre: 'Informes exportables en PDF', desde: 'max', lista: false },
  historial: { nombre: 'Historial completo de rendimiento', desde: 'max', lista: false },
  'panel-de-club': { nombre: 'Panel del club', desde: 'max', lista: false },
  'analiticas-entre-equipos': { nombre: 'Analíticas entre equipos', desde: 'max', lista: false },
  'roles-y-permisos': { nombre: 'Roles y permisos', desde: 'max', lista: false },

  /* NO ESTÁ AQUÍ, Y NO ES UN OLVIDO: «soporte prioritario». No es una
     capacidad del producto —no hay sistema de soporte de ninguna clase en
     este código— sino un compromiso de atender antes a quien paga. Eso lo
     promete una persona, no una tabla, y ponerlo en la lista de funciones
     sería vender algo que el programa no hace. */
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

/**
 * De qué plan es una capacidad HOY.
 *
 * Mientras no se pueda contratar nada, `puede()` deja usarlo todo —está
 * explicado arriba— y entonces enseñar «Trayectorias a mano alzada» como
 * ventaja de Pro sería vender una diferencia que no existe: la tiene todo el
 * mundo. Con `seVende` en falso, todo cuenta como Gratis, que es la verdad de
 * hoy. El día que haya precios, la tabla vuelve a mandar sin tocar nada.
 */
const nivelDeHoy = (c: Capacidad, seVende: boolean): PlanTier =>
  (seVende ? CAPACIDADES[c].desde : 'free');

const construidas = () => (Object.keys(CAPACIDADES) as Capacidad[]).filter((c) => CAPACIDADES[c].lista);

/** Todo lo que trae un plan contando lo que hereda de los de debajo. */
export function todoLoQueTrae(tier: PlanTier, seVende = true): string[] {
  return construidas()
    .filter((c) => alcanza(tier, nivelDeHoy(c, seVende)))
    .map((c) => CAPACIDADES[c].nombre);
}

/**
 * Lo que este plan añade y el anterior no tenía. Es lo honesto de enseñar al
 * comparar: repetir debajo de Pro las diez líneas que ya están en Gratis
 * obliga a leerlas dos veces para descubrir que son las mismas.
 */
export function loQueFalta(tier: PlanTier, seVende = true): string[] {
  return construidas()
    .filter((c) => nivelDeHoy(c, seVende) === tier)
    .map((c) => CAPACIDADES[c].nombre);
}

/** El plan siguiente, si lo hay. Para «¿quieres más?». */
export function siguienteNivel(tier: PlanTier): PlanTier | null {
  const i = NIVELES.indexOf(tier);
  return i >= 0 && i < NIVELES.length - 1 ? NIVELES[i + 1] : null;
}
