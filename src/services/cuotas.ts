/**
 * CUOTAS: LO QUE PAGA CADA FAMILIA Y QUIÉN VA AL DÍA.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ESTO NO MUEVE DINERO. No hay pasarela, no hay banco y no hay domiciliación:
 * el club cobra como cobra —efectivo, transferencia, Bizum— y aquí se APUNTA
 * quién ha pagado. Es la hoja de cálculo del tesorero, con la diferencia de
 * que no se pierde y la ve todo el que tiene que verla.
 *
 * Decirlo importa porque la pantalla enseña importes y la palabra «pagado»:
 * quien la mire tiene que entender que ese «pagado» lo ha marcado una persona
 * y que nadie ha comprobado nada contra ninguna cuenta.
 *
 * ── DOS COSAS DISTINTAS ────────────────────────────────────────────────────
 *
 *   LA CUOTA (`Cuota`)   la regla: «35 € al mes, todo el club».
 *   EL RECIBO (`Recibo`) el hecho: «Ainhoa, octubre, 35 €, pagado el 3».
 *
 * El recibo lleva su propio importe COPIADO de la cuota al emitirlo. Si en
 * enero sube a 40, lo de octubre sigue siendo 35, porque eso es lo que se
 * cobró. Un histórico que se reescribe solo no es un histórico.
 *
 * ── «VENCIDO» SE CALCULA, NO SE GUARDA ─────────────────────────────────────
 *
 * En la base hay tres estados y ninguno es «vencido»: que lo esté se deduce
 * de la fecha. Aquí se calcula al vuelo, con el mismo criterio que la base
 * permitiría comprobar. Así no hace falta un proceso nocturno que cambie
 * filas, y nadie se encuentra con una pantalla que miente porque ese proceso
 * falló anoche.
 *
 * ── SÓLO ADMINISTRADORES, Y LO IMPONE EL SERVIDOR ──────────────────────────
 *
 * Las políticas de `fee_plans` y `fee_charges` piden `is_club_admin`. Esta
 * capa no comprueba nada de eso: si alguien sin permiso llama a estas
 * funciones, la base devuelve vacío o falla, que es como tiene que ser.
 * Esconder la pestaña es cortesía, no seguridad.
 */

import { supabase } from './supabase';

export type PeriodoCuota = 'mensual' | 'trimestral' | 'anual' | 'unica';
export type EstadoRecibo = 'pendiente' | 'pagado' | 'exento';
export type FormaDePago = 'efectivo' | 'transferencia' | 'bizum' | 'domiciliado' | 'otro';

export const PERIODO: Record<PeriodoCuota, { label: string; cada: string }> = {
  mensual: { label: 'Mensual', cada: 'al mes' },
  trimestral: { label: 'Trimestral', cada: 'al trimestre' },
  anual: { label: 'Anual', cada: 'al año' },
  unica: { label: 'Pago único', cada: 'una vez' },
};

export const FORMA_DE_PAGO: Record<FormaDePago, string> = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
  bizum: 'Bizum',
  domiciliado: 'Domiciliado',
  otro: 'Otro',
};

export interface Cuota {
  id: string;
  clubId: string;
  /** Nulo = la cuota es de todo el club. */
  teamId: string | null;
  nombre: string;
  /** Céntimos. Siempre céntimos: un euro con decimales en coma flotante acaba en 34,999999. */
  importe: number;
  periodo: PeriodoCuota;
  diaDeVencimiento: number | null;
  temporada: string | null;
  activa: boolean;
  notas: string;
}

export interface Recibo {
  id: string;
  clubId: string;
  cuotaId: string | null;
  jugadorId: string;
  concepto: string;
  importe: number;
  periodo: string;
  vence: string | null;
  estado: EstadoRecibo;
  pagadoEl: string | null;
  forma: FormaDePago | null;
  nota: string;
}

type Fila = Record<string, unknown>;

