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
 *
 * Los tres niveles se pintan a partir de lo que diga la base de datos, no de
 * una lista escrita aquí: si mañana el Pro pasa de cinco a seis equipos, es
 * una fila, no un despliegue.
 */

import { useState } from 'react';
import { Check, ExternalLink } from 'lucide-react';
import { Button, Panel, PanelHeader, Segmented, Tag } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { useClub } from '@/store/store';
import { isClubAdmin, limiteDeEquipos, planActual } from '@/store/selectors';
import { billing, diasDePrueba, importe, NIVELES, type Plan, type PlanTier } from '@/services/billing';
import { humanError } from '@/services/supabase';

/** Qué diferencia a cada plan del anterior. Lo que no es cierto, no se pone. */
const ARGUMENTO: Record<PlanTier, string> = {
  free: 'Para empezar con un equipo.',
  pro: 'Para un club con varias categorías.',
  max: 'Para clubes con toda la cantera dentro.',
};

const equiposQuePermite = (p: Plan) =>
  p.maxTeams === null
    ? 'Equipos sin límite'
    : p.maxTeams === 1
      ? 'Un equipo'
      : `Hasta ${p.maxTeams} equipos`;

const INCLUIDO_SIEMPRE = [
  'Plantilla, calendario, entrenamientos y partidos',
  'Pizarra táctica animada y biblioteca de ejercicios',
  'Todo el cuerpo técnico que haga falta',
];

