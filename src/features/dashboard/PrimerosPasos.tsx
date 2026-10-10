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

import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, X } from 'lucide-react';
import { useClub } from '@/store/store';
import { currentStaff, isClubAdmin, visibleTeams } from '@/store/selectors';
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
    porque: 'Con los días y las horas puestos, el calendario se llena solo.',
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
 * Los pasos que esta persona puede dar.
 *
 * Crear el equipo sólo lo puede hacer la administración del club: a una
 * entrenadora a la que todavía no le han asignado equipo, poner «Crea tu
 * equipo» con su botón es mandarla a una pantalla que le va a decir que no.
 * Para ella la guía empieza cuando tiene equipo.
 */
const visibles = (d: ClubData): Paso[] =>
  PASOS.filter((p) => !p.soloAdmin || isClubAdmin(d));

export function PrimerosPasos() {
  const { data, actions } = useClub();
  const toast = useToast();
  const yo = currentStaff(data);

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
      await actions.setupGuia(false);
      toast.info('Guía apagada', 'Puedes volver a encenderla en Ajustes y ayuda.');
    } catch (e) {
      toast.error('No se ha podido apagar', humanError(e));
    }
  };

  /* El siguiente sin hacer: es el que lleva la acción destacada. Enseñar seis
     botones iguales no dice por dónde empezar. */
  const siguiente = estado.find((p) => !p.ok);

  return (
    <section
      aria-labelledby="primeros-pasos"
      className="overflow-hidden rounded-3xl border border-marca-600/25 bg-marca-600/[0.07]"
    >
      <div className="flex items-start gap-4 px-5 pt-5 sm:px-6 sm:pt-6">
        <div className="min-w-0 flex-1">
          <h2 id="primeros-pasos" className="text-lg font-semibold text-ink-900">
            Pon tu equipo en marcha
          </h2>
          <p className="mt-1 text-base text-ink-600">
            {hechos === 0
              ? `${total} cosas y lo tienes funcionando.`
              : `Llevas ${hechos} de ${total}. Esto desaparece solo al terminar.`}
          </p>
        </div>
        <button
          onClick={() => void apagar()}
          aria-label="Apagar la guía de primeros pasos"
          title="Apagar la guía"
          className="-mr-1.5 -mt-1.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl text-ink-500 transition-colors hover:bg-raised hover:text-ink-900"
        >
          <X size={17} />
        </button>
      </div>

      {/* La barra: cuánto llevas, sin tener que contar las marcas. */}
      <div className="px-5 pt-4 sm:px-6">
        <div
          className="h-1.5 w-full overflow-hidden rounded-full bg-ink-200"
          role="progressbar"
          aria-valuenow={hechos}
          aria-valuemin={0}
          aria-valuemax={total}
          aria-label={`${hechos} de ${total} pasos hechos`}
        >
          <div
            className="h-full rounded-full bg-marca-500 transition-[width] duration-500 ease-suave"
            style={{ width: `${(hechos / total) * 100}%` }}
          />
        </div>
      </div>

      <ul className="mt-4 px-2 pb-3 sm:px-3 sm:pb-4">
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
                  'grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-3 rounded-2xl px-3 py-3 sm:grid-cols-[auto_1fr_auto]',
                  esSiguiente && 'bg-panel',
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
                      'block text-md font-medium',
                      p.ok ? 'text-ink-500 line-through decoration-ink-400' : 'text-ink-900',
                    )}
                  >
                    {p.titulo}
                  </span>
                  {!p.ok && (
                    <span className="mt-0.5 block text-sm leading-relaxed text-ink-600">
                      {p.porque}
                    </span>
                  )}
                </span>

                {!p.ok && destino(p) && (
                  <Link
                    to={destino(p)!}
                    className={cn(
                      'col-start-2 inline-flex h-9 w-fit items-center gap-1.5 rounded-xl px-3.5 text-sm font-medium transition-colors sm:col-start-3 sm:justify-self-end',
                      esSiguiente
                        ? 'metal-claro text-white'
                        : 'border border-line text-ink-800 hover:bg-raised',
                    )}
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
    </section>
  );
}
