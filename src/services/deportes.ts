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
  convocatoria: number | null;
  enJuego: number | null;
  minutos: number | null;
}

type Fila = {
  code: string; name: string;
  player_noun: string; player_noun_pl: string;
  match_noun: string; match_noun_pl: string;
  positions: string[] | null;
  squad_size: number | null; on_field: number | null; match_minutes: number | null;
};

const deFila = (r: Fila): Deporte => ({
  code: r.code,
  name: r.name,
  jugador: r.player_noun,
  jugadores: r.player_noun_pl,
  partido: r.match_noun,
  partidos: r.match_noun_pl,
  posiciones: r.positions ?? [],
  convocatoria: r.squad_size,
  enJuego: r.on_field,
  minutos: r.match_minutes,
});

let enMemoria: Deporte[] | null = null;

export async function deportes(): Promise<Deporte[]> {
  if (enMemoria) return enMemoria;
  const { data, error } = await supabase
    .from('sports')
    .select('code, name, player_noun, player_noun_pl, match_noun, match_noun_pl, positions, squad_size, on_field, match_minutes')
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
