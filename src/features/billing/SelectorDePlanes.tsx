/**
 * Elegir plan.
 * ---------------------------------------------------------------------------
 * LAS TRES A LA VEZ, Y PRO LA PRIMERA.
 *
 * Esto eran tres PESTAÑAS: se elegía arriba y debajo salía ese plan entero.
 * El razonamiento de entonces era que tres columnas en un móvil salen a
 * ciento veinte píxeles cada una y no se leen. Es verdad, pero la conclusión
 * estaba mal: lo que no cabe en un móvil son tres COLUMNAS, no tres planes.
 * Apilados caben de sobra.
 *
 * Y con pestañas no hay comparación posible, que es exactamente lo único que
 * se viene a hacer a esta pantalla. Para ver si Pro compensa hay que tocar
 * «Pro», leer, tocar «Gratis», acordarse de lo que ponía, volver. Nadie hace
 * eso: se cierra la pantalla.
 *
 * Pro va primero en el móvil, no en medio, porque es el que se contrata y
 * porque quien baja dos pantallas sin encontrar un precio se va.
 *
 * MISMO ASPECTO QUE LA PORTADA, a propósito: la tarjeta oscura con el sello
 * lima es la que ya ha visto fuera quien llega hasta aquí. Dos pantallas que
 * venden lo mismo con dos caras distintas se leen como dos ofertas.
 *
 * Lo que no cambia:
 *
 * · NO SE INVENTA NINGÚN PRECIO NI NINGÚN DESCUENTO. Los importes salen de la
 *   base de datos. El ahorro del anual se CALCULA contra el mensual y sólo se
 *   enseña si sale positivo de verdad. Un plan sin precio se ve —para saber
 *   que existe— pero dice que falta y no se puede contratar.
 *
 * · NO SE ANUNCIA LO QUE NO EXISTE. La lista de cada plan sale del catálogo
 *   de capacidades, que marca cuáles están construidas.
 */
import { useState } from 'react';
import { Button } from '@/components/ui';
import { importe, NIVELES, type Plan, type PlanTier } from '@/services/billing';
import { loQueFalta, todoLoQueTrae } from '@/services/entitlements';
import { cn } from '@/lib/utils';

export type Periodo = 'mensual' | 'anual';

/**
 * Cuántos equipos caben, en una línea corta.
 *
 * SALE DE LA TABLA, NO DE AQUÍ. Esto era un diccionario escrito a mano —«1
 * equipo», «hasta 5», «sin límite»— y la migración 0012 decidió otra cosa:
 * Gratis uno, Pro uno, Max cinco. El diccionario se quedó con los números
 * viejos y durante un tiempo esta pantalla prometió a quien eligiera Pro cinco
 * equipos que la base de datos le iba a negar, porque el límite lo impone la
 * política de RLS al insertar. Leyendo `max_teams` eso no puede volver a
 * pasar: cambiar el límite es cambiar una fila.
 */
export const limiteDeEquipos = (plan: Plan): string =>
  plan.maxTeams === null
    ? 'Equipos sin límite'
    : plan.maxTeams === 1
      ? 'Un equipo'
      : `Hasta ${plan.maxTeams} equipos`;

/* Para quién es cada uno. Mismo encuadre que la portada —Pro es un entrenador
   con su equipo, Max es un club con varios— porque son la misma oferta vista
   desde fuera y desde dentro, y contradecirse entre las dos pantallas es la
   forma más rápida de que no se crea ninguna. */
export const PARA_QUIEN: Record<PlanTier, string> = {
  free: 'Para empezar con un equipo y ver si esto te sirve.',
  pro: 'Para el entrenador que lleva su equipo y quiere más de uno.',
  max: 'Para el club con varios equipos y varias personas en el cuerpo técnico.',
  club: 'Para el club entero: todas las categorías y todo el cuerpo técnico.',
};

/**
 * Cuánto se ahorra al año, de verdad. Devuelve `null` si no hay los dos
 * precios o si el anual no sale más barato: un «ahorra 0 %» es peor que nada.
 */
