/**
 * Plan y facturación.
 * ---------------------------------------------------------------------------
 * Todo lo del dinero en una pantalla: qué plan hay, cuánto cuesta, cuándo se
 * renueva, cuánto se está usando y qué se puede hacer.
 *
 * LO QUE NO SE INVENTA:
 *  · El importe. Si la base de datos no tiene precio, no se enseña ninguno.
 *  · La tarjeta. No tenemos los cuatro últimos dígitos ni la caducidad, así
 *    que no se dibuja una tarjeta falsa: se manda al portal de Stripe, que es
 *    donde están de verdad.
 *  · Las facturas. No las guardamos; las tiene Stripe, y allí se va.
 *  · La renovación. Si no hay fecha, no se escribe una.
 *
 * LO SENSIBLE PIDE EL CÓDIGO. Abrir el portal de pago, cancelar o bajar de
 * plan pasan por la hoja de confirmación —si la cuenta tiene código puesto—.
 * No es el permiso: el permiso lo aplican el servidor y Stripe. Es el paso que
 * evita que alguien con el móvil abierto cancele la suscripción del club de un
 * toque.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, PageHeader, Panel, PanelHeader, Tag } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { useClub } from '@/store/store';
import { isClubAdmin, permisos } from '@/store/selectors';
import { billing, diasDePrueba, importe, NIVELES, type Plan, type PlanTier } from '@/services/billing';
import { humanError } from '@/services/supabase';
import { useConfirmacion } from '@/features/passcode/Confirmar';
import { BotonDePlan, LIMITE, SelectorDePlanes, useSeleccionDePlan } from './SelectorDePlanes';
import { cn } from '@/lib/utils';

export default function BillingPage() {
  const toast = useToast();
  const { data } = useClub();
  const { confirmar, hoja } = useConfirmacion();
  const [cambiando, setCambiando] = useState(false);
  const [yendo, setYendo] = useState<PlanTier | 'portal' | null>(null);

  const club = data.club;
  const sub = data.subscription;
  const per = permisos(data);
  const admin = isClubAdmin(data);
  const prueba = diasDePrueba(sub);
  const planes = NIVELES.map((n) => data.plans.find((p) => p.tier === n)).filter((p): p is Plan => Boolean(p));
  const actual = planes.find((p) => p.tier === per.nivel);
  /* Un club puede estar en Gratis y tener cuenta en Stripe a la vez: pasa con
     un impago o con una prueba caducada. Ahí el portal tiene que seguir a la
     vista, que es donde se arregla la tarjeta. */
  const tieneCuentaDePago = Boolean(sub && sub.status !== 'none');

  const seleccion = useSeleccionDePlan(per.nivel);

  if (!club) return null;

  const abrirPortal = () =>
    void confirmar({
      titulo: 'Abrir la gestión del pago',
      detalle: 'Desde ahí se cambia la tarjeta, se ven las facturas y se cancela.',
      hacer: async () => {
        setYendo('portal');
        try {
          window.location.href = await billing.irAlPortal(club.id);
        } catch (e) {
          toast.error('No hemos podido abrir el portal', humanError(e));
          setYendo(null);
        }
      },
    });

  const contratar = async (plan: Plan) => {
    setYendo(plan.tier);
    try {
      window.location.href = await billing.irAPagar(club.id, plan.tier, seleccion.periodo);
    } catch (e) {
      toast.error('No hemos podido abrir la pasarela', humanError(e));
      setYendo(null);
    }
  };

  const elegido = planes.find((p) => p.tier === seleccion.elegido);
  /* Bajar de plan es tan serio como cancelar: también pide el código. */
  const esBajada = elegido ? NIVELES.indexOf(elegido.tier) < NIVELES.indexOf(per.nivel) : false;

  return (
    <>
      <PageHeader
        title="Plan y facturación"
        description="Qué plan tiene tu club, qué estás usando y dónde se gestiona el pago."
      />

      <div className="grid gap-3 lg:grid-cols-2">
        <Panel className="lg:col-span-2">
          <PanelHeader
            title="Tu plan"
            actions={<Tag tone={per.nivel === 'free' ? undefined : 'solid'}>{actual?.name ?? 'Gratis'}</Tag>}
          />
          <div className="space-y-5 p-5">
            <div className="flex flex-wrap items-end gap-x-8 gap-y-4">
              <Dato
                cifra={
                  per.nivel === 'free'
                    ? '0 €'
                    : importe(sub?.tier === per.nivel ? actual?.priceMonthly ?? null : null, actual?.currency ?? 'eur')
                      ?? '—'
                }
                pie={per.nivel === 'free' ? 'para siempre' : 'al mes'}
              />
              <Dato
                cifra={`${per.equipos}${per.limiteDeEquipos === null ? '' : ` / ${per.limiteDeEquipos}`}`}
                pie={per.limiteDeEquipos === null ? 'equipos, sin límite' : 'equipos'}
              />
              {/* La fecha sólo se enseña cuando se sabe qué significa. En un
                  impago no se puede prometer ni renovación ni final. */}
              {sub?.currentPeriodEnd && sub.status !== 'past_due' && (
                <Dato
                  cifra={new Date(sub.currentPeriodEnd).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                  pie={sub.cancelAtPeriodEnd ? 'termina' : 'se renueva'}
                />
              )}
            </div>

            {per.limiteDeEquipos !== null && (
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className={cn(
                    'h-full rounded-full transition-[width] duration-500',
                    per.equipos >= per.limiteDeEquipos ? 'bg-warn' : 'bg-azul-600',
                  )}
                  style={{ width: `${Math.min(100, (per.equipos / per.limiteDeEquipos) * 100)}%` }}
                />
              </div>
            )}

            {prueba !== null && (
              <Aviso tono="warn">
                Te {prueba === 1 ? 'queda' : 'quedan'}{' '}
                <strong className="font-semibold">{prueba} {prueba === 1 ? 'día' : 'días'}</strong> de prueba.
                Al terminar se cobra, salvo que canceles antes.
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
            {/* Sin esta línea, alguien con un impago ve «Gratis» y «0 €» y cree
                que le han bajado el plan a propósito. Se dice por qué. */}
            {sub && sub.tier !== per.nivel && sub.status !== 'none' && (
              <Aviso>
                Tu suscripción a {planes.find((p) => p.tier === sub.tier)?.name ?? sub.tier} no está
                activa ahora mismo, así que mientras tanto se aplican los límites de Gratis. No se
                borra nada de lo que ya tienes.
              </Aviso>
            )}

            <div className="flex flex-wrap gap-2">
              <Button variant={cambiando ? 'secondary' : 'primary'} disabled={!admin} onClick={() => setCambiando((c) => !c)}>
                {cambiando ? 'Dejarlo como está' : 'Cambiar de plan'}
              </Button>
              {tieneCuentaDePago && (
                <Button variant="secondary" loading={yendo === 'portal'} disabled={!admin} onClick={abrirPortal}>
                  Gestionar el pago
                </Button>
              )}
            </div>

            {tieneCuentaDePago ? (
              <p className="text-sm leading-relaxed text-ink-500">
                La tarjeta, las facturas y la cancelación están en el portal de Stripe. No guardamos
                los datos de tu tarjeta, así que tampoco podemos enseñártelos aquí.
              </p>
            ) : (
              <p className="text-sm leading-relaxed text-ink-500">
                Todavía no hay ningún pago asociado a este club.
              </p>
            )}

            {!admin && <p className="text-sm text-ink-500">Sólo quien administra el club puede cambiar el plan.</p>}
          </div>
        </Panel>

        {cambiando && (
          <Panel className="lg:col-span-2">
            <PanelHeader title="Cambiar de plan" />
            <div className="p-5">
              <SelectorDePlanes
                planes={planes}
                elegido={seleccion.elegido}
                onElegir={seleccion.setElegido}
                periodo={seleccion.periodo}
                onPeriodo={seleccion.setPeriodo}
                nivelActual={per.nivel}
              />
              {elegido && (
                <div className="mt-7">
                  {elegido.tier === 'free' && esBajada ? (
                    <>
                      <Button
                        size="lg"
                        block
                        variant="danger"
                        disabled={!admin}
                        onClick={() =>
                          void confirmar({
                            titulo: 'Bajar a Gratis',
                            detalle: 'Se hace desde el portal de pago, donde se cancela la suscripción.',
                            hacer: async () => {
                              setYendo('portal');
                              try {
                                window.location.href = await billing.irAlPortal(club.id);
                              } catch (e) {
                                toast.error('No hemos podido abrir el portal', humanError(e));
                                setYendo(null);
                              }
                            },
                          })
                        }
                      >
                        Bajar a Gratis
                      </Button>
                      <p className="mt-2.5 text-center text-sm leading-relaxed text-ink-500">
                        Sigues con lo que tienes hasta que termine el periodo pagado. No se borra nada:
                        si te pasas del límite de equipos, se quedan todos y no podrás crear más hasta
                        estar por debajo.
                      </p>
                    </>
                  ) : (
                    <BotonDePlan
                      plan={elegido}
                      esElActual={elegido.tier === per.nivel}
                      cargando={yendo === elegido.tier}
                      onClick={() => void contratar(elegido)}
                    />
                  )}
                </div>
              )}
            </div>
          </Panel>
        )}

        <Panel className="lg:col-span-2">
          <PanelHeader title="Qué cambia entre planes" />
          <div className="divide-y divide-line px-5">
            {planes.map((p) => (
              <div key={p.tier} className="flex items-baseline justify-between gap-4 py-3.5">
                <span className={cn('text-base', p.tier === per.nivel ? 'font-semibold text-ink-900' : 'text-ink-700')}>
                  {p.name}
                </span>
                <span className="text-base text-ink-500">{LIMITE[p.tier]}</span>
              </div>
            ))}
          </div>
          <p className="px-5 pb-5 pt-3 text-sm leading-relaxed text-ink-500">
            Plantilla, asistencia, entrenamientos, partidos, pizarra táctica y cuerpo técnico están en
            los tres. <Link to="/app/ajustes" className="underline underline-offset-2">Volver a Ajustes</Link>.
          </p>
        </Panel>
      </div>

      {hoja}
    </>
  );
}

function Dato({ cifra, pie }: { cifra: string; pie: string }) {
  return (
    <div>
      <p className="cifra text-4xl">{cifra}</p>
      <p className="mt-1 text-sm text-ink-500">{pie}</p>
    </div>
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
