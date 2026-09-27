/**
 * El paso de elegir plan, dentro del alta.
 * ---------------------------------------------------------------------------
 * La pantalla la pinta `SelectorDePlanes`, que es la misma que se usa para
 * cambiar de plan más adelante: así lo que se ve al darse de alta y lo que se
 * ve seis meses después no se contradicen nunca.
 *
 * SOBRE LA OFERTA AL ELEGIR GRATIS. Antes salía sola a los cuatro segundos.
 * Ahora sale al pulsar «Empezar gratis», UNA vez, y sólo si hay algo real que
 * ofrecer: un plan de pago contratable de verdad, con su precio y sus días de
 * prueba. Mientras no lo haya —hoy no lo hay, porque no hay precio decidido—
 * no aparece nada. Una oferta que no se puede aceptar no es una oferta.
 */

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui';
import {
  BotonDePlan, LIMITE, SelectorDePlanes, useSeleccionDePlan,
} from '@/features/billing/SelectorDePlanes';
import { billing, importe, type Plan } from '@/services/billing';
import { todoLoQueTrae } from '@/services/entitlements';
import { humanError } from '@/services/supabase';

export function PasoPlan({
  numero, total, clubId, onTerminar, onError,
}: {
  numero: number;
  total: number;
  /** El club recién creado: hace falta para abrir la pasarela a su nombre. */
  clubId: string | null;
  onTerminar: () => Promise<void>;
  onError: (mensaje: string) => void;
}) {
  const [planes, setPlanes] = useState<Plan[]>([]);
  const { elegido, setElegido, periodo, setPeriodo } = useSeleccionDePlan('free');
  const [oferta, setOferta] = useState<Plan | null>(null);
  const [ofertaGastada, setOfertaGastada] = useState(false);
  const [saliendo, setSaliendo] = useState(false);

  useEffect(() => {
    // Si falla, se sigue sin planes: mejor que dejar a alguien atrapado aquí.
    billing.planes().then(setPlanes).catch(() => setPlanes([]));
  }, []);

  const plan = planes.find((p) => p.tier === elegido);

  /** Lo que se puede ofrecer de verdad a quien se queda en Gratis. */
  const ofertaReal = planes.find((p) => p.tier === 'pro' && p.contratable && p.trialDays > 0)
    ?? planes.find((p) => p.tier === 'max' && p.contratable && p.trialDays > 0)
    ?? null;

  const terminar = async () => {
    setSaliendo(true);
    try { await onTerminar(); } finally { setSaliendo(false); }
  };

  /** Un plan de pago no se «elige»: se contrata, y eso pasa por la pasarela. */
  const contratar = async (elPlan: Plan) => {
    if (!clubId) {
      onError('Se ha perdido el club por el camino. Recarga la página y vuelve a intentarlo.');
      return;
    }
    setSaliendo(true);
    try {
      window.location.href = await billing.irAPagar(clubId, elPlan.tier, periodo);
    } catch (e) {
      onError(humanError(e));
      setSaliendo(false);
    }
  };

  const seguir = () => {
    if (plan && plan.tier !== 'free' && plan.contratable) {
      void contratar(plan);
      return;
    }
    /* Una sola vez, y sólo con algo real detrás. Si se dice «sigo en Gratis»
       se respeta: no se vuelve a preguntar. */
    if (elegido === 'free' && ofertaReal && !ofertaGastada) {
      setOfertaGastada(true);
      setOferta(ofertaReal);
      return;
    }
    void terminar();
  };

  return (
    <div className="animate-fade-up">
      <p className="rotulo">Paso {numero} de {total}</p>
      <h1 className="cifra mt-1.5 text-3xl">Elige cómo quieres empezar</h1>
      <p className="mt-2 text-base leading-relaxed text-ink-500">
        Puedes cambiar de plan cuando quieras.
      </p>

      <div className="mt-7">
        <SelectorDePlanes
          planes={planes}
          elegido={elegido}
          onElegir={setElegido}
          periodo={periodo}
          onPeriodo={setPeriodo}
        />
      </div>

      {plan && (
        <div className="mt-8">
          <BotonDePlan plan={plan} esElActual={false} cargando={saliendo} onClick={seguir} />
          {elegido !== 'free' && !plan.contratable && (
            <div className="mt-3">
              <Button size="lg" block variant="ghost" loading={saliendo} onClick={() => void terminar()}>
                Empezar en Gratis por ahora
              </Button>
            </div>
          )}
        </div>
      )}

      {oferta && (
        <Oferta
          plan={oferta}
          onAceptar={() => { setOferta(null); void contratar(oferta); }}
          onSeguirEnGratis={() => { setOferta(null); void terminar(); }}
        />
      )}
    </div>
  );
}

/**
 * La única oferta del alta. Enseña lo que el plan trae DE VERDAD y su precio
 * real; si no hubiera precio no se habría llegado hasta aquí.
 */
function Oferta({
  plan, onAceptar, onSeguirEnGratis,
}: {
  plan: Plan;
  onAceptar: () => void;
  onSeguirEnGratis: () => void;
}) {
  const mensual = importe(plan.priceMonthly, plan.currency);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        aria-label="Cerrar"
        onClick={onSeguirEnGratis}
        className="absolute inset-0 animate-fade-in bg-black/60 backdrop-blur-sm"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-oferta"
        className="cristal relative w-full max-w-[420px] animate-sheet-in rounded-t-4xl px-5 pb-7 pt-6 sm:rounded-4xl sm:pb-5"
      >
        <span aria-hidden className="absolute left-1/2 top-2.5 h-1 w-10 -translate-x-1/2 rounded-full bg-white/25 sm:hidden" />

        <p className="rotulo">Antes de empezar</p>
        <h2 id="titulo-oferta" className="cifra mt-1.5 text-2xl">
          {plan.trialDays} días de {plan.name}
        </h2>
        <p className="mt-3 text-md leading-relaxed text-ink-600">
          Gratis. Si no te convence, lo cancelas antes de que terminen y no se cobra nada.
          {mensual ? ` Después, ${mensual} al mes.` : ''}
        </p>

        <div className="mt-5 divide-y divide-line">
          <p className="py-2.5 text-base font-semibold text-ink-900">{LIMITE[plan.tier]}</p>
          {todoLoQueTrae(plan.tier)
            .filter((t) => !todoLoQueTrae('free').includes(t))
            .map((t) => (
              <p key={t} className="py-2.5 text-base text-ink-600">{t}</p>
            ))}
        </div>

        <div className="mt-6 space-y-2">
          <Button size="lg" block onClick={onAceptar}>
            Probar {plan.trialDays} días
          </Button>
          <Button size="lg" block variant="ghost" onClick={onSeguirEnGratis}>
            Seguir con Gratis
          </Button>
        </div>

        <p className="mt-4 text-center text-sm text-ink-500">
          Pide tarjeta. Se cobra al terminar si no cancelas.
        </p>
      </div>
    </div>
  );
}
