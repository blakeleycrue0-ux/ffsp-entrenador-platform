/**
 * Último paso del alta: elegir plan.
 * ---------------------------------------------------------------------------
 * Aquí es donde alguien decide si paga, así que hay dos cosas que no se hacen:
 *
 *  · NO SE INVENTA NINGÚN PRECIO. Los importes salen de la base de datos.
 *    Mientras no haya uno decidido, el plan se enseña igual — para que se vea
 *    que existe — pero dice «Precio por decidir» y no se puede contratar.
 *
 *  · NO SE INVENTA NINGÚN DESCUENTO. Cuando alguien elige Gratis aparece una
 *    oferta a los cuatro segundos, y lo que ofrece sale también de los datos:
 *    hoy son los días de prueba, que están decididos y son reales. El día que
 *    haya un descuento de verdad configurado, se enseña ése. Un «50 % sólo
 *    hoy» escrito a mano en el código sería mentira desde el primer día.
 *
 * La oferta se puede cerrar, no vuelve a salir, y no bloquea nada: quien
 * quiera seguir en Gratis sigue en Gratis con un clic.
 */

import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui';
import { billing, importe, NIVELES, type Plan, type PlanTier } from '@/services/billing';
import { cn } from '@/lib/utils';

const ARGUMENTO: Record<PlanTier, string> = {
  free: 'Un equipo. Para empezar.',
  pro: 'Hasta cinco equipos.',
  max: 'Todos los equipos del club.',
};

const equiposQuePermite = (p: Plan) =>
  p.maxTeams === null ? 'Equipos sin límite' : p.maxTeams === 1 ? 'Un equipo' : `Hasta ${p.maxTeams} equipos`;

export function PasoPlan({ onTerminar }: { onTerminar: () => Promise<void> }) {
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [elegido, setElegido] = useState<PlanTier>('free');
  const [ofertaVisible, setOfertaVisible] = useState(false);
  const [ofertaGastada, setOfertaGastada] = useState(false);
  const [saliendo, setSaliendo] = useState(false);
  const temporizador = useRef<number | null>(null);

  useEffect(() => {
    /* Si la consulta falla no se tumba el alta: se sigue sin enseñar planes,
       que es mejor que dejar a alguien atrapado en el último paso. */
    billing.planes().then(setPlanes).catch(() => setPlanes([]));
  }, []);

  /* Los cuatro segundos. El reloj arranca al elegir Gratis y se cancela si
     cambia de idea antes, si ya se enseñó una vez, o si se va de la pantalla:
     un temporizador que sobrevive al componente acaba pintando sobre algo que
     ya no existe. */
  useEffect(() => {
    if (elegido !== 'free' || ofertaGastada) return;
    temporizador.current = window.setTimeout(() => {
      setOfertaVisible(true);
      setOfertaGastada(true);
    }, 4000);
    return () => {
      if (temporizador.current) window.clearTimeout(temporizador.current);
    };
  }, [elegido, ofertaGastada]);

  const ordenados = NIVELES.map((n) => planes.find((p) => p.tier === n)).filter((p): p is Plan => Boolean(p));
  const laOferta = planes.find((p) => p.tier === 'pro') ?? planes.find((p) => p.tier === 'max');

  const terminar = async () => {
    setSaliendo(true);
    try {
      await onTerminar();
    } finally {
      setSaliendo(false);
    }
  };

  return (
    <div className="animate-fade-up">
      <h1 className="font-display text-2xl font-bold tracking-[-0.015em] text-ink-900">Elige tu plan</h1>
      <p className="mt-1.5 max-w-xl text-base leading-relaxed text-ink-600">
        Puedes empezar gratis y cambiar cuando quieras. No se te cobra nada sin que lo pidas tú.
      </p>

      <div className="mt-6 space-y-2.5">
        {ordenados.length === 0 && (
          <p className="rounded-2xl bg-panel px-4 py-3.5 text-base text-ink-600">
            No hemos podido cargar los planes. Puedes seguir y verlos luego en Ajustes.
          </p>
        )}
        {ordenados.map((p) => (
          <TarjetaPlan
            key={p.tier}
            plan={p}
            elegido={elegido === p.tier}
            onElegir={() => setElegido(p.tier)}
          />
        ))}
      </div>

      <div className="mt-6 border-t border-line pt-5">
        <Button size="lg" block loading={saliendo} icon={<ArrowRight size={17} />} onClick={() => void terminar()}>
          {elegido === 'free' ? 'Empezar gratis' : 'Entrar y configurar el pago'}
        </Button>
      </div>

      {ofertaVisible && laOferta && (
        <Oferta plan={laOferta} onCerrar={() => setOfertaVisible(false)} onAceptar={() => setElegido(laOferta.tier)} />
      )}
    </div>
  );
}

