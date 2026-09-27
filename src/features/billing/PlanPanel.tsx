/**
 * El plan del club.
 * ---------------------------------------------------------------------------
 * Lo único que cambia entre planes es cuántos equipos caben. Todo lo demás
 * está en los tres, así que se dice UNA vez debajo en lugar de repetir las
 * mismas cuatro líneas tres veces: repetirlas obliga a leerlas tres veces
 * para descubrir que son idénticas.
 *
 * Y no se inventa ningún precio. Los importes salen de la base de datos;
 * mientras no haya uno decidido se dice que falta y no se puede contratar.
 */

import { useState } from 'react';
import { Button, Panel, PanelHeader, Segmented, Tag } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { useClub } from '@/store/store';
import { isClubAdmin, limiteDeEquipos, planActual } from '@/store/selectors';
import { billing, diasDePrueba, importe, NIVELES, type Plan, type PlanTier } from '@/services/billing';
import { humanError } from '@/services/supabase';
import { cn } from '@/lib/utils';

const LIMITE: Record<PlanTier, string> = {
  free: '1 equipo',
  pro: '5 equipos',
  max: 'Equipos sin límite',
};

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
  /* Un club puede estar en Gratis y tener cuenta en Stripe a la vez: pasa con
     un impago o con una prueba caducada. Ahí el portal tiene que seguir a la
     vista, que es donde se arregla la tarjeta. */
  const tieneCuentaDePago = Boolean(sub && sub.status !== 'none');

  const planes = NIVELES.map((n) => data.plans.find((p) => p.tier === n)).filter((p): p is Plan => Boolean(p));
  const hayPrecios = planes.some((p) => p.priceMonthly !== null || p.priceYearly !== null);

  if (!club) return null;

  const ir = async (a: PlanTier | 'portal') => {
    setYendo(a);
    try {
      const url = a === 'portal' ? await billing.irAlPortal(club.id) : await billing.irAPagar(club.id, a, periodo);
      window.location.href = url;
    } catch (e) {
      toast.error('No hemos podido abrir la pasarela', humanError(e));
      setYendo(null);
    }
  };

  const actual = planes.find((p) => p.tier === tier);

  return (
    <Panel className="lg:col-span-2">
      <PanelHeader
        title="Plan"
        actions={<Tag tone={tier === 'free' ? undefined : 'solid'}>{actual?.name ?? 'Gratis'}</Tag>}
      />

      <div className="space-y-5 p-5">
        {/* El dato es cuántos equipos lleva. Va como cifra, no como frase. */}
        <div className="flex items-end gap-3">
          <span className="cifra text-4xl">{data.teams.length}</span>
          <span className="pb-1 text-base text-ink-500">
            {data.teams.length === 1 ? 'equipo' : 'equipos'}
            {limite === null ? ' · sin límite' : ` de ${limite}`}
          </span>
        </div>

        {prueba !== null && (
          <Aviso tono="warn">
            Te {prueba === 1 ? 'queda' : 'quedan'} <strong className="font-semibold">{prueba} {prueba === 1 ? 'día' : 'días'}</strong> de
            prueba. Al terminar se cobra, salvo que canceles antes.
          </Aviso>
        )}
        {sub?.cancelAtPeriodEnd && sub.currentPeriodEnd && (
          <Aviso>
            Renovación cancelada. Sigues igual hasta el{' '}
            {new Date(sub.currentPeriodEnd).toLocaleDateString('es-ES')}. No se borra nada.
          </Aviso>
        )}
        {sub?.status === 'past_due' && (
          <Aviso tono="bad">El último cobro no ha salido bien. Actualiza la tarjeta.</Aviso>
        )}

        {hayPrecios && (
          <div className="flex justify-end">
            <Segmented<'mensual' | 'anual'>
              size="sm"
              value={periodo}
              onChange={setPeriodo}
              options={[{ id: 'mensual', label: 'Mensual' }, { id: 'anual', label: 'Anual' }]}
            />
          </div>
        )}

        <div className="space-y-2">
          {planes.map((p) => (
            <FilaPlan
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

        <p className="text-base leading-relaxed text-ink-500">
          <span className="font-medium text-ink-700">Los tres planes lo llevan todo.</span> Plantilla,
          asistencia, entrenamientos, partidos, pizarra táctica y todo el cuerpo técnico. Lo único que
          cambia es cuántos equipos puedes tener.
        </p>

        {!hayPrecios && (
          <p className="text-base leading-relaxed text-ink-500">
            Los planes de pago todavía no tienen precio, así que no se pueden contratar. Preferimos
            dejarlo en blanco a enseñarte una cifra que no es.
          </p>
        )}

        {(tier !== 'free' || tieneCuentaDePago) && (
          <Button variant="secondary" loading={yendo === 'portal'} disabled={!admin} onClick={() => void ir('portal')}>
            Gestionar el pago
          </Button>
        )}

        {!admin && <p className="text-sm text-ink-500">Sólo quien administra el club puede cambiar el plan.</p>}
      </div>
    </Panel>
  );
}

function Aviso({ children, tono }: { children: React.ReactNode; tono?: 'warn' | 'bad' }) {
  return (
    <p
      className={cn(
        'rounded-2xl px-4 py-3 text-base leading-relaxed',
        tono === 'bad' ? 'bg-bad/12 text-bad' : tono === 'warn' ? 'bg-warn/12 text-warn' : 'bg-raised text-ink-700',
      )}
    >
      {children}
    </p>
  );
}

function FilaPlan({
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
  const sePuede = !esGratis && Boolean(plan.contratable && precio);
  const conPrueba = Boolean(plan.trialDays) && !yaFueCliente;

  return (
    <div
      className={cn(
        'rounded-2xl px-5 py-4 transition-colors',
        esElActual ? 'bg-raised ring-2 ring-ink-900' : 'bg-panel',
      )}
      style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,.055)' }}
    >
      <div className="flex items-center gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold tracking-[-0.01em] text-ink-900">{plan.name}</span>
            {esElActual && <Tag tone="solid" size="sm">Tu plan</Tag>}
          </div>
          <p className="mt-0.5 text-base text-ink-500">{LIMITE[plan.tier]}</p>
        </div>

        <div className="shrink-0 text-right">
          {esGratis ? (
            <>
              <span className="cifra block text-2xl">0 €</span>
              <span className="mt-0.5 block text-sm text-ink-500">para siempre</span>
            </>
          ) : precio ? (
            <>
              <span className="cifra block text-2xl">{precio}</span>
              <span className="mt-0.5 block text-sm text-ink-500">{periodo === 'anual' ? 'al año' : 'al mes'}</span>
            </>
          ) : (
            <>
              <span className="cifra block text-2xl text-ink-400">—</span>
              <span className="mt-0.5 block text-sm text-ink-500">sin precio aún</span>
            </>
          )}
        </div>
      </div>

      {!esElActual && !esGratis && (
        <div className="mt-4">
          <Button size="sm" variant={sePuede ? 'primary' : 'secondary'} disabled={!sePuede || !admin} loading={yendo} onClick={onContratar}>
            {conPrueba ? `Probar ${plan.trialDays} días` : `Cambiar a ${plan.name}`}
          </Button>
          {sePuede && conPrueba && (
            <p className="mt-2 text-sm text-ink-500">Pide tarjeta. Se cobra al terminar si no cancelas.</p>
          )}
        </div>
      )}
    </div>
  );
}
