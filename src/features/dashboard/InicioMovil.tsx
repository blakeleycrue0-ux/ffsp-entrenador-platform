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
 * TODO VA SOBRE LA IMAGEN, SIN PLIEGO.
 * ───────────────────────────────────────────────────────────────────────────
 * Aquí había una hoja gris clara —el pliego— que empezaba justo debajo de los
 * accesos y partía la pantalla en dos mitades con un canto redondeado: negro
 * arriba, gris abajo. Resolvía un problema real —el texto oscuro no puede
 * caer sobre la banda negra al desplazarse— pero a costa de romper el fondo
 * por la mitad.
 *
 * La solución es la contraria: que no haya texto oscuro. El fondo es una sola
 * imagen continua de la cabecera a la navegación, y lo que va encima está en
 * blanco sobre superficies de cristal oscuro —`.vidrio-foto`—, que dejan ver
 * la imagen por debajo en vez de taparla. Una tarjeta, sus márgenes a los
 * lados y nada más alrededor: ningún contenedor envolviéndolo todo.
 */

import { Link } from 'react-router-dom';
import {
  CalendarPlus, ChevronRight, ChevronsUpDown, ClipboardCheck, Clock, MapPin,
  MoreHorizontal, Swords, Users,
} from 'lucide-react';
import { Dropdown, Skeleton } from '@/components/ui';
import { cn, longDate, minutesToLabel, relativeDay, toISODate, today } from '@/lib/utils';
import { PrimerosPasos, hayGuia } from './PrimerosPasos';
import { Pendientes } from './Pendientes';
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
      <div className="vidrio-foto rounded-2xl p-5">
        <h2 className="text-md font-semibold text-white">No hemos podido cargar tus datos</h2>
        <p className="mt-2 text-base leading-relaxed text-white/75">{d.loadError}</p>
        <button
          onClick={() => void d.actions.refresh()}
          className="mt-4 h-9 rounded-lg bg-white px-3.5 text-sm font-medium text-ink-900"
        >
          Reintentar
        </button>
      </div>
    );
  }

  const sinEquipos = d.teams.length === 0;

  return (
    /* EL HUECO DE ABAJO LO PONE ESTA PANTALLA. Lo traía el pliego, y al
       quitarlo los pendientes se quedaban debajo de la pastilla flotante:
       la última línea no se podía leer ni tocar. `--hueco-inferior` es el
       alto de la navegación más su aire y el área segura del teléfono. */
    <div className="-mt-[var(--pagina-top)]" style={{ paddingBottom: 'var(--hueco-inferior)' }}>
      <Heroe d={d} onCrear={onCrear} />

      <div className="space-y-4">
        {sinEquipos ? (
          /* SIN EQUIPO, LA GUÍA ES LO ÚNICO QUE HAY. Al bajarla debajo de la
             tarjeta del entrenamiento se quedó dentro de la rama que exige
             equipo, y un club recién creado —justo quien la necesita— se
             quedaba con una pantalla sin una sola cosa que hacer. Aquí va
             arriba porque no hay tarjeta debajo de la que ponerse. */
          hayGuia(d.data) ? <PrimerosPasos sobreFoto /> : (
            <div data-vacio="fila" className="vidrio-foto rounded-2xl px-4 py-5 text-center">
              <h2 className="text-md font-semibold text-white">
                {d.admin ? 'Empieza creando el primer equipo' : 'Todavía no tienes ningún equipo asignado'}
              </h2>
              <p className="mx-auto mt-1.5 max-w-md text-base leading-relaxed text-white/70">
                {d.admin
                  ? 'Todo lo demás cuelga de un equipo: la plantilla, el calendario y las sesiones.'
                  : 'La administración del club tiene que asignarte el tuyo.'}
              </p>
              {d.admin && (
                <Link
                  to="/app/equipo-tecnico/nuevo-equipo"
                  className="mt-5 inline-flex h-9 items-center rounded-lg bg-white px-3.5 text-sm font-medium text-ink-900"
                >
                  Crear equipo
                </Link>
              )}
            </div>
          )
        ) : (
          <>
            <Detalle d={d} />
            {/* DEBAJO DE LA TARJETA DEL ENTRENAMIENTO, y como fila. Estaba
                encima y en forma de tarjeta, compitiendo con lo único que de
                verdad se viene a ver aquí. */}
            <PrimerosPasos sobreFoto />
            <Pendientes d={d} sobreFoto className="pt-1" />
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
    /* SIN FONDO PROPIO. Aquí había un resplandor azul, el arco de un campo de
       fútbol y un fundido hacia el color de la página: tres capas peleándose
       con el fondo de la plataforma, que ya es negro. El héroe no pinta
       nada; se apoya en el negro y pone encima texto blanco.

       Y MUCHO MÁS AIRE. El dato principal de la pantalla estaba apretado
       entre la cabecera y los accesos; ahora respira arriba y abajo, que es
       lo que lo convierte en el centro de la pantalla. */
    <section
      className="relative -mx-[var(--pagina-x)]"
      style={{ paddingTop: 'var(--pagina-top)' }}
    >
      <div className="heroe relative px-[var(--pagina-x)] pb-2 text-center">
        <p className="text-sm font-medium text-white/55">{rotulo}</p>

        {s ? (
          <>
            {/* LOS MINUTOS, MÁS PEQUEÑOS. Lo que se lee de un vistazo es la
                hora; el minuto es precisión y no tiene por qué pesar lo
                mismo. Es el mismo recurso que usan los bancos con los
                céntimos, y aquí vale por lo mismo: un dato tiene una parte
                gorda y una fina. */}
            {/* LOS DOS TROZOS, BLANCOS. Los minutos eran de un gris azulado
                —`ink-700` sobre el azul noche— y eso partía la hora en dos
                datos: uno importante y otro apagado. Son la misma hora. Los
                minutos siguen siendo algo menores, que es lo que hace que
                «18» se lea primero, pero del mismo color: una unidad. */}
            <p className="cifra mt-3 flex items-baseline justify-center text-[64px] text-white">
              <span>{horas}</span>
              <span className="text-[40px]">:{minutos}</span>
            </p>
            <p className="mt-3 text-base text-white/60">
              {relativeDay(s.dato.date)}
              {d.teams.length === 1 && d.equipo ? ` · ${d.equipo.name}` : ''}
            </p>
          </>
        ) : (
          <>
            <p className="cifra mx-auto mt-4 max-w-[22ch] text-2xl text-white">
              {d.teams.length === 0 ? 'Monta tu equipo' : 'Tu semana está vacía'}
            </p>
            <p className="mt-3 text-base text-white/60">{longDate(toISODate(today()))}</p>
          </>
        )}

        {/* La cápsula del equipo, debajo de la cifra: sólo cuando hay más de
            uno que elegir. Con un equipo no es un selector, es un adorno. */}
        {d.teams.length > 1 && (
          <div className="mt-3.5 flex justify-center">
            {/* `w` y nada de `left`: `Dropdown` ya pone el suyo según `align`, y
                mandarle otro deja las dos clases puestas a la vez y decidiendo
                por orden de hoja de estilos, que es una forma elegante de que
                algún día se mueva solo. */}
            <Dropdown
              className="w-[220px] max-w-[calc(100vw-2rem)]"
              align="left"
              trigger={
                <button className="flex h-9 max-w-[70vw] items-center gap-1.5 rounded-full bg-white/12 px-4 text-sm font-medium text-white transition-colors active:bg-white/20">
                  <span className="truncate">{d.equipo?.name ?? 'Equipos'}</span>
                  <ChevronsUpDown size={13} className="shrink-0 text-white/60" />
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
                          ? 'bg-ink-900 font-medium text-white'
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
      {/* LAS CUATRO ACCIONES. Las etiquetas dicen lo que hacen: «Asistencia»
          en vez de «Lista» —que podía ser la lista de jugadoras— y «Entreno»
          en vez de «Sesión», que es una palabra de software. Y los iconos
          explican la acción: una pizarra con marca para pasar asistencia, un
          calendario con un más para apuntar un entreno, un balón para el
          partido. Nada decorativo. */}
      {d.teams.length > 0 && (
      <div className="heroe-acciones relative mx-auto grid max-w-[400px] grid-cols-4 gap-1 px-2">
        <Disco a="/app/entrenamientos" icono={<ClipboardCheck size={21} />} nombre="Pasar asistencia">
          Asistencia
        </Disco>
        <Disco a="/app/entrenamientos/nuevo" icono={<CalendarPlus size={21} />} nombre="Apuntar un entrenamiento">
          Entreno
        </Disco>
        <Disco a="/app/partidos/nuevo" icono={<Swords size={21} />} nombre="Apuntar un partido">
          Partido
        </Disco>
        <Disco onClick={onCrear} icono={<MoreHorizontal size={21} />} nombre="Más cosas que crear">
          Más
        </Disco>
      </div>
      )}
      {d.teams.length === 0 && <div className="pb-10" />}
    </section>
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
      <span className="grid h-[58px] w-[58px] place-items-center rounded-full bg-white/[0.12] text-white transition-[transform,background-color] duration-120 group-active:scale-95 group-active:bg-white/20">
        {icono}
      </span>
      <span className="text-xs font-medium leading-none text-white">{children}</span>
    </>
  );
  const clases = 'group flex flex-col items-center gap-2.5 py-1';
  return a ? (
    <Link to={a} aria-label={nombre} className={clases}>{dentro}</Link>
  ) : (
    <button type="button" onClick={onClick} aria-label={nombre} className={clases}>{dentro}</button>
  );
}

/* ═════════════════════════════════ Fichas ═════════════════════════════════ */

/**
 * La tarjeta, sobre la imagen.
 *
 * ES CRISTAL, NO UNA HOJA OPACA. `.vidrio-foto` es blanco al 10 % con un
 * desenfoque por detrás: la imagen se sigue viendo a través de ella, con sus
 * claros y sus oscuros, y la tarjeta se lee como algo apoyado encima y no
 * como un recorte pegado. Por eso todo lo de dentro va en blanco.
 *
 * LOS DOS BOTONES, AHORA SÍ, AL REVÉS. Aquí el principal es BLANCO con texto
 * negro: sobre una superficie oscura es lo que más contrasta. En el resto de
 * la aplicación —tarjetas grises claras— es al revés, negro sobre claro. La
 * regla es la misma en los dos sitios: la acción principal es la que más
 * contrasta con lo que tiene debajo.
 */
const PRINCIPAL =
  'flex h-11 w-full items-center justify-center rounded-xl bg-white text-base font-semibold'
  + ' text-ink-900 transition-colors active:bg-white/85';
const SECUNDARIO =
  'flex h-11 w-full items-center justify-center rounded-xl border border-white/25 bg-white/10'
  + ' text-base font-medium text-white transition-colors active:bg-white/20';

/** Lo siguiente, con su contenido. La hora ya está arriba y no se repite. */
function Detalle({ d }: { d: DatosDeInicio }) {
  const s = d.siguiente;
  if (!s) {
    return (
      <div data-vacio="fila" className="vidrio-foto rounded-2xl px-4 py-5 text-center">
        <h2 className="text-md font-semibold text-white">No tienes nada programado</h2>
        <p className="mx-auto mt-1.5 max-w-md text-base leading-relaxed text-white/70">
          El próximo entrenamiento o partido aparecerá aquí.
        </p>
        <Link
          to="/app/entrenamientos/nuevo"
          className="mt-5 inline-flex h-9 items-center rounded-lg bg-white px-3.5 text-sm font-medium text-ink-900"
        >
          Crear entrenamiento
        </Link>
      </div>
    );
  }

  if (s.tipo === 'sesion') {
    const ses = s.dato;
    return (
      <div className="vidrio-foto rounded-2xl p-5">
        <div className="flex items-start justify-between gap-3">
          <p className="min-w-0 text-md font-semibold leading-snug text-white">{ses.title}</p>
          <span className="shrink-0 rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-2xs font-medium text-white/85">
            {minutesToLabel(ses.duration)}
          </span>
        </div>

        <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-white/70">
          {ses.venue && (
            <span className="flex min-w-0 items-center gap-1.5">
              <MapPin size={14} className="shrink-0 text-white/55" />
              <span className="truncate">{ses.venue}</span>
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <Users size={14} className="text-white/55" />
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
                  className="h-1.5 rounded-full bg-white/30"
                  style={{ flex: b.duration }}
                />
              ))}
            </div>
            <p className="mt-2 truncate text-xs text-white/55">
              {ses.blocks.length} bloques{ses.objective ? ` · ${ses.objective}` : ''}
            </p>
          </div>
        )}

        {/* UNA ACCIÓN PRINCIPAL, Y DICE A DÓNDE VA. Eran dos botones del
            mismo tamaño repartidos a mitades —«Ver» y «Pasar lista»—, y a
            mitades los dos pesan lo mismo. «Ver entrenamiento» es lo que se
            viene a hacer desde aquí; pasar lista es lo de después. */}
        <div className="mt-5 flex flex-col gap-2">
          <Link to={`/app/entrenamientos/${ses.id}`} className={PRINCIPAL}>Ver entrenamiento</Link>
          <Link to={`/app/entrenamientos/${ses.id}/asistencia`} className={SECUNDARIO}>Pasar lista</Link>
        </div>

        {d.partido && (
          <Siguiente
            a={`/app/partidos/${d.partido.id}`}
            texto={`${d.partido.home ? 'vs' : 'en'} ${d.partido.opponent}`}
            cuando={`${relativeDay(d.partido.date)} · ${d.partido.start}`}
          />
        )}
      </div>
    );
  }

  const p = s.dato;
  return (
    <div className="vidrio-foto rounded-2xl p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 text-md font-semibold leading-snug text-white">
          {p.home ? `${d.nombreClub} · ${p.opponent}` : `${p.opponent} · ${d.nombreClub}`}
        </p>
        <span className="shrink-0 rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-2xs font-medium text-white/85">
          {p.home ? 'En casa' : 'Fuera'}
        </span>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-white/70">
        <span className="flex items-center gap-1.5">
          <Clock size={14} className="text-white/55" />
          {longDate(p.date)}
        </span>
        {p.venue && (
          <span className="flex min-w-0 items-center gap-1.5">
            <MapPin size={14} className="shrink-0 text-white/55" />
            <span className="truncate">{p.venue}</span>
          </span>
        )}
      </div>

      <div className="mt-5 flex flex-col gap-2">
        <Link to={`/app/partidos/${p.id}`} className={PRINCIPAL}>Ver partido</Link>
        <Link to={`/app/partidos/${p.id}`} className={SECUNDARIO}>Convocatoria</Link>
      </div>

      {d.sesion && (
        <Siguiente
          a={`/app/entrenamientos/${d.sesion.id}`}
          texto={d.sesion.title}
          cuando={`${relativeDay(d.sesion.date)} · ${d.sesion.start}`}
        />
      )}
    </div>
  );
}

/** Y lo otro que viene, en una línea dentro de la misma ficha. */
function Siguiente({ a, texto, cuando }: { a: string; texto: string; cuando: string }) {
  return (
    <Link
      to={a}
      className="-mx-5 -mb-5 mt-5 flex items-center gap-2.5 border-t border-white/12 px-5 py-3 transition-colors active:bg-white/10"
    >
      <span className="shrink-0 text-2xs font-semibold uppercase tracking-[0.09em] text-white/50">Después</span>
      <span className="min-w-0 flex-1 truncate text-base text-white/85">{texto}</span>
      <span className="shrink-0 text-sm tabular-nums text-white/60">{cuando}</span>
      <ChevronRight size={15} className="shrink-0 text-white/50" />
    </Link>
  );
}
