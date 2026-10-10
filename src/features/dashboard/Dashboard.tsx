/**
 * Inicio.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * QUÉ TIENE QUE RESPONDER, EN ESTE ORDEN: qué me toca ahora, cómo está mi
 * equipo, qué quiero hacer, qué ha pasado. Nada más. Si un bloque no responde
 * a una de esas cuatro, sobra.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * LO QUE HABÍA, Y POR QUÉ NO SERVÍA
 *
 * Esta pantalla era «Hola, Leon» a 52 píxeles y debajo cuatro cajas del mismo
 * tamaño, dos de ellas casi siempre vacías, cada una con su cartel centrado
 * de doce píxeles de margen arriba y abajo. En un móvil de 390 px, un club
 * recién montado ocupaba más de dos pantallas y media de alto SIN UN SOLO
 * DATO dentro. El saludo, que es lo que menos importa, era lo más grande de
 * la pantalla; y las dos cosas que de verdad hay que saber —cuándo es el
 * próximo entrenamiento y quién viene— pesaban lo mismo que un hueco.
 *
 * Lo que cambia:
 *
 *  · EL SALUDO ES UNA LÍNEA. Fecha, nombre y equipo, con el selector de
 *    equipo al lado para quien lleva varios. Treinta píxeles de alto.
 *  · UN SOLO PANEL PARA «LO SIGUIENTE». Antes eran dos tarjetas gemelas
 *    —entrenamiento y partido— compitiendo entre ellas. Ahora manda la que
 *    ocurre ANTES, grande, y la otra queda debajo en una línea. Es el orden
 *    del calendario, no el del código.
 *  · LOS NÚMEROS SON BALDOSAS, no tarjetas. Cuatro en una fila, con la cifra
 *    legible, en el alto que antes ocupaba una sola.
 *  · LOS VACÍOS SON FILAS. Dos renglones y un botón que lleva a crear lo que
 *    falta, no un cartel de trescientos píxeles diciendo que no hay nada.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * NINGUNA CIFRA INVENTADA, Y «SIN DATOS» NO ES CERO
 *
 * `teamAttendanceRate` devuelve `null` cuando todavía no se ha pasado
 * ninguna lista. Aquí eso se enseña como «—», no como 0 %. Es importante:
 * un club que acaba de empezar no tiene una asistencia del cero por ciento,
 * tiene una asistencia que nadie ha medido, y pintarle un cero es decirle
 * que sus jugadoras no van a entrenar.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarPlus, ChevronRight, ChevronsUpDown, ClipboardList, Clock, LayoutGrid,
  MapPin, Users,
} from 'lucide-react';
import { teamOverview } from '@/store/selectors';

import { humanError } from '@/services/supabase';
import { useToast } from '@/components/ui/Toast';
import {
  ActionTile, Button, Checkbox, Dropdown, EmptyState, LinkButton, Panel,
  SectionHeader, Skeleton, StatTile, Tag,
} from '@/components/ui';
import { SplitBar } from '@/components/domain/Charts';
import {
  cn, daysFromToday, longDate, minutesToLabel, relativeDay, relativeTime, toISODate, today,
} from '@/lib/utils';
import type { CoachTask, Match, TrainingSession } from '@/types';
import { useAnchura } from '@/components/layout/AppShell';
import { CreateMenu } from '@/components/layout/CreateMenu';
import { hayGuia, PrimerosPasos } from './PrimerosPasos';
import { useInicio } from './datos';
import { InicioMovil } from './InicioMovil';

/**
 * DOS COMPOSICIONES, LOS MISMOS DATOS.
 *
 * El móvil tiene su propia pantalla —`InicioMovil`— y no es la de escritorio
 * encogida: en un teléfono, de pie y con una mano, lo único que importa es
 * cuándo es lo siguiente y poder pasar lista de un toque. En un portátil hay
 * sitio para el día entero a la vez, y encogerlo sería desperdiciarlo.
 *
 * Lo que NO cambia es lo que cuentan: las dos leen de `useInicio`, así que no
 * puede pasar que una diga 90 % y la otra 89.
 */