const aCuota = (r: Fila): Cuota => ({
  id: r.id as string,
  clubId: r.club_id as string,
  teamId: (r.team_id as string | null) ?? null,
  nombre: r.name as string,
  importe: (r.amount_cents as number) ?? 0,
  periodo: (r.period as PeriodoCuota) ?? 'mensual',
  diaDeVencimiento: (r.due_day as number | null) ?? null,
  temporada: (r.season as string | null) ?? null,
  activa: Boolean(r.active),
  notas: (r.notes as string) ?? '',
});

const aRecibo = (r: Fila): Recibo => ({
  id: r.id as string,
  clubId: r.club_id as string,
  cuotaId: (r.fee_plan_id as string | null) ?? null,
  jugadorId: r.player_id as string,
  concepto: r.concept as string,
  importe: (r.amount_cents as number) ?? 0,
  periodo: r.period_label as string,
  vence: (r.due_date as string | null) ?? null,
  estado: (r.status as EstadoRecibo) ?? 'pendiente',
  pagadoEl: (r.paid_at as string | null) ?? null,
  forma: (r.method as FormaDePago | null) ?? null,
  nota: (r.note as string) ?? '',
});

/** Un importe en euros, legible. Entra en céntimos y sale «35,00 €». */
export const euros = (centimos: number): string =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(centimos / 100);

/**
 * ¿Está vencido este recibo?
 *
 * Sólo lo pendiente puede vencer: lo exento no se debe y lo pagado ya está.
 * Y hace falta fecha: un recibo sin vencimiento no llega tarde nunca, porque
 * no hay a qué llegar.
 */
export const estaVencido = (r: Recibo, hoy = new Date()): boolean =>
  r.estado === 'pendiente' && r.vence !== null && r.vence < hoy.toISOString().slice(0, 10);

/**
 * La etiqueta de un periodo mensual: `2026-10`.
 *
 * Se guarda así y no «octubre de 2026» porque es lo que ordena bien al
 * compararlo como texto, y la palabra se pone al pintarlo.
 */
export const periodoDelMes = (d = new Date()): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/** `2026-10` → «octubre de 2026». Lo que no reconoce lo devuelve tal cual. */
export function periodoEnPalabras(p: string): string {
  const m = p.match(/^(\d{4})-(\d{2})$/);
  if (!m) return p;
  const mes = MESES[Number(m[2]) - 1];
  return mes ? `${mes} de ${m[1]}` : p;
}

/** El mes anterior y el siguiente, para moverse por los periodos. */
export function periodoVecino(p: string, pasos: number): string {
  const m = p.match(/^(\d{4})-(\d{2})$/);
  if (!m) return p;
  const d = new Date(Number(m[1]), Number(m[2]) - 1 + pasos, 1);
  return periodoDelMes(d);
}

/** Lo que se debe, lo que se ha cobrado y cuánta gente falta. */
export interface Resumen {
  cobrado: number;
  pendiente: number;
  vencido: number;
  /** Cuántos recibos hay en cada estado. */
  pagados: number;
  pendientes: number;
  exentos: number;
  conRetraso: number;
}

export function resumen(recibos: Recibo[], hoy = new Date()): Resumen {
  const r: Resumen = {
    cobrado: 0, pendiente: 0, vencido: 0,
    pagados: 0, pendientes: 0, exentos: 0, conRetraso: 0,
  };
  for (const x of recibos) {
    if (x.estado === 'pagado') { r.cobrado += x.importe; r.pagados++; continue; }
    if (x.estado === 'exento') { r.exentos++; continue; }
    r.pendiente += x.importe;
    r.pendientes++;
    if (estaVencido(x, hoy)) { r.vencido += x.importe; r.conRetraso++; }
  }
  return r;
}

