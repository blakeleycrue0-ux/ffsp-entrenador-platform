/**
 * Inscripciones, del lado del club.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * LO QUE ARREGLA ESTA PANTALLA, dicho tal como se dijo: «yo puedo ir allí y
 * crear una cuota tan fácil, no, tiene que ser más complicado». Tenía razón, y
 * el motivo no es que crear cosas deba costar: es que una cuota afecta al
 * dinero de cien familias y hasta ahora se creaba con tres campos y un botón,
 * sin que constara quién la había puesto ni a quién se le había dicho nada.
 *
 * ASÍ QUE EL CAMINO TIENE CUATRO PARADAS, y cada una es un acto distinto:
 *
 *   BORRADOR   El club escribe qué pide y qué documentos exige. El enlace ya
 *              existe pero NO ABRE: se puede repartir por error sin
 *              consecuencias, que es justo lo que se quiere de un borrador.
 *   ABIERTA    Publicar es un acto aparte, y la base de datos apunta quién y
 *              cuándo. Desde ese momento el enlace abre.
 *   REVISIÓN   Cada inscripción se mira una a una. Aprobar o rechazar, con
 *              motivo. Nada entra en la plantilla sin que alguien lo vea.
 *   CERRADA    El plazo acabó. El enlace deja de abrir y lo dice.
 *
 * LO QUE NO SE PUEDE HACER DESDE AQUÍ, Y ES INTENCIONADO:
 *
 *   · Borrar una inscripción. Son datos que mandó una familia; se rechazan con
 *     un motivo, que queda escrito, y no se hacen desaparecer.
 *   · Editar lo que escribió la familia. Si hay una errata, se corrige en la
 *     ficha del jugador DESPUÉS de aprobar, y así la inscripción sigue
 *     diciendo lo que se mandó de verdad.
 *   · Cobrar. Aprobar emite un recibo PENDIENTE. Quien mueve el dinero es el
 *     club, fuera de aquí, y esta pantalla sólo lo apunta.
 */

import { useEffect, useMemo, useState } from 'react';
import {
  Check, Copy, ExternalLink, FileText, Link2, Loader2, Plus, ShieldCheck, X,
} from 'lucide-react';
import {
  Button, EmptyState, Field, Input, Modal, PageHeader, Panel, PanelHeader,
  Select, Tag, Textarea,
} from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { useClub } from '@/store/store';
import { isClubAdmin } from '@/store/selectors';
import { humanError } from '@/services/supabase';
import {
  club as api, CONSENTIMIENTOS_POR_DEFECTO, DOCUMENTOS_HABITUALES, peso,
  type DocumentoPedido, type Formulario, type Inscripcion,
} from '@/services/inscripciones';
import { cuotas as apiCuotas, euros, type Cuota } from '@/services/cuotas';
import { cn } from '@/lib/utils';

