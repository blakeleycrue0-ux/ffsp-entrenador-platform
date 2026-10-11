/**
 * Los primeros pasos, en Inicio.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * QUÉ ES. La lista de las cosas que hay que hacer para que esto sirva de
 * algo, arriba del todo de Inicio, cada una con su enlace. Se marcan solas
 * según se van haciendo, y cuando están todas la guía se va sin que nadie
 * tenga que cerrarla.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * NINGUNA MARCA ES DECORATIVA
 *
 * Esto es lo importante y es donde una guía así se estropea. Cada línea se da
 * por hecha mirando un DATO que existe de verdad en la base —hay un equipo,
 * hay una sesión, hay una lista pasada—, nunca «ha visitado esta pantalla» ni
 * un contador guardado aparte.
 *
 * La diferencia importa el día que alguien borra lo que había hecho: la línea
 * se desmarca sola, que es la verdad. Con una marca guardada aparte, la guía
 * seguiría diciendo que está hecho algo que ya no está.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * SE PUEDE APAGAR, Y NO VUELVE
 *
 * Quien no la quiera, la cierra. Eso escribe `profiles.setup_hidden_at`, así
 * que apagarla en el móvil la apaga también en el ordenador: es una decisión
 * de la persona, no del aparato. Y se puede volver a encender desde Ajustes.
 *
 * NO SE PUEDE MARCAR A MANO. No hay casillas que se puedan pulsar: la única
 * manera de tachar una línea es hacer lo que dice. Una guía que se deja
 * marcar a mano deja de ser un estado y pasa a ser una lista de la compra.
 */

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, ChevronRight } from 'lucide-react';
import { useClub } from '@/store/store';
import { currentStaff, isClubAdmin, visibleTeams } from '@/store/selectors';
import { Modal } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { humanError } from '@/services/supabase';
import { cn } from '@/lib/utils';
import type { ClubData } from '@/types';

interface Paso {
  id: string;
  titulo: string;
  /** Qué se consigue con esto. Una línea, y que hable de fútbol. */
  porque: string;
  /**
   * A dónde lleva el botón. ES UNA FUNCIÓN porque la mitad de los destinos
   * dependen del club: el horario se pone dentro de la ficha del equipo, y
   * sin equipo esa dirección no existe. Devolver `null` deja el paso escrito
   * pero sin botón, que es la verdad cuando todavía no hay a dónde ir.
   */
  a: (d: ClubData) => string | null;
  accion: string;
  /** Mira la base. Nunca una marca guardada. */
  hecho: (d: ClubData) => boolean;
  /** Lo que sólo puede hacer la administración del club. */
  soloAdmin?: boolean;
}

/* El orden es el del trabajo real: primero con quién cuentas, luego cuándo
   entrenáis, luego lo que pasa en cada sesión. */
const PASOS: Paso[] = [
  {
    id: 'equipo',
    titulo: 'Crea tu equipo',
    porque: 'Todo lo demás cuelga de un equipo: la plantilla, el calendario y las sesiones.',
    a: () => '/app/equipo-tecnico/nuevo-equipo',
    accion: 'Crear equipo',
    hecho: (d) => visibleTeams(d).length > 0,
    soloAdmin: true,
  },
  {
    id: 'plantilla',
    titulo: 'Mete a tus jugadoras',
    porque: 'Sin plantilla no hay lista que pasar ni convocatoria que preparar.',
    a: () => '/app/plantilla/nueva',
    accion: 'Añadir jugadoras',
    hecho: (d) => d.players.some((p) => !p.archivedAt),
  },
  {
    id: 'horario',
    titulo: 'Pon el horario de entrenamiento',
    /* Decía «el calendario se llena solo», y no era verdad: el horario se
       guardaba y ahí se quedaba. Ahora el calendario sabe repartirlo —en
       «Añadir varios»—, así que la frase dice lo que de verdad pasa y dónde. */
    porque: 'Guardado una vez, el calendario reparte el trimestre entero de golpe.',
    /* El horario vive en la ficha del equipo, no en Ajustes. Sin equipo
       todavía no hay ficha, y por eso esto puede devolver nulo. */
    a: (d) => {
      const equipo = visibleTeams(d)[0];
      return equipo ? `/app/equipo-tecnico/${equipo.id}/editar` : null;
    },
    accion: 'Poner horario',
    hecho: (d) => visibleTeams(d).some((t) => (t.trainingSlots?.length ?? 0) > 0),
  },
  {
    id: 'sesion',
    titulo: 'Prepara tu primer entrenamiento',
    porque: 'Bloques, minutos y material. El jueves lo tienes en el bolsillo.',
    a: () => '/app/entrenamientos/nuevo',
    accion: 'Crear sesión',
    hecho: (d) => d.sessions.length > 0,
  },
  {
    id: 'lista',
    titulo: 'Pasa tu primera lista',
    porque: 'Es el dato que alimenta las analíticas: quién viene y quién no.',
    a: () => '/app/entrenamientos',
    accion: 'Pasar lista',
    hecho: (d) => d.attendance.length > 0,
  },
  {
    id: 'partido',
    titulo: 'Apunta el primer partido',
    porque: 'Rival, hora y campo. Después, la convocatoria.',
    a: () => '/app/partidos/nuevo',
    accion: 'Añadir partido',
    hecho: (d) => d.matches.length > 0,
  },
];