function TarjetaPlan({ plan, elegido, onElegir }: { plan: Plan; elegido: boolean; onElegir: () => void }) {
  const esGratis = plan.tier === 'free';
  const mensual = importe(plan.priceMonthly, plan.currency);

  return (
    <button
      type="button"
      onClick={onElegir}
      aria-pressed={elegido}
      className={cn(
        'flex w-full items-center gap-3.5 rounded-2xl px-4 py-4 text-left transition-colors',
        elegido ? 'bg-raised ring-2 ring-ink-900' : 'bg-panel hover:bg-raised',
      )}
    >
      <span
        className={cn(
          'grid h-6 w-6 shrink-0 place-items-center rounded-full transition-colors',
          elegido ? 'bg-ink-900 text-ink-0' : 'border-2 border-ink-300',
        )}
      >
        {elegido && <Check size={14} strokeWidth={3} />}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-md font-semibold text-ink-900">{plan.name}</span>
        <span className="block text-sm text-ink-500">{ARGUMENTO[plan.tier]}</span>
      </span>

      <span className="shrink-0 text-right">
        {esGratis ? (
          <span className="block text-md font-semibold text-ink-900">0 €</span>
        ) : mensual ? (
          <>
            <span className="block text-md font-semibold text-ink-900">{mensual}</span>
            <span className="block text-xs text-ink-500">al mes</span>
          </>
        ) : (
          <span className="block text-sm text-ink-500">Precio por decidir</span>
        )}
      </span>
    </button>
  );
}

/**
 * La oferta. Aparece sola a los cuatro segundos de quedarse en Gratis.
 * Lo que ofrece sale del plan, no de aquí: si no hay días de prueba
 * configurados, no se inventa ninguno y se limita a decir qué se lleva.
 */
function Oferta({ plan, onCerrar, onAceptar }: { plan: Plan; onCerrar: () => void; onAceptar: () => void }) {
  const dias = plan.trialDays;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        aria-label="Cerrar la oferta"
        onClick={onCerrar}
        className="absolute inset-0 animate-fade-in bg-black/70 backdrop-blur-sm"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-oferta"
        className="relative w-full max-w-md animate-sheet-in rounded-t-3xl bg-panel p-6 pb-8 sm:rounded-3xl sm:pb-6"
      >
        <button
          onClick={onCerrar}
          aria-label="Cerrar"
          className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-raised text-ink-500 transition-colors hover:text-ink-900"
        >
          <X size={17} />
        </button>

        <span className="grid h-14 w-14 animate-pop-in place-items-center rounded-2xl bg-ink-900 text-ink-0">
          <Sparkles size={26} strokeWidth={2} />
        </span>

        <h2 id="titulo-oferta" className="mt-4 font-display text-2xl font-bold tracking-[-0.015em] text-ink-900">
          {dias ? `Antes de irte: ${dias} días de ${plan.name} gratis` : `Echa un vistazo a ${plan.name}`}
        </h2>

        <p className="mt-2 text-base leading-relaxed text-ink-600">
          {dias ? (
            <>
              Puedes probar <strong className="text-ink-900">{plan.name}</strong> durante {dias} días sin
              pagar nada. Si no te convence, lo cancelas antes de que termine y no se te cobra.
            </>
          ) : (
            <>
              Con <strong className="text-ink-900">{plan.name}</strong> puedes llevar{' '}
              {plan.maxTeams === null ? 'todos los equipos del club' : `hasta ${plan.maxTeams} equipos`}.
            </>
          )}
        </p>

        <ul className="mt-4 space-y-2">
          {[equiposQuePermite(plan), 'Todo el cuerpo técnico que haga falta', 'Cancelas cuando quieras'].map((t) => (
            <li key={t} className="flex items-start gap-2.5 text-base text-ink-700">
              <Check size={16} strokeWidth={2.6} className="mt-0.5 shrink-0 text-ink-900" />
              {t}
            </li>
          ))}
        </ul>

        <div className="mt-6 space-y-2">
          <Button
            size="lg"
            block
            onClick={() => {
              onAceptar();
              onCerrar();
            }}
          >
            {dias ? `Probar ${dias} días` : `Ver ${plan.name}`}
          </Button>
          <Button size="lg" block variant="ghost" onClick={onCerrar}>
            No, gracias
          </Button>
        </div>

        {/* Dicho antes de aceptar, no en letra pequeña después. */}
        {Boolean(dias) && (
          <p className="mt-3 text-center text-xs leading-relaxed text-ink-500">
            La prueba pide tarjeta y, si no la cancelas, se cobra al terminar.
          </p>
        )}
      </div>
    </div>
  );
}
