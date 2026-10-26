/**
 * EL ALTA, CON LA CARA DE LA PORTADA.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Una pregunta por pantalla. Nada más. Ni dos campos, ni una columna al lado,
 * ni un resumen de lo que viene: quien está dando de alta un club no quiere
 * leer, quiere contestar y seguir.
 *
 * POR QUÉ SE PARECE A LA PÁGINA PÚBLICA, Y NO A LA PLATAFORMA. El alta es el
 * último trozo de la portada, no el primero de la aplicación: se llega desde
 * un anuncio, se contesta seis veces y se entra. Si la portada es azul y
 * clara y aquí aparece de golpe una pantalla gris de herramienta, la sensación
 * es la de haber caído en otro producto.
 *
 * Por eso usa SUS MISMAS PIEZAS, no una imitación: `.cielo`, `.t-l`,
 * `.entradilla`, `.rotulo` y los botones `.btn` salen de `index.css` y son
 * literalmente los de la portada. El día que allí se cambie el azul, esto
 * cambia solo.
 *
 * ── LO QUE SE ARREGLÓ POR EL CAMINO ────────────────────────────────────────
 *
 * NADA SE CORTA. Cada paso cabe en una pantalla de iPhone SE sin desplazar, y
 * los dos pasos largos —el horario y el plan— se desplazan por dentro de su
 * tarjeta, no por debajo del botón.
 *
 * NADA SALTA. La barra de progreso y el botón están SIEMPRE en el mismo
 * sitio, pase lo que pase en medio. Antes el botón subía y bajaba según
 * cuántas líneas tuviera el paso, y al avanzar había que volver a buscarlo.
 *
 * ── LO QUE NO SE HA TOCADO ────────────────────────────────────────────────
 *
 * TODA la lógica del alta. Cada paso guarda de verdad al pasar al siguiente,
 * se puede saltar lo que no es imprescindible, y el espacio de trabajo se
 * recarga UNA sola vez, al final: recargarlo antes haría que la aplicación
 * diera el alta por terminada y se llevara por delante los pasos que faltan.
 */

import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Plus, X } from 'lucide-react';
import { useClub } from '@/store/store';
import { clubs } from '@/services/clubs';
import { db } from '@/services/db';
import { humanError } from '@/services/supabase';
import { ASSIGNABLE_ROLES, ROLE_LABEL } from '@/services/auth';
import { Input, Select } from '@/components/ui';
import { Cielo, CampoCielo, OpcionCielo, BotonCielo, AvisoCielo } from '@/components/ui/Cielo';
import { Wordmark } from '@/components/ui/Brand';
import { PasoPlan } from './PasoPlan';
import { deportes, apuntaDeporte, FUTBOL, type Deporte } from '@/services/deportes';
import { dayName, toISODate } from '@/lib/utils';
import { citasDelHorario } from '@/lib/horario';
import type { Staff, TrainingSlot } from '@/types';

const WEEKDAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

const temporadaActual = () => {
  const hoy = new Date();
  const inicio = hoy.getMonth() >= 6 ? hoy.getFullYear() : hoy.getFullYear() - 1;
  return `${inicio}/${String((inicio + 1) % 100).padStart(2, '0')}`;
};

/* El orden es el del trabajo real: primero quién eres, luego qué diriges.
   `deporte` entra después del club y antes del equipo, que es cuando ya hay
   dónde apuntarlo y todavía no se ha creado nada que dependa de él. */
const ORDEN = [
  'bienvenida', 'nombre', 'cargo', 'club', 'deporte', 'equipo', 'horarios', 'plan', 'listo',
] as const;
type Paso = (typeof ORDEN)[number];

/** La bienvenida y el final no son trabajo: no cuentan como paso numerado. */
const NUMERADOS = ORDEN.filter((p) => p !== 'bienvenida' && p !== 'listo');

const CARGOS = ASSIGNABLE_ROLES.filter((r) => r !== 'admin-club');