export const cuotas = {
  async listar(clubId: string): Promise<Cuota[]> {
    const { data, error } = await supabase
      .from('fee_plans').select('*').eq('club_id', clubId).order('created_at');
    if (error || !data) return [];
    return (data as Fila[]).map(aCuota);
  },

  async crear(c: Omit<Cuota, 'id' | 'activa'> & { activa?: boolean }): Promise<Cuota | null> {
    const { data, error } = await supabase.from('fee_plans').insert({
      club_id: c.clubId,
      team_id: c.teamId,
      name: c.nombre.trim(),
      amount_cents: c.importe,
      period: c.periodo,
      due_day: c.diaDeVencimiento,
      season: c.temporada,
      active: c.activa ?? true,
      notes: c.notas || null,
    }).select().single();
    if (error || !data) return null;
    return aCuota(data as Fila);
  },

  async cambiar(id: string, cambios: Partial<Cuota>): Promise<boolean> {
    const fila: Fila = { updated_at: new Date().toISOString() };
    if (cambios.nombre !== undefined) fila.name = cambios.nombre.trim();
    if (cambios.importe !== undefined) fila.amount_cents = cambios.importe;
    if (cambios.periodo !== undefined) fila.period = cambios.periodo;
    if (cambios.diaDeVencimiento !== undefined) fila.due_day = cambios.diaDeVencimiento;
    if (cambios.teamId !== undefined) fila.team_id = cambios.teamId;
    if (cambios.activa !== undefined) fila.active = cambios.activa;
    if (cambios.notas !== undefined) fila.notes = cambios.notas || null;
    const { error } = await supabase.from('fee_plans').update(fila).eq('id', id);
    return !error;
  },

  async borrar(id: string): Promise<boolean> {
    const { error } = await supabase.from('fee_plans').delete().eq('id', id);
    return !error;
  },
};

export const recibos = {
  /** Todos los de un periodo. Sin periodo, los de toda la temporada. */
  async listar(clubId: string, periodo?: string): Promise<Recibo[]> {
    let q = supabase.from('fee_charges').select('*').eq('club_id', clubId);
    if (periodo) q = q.eq('period_label', periodo);
    const { data, error } = await q.order('created_at');
    if (error || !data) return [];
    return (data as Fila[]).map(aRecibo);
  },

  /**
   * Emite los recibos de una cuota para un periodo.
   *
   * SE PUEDE PULSAR DOS VECES SIN MIEDO. La base tiene una clave única por
   * cuota, jugador y periodo, y aquí se usa `upsert` con `ignoreDuplicates`:
   * quien ya tiene recibo de octubre no recibe otro, y —esto es lo
   * importante— al que ya está PAGADO no se le toca nada. Sin eso, emitir
   * octubre por segunda vez borraría los cobros de octubre.
   *
   * Devuelve cuántos se han creado de verdad.
   */
  async emitir(
    cuota: Cuota,
    jugadores: { id: string }[],
    periodo: string,
    vence: string | null,
  ): Promise<number> {
    if (jugadores.length === 0) return 0;
    const filas = jugadores.map((j) => ({
      club_id: cuota.clubId,
      fee_plan_id: cuota.id,
      player_id: j.id,
      concept: cuota.nombre,
      amount_cents: cuota.importe,
      period_label: periodo,
      due_date: vence,
      status: 'pendiente' as const,
    }));
    const { data, error } = await supabase
      .from('fee_charges')
      .upsert(filas, { onConflict: 'fee_plan_id,player_id,period_label', ignoreDuplicates: true })
      .select('id');
    if (error) return 0;
    return data?.length ?? 0;
  },

  /**
   * Marca un recibo como pagado, o lo devuelve a pendiente.
   *
   * LA FECHA Y EL ESTADO VAN JUNTOS SIEMPRE, porque la base tiene una
   * restricción que lo exige: un «pendiente» con fecha de cobro puesta no
   * entra. Es a propósito —las cuentas no pueden decir dos cosas según dónde
   * se miren— y por eso aquí se escriben los dos campos a la vez.
   */
  async marcar(
    id: string,
    estado: EstadoRecibo,
    forma?: FormaDePago | null,
    nota?: string,
  ): Promise<boolean> {
    const { error } = await supabase.from('fee_charges').update({
      status: estado,
      paid_at: estado === 'pagado' ? new Date().toISOString() : null,
      method: estado === 'pagado' ? (forma ?? null) : null,
      note: nota ?? undefined,
      updated_at: new Date().toISOString(),
    }).eq('id', id);
    return !error;
  },

  async borrar(id: string): Promise<boolean> {
    const { error } = await supabase.from('fee_charges').delete().eq('id', id);
    return !error;
  },
};
