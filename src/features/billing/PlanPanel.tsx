/**
 * El plan del club: qué tiene, qué le falta y cómo cambiarlo.
 * ---------------------------------------------------------------------------
 * Tres reglas que no se negocian:
 *
 *  · Si no hay precio decidido, NO se enseña ninguna cifra ni se deja pagar.
 *    Un «desde 9,99 €» inventado en una pantalla de cobro es una mentira con
 *    consecuencias legales.
 *  · La prueba pide tarjeta y se cobra sola al terminar. Eso se dice antes de
 *    empezarla, con todas las letras y sin letra pequeña.
 *  · Cancelar se hace en dos clics desde el portal de Stripe, no escribiendo
 *    un correo y esperando.
 */

import { useState } from 'react';
import { Check, ExternalLink, Minus } from 'lucide-react';
import { Button, Panel, PanelHeader, Segmented, Tag } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { useClub } from '@/store/store';
import { isClubAdmin, limiteDeEquipos, planActual } from '@/store/selectors';
import { billing, diasDePrueba, importe, type Plan } from '@/services/billing';
import { humanError } from '@/services/supabase';
import { cn } from '@/lib/utils';

const INCLUYE_PRO = [
  'Equipos sin límite',
  'Plantilla, calendario, entrenamientos y partidos',
  'Pizarra táctica animada y biblioteca de ejercicios',
  'Todo el cuerpo técnico que haga falta',
];

export function PlanPanel() {
  const toast = useToast();
  const { data } = useClub();
  const [periodo, setPeriodo] = useState<'mensual' | 'anual'>('mensual');
  const [yendo, setYendo] = useState<'pago' | 'portal' | null>(null);

  const club = data.club;
  const tier = planActual(data);
  const limite = limiteDeEquipos(data);
  const sub = data.subscription;
  const pro = data.plans.find((p) => p.tier === 'pro');
  const prueba = diasDePrueba(sub);
  const admin = isClubAdmin(data);
  /* Un club puede estar en Gratis y tener cuenta en Stripe a la vez: es lo que
     pasa con un impago o con una prueba caducada. Ahí el portal tiene que
     seguir a la vista — es donde se arregla la tarjeta — y no se le puede
     ofrecer una prueba que Stripe no le va a conceder dos veces. */
  const tieneCuentaDePago = Boolean(sub && sub.status !== 'none');

  if (!club) return null;

  const ir = async (a: 'pago' | 'portal') => {
    setYendo(a);
    try {
      const url =
        a === 'pago'
          ? await billing.irAPagar(club.id, periodo)
          : await billing.irAlPortal(club.id);
      window.location.href = url;
    } catch (e) {
      toast.error('No hemos podido abrir la pasarela de pago', humanError(e));
      setYendo(null);
    }
  };

  return (
    <Panel>
      <PanelHeader
        title="Plan"
        description="Lo que puede hacer tu club y cómo cambiarlo."
        actions={<Tag tone={tier === 'pro' ? 'ok' : undefined}>{tier === 'pro' ? 'Pro' : 'Gratis'}</Tag>}
      />

      <div className="space-y-4 p-4">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-base text-navy-800">
          <span className="font-medium">
            {data.teams.length} {data.teams.length === 1 ? 'equipo' : 'equipos'}
          </span>
          <span className="text-muted">
            {limite === null ? 'de los que quieras' : `de ${limite} que permite tu plan`}
          </span>
        </div>

        {prueba !== null && (
          <p className="rounded-md border border-warn/30 bg-warn/5 px-3 py-2.5 text-base leading-relaxed text-navy-800">
            Te {prueba === 1 ? 'queda' : 'quedan'} <strong>{prueba} {prueba === 1 ? 'día' : 'días'}</strong> de
            prueba. Al terminar se cobrará el plan Pro automáticamente, salvo que lo canceles antes
            desde «Gestionar el pago».
          </p>
        )}

        {sub?.cancelAtPeriodEnd && sub.currentPeriodEnd && (
          <p className="rounded-md border border-line bg-surface px-3 py-2.5 text-base leading-relaxed text-navy-800">
            Has cancelado la renovación. Seguirás en Pro hasta el{' '}
            {new Date(sub.currentPeriodEnd).toLocaleDateString('es-ES')} y después volverás a Gratis.
            No se borra nada: los equipos de más se conservan, sólo no podrás crear otros.
          </p>
        )}

        {sub?.status === 'past_due' && (
          <p className="rounded-md border border-bad/30 bg-bad/5 px-3 py-2.5 text-base leading-relaxed text-navy-800">
            El último cobro no ha salido bien y el club está en Gratis mientras tanto. Actualiza la
            tarjeta desde «Gestionar el pago».
          </p>
        )}

        {tier === 'free' && (
          <TarjetaPro
            plan={pro}
            periodo={periodo}
            onPeriodo={setPeriodo}
            admin={admin}
            yaFueCliente={tieneCuentaDePago}
            yendo={yendo === 'pago'}
            onPagar={() => void ir('pago')}
          />
        )}

        {(tier === 'pro' || tieneCuentaDePago) && (
          <Button
            variant="secondary"
            loading={yendo === 'portal'}
            disabled={!admin}
            onClick={() => void ir('portal')}
            icon={<ExternalLink size={15} />}
          >
            Gestionar el pago
          </Button>
        )}

        {!admin && (
          <p className="text-sm leading-relaxed text-muted">
            Sólo quien administra el club puede cambiar el plan.
          </p>
        )}
      </div>
    </Panel>
  );
}

