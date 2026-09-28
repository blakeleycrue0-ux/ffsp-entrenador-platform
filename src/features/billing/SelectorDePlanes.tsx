/**
 * Elegir plan.
 * ---------------------------------------------------------------------------
 * Tres decisiones de fondo:
 *
 * 1. UN PLAN CADA VEZ. Tres columnas de precios en un móvil salen a ciento
 *    veinte píxeles por columna: se leen mal, se comparan peor y obligan a
 *    encoger la letra hasta que nada importa. Aquí se elige arriba y debajo se
 *    ve ESE plan entero, con su precio grande y lo que trae.
 *
 * 2. NO SE INVENTA NINGÚN PRECIO NI NINGÚN DESCUENTO. Los importes salen de la
 *    base de datos. El ahorro del anual se CALCULA contra el mensual y sólo se
 *    enseña si sale positivo de verdad; no hay porcentajes escritos a mano ni
 *    cuentas atrás. Un plan sin precio se ve —para saber que existe— pero dice
 *    que falta y no se puede contratar.
 *
 * 3. NO SE ANUNCIA LO QUE NO EXISTE. La lista de cada plan sale del catálogo
 *    de capacidades, que marca cuáles están construidas. Lo que está a medias
 *    no aparece aquí para vender un plan.
 */

import { useState } from 'react';
import { Button } from '@/components/ui';
import { importe, NIVELES, type Plan, type PlanTier } from '@/services/billing';
import { loQueFalta, todoLoQueTrae } from '@/services/entitlements';
import { cn } from '@/lib/utils';

export type Periodo = 'mensual' | 'anual';

/** La diferencia de cada plan, en una línea corta. */
export const LIMITE: Record<PlanTier, string> = {
  free: '1 equipo',
  pro: 'Hasta 5 equipos',
  max: 'Equipos sin límite',
};

const PARA_QUIEN: Record<PlanTier, string> = {
  free: 'Para llevar un equipo de principio a fin.',
  pro: 'Para quien lleva varios equipos a la vez.',
  max: 'Para clubes que quieren gestionarlo todo desde un mismo sitio.',
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

  const dePago = plan.tier !== 'free';
  const hayPrecios = ordenados.some((p) => p.priceMonthly !== null || p.priceYearly !== null);
  /* Si hoy no se puede contratar nada, no hay diferencias que enseñar: todo
     está en los tres, y así se lista. */
  const seVende = ordenados.some((p) => p.contratable);
  const precio = importe(periodo === 'anual' ? plan.priceYearly : plan.priceMonthly, plan.currency);
  const ahorro = ahorroAnual(plan);

  return (
    <div>
      {/* El selector: tres pestañas, no tres columnas. */}
      <div role="tablist" aria-label="Planes" className="cristal flex gap-1 rounded-2xl p-1">
        {ordenados.map((p) => (
          <button
            key={p.tier}
            role="tab"
            aria-selected={p.tier === elegido}
            onClick={() => onElegir(p.tier)}
            className={cn(
              'relative flex-1 rounded-xl py-2.5 text-base font-semibold transition-all duration-200',
              p.tier === elegido
                ? 'bg-azul-600 text-white shadow-azul'
                : 'text-ink-600 hover:bg-white/[0.06] hover:text-ink-900',
            )}
          >
            {p.name}
          </button>
        ))}
      </div>

      {/* `key` por plan: al cambiar de pestaña el panel entra de nuevo en vez
          de que salten las cifras de una a otra. */}
      <div key={plan.tier} className="mt-7 animate-paso">
        {plan.tier === 'pro' && (
          <p className="rotulo mb-2 text-azul-400">El más usado para varios equipos</p>
        )}

        <div className="flex items-end gap-2.5">
          {plan.tier === 'free' ? (
            <>
              <span className="cifra text-5xl">0 €</span>
              <span className="pb-1.5 text-base text-ink-500">para siempre</span>
            </>
          ) : precio ? (
            <>
              <span className="cifra text-5xl">{precio}</span>
              <span className="pb-1.5 text-base text-ink-500">
                {periodo === 'anual' ? 'al año' : 'al mes'}
              </span>
            </>
          ) : (
            /* Sin precio decidido no se enseña una cifra falsa. */
            <span className="cifra text-3xl text-ink-500">Sin precio todavía</span>
          )}
        </div>

        <p className="mt-2.5 text-md leading-relaxed text-ink-600">{PARA_QUIEN[plan.tier]}</p>

        {/* El anual sólo aparece si hay precios que comparar. */}
        {dePago && hayPrecios && (
          <div className="mt-5 flex items-center gap-3">
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
            {/* Sólo si el ahorro es cierto. Se calcula, no se escribe. */}
            {ahorro !== null && (
              /* En azul, no en verde: el verde se quitó del producto entero. */
              <span className="text-sm font-semibold text-azul-400">Ahorras un {ahorro} %</span>
            )}
          </div>
        )}

        <div className="mt-6 divide-y divide-line">
          <Linea texto={LIMITE[plan.tier]} fuerte />
          {plan.tier !== 'free' && <Linea texto={`Todo lo de ${ordenados[0]?.name ?? 'Gratis'}`} />}
          {(plan.tier === 'free' ? todoLoQueTrae('free', seVende) : loQueFalta(plan.tier, seVende)).map((t) => (
            <Linea key={t} texto={t} />
          ))}
        </div>

        {/* Si hoy un plan de pago no añade ninguna capacidad más, se dice.
            Callarlo dejaría creer que trae cosas que todavía no existen. */}
        {plan.tier !== 'free' && loQueFalta(plan.tier, seVende).length === 0 && (
          <p className="mt-4 text-sm leading-relaxed text-ink-500">
            Hoy la diferencia es sólo cuántos equipos caben. Las herramientas avanzadas se irán
            añadiendo a este plan; no las cobramos por adelantado.
          </p>
        )}

        {nivelActual === plan.tier && (
          <p className="mt-4 text-sm font-medium text-azul-400">Es el plan que tienes ahora.</p>
        )}
      </div>
    </div>
  );
}

function Linea({ texto, fuerte }: { texto: string; fuerte?: boolean }) {
  return (
    <p className={cn('py-3 text-base', fuerte ? 'font-semibold text-ink-900' : 'text-ink-600')}>
      {texto}
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
          Todavía no tiene precio, así que no se puede contratar. Preferimos dejarlo en blanco a
          enseñarte una cifra que no es.
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
