/**
 * Inscripciones: el formulario que el club publica y la familia rellena.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * DOS MUNDOS EN UN ARCHIVO, Y CONVIENE VER LA FRONTERA. Abajo hay dos objetos
 * y no es casualidad:
 *
 *   · `publico`  — lo que usa la familia, SIN CUENTA. Llama a dos funciones de
 *                  la base de datos y a ninguna tabla. Si alguien cambiara
 *                  esto por un `select` a `enrollments`, no funcionaría: el
 *                  rol anónimo no tiene permiso sobre esa tabla, a propósito.
 *   · `club`     — lo que usa quien administra. Aquí sí hay tablas, y lo que
 *                  decide qué filas se ven es la política de RLS, no este
 *                  archivo.
 *
 * NO HAY UNA TERCERA PUERTA. Todo lo que escribe la familia pasa por
 * `enviar_inscripcion`, que vuelve a comprobar en el servidor lo mismo que
 * comprueba el navegador. Validar en el cliente sirve para avisar antes de
 * enviar; no sirve para nada más, porque quien envía puede no ser el cliente.
 */

import { supabase } from './supabase';

/* ═══════════════════════════════════════════════════════════════════════════
   LO QUE EL CLUB PIDE
   ═══════════════════════════════════════════════════════════════════════════ */

export type TipoDeCampo = 'texto' | 'texto-largo' | 'numero' | 'fecha' | 'opcion' | 'si-no';

export interface Campo {
  id: string;
  label: string;
  tipo: TipoDeCampo;
  obligatorio: boolean;
  /** Sólo para `opcion`. */
  opciones?: string[];
  /** Una línea de ayuda debajo, cuando la pregunta no se explica sola. */
  ayuda?: string;
}

export interface DocumentoPedido {
  id: string;
  label: string;
  obligatorio: boolean;
  ayuda?: string;
}

export interface Consentimiento {
  id: string;
  label: string;
  /** El texto largo, el que de verdad dice a qué se compromete quien firma. */
  texto?: string;
  obligatorio: boolean;
}

/* ═══════════════════════════════════════════════════════════════════════════
   LO QUE VE LA FAMILIA
   ═══════════════════════════════════════════════════════════════════════════ */

export interface FormularioPublico {
  abierto: boolean;
  /** Por qué no, en castellano, cuando `abierto` es falso. */
  motivo: string | null;
  titulo: string | null;
  intro: string | null;
  temporada: string | null;
  clubNombre: string | null;
  clubEscudo: string | null;
  campos: Campo[];
  documentos: DocumentoPedido[];
  consentimientos: Consentimiento[];
}

/** Lo que la familia escribe. Los fijos son columnas; el resto, respuestas. */
export interface Respuesta {
  player_name: string;
  player_birth_date: string;
  player_doc: string;
  player_sex: '' | 'F' | 'M' | 'X';
  guardian_name: string;
  guardian_doc: string;
  guardian_email: string;
  guardian_phone: string;
  guardian_relation: string;
  address: string;
  postal_code: string;
  city: string;
  respuestas: Record<string, string>;
  consentimientos: Record<string, string>;
}

export const respuestaVacia = (): Respuesta => ({
  player_name: '', player_birth_date: '', player_doc: '', player_sex: '',
  guardian_name: '', guardian_doc: '', guardian_email: '', guardian_phone: '',
  guardian_relation: '', address: '', postal_code: '', city: '',
  respuestas: {}, consentimientos: {},
});

/* ═══════════════════════════════════════════════════════════════════════════
   LO QUE VE EL CLUB
   ═══════════════════════════════════════════════════════════════════════════ */

export type EstadoFormulario = 'borrador' | 'abierta' | 'cerrada';
export type EstadoInscripcion = 'recibida' | 'aprobada' | 'rechazada';

export interface Formulario {
  id: string;
  clubId: string;
  teamId: string | null;
  feePlanId: string | null;
  titulo: string;
  intro: string | null;
  temporada: string | null;
  token: string;
  estado: EstadoFormulario;
  abreEl: string | null;
  cierraEl: string | null;
  topePlazas: number | null;
  campos: Campo[];
  documentos: DocumentoPedido[];
  consentimientos: Consentimiento[];
  publicadoEl: string | null;
  creadoEl: string;
  /** Contadas aparte: la tabla no las guarda. */
  recibidas?: number;
  aprobadas?: number;
}

