/**
 * Elegir plan.
 * ---------------------------------------------------------------------------
 * Dos decisiones de fondo:
 *
 * 1. LO ÚNICO QUE CAMBIA ENTRE PLANES ES CUÁNTOS EQUIPOS CABEN. Todo lo demás
 *    —plantilla, entrenamientos, partidos, pizarra, cuerpo técnico— está en
 *    los tres. Repetir las mismas cuatro líneas debajo de cada plan no
 *    informa: obliga a leer tres veces lo mismo para descubrir que son
 *    idénticas. Se dice una vez, abajo, y cada plan enseña sólo su diferencia.
 *
 * 2. NO SE INVENTA NINGÚN PRECIO. Los importes salen de la base de datos.
 *    Mientras no haya uno decidido, el plan se ve —para que se sepa que
 *    existe— pero dice que falta el precio y no se puede contratar.
 */

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui';
import { billing, importe, NIVELES, type Plan, type PlanTier } from '@/services/billing';
import { cn } from '@/lib/utils';

/** La diferencia de cada plan, en una línea corta. */
const LIMITE: Record<PlanTier, string> = {
  free: '1 equipo',
  pro: '5 equipos',
  max: 'Equipos sin límite',
};

/** Lo que llevan los tres. Se dice una vez. */
const SIEMPRE = 'Plantilla, asistencia, entrenamientos, partidos, pizarra táctica y todo el cuerpo técnico.';

export function PasoPlan({ onTerminar }: { onTerminar: () => Promise<void> }) {
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [elegido, setElegido] = useState<PlanTier>('free');
  const [oferta, setOferta] = useState(false);
  const [ofertaGastada, setOfertaGastada] = useState(false);
  const [saliendo, setSaliendo] = useState(false);
  const reloj = useRef<number | null>(null);

  useEffect(() => {
    // Si falla, se sigue sin planes: mejor que dejar a alguien atrapado aquí.
    billing.planes().then(setPlanes).catch(() => setPlanes([]));
  }, []);

  useEffect(() => {
    if (elegido !== 'free' || ofertaGastada) return;
    reloj.current = window.setTimeout(() => {
      setOferta(true);
      setOfertaGastada(true);
    }, 4000);
    // Un temporizador que sobrevive al componente acaba pintando sobre nada.
    return () => { if (reloj.current) window.clearTimeout(reloj.current); };
  }, [elegido, ofertaGastada]);

  const ordenados = NIVELES.map((n) => planes.find((p) => p.tier === n)).filter((p): p is Plan => Boolean(p));
  const laOferta = planes.find((p) => p.tier === 'pro') ?? planes.find((p) => p.tier === 'max');

  const terminar = async () => {
    setSaliendo(true);
    try { await onTerminar(); } finally { setSaliendo(false); }
  };

  return (
    <div className="animate-fade-up">
      <p className="rotulo">Paso 4 de 4</p>
      <h1 className="cifra mt-2 text-4xl">Tu plan</h1>

      <div className="mt-7 space-y-2">
        {ordenados.length === 0 && (
          <p className="rounded-2xl bg-panel px-5 py-4 text-md text-ink-600">
            No hemos podido cargar los planes. Puedes seguir y verlos en Ajustes.
          </p>
        )}
        {ordenados.map((p) => (
          <FilaPlan key={p.tier} plan={p} elegido={elegido === p.tier} onElegir={() => setElegido(p.tier)} />
        ))}
      </div>

      <p className="mt-4 text-base leading-relaxed text-ink-500">
        <span className="font-medium text-ink-700">Los tres planes lo llevan todo.</span> {SIEMPRE} Lo
        único que cambia es cuántos equipos puedes tener.
      </p>

      <div className="mt-8">
        <Button size="lg" block loading={saliendo} onClick={() => void terminar()}>
          {elegido === 'free' ? 'Empezar' : 'Entrar y configurar el pago'}
        </Button>
      </div>

      {oferta && laOferta && (
        <Oferta plan={laOferta} onCerrar={() => setOferta(false)} onAceptar={() => setElegido(laOferta.tier)} />
      )}
    </div>
  );
}

function FilaPlan({ plan, elegido, onElegir }: { plan: Plan; elegido: boolean; onElegir: () => void }) {
  const esGratis = plan.tier === 'free';
  const mensual = importe(plan.priceMonthly, plan.currency);

  return (
    <button
      type="button"
      onClick={onElegir}
      aria-pressed={elegido}
      className={cn(
        'flex w-full items-center gap-4 rounded-2xl px-5 py-5 text-left transition-all duration-150 active:scale-[0.99]',
        elegido ? 'bg-raised ring-2 ring-ink-900' : 'bg-panel hover:bg-raised',
      )}
      style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,.055)' }}
    >
      <span className="min-w-0 flex-1">
        <span className="block text-lg font-semibold tracking-[-0.01em] text-ink-900">{plan.name}</span>
        <span className="mt-0.5 block text-base text-ink-500">{LIMITE[plan.tier]}</span>
      </span>

      <span className="shrink-0 text-right">
        {esGratis ? (
          <>
            <span className="cifra block text-3xl">0 €</span>
            <span className="mt-1 block text-sm text-ink-500">para siempre</span>
          </>
        ) : mensual ? (
          <>
            <span className="cifra block text-3xl">{mensual}</span>
            <span className="mt-1 block text-sm text-ink-500">al mes</span>
          </>
        ) : (
          <>
            <span className="cifra block text-3xl text-ink-400">—</span>
            <span className="mt-1 block text-sm text-ink-500">sin precio aún</span>
          </>
        )}
      </span>
    </button>
  );
}

function Oferta({ plan, onCerrar, onAceptar }: { plan: Plan; onCerrar: () => void; onAceptar: () => void }) {
  const dias = plan.trialDays;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        aria-label="Cerrar"
        onClick={onCerrar}
        className="absolute inset-0 animate-fade-in bg-black/75 backdrop-blur-md"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-oferta"
        className="relative w-full max-w-md animate-sheet-in rounded-t-3xl bg-panel px-6 pb-8 pt-7 sm:rounded-3xl sm:pb-6"
        style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,.07)' }}
      >
        {/* El tirador de la hoja: dice que esto ha subido desde abajo. */}
        <span aria-hidden className="absolute left-1/2 top-3 h-1 w-10 -translate-x-1/2 rounded-full bg-ink-300 sm:hidden" />

        <p className="rotulo">Antes de empezar</p>
        <h2 id="titulo-oferta" className="cifra mt-2 text-3xl">
          {dias ? `${dias} días de ${plan.name}` : plan.name}
        </h2>
        <p className="mt-3 text-md leading-relaxed text-ink-600">
          {dias
            ? `Gratis. Si no te convence, lo cancelas antes de que terminen y no se cobra nada.`
            : `Sin límite de equipos, mismo producto.`}
        </p>

        <p className="mt-5 text-base text-ink-700">{LIMITE[plan.tier]}</p>

        <div className="mt-6 space-y-2">
          <Button size="lg" block onClick={() => { onAceptar(); onCerrar(); }}>
            {dias ? `Probar ${dias} días` : `Elegir ${plan.name}`}
          </Button>
          <Button size="lg" block variant="ghost" onClick={onCerrar}>
            Seguir en Gratis
          </Button>
        </div>

        {Boolean(dias) && (
          <p className="mt-4 text-center text-sm text-ink-500">
            Pide tarjeta. Se cobra al terminar si no cancelas.
          </p>
        )}
      </div>
    </div>
  );
}