export function ahorroAnual(plan: Plan): number | null {
  if (!plan.priceMonthly || !plan.priceYearly) return null;
  const doceMeses = plan.priceMonthly * 12;
  if (plan.priceYearly >= doceMeses) return null;
  return Math.round((1 - plan.priceYearly / doceMeses) * 100);
}

export function SelectorDePlanes({
  planes, elegido, onElegir, periodo, onPeriodo, nivelActual,
}: {
  planes: Plan[];
  elegido: PlanTier;
  onElegir: (t: PlanTier) => void;
  periodo: Periodo;
  onPeriodo: (p: Periodo) => void;
  /** El plan que ya tiene, si lo tiene: se marca y no se ofrece contratar. */
  nivelActual?: PlanTier;
}) {
  const ordenados = NIVELES.map((n) => planes.find((p) => p.tier === n)).filter((p): p is Plan => Boolean(p));
  const plan = ordenados.find((p) => p.tier === elegido) ?? ordenados[0];
  if (!plan) {
    return (
      <p className="py-4 text-base leading-relaxed text-ink-500">
        No hemos podido cargar los planes. Puedes seguir y verlos en Ajustes.
      </p>
    );
  }

  const hayPrecios = ordenados.some((p) => p.priceMonthly !== null || p.priceYearly !== null);
  /* Si hoy no se puede contratar nada, no hay diferencias que enseñar: todo
     está en los tres, y así se lista. */
  const seVende = ordenados.some((p) => p.contratable);
  const dePago = ordenados.filter((p) => p.tier !== 'free');

  return (
    <div>
      {/* El mensual/anual manda sobre las tres tarjetas a la vez. Uno por
          tarjeta sería tres mandos para una sola decisión, y además permitiría
          comparar un precio mensual con uno anual sin darse cuenta. */}
      {dePago.length > 0 && hayPrecios && (
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <div className="cristal inline-flex gap-1 rounded-full p-1">
            {(['mensual', 'anual'] as Periodo[]).map((p) => (
              <button
                key={p}
                onClick={() => onPeriodo(p)}
                aria-pressed={periodo === p}
                className={cn(
                  'rounded-full px-3.5 py-1.5 text-sm font-semibold transition-all',
                  periodo === p ? 'bg-white/12 text-ink-900' : 'text-ink-500 hover:text-ink-800',
                )}
              >
                {p === 'mensual' ? 'Mensual' : 'Anual'}
              </button>
            ))}
          </div>
          {/* El ahorro del plan más contratado, y sólo si es cierto. Se
              calcula, no se escribe. En blanco: es un dato, no una oferta. */}
          {(() => {
            const pro = ordenados.find((p) => p.tier === 'pro');
            const a = pro ? ahorroAnual(pro) : null;
            return a === null ? null : (
              <span className="text-sm font-medium text-ink-900">Ahorras un {a} % al año</span>
            );
          })()}
        </div>
      )}

      {/* Apiladas en el móvil, tres columnas en pantalla ancha. `order` pone
          Pro arriba del todo en el móvil y la devuelve al medio cuando hay
          sitio para las tres de lado, que es donde se compara mejor. */}
      {/* Dos columnas en cuanto hay sitio, cuatro cuando cabe de verdad. A
          cuatro columnas en un portátil cada tarjeta se queda en doscientos
          y pico píxeles y los nombres de las funciones empiezan a partirse. */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 xl:items-start">
        {ordenados.map((p) => (
          <Tarjeta
            key={p.tier}
            plan={p}
            periodo={periodo}
            elegido={p.tier === elegido}
            esElActual={nivelActual === p.tier}
            seVende={seVende}
            onElegir={() => onElegir(p.tier)}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Un plan, entero, en una tarjeta.
 *
 * Toda la tarjeta es el botón de elegir, no un botón pequeño dentro: en un
 * móvil se toca con el pulgar y acertar un rectángulo de trescientos píxeles
 * es más fácil que acertar uno de cien.
 */
function Tarjeta({
  plan, periodo, elegido, esElActual, seVende, onElegir,
}: {
  plan: Plan;
  periodo: Periodo;
  elegido: boolean;
  esElActual: boolean;
  seVende: boolean;
  onElegir: () => void;
}) {
  /* El destacado es el mismo que en la portada y por el mismo motivo: es el
     que lleva más de un equipo por menos de seis euros. */
  const destacado = plan.tier === 'pro';
  const precio = importe(periodo === 'anual' ? plan.priceYearly : plan.priceMonthly, plan.currency);
  const nuevasAqui = plan.tier === 'free' ? [] : loQueFalta(plan.tier, seVende);

  /* El importe del OTRO periodo, con lo que se ahorra pagando el año. */
  const otroImporte = importe(periodo === 'anual' ? plan.priceMonthly : plan.priceYearly, plan.currency);
  const ahorroEuros = plan.priceMonthly !== null && plan.priceYearly !== null && plan.priceMonthly > 0
    ? importe(plan.priceMonthly * 12 - plan.priceYearly, plan.currency)
    : null;
  const otro = plan.tier === 'free' || !otroImporte
    ? null
    : periodo === 'anual'
      ? `o ${otroImporte} al mes`
      : `o ${otroImporte} al año${ahorroEuros ? ` — ahorras ${ahorroEuros}` : ''}`;

  return (
    <button
      type="button"
      onClick={onElegir}
      aria-pressed={elegido}
      className={cn(
        'flex w-full flex-col rounded-2xl border p-5 text-left transition-all duration-200',
        destacado ? 'order-first lg:order-none' : '',
        destacado
          ? 'border-transparent bg-abismo text-white'
          : 'border-line bg-panel hover:border-ink-300',
        /* Elegida: un aro, no un color distinto. Cambiar el fondo al elegir
           haría que la tarjeta destacada dejara de verse destacada. */
        elegido && (destacado ? 'ring-2 ring-lima' : 'ring-2 ring-ink-900'),
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <h3 className={cn('text-md font-semibold', destacado ? 'text-white' : 'text-ink-900')}>
          {plan.name}
        </h3>
        {destacado && (
          <span className="rounded-full bg-lima px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-abismo">
            Recomendado
          </span>
        )}
        {esElActual && (
          <span className={cn(
            'rounded-full px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.08em]',
            destacado ? 'bg-white/15 text-white' : 'bg-ink-900/10 text-ink-700',
          )}>
            El tuyo
          </span>
        )}
      </div>

      <div className="mt-3 flex items-end gap-2">
        {plan.tier === 'free' ? (
          <>
            <span className={cn('cifra text-4xl', destacado ? 'text-white' : 'text-ink-900')}>0 €</span>
            <span className={cn('pb-1 text-sm', destacado ? 'text-white/55' : 'text-ink-500')}>
              para siempre
            </span>
          </>
        ) : precio ? (
          <>
            <span className={cn('cifra text-4xl', destacado ? 'text-white' : 'text-ink-900')}>{precio}</span>
            <span className={cn('pb-1 text-sm', destacado ? 'text-white/55' : 'text-ink-500')}>
              {periodo === 'anual' ? 'al año' : 'al mes'}
            </span>
          </>
        ) : (
          /* Sin precio decidido no se enseña una cifra falsa. */
          <span className={cn('cifra text-2xl', destacado ? 'text-white/70' : 'text-ink-500')}>
            Sin precio todavía
          </span>
        )}
      </div>

      {/* EL OTRO PERIODO, SIEMPRE A LA VISTA. Con el mensual y el anual
          detrás de un interruptor, para comparar hay que tocarlo, leer tres
          cifras, tocarlo otra vez y acordarse: nadie lo hace. Y mientras esta
          línea no estuvo, el precio anual no aparecía en ninguna parte de la
          pantalla — lo cazó `pruebas/planes-iguales.mjs`.
          El ahorro se RESTA, no se escribe, así que no puede quedarse viejo
          respecto a los dos importes que tiene al lado. */}
      {otro && (
        <p className={cn('mt-1 text-sm', destacado ? 'text-white/50' : 'text-ink-500')}>
          {otro}
        </p>
      )}

      <p className={cn('mt-2 text-sm leading-relaxed', destacado ? 'text-white/60' : 'text-ink-600')}>
        {PARA_QUIEN[plan.tier]}
      </p>

      {/* TODO LO QUE TRAE, no sólo lo que añade. Aunque ahora las tres estén a
          la vista, en el móvil están una debajo de otra y la de al lado no se
          ve: «Todo lo de Gratis» obligaría a subir a buscarlo. */}
      <div className={cn('mt-4 divide-y', destacado ? 'divide-white/10' : 'divide-line')}>
        <Linea texto={limiteDeEquipos(plan)} fuerte oscuro={destacado} />
        {todoLoQueTrae(plan.tier, seVende).map((t) => (
          <Linea key={t} texto={t} nuevo={nuevasAqui.includes(t)} oscuro={destacado} />
        ))}
      </div>

      {/* Si hoy un plan de pago no añade ninguna capacidad más, se dice.
          Callarlo dejaría creer que trae cosas que todavía no existen. */}
      {plan.tier !== 'free' && nuevasAqui.length === 0 && (
        <p className={cn('mt-3 text-sm leading-relaxed', destacado ? 'text-white/50' : 'text-ink-500')}>
          Hoy la diferencia es sólo cuántos equipos caben. Las herramientas avanzadas se irán
          añadiendo a este plan; no las cobramos por adelantado.
        </p>
      )}
    </button>
  );
}

function Linea({
  texto, fuerte, nuevo, oscuro,
}: { texto: string; fuerte?: boolean; nuevo?: boolean; oscuro?: boolean }) {
  return (
    <p
      className={cn(
        'flex flex-wrap items-center gap-2 py-2 text-sm',
        fuerte && 'font-semibold',
        oscuro ? (fuerte ? 'text-white' : 'text-white/70') : (fuerte ? 'text-ink-900' : 'text-ink-600'),
      )}
    >
      {texto}
      {nuevo && (
        <span className={cn(
          'rounded-full px-2 py-0.5 text-[11px] font-semibold',
          oscuro ? 'bg-lima text-abismo' : 'bg-ink-900 text-ink-0',
        )}>
          Nuevo aquí
        </span>
      )}
    </p>
  );
}

/** El botón que corresponde al plan elegido, con su texto y su estado. */
export function BotonDePlan({
  plan, esElActual, cargando, onClick,
}: {
  plan: Plan;
  esElActual: boolean;
  cargando?: boolean;
  onClick: () => void;
}) {
  const esGratis = plan.tier === 'free';
  const sePuede = esGratis || plan.contratable;
  /* Dos motivos distintos para no poder contratar, y no dan la misma
     explicación: o no hay precio decidido, o lo hay y la caja no está abierta
     todavía. Decir «no tiene precio» con el precio escrito tres centímetros
     más arriba es quedar por mentiroso sin necesidad. */
  const hayPrecio = plan.priceMonthly !== null || plan.priceYearly !== null;

  return (
    <div>
      <Button size="lg" block loading={cargando} disabled={esElActual || !sePuede} onClick={onClick}>
        {esElActual
          ? `Ya tienes ${plan.name}`
          : esGratis
            ? 'Empezar gratis'
            : plan.trialDays
              ? `Probar ${plan.name} ${plan.trialDays} días`
              : `Elegir ${plan.name}`}
      </Button>
      {!sePuede && !esElActual && (
        <p className="mt-2.5 text-center text-sm leading-relaxed text-ink-500">
          {hayPrecio
            ? 'Todavía no hay forma de pagar, así que no se puede contratar. Mientras tanto lo tienes todo disponible sin pagar nada.'
            : 'Todavía no tiene precio, así que no se puede contratar. Preferimos dejarlo en blanco a enseñarte una cifra que no es.'}
        </p>
      )}
    </div>
  );
}

/** Estado compartido de la pantalla de planes, para no repetirlo en dos sitios. */
export function useSeleccionDePlan(inicial: PlanTier = 'free') {
  const [elegido, setElegido] = useState<PlanTier>(inicial);
  const [periodo, setPeriodo] = useState<Periodo>('mensual');
  return { elegido, setElegido, periodo, setPeriodo };
}
