/**
 * Los deportes, leídos de la base y no escritos aquí.
 * ---------------------------------------------------------------------------
 * La tabla `sports` es la que manda: nombres, posiciones, convocatoria y
 * minutos. Este archivo sólo la trae y la guarda en memoria mientras dura la
 * pestaña, porque es configuración que no cambia entre pantalla y pantalla.
 *
 * NO HAY UNA LISTA DE RESPALDO ESCRITA AQUÍ. Si la consulta falla, se
 * devuelve vacío y quien llama decide qué decir. Una copia a mano sería una
 * segunda verdad que se desincroniza en silencio: justo lo que esta tabla
 * viene a evitar.
 */

import { supabase } from './supabase';

/**
 * Una línea: el grupo de posiciones que se enseña con un mismo color.
 *
 * El COLOR NO VIENE DE AQUÍ, viene del orden. La paleta tiene cuatro colores
 * de posición y la interfaz coge el que toca por el índice; por eso ninguna
 * lista de la tabla pasa de cuatro. Guardar el color en la base sería meter
 * el diseño dentro de los datos.
 */
export interface Linea {
  id: string;
  label: string;
  posiciones: string[];
}

export interface Deporte {
  code: string;
  name: string;
  /** Cómo llamar a quien juega, en singular y en plural. */
  jugador: string;
  jugadores: string;
  /** Cómo llamar a un encuentro. */
  partido: string;
  partidos: string;
  posiciones: string[];
  /** Vacío en los deportes que no tienen puestos, como natación. */
  lineas: Linea[];
  convocatoria: number | null;
  enJuego: number | null;
  minutos: number | null;
}

type FilaLinea = { id?: unknown; label?: unknown; positions?: unknown };

type Fila = {
  code: string; name: string;
  player_noun: string; player_noun_pl: string;
  match_noun: string; match_noun_pl: string;
  positions: string[] | null;
  lines: FilaLinea[] | null;
  squad_size: number | null; on_field: number | null; match_minutes: number | null;
};

/* La columna es `jsonb`, así que lo que llegue puede ser cualquier cosa: se
   admite sólo lo que tenga las tres piezas y se tira el resto en silencio.
   Una línea a medias pintaría una etiqueta sin nombre. */
const deLinea = (l: FilaLinea): Linea | null =>
  typeof l?.id === 'string' && typeof l?.label === 'string' && Array.isArray(l?.positions)
    ? { id: l.id, label: l.label, posiciones: (l.positions as unknown[]).filter((p): p is string => typeof p === 'string') }
    : null;

const deFila = (r: Fila): Deporte => ({
  code: r.code,
  name: r.name,
  jugador: r.player_noun,
  jugadores: r.player_noun_pl,
  partido: r.match_noun,
  partidos: r.match_noun_pl,
  posiciones: r.positions ?? [],
  lineas: (r.lines ?? []).map(deLinea).filter((l): l is Linea => l !== null),
  convocatoria: r.squad_size,
  enJuego: r.on_field,
  minutos: r.match_minutes,
});

let enMemoria: Deporte[] | null = null;

export async function deportes(): Promise<Deporte[]> {
  if (enMemoria) return enMemoria;
  const { data, error } = await supabase
    .from('sports')
    .select('code, name, player_noun, player_noun_pl, match_noun, match_noun_pl, positions, lines, squad_size, on_field, match_minutes')
    .order('orden');
  if (error || !data) return [];
  enMemoria = (data as Fila[]).map(deFila);
  return enMemoria;
}

/** El deporte por defecto mientras no se elige otro. */
export const FUTBOL = 'futbol';

/**
 * Apunta el deporte en el club y en su equipo.
 *
 * VA DESPUÉS DE CREARLOS, y no dentro: el club nace con una función de la
 * base (`create_club`) que no recibe el deporte, y cambiarla sería tocar algo
 * que ya funciona para todo el mundo. Dos actualizaciones pequeñas hacen lo
 * mismo sin arriesgar el alta.
 *
 * NO LANZA. Si falla, el club y el equipo ya están creados y en fútbol, que
 * es el valor por defecto de la columna: se puede cambiar después en ajustes.
 * Tumbar un alta terminada por no haber podido guardar una preferencia sería
 * desproporcionado.
 */
export async function apuntaDeporte(clubId: string, teamId: string | null, code: string): Promise<void> {
  if (!code || code === FUTBOL) return;
  try {
    await supabase.from('clubs').update({ sport: code }).eq('id', clubId);
    if (teamId) await supabase.from('teams').update({ sport: code }).eq('id', teamId);
  } catch {
    /* En silencio, a propósito. Ver arriba. */
  }
}

/**
 * EL DEPORTE DE RESERVA, que no es fútbol.
 * ---------------------------------------------------------------------------
 * Si la consulta a `sports` falla —sin red, un permiso mal puesto—, la
 * aplicación tiene que seguir pintándose. Lo que NO puede hacer es ponerse a
 * hablar de porteros y delanteros por su cuenta: eso sería la lista de fútbol
 * escrita a mano que esta tabla vino a quitar, y a un club de natación le
 * saldrían puestos de fútbol de la nada.
 *
 * Así que la reserva no tiene posiciones ni líneas, y llama a las cosas por
 * su nombre genérico. Sin posiciones, la ficha enseña el campo vacío y la
 * plantilla no enseña filtros de línea: se ve menos, pero nada es falso.
 */
export const DEPORTE_DE_RESERVA: Deporte = {
  code: 'otro',
  name: 'Deporte',
  jugador: 'deportista',
  jugadores: 'deportistas',
  partido: 'competición',
  partidos: 'competiciones',
  posiciones: [],
  lineas: [],
  convocatoria: null,
  enJuego: null,
  minutos: null,
};

/**
 * El deporte de un equipo, o el de su club si el equipo no lo dice.
 *
 * Devuelve la reserva —no fútbol— cuando no se encuentra el código: un
 * código desconocido significa que esta versión del programa no sabe de qué
 * deporte se trata, y en ese caso callarse es mejor que suponer.
 */
export function deporteDe(
  catalogo: Deporte[],
  code: string | null | undefined,
): Deporte {
  return catalogo.find((d) => d.code === code) ?? DEPORTE_DE_RESERVA;
}

/**
 * La línea a la que pertenece una posición, con su índice para el color.
 *
 * TOLERA LA GRAFÍA VIEJA. Durante un tiempo el formulario guardó «Lateral
 * derecha» donde el catálogo dice «Lateral derecho», y la 0023 arregló lo
 * que había en la base; pero un dato traído de otro sitio, o escrito a mano
 * en una importación, puede volver a no coincidir por una tilde o por una
 * letra final. Antes de rendirse se compara sin tildes, sin mayúsculas y sin
 * la vocal final de cada palabra, que es exactamente donde estaba la
 * diferencia. Si aun así no cuadra, no se inventa una línea: no hay.
 */
const raiz = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .split(/[\s-]+/)
    .map((p) => p.replace(/[ao]$/, ''))
    .join(' ');

export function lineaDePosicion(
  deporte: Deporte,
  posicion: string | null | undefined,
): { linea: Linea; indice: number } | null {
  if (!posicion) return null;
  const i = deporte.lineas.findIndex((l) => l.posiciones.includes(posicion));
  if (i >= 0) return { linea: deporte.lineas[i], indice: i };

  const r = raiz(posicion);
  const j = deporte.lineas.findIndex((l) => l.posiciones.some((p) => raiz(p) === r));
  return j >= 0 ? { linea: deporte.lineas[j], indice: j } : null;
}
