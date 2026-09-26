/**
 * Los primeros cinco minutos.
 * ---------------------------------------------------------------------------
 * Antes esto era un formulario con el nombre del club y poco más. Quien
 * terminaba caía en un panel vacío: sin equipo, sin jugadoras, sin nada que
 * mirar, y encima la aplicación le saludaba por su dirección de correo porque
 * nadie le había preguntado cómo se llama.
 *
 * Ahora son tres pasos que dejan el club montado de verdad:
 *   1. Quién eres — para que la plataforma sepa tu nombre y tu cargo.
 *   2. Tu club — lo que agrupa todo y aísla tus datos de los demás.
 *   3. Tu primer equipo — con sus horarios, que ya alimentan el calendario.
 *
 * Reglas que se respetan aquí:
 *  · Cada paso GUARDA DE VERDAD al pasar al siguiente. Nada se queda en el
 *    navegador esperando un «terminar» final que, si se cierra la pestaña,
 *    perdería todo lo escrito.
 *  · El equipo se puede saltar. Quien entra a mirar no tiene por qué
 *    inventarse un equipo para poder pasar.
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
import { Wordmark } from '@/components/ui/Brand';
import { IconoCamiseta, IconoCampo, IconoSilbato } from '@/components/ui/Icons';
import { cn } from '@/lib/utils';
import type { Staff, TrainingSlot } from '@/types';

const WEEKDAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

const temporadaActual = () => {
  const hoy = new Date();
  const inicio = hoy.getMonth() >= 6 ? hoy.getFullYear() : hoy.getFullYear() - 1;
  return `${inicio}/${String((inicio + 1) % 100).padStart(2, '0')}`;
};

const PASOS = [
  { id: 1, titulo: 'Quién eres', icono: IconoSilbato },
  { id: 2, titulo: 'Tu club', icono: IconoCampo },
  { id: 3, titulo: 'Tu primer equipo', icono: IconoCamiseta },
];

/* Los cargos salen de la lista que ya usa el resto de la plataforma, no de
   una copia escrita aquí: si mañana se añade uno, aparece solo. Se quita
   «Administración del club», que no se elige — lo da crear el club. */
const CARGOS = ASSIGNABLE_ROLES.filter((r) => r !== 'admin-club');