export interface Inscripcion {
  id: string;
  formId: string;
  codigo: string;
  estado: EstadoInscripcion;
  jugador: string;
  nacimiento: string | null;
  documento: string | null;
  sexo: string | null;
  tutor: string;
  tutorDoc: string | null;
  tutorCorreo: string;
  tutorTelefono: string | null;
  parentesco: string | null;
  direccion: string | null;
  codigoPostal: string | null;
  poblacion: string | null;
  respuestas: Record<string, string>;
  consentimientos: Record<string, string>;
  playerId: string | null;
  revisadaEl: string | null;
  notaRevision: string | null;
  creadaEl: string;
  documentos?: Documento[];
}

export interface Documento {
  id: string;
  kind: string;
  filename: string;
  mime: string;
  bytes: number;
  subidoEl: string;
  /** LA RUTA QUE GUARDÓ EL SERVIDOR, no una reconstruida aquí. La primera
      versión la rehacía en el cliente con `club/inscripcion/kind.ext`,
      copiando el formato que usa la función de subida: dos sitios que tienen
      que decir lo mismo para siempre, y el día que cambie uno se rompe el
      otro en silencio. La ruta ya está en la fila; se lee. */
  ruta: string;
}

/* ═══════════════════════════════════════════════════════════════════════════
   DE FILA A OBJETO
   ═══════════════════════════════════════════════════════════════════════════ */

/* Un jsonb puede venir con lo que sea: lo guardó alguien, no un tipo de
   TypeScript. Si no es la forma que se espera, se devuelve vacío en vez de
   dejar que la pantalla intente recorrer un número. */
const comoLista = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
const comoMapa = (v: unknown): Record<string, string> =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, string>) : {};

const aFormulario = (r: Record<string, unknown>): Formulario => ({
  id: r.id as string,
  clubId: r.club_id as string,
  teamId: (r.team_id as string) ?? null,
  feePlanId: (r.fee_plan_id as string) ?? null,
  titulo: r.title as string,
  intro: (r.intro as string) ?? null,
  temporada: (r.season as string) ?? null,
  token: r.token as string,
  estado: r.status as EstadoFormulario,
  abreEl: (r.opens_at as string) ?? null,
  cierraEl: (r.closes_at as string) ?? null,
  topePlazas: (r.max_submissions as number) ?? null,
  campos: comoLista<Campo>(r.campos),
  documentos: comoLista<DocumentoPedido>(r.documentos),
  consentimientos: comoLista<Consentimiento>(r.consentimientos),
  publicadoEl: (r.published_at as string) ?? null,
  creadoEl: r.created_at as string,
});

const aInscripcion = (r: Record<string, unknown>): Inscripcion => ({
  id: r.id as string,
  formId: r.form_id as string,
  codigo: r.codigo as string,
  estado: r.status as EstadoInscripcion,
  jugador: r.player_name as string,
  nacimiento: (r.player_birth_date as string) ?? null,
  documento: (r.player_doc as string) ?? null,
  sexo: (r.player_sex as string) ?? null,
  tutor: r.guardian_name as string,
  tutorDoc: (r.guardian_doc as string) ?? null,
  tutorCorreo: r.guardian_email as string,
  tutorTelefono: (r.guardian_phone as string) ?? null,
  parentesco: (r.guardian_relation as string) ?? null,
  direccion: (r.address as string) ?? null,
  codigoPostal: (r.postal_code as string) ?? null,
  poblacion: (r.city as string) ?? null,
  respuestas: comoMapa(r.respuestas),
  consentimientos: comoMapa(r.consentimientos),
  playerId: (r.player_id as string) ?? null,
  revisadaEl: (r.reviewed_at as string) ?? null,
  notaRevision: (r.review_note as string) ?? null,
  creadaEl: r.created_at as string,
  documentos: Array.isArray(r.enrollment_documents)
    ? (r.enrollment_documents as Record<string, unknown>[]).map((d) => ({
        id: d.id as string,
        kind: d.kind as string,
        ruta: d.storage_path as string,
        filename: d.filename as string,
        mime: d.mime as string,
        bytes: d.size_bytes as number,
        subidoEl: d.uploaded_at as string,
      }))
    : undefined,
});

