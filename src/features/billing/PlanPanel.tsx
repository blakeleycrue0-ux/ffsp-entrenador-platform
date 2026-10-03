/**
 * El plan del club, resumido en Ajustes.
 * ---------------------------------------------------------------------------
 * Aquí sólo va lo que se mira de pasada: en qué plan está, cuántos equipos
 * lleva y si hay algo que atender. Todo lo demás —cambiar de plan, la tarjeta,
 * las facturas, cancelar— vive en «Plan y facturación», que es una pantalla
 * entera. Repetirlo en los dos sitios acabaría con las dos versiones
 * diciéndose cosas distintas.
 */

import { LinkButton, Panel, PanelHeader, Tag } from '@/components/ui';
import { useClub } from '@/store/store';
import { permisos } from '@/store/selectors';
import { diasDePrueba, NIVELES, type Plan } from '@/services/billing';
import { cn } from '@/lib/utils';

export function PlanPanel({ plano = false }: { plano?: boolean } = {}) {
  const { data } = useClub();
  const per = permisos(data);
  const sub = data.subscription;
  const prueba = diasDePrueba(sub);
  const planes = NIVELES.map((n) => data.plans.find((p) => p.tier === n)).filter((p): p is Plan => Boolean(p));
  const actual = planes.find((p) => p.tier === per.nivel);

  if (!data.club) return null;

  const cuerpo = (
    <>
      {plano ? (
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg text-ink-900">Plan</h3>
          <Tag tone={per.nivel === 'free' ? undefined : 'solid'}>{actual?.name ?? 'Gratis'}</Tag>
        </div>
      ) : (
        <PanelHeader
          title="Plan"
          actions={<Tag tone={per.nivel === 'free' ? undefined : 'solid'}>{actual?.name ?? 'Gratis'}</Tag>}
        />
      )}

      <div className={plano ? 'mt-4 space-y-4' : 'space-y-4 p-5'}>
        {/* El dato es cuántos equipos lleva. Va como cifra, no como frase. */}
        <div className="flex items-end gap-3">
          <span className="cifra text-4xl">{per.equipos}</span>
          <span className="pb-1 text-base text-ink-500">
            {per.equipos === 1 ? 'equipo' : 'equipos'}
            {per.limiteDeEquipos === null ? ' · sin límite' : ` de ${per.limiteDeEquipos}`}
          </span>
        </div>

        {prueba !== null && (
          <Aviso tono="warn">
            Te {prueba === 1 ? 'queda' : 'quedan'} <strong className="font-semibold">{prueba} {prueba === 1 ? 'día' : 'días'}</strong> de
            prueba. Al terminar se cobra, salvo que canceles antes.
          </Aviso>
        )}
        {sub?.status === 'past_due' && (
          <Aviso tono="bad">El último cobro no ha salido bien. Actualiza la tarjeta.</Aviso>
        )}
        {sub && sub.tier !== per.nivel && sub.status !== 'none' && (
          <Aviso>
            Tu suscripción a {planes.find((p) => p.tier === sub.tier)?.name ?? sub.tier} no está activa
            ahora mismo; mientras tanto se aplican los límites de Gratis.
          </Aviso>
        )}
        {sub?.cancelAtPeriodEnd && sub.currentPeriodEnd && (
          <Aviso>
            Renovación cancelada. Sigues igual hasta el{' '}
            {new Date(sub.currentPeriodEnd).toLocaleDateString('es-ES')}.
          </Aviso>
        )}

        <LinkButton to="/app/ajustes/plan" variant="secondary">
          Plan y facturación
        </LinkButton>
      </div>
    </>
  );

  return plano ? <section>{cuerpo}</section> : <Panel>{cuerpo}</Panel>;
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