export default function Onboarding() {
  const { userId, actions, signOut } = useClub();
  const [paso, setPaso] = useState<Paso>('bienvenida');
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const [nombre, setNombre] = useState('');
  const [cargo, setCargo] = useState<Staff['role']>(CARGOS[0]);
  const [club, setClub] = useState('');
  const [clubCorto, setClubCorto] = useState('');
  const [clubId, setClubId] = useState<string | null>(null);
  const [deporte, setDeporte] = useState<string>(FUTBOL);
  const [losDeportes, setLosDeportes] = useState<Deporte[]>([]);
  const [equipo, setEquipo] = useState('');
  const [categoria, setCategoria] = useState('');
  const [horarios, setHorarios] = useState<TrainingSlot[]>([]);
  const [equipoCreado, setEquipoCreado] = useState(false);

  /* Los deportes se piden una vez y pronto: cuando se llegue a ese paso ya
     están, así que no hay un parpadeo de lista vacía a mitad del alta. */
  useEffect(() => { void deportes().then(setLosDeportes); }, []);

  /* ── LA BARRA DEL NAVEGADOR, DEL COLOR DEL CIELO ───────────────────────
     Safari pinta su barra de abajo con el `theme-color` de la página, que es
     el gris claro de la aplicación: encima del azul se veía como una franja
     blanca pegada al borde. Mientras dure el alta se pone el azul del
     cielo, y al salir se devuelve el que había. */
  useEffect(() => {
    const metas = [...document.querySelectorAll('meta[name="theme-color"]')] as HTMLMetaElement[];
    const antes = metas.map((m) => m.content);
    metas.forEach((m) => { m.content = '#1E86FB'; });
    return () => { metas.forEach((m, i) => { m.content = antes[i]; }); };
  }, []);

  const elegido = losDeportes.find((d) => d.code === deporte);

  const ir = (p: Paso) => { setError(null); setPaso(p); };
  const atras = () => {
    const i = ORDEN.indexOf(paso);
    if (i > 0) ir(ORDEN[i - 1]);
  };

  const avanzar = async (accion: () => Promise<void>) => {
    setError(null);
    setOcupado(true);
    try {
      await accion();
    } catch (e) {
      setError(humanError(e));
    } finally {
      setOcupado(false);
    }
  };

  const guardarNombre = () =>
    avanzar(async () => {
      if (nombre.trim().length < 2) {
        setError('Escribe tu nombre para que la plataforma no te llame por tu correo.');
        return;
      }
      if (!userId) { setError('Tu sesión ha caducado. Vuelve a entrar.'); return; }
      // Se guarda YA: si se cierra la pestaña ahora, el nombre no se pierde.
      await db.updateProfile(userId, { full_name: nombre.trim() });
      ir('cargo');
    });

  const guardarCargo = () =>
    avanzar(async () => {
      if (!userId) { setError('Tu sesión ha caducado. Vuelve a entrar.'); return; }
      await db.updateProfile(userId, { role: cargo });
      ir('club');
    });

  const crearClub = () =>
    avanzar(async () => {
      if (club.trim().length < 2) { setError('El club necesita un nombre.'); return; }
      const res = await clubs.create(club, clubCorto);
      if (!res.ok) { setError(res.error); return; }
      /* AQUÍ NO SE RECARGA EL ESPACIO DE TRABAJO, y es a propósito: esta
         pantalla se enseña porque no hay club, y en cuanto la recarga trajera
         uno, la aplicación daría el alta por terminada. */
      setClubId(res.club.id);
      ir('deporte');
    });

  const crearEquipo = () =>
    avanzar(async () => {
      if (!clubId || !userId) {
        setError('Se ha perdido el club por el camino. Recarga la página y vuelve a intentarlo.');
        return;
      }
      const creado = await db.saveTeam(
        {
          id: '', clubId, name: equipo.trim(), category: categoria.trim(),
          season: temporadaActual(), competition: '', venue: '', trainingSlots: horarios,
        },
        userId,
      );

      /* El deporte, en el club y en el equipo. No lanza si falla: ya están
         creados y en fútbol, que es el valor por defecto, y se cambia desde
         ajustes. Tumbar un alta terminada por una preferencia sería
         desproporcionado. */
      await apuntaDeporte(clubId, creado.id, deporte);

      /* Los entrenamientos del horario, de verdad, tres meses por delante.
         SI ESTO FALLA, EL ALTA SIGUE: el equipo ya está y el horario
         guardado; se pueden repartir luego desde «Añadir varios». */
      if (horarios.length > 0) {
        try {
          const hasta = new Date();
          hasta.setMonth(hasta.getMonth() + 3);
          const citas = citasDelHorario(horarios, toISODate(new Date()), toISODate(hasta));
          if (citas.length > 0) {
            await db.saveSessions(
              citas.map((c) => ({
                id: '', teamId: creado.id,
                title: `Entrenamiento del ${dayName(c.fecha).toLowerCase()}`,
                date: c.fecha, start: c.inicio, duration: c.minutos, venue: c.lugar,
                objective: '', expectedPlayers: 0, material: [], blocks: [],
                status: 'planificado' as const,
              })),
              userId,
            );
          }
        } catch (e) {
          console.error('No se han podido repartir los entrenamientos del horario', e);
        }
      }

      setEquipoCreado(true);
      ir('plan');
    });

  const numero = paso === 'listo'
    ? NUMERADOS.length
    : NUMERADOS.indexOf(paso as (typeof NUMERADOS)[number]) + 1;
  const avance = paso === 'bienvenida' ? 0 : (numero / NUMERADOS.length) * 100;

  /* Qué hace el botón de abajo en cada paso, en un solo sitio. Repartido por
     el JSX era imposible saber si alguno se había quedado sin acción. */
  const siguiente: Partial<Record<Paso, { texto: string; puede: boolean; hacer: () => void }>> = {
    bienvenida: { texto: 'Empezar', puede: true, hacer: () => ir('nombre') },
    nombre:     { texto: 'Continuar', puede: nombre.trim().length >= 2, hacer: () => void guardarNombre() },
    cargo:      { texto: 'Continuar', puede: true, hacer: () => void guardarCargo() },
    club:       { texto: 'Crear el club', puede: club.trim().length >= 2, hacer: () => void crearClub() },
    deporte:    { texto: 'Continuar', puede: true, hacer: () => ir('equipo') },
    equipo:     { texto: 'Continuar', puede: equipo.trim().length > 0, hacer: () => ir('horarios') },
    horarios:   { texto: 'Crear el equipo', puede: true, hacer: () => void crearEquipo() },
  };
  const boton = siguiente[paso];

  return (
    /* `.portada` trae la tipografía y el aire de la página pública; `.cielo`,
       su azul. Son las clases de verdad, no una copia. */
    <Cielo
      cabecera={
        /* La barra de progreso, pegada arriba del todo: debajo de la isla y
           no detrás, que el relleno del área segura lo pone `Cielo`. */
        <>
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={paso === 'bienvenida' ? () => void signOut() : atras}
            aria-label={paso === 'bienvenida' ? 'Salir' : 'Atrás'}
            className="-ml-1.5 grid h-9 w-9 shrink-0 place-items-center rounded-full text-white/70 transition-colors active:bg-white/15 active:text-white"
          >
            <ArrowLeft size={18} />
          </button>
          <Wordmark tone="light" size="sm" className="shrink-0 opacity-90" />
          <span className="w-9 shrink-0 text-right text-[12px] font-medium tabular-nums text-white/60">
            {paso === 'bienvenida' ? '' : `${numero}/${NUMERADOS.length}`}
          </span>
        </div>

        <div className="mt-3 h-[3px] w-full overflow-hidden rounded-full bg-white/20">
          <div
            className="h-full rounded-full bg-white transition-[width] duration-500 ease-out"
            style={{ width: `${avance}%` }}
          />
        </div>
      </>
      }
      pie={
        <div className="mx-auto w-full max-w-[30rem]">
          {error && <div className="mb-3"><AvisoCielo>{error}</AvisoCielo></div>}

          {paso === 'listo' ? (
            <BotonCielo
              cargando={ocupado}
              onClick={() => void avanzar(() => actions.refresh())}
            >
              Entrar en Playoff360
            </BotonCielo>
          ) : boton ? (
            <>
              <BotonCielo cargando={ocupado} puede={boton.puede} onClick={boton.hacer}>
                {boton.texto}
                <ArrowRight size={17} />
              </BotonCielo>
              {/* Lo que se puede saltar, se dice. */}
              {(paso === 'equipo' || paso === 'horarios') && (
                <button
                  onClick={() => (paso === 'equipo' ? ir('plan') : void crearEquipo())}
                  className="mt-3 block w-full py-2 text-center text-[14px] font-medium text-white/65 transition-colors active:text-white"
                >
                  {paso === 'equipo' ? 'Lo hago luego' : 'Sin horario fijo'}
                </button>
              )}
            </>
          ) : null}
        </div>
      }
    >
      <div key={paso} className="animate-paso mx-auto w-full max-w-[30rem]">
          {/* EL CÓDIGO DE ACCESO YA NO ESTÁ AQUÍ. Era un teclado numérico
              entero metido en una tarjeta en mitad del alta: en un iPhone se
              salía por abajo —el cero y el «Ahora no» quedaban cortados— y
              además pedía inventarse un PIN a alguien que todavía no ha visto
              el producto. Se pone desde Ajustes, cuando se quiera. */}
          {paso === 'bienvenida' && (
            <Pregunta
              rotulo="Bienvenido"
              titulo="Vamos a montar tu club."
              ayuda="Seis preguntas cortas. Se guarda sobre la marcha, así que puedes parar cuando quieras y seguir luego."
            />
          )}


          {paso === 'nombre' && (
            <Pregunta rotulo={`Paso ${numero}`} titulo="¿Cómo te llamas?"
              ayuda="Para que la plataforma no te llame por tu correo, y para que tu equipo sepa quién eres.">
              <CampoCielo
                etiqueta="Nombre y apellidos" autoFocus value={nombre} onChange={setNombre}
                placeholder="Tu nombre y apellidos" autoComplete="name"
                onEnter={() => boton?.puede && boton.hacer()}
              />
            </Pregunta>
          )}

          {paso === 'cargo' && (
            <Pregunta rotulo={`Paso ${numero}`} titulo="¿Qué haces en el club?"
              ayuda="Decide lo que ves al entrar. Se puede cambiar cuando quieras.">
              <div className="space-y-2">
                {CARGOS.map((r) => (
                  <OpcionCielo key={r} activa={cargo === r} onClick={() => setCargo(r)} titulo={ROLE_LABEL[r]} />
                ))}
              </div>
            </Pregunta>
          )}

          {paso === 'club' && (
            <Pregunta rotulo={`Paso ${numero}`} titulo="¿Cómo se llama tu club?"
              ayuda="El nombre con el que lo conoce todo el mundo.">
              <CampoCielo
                etiqueta="Nombre del club" autoFocus value={club} onChange={setClub}
                placeholder="Club Deportivo Ejemplo" autoComplete="organization"
                onEnter={() => boton?.puede && boton.hacer()}
              />
              <CampoCielo
                etiqueta="Abreviatura del club" value={clubCorto} onChange={setClubCorto}
                placeholder="Abreviatura (opcional)" className="mt-2.5"
              />
            </Pregunta>
          )}

          {paso === 'deporte' && (
            <Pregunta rotulo={`Paso ${numero}`} titulo="¿A qué jugáis?"
              ayuda="Cambia cómo se llaman las cosas y qué posiciones se pueden elegir.">
              {losDeportes.length === 0 ? (
                <p className="text-[15px] text-white/70">Cargando deportes…</p>
              ) : (
                <div className="-mx-1 grid grid-cols-2 gap-2 px-1 py-1">
                  {losDeportes.map((d) => (
                    <OpcionCielo
                      key={d.code} activa={deporte === d.code} onClick={() => setDeporte(d.code)}
                      titulo={d.name}
                      pie={d.posiciones.length > 0 ? `${d.posiciones.length} posiciones` : 'Sin posiciones'}
                    />
                  ))}
                </div>
              )}
            </Pregunta>
          )}

          {paso === 'equipo' && (
            <Pregunta rotulo={`Paso ${numero}`} titulo="¿Y tu primer equipo?"
              ayuda={elegido ? `Donde van ${elegido.jugadores}, ${elegido.partidos} y asistencia.` : undefined}>
              <CampoCielo
                etiqueta="Nombre del equipo" autoFocus value={equipo} onChange={setEquipo}
                placeholder="Cadete A" onEnter={() => boton?.puede && boton.hacer()}
              />
              <CampoCielo
                etiqueta="Categoría" value={categoria} onChange={setCategoria}
                placeholder="Categoría (opcional)" className="mt-2.5"
              />
            </Pregunta>
          )}

          {paso === 'horarios' && (
            <Pregunta rotulo={`Paso ${numero}`} titulo="¿Cuándo entrenáis?"
              ayuda="Lo que pongas aquí se reparte solo en el calendario, tres meses por delante.">
              <div className="space-y-2 py-1">
                {horarios.map((h, i) => (
                  <div key={i} className="flex flex-wrap items-center gap-2 rounded-2xl bg-white/12 p-2">
                    <Select
                      className="w-auto flex-1"
                      value={h.weekday}
                      onChange={(e) => setHorarios((xs) => xs.map((x, k) => (k === i ? { ...x, weekday: Number(e.target.value) } : x)))}
                    >
                      {WEEKDAYS.map((d, k) => <option key={k} value={k}>{d}</option>)}
                    </Select>
                    {/* LAS DOS HORAS, no sólo la de empezar: la de acabar es
                        la que da la duración, y sin ella todos los
                        entrenamientos del calendario durarían lo mismo. */}
                    <Input
                      type="time" aria-label="Empieza" className="w-[106px]" value={h.start}
                      onChange={(e) => setHorarios((xs) => xs.map((x, k) => (k === i ? { ...x, start: e.target.value } : x)))}
                    />
                    <Input
                      type="time" aria-label="Acaba" className="w-[106px]" value={h.end}
                      onChange={(e) => setHorarios((xs) => xs.map((x, k) => (k === i ? { ...x, end: e.target.value } : x)))}
                    />
                    <button
                      onClick={() => setHorarios((xs) => xs.filter((_, k) => k !== i))}
                      aria-label="Quitar este horario"
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-white/70 active:bg-white/15"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setHorarios((xs) => [...xs, { weekday: 2, start: '18:00', end: '19:30', venue: '' }])}
                className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/12 px-3.5 py-2 text-[14px] font-medium text-white transition-colors active:bg-white/20"
              >
                <Plus size={15} /> Añadir un día
              </button>
            </Pregunta>
          )}

          {paso === 'plan' && (
            <Tarjeta>
              <PasoPlan
                numero={numero}
                total={NUMERADOS.length}
                clubId={clubId}
                onTerminar={async () => ir('listo')}
                onError={setError}
              />
            </Tarjeta>
          )}

          {paso === 'listo' && (
            <div className="text-center">
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-white/20">
                <Check size={26} strokeWidth={2.4} />
              </span>
              <h1 className="t-l mt-6 text-white">Todo listo.</h1>
              <p className="entradilla mx-auto mt-3 text-white/70">
                Tu espacio está montado. Esto es lo que hay dentro ahora mismo.
              </p>

              {/* Lo que hay DE VERDAD. Si el equipo se saltó, aquí no sale. */}
              <div className="mt-7 space-y-px overflow-hidden rounded-2xl text-left">
                <Hecho titulo={club.trim() || 'Tu club'} pie="Club creado" />
                {elegido && elegido.code !== FUTBOL && <Hecho titulo={elegido.name} pie="Deporte del club" />}
                {equipoCreado && <Hecho titulo={equipo.trim()} pie={categoria.trim() || 'Equipo creado'} />}
                {horarios.length > 0 && (
                  <Hecho
                    titulo={`${horarios.length} ${horarios.length === 1 ? 'horario' : 'horarios'}`}
                    pie={horarios.length === 1 ? 'Ya está en el calendario' : 'Ya están en el calendario'}
                  />
                )}
              </div>
            </div>
          )}
        </div>
    </Cielo>
  );
}

/* ═══════════════════════════ Las piezas ══════════════════════════════════ */

/** Una pregunta: rótulo, titular, entradilla y lo que haya que contestar. */
function Pregunta({
  rotulo, titulo, ayuda, children,
}: { rotulo: string; titulo: string; ayuda?: string; children?: React.ReactNode }) {
  return (
    <div>
      <p className="rotulo text-white/55">{rotulo}</p>
      <h1 className="t-l mt-3 text-white">{titulo}</h1>
      {ayuda && <p className="entradilla mt-3 text-white/70">{ayuda}</p>}
      {children && <div className="mt-7">{children}</div>}
    </div>
  );
}



/** Para los dos pasos que traen una pantalla entera de la plataforma dentro. */
function Tarjeta({ children }: { children: React.ReactNode }) {
  return (
    /* SIN ALTO MÁXIMO Y SIN RECORTE PROPIO. Tenía `max-h-[66vh]` con su
         propio desplazamiento: una caja pequeña con una barra dentro, en
         mitad del cielo, con el contenido cortado por los dos lados. Ahora
         crece lo que necesite y quien se desplaza es la pantalla. */
      <div className="rounded-[26px] bg-white p-5 text-tinta shadow-[0_30px_70px_-30px_rgba(6,12,27,0.55)] sm:p-6">
      {children}
    </div>
  );
}

function Hecho({ titulo, pie }: { titulo: string; pie: string }) {
  return (
    <div className="flex items-center gap-3 bg-white/12 px-4 py-3">
      <Check size={16} className="shrink-0 text-white/70" />
      <span className="min-w-0">
        <span className="block truncate text-[15px] font-semibold text-white">{titulo}</span>
        <span className="block truncate text-[12.5px] text-white/60">{pie}</span>
      </span>
    </div>
  );
}

