import { useMemo } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, ClipboardList, Clock, Copy, MapPin, Package, PencilLine, Share2, Sparkles, Target, Trash2, Users,
} from 'lucide-react';
import { useClub } from '@/store/store';
import { visibleTeams } from '@/store/selectors';
import { Tag, Button, Panel, LinkButton, PageHeader } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { addMinutes, cn, longDate, minutesToLabel, relativeDay } from '@/lib/utils';
import { humanError } from '@/services/supabase';

export default function SessionDetail() {
  const { sessionId = '' } = useParams();
  const { data, actions } = useClub();
  const toast = useToast();
  const navigate = useNavigate();

  const s = data.sessions.find((x) => x.id === sessionId);
  const allowed = s && visibleTeams(data).some((t) => t.id === s.teamId);

  const timeline = useMemo(() => {
    if (!s) return [];
    let cursor = s.start;
    return s.blocks.map((b) => {
      const start = cursor;
      cursor = addMinutes(cursor, b.duration);
      return { block: b, start, end: cursor };
    });
  }, [s]);

  if (!s || !allowed) return <Navigate to="/app/planificaciones" replace />;

  const team = data.teams.find((t) => t.id === s.teamId);

  const duplicate = async () => {
    try {
      const copy = await actions.saveSession({
        ...s,
        id: '',
        title: `${s.title} (copia)`,
        status: 'borrador' as const,
      });
      await actions.log({
        kind: 'sesion',
        teamId: s.teamId,
        text: `Has duplicado «${s.title}».`,
        link: `/app/planificaciones/${copy.id}`,
      });
      toast.success('Entrenamiento duplicado', 'La copia se ha guardado como borrador.', {
        label: 'Abrir copia',
        onClick: () => navigate(`/app/planificaciones/${copy.id}`),
      });
    } catch (e) {
      toast.error('No hemos podido duplicarlo', humanError(e));
    }
  };

  const remove = async () => {
    try {
      await actions.deleteSession(s.id);
      toast.success('Entrenamiento eliminado');
      navigate('/app/planificaciones');
    } catch (e) {
      toast.error('No hemos podido eliminarlo', humanError(e));
    }
  };

  return (
    <>
      <Link
        to="/app/planificaciones"
        className="mb-4 inline-flex items-center gap-1.5 text-[13.5px] font-medium text-muted transition-colors hover:text-navy-900"
      >
        <ArrowLeft size={15} /> Planificaciones
      </Link>

      <PageHeader
        eyebrow={
          <>
            <span className="font-medium text-navy-900">{team?.name}</span>
            <span className="text-navy-300">·</span>
            <span>{longDate(s.date)}</span>
            <Tag tone={relativeDay(s.date) === 'Hoy' ? 'solid' : 'neutral'} size="sm">
              {relativeDay(s.date)}
            </Tag>
            {s.generatedByAI && (
              <Tag tone="solid" size="sm">
                <Sparkles size={11} /> Generado con IA
              </Tag>
            )}
          </>
        }
        title={s.title}
        description={s.objective}
        actions={
          <>
            <Button variant="ghost" size="sm" icon={<Copy size={15} />} onClick={duplicate}>
              Duplicar
            </Button>
            <Button
              variant="ghost"
              size="sm"
              icon={<Share2 size={15} />}
              onClick={() => toast.info('Compartir sesión', 'Se enviará al cuerpo técnico cuando la mensajería esté conectada.')}
            >
              Compartir
            </Button>
            <LinkButton to={`/app/planificaciones/${s.id}/editar`} size="sm" icon={<PencilLine size={15} />}>
              Editar
            </LinkButton>
          </>
        }
      />

      {/* Datos de la sesión */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          [<Clock key="1" size={16} />, 'Horario', `${s.start} – ${addMinutes(s.start, s.duration)}`, minutesToLabel(s.duration)],
          [<MapPin key="2" size={16} />, 'Campo', s.venue, team?.name ?? ''],
          [<Users key="3" size={16} />, 'Jugadoras', `${s.expectedPlayers}`, 'convocadas a la sesión'],
          [<Target key="4" size={16} />, 'Bloques', `${s.blocks.length}`, `${s.material.length} materiales`],
        ].map(([icon, label, value, hint], i) => (
          <Panel key={i} className="flex items-start gap-3.5 p-4">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-navy-50 text-navy-900">
              {icon as React.ReactNode}
            </span>
            <div className="min-w-0">
              <p className="text-[11.5px] uppercase tracking-wide text-navy-400">{label as string}</p>
              <p className="mt-0.5 truncate text-[15px] font-semibold text-navy-900">{value as string}</p>
              <p className="truncate text-[12px] text-navy-400">{hint as string}</p>
            </div>
          </Panel>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {/* Línea de tiempo */}
        <Panel className="overflow-hidden lg:col-span-2">
          <div className="flex items-center justify-between border-b border-navy-100 px-5 py-4">
            <div>
              <h2 className="text-[15px] font-semibold">Estructura de la sesión</h2>
              <p className="mt-0.5 text-[12.5px] text-muted">
                {minutesToLabel(s.duration)} en {s.blocks.length} bloques
              </p>
            </div>
            <span className="text-[13px] font-medium text-navy-400 tabular-nums">
              {s.start} – {addMinutes(s.start, s.duration)}
            </span>
          </div>

          <ol className="relative">
            {timeline.map(({ block, start, end }, i) => {
              const drill = data.drills.find((d) => d.id === block.drillId);
              return (
                <li key={block.id} className="relative flex gap-4 border-b border-navy-100 px-5 py-4 last:border-0">
                  {/* Guía vertical */}
                  {i < timeline.length - 1 && (
                    <span className="absolute left-[38px] top-14 h-[calc(100%-2.5rem)] w-px bg-line" />
                  )}
                  <div className="relative z-10 flex w-7 shrink-0 flex-col items-center">
                    <span className="grid h-7 w-7 place-items-center rounded-lg bg-navy-50 text-[11px] font-bold text-navy-900 tabular-nums">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h3 className="text-[14.5px] font-medium text-navy-900">{block.title}</h3>
                      <span className="text-[12.5px] text-navy-400 tabular-nums">
                        {start} – {end}
                      </span>
                    </div>

                    {block.series && <p className="mt-1 text-[12.5px] text-muted">{block.series}</p>}
                    {block.notes && <p className="mt-1 text-[12.5px] italic text-muted">{block.notes}</p>}

                    {drill && (
                      <p className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-muted">{drill.description}</p>
                    )}

                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                      {block.tags.map((t) => (
                        <Tag key={t} tone="neutral" size="sm">
                          {t}
                        </Tag>
                      ))}
                      {drill && (
                        <Link
                          to={`/app/ejercicios/${drill.id}`}
                          className="ml-1 text-[12px] font-medium text-navy-900 hover:text-navy-900"
                        >
                          Ver ejercicio →
                        </Link>
                      )}
                    </div>
                  </div>

                  <span className="shrink-0 self-start rounded-lg bg-navy-50 px-2 py-1 text-[12.5px] font-semibold text-navy-600 tabular-nums">
                    {block.duration}′
                  </span>
                </li>
              );
            })}
          </ol>

          {/* Barra proporcional */}
          <div className="border-t border-navy-100 p-5">
            <div className="flex gap-1">
              {s.blocks.map((b, i) => (
                <div
                  key={b.id}
                  title={`${b.title} · ${b.duration}′`}
                  className={cn(
                    'h-2 rounded-full transition-colors',
                    i === 0 ? 'bg-navy-200' : i === s.blocks.length - 1 ? 'bg-navy-200' : 'bg-navy-700',
                  )}
                  style={{ flex: b.duration }}
                />
              ))}
            </div>
            <p className="mt-2 text-[12px] text-navy-400">
              Calentamiento y vuelta a la calma en tono claro; parte principal en tono intenso.
            </p>
          </div>
        </Panel>

        {/* Lateral */}
        <div className="space-y-4">
          <Panel className="p-5">
            <h3 className="flex items-center gap-2 text-[14.5px] font-semibold">
              <Package size={16} className="text-navy-800" /> Material necesario
            </h3>
            <ul className="mt-3 space-y-2">
              {s.material.map((m) => (
                <li key={m} className="flex items-center gap-2.5 text-[13.5px] text-navy-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-navy-300" />
                  {m}
                </li>
              ))}
            </ul>
          </Panel>

          {s.notes && (
            <Panel className="p-5">
              <h3 className="text-[14.5px] font-semibold">Observaciones</h3>
              <p className="mt-2 text-[13.5px] leading-relaxed text-navy-600">{s.notes}</p>
            </Panel>
          )}

          <Panel className="p-5">
            <h3 className="text-[14.5px] font-semibold">Acciones rápidas</h3>
            <div className="mt-3 space-y-2">
              <LinkButton to="/app/asistencia" variant="secondary" size="sm" block icon={<ClipboardList size={15} />}>
                Pasar asistencia de esta sesión
              </LinkButton>
              <LinkButton to="/app/mensajes/nuevo" variant="secondary" size="sm" block>
                Avisar al equipo por WhatsApp
              </LinkButton>
              <Button variant="danger" size="sm" block icon={<Trash2 size={15} />} onClick={remove}>
                Eliminar entrenamiento
              </Button>
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}
