/**
 * Los primeros cinco minutos.
 * ---------------------------------------------------------------------------
 * UNA COSA POR PANTALLA. Antes esto eran cuatro pasos con tres o cuatro
 * preguntas metidas en cada uno: nombre y cargo juntos, equipo y horarios
 * juntos. Un formulario largo cortado en trozos sigue siendo un formulario
 * largo, y con el móvil en la mano cada pantalla llena obliga a decidir varias
 * cosas a la vez antes de poder seguir.
 *
 * Ahora cada pantalla pregunta UNA cosa y cabe entera sin desplazarse:
 *
 *   1. Bienvenida        6. Tu club
 *   2. Código de acceso  7. Tu equipo
 *   3. Tu nombre         8. Cuándo entrenáis
 *   4. Tu cargo          9. Tu plan
 *   5. —                10. Listo
 *
 * (Crear la cuenta es el paso previo y vive en `/entrar`; aquí ya hay sesión.)
 *
 * Reglas que se respetan:
 *  · Cada paso GUARDA DE VERDAD al pasar al siguiente. Nada espera a un
 *    «terminar» final que, si se cierra la pestaña, perdería lo escrito.
 *  · Se puede saltar lo que no es imprescindible: el código y el equipo.
 *    Quien entra a mirar no tiene por qué inventarse un equipo.
 *  · No se promete nada que la plataforma no haga.
 */

import { useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Plus, X } from 'lucide-react';
import { useClub } from '@/store/store';
import { nombreReal } from '@/store/selectors';
import { clubs } from '@/services/clubs';
import { db } from '@/services/db';
import { humanError } from '@/services/supabase';
import { ASSIGNABLE_ROLES, ROLE_LABEL } from '@/services/auth';
import { Button, Field, Input, Select } from '@/components/ui';
import { Marca, Wordmark } from '@/components/ui/Brand';
import { ConfigurarCodigo } from '@/features/passcode/ConfigurarCodigo';
import { PasoPlan } from './PasoPlan';
import { cn } from '@/lib/utils';
import type { Staff, TrainingSlot } from '@/types';

const WEEKDAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

const temporadaActual = () => {
  const hoy = new Date();
  const inicio = hoy.getMonth() >= 6 ? hoy.getFullYear() : hoy.getFullYear() - 1;
  return `${inicio}/${String((inicio + 1) % 100).padStart(2, '0')}`;
};

/* El orden es el del trabajo real: primero quién eres, luego qué diriges. */
const ORDEN = [
  'bienvenida', 'codigo', 'nombre', 'cargo', 'club', 'equipo', 'horarios', 'plan', 'listo',
] as const;
type Paso = (typeof ORDEN)[number];

/** La bienvenida y el final no son trabajo: no cuentan como paso numerado. */
const NUMERADOS = ORDEN.filter((p) => p !== 'bienvenida' && p !== 'listo');

/* Los cargos salen de la lista que ya usa el resto de la plataforma, no de
   una copia escrita aquí: si mañana se añade uno, aparece solo. Se quita
   «Administración del club», que no se elige — lo da crear el club. */
const CARGOS = ASSIGNABLE_ROLES.filter((r) => r !== 'admin-club');