/**
 * Qué pasos quedan. Se exporta para que Ajustes pueda decir si hay guía que
 * volver a encender sin repetir la cuenta.
 */
export function pasosPendientes(d: ClubData): number {
  return visibles(d).filter((p) => !p.hecho(d)).length;
}

/**
 * ¿Se está viendo la guía ahora mismo?
 *
 * Lo necesita Inicio: con la guía delante, su panel de «empieza creando el
 * primer equipo» repetía palabra por palabra el primer paso, con el mismo
 * botón, treinta píxeles más abajo. Dos veces la misma frase no insiste: hace
 * dudar de si son dos cosas distintas.
 */
export function hayGuia(d: ClubData): boolean {
  if (currentStaff(d)?.setupHiddenAt) return false;
  const total = visibles(d).length;
  return total > 0 && pasosPendientes(d) > 0;
}

/**
 * Los pasos que esta persona puede dar.
 *
 * Crear el equipo sólo lo puede hacer la administración del club: a una
 * entrenadora a la que todavía no le han asignado equipo, poner «Crea tu
 * equipo» con su botón es mandarla a una pantalla que le va a decir que no.
 * Para ella la guía empieza cuando tiene equipo.
 */
const visibles = (d: ClubData): Paso[] =>
  PASOS.filter((p) => !p.soloAdmin || isClubAdmin(d));

/**
 * LA GUÍA ES UNA TIRA, NO UNA PORTADA.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Era una tarjeta con el título, la frase, la barra y las seis líneas: cuatro
 * centímetros de pantalla en un teléfono, encima de todo lo demás y todos los
 * días hasta terminarla. Una guía que tapa el producto que viene a explicar
 * se convierte en lo primero que se quiere cerrar.
 *
 * Ahora son sesenta y pico píxeles: el aro con lo que llevas, el nombre, el
 * paso que toca y una flecha. Lo demás —las seis líneas, el porqué, el botón
 * de cada una y el de apagarla— vive en una hoja que se abre al tocarla. La
 * información es la misma; lo que cambia es que ya no está toda a la vez
 * delante de la cara.
 */