/* ═══════════════════════════════════════════════════════════════════════════
   LA PUERTA PÚBLICA
   ═══════════════════════════════════════════════════════════════════════════ */

export const publico = {
  /** Lo que hace falta para pintar el formulario. Nada del club. */
  async formulario(token: string): Promise<FormularioPublico> {
    const { data, error } = await supabase
      .rpc('formulario_de_inscripcion', { p_token: token })
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      return {
        abierto: false, motivo: 'Este enlace no existe.',
        titulo: null, intro: null, temporada: null, clubNombre: null, clubEscudo: null,
        campos: [], documentos: [], consentimientos: [],
      };
    }
    const r = data as Record<string, unknown>;
    return {
      abierto: Boolean(r.abierto),
      motivo: (r.motivo as string) ?? null,
      titulo: (r.titulo as string) ?? null,
      intro: (r.intro as string) ?? null,
      temporada: (r.temporada as string) ?? null,
      clubNombre: (r.club_nombre as string) ?? null,
      clubEscudo: (r.club_escudo as string) ?? null,
      campos: comoLista<Campo>(r.campos),
      documentos: comoLista<DocumentoPedido>(r.documentos),
      consentimientos: comoLista<Consentimiento>(r.consentimientos),
    };
  },

  /** Guardar. Devuelve el id —para colgar los documentos— y el justificante. */
  async enviar(token: string, datos: Respuesta): Promise<{ id: string; codigo: string }> {
    const { data, error } = await supabase
      .rpc('enviar_inscripcion', { p_token: token, p_datos: datos })
      .maybeSingle();
    if (error) throw error;
    const r = (data ?? {}) as Record<string, unknown>;
    return { id: r.inscripcion_id as string, codigo: r.justificante as string };
  },

  /**
   * Subir un documento.
   *
   * NO VA A SUPABASE: va a una función de Netlify. El cubo es privado y no
   * tiene política de subida para el rol anónimo, así que desde aquí no se
   * puede escribir en él —y es justo lo que se quiere—. La función es la que
   * tiene la clave de servicio y la que comprueba el tamaño, el tipo y que la
   * inscripción exista.
   */
  async subirDocumento(
    inscripcionId: string, token: string, kind: string, archivo: File,
  ): Promise<void> {
    const cuerpo = new FormData();
    cuerpo.append('inscripcion', inscripcionId);
    cuerpo.append('token', token);
    cuerpo.append('kind', kind);
    cuerpo.append('archivo', archivo);
    const r = await fetch('/.netlify/functions/subir-documento', { method: 'POST', body: cuerpo });
    if (!r.ok) {
      const t = await r.json().catch(() => ({}));
      throw new Error((t as { error?: string }).error ?? 'No hemos podido guardar el archivo.');
    }
  },
};

/* ═══════════════════════════════════════════════════════════════════════════
   LO QUE USA EL CLUB
   ═══════════════════════════════════════════════════════════════════════════ */