export default function Dashboard() {
  useAnchura('ancho');
  const d = useInicio();
  const toast = useToast();
  const [creando, setCreando] = useState(false);

  /* Los nombres de siempre, para no reescribir la composición de escritorio
     entera: son los mismos valores con el nombre que ya tenían. */
  const {
    data, loading, loadError, actions, setTeamId, teams, equipo: activeTeam, resumen,
    sesion: session0, partido: match0, callup, convocadas, confirmadas,
    plantilla: squad, ultimaLista, marcas, tareasAbiertas, admin,
    nombreClub: ownName, nombre,
  } = d;

  /* A PARTIR DE AQUÍ, SÓLO ESCRITORIO. El móvil se va por su camino antes
     de las ramas de carga y error porque las suyas son distintas: el
     esqueleto tiene la forma del héroe, no la de una rejilla. */
  const movil = (
    <div className="lg:hidden">
      <InicioMovil d={d} onCrear={() => setCreando(true)} />
      <CreateMenu open={creando} onClose={() => setCreando(false)} />
    </div>
  );

  if (loading) {
    return (
      <>
      {movil}
      <div className="hidden space-y-5 lg:block">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-[168px] w-full" />
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[76px]" />)}
        </div>
      </div>
      </>
    );
  }

  if (loadError) {
    return (
      <>
      {movil}
      <Panel className="hidden border-bad/25 bg-bad/5 p-5 lg:block">
        <h2 className="text-md font-semibold text-bad">No hemos podido cargar tus datos</h2>
        <p className="mt-2 max-w-2xl text-base leading-relaxed text-bad/90">{loadError}</p>
        <Button variant="secondary" size="sm" className="mt-4" onClick={() => void actions.refresh()}>
          Reintentar
        </Button>
      </Panel>
      </>
    );
  }

  /* ── Sin equipos todavía ─────────────────────────────────────────────── */
  if (teams.length === 0) {
    return (
      <>
      {movil}
      <div className="hidden space-y-6 lg:block">
        <PrimerosPasos />
        <Saludo nombre={nombre} />
        {/* CON LA GUÍA DELANTE, ESTO SOBRA: su primer paso dice lo mismo, con
            el mismo botón, treinta píxeles más arriba. Sólo aparece cuando la
            guía no está —porque se apagó o porque esta persona no puede crear
            equipos—, que es cuando hace falta decirlo. */}
        {!hayGuia(data) && (
          <Panel className="px-4 py-1">
            <EmptyState
              title={admin ? 'Empieza creando el primer equipo' : 'Todavía no tienes ningún equipo asignado'}
              description={
                admin
                  ? 'Todo lo demás cuelga de un equipo: la plantilla, el calendario y las sesiones.'
                  : 'La administración del club tiene que asignarte el tuyo. En cuanto lo haga, aquí verás tu día completo.'
              }
              action={
                admin ? (
                  <LinkButton to="/app/equipo-tecnico/nuevo-equipo" size="sm">Crear equipo</LinkButton>
                ) : undefined
              }
            />
          </Panel>
        )}
      </div>
      </>
    );
  }

  return (
    <>
    {movil}
    <div className="hidden space-y-6 lg:block">
      <PrimerosPasos />

      <Saludo
        nombre={nombre}
        equipo={activeTeam?.name}
        equipos={teams.map((t) => ({ id: t.id, name: t.name }))}
        onEquipo={setTeamId}
      />

      <LoSiguiente
        sesion={session0}
        partido={match0}
        nombreEquipo={(id) => data.teams.find((t) => t.id === id)?.name}
        casa={ownName}
      />

      {/* ── Cómo está el equipo ─────────────────────────────────────────── */}
      <section>
        <SectionHeader
          title="Tu equipo"
          hint={activeTeam?.name}
          action={<Link to="/app/analiticas" className="hover:text-marca-400">Analíticas</Link>}
        />
        <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <StatTile
            label="Plantilla"
            value={squad.length}
            hint={squad.length === 1 ? 'jugadora' : 'jugadoras'}
            to="/app/plantilla"
          />
          {/* NULO NO ES CERO: sin ninguna lista pasada no hay media que
              enseñar, y un 0 % diría algo que no es verdad. */}
          <StatTile
            label="Asistencia"
            value={resumen?.attendanceRate === null || resumen === null ? '—' : `${resumen.attendanceRate} %`}
            hint={resumen?.attendanceRate === null ? 'sin listas' : 'últimas 6'}
            to="/app/analiticas"
          />
          <StatTile
            label="No disponibles"
            value={resumen?.unavailable ?? 0}
            hint={resumen && resumen.unavailable > 0 ? 'revisar' : 'plantilla entera'}
            tone={resumen && resumen.unavailable > 0 ? 'warn' : undefined}
            to="/app/disponibilidad"
          />
          <StatTile
            label="Convocatoria"
            value={callup ? `${confirmadas}/${convocadas.length}` : '—'}
            hint={callup ? 'confirmadas' : 'sin crear'}
            to={match0 ? `/app/partidos/${match0.id}` : '/app/partidos'}
          />
        </div>

        {/* La última lista, con su reparto. Sólo si existe: sin lista pasada
            una barra en blanco no informa de nada. */}
        {ultimaLista && (
          <div className="mt-3 rounded-xl border border-line-sutil bg-panel px-3.5 py-3">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-sm font-medium text-ink-800">
                Última lista · {relativeDay(ultimaLista.date).toLowerCase()}
              </p>
              <Link to="/app/entrenamientos" className="shrink-0 text-xs font-medium text-ink-600 hover:text-ink-900">
                Pasar lista
              </Link>
            </div>
            <SplitBar
              className="mt-2.5"
              segments={[
                { value: marcas.present + marcas.late, color: 'bg-ink-800', label: 'Vinieron' },
                { value: marcas.justified + marcas.injured, color: 'bg-warn', label: 'Justificadas' },
                { value: marcas.absent, color: 'bg-bad', label: 'Ausentes' },
                { value: marcas.unregistered, color: 'bg-line', label: 'Sin registrar' },
              ]}
            />
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-600">
              <Leyenda color="bg-ink-800" n={marcas.present + marcas.late} texto="vinieron" />
              <Leyenda color="bg-warn" n={marcas.justified + marcas.injured} texto="justificadas" />
              <Leyenda color="bg-bad" n={marcas.absent} texto={marcas.absent === 1 ? 'ausente' : 'ausentes'} />
            </div>
          </div>
        )}
      </section>

      {/* ── Atajos ──────────────────────────────────────────────────────── */}
      <section>
        <SectionHeader title="Hacer ahora" />
        {/* UNA COLUMNA POR DEBAJO DE 380 px. A 320, dos columnas dejan 73 px
            de texto por baldosa y «entrenamiento» mide 95: es una palabra
            sola, no tiene por dónde partirse, y se salía de su caja. Medido.
            A pantalla completa cabe entera y se lee mejor. */}
        <div className="mt-3 grid grid-cols-1 gap-2.5 min-[380px]:grid-cols-2 lg:grid-cols-4">
          <ActionTile to="/app/entrenamientos/nuevo" icon={<ClipboardList size={16} />}>
            Nuevo entrenamiento
          </ActionTile>
          <ActionTile to="/app/partidos/nuevo" icon={<CalendarPlus size={16} />}>
            Añadir partido
          </ActionTile>
          <ActionTile to="/app/plantilla" icon={<Users size={16} />}>
            Ver plantilla
          </ActionTile>
          <ActionTile to="/app/pizarra" icon={<LayoutGrid size={16} />}>
            Pizarra táctica
          </ActionTile>
        </div>
      </section>

      {/* ── Tareas y actividad ──────────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-5">
        <section className="lg:col-span-2">
          <SectionHeader
            title="Tareas"
            hint={tareasAbiertas.length > 0 ? `${tareasAbiertas.length} abiertas` : undefined}
          />
          {data.tasks.length === 0 ? (
            <EmptyState
              className="mt-1"
              title="Sin tareas pendientes"
              description="Las tareas aparecen aquí cuando alguien del cuerpo técnico apunta algo que hacer."
            />
          ) : (
            <ul className="mt-2 -mx-2">
              {[...data.tasks]
                .sort((a, b) => Number(a.done) - Number(b.done))
                .slice(0, 6)
                .map((t) => (
                  <TaskRow
                    key={t.id}
                    task={t}
                    onToggle={() =>
                      actions
                        .toggleTask(t)
                        .catch((e) => toast.error('No hemos podido guardar la tarea', humanError(e)))
                    }
                  />
                ))}
            </ul>
          )}
        </section>

        <section className="lg:col-span-3">
          <SectionHeader title="Actividad reciente" />
          {data.activity.length === 0 ? (
            <EmptyState
              className="mt-1"
              title="Todavía no hay movimiento"
              description="Aquí irá apareciendo lo que hagáis: altas de jugadoras, entrenamientos, partidos y listas pasadas."
            />
          ) : (
            <ul className="mt-3 space-y-3">
              {data.activity.slice(0, 6).map((a) => (
                <li key={a.id} className="flex gap-3">
                  <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-ink-400" />
                  <div className="min-w-0 flex-1">
                    {a.link ? (
                      <Link to={a.link} className="text-sm leading-snug text-ink-700 hover:text-ink-900">
                        {a.text}
                      </Link>
                    ) : (
                      <p className="text-sm leading-snug text-ink-700">{a.text}</p>
                    )}
                    <p className="mt-0.5 text-2xs text-ink-500">{relativeTime(a.at)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* ── Los otros equipos ───────────────────────────────────────────────
          SÓLO CON MÁS DE UNO. Con un equipo, esta sección repetía en una
          tarjeta lo que la pantalla entera acaba de decir. */}
      {teams.length > 1 && (
        <section>
          <SectionHeader
            title="Mis equipos"
            action={<Link to="/app/equipo-tecnico" className="hover:text-marca-400">Ver todos</Link>}
          />
          <ul className="mt-3 divide-y divide-line-sutil overflow-hidden rounded-xl border border-line-sutil bg-panel">
            {teams.map((t) => {
              const o = teamOverview(data, t);
              return (
                <li key={t.id}>
                  <Link
                    to={`/app/equipo-tecnico/${t.id}`}
                    className="flex items-center gap-3 px-3.5 py-3 transition-colors hover:bg-raised"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-base font-medium text-ink-900">{t.name}</p>
                      <p className="mt-0.5 truncate text-xs text-ink-500">
                        {o.squadSize} {o.squadSize === 1 ? 'jugadora' : 'jugadoras'}
                        {o.nextSession ? ` · entrena ${relativeDay(o.nextSession.date).toLowerCase()}` : ''}
                        {o.unavailable > 0 ? ` · ${o.unavailable} no disponibles` : ''}
                      </p>
                    </div>
                    <span className="shrink-0 font-display text-base font-semibold tabular-nums text-ink-700">
                      {o.attendanceRate === null ? '—' : `${o.attendanceRate} %`}
                    </span>
                    <ChevronRight size={15} className="shrink-0 text-ink-400" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
    </>
  );
}

/* ───────────────────────────────── Piezas ─────────────────────────────────── */

function Leyenda({ color, n, texto }: { color: string; n: number; texto: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn('h-1.5 w-1.5 rounded-full', color)} />
      <span className="tabular-nums">{n}</span> {texto}
    </span>
  );
}

/**
 * El saludo, en una línea.
 *
 * Ocupaba 52 px de alto más la fecha encima: la pieza más grande de la
 * pantalla para decir algo que no cambia nunca. Ahora la fecha y el nombre
 * van en el mismo bloque de treinta y pico píxeles, y al lado —no debajo— el
 * selector de equipo, que en el móvil era lo único que obligaba a abrir el
 * menú entero para cambiar de equipo.
 */
function Saludo({
  nombre, equipo, equipos, onEquipo,
}: {
  nombre: string;
  equipo?: string;
  equipos?: { id: string; name: string }[];
  onEquipo?: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <div className="min-w-0">
        <h1 className="truncate font-display text-xl font-semibold tracking-[-0.016em] text-ink-900 sm:text-2xl">
          {nombre ? `Hola, ${nombre}` : 'Hola'}
        </h1>
        <p className="mt-0.5 truncate text-sm text-ink-500">
          {longDate(toISODate(today()))}
          {equipo ? ` · ${equipo}` : ''}
        </p>
      </div>

      {/* Con un solo equipo no hay nada que elegir, así que no hay selector. */}
      {equipos && equipos.length > 1 && onEquipo && (
        <Dropdown
          className="w-[220px]"
          trigger={
            <button className="flex h-9 max-w-[62vw] items-center gap-2 rounded-xl border border-line bg-panel px-3 text-sm font-medium text-ink-800 transition-colors hover:bg-raised">
              <span className="truncate">{equipo ?? 'Equipo'}</span>
              <ChevronsUpDown size={14} className="shrink-0 text-ink-400" />
            </button>
          }
        >
          {(close) => (
            <>
              <p className="eyebrow px-2.5 py-1.5">Cambiar de equipo</p>
              {equipos.map((t) => (
                <button
                  key={t.id}
                  onClick={() => { onEquipo(t.id); close(); }}
                  className={cn(
                    'block w-full truncate rounded px-2.5 py-2 text-left text-base transition-colors',
                    t.name === equipo ? 'bg-marca-600/14 font-medium text-ink-900' : 'text-ink-700 hover:bg-surface',
                  )}
                >
                  {t.name}
                </button>
              ))}
            </>
          )}
        </Dropdown>
      )}
    </div>
  );
}

/**
 * Lo siguiente que toca.
 * ---------------------------------------------------------------------------
 * UNA SOLA PIEZA, Y MANDA LA FECHA. Antes eran dos tarjetas gemelas, una para
 * el entrenamiento y otra para el partido, siempre en el mismo orden aunque
 * el partido fuera mañana y el entrenamiento la semana que viene. Aquí la
 * primera es la que ocurre ANTES y la otra baja a una línea: es el orden en
 * el que van a pasar las cosas, que es el único que le sirve a quien entrena.
 */
function LoSiguiente({
  sesion, partido, nombreEquipo, casa,
}: {
  sesion?: TrainingSession;
  partido?: Match;
  nombreEquipo: (id: string) => string | undefined;
  casa: string;
}) {
  if (!sesion && !partido) {
    return (
      <Panel className="px-4 py-1">
        {/* UNA SOLA ACCIÓN. Llevaba dos —entrenamiento y partido— y en 320 px
            se apilaban: con la descripción en tres renglones, el vacío subía
            a 214 px, que es justo el cartel que esto venía a quitar. Y la
            segunda sobraba: «Añadir partido» está dos bloques más abajo, en
            los atajos. */}
        <EmptyState
          title="No tienes nada programado"
          description="El próximo entrenamiento o partido aparecerá aquí."
          action={<LinkButton to="/app/entrenamientos/nuevo" size="sm">Crear entrenamiento</LinkButton>}
        />
      </Panel>
    );
  }

  /* Cuál va antes. Se compara fecha y hora como texto porque las dos están
     en formato ISO y «2026-10-11 09:00» ordena igual leyéndose que
     convirtiéndolo a fecha, sin pasar por la zona horaria del navegador. */
  const cuando = (x: { date: string; start: string }) => `${x.date} ${x.start}`;
  const primeroEsSesion =
    !!sesion && (!partido || cuando(sesion) <= cuando(partido));

  return (
    <Panel className="overflow-hidden">
      {primeroEsSesion && sesion ? (
        <SesionGrande sesion={sesion} equipo={nombreEquipo(sesion.teamId)} />
      ) : (
        partido && <PartidoGrande partido={partido} equipo={nombreEquipo(partido.teamId)} casa={casa} />
      )}

      {/* Y lo otro, en una línea. */}
      {primeroEsSesion && partido && (
        <Secundario
          to={`/app/partidos/${partido.id}`}
          rotulo="Después"
          texto={`${partido.home ? 'vs' : 'en'} ${partido.opponent}`}
          cuando={`${relativeDay(partido.date)} · ${partido.start}`}
        />
      )}
      {!primeroEsSesion && sesion && (
        <Secundario
          to={`/app/entrenamientos/${sesion.id}`}
          rotulo="Después"
          texto={sesion.title}
          cuando={`${relativeDay(sesion.date)} · ${sesion.start}`}
        />
      )}
    </Panel>
  );
}

function Secundario({
  to, rotulo, texto, cuando,
}: { to: string; rotulo: string; texto: string; cuando: string }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 border-t border-line-sutil px-4 py-3 transition-colors hover:bg-raised"
    >
      <span className="eyebrow shrink-0">{rotulo}</span>
      <span className="min-w-0 flex-1 truncate text-base text-ink-800">{texto}</span>
      <span className="shrink-0 text-sm tabular-nums text-ink-500">{cuando}</span>
      <ChevronRight size={15} className="shrink-0 text-ink-400" />
    </Link>
  );
}

function SesionGrande({ sesion, equipo }: { sesion: TrainingSession; equipo?: string }) {
  const hoy = daysFromToday(sesion.date) === 0;
  return (
    <div className="p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <span className="eyebrow">Próximo entrenamiento</span>
        <Tag tone={hoy ? 'solid' : 'neutral'} size="sm">{relativeDay(sesion.date)}</Tag>
      </div>

      {/* La hora y el título en la misma línea: la hora es el dato, el título
          es lo que la identifica, y partirlos en dos bloques de 52 px era
          gastar media pantalla en dos renglones. */}
      <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <p className="cifra text-3xl sm:text-4xl">{sesion.start}</p>
        <p className="min-w-0 flex-1 truncate text-md font-medium text-ink-900">{sesion.title}</p>
      </div>
      {equipo && <p className="mt-1 truncate text-sm text-ink-500">{equipo}</p>}

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-ink-600">
        <span className="flex items-center gap-1.5">
          <Clock size={14} className="text-ink-400" />
          {minutesToLabel(sesion.duration)}
        </span>
        {sesion.venue && (
          <span className="flex min-w-0 items-center gap-1.5">
            <MapPin size={14} className="shrink-0 text-ink-400" />
            <span className="truncate">{sesion.venue}</span>
          </span>
        )}
        <span className="flex items-center gap-1.5">
          <Users size={14} className="text-ink-400" />
          {sesion.expectedPlayers} jugadoras
        </span>
      </div>

      {/* Los bloques, a escala. Es la forma de la sesión de un vistazo: dónde
          está el grueso y cuánto dura el calentamiento. */}
      {sesion.blocks.length > 0 && (
        <div className="mt-4">
          <div className="flex gap-1">
            {sesion.blocks.map((b) => (
              <div
                key={b.id}
                title={`${b.title} · ${b.duration}′`}
                className="h-1.5 rounded-full bg-ink-300"
                style={{ flex: b.duration }}
              />
            ))}
          </div>
          <p className="mt-2 truncate text-xs text-ink-500">
            {sesion.blocks.length} bloques{sesion.objective ? ` · ${sesion.objective}` : ''}
          </p>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <LinkButton to={`/app/entrenamientos/${sesion.id}`} size="sm">Ver entrenamiento</LinkButton>
        <LinkButton to="/app/entrenamientos" size="sm" variant="quiet">Pasar lista</LinkButton>
      </div>
    </div>
  );
}

function PartidoGrande({
  partido, equipo, casa,
}: { partido: Match; equipo?: string; casa: string }) {
  const hoy = daysFromToday(partido.date) === 0;
  return (
    <div className="p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <span className="eyebrow">Próximo partido</span>
        <Tag tone={hoy ? 'solid' : 'neutral'} size="sm">{relativeDay(partido.date)}</Tag>
      </div>

      <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <p className="cifra text-3xl sm:text-4xl">{partido.start}</p>
        <p className="min-w-0 flex-1 truncate text-md font-medium text-ink-900">
          {partido.home ? `${casa} · ${partido.opponent}` : `${partido.opponent} · ${casa}`}
        </p>
      </div>
      <p className="mt-1 truncate text-sm text-ink-500">
        {partido.home ? 'En casa' : 'Fuera'}
        {equipo ? ` · ${equipo}` : ''}
        {partido.competition ? ` · ${partido.competition}` : ''}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-ink-600">
        <span className="flex items-center gap-1.5">
          <Clock size={14} className="text-ink-400" />
          {longDate(partido.date)}
        </span>
        {partido.venue && (
          <span className="flex min-w-0 items-center gap-1.5">
            <MapPin size={14} className="shrink-0 text-ink-400" />
            <span className="truncate">{partido.venue}</span>
          </span>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <LinkButton to={`/app/partidos/${partido.id}`} size="sm">Ver partido</LinkButton>
        <LinkButton to={`/app/partidos/${partido.id}`} size="sm" variant="quiet">Convocatoria</LinkButton>
      </div>
    </div>
  );
}

function TaskRow({ task, onToggle }: { task: CoachTask; onToggle: () => void }) {
  const vencida = task.dueDate && !task.done && daysFromToday(task.dueDate) < 0;
  return (
    <li>
      <div className="flex items-start gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-panel">
        <span className="mt-0.5">
          <Checkbox checked={task.done} onChange={onToggle} />
        </span>
        <div className="min-w-0 flex-1">
          {task.link && !task.done ? (
            <Link to={task.link} className="block text-sm leading-snug text-ink-700 hover:text-ink-900">
              {task.title}
            </Link>
          ) : (
            <p className={cn('text-sm leading-snug', task.done ? 'text-ink-500 line-through' : 'text-ink-700')}>
              {task.title}
            </p>
          )}
          {task.dueDate && !task.done && (
            <p className={cn('mt-0.5 text-2xs', vencida ? 'text-bad' : 'text-ink-500')}>
              {vencida ? 'Vencida · ' : ''}
              {relativeDay(task.dueDate)}
            </p>
          )}
        </div>
        {task.priority === 'alta' && !task.done && (
          <Tag tone="warn" size="sm" className="mt-0.5 shrink-0">Alta</Tag>
        )}
      </div>
    </li>
  );
}