export function PrimerosPasos() {
  const { data, actions } = useClub();
  const toast = useToast();
  const yo = currentStaff(data);
  const [abierta, setAbierta] = useState(false);

  const estado = useMemo(() => visibles(data).map((p) => ({ ...p, ok: p.hecho(data) })), [data]);
  const hechos = estado.filter((p) => p.ok).length;
  const total = estado.length;
  const destino = (p: Paso) => p.a(data);

  /* Dos motivos para no salir, y ninguno necesita guardarse: o está todo
     hecho, o esta persona la apagó. */
  if (total === 0 || hechos === total) return null;
  if (yo?.setupHiddenAt) return null;

  const apagar = async () => {
    try {
      setAbierta(false);
      await actions.setupGuia(false);
      toast.info('Guía apagada', 'Puedes volver a encenderla en Ajustes y ayuda.');
    } catch (e) {
      toast.error('No se ha podido apagar', humanError(e));
    }
  };

  /* El siguiente sin hacer: es el que se nombra en la tira y el que lleva la
     acción destacada dentro de la hoja. */
  const siguiente = estado.find((p) => !p.ok);

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierta(true)}
        aria-haspopup="dialog"
        className="flex w-full items-center gap-3.5 rounded-2xl border border-marca-600/25 bg-marca-600/[0.07] px-3.5 py-3 text-left transition-colors hover:bg-marca-600/[0.11] active:bg-marca-600/[0.14]"
      >
        <Aro hechos={hechos} total={total} />
        <span className="min-w-0 flex-1">
          <span className="block text-base font-semibold text-ink-900">Pon tu equipo en marcha</span>
          <span className="mt-0.5 block truncate text-sm text-ink-600">
            {siguiente ? `Ahora: ${siguiente.titulo.toLowerCase()}` : 'Ya casi está'}
          </span>
        </span>
        <ChevronRight size={17} className="shrink-0 text-ink-500" aria-hidden />
      </button>

      {/* La lista entera, cuando se pide. Es la hoja de siempre del producto:
          sube desde abajo en el móvil y aparece centrada en el escritorio. */}
      <Modal
        open={abierta}
        onClose={() => setAbierta(false)}
        title="Pon tu equipo en marcha"
        description={
          hechos === 0
            ? `${total} cosas y lo tienes funcionando.`
            : `Llevas ${hechos} de ${total}. Esto desaparece solo al terminar.`
        }
        footer={
          <button
            onClick={() => void apagar()}
            className="text-sm font-medium text-ink-500 underline-offset-4 transition-colors hover:text-ink-900 hover:underline"
          >
            No volver a enseñar esto
          </button>
        }
      >
        <ul className="-mx-1.5">
          {estado.map((p) => {
            const esSiguiente = p.id === siguiente?.id;
            return (
              <li key={p.id}>
                {/* UNA REJILLA, NO UNA FILA QUE SE PARTE. Con `flex-wrap`, el
                    texto podía encogerse en vez de saltar de línea y en 390 px
                    quedaba una columna de ciento ochenta píxeles con el título
                    en cuatro renglones y el botón al lado. Con dos columnas en
                    el móvil y tres a partir de `sm`, el botón CAE debajo del
                    texto cuando no hay sitio, que es lo que tiene que hacer. */}
                <div
                  className={cn(
                    'grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-2.5 rounded-xl px-2.5 py-2.5 sm:grid-cols-[auto_1fr_auto] sm:gap-x-4',
                    esSiguiente && 'bg-raised',
                  )}
                >
                  {/* La marca. No es una casilla: no se puede pulsar, porque la
                      única manera de tacharlo es hacerlo. */}
                  <span
                    aria-hidden
                    className={cn(
                      'grid h-6 w-6 shrink-0 place-items-center rounded-full border transition-colors',
                      p.ok
                        ? 'border-transparent bg-marca-600 text-white'
                        : 'border-line-fuerte text-transparent',
                    )}
                  >
                    <Check size={14} strokeWidth={3} />
                  </span>

                  <span className="min-w-0">
                    <span
                      className={cn(
                        'block text-base font-medium',
                        p.ok ? 'text-ink-500 line-through decoration-ink-400' : 'text-ink-900',
                      )}
                    >
                      {p.titulo}
                    </span>
                    {/* EL PORQUÉ, SÓLO EN EL SIGUIENTE: el que toca se explica
                        y se pulsa, y los demás son una línea que dice lo que
                        viene después. */}
                    {!p.ok && esSiguiente && (
                      <span className="mt-0.5 block text-sm leading-relaxed text-ink-600">
                        {p.porque}
                      </span>
                    )}
                  </span>

                  {!p.ok && esSiguiente && destino(p) && (
                    <Link
                      to={destino(p)!}
                      onClick={() => setAbierta(false)}
                      className="metal-claro col-start-2 inline-flex h-9 w-fit items-center gap-1.5 rounded-xl px-3.5 text-sm font-medium text-white transition-colors sm:col-start-3 sm:justify-self-end"
                    >
                      {p.accion}
                      <ArrowRight size={14} />
                    </Link>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </Modal>
    </>
  );
}

/**
 * El aro: cuánto llevas, en 34 píxeles.
 *
 * Una barra de progreso necesita el ancho de la tarjeta; un aro cabe al lado
 * del texto y dice lo mismo. Dentro va la cuenta —«5/6»— porque el ángulo
 * solo se estima mal y la cuenta no se estima.
 */
function Aro({ hechos, total }: { hechos: number; total: number }) {
  const tamano = 34;
  const grosor = 3;
  const r = (tamano - grosor) / 2;
  const c = 2 * Math.PI * r;
  return (
    <span
      className="relative grid shrink-0 place-items-center"
      style={{ width: tamano, height: tamano }}
      role="progressbar"
      aria-valuenow={hechos}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-label={`${hechos} de ${total} pasos hechos`}
    >
      <svg width={tamano} height={tamano} className="-rotate-90" aria-hidden>
        <circle cx={tamano / 2} cy={tamano / 2} r={r} fill="none" stroke="rgba(148,180,255,0.18)" strokeWidth={grosor} />
        <circle
          cx={tamano / 2}
          cy={tamano / 2}
          r={r}
          fill="none"
          stroke="#168BFF"
          strokeWidth={grosor}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (hechos / total) * c}
          style={{ transition: 'stroke-dashoffset .5s cubic-bezier(.22,1,.36,1)' }}
        />
      </svg>
      <span className="absolute font-display text-2xs font-semibold tabular-nums text-ink-900">
        {hechos}/{total}
      </span>
    </span>
  );
}
