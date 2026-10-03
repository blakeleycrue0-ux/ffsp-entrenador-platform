/**
 * Clubes.
 * ---------------------------------------------------------------------------
 * Un club agrupa equipos, plantillas, ejercicios, jugadas y cuerpo técnico.
 * Quién pertenece a cuál lo decide el servidor: aquí sólo se consulta y se
 * pide. Crear un club y quedar como su administración es una sola operación
 * en la base de datos, para que nunca quede un club sin dueña.
 */

import { supabase } from './supabase';
import type { Club } from '@/types';

type Row = Record<string, unknown>;

const toClub = (r: Row, role?: Club['role']): Club => ({
  id: r.id as string,
  name: r.name as string,
  shortName: (r.short_name as string) || (r.name as string),
  city: (r.city as string) ?? undefined,
  season: (r.season as string) ?? undefined,
  crestUrl: (r.crest_url as string) ?? undefined,
  role,
});

export const CREATE_CLUB_ERROR: Record<string, string> = {
  sin_sesion: 'Entra con tu cuenta para crear un club.',
  sin_nombre: 'El club necesita un nombre.',
};

export const clubs = {
  /** Clubes a los que pertenece quien ha iniciado sesión, con su rol. */
  async mine(): Promise<Club[]> {
    const { data, error } = await supabase
      .from('club_members')
      .select('role, clubs(id, name, short_name, city, season, crest_url)')
      .order('created_at', { ascending: true });
    if (error) throw error;

    const out: Club[] = [];
    for (const r of (data ?? []) as Row[]) {
      const c = r.clubs as Row | null;
      if (c) out.push(toClub(c, r.role as Club['role']));
    }
    return out;
  },

  /**
   * Crea el club y añade a quien lo crea como administración, en el servidor.
   * Devuelve el club ya creado o el motivo por el que no se ha podido.
   */
  async create(name: string, shortName?: string): Promise<{ ok: true; club: Club } | { ok: false; error: string }> {
    const { data, error } = await supabase.rpc('create_club', {
      club_name: name.trim(),
      club_short_name: shortName?.trim() || null,
    });
    if (error) throw error;

    const raw = (data ?? {}) as Row;
    if (!raw.ok) {
      const code = (raw.error as string) ?? '';
      return { ok: false, error: CREATE_CLUB_ERROR[code] ?? 'No hemos podido crear el club.' };
    }
    return {
      ok: true,
      club: {
        id: raw.id as string,
        name: raw.name as string,
        shortName: (raw.short_name as string) || (raw.name as string),
        role: 'admin',
      },
    };
  },

  /** Cambiar el nombre, el nombre corto, la ciudad o la temporada. */
  async update(
    id: string,
    patch: Partial<Pick<Club, 'name' | 'shortName' | 'city' | 'season' | 'crestUrl'>>,
  ): Promise<Club> {
    const payload: Row = { updated_at: new Date().toISOString() };
    if (patch.name !== undefined) payload.name = patch.name.trim();
    if (patch.shortName !== undefined) payload.short_name = patch.shortName.trim() || patch.name?.trim();
    if (patch.city !== undefined) payload.city = patch.city.trim() || null;
    if (patch.season !== undefined) payload.season = patch.season.trim() || null;
    if (patch.crestUrl !== undefined) payload.crest_url = patch.crestUrl.trim() || null;

    const { data, error } = await supabase.from('clubs').update(payload).eq('id', id).select().single();
    if (error) throw error;
    return toClub(data as Row);
  },

  /**
   * Sube el escudo del club y devuelve su dirección pública.
   * ---------------------------------------------------------------------------
   * El archivo va a `escudos/<id del club>/<marca de tiempo>.<extensión>`, y de
   * esa carpeta sale el permiso: escribir ahí exige administrar ESE club, y lo
   * comprueba la base de datos, no esta función. Lo de aquí son avisos para que
   * el fallo se entienda antes de subir cuarenta megas por la red del campo;
   * quitarlos no abriría nada.
   *
   * La marca de tiempo en el nombre no es manía: con un nombre fijo, el escudo
   * nuevo se quedaría tapado por la copia en caché del navegador y del CDN, y
   * parecería que no se ha guardado.
   */
  async subirEscudo(clubId: string, archivo: File): Promise<string> {
    const TIPOS: Record<string, string> = {
      'image/png': 'png',
      'image/jpeg': 'jpg',
      'image/webp': 'webp',
    };
    const extension = TIPOS[archivo.type];
    if (!extension) {
      throw new Error('El escudo tiene que ser una imagen PNG, JPG o WEBP.');
    }
    if (archivo.size > 2 * 1024 * 1024) {
      throw new Error('La imagen pesa más de 2 MB. Prueba con una más pequeña.');
    }

    const ruta = `${clubId}/${Date.now()}.${extension}`;
    const { error } = await supabase.storage.from('escudos').upload(ruta, archivo, {
      contentType: archivo.type,
      cacheControl: '31536000',
      upsert: false,
    });
    if (error) throw error;

    const { data } = supabase.storage.from('escudos').getPublicUrl(ruta);
    return data.publicUrl;
  },

  /**
   * Quita el escudo. Primero se borra la referencia y luego se intenta borrar
   * el archivo: si lo segundo falla —permisos, red—, el club se queda sin
   * escudo igualmente, que es lo que se ha pedido. Al revés quedaría un club
   * apuntando a un archivo que ya no existe.
   */
  async quitarEscudo(clubId: string, urlActual?: string): Promise<Club> {
    const club = await this.update(clubId, { crestUrl: '' });
    const marca = '/escudos/';
    const i = urlActual?.indexOf(marca) ?? -1;
    if (urlActual && i >= 0) {
      const ruta = urlActual.slice(i + marca.length);
      if (ruta.startsWith(`${clubId}/`)) {
        await supabase.storage.from('escudos').remove([ruta]).catch(() => undefined);
      }
    }
    return club;
  },

  /** El club al que pertenece un equipo, si lo tiene. */
  async ofTeam(teamId: string): Promise<Club | null> {
    const { data, error } = await supabase
      .from('teams')
      .select('clubs(id, name, short_name, city, season, crest_url)')
      .eq('id', teamId)
      .maybeSingle();
    if (error) throw error;
    const c = (data as Row | null)?.clubs as Row | null | undefined;
    return c ? toClub(c) : null;
  },
};
