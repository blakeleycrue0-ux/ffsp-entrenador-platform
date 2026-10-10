/**
 * Inicio, en el móvil.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * UNA SOLA COSA MANDA EN LA PANTALLA: cuándo es lo siguiente. Todo lo demás
 * viene después y se lee más pequeño. Esto no es una rejilla de módulos
 * equivalentes —eso es un panel de control, y un panel de control se mira
 * sentado—; es una pantalla que se abre de pie, en un campo, con una mano, y
 * que tiene que contestar en medio segundo.
 *
 * LA COMPOSICIÓN, DE ARRIBA A ABAJO
 *
 *   · EL HÉROE, a sangre y sin caja. Rótulo pequeño, la hora enorme, y
 *     debajo el día y el equipo. La hora es la cifra: va a 56 px, con los
 *     minutos más pequeños que las horas, porque lo que se busca de un
 *     vistazo es «a las seis y media» y el resto es precisión.
 *   · CUATRO DISCOS. Pasar lista, crear sesión, añadir partido y el resto.
 *     Redondos y de 56 px: son acciones, no enlaces, y se distinguen de
 *     cualquier otra cosa de la pantalla por la forma antes que por el
 *     texto.
 *   · LO DEMÁS, EN FICHAS. La sesión entera, las cifras del equipo, la
 *     última lista y lo que ha pasado. Cada una con su sitio y ninguna del
 *     tamaño de la de al lado.
 *
 * POR QUÉ NO HAY CAJA ALREDEDOR DEL HÉROE. Una tarjeta con la hora dentro
 * tendría que competir con las tarjetas de abajo, y acabarían pesando lo
 * mismo. Sin caja, el fondo es el héroe: no hay dos jerarquías, hay una.
 *
 * EL FONDO ES UN CAMPO, NO UN DEGRADADO BONITO. Son las líneas de un campo
 * de fútbol —el círculo central, la media luna del área— a muy poca luz.
 * Es SVG plano y un degradado radial: ni imagen, ni desenfoque, ni una sola
 * animación. El desenfoque de fondo obliga al navegador a recomponer lo que
 * hay debajo en cada fotograma del desplazamiento, y esto está justo encima
 * de una lista que se desplaza.
 */

import { Link } from 'react-router-dom';
import {
  CalendarPlus, ChevronRight, ChevronsUpDown, ClipboardCheck, Clock, MapPin,
  MoreHorizontal, Swords, Users,
} from 'lucide-react';
import {
  Button, Dropdown, EmptyState, LinkButton, Panel, SectionHeader, Skeleton, Tag,
} from '@/components/ui';
import { SplitBar } from '@/components/domain/Charts';
import { cn, longDate, minutesToLabel, relativeDay, relativeTime, toISODate, today } from '@/lib/utils';
import { PrimerosPasos, hayGuia } from './PrimerosPasos';
import type { DatosDeInicio } from './datos';