export default function InscripcionesPage() {
  const toast = useToast();
  const { data } = useClub();
  const admin = isClubAdmin(data);
  const clubId = data.club?.id ?? null;

  const [formularios, setFormularios] = useState<Formulario[] | null>(null);
  const [inscripciones, setInscripciones] = useState<Inscripcion[]>([]);
  const [cuotasDelClub, setCuotasDelClub] = useState<Cuota[]>([]);
  const [fallo, setFallo] = useState<string | null>(null);
  const [creando, setCreando] = useState(false);
  const [mirando, setMirando] = useState<Inscripcion | null>(null);

  const cargar = async () => {
    if (!clubId) return;
    try {
      const [fs, is, cs] = await Promise.all([
        api.formularios(clubId),
        api.inscripciones(clubId),
        apiCuotas.listar(clubId).catch(() => [] as Cuota[]),
      ]);
      setFormularios(fs);
      setInscripciones(is);
      setCuotasDelClub(cs);
      setFallo(null);
    } catch (e) {
      setFallo(humanError(e));
      setFormularios([]);
    }
  };

  useEffect(() => { void cargar(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [clubId]);

  const sinRevisar = useMemo(
    () => inscripciones.filter((i) => i.estado === 'recibida'), [inscripciones],
  );

  if (!admin) {
    return (
      <>
        <PageHeader title="Inscripciones" description="Los formularios que publica el club." />
        <EmptyState
          title="Esto lo lleva quien administra el club"
          description="Las inscripciones traen el DNI y la dirección de menores, así que sólo las ve quien administra."
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Inscripciones"
        description="Publica un enlace, las familias lo rellenan y tú decides quién entra."
        actions={
          <Button variant="primary" onClick={() => setCreando(true)}>
            <Plus size={16} /> Nuevo formulario
          </Button>
        }
      />

      {fallo && (
        <Panel className="mb-3">
          <p className="p-5 text-base leading-relaxed text-bad">{fallo}</p>
        </Panel>
      )}

      {/* LO QUE ESPERA, PRIMERO. Una inscripción sin revisar es una familia
          esperando una respuesta, así que va arriba y con su número. Si no hay
          ninguna, esta tarjeta no aparece: un cero grande en la primera
          pantalla no es información, es ruido. */}
      {sinRevisar.length > 0 && (
        <Panel className="mb-3">
          <PanelHeader
            title={sinRevisar.length === 1 ? 'Una inscripción sin revisar' : `${sinRevisar.length} inscripciones sin revisar`}
          />
          <ul className="divide-y divide-line">
            {sinRevisar.map((i) => (
              <li key={i.id}>
                <button
                  type="button" onClick={() => setMirando(i)}
                  className="flex w-full items-center gap-3 px-5 py-4 text-left active:bg-raised sm:hover:bg-raised"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-medium text-ink-900">{i.jugador}</p>
                    <p className="truncate text-sm text-ink-500">
                      {i.tutor} · {new Date(i.creadaEl).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                      {i.documentos && i.documentos.length > 0 && ` · ${i.documentos.length} doc.`}
                    </p>
                  </div>
                  <Tag>Revisar</Tag>
                </button>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <Panel>
        <PanelHeader title="Formularios" />
        {formularios === null ? (
          <p className="flex items-center gap-2 p-5 text-base text-ink-500">
            <Loader2 size={16} className="animate-spin" /> Cargando…
          </p>
        ) : formularios.length === 0 ? (
          <EmptyState
            title="Todavía no hay ningún formulario"
            description="Un formulario es un enlace que repartes a las familias. Lo rellenan desde el móvil, suben sus documentos y tú apruebas quién entra."
            action={<Button variant="primary" onClick={() => setCreando(true)}><Plus size={16} /> Crear el primero</Button>}
          />
        ) : (
          <ul className="divide-y divide-line">
            {formularios.map((f) => (
              <FilaDeFormulario
                key={f.id} formulario={f}
                equipos={data.teams.map((t) => ({ id: t.id, nombre: t.name }))}
                onCambiar={async (estado) => {
                  try {
                    await api.cambiarEstado(f.id, estado);
                    toast.info(
                      estado === 'abierta' ? 'Formulario publicado' : 'Formulario cerrado',
                      estado === 'abierta'
                        ? 'El enlace ya abre. Queda apuntado que lo has publicado tú.'
                        : 'El enlace deja de abrir. Lo recibido se queda.',
                    );
                    await cargar();
                  } catch (e) {
                    toast.error('No hemos podido cambiarlo', humanError(e));
                  }
                }}
                onVerInscripciones={() => {
                  const suyas = inscripciones.filter((i) => i.formId === f.id);
                  if (suyas.length > 0) setMirando(suyas[0]);
                  else toast.info('Sin inscripciones', 'Todavía no ha llegado ninguna por este enlace.');
                }}
              />
            ))}
          </ul>
        )}
      </Panel>

      {/* Las ya revisadas, para tener el historial a mano. */}
      {inscripciones.some((i) => i.estado !== 'recibida') && (
        <Panel className="mt-3">
          <PanelHeader title="Ya revisadas" />
          <ul className="divide-y divide-line">
            {inscripciones.filter((i) => i.estado !== 'recibida').map((i) => (
              <li key={i.id}>
                <button
                  type="button" onClick={() => setMirando(i)}
                  className="flex w-full items-center gap-3 px-5 py-3.5 text-left active:bg-raised sm:hover:bg-raised"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base text-ink-900">{i.jugador}</p>
                    <p className="truncate text-sm text-ink-500">{i.codigo}</p>
                  </div>
                  <Tag tone={i.estado === 'aprobada' ? 'ok' : undefined}>
                    {i.estado === 'aprobada' ? 'Aprobada' : 'Rechazada'}
                  </Tag>
                </button>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {creando && clubId && (
        <NuevoFormulario
          clubId={clubId}
          equipos={data.teams.map((t) => ({ id: t.id, nombre: t.name }))}
          cuotas={cuotasDelClub}
          onCerrar={() => setCreando(false)}
          onHecho={async () => { setCreando(false); await cargar(); }}
        />
      )}

      {mirando && (
        <RevisarInscripcion
          inscripcion={mirando}
          formulario={formularios?.find((f) => f.id === mirando.formId) ?? null}
          equipos={data.teams.map((t) => ({ id: t.id, nombre: t.name }))}
          onCerrar={() => setMirando(null)}
          onHecho={async () => { setMirando(null); await cargar(); }}
        />
      )}
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   UNA FILA DE LA LISTA
   ═══════════════════════════════════════════════════════════════════════════ */

function FilaDeFormulario({
  formulario: f, equipos, onCambiar, onVerInscripciones,
}: {
  formulario: Formulario;
  equipos: { id: string; nombre: string }[];
  onCambiar: (estado: 'abierta' | 'cerrada') => void;
  onVerInscripciones: () => void;
}) {
  const [copiado, setCopiado] = useState(false);
  const enlace = `${window.location.origin}/inscripcion/${f.token}`;

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(enlace);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      /* Si el navegador no deja copiar —pasa sin HTTPS y en algún móvil—, se
         selecciona para que se pueda copiar a mano. Mejor que un botón que no
         hace nada y no lo dice. */
      const campo = document.querySelector<HTMLInputElement>(`[data-enlace="${f.id}"]`);
      campo?.select();
    }
  };

  return (
    <li className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-titulo text-base font-semibold text-ink-900">{f.titulo}</h3>
            <Tag tone={f.estado === 'abierta' ? 'ok' : undefined}>
              {f.estado === 'borrador' ? 'Borrador' : f.estado === 'abierta' ? 'Abierta' : 'Cerrada'}
            </Tag>
          </div>
          <p className="mt-1 text-sm text-ink-500">
            {f.temporada && <>Temporada {f.temporada} · </>}
            {f.teamId
              ? equipos.find((e) => e.id === f.teamId)?.nombre ?? 'Un equipo'
              : 'Todo el club'}
            {f.topePlazas !== null && <> · {f.topePlazas} plazas</>}
          </p>
          <p className="mt-1 text-sm text-ink-500">
            {f.recibidas ?? 0} sin revisar · {f.aprobadas ?? 0} aprobadas
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          {f.estado === 'borrador' && (
            <Button size="sm" variant="primary" onClick={() => onCambiar('abierta')}>Publicar</Button>
          )}
          {f.estado === 'abierta' && (
            <Button size="sm" variant="secondary" onClick={() => onCambiar('cerrada')}>Cerrar</Button>
          )}
          {(f.recibidas ?? 0) + (f.aprobadas ?? 0) > 0 && (
            <Button size="sm" variant="quiet" onClick={onVerInscripciones}>Ver inscripciones</Button>
          )}
        </div>
      </div>

      {/* EL ENLACE, A LA VISTA Y COPIABLE. Es lo que el club tiene que
          repartir, así que no se esconde detrás de un menú. En borrador se
          enseña igual, con el aviso de que todavía no abre: así se puede
          comprobar antes de mandarlo a nadie. */}
      <div className="mt-4 rounded-2xl bg-raised p-3">
        <div className="flex items-center gap-2">
          <Link2 size={15} className="shrink-0 text-ink-500" />
          <input
            readOnly value={enlace} data-enlace={f.id}
            onFocus={(e) => e.currentTarget.select()}
            className="min-w-0 flex-1 bg-transparent text-sm text-ink-700 outline-none"
          />
          <button
            type="button" onClick={() => void copiar()}
            className="flex size-8 shrink-0 items-center justify-center rounded-lg text-ink-600 active:bg-panel sm:hover:bg-panel"
            aria-label="Copiar el enlace"
          >
            {copiado ? <Check size={15} className="text-ok" /> : <Copy size={15} />}
          </button>
          <a
            href={enlace} target="_blank" rel="noreferrer"
            className="flex size-8 shrink-0 items-center justify-center rounded-lg text-ink-600 active:bg-panel sm:hover:bg-panel"
            aria-label="Abrir el formulario"
          >
            <ExternalLink size={15} />
          </a>
        </div>
        {f.estado === 'borrador' && (
          <p className="mt-2 text-sm leading-relaxed text-ink-500">
            Todavía no abre. Ábrelo tú para comprobarlo; a una familia le diría que no está abierto.
          </p>
        )}
      </div>
    </li>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   CREAR
   ═══════════════════════════════════════════════════════════════════════════ */

function NuevoFormulario({
  clubId, equipos, cuotas, onCerrar, onHecho,
}: {
  clubId: string;
  equipos: { id: string; nombre: string }[];
  cuotas: Cuota[];
  onCerrar: () => void;
  onHecho: () => void;
}) {
  const toast = useToast();
  const [titulo, setTitulo] = useState('');
  const [temporada, setTemporada] = useState(temporadaDeHoy());
  const [intro, setIntro] = useState('');
  const [equipo, setEquipo] = useState('');
  const [cuota, setCuota] = useState('');
  const [cierra, setCierra] = useState('');
  const [tope, setTope] = useState('');
  const [documentos, setDocumentos] = useState<DocumentoPedido[]>(
    DOCUMENTOS_HABITUALES.filter((d) => d.obligatorio),
  );
  const [guardando, setGuardando] = useState(false);

  const alternar = (d: DocumentoPedido) =>
    setDocumentos((ds) =>
      ds.some((x) => x.id === d.id) ? ds.filter((x) => x.id !== d.id) : [...ds, d]);

  const guardar = async () => {
    if (titulo.trim().length < 3) {
      toast.error('Ponle un nombre', 'Algo que la familia reconozca, como «Inscripción Alevín A».');
      return;
    }
    setGuardando(true);
    try {
      await api.crear({
        clubId,
        teamId: equipo || null,
        feePlanId: cuota || null,
        titulo, intro, temporada,
        cierraEl: cierra ? new Date(`${cierra}T23:59:59`).toISOString() : null,
        topePlazas: tope ? Number(tope) : null,
        campos: [],
        documentos,
        consentimientos: CONSENTIMIENTOS_POR_DEFECTO,
      });
      toast.info('Formulario creado', 'Está en borrador: revísalo y publícalo cuando quieras.');
      onHecho();
    } catch (e) {
      toast.error('No hemos podido crearlo', humanError(e));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal open onClose={onCerrar} title="Nuevo formulario de inscripción">
      <div className="space-y-4">
        <Field label="Nombre" hint="Lo ve la familia al abrir el enlace.">
          <Input value={titulo} onChange={(e) => setTitulo(e.target.value)}
            placeholder="Inscripción Alevín A" />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Temporada">
            <Input value={temporada} onChange={(e) => setTemporada(e.target.value)} placeholder="2026/27" />
          </Field>
          <Field label="Equipo" hint="En blanco, lo eliges al aprobar.">
            <Select value={equipo} onChange={(e) => setEquipo(e.target.value)}>
              <option value="">Decidir al aprobar</option>
              {equipos.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
            </Select>
          </Field>
        </div>

        <Field
          label="Cuota que se emite al aprobar"
          hint={cuotas.length === 0
            ? 'Todavía no has creado ninguna cuota. Puedes dejarlo sin cuota y añadirla después.'
            : 'Al aprobar una inscripción se emite el primer recibo, pendiente de pago.'}
        >
          <Select value={cuota} onChange={(e) => setCuota(e.target.value)} disabled={cuotas.length === 0}>
            <option value="">Sin cuota</option>
            {cuotas.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre} — {euros(c.importe)} / {c.periodo}</option>
            ))}
          </Select>
        </Field>

        <Field label="Texto de bienvenida" hint="Opcional. Lo que quieras que lean antes de empezar.">
          <Textarea value={intro} onChange={(e) => setIntro(e.target.value)} rows={3}
            placeholder="Rellena una ficha por jugador. Si tienes dudas, escríbenos." />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Último día" hint="Opcional.">
            <Input type="date" value={cierra} onChange={(e) => setCierra(e.target.value)} />
          </Field>
          <Field label="Plazas" hint="Opcional. Al llenarse, deja de aceptar.">
            <Input type="number" min={1} value={tope} onChange={(e) => setTope(e.target.value)} placeholder="Sin tope" />
          </Field>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-ink-700">Documentos que pides</p>
          <div className="space-y-2">
            {DOCUMENTOS_HABITUALES.map((d) => {
              const puesto = documentos.some((x) => x.id === d.id);
              return (
                <label
                  key={d.id}
                  className={cn(
                    'flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors',
                    puesto ? 'border-marca-solido/40 bg-marca-solido/[0.06]' : 'border-line',
                  )}
                >
                  <input type="checkbox" checked={puesto} onChange={() => alternar(d)}
                    className="mt-0.5 size-4 shrink-0 accent-marca-solido" />
                  <span className="min-w-0">
                    <span className="block text-base leading-snug text-ink-900">{d.label}</span>
                    {d.ayuda && <span className="mt-0.5 block text-sm text-ink-500">{d.ayuda}</span>}
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        {/* LAS AUTORIZACIONES NO SE ELIGEN AQUÍ, Y SE DICE POR QUÉ. Sin la de
            tratamiento de datos no hay base para guardar nada de un menor, así
            que no es una casilla: va puesta. */}
        <div className="rounded-2xl bg-raised p-4">
          <p className="flex items-start gap-2 text-sm leading-relaxed text-ink-600">
            <ShieldCheck size={15} className="mt-0.5 shrink-0 text-ink-500" />
            <span>
              El formulario pedirá la autorización de tratamiento de los datos del jugador —es
              obligatoria y no se puede quitar— y la de uso de imagen, que es voluntaria para la
              familia. Las dos quedan guardadas con la fecha y la hora en que se aceptaron.
            </span>
          </p>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" onClick={onCerrar}>Cancelar</Button>
          <Button variant="primary" loading={guardando} onClick={() => void guardar()}>
            Crear en borrador
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   REVISAR
   ═══════════════════════════════════════════════════════════════════════════ */

function RevisarInscripcion({
  inscripcion: i, formulario, equipos, onCerrar, onHecho,
}: {
  inscripcion: Inscripcion;
  formulario: Formulario | null;
  equipos: { id: string; nombre: string }[];
  onCerrar: () => void;
  onHecho: () => void;
}) {
  const toast = useToast();
  const [equipo, setEquipo] = useState(formulario?.teamId ?? '');
  const [nota, setNota] = useState('');
  const [haciendo, setHaciendo] = useState<'aprobar' | 'rechazar' | null>(null);
  const yaRevisada = i.estado !== 'recibida';

  const aprobar = async () => {
    if (!equipo) {
      toast.error('Falta el equipo', 'Di en qué equipo entra antes de aprobar.');
      return;
    }
    setHaciendo('aprobar');
    try {
      await api.aprobar(i.id, equipo, nota);
      toast.info('Inscripción aprobada', `${i.jugador} ya está en la plantilla${formulario?.feePlanId ? ', y su primer recibo queda pendiente de pago' : ''}.`);
      onHecho();
    } catch (e) {
      toast.error('No hemos podido aprobarla', humanError(e));
      setHaciendo(null);
    }
  };

  const rechazar = async () => {
    if (!nota.trim()) {
      toast.error('Falta el motivo', 'Escribe por qué. La familia tiene derecho a saberlo.');
      return;
    }
    setHaciendo('rechazar');
    try {
      await api.rechazar(i.id, nota);
      toast.info('Inscripción rechazada', 'Queda guardada con el motivo.');
      onHecho();
    } catch (e) {
      toast.error('No hemos podido rechazarla', humanError(e));
      setHaciendo(null);
    }
  };

  return (
    <Modal open onClose={onCerrar} title={i.jugador}>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <Tag tone={i.estado === 'aprobada' ? 'ok' : i.estado === 'recibida' ? 'solid' : undefined}>
            {i.estado === 'recibida' ? 'Sin revisar' : i.estado === 'aprobada' ? 'Aprobada' : 'Rechazada'}
          </Tag>
          <span className="cifra text-sm text-ink-500">{i.codigo}</span>
        </div>

        <Datos titulo="El jugador" filas={[
          ['Nombre', i.jugador],
          ['Nacimiento', i.nacimiento ? new Date(i.nacimiento).toLocaleDateString('es-ES') : null],
          ['Documento', i.documento],
        ]} />

        <Datos titulo="Quien lo inscribe" filas={[
          ['Nombre', i.tutor],
          ['Parentesco', i.parentesco],
          ['Correo', i.tutorCorreo],
          ['Teléfono', i.tutorTelefono],
          ['Documento', i.tutorDoc],
        ]} />

        <Datos titulo="Dónde vive" filas={[
          ['Dirección', i.direccion],
          ['Población', [i.codigoPostal, i.poblacion].filter(Boolean).join(' ') || null],
        ]} />

        {Object.keys(i.respuestas).length > 0 && formulario && (
          <Datos titulo="Lo que pediste" filas={formulario.campos.map((c) => [
            c.label, i.respuestas[c.id] ?? null,
          ])} />
        )}

        <Documentos inscripcion={i} formulario={formulario} />

        {/* LOS CONSENTIMIENTOS, CON SU HORA. Es el dato que hace falta el día
            que alguien pregunte con qué base se guardó esto. */}
        {Object.keys(i.consentimientos).length > 0 && (
          <Datos
            titulo="Autorizaciones aceptadas"
            filas={Object.entries(i.consentimientos).map(([id, cuando]) => [
              formulario?.consentimientos.find((c) => c.id === id)?.label ?? id,
              new Date(cuando).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' }),
            ])}
          />
        )}

        {yaRevisada ? (
          <div className="rounded-2xl bg-raised p-4">
            <p className="text-sm leading-relaxed text-ink-600">
              Revisada el {i.revisadaEl ? new Date(i.revisadaEl).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}.
              {i.notaRevision && <> Nota: «{i.notaRevision}»</>}
            </p>
          </div>
        ) : (
          <>
            <Field label="Equipo en el que entra">
              <Select value={equipo} onChange={(e) => setEquipo(e.target.value)}>
                <option value="">Elige el equipo…</option>
                {equipos.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
              </Select>
            </Field>

            <Field
              label="Nota"
              hint="Obligatoria para rechazar; opcional para aprobar. Queda guardada."
            >
              <Textarea value={nota} onChange={(e) => setNota(e.target.value)} rows={2}
                placeholder="Falta el DNI del tutor, nos lo trae el lunes." />
            </Field>

            <div className="rounded-2xl bg-raised p-4">
              <p className="text-sm leading-relaxed text-ink-600">
                Al aprobar se crea la ficha de <strong className="font-semibold">{i.jugador}</strong> en
                la plantilla con {i.tutor} como tutor
                {formulario?.feePlanId && <>, y se emite su primer recibo <strong className="font-semibold">pendiente de pago</strong></>}.
                No se cobra nada: eso lo hace el club por su cuenta.
              </p>
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="secondary" onClick={onCerrar}>Cerrar</Button>
              <Button variant="danger" loading={haciendo === 'rechazar'} onClick={() => void rechazar()}>
                <X size={15} /> Rechazar
              </Button>
              <Button variant="primary" loading={haciendo === 'aprobar'} onClick={() => void aprobar()}>
                <Check size={15} /> Aprobar
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

/* ── Piezas pequeñas ──────────────────────────────────────────────────────── */

/* LO QUE NO MANDÓ LA FAMILIA SE DICE, NO SE DEJA EN BLANCO. Un hueco vacío no
   distingue «no lo pidió el club» de «se lo dejó sin rellenar», y lo segundo
   es algo que hay que reclamar. */
function Datos({ titulo, filas }: { titulo: string; filas: (readonly [string, string | null])[] }) {
  const utiles = filas.filter(([, v]) => v !== undefined);
  if (utiles.length === 0) return null;
  return (
    <div>
      <p className="rotulo mb-2 text-ink-500">{titulo}</p>
      <dl className="divide-y divide-line rounded-2xl bg-raised px-4">
        {utiles.map(([k, v]) => (
          <div key={k} className="flex gap-4 py-2.5">
            <dt className="w-32 shrink-0 text-sm text-ink-500">{k}</dt>
            <dd className={cn('min-w-0 flex-1 break-words text-base', v ? 'text-ink-900' : 'text-ink-500')}>
              {v ?? 'Sin rellenar'}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function Documentos({ inscripcion: i, formulario }: { inscripcion: Inscripcion; formulario: Formulario | null }) {
  const toast = useToast();
  const [abriendo, setAbriendo] = useState<string | null>(null);
  const subidos = i.documentos ?? [];
  const pedidos = formulario?.documentos ?? [];
  if (subidos.length === 0 && pedidos.length === 0) return null;

  const abrir = async (doc: { kind: string; ruta: string }) => {
    setAbriendo(doc.kind);
    try {
      /* Se pide firmada y para dos minutos: lo justo para mirarla y no lo
         bastante para que el enlace sirva si se reenvía por ahí. */
      const url = await api.verDocumento(doc.ruta);
      window.open(url, '_blank', 'noreferrer');
    } catch (e) {
      toast.error('No hemos podido abrirlo', humanError(e));
    } finally {
      setAbriendo(null);
    }
  };

  return (
    <div>
      <p className="rotulo mb-2 text-ink-500">Documentos</p>
      <ul className="divide-y divide-line rounded-2xl bg-raised px-4">
        {pedidos.map((p) => {
          const doc = subidos.find((d) => d.kind === p.id);
          return (
            <li key={p.id} className="flex items-center gap-3 py-2.5">
              <FileText size={15} className={cn('shrink-0', doc ? 'text-ok' : 'text-ink-500')} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-base text-ink-900">{p.label}</p>
                {doc
                  ? <p className="truncate text-sm text-ink-500">{doc.filename} · {peso(doc.bytes)}</p>
                  : <p className="text-sm text-warn">
                      {p.obligatorio ? 'No lo ha subido, y era obligatorio' : 'No lo ha subido'}
                    </p>}
              </div>
              {doc && (
                <Button size="sm" variant="quiet" loading={abriendo === p.id} onClick={() => void abrir(doc)}>
                  Ver
                </Button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** «2026/27» a partir de hoy: la temporada cambia en julio, no en enero. */
function temporadaDeHoy(): string {
  const h = new Date();
  const inicio = h.getMonth() >= 6 ? h.getFullYear() : h.getFullYear() - 1;
  return `${inicio}/${String((inicio + 1) % 100).padStart(2, '0')}`;
}
