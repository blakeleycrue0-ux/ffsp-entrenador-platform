/**
 * CUOTAS: QUIÉN HA PAGADO Y QUIÉN NO.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * La pregunta que se hace un tesorero de club de base no es «¿cuál es el
 * estado de la tesorería?»: es «¿quién me falta por cobrar este mes?». Así
 * que la pantalla abre con un mes y una lista de nombres, y cada nombre se
 * marca de un toque.
 *
 * NO SE COBRA AQUÍ. No hay pasarela ni banco: el club cobra por donde cobra y
 * esto lo apunta. La pantalla lo dice en voz alta, porque enseñar importes y
 * la palabra «Pagado» sin aclararlo haría pensar que el dinero ha pasado por
 * algún sitio.
 *
 * ── LO QUE DECIDE LA FORMA DE LA PANTALLA ──────────────────────────────────
 *
 *  · UN MES CADA VEZ, con flechas. Una tabla de doce columnas por treinta
 *    jugadores no se usa en un móvil de pie en el campo, y nadie cobra el
 *    año entero de golpe.
 *  · EL RESUMEN ARRIBA, en tres cifras: cobrado, pendiente y cuánto de eso
 *    va con retraso. Es lo que se mira antes de empezar.
 *  · MARCAR ES UN TOQUE. Pagado / pendiente, sin diálogo. La forma de pago
 *    se puede detallar después; pedirla cada vez convertiría treinta cobros
 *    en treinta formularios.
 *  · NADA SE INVENTA. Si no hay cuota creada, no se enseña una lista vacía
 *    con ceros: se explica que hace falta crear una cuota y se ofrece. Y si
 *    un mes no tiene recibos emitidos, se dice, con el botón de emitirlos.
 *
 * ── «VENCIDO» NO ES UN ESTADO QUE ALGUIEN PONGA ────────────────────────────
 *
 * Se calcula de la fecha. Por eso un recibo puede estar pendiente y en rojo
 * sin que nadie haya tocado nada: ha pasado su día.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useClub } from '@/store/store';
import { isClubAdmin, visibleTeams } from '@/store/selectors';
import {
  Button, EmptyState, ErrorState, Field, Input, Modal, Panel, Select,
  SkeletonRows, StatTile, Tag,
} from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { useAnchura } from '@/components/layout/AppShell';
import { useDeporte } from '@/services/useDeporte';
import { cn } from '@/lib/utils';
import {
  cuotas as apiCuotas, recibos as apiRecibos,
  estaVencido, euros, FORMA_DE_PAGO, PERIODO, periodoDelMes, periodoEnPalabras,
  periodoVecino, resumen,
  type Cuota, type FormaDePago, type PeriodoCuota, type Recibo,
} from '@/services/cuotas';

export default function CuotasPage() {
  useAnchura('tabla');
  const { data } = useClub();
  const toast = useToast();
  const deporte = useDeporte();
  const admin = isClubAdmin(data);
  const clubId = data.club?.id ?? null;
  const equipos = visibleTeams(data);

  const [periodo, setPeriodo] = useState(() => periodoDelMes());
  const [lista, setLista] = useState<Cuota[] | null>(null);
  const [recibosDelMes, setRecibos] = useState<Recibo[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nueva, setNueva] = useState<Borrador | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [detalle, setDetalle] = useState<Recibo | null>(null);

  const cargar = useCallback(() => {
    if (!clubId) { setLista([]); setRecibos([]); return; }
    setError(null);
    Promise.all([apiCuotas.listar(clubId), apiRecibos.listar(clubId, periodo)])
      .then(([c, r]) => { setLista(c); setRecibos(r); })
      .catch(() => setError('No se han podido cargar las cuotas.'));
  }, [clubId, periodo]);

  useEffect(cargar, [cargar]);

  const activas = (lista ?? []).filter((c) => c.activa);
  const cuentas = useMemo(() => resumen(recibosDelMes ?? []), [recibosDelMes]);

  /* El nombre de cada jugador, para no buscarlo en cada fila. */
  const nombreDe = useMemo(() => {
    const m = new Map(data.players.map((p) => [p.id, p.shortName || p.name]));
    return (id: string) => m.get(id) ?? 'Jugador dado de baja';
  }, [data.players]);

  /* ── Emitir los recibos de un mes ──────────────────────────────────────
     Los jugadores son los del equipo de la cuota, o los de todo el club si
     la cuota no tiene equipo. Los dados de baja no entran: a quien ya no
     está no se le cobra. */
  const emitir = async (c: Cuota) => {
    const destinatarios = data.players.filter((p) =>
      !p.archivedAt && (c.teamId === null || p.teamId === c.teamId));
    if (destinatarios.length === 0) {
      toast.error('No hay a quién cobrar', `Esa cuota no tiene ningún ${deporte.jugador} detrás.`);
      return;
    }
    setOcupado(true);
    const vence = c.diaDeVencimiento
      ? `${periodo}-${String(c.diaDeVencimiento).padStart(2, '0')}`
      : null;
    const hechos = await apiRecibos.emitir(c, destinatarios, periodo, vence);
    setOcupado(false);
    if (hechos === 0) {
      toast.info('Ya estaban', `Los recibos de ${periodoEnPalabras(periodo)} ya estaban emitidos.`);
    } else {
      toast.success('Recibos emitidos', `${hechos} de ${periodoEnPalabras(periodo)}.`);
    }
    cargar();
  };

  const marcar = async (r: Recibo, pagado: boolean) => {
    const antes = recibosDelMes ?? [];
    /* Se pinta antes de que conteste el servidor: treinta cobros seguidos
       con medio segundo de espera cada uno no se hacen. Si falla, se
       devuelve la lista como estaba y se dice. */
    setRecibos(antes.map((x) => (x.id === r.id
      ? { ...x, estado: pagado ? 'pagado' : 'pendiente', pagadoEl: pagado ? new Date().toISOString() : null }
      : x)));
    const bien = await apiRecibos.marcar(r.id, pagado ? 'pagado' : 'pendiente');
    if (!bien) {
      setRecibos(antes);
      toast.error('No se ha podido guardar', 'Vuelve a intentarlo.');
    }
  };

  if (!admin) {
    return (
      <>
        <Cabecera periodo={periodo} setPeriodo={setPeriodo} conFlechas={false} />
        <EmptyState
          title="Las cuotas las lleva la dirección del club"
          description="Esta pantalla sólo la ve quien administra el club. Si crees que deberías verla, pídeselo a quien lo creó."
        />
      </>
    );
  }

  if (error) return <ErrorState description={error} onRetry={cargar} />;

  return (
    <>
      <Cabecera periodo={periodo} setPeriodo={setPeriodo} conFlechas />

      {lista === null || recibosDelMes === null ? (
        <SkeletonRows rows={6} />
      ) : activas.length === 0 ? (
        <EmptyState
          title="Todavía no hay ninguna cuota"
          description="Una cuota es la regla: cuánto se paga y cada cuánto. Después se emiten los recibos de cada mes y se va marcando quién ha pagado."
          action={<Button onClick={() => setNueva(vacio(clubId))} icon={<Plus size={16} />}>Crear una cuota</Button>}
        />
      ) : (
        <div className="space-y-4">
          <Panel>
            <div className="grid grid-cols-3 gap-2 p-4 sm:p-5">
              <StatTile label="Cobrado" value={euros(cuentas.cobrado)} hint={`${cuentas.pagados} recibos`} />
              <StatTile label="Pendiente" value={euros(cuentas.pendiente)} hint={`${cuentas.pendientes} recibos`} />
              <StatTile
                /* «Con retraso» no cabe en la baldosa a 393 px y salía
                   «CON RETRA…». Una etiqueta recortada en una cifra de
                   dinero no se puede leer de un vistazo, que es para lo
                   que está. */
                label="Retraso"
                value={euros(cuentas.vencido)}
                hint={cuentas.conRetraso === 1 ? '1 recibo' : `${cuentas.conRetraso} recibos`}
                tone={cuentas.conRetraso > 0 ? 'bad' : undefined}
              />
            </div>
            {/* Dicho donde se ven los importes, no escondido en una ayuda. */}
            <p className="border-t border-line px-4 pb-4 pt-3 text-xs leading-relaxed text-ink-500 sm:px-5">
              Playoff360 no cobra ni mueve dinero. El club cobra como cobre y aquí se apunta:
              «pagado» quiere decir que alguien lo ha marcado.
            </p>
          </Panel>

          {(recibosDelMes ?? []).length === 0 ? (
            <EmptyState
              title={`Sin recibos de ${periodoEnPalabras(periodo)}`}
              description="Emite los de este mes y aparecerá la lista para ir marcando quién paga."
              action={
                <div className="flex flex-wrap justify-center gap-2">
                  {activas.map((c) => (
                    <Button key={c.id} onClick={() => emitir(c)} loading={ocupado}>
                      Emitir «{c.nombre}» · {euros(c.importe)}
                    </Button>
                  ))}
                </div>
              }
            />
          ) : (
            <Panel>
              <ul className="divide-y divide-line">
                {(recibosDelMes ?? []).map((r) => {
                  const tarde = estaVencido(r);
                  const pagado = r.estado === 'pagado';
                  return (
                    <li key={r.id} className="flex items-center gap-3 px-4 py-2.5 sm:px-5">
                      <button
                        type="button"
                        onClick={() => setDetalle(r)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <p className="truncate text-sm font-medium text-ink-900">{nombreDe(r.jugadorId)}</p>
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-ink-500">
                          <span>{euros(r.importe)}</span>
                          <span aria-hidden className="text-ink-500">·</span>
                          <span className="truncate">{r.concepto}</span>
                          {r.estado === 'exento' && <Tag size="sm">Exento</Tag>}
                          {tarde && <Tag size="sm" tone="bad">Vencido</Tag>}
                        </p>
                      </button>
                      <button
                        type="button"
                        onClick={() => marcar(r, !pagado)}
                        aria-pressed={pagado}
                        className={cn(
                          'h-9 shrink-0 rounded-full px-3.5 text-sm font-medium transition-colors',
                          pagado
                            ? 'bg-ink-900 text-ink-0'
                            : 'border border-line bg-raised text-ink-700 active:bg-panel',
                        )}
                      >
                        {pagado ? 'Pagado' : 'Marcar'}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </Panel>
          )}

          <Panel>
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink-900">Las cuotas del club</p>
                <p className="mt-0.5 text-xs text-ink-500">
                  {activas.map((c) => `${c.nombre} · ${euros(c.importe)} ${PERIODO[c.periodo].cada}`).join('  ·  ')}
                </p>
              </div>
              <Button variant="secondary" size="sm" onClick={() => setNueva(vacio(clubId))} icon={<Plus size={15} />}>
                Otra cuota
              </Button>
            </div>
          </Panel>
        </div>
      )}

      {nueva && (
        <NuevaCuota
          borrador={nueva}
          equipos={equipos}
          onCerrar={() => setNueva(null)}
          onHecho={() => { setNueva(null); cargar(); }}
        />
      )}

      {detalle && (
        <DetalleRecibo
          recibo={detalle}
          nombre={nombreDe(detalle.jugadorId)}
          onCerrar={() => setDetalle(null)}
          onHecho={() => { setDetalle(null); cargar(); }}
        />
      )}
    </>
  );
}

/* ═══════════════════════════════ El mes ═══════════════════════════════════ */

function Cabecera({
  periodo, setPeriodo, conFlechas,
}: { periodo: string; setPeriodo: (p: string) => void; conFlechas: boolean }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="rotulo">Cuotas</p>
        <h1 className="t-m mt-1 break-words text-ink-900">{periodoEnPalabras(periodo)}</h1>
      </div>
      {conFlechas && (
        <div className="flex shrink-0 items-center gap-1.5">
          <Flecha hacia={-1} periodo={periodo} setPeriodo={setPeriodo} />
          <Flecha hacia={1} periodo={periodo} setPeriodo={setPeriodo} />
        </div>
      )}
    </div>
  );
}

function Flecha({
  hacia, periodo, setPeriodo,
}: { hacia: -1 | 1; periodo: string; setPeriodo: (p: string) => void }) {
  const Icono = hacia === -1 ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      aria-label={hacia === -1 ? 'Mes anterior' : 'Mes siguiente'}
      onClick={() => setPeriodo(periodoVecino(periodo, hacia))}
      className="grid h-10 w-10 place-items-center rounded-full border border-line bg-raised text-ink-700 transition-colors active:bg-panel"
    >
      <Icono size={18} />
    </button>
  );
}

/* ═════════════════════════════ Crear una cuota ════════════════════════════ */

interface Borrador {
  clubId: string | null;
  nombre: string;
  /** En euros y como texto, que es como se escribe. Se pasa a céntimos al guardar. */
  importe: string;
  periodo: PeriodoCuota;
  teamId: string;
  dia: string;
}

const vacio = (clubId: string | null): Borrador => ({
  clubId, nombre: '', importe: '', periodo: 'mensual', teamId: '', dia: '5',
});

function NuevaCuota({
  borrador, equipos, onCerrar, onHecho,
}: {
  borrador: Borrador;
  equipos: { id: string; name: string }[];
  onCerrar: () => void;
  onHecho: () => void;
}) {
  const toast = useToast();
  const [f, setF] = useState(borrador);
  const [guardando, setGuardando] = useState(false);

  /* Lo que se escribe puede ser «35», «35,50» o «35.50». Lo que se guarda son
     céntimos enteros: un importe en coma flotante acaba en 34,999999 y una
     cuenta de club no puede permitírselo. */
  const centimos = (() => {
    const limpio = f.importe.replace(/\s/g, '').replace(',', '.');
    if (!/^\d+(\.\d{0,2})?$/.test(limpio)) return null;
    return Math.round(Number(limpio) * 100);
  })();

  const puede = f.nombre.trim().length > 0 && centimos !== null && centimos > 0;

  const guardar = async () => {
    if (!puede || !f.clubId || centimos === null) return;
    setGuardando(true);
    const hecha = await apiCuotas.crear({
      clubId: f.clubId,
      teamId: f.teamId || null,
      nombre: f.nombre,
      importe: centimos,
      periodo: f.periodo,
      diaDeVencimiento: f.periodo === 'unica' ? null : Number(f.dia) || null,
      temporada: null,
      notas: '',
    });
    setGuardando(false);
    if (!hecha) {
      toast.error('No se ha podido crear', 'Comprueba que administras este club.');
      return;
    }
    toast.success('Cuota creada', `${f.nombre} · ${euros(centimos)} ${PERIODO[f.periodo].cada}.`);
    onHecho();
  };

  return (
    <Modal open onClose={onCerrar} title="Nueva cuota">
      <div className="space-y-4">
        <Field label="Cómo se llama" hint="Lo que verá la familia en el recibo.">
          <Input
            autoFocus
            value={f.nombre}
            onChange={(e) => setF({ ...f, nombre: e.target.value })}
            placeholder="Cuota mensual 2026/27"
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Importe" hint="En euros.">
            <Input
              inputMode="decimal"
              value={f.importe}
              onChange={(e) => setF({ ...f, importe: e.target.value })}
              placeholder="35"
            />
          </Field>
          <Field label="Cada cuánto">
            <Select value={f.periodo} onChange={(e) => setF({ ...f, periodo: e.target.value as PeriodoCuota })}>
              {(Object.keys(PERIODO) as PeriodoCuota[]).map((p) => (
                <option key={p} value={p}>{PERIODO[p].label}</option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="A quién">
            <Select value={f.teamId} onChange={(e) => setF({ ...f, teamId: e.target.value })}>
              <option value="">Todo el club</option>
              {equipos.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </Select>
          </Field>
          {f.periodo !== 'unica' && (
            <Field label="Vence el día" hint="Hasta el 28: el 30 no existe en febrero.">
              <Input
                inputMode="numeric"
                value={f.dia}
                onChange={(e) => setF({ ...f, dia: e.target.value.replace(/\D/g, '').slice(0, 2) })}
              />
            </Field>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" onClick={onCerrar}>Cancelar</Button>
          <Button onClick={guardar} disabled={!puede} loading={guardando}>Crear cuota</Button>
        </div>
      </div>
    </Modal>
  );
}

/* ═══════════════════════════ El detalle de un recibo ══════════════════════ */

function DetalleRecibo({
  recibo, nombre, onCerrar, onHecho,
}: { recibo: Recibo; nombre: string; onCerrar: () => void; onHecho: () => void }) {
  const toast = useToast();
  const [forma, setForma] = useState<FormaDePago>(recibo.forma ?? 'efectivo');
  const [nota, setNota] = useState(recibo.nota);
  const [ocupado, setOcupado] = useState(false);

  const aplicar = async (estado: Recibo['estado']) => {
    setOcupado(true);
    const bien = await apiRecibos.marcar(id(recibo), estado, estado === 'pagado' ? forma : null, nota);
    setOcupado(false);
    if (!bien) { toast.error('No se ha podido guardar'); return; }
    onHecho();
  };

  return (
    <Modal open onClose={onCerrar} title={nombre}>
      <div className="space-y-4">
        <div className="rounded-2xl bg-panel p-4">
          <p className="cifra text-2xl text-ink-900">{euros(recibo.importe)}</p>
          <p className="mt-1 text-sm text-ink-600">
            {recibo.concepto} · {periodoEnPalabras(recibo.periodo)}
          </p>
          {recibo.vence && (
            <p className="mt-0.5 text-xs text-ink-500">
              Vence el {recibo.vence.split('-').reverse().join('/')}
            </p>
          )}
        </div>

        <Field label="Cómo ha pagado">
          <Select value={forma} onChange={(e) => setForma(e.target.value as FormaDePago)}>
            {(Object.keys(FORMA_DE_PAGO) as FormaDePago[]).map((m) => (
              <option key={m} value={m}>{FORMA_DE_PAGO[m]}</option>
            ))}
          </Select>
        </Field>

        <Field label="Nota" hint="Opcional. Un número de transferencia, un acuerdo de pago.">
          <Input value={nota} onChange={(e) => setNota(e.target.value)} placeholder="" />
        </Field>

        <div className="flex flex-wrap justify-end gap-2 pt-1">
          {/* EXENTO NO ES PAGADO, y por eso está aquí separado: una beca o un
              hermano que no paga no son dinero cobrado, y mezclarlos
              descuadraría el resumen de arriba. */}
          <Button variant="secondary" onClick={() => aplicar('exento')} loading={ocupado}>
            Marcar exento
          </Button>
          {recibo.estado === 'pagado' ? (
            <Button variant="secondary" onClick={() => aplicar('pendiente')} loading={ocupado}>
              Marcar pendiente
            </Button>
          ) : (
            <Button onClick={() => aplicar('pagado')} loading={ocupado}>Marcar pagado</Button>
          )}
        </div>
      </div>
    </Modal>
  );
}

const id = (r: Recibo) => r.id;