export function InicioMovil({ d, onCrear }: { d: DatosDeInicio; onCrear: () => void }) {
  if (d.loading) {
    return (
      <div className="space-y-5">
        <Skeleton className="-mx-[var(--pagina-x)] -mt-[var(--pagina-top)] h-[260px] rounded-none" />
        <Skeleton className="h-[140px]" />
      </div>
    );
  }

  if (d.loadError) {
    return (
      <Panel className="border-bad/25 bg-bad/5 p-5">
        <h2 className="text-md font-semibold text-bad">No hemos podido cargar tus datos</h2>
        <p className="mt-2 text-base leading-relaxed text-bad/90">{d.loadError}</p>
        <Button variant="secondary" size="sm" className="mt-4" onClick={() => void d.actions.refresh()}>
          Reintentar
        </Button>
      </Panel>
    );
  }

  const sinEquipos = d.teams.length === 0;

  return (
    <div className="-mt-[var(--pagina-top)]">
      <Heroe d={d} onCrear={onCrear} />

      <div className="space-y-5 pt-5">
        <PrimerosPasos />

        {sinEquipos ? (
          !hayGuia(d.data) && (
            <Panel className="px-4 py-1">
              <EmptyState
                title={d.admin ? 'Empieza creando el primer equipo' : 'Todavía no tienes ningún equipo asignado'}
                description={
                  d.admin
                    ? 'Todo lo demás cuelga de un equipo: la plantilla, el calendario y las sesiones.'
                    : 'La administración del club tiene que asignarte el tuyo.'
                }
                action={
                  d.admin ? (
                    <LinkButton to="/app/equipo-tecnico/nuevo-equipo" size="sm">Crear equipo</LinkButton>
                  ) : undefined
                }
              />
            </Panel>
          )
        ) : (
          <>
            <Detalle d={d} />
            <Cifras d={d} />
            <UltimaLista d={d} />
            <Actividad d={d} />
          </>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════ Héroe ════════════════════════════════ */

function Heroe({ d, onCrear }: { d: DatosDeInicio; onCrear: () => void }) {
  const s = d.siguiente;
  const rotulo = s === null
    ? 'Nada programado'
    : s.tipo === 'sesion' ? 'Próximo entrenamiento' : 'Próximo partido';

  const [horas, minutos] = (s?.dato.start ?? '').split(':');

  return (
    <section
      className="relative -mx-[var(--pagina-x)] overflow-hidden"
      style={{ paddingTop: 'var(--pagina-top)' }}
    >
      <FondoDeCampo />

      <div className="relative px-[var(--pagina-x)] pb-1 pt-3 text-center">
        <p className="text-sm font-medium text-ink-500">{rotulo}</p>

        {s ? (
          <>
            {/* LOS MINUTOS, MÁS PEQUEÑOS. Lo que se lee de un vistazo es la
                hora; el minuto es precisión y no tiene por qué pesar lo
                mismo. Es el mismo recurso que usan los bancos con los
                céntimos, y aquí vale por lo mismo: un dato tiene una parte
                gorda y una fina. */}
            <p className="cifra mt-2 flex items-baseline justify-center text-[56px]">
              <span>{horas}</span>
              <span className="text-[34px] text-ink-700">:{minutos}</span>
            </p>
            {/* El equipo va en la línea SÓLO si no hay cápsula debajo: con
                las dos, «Cadete A» salía dos veces en tres centímetros. */}
            <p className="mt-2 text-base text-ink-700">
              {relativeDay(s.dato.date)}
              {d.teams.length === 1 && d.equipo ? ` · ${d.equipo.name}` : ''}
            </p>
          </>
        ) : (
          <>
            <p className="cifra mx-auto mt-3 max-w-[22ch] text-2xl">
              {d.teams.length === 0 ? 'Monta tu equipo' : 'Tu semana está vacía'}
            </p>
            <p className="mt-2 text-base text-ink-600">{longDate(toISODate(today()))}</p>
          </>
        )}

        {/* La cápsula del equipo, debajo de la cifra: sólo cuando hay más de
            uno que elegir. Con un equipo no es un selector, es un adorno. */}
        {d.teams.length > 1 && (
          <div className="mt-4 flex justify-center">
            {/* `w` y nada de `left`: `Dropdown` ya pone el suyo según `align`, y
                mandarle otro deja las dos clases puestas a la vez y decidiendo
                por orden de hoja de estilos, que es una forma elegante de que
                algún día se mueva solo. */}
            <Dropdown
              className="w-[220px] max-w-[calc(100vw-2rem)]"
              align="left"
              trigger={
                <button className="flex h-9 max-w-[70vw] items-center gap-1.5 rounded-full bg-white/[0.09] px-4 text-sm font-medium text-ink-900 transition-colors active:bg-white/[0.16]">
                  <span className="truncate">{d.equipo?.name ?? 'Equipos'}</span>
                  <ChevronsUpDown size={13} className="shrink-0 text-ink-500" />
                </button>
              }
            >
              {(cerrar) => (
                <>
                  <p className="eyebrow px-2.5 py-1.5">Cambiar de equipo</p>
                  {d.teams.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => { d.setTeamId(t.id); cerrar(); }}
                      className={cn(
                        'block w-full truncate rounded px-2.5 py-2 text-left text-base transition-colors',
                        t.id === d.equipo?.id
                          ? 'bg-marca-600/14 font-medium text-ink-900'
                          : 'text-ink-700 hover:bg-surface',
                      )}
                    >
                      {t.name}
                    </button>
                  ))}
                </>
              )}
            </Dropdown>
          </div>
        )}
      </div>

      {/* Los cuatro discos. En rejilla de cuatro columnas y no en fila con
          hueco: así cada uno tiene exactamente el mismo ancho a cualquier
          tamaño de pantalla y las etiquetas quedan alineadas entre ellas.

          SIN EQUIPO NO HAY DISCOS. Los cuatro llevan a pantallas que
          necesitan un equipo —pasar lista de quién, crear la sesión de
          quién—, así que ofrecerlos antes de tener uno es ofrecer cuatro
          caminos que acaban en el mismo aviso. Ahí abajo está la guía, que
          dice la única cosa que se puede hacer. */}
      {/* Y CON TOPE DE ANCHO. En un iPad en vertical —768 px, que todavía no
          tiene barra lateral— cuatro columnas repartidas a lo ancho dejaban
          los discos a veinte centímetros unos de otros: dejaban de leerse
          como un grupo. Con tope quedan juntos y centrados, como en el
          teléfono. */}
      {d.teams.length > 0 && (
      <div className="relative mx-auto mt-7 grid max-w-[420px] grid-cols-4 gap-1 px-2 pb-6">
        <Disco a="/app/entrenamientos" icono={<ClipboardCheck size={21} />} nombre="Pasar lista">
          Lista
        </Disco>
        <Disco a="/app/entrenamientos/nuevo" icono={<CalendarPlus size={21} />} nombre="Crear entrenamiento">
          Sesión
        </Disco>
        <Disco a="/app/partidos/nuevo" icono={<Swords size={21} />} nombre="Añadir partido">
          Partido
        </Disco>
        <Disco onClick={onCrear} icono={<MoreHorizontal size={21} />} nombre="Más cosas que crear">
          Más
        </Disco>
      </div>
      )}
      {d.teams.length === 0 && <div className="pb-7" />}
    </section>
  );
}

/**
 * El campo, al fondo.
 *
 * Tres trazos de un campo de fútbol —la línea de medio campo, el círculo
 * central y la media luna del área— a un 5 % de luz, más un resplandor azul
 * arriba. No es una imagen: es un SVG de cinco figuras que pesa lo que pesa
 * este párrafo y escala a cualquier ancho sin pixelarse.
 */
function FondoDeCampo() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-0 overflow-hidden" aria-hidden>
      {/* El resplandor. Un degradado radial, que el compositor resuelve solo:
          sin filtros y sin capas que recomponer al desplazarse. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(120% 78% at 50% -8%, rgba(22,139,255,0.26) 0%, rgba(22,139,255,0.10) 38%, rgba(6,12,27,0) 72%)',
        }}
      />
      {/* DOS TRAZOS, NO UN CAMPO ENTERO. La primera versión dibujaba también
          las dos áreas, y a este tamaño sus líneas rectas aparecían cortadas
          por los bordes en sitios arbitrarios: no se leían como un campo, se
          leían como rayas sueltas. Con el círculo central y la línea de
          medio campo —centrados justo donde está la cifra— sí se reconoce, y
          además hace de halo detrás de la hora. */}
      <svg
        className="absolute left-1/2 top-[76px] h-[420px] w-[420px] -translate-x-1/2 text-white"
        viewBox="0 0 200 200"
        fill="none"
        opacity="0.055"
        aria-hidden
      >
        <line x1="-200" y1="100" x2="400" y2="100" stroke="currentColor" strokeWidth="1" />
        <circle cx="100" cy="100" r="68" stroke="currentColor" strokeWidth="1" />
        <circle cx="100" cy="100" r="1.8" fill="currentColor" />
      </svg>
      {/* Y el fundido con la página: sin él, el héroe termina en una línea
          recta y se ve el corte. */}
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-surface" />
    </div>
  );
}