export function PlanPanel() {
  const toast = useToast();
  const { data } = useClub();
  const [periodo, setPeriodo] = useState<'mensual' | 'anual'>('mensual');
  const [yendo, setYendo] = useState<PlanTier | 'portal' | null>(null);

  const club = data.club;
  const tier = planActual(data);
  const limite = limiteDeEquipos(data);
  const sub = data.subscription;
  const prueba = diasDePrueba(sub);
  const admin = isClubAdmin(data);
  /* Un club puede estar en Gratis y tener cuenta en Stripe a la vez: es lo que
     pasa con un impago o con una prueba caducada. Ahí el portal tiene que
     seguir a la vista — es donde se arregla la tarjeta — y no se le puede
     ofrecer una prueba que Stripe no le va a conceder dos veces. */
  const tieneCuentaDePago = Boolean(sub && sub.status !== 'none');

  // Ordenados de menor a mayor, se enseñen los que se enseñen.
  const planes = NIVELES.map((n) => data.plans.find((p) => p.tier === n)).filter(
    (p): p is Plan => Boolean(p),
  );
  const hayAlgunPrecio = planes.some((p) => p.priceMonthly !== null || p.priceYearly !== null);

  if (!club) return null;

  const ir = async (a: PlanTier | 'portal') => {
    setYendo(a);
    try {
      const url =
        a === 'portal'
          ? await billing.irAlPortal(club.id)
          : await billing.irAPagar(club.id, a, periodo);
      window.location.href = url;
    } catch (e) {
      toast.error('No hemos podido abrir la pasarela de pago', humanError(e));
      setYendo(null);
    }
  };

  const actual = planes.find((p) => p.tier === tier);

  return (
    <Panel className="lg:col-span-2">
      <PanelHeader
        title="Plan"
        description="Lo que puede hacer tu club y cómo cambiarlo."
        actions={
          <Tag tone={tier === 'free' ? undefined : 'ok'}>{actual?.name ?? 'Gratis'}</Tag>
        }
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
            prueba. Al terminar se cobrará automáticamente, salvo que lo canceles antes desde
            «Gestionar el pago».
          </p>
        )}

        {sub?.cancelAtPeriodEnd && sub.currentPeriodEnd && (
          <p className="rounded-md border border-line bg-surface px-3 py-2.5 text-base leading-relaxed text-navy-800">
            Has cancelado la renovación. Seguirás como estás hasta el{' '}
            {new Date(sub.currentPeriodEnd).toLocaleDateString('es-ES')} y después volverás a
            Gratis. No se borra nada: los equipos de más se conservan, sólo no podrás crear otros.
          </p>
        )}

        {sub?.status === 'past_due' && (
          <p className="rounded-md border border-bad/30 bg-bad/5 px-3 py-2.5 text-base leading-relaxed text-navy-800">
            El último cobro no ha salido bien y el club está en Gratis mientras tanto. Actualiza la
            tarjeta desde «Gestionar el pago».
          </p>
        )}

        {hayAlgunPrecio && (
          <div className="flex justify-end">
            <Segmented<'mensual' | 'anual'>
              size="sm"
              value={periodo}
              onChange={setPeriodo}
              options={[
                { id: 'mensual', label: 'Mensual' },
                { id: 'anual', label: 'Anual' },
              ]}
            />
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-3">
          {planes.map((p) => (
            <TarjetaDePlan
              key={p.tier}
              plan={p}
              periodo={periodo}
              esElActual={p.tier === tier}
              admin={admin}
              yaFueCliente={tieneCuentaDePago}
              yendo={yendo === p.tier}
              onContratar={() => void ir(p.tier)}
            />
          ))}
        </div>

        {!hayAlgunPrecio && (
          <p className="text-sm leading-relaxed text-muted">
            Todavía no hay precios decididos, así que no se puede contratar ningún plan de pago.
            Preferimos dejarlo en blanco a enseñarte una cifra que no es.
          </p>
        )}

        {(tier !== 'free' || tieneCuentaDePago) && (
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

function TarjetaDePlan({
  plan, periodo, esElActual, admin, yaFueCliente, yendo, onContratar,
}: {
  plan: Plan;
  periodo: 'mensual' | 'anual';
  esElActual: boolean;
  admin: boolean;
  /** Ya tuvo suscripción: Stripe no da una segunda prueba, así que no se anuncia. */
  yaFueCliente: boolean;
  yendo: boolean;
  onContratar: () => void;
}) {
  const esGratis = plan.tier === 'free';
  const precio = importe(periodo === 'anual' ? plan.priceYearly : plan.priceMonthly, plan.currency);
  // Sin precio en la base de datos y sin precio en Stripe, no se puede contratar.
  const sePuede = !esGratis && Boolean(plan.contratable && precio);
  const conPrueba = Boolean(plan.trialDays) && !yaFueCliente;

  return (
    <div
      className={
        esElActual
          ? 'rounded-lg border-2 border-pitch-600 bg-pitch-50/40 p-4'
          : 'rounded-lg border border-line p-4'
      }
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-display text-lg font-bold tracking-[-0.01em] text-navy-900">
          {plan.name}
        </h3>
        {esElActual && <Tag tone="ok" size="sm">Tu plan</Tag>}
      </div>
      <p className="mt-0.5 text-sm leading-relaxed text-muted">{ARGUMENTO[plan.tier]}</p>

      <p className="mt-3 font-display text-2xl font-bold text-navy-900">
        {esGratis ? (
          <>
            0 €<span className="ml-1 text-base font-normal text-muted">siempre</span>
          </>
        ) : precio ? (
          <>
            {precio}{' '}
            {/* El espacio va en el texto, no en el margen: así también lo lee
                un lector de pantalla y sale bien al copiar y pegar. */}
            <span className="text-base font-normal text-muted">
              {periodo === 'anual' ? 'al año' : 'al mes'}
            </span>
          </>
        ) : (
          <span className="text-base font-semibold text-muted">Precio por decidir</span>
        )}
      </p>

      <ul className="mt-3 space-y-1.5">
        <li className="flex items-start gap-2 text-base font-medium text-navy-900">
          <Check size={15} strokeWidth={2.6} className="mt-1 shrink-0 text-pitch-600" />
          {equiposQuePermite(plan)}
        </li>
        {INCLUIDO_SIEMPRE.map((t) => (
          <li key={t} className="flex items-start gap-2 text-sm leading-relaxed text-navy-700">
            <Check size={14} strokeWidth={2.4} className="mt-1 shrink-0 text-navy-300" />
            {t}
          </li>
        ))}
      </ul>

      {!esElActual && !esGratis && (
        <div className="mt-4">
          <Button
            size="sm"
            variant={sePuede ? 'primary' : 'secondary'}
            disabled={!sePuede || !admin}
            loading={yendo}
            onClick={onContratar}
          >
            {conPrueba ? `Probar ${plan.trialDays} días` : `Contratar ${plan.name}`}
          </Button>
          {sePuede && conPrueba && (
            <p className="mt-2 text-xs leading-relaxed text-muted">
              Pide tarjeta. Si no cancelas antes de {plan.trialDays} días, se cobra solo.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
