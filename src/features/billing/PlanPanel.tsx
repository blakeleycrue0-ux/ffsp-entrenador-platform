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
import { diasDePrueba, NIVELES, planContratado, pruebaCaducada, type Plan } from '@/services/billing';
import { cn } from '@/lib/utils';

export function PlanPanel({ plano = false }: { plano?: boolean } = {}) {
  const { data } = useClub();
  const per = permisos(data);
  const sub = data.subscription;
  const prueba = diasDePrueba(sub);
  const planes = NIVELES.map((n) => data.plans.find((p) => p.tier === n)).filter((p): p is Plan => Boolean(p));
  const actual = planes.find((p) => p.tier === per.nivel);

  /* Los dos del servicio, no una copia: esto se enseña aquí y en la pantalla
     de facturación, y la primera versión sólo lo tenía en una. */
  const caducada = pruebaCaducada(sub);
  const contratado = planContratado(sub, planes);

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
        {/* ── LO QUE SE ACABÓ, DICHO ──────────────────────────────────────
            Un club empezó una prueba, se le acabó siete días después y aquí
            no aparecía NADA. Dos motivos a la vez: el webhook escribía
            `tier: 'free'` al cancelar —así que la fila olvidaba de qué plan
            era la prueba— y, con el nivel contratado igual al efectivo,
            este aviso no se disparaba. Arreglado lo primero, esto ya puede
            decir qué terminó; y aun sin saberlo, si hay fecha de fin de
            prueba pasada, se dice que la hubo y cuándo acabó. */}
        {caducada && (
          <Aviso>
            {contratado
              ? <>Tu prueba de <strong className="font-semibold">{contratado}</strong> terminó el {fecha(caducada.fin)}.</>
              : <>Tu prueba terminó el {fecha(caducada.fin)}.</>}
            {' '}El club está en Gratis. Lo que había guardado sigue ahí.
          </Aviso>
        )}
        {!caducada && sub && sub.tier !== per.nivel && sub.status !== 'none' && (
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

const fecha = (iso: string) =>
  new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });

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