function Disco({
  a, onClick, icono, nombre, children,
}: {
  a?: string;
  onClick?: () => void;
  icono: React.ReactNode;
  /** El nombre entero, para quien no ve la pantalla. */
  nombre: string;
  children: React.ReactNode;
}) {
  const dentro = (
    <>
      <span className="grid h-14 w-14 place-items-center rounded-full bg-white/[0.09] text-ink-900 transition-[transform,background-color] duration-120 group-active:scale-95 group-active:bg-white/[0.16]">
        {icono}
      </span>
      <span className="text-2xs font-medium leading-none text-ink-700">{children}</span>
    </>
  );
  const clases = 'group flex flex-col items-center gap-2 py-1';
  return a ? (
    <Link to={a} aria-label={nombre} className={clases}>{dentro}</Link>
  ) : (
    <button type="button" onClick={onClick} aria-label={nombre} className={clases}>{dentro}</button>
  );
}

/* ═════════════════════════════════ Fichas ═════════════════════════════════ */

/** Lo siguiente, con su contenido. La hora ya está arriba y no se repite. */
function Detalle({ d }: { d: DatosDeInicio }) {
  const s = d.siguiente;
  if (!s) {
    return (
      <Panel className="px-4 py-1">
        <EmptyState
          title="No tienes nada programado"
          description="El próximo entrenamiento o partido aparecerá aquí."
          action={<LinkButton to="/app/entrenamientos/nuevo" size="sm">Crear entrenamiento</LinkButton>}
        />
      </Panel>
    );
  }

  if (s.tipo === 'sesion') {
    const ses = s.dato;
    return (
      <Panel className="p-4">
        <div className="flex items-start justify-between gap-3">
          <p className="min-w-0 text-md font-semibold leading-snug text-ink-900">{ses.title}</p>
          <Tag size="sm">{minutesToLabel(ses.duration)}</Tag>
        </div>

        <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-ink-600">
          {ses.venue && (
            <span className="flex min-w-0 items-center gap-1.5">
              <MapPin size={14} className="shrink-0 text-ink-400" />
              <span className="truncate">{ses.venue}</span>
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <Users size={14} className="text-ink-400" />
            {ses.expectedPlayers} jugadoras
          </span>
        </div>

        {/* La forma de la sesión: dónde está el grueso y cuánto dura el
            calentamiento, sin abrirla. */}
        {ses.blocks.length > 0 && (
          <div className="mt-3.5">
            <div className="flex gap-1">
              {ses.blocks.map((b) => (
                <div
                  key={b.id}
                  title={`${b.title} · ${b.duration}′`}
                  className="h-1.5 rounded-full bg-ink-300"
                  style={{ flex: b.duration }}
                />
              ))}
            </div>
            <p className="mt-2 truncate text-xs text-ink-500">
              {ses.blocks.length} bloques{ses.objective ? ` · ${ses.objective}` : ''}
            </p>
          </div>
        )}

        <div className="mt-4 grid grid-cols-2 gap-2">
          <LinkButton to={`/app/entrenamientos/${ses.id}`} size="sm" block>Ver</LinkButton>
          <LinkButton to="/app/entrenamientos" size="sm" variant="quiet" block>Pasar lista</LinkButton>
        </div>

        {d.partido && (
          <Siguiente
            a={`/app/partidos/${d.partido.id}`}
            texto={`${d.partido.home ? 'vs' : 'en'} ${d.partido.opponent}`}
            cuando={`${relativeDay(d.partido.date)} · ${d.partido.start}`}
          />
        )}
      </Panel>
    );
  }

  const p = s.dato;
  return (
    <Panel className="p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 text-md font-semibold leading-snug text-ink-900">
          {p.home ? `${d.nombreClub} · ${p.opponent}` : `${p.opponent} · ${d.nombreClub}`}
        </p>
        <Tag size="sm">{p.home ? 'En casa' : 'Fuera'}</Tag>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-ink-600">
        <span className="flex items-center gap-1.5">
          <Clock size={14} className="text-ink-400" />
          {longDate(p.date)}
        </span>
        {p.venue && (
          <span className="flex min-w-0 items-center gap-1.5">
            <MapPin size={14} className="shrink-0 text-ink-400" />
            <span className="truncate">{p.venue}</span>
          </span>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <LinkButton to={`/app/partidos/${p.id}`} size="sm" block>Ver</LinkButton>
        <LinkButton to={`/app/partidos/${p.id}`} size="sm" variant="quiet" block>Convocatoria</LinkButton>
      </div>

      {d.sesion && (
        <Siguiente
          a={`/app/entrenamientos/${d.sesion.id}`}
          texto={d.sesion.title}
          cuando={`${relativeDay(d.sesion.date)} · ${d.sesion.start}`}
        />
      )}
    </Panel>
  );
}

/** Y lo otro que viene, en una línea dentro de la misma ficha. */
function Siguiente({ a, texto, cuando }: { a: string; texto: string; cuando: string }) {
  return (
    <Link
      to={a}
      className="-mx-4 -mb-4 mt-4 flex items-center gap-2.5 border-t border-line-sutil px-4 py-3 transition-colors active:bg-raised"
    >
      <span className="eyebrow shrink-0">Después</span>
      <span className="min-w-0 flex-1 truncate text-base text-ink-800">{texto}</span>
      <span className="shrink-0 text-sm tabular-nums text-ink-500">{cuando}</span>
      <ChevronRight size={15} className="shrink-0 text-ink-400" />
    </Link>
  );
}

/** Las cuatro cifras del equipo, en dos filas de dos. */
function Cifras({ d }: { d: DatosDeInicio }) {
  const media = d.resumen?.attendanceRate;
  const fuera = d.resumen?.unavailable ?? 0;
  return (
    <section>
      <SectionHeader
        title="Tu equipo"
        hint={d.equipo?.name}
        action={<Link to="/app/analiticas" className="active:text-marca-400">Analíticas</Link>}
      />
      <div className="mt-2.5 grid grid-cols-2 gap-2.5">
        <Cifra a="/app/plantilla" nombre="Plantilla" valor={d.plantilla.length}
               pie={d.plantilla.length === 1 ? 'jugadora' : 'jugadoras'} />
        {/* NULO NO ES CERO: sin ninguna lista pasada no hay media que enseñar,
            y un 0 % diría que no va nadie a entrenar. */}
        <Cifra a="/app/analiticas" nombre="Asistencia"
               valor={media === null || media === undefined ? '—' : `${media} %`}
               pie={media === null || media === undefined ? 'sin listas' : 'últimas 6'} />
        <Cifra a="/app/disponibilidad" nombre="No disponibles" valor={fuera}
               pie={fuera > 0 ? 'revisar' : 'plantilla entera'} alerta={fuera > 0} />
        <Cifra
          a={d.partido ? `/app/partidos/${d.partido.id}` : '/app/partidos'}
          nombre="Convocatoria"
          valor={d.callup ? `${d.confirmadas}/${d.convocadas.length}` : '—'}
          pie={d.callup ? 'confirmadas' : 'sin crear'}
        />
      </div>
    </section>
  );
}

function Cifra({
  a, nombre, valor, pie, alerta,
}: { a: string; nombre: string; valor: React.ReactNode; pie: string; alerta?: boolean }) {
  return (
    <Link
      to={a}
      className="min-w-0 rounded-2xl border border-line-sutil bg-panel px-3.5 py-3 transition-colors active:bg-raised"
    >
      <p className="truncate text-2xs font-medium uppercase tracking-[0.07em] text-ink-500">{nombre}</p>
      <p className={cn('mt-1.5 font-display text-xl font-semibold leading-none tabular-nums',
        alerta ? 'text-warn' : 'text-ink-900')}>
        {valor}
      </p>
      <p className="mt-1 truncate text-2xs text-ink-500">{pie}</p>
    </Link>
  );
}

function UltimaLista({ d }: { d: DatosDeInicio }) {
  if (!d.ultimaLista) return null;
  const m = d.marcas;
  return (
    <section className="rounded-2xl border border-line-sutil bg-panel px-3.5 py-3">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-medium text-ink-800">
          Última lista · {relativeDay(d.ultimaLista.date).toLowerCase()}
        </p>
        <Link to="/app/entrenamientos" className="shrink-0 text-xs font-medium text-ink-600 active:text-ink-900">
          Pasar lista
        </Link>
      </div>
      <SplitBar
        className="mt-2.5"
        segments={[
          { value: m.present + m.late, color: 'bg-ink-800', label: 'Vinieron' },
          { value: m.justified + m.injured, color: 'bg-warn', label: 'Justificadas' },
          { value: m.absent, color: 'bg-bad', label: 'Ausentes' },
          { value: m.unregistered, color: 'bg-line', label: 'Sin registrar' },
        ]}
      />
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-600">
        <Leyenda color="bg-ink-800" n={m.present + m.late} texto="vinieron" />
        <Leyenda color="bg-warn" n={m.justified + m.injured} texto="justificadas" />
        <Leyenda color="bg-bad" n={m.absent} texto={m.absent === 1 ? 'ausente' : 'ausentes'} />
      </div>
    </section>
  );
}

function Leyenda({ color, n, texto }: { color: string; n: number; texto: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn('h-1.5 w-1.5 rounded-full', color)} />
      <span className="tabular-nums">{n}</span> {texto}
    </span>
  );
}

function Actividad({ d }: { d: DatosDeInicio }) {
  return (
    <section>
      <SectionHeader title="Actividad reciente" />
      {d.data.activity.length === 0 ? (
        <EmptyState
          className="mt-1"
          title="Todavía no hay movimiento"
          description="Aquí irá apareciendo lo que hagáis: altas, entrenamientos, partidos y listas pasadas."
        />
      ) : (
        <ul className="mt-3 space-y-3">
          {d.data.activity.slice(0, 5).map((a) => (
            <li key={a.id} className="flex gap-3">
              <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-ink-400" />
              <div className="min-w-0 flex-1">
                {a.link ? (
                  <Link to={a.link} className="text-sm leading-snug text-ink-700 active:text-ink-900">
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
  );
}