function TarjetaPro({
  plan, periodo, onPeriodo, admin, yaFueCliente, yendo, onPagar,
}: {
  plan: Plan | undefined;
  periodo: 'mensual' | 'anual';
  onPeriodo: (p: 'mensual' | 'anual') => void;
  admin: boolean;
  /** Ya tuvo suscripción: Stripe no da una segunda prueba, así que no se anuncia. */
  yaFueCliente: boolean;
  yendo: boolean;
  onPagar: () => void;
}) {
  const mensual = plan ? importe(plan.priceMonthly, plan.currency) : null;
  const anual = plan ? importe(plan.priceYearly, plan.currency) : null;
  const precio = periodo === 'anual' ? anual : mensual;
  // Sin precio en la base de datos y sin precio en Stripe, no se puede contratar.
  const sePuede = Boolean(plan?.contratable && precio);
  // La prueba es para quien no ha sido cliente nunca. Al resto se le cobra ya.
  const conPrueba = Boolean(plan?.trialDays) && !yaFueCliente;

  return (
    <div className="rounded-lg border border-line p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-bold tracking-[-0.01em] text-navy-900">Pro</h3>
          <p className="mt-0.5 text-base text-muted">Para clubes con más de un equipo.</p>
        </div>
        {(mensual || anual) && (
          <Segmented<'mensual' | 'anual'>
            size="sm"
            value={periodo}
            onChange={onPeriodo}
            options={[
              { id: 'mensual', label: 'Mensual' },
              { id: 'anual', label: 'Anual' },
            ]}
          />
        )}
      </div>

      <p className="mt-3 font-display text-2xl font-bold text-navy-900">
        {precio ? (
          <>
            {precio}{' '}
            {/* El espacio va en el texto, no en el margen: así también lo lee
                un lector de pantalla y sale bien al copiar y pegar. */}
            <span className="text-base font-normal text-muted">
              {periodo === 'anual' ? 'al año' : 'al mes'}
            </span>
          </>
        ) : (
          <span className="text-lg font-semibold text-muted">Precio por decidir</span>
        )}
      </p>

      <ul className="mt-4 space-y-2">
        {INCLUYE_PRO.map((t) => (
          <li key={t} className="flex items-start gap-2.5 text-base text-navy-800">
            <Check size={15} strokeWidth={2.6} className="mt-1 shrink-0 text-pitch-600" />
            {t}
          </li>
        ))}
        <li className="flex items-start gap-2.5 text-base text-muted">
          <Minus size={15} className="mt-1 shrink-0 text-navy-300" />
          No envía mensajes ni correos a las familias.
        </li>
      </ul>

      <div className="mt-4">
        <Button disabled={!sePuede || !admin} loading={yendo} onClick={onPagar}>
          {conPrueba ? `Probar ${plan?.trialDays} días` : 'Contratar Pro'}
        </Button>
      </div>

      {sePuede && conPrueba ? (
        <p className={cn('mt-3 text-sm leading-relaxed text-muted')}>
          La prueba de {plan?.trialDays} días <strong>pide tarjeta</strong> y, si no la cancelas
          antes de que termine, se cobra el plan automáticamente. Puedes cancelarla en cualquier
          momento desde «Gestionar el pago», sin dar explicaciones y sin perder tus datos.
        </p>
      ) : sePuede ? (
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Ya has tenido una suscripción antes, así que la prueba gratuita no vuelve a aplicarse: se
          cobra desde el primer día. Puedes cancelar cuando quieras.
        </p>
      ) : (
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Todavía no hay precio decidido, así que no se puede contratar. Preferimos dejarlo en
          blanco a enseñarte una cifra que no es.
        </p>
      )}
    </div>
  );
}