export default function Onboarding() {
  const { data, userId, actions, signOut } = useClub();
  const [paso, setPaso] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  // Paso 1
  /* Nunca se precarga el correo: `profile.name` cae en él cuando no hay
     nombre, y entonces bastaba con pulsar «Continuar» para guardar la
     dirección como nombre real. */
  const [nombre, setNombre] = useState(nombreReal(data.profile) ?? '');
  const [cargo, setCargo] = useState<Staff['role']>(data.profile?.role ?? 'entrenadora');

  // Paso 2
  const [club, setClub] = useState('');
  const [clubCorto, setClubCorto] = useState('');
  /** El club recién creado, hasta que se recarga todo al terminar. */
  const [clubId, setClubId] = useState<string | null>(null);

  // Paso 3
  const [equipo, setEquipo] = useState('');
  const [categoria, setCategoria] = useState('');
  const [horarios, setHorarios] = useState<TrainingSlot[]>([]);

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

  const guardarPerfil = () =>
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
      await db.updateProfile(userId, { full_name: nombre.trim(), role: cargo });
      setPaso(2);
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
         desmontaría el onboarding con el tercer paso sin enseñar. Así que el
         club recién creado se guarda aquí y se recarga una sola vez, al
         final, cuando de verdad se ha acabado. */
      setClubId(res.club.id);
      setPaso(3);
    });

  const crearEquipo = () =>
    avanzar(async () => {
      if (equipo.trim().length < 1) {
        setError('Pon un nombre al equipo, aunque sea «Primer equipo».');
        return;
      }
      if (!clubId || !userId) {
        setError('Se ha perdido el club por el camino. Recarga la página y vuelve a intentarlo.');
        return;
      }
      /* Se guarda contra el club recién creado, sin pasar por el almacén: el
         almacén todavía no sabe que existe porque no hemos recargado. */
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
      // Ahora sí: al recargar ya hay club y equipo, y esta pantalla desaparece.
      await actions.refresh();
    });

  const saltarEquipo = () => avanzar(async () => { await actions.refresh(); });

  return (
    <div className="flex min-h-screen flex-col bg-navy-900">
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-5 py-4">
        <Wordmark tone="light" />
        <button
          onClick={() => void signOut()}
          className="text-sm text-navy-300 underline underline-offset-2 transition-colors hover:text-white"
        >
          Cerrar sesión
        </button>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-5 pb-12">
        <Pasos actual={paso} />

        <div className="mt-5 rounded-xl bg-white p-6 shadow-lift sm:p-8">
          {paso === 1 && (
            <Bloque
              titulo="Empecemos por ti"
              entradilla="Tu nombre aparece en el club y en las convocatorias que compartas. El cargo decide qué puedes hacer."
            >
              <Field label="Tu nombre y apellidos" required>
                <Input
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej.: Marta Vives"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && void guardarPerfil()}
                />
              </Field>
              <Field label="Tu cargo en el club" hint="Puedes cambiarlo más adelante en tu perfil.">
                <Select value={cargo} onChange={(e) => setCargo(e.target.value as Staff['role'])}>
                  {CARGOS.map((c) => (
                    <option key={c} value={c}>
                      {ROLE_LABEL[c]}
                    </option>
                  ))}
                </Select>
              </Field>
            </Bloque>
          )}

          {paso === 2 && (
            <Bloque
              titulo="Ahora tu club"
              entradilla="Todo lo que registres pertenece a este club y sólo lo ve el cuerpo técnico al que invites. Ningún otro club puede verlo."
            >
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
              <p className="rounded-md border border-line bg-surface px-3 py-2.5 text-sm leading-relaxed text-navy-700">
                <strong className="font-medium">¿Te han invitado a un club?</strong> Entonces no crees
                uno nuevo: abre el enlace de invitación que te hayan pasado y entrarás directamente
                en el que te corresponde, con tu equipo ya asignado.
              </p>
            </Bloque>
          )}

          {paso === 3 && (
            <Bloque
              titulo="Y tu primer equipo"
              entradilla="Con esto ya tienes dónde dar de alta jugadoras y planificar. Si prefieres mirar antes, puedes saltártelo."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Nombre del equipo" required>
                  <Input
                    value={equipo}
                    onChange={(e) => setEquipo(e.target.value)}
                    placeholder="Ej.: Cadete A"
                    autoFocus
                  />
                </Field>
                <Field label="Categoría">
                  <Input
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value)}
                    placeholder="Ej.: Cadete"
                  />
                </Field>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <p className="label mb-0">Horarios de entrenamiento</p>
                  <button
                    onClick={() =>
                      setHorarios((h) => [...h, { weekday: 2, start: '18:00', end: '19:30', venue: '' }])
                    }
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-pitch-700 hover:text-pitch-800"
                  >
                    <Plus size={14} /> Añadir
                  </button>
                </div>
                {horarios.length === 0 ? (
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">
                    Sin horarios fijos. Si los pones, aparecen solos en el calendario cada semana.
                  </p>
                ) : (
                  <div className="mt-2 space-y-2">
                    {horarios.map((h, i) => (
                      <div key={i} className="flex flex-wrap items-center gap-2 rounded-md border border-line p-2">
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
                          className="rounded p-1.5 text-navy-400 transition-colors hover:bg-surface hover:text-bad"
                          aria-label={`Quitar el horario de ${WEEKDAYS[h.weekday]}`}
                        >
                          <X size={15} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Bloque>
          )}

          {error && (
            <p className="mt-4 rounded-md border border-bad/30 bg-bad/5 px-3 py-2.5 text-base leading-relaxed text-bad">
              {error}
            </p>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-line pt-5">
            {paso > 1 && paso < 3 && (
              <Button variant="ghost" icon={<ArrowLeft size={15} />} onClick={() => setPaso(paso - 1)}>
                Atrás
              </Button>
            )}
            <div className="flex-1" />
            {paso === 3 && (
              <Button variant="ghost" onClick={() => void saltarEquipo()} disabled={ocupado}>
                Lo creo más tarde
              </Button>
            )}
            <Button
              size="lg"
              loading={ocupado}
              icon={paso === 3 ? <Check size={16} /> : <ArrowRight size={16} />}
              onClick={() =>
                void (paso === 1 ? guardarPerfil() : paso === 2 ? crearClub() : crearEquipo())
              }
            >
              {paso === 1 ? 'Continuar' : paso === 2 ? 'Crear el club' : 'Crear el equipo y entrar'}
            </Button>
          </div>
        </div>

        <p className="mt-4 text-center text-sm text-navy-400">
          Puedes cambiar todo esto después. Nada de lo que pongas aquí es definitivo.
        </p>
      </main>
    </div>
  );
}

function Bloque({
  titulo, entradilla, children,
}: { titulo: string; entradilla: string; children: React.ReactNode }) {
  return (
    <div className="animate-fade-up">
      <h1 className="font-display text-2xl font-bold tracking-[-0.015em] text-navy-900">{titulo}</h1>
      <p className="mt-1.5 max-w-xl text-base leading-relaxed text-navy-700">{entradilla}</p>
      <div className="mt-6 space-y-4">{children}</div>
    </div>
  );
}

/** Dónde estás y cuánto queda. Sin esto, un formulario por pasos angustia. */
function Pasos({ actual }: { actual: number }) {
  return (
    <ol className="flex items-center gap-2">
      {PASOS.map((p) => {
        const hecho = p.id < actual;
        const aqui = p.id === actual;
        const Icono = p.icono;
        return (
          <li key={p.id} className="flex flex-1 items-center gap-2.5">
            <span
              className={cn(
                'grid h-9 w-9 shrink-0 place-items-center rounded-full border transition-colors',
                hecho
                  ? 'border-pitch-500 bg-pitch-500 text-white'
                  : aqui
                    ? 'border-pitch-400 bg-white/10 text-pitch-300'
                    : 'border-white/15 text-navy-400',
              )}
            >
              {hecho ? <Check size={16} strokeWidth={2.6} /> : <Icono size={17} />}
            </span>
            <span
              className={cn(
                'hidden truncate text-sm sm:block',
                aqui ? 'font-semibold text-white' : 'text-navy-300',
              )}
            >
              {p.titulo}
            </span>
            {p.id !== PASOS.length && (
              <span
                aria-hidden
                className={cn('h-px flex-1 transition-colors', hecho ? 'bg-pitch-500' : 'bg-white/15')}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