export default function Onboarding() {
  const { data, userId, actions, signOut } = useClub();
  const [paso, setPaso] = useState<Paso>('bienvenida');
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  /* Nunca se precarga el correo: `profile.name` cae en él cuando no hay
     nombre, y entonces bastaba con pulsar «Continuar» para guardar la
     dirección como nombre real. */
  const [nombre, setNombre] = useState(nombreReal(data.profile) ?? '');
  const [cargo, setCargo] = useState<Staff['role']>(data.profile?.role ?? 'entrenadora');
  const [club, setClub] = useState('');
  const [clubCorto, setClubCorto] = useState('');
  /** El club recién creado, hasta que se recarga todo al terminar. */
  const [clubId, setClubId] = useState<string | null>(null);
  const [equipo, setEquipo] = useState('');
  const [categoria, setCategoria] = useState('');
  const [horarios, setHorarios] = useState<TrainingSlot[]>([]);
  /** Si el equipo llegó a crearse: la pantalla final lo dice sin adornar. */
  const [equipoCreado, setEquipoCreado] = useState(false);
  const [conCodigo, setConCodigo] = useState(false);

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
      if (!userId) {
        setError('Tu sesión ha caducado. Vuelve a entrar.');
        return;
      }
      // Se guarda YA: si se cierra la pestaña ahora, el nombre no se pierde.
      await db.updateProfile(userId, { full_name: nombre.trim() });
      ir('cargo');
    });

  const guardarCargo = () =>
    avanzar(async () => {
      if (!userId) {
        setError('Tu sesión ha caducado. Vuelve a entrar.');
        return;
      }
      await db.updateProfile(userId, { role: cargo });
      ir('club');
    });

  const crearClub = () =>
    avanzar(async () => {
      if (club.trim().length < 2) {
        setError('El club necesita un nombre.');
        return;
      }
      const res = await clubs.create(club, clubCorto);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      /* AQUÍ NO SE RECARGA EL ESPACIO DE TRABAJO, y es a propósito.
         Esta pantalla se enseña justamente porque no hay club; en cuanto la
         recarga trajera uno, la aplicación daría el alta por terminada y
         desmontaría el onboarding con los pasos que faltan sin enseñar. Así
         que el club recién creado se guarda aquí y se recarga una sola vez,
         al final, cuando de verdad se ha acabado. */
      setClubId(res.club.id);
      ir('equipo');
    });

  const crearEquipo = () =>
    avanzar(async () => {
      if (!clubId || !userId) {
        setError('Se ha perdido el club por el camino. Recarga la página y vuelve a intentarlo.');
        return;
      }
      await db.saveTeam(
        {
          id: '',
          clubId,
          name: equipo.trim(),
          category: categoria.trim(),
          season: temporadaActual(),
          competition: '',
          venue: '',
          trainingSlots: horarios,
        },
        userId,
      );
      setEquipoCreado(true);
      /* No se recarga todavía: falta elegir plan. Recargar aquí haría que la
         aplicación diera el alta por terminada y se llevara por delante los
         últimos pasos, igual que pasaba al crear el club. */
      ir('plan');
    });

  /* En la bienvenida la barra está a cero; en la última pantalla, llena. */
  const numero = paso === 'listo'
    ? NUMERADOS.length
    : NUMERADOS.indexOf(paso as (typeof NUMERADOS)[number]) + 1;

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <header className="mx-auto flex w-full max-w-[460px] items-center justify-between px-5 pb-1 pt-5">
        <Wordmark tone="light" />
        <button
          onClick={() => void signOut()}
          className="text-sm text-ink-500 underline underline-offset-2 transition-colors hover:text-ink-900"
        >
          Cerrar sesión
        </button>
      </header>

      {/* Sin caja: la PANTALLA es la interfaz. Un rectángulo gigante alrededor
          de todo es lo que hace que una aplicación parezca una página web. */}
      <main className="mx-auto flex w-full max-w-[460px] flex-1 flex-col px-5 pb-10 pt-6">
        <Progreso actual={numero} total={NUMERADOS.length} />

        <div className="mt-7">
          {paso === 'bienvenida' && (
            <Bloque clave="bienvenida">
              <div className="pt-6 text-center">
                <Marca size={44} className="mx-auto text-ink-900" />
                <h1 className="cifra mt-6 text-3xl">
                  Hola{nombre ? `, ${nombre.split(' ')[0]}` : ''}
                </h1>
                <p className="mx-auto mt-3 max-w-[300px] text-md leading-relaxed text-ink-500">
                  Vamos a dejar tu club montado. Son unos minutos y puedes cambiarlo todo después.
                </p>
                <div className="mt-9">
                  <Button size="lg" block onClick={() => ir('codigo')}>
                    Empezar
                  </Button>
                </div>
              </div>
            </Bloque>
          )}

          {paso === 'codigo' && (
            <Bloque clave="codigo" numero={numero} total={NUMERADOS.length}>
              <ConfigurarCodigo
                yaTiene={false}
                tituloNuevo="Protege tu espacio"
                subtituloNuevo="Cuatro cifras para confirmar acciones importantes. No sustituye a tu contraseña."
                cancelarEtiqueta="Ahora no"
                onCancelar={() => ir('nombre')}
                onHecho={() => { setConCodigo(true); ir('nombre'); }}
              />
            </Bloque>
          )}

          {paso === 'nombre' && (
            <Bloque clave="nombre" numero={numero} total={NUMERADOS.length} titulo="¿Cómo te llamas?">
              <Field label="Nombre y apellidos" required>
                <Input
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej.: Marta Vives"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && void guardarNombre()}
                />
              </Field>
              <p className="text-sm leading-relaxed text-ink-500">
                Es el nombre que verá tu cuerpo técnico en la plataforma.
              </p>
            </Bloque>
          )}

          {paso === 'cargo' && (
            <Bloque clave="cargo" numero={numero} total={NUMERADOS.length} titulo="¿Qué haces en el club?">
              <div className="space-y-2">
                {CARGOS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCargo(c)}
                    aria-pressed={cargo === c}
                    className={cn(
                      'flex w-full items-center justify-between rounded-2xl border px-4 py-3.5 text-left transition-all',
                      cargo === c
                        ? 'border-azul-600/60 bg-azul-600/10 text-ink-900'
                        : 'border-line bg-panel text-ink-700 hover:bg-raised',
                    )}
                  >
                    <span className="text-base font-medium">{ROLE_LABEL[c]}</span>
                    {cargo === c && <Check size={16} className="text-azul-500" />}
                  </button>
                ))}
              </div>
              <p className="text-sm leading-relaxed text-ink-500">
                Puedes cambiarlo más adelante en tu perfil.
              </p>
            </Bloque>
          )}

          {paso === 'club' && (
            <Bloque clave="club" numero={numero} total={NUMERADOS.length} titulo="Tu club">
              <Field label="Nombre del club" required hint="Como aparece oficialmente.">
                <Input
                  value={club}
                  onChange={(e) => setClub(e.target.value)}
                  placeholder="Ej.: Club Deportivo Ejemplo"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && void crearClub()}
                />
              </Field>
              <Field
                label="Nombre corto"
                hint="El que cabe en un marcador. Si lo dejas vacío usamos el nombre completo."
              >
                <Input
                  value={clubCorto}
                  onChange={(e) => setClubCorto(e.target.value)}
                  placeholder="Ej.: CD Ejemplo"
                  maxLength={28}
                />
              </Field>
              {/* Cristal NO: esto no flota sobre nada, está en la columna con
                  todo lo demás. El cristal es para lo que se pone encima. */}
              <div className="rounded-2xl border border-line bg-panel px-4 py-3">
                <p className="text-sm font-semibold text-ink-900">¿Te han invitado?</p>
                <p className="mt-0.5 text-sm leading-relaxed text-ink-500">
                  Usa el enlace que te envió tu club, no crees uno nuevo.
                </p>
              </div>
            </Bloque>
          )}

          {paso === 'equipo' && (
            <Bloque clave="equipo" numero={numero} total={NUMERADOS.length} titulo="Tu primer equipo">
              <Field label="Nombre del equipo" required>
                <Input
                  value={equipo}
                  onChange={(e) => setEquipo(e.target.value)}
                  placeholder="Ej.: Cadete A"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && equipo.trim() && ir('horarios')}
                />
              </Field>
              <Field label="Categoría" hint="Opcional. Sirve para ordenar los equipos del club.">
                <Input
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                  placeholder="Ej.: Cadete"
                />
              </Field>
            </Bloque>
          )}

          {paso === 'horarios' && (
            <Bloque clave="horarios" numero={numero} total={NUMERADOS.length} titulo="¿Cuándo entrenáis?">
              <p className="text-base leading-relaxed text-ink-500">
                Los horarios que pongas aquí aparecen solos en el calendario, semana tras semana.
              </p>

              {horarios.length > 0 && (
                <div className="space-y-2">
                  {horarios.map((h, i) => (
                    <div key={i} className="flex flex-wrap items-center gap-2 rounded-2xl bg-raised p-2">
                      <Select
                        className="w-auto flex-1"
                        value={h.weekday}
                        onChange={(e) =>
                          setHorarios((xs) =>
                            xs.map((x, k) => (k === i ? { ...x, weekday: Number(e.target.value) } : x)),
                          )
                        }
                      >
                        {WEEKDAYS.map((d, k) => (
                          <option key={d} value={k}>{d}</option>
                        ))}
                      </Select>
                      <Input
                        type="time"
                        className="w-auto"
                        value={h.start}
                        onChange={(e) =>
                          setHorarios((xs) => xs.map((x, k) => (k === i ? { ...x, start: e.target.value } : x)))
                        }
                      />
                      <Input
                        type="time"
                        className="w-auto"
                        value={h.end}
                        onChange={(e) =>
                          setHorarios((xs) => xs.map((x, k) => (k === i ? { ...x, end: e.target.value } : x)))
                        }
                      />
                      <button
                        onClick={() => setHorarios((xs) => xs.filter((_, k) => k !== i))}
                        className="rounded-full p-1.5 text-ink-400 transition-colors hover:bg-raised hover:text-bad"
                        aria-label={`Quitar el horario de ${WEEKDAYS[h.weekday]}`}
                      >
                        <X size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <Button
                variant="quiet"
                block
                icon={<Plus size={15} />}
                onClick={() =>
                  setHorarios((h) => [...h, { weekday: 2, start: '18:00', end: '19:30', venue: '' }])
                }
              >
                Añadir un horario
              </Button>
            </Bloque>
          )}

          {paso === 'plan' && (
            <Bloque clave="plan">
              <PasoPlan
                numero={numero}
                total={NUMERADOS.length}
                clubId={clubId}
                onError={setError}
                onTerminar={async () => ir('listo')}
              />
            </Bloque>
          )}

          {paso === 'listo' && (
            <Bloque clave="listo">
              <div className="pt-4 text-center">
                <Marca size={40} className="mx-auto animate-pop-in text-azul-500" />
                <h1 className="cifra mt-6 text-3xl">Todo listo</h1>
                <p className="mx-auto mt-3 max-w-[320px] text-md leading-relaxed text-ink-500">
                  Tu espacio está montado. Esto es lo que hay dentro ahora mismo.
                </p>

                {/* Lo que hay DE VERDAD. Ni una línea de más: si el equipo se
                    saltó, aquí no aparece ningún equipo. */}
                <div className="mt-7 divide-y divide-line text-left">
                  <Hecho titulo={club.trim() || 'Tu club'} pie="Club creado" />
                  {equipoCreado && <Hecho titulo={equipo.trim()} pie={categoria.trim() || 'Equipo creado'} />}
                  {horarios.length > 0 && (
                    <Hecho
                      titulo={`${horarios.length} ${horarios.length === 1 ? 'horario' : 'horarios'}`}
                      pie={horarios.length === 1 ? 'Ya está en el calendario' : 'Ya están en el calendario'}
                    />
                  )}
                  {conCodigo && <Hecho titulo="Código de acceso" pie="Puesto" />}
                </div>

                <div className="mt-9">
                  <Button size="lg" block loading={ocupado} onClick={() => void avanzar(() => actions.refresh())}>
                    Entrar en Playoff360
                  </Button>
                </div>
              </div>
            </Bloque>
          )}

          {error && (
            <p className="mt-4 rounded-2xl bg-bad/12 px-4 py-2.5 text-base leading-relaxed text-bad">
              {error}
            </p>
          )}

          {/* La bienvenida, el código, el plan y el final llevan sus propios
              botones: poner además esta barra dejaría dos maneras de seguir. */}
          {!['bienvenida', 'codigo', 'plan', 'listo'].includes(paso) && (
            <div className="mt-7 flex flex-wrap items-center gap-2">
              <Button variant="ghost" icon={<ArrowLeft size={15} />} onClick={atras}>
                Atrás
              </Button>
              <div className="flex-1" />
              {paso === 'equipo' && (
                <Button variant="ghost" onClick={() => ir('plan')} disabled={ocupado}>
                  Lo creo más tarde
                </Button>
              )}
              <Button
                size="lg"
                loading={ocupado}
                disabled={paso === 'equipo' && equipo.trim().length === 0}
                icon={paso === 'horarios' ? <Check size={16} /> : <ArrowRight size={16} />}
                onClick={() => {
                  if (paso === 'nombre') return void guardarNombre();
                  if (paso === 'cargo') return void guardarCargo();
                  if (paso === 'club') return void crearClub();
                  if (paso === 'equipo') return ir('horarios');
                  return void crearEquipo();
                }}
              >
                {paso === 'club'
                  ? 'Crear el club'
                  : paso === 'horarios'
                    ? 'Crear el equipo'
                    : 'Continuar'}
              </Button>
            </div>
          )}
        </div>

        {paso !== 'listo' && <p className="mt-6 text-sm text-ink-500">Puedes cambiarlo todo después.</p>}
      </main>
    </div>
  );
}

/** Una línea de lo que se ha creado. Sin iconos: lo que importa es el nombre. */
function Hecho({ titulo, pie }: { titulo: string; pie: string }) {
  return (
    <div className="py-3.5">
      <p className="text-base font-semibold text-ink-900">{titulo}</p>
      <p className="mt-0.5 text-sm text-ink-500">{pie}</p>
    </div>
  );
}

/**
 * Una pregunta por pantalla. El rótulo dice dónde estás, el titular pregunta
 * UNA cosa y debajo va sólo lo que hay que rellenar. Ni párrafos ni promesas:
 * lo que hace falta explicar se explica donde hace falta, no de entrada.
 */
function Bloque({
  clave, numero, total, titulo, children,
}: {
  clave: string;
  numero?: number;
  total?: number;
  titulo?: string;
  children: React.ReactNode;
}) {
  return (
    /* `key` por paso: al cambiar, React monta un nodo nuevo y la animación de
       entrada se dispara sola. Sin esto el contenido cambiaría de golpe. */
    <div key={clave} className="animate-paso">
      {numero && total && <p className="rotulo">Paso {numero} de {total}</p>}
      {titulo && <h1 className="cifra mt-1.5 text-3xl">{titulo}</h1>}
      <div className={cn(titulo ? 'mt-6 space-y-4' : 'space-y-4')}>{children}</div>
    </div>
  );
}

/**
 * Cuánto queda, en una barra.
 * Antes eran cuatro círculos con iconos y sus etiquetas. Ocupaban un tercio
 * de la pantalla para decir algo que cabe en tres píxeles de alto, y los
 * iconos ahí arriba no ayudaban a nadie a rellenar el formulario de abajo.
 */
function Progreso({ actual, total }: { actual: number; total: number }) {
  /* En la bienvenida y en el final no hay paso: la barra se queda a cero y
     llena, que es justo lo que ha pasado. */
  const parte = actual <= 0 ? 0 : actual / total;
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={Math.max(0, actual)}
      aria-label={actual > 0 ? `Paso ${actual} de ${total}` : 'Sin empezar'}
      className="h-[3px] w-full overflow-hidden rounded-full bg-white/10"
    >
      <div
        className="h-full rounded-full bg-azul-600 transition-[width] duration-[450ms] ease-[cubic-bezier(.22,1,.36,1)]"
        style={{ width: `${parte * 100}%` }}
      />
    </div>
  );
}