export const club = {
  async formularios(clubId: string): Promise<Formulario[]> {
    const { data, error } = await supabase
      .from('enrollment_forms')
      .select('*, enrollments(status)')
      .eq('club_id', clubId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map((r) => {
      const f = aFormulario(r as Record<string, unknown>);
      const hijas = Array.isArray((r as Record<string, unknown>).enrollments)
        ? ((r as Record<string, unknown>).enrollments as { status: string }[])
        : [];
      f.recibidas = hijas.filter((h) => h.status === 'recibida').length;
      f.aprobadas = hijas.filter((h) => h.status === 'aprobada').length;
      return f;
    });
  },

  async crear(f: {
    clubId: string; teamId: string | null; feePlanId: string | null;
    titulo: string; intro: string; temporada: string;
    cierraEl: string | null; topePlazas: number | null;
    campos: Campo[]; documentos: DocumentoPedido[]; consentimientos: Consentimiento[];
  }): Promise<Formulario> {
    const { data, error } = await supabase
      .from('enrollment_forms')
      .insert({
        club_id: f.clubId,
        team_id: f.teamId,
        fee_plan_id: f.feePlanId,
        title: f.titulo.trim(),
        intro: f.intro.trim() || null,
        season: f.temporada.trim() || null,
        closes_at: f.cierraEl,
        max_submissions: f.topePlazas,
        campos: f.campos,
        documentos: f.documentos,
        consentimientos: f.consentimientos,
      })
      .select('*')
      .single();
    if (error) throw error;
    return aFormulario(data as Record<string, unknown>);
  },

  /** Publicar y cerrar. El disparador de la base firma quién y cuándo. */
  async cambiarEstado(id: string, estado: EstadoFormulario): Promise<void> {
    const { error } = await supabase
      .from('enrollment_forms').update({ status: estado }).eq('id', id);
    if (error) throw error;
  },

  async inscripciones(clubId: string, formId?: string): Promise<Inscripcion[]> {
    let q = supabase
      .from('enrollments')
      .select('*, enrollment_documents(id, kind, storage_path, filename, mime, size_bytes, uploaded_at)')
      .eq('club_id', clubId);
    if (formId) q = q.eq('form_id', formId);
    const { data, error } = await q.order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map((r) => aInscripcion(r as Record<string, unknown>));
  },

  /** Aprobar crea el jugador y emite el recibo, en una sola transacción. */
  async aprobar(id: string, teamId: string | null, nota: string): Promise<string> {
    const { data, error } = await supabase.rpc('aprobar_inscripcion', {
      p_enrollment: id, p_team: teamId, p_nota: nota.trim() || null,
    });
    if (error) throw error;
    return data as string;
  },

  async rechazar(id: string, nota: string): Promise<void> {
    const { error } = await supabase.rpc('rechazar_inscripcion', {
      p_enrollment: id, p_nota: nota.trim(),
    });
    if (error) throw error;
  },

  /**
   * Una dirección para VER un documento, válida un rato.
   *
   * No se guarda en ninguna parte: una URL firmada caduca, y guardar algo que
   * deja de servir es peor que no guardarlo. Se pide cuando hace falta.
   */
  async verDocumento(storagePath: string): Promise<string> {
    const { data, error } = await supabase.storage
      .from('inscripciones').createSignedUrl(storagePath, 120);
    if (error) throw error;
    return data.signedUrl;
  },
};

/* ═══════════════════════════════════════════════════════════════════════════
   LO QUE SE PIDE POR DEFECTO
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Un formulario recién creado no sale en blanco.
 *
 * POR QUÉ IMPORTA. Si saliera vacío, el club publicaría un formulario que no
 * pide el consentimiento de tratamiento de datos de un menor, y entonces el
 * problema no es de diseño: no hay base legal para guardar nada de lo que
 * entre. Sale puesto, y el club quita lo que no quiera —menos el primero, que
 * la pantalla no deja borrar—.
 */
export const CONSENTIMIENTOS_POR_DEFECTO: Consentimiento[] = [
  {
    id: 'datos',
    label: 'Tratamiento de los datos del jugador',
    texto:
      'Autorizo al club a tratar los datos de esta ficha para gestionar la '
      + 'inscripción, la actividad deportiva y el cobro de la cuota. Puedo '
      + 'retirar esta autorización y pedir acceso, rectificación o supresión '
      + 'escribiendo al club.',
    obligatorio: true,
  },
  {
    id: 'imagen',
    label: 'Uso de imagen',
    texto:
      'Autorizo al club a publicar fotografías o vídeos en los que aparezca el '
      + 'jugador, en sus canales y para informar de la actividad deportiva. '
      + 'Esta autorización es voluntaria y no condiciona la inscripción.',
    obligatorio: false,
  },
];

export const DOCUMENTOS_HABITUALES: DocumentoPedido[] = [
  { id: 'dni-jugador', label: 'DNI o libro de familia del jugador', obligatorio: true },
  { id: 'dni-tutor', label: 'DNI del padre, madre o tutor', obligatorio: true },
  { id: 'foto', label: 'Foto reciente del jugador', obligatorio: false,
    ayuda: 'Para la ficha de la plantilla y, si hace falta, la federativa.' },
  { id: 'tarjeta-sanitaria', label: 'Tarjeta sanitaria', obligatorio: false },
];

/** Cuánto pesa, dicho como lo diría una persona. */
export const peso = (bytes: number): string =>
  bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

/** Las extensiones que acepta el cubo. Repetido aquí para avisar ANTES de subir. */
export const MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'];
export const TOPE_BYTES = 10 * 1024 * 1024;
