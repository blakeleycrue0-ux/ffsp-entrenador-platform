import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { useClub } from '@/store/store';
import { clubShortName, visibleTeams } from '@/store/selectors';
import { Button, Desplegable, Panel, Field, Input, PageHeader, Select, Textarea } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { cn, toISODate, today } from '@/lib/utils';
import { humanError } from '@/services/supabase';
import type { Match } from '@/types';
import { useAnchura } from '@/components/layout/AppShell';

const empty = (teamId: string, competition: string, venue: string): Match => ({
  id: '',
  teamId,
  opponent: '',
  competition,
  date: toISODate(today()),
  start: '17:30',
  venue,
  home: true,
  status: 'programado',
});

export default function MatchEditor() {
  /* El ancho lo decide la tarea, no la pantalla. */
  useAnchura('formulario');
  const { matchId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { data, teamId, actions } = useClub();
  const ownName = clubShortName(data);
  const teams = visibleTeams(data);
  const [busy, setBusy] = useState(false);
  const activeTeam = teams.find((t) => t.id === teamId) ?? teams[0];

  const existing = matchId ? data.matches.find((m) => m.id === matchId) : undefined;
  const [form, setForm] = useState<Match>(
    existing ?? empty(activeTeam?.id ?? '', activeTeam?.competition ?? '', activeTeam?.venue ?? ''),
  );

  const patch = (p: Partial<Match>) => setForm((f) => ({ ...f, ...p }));

  const save = async () => {
    if (!form.teamId) {
      toast.error('Falta el equipo', 'Selecciona el equipo que juega este partido.');
      return;
    }
    if (!form.opponent.trim()) {
      toast.error('Falta el rival', 'Indica contra quién jugáis para poder preparar la convocatoria.');
      return;
    }
    setBusy(true);
    try {
      const saved = await actions.saveMatch(form);
      await actions.log({
        kind: 'convocatoria',
        teamId: saved.teamId,
        text: existing
          ? `Has actualizado el partido contra ${saved.opponent}.`
          : `Has creado el partido contra ${saved.opponent}.`,
        link: `/app/partidos/${saved.id}`,
      });
      toast.success(existing ? 'Partido actualizado' : 'Partido creado', 'Ya aparece en el calendario del equipo.');
      navigate(`/app/partidos/${saved.id}`);
    } catch (e) {
      toast.error('No hemos podido guardar el partido', humanError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Link
        to="/app/partidos"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-ink-900"
      >
        <ArrowLeft size={15} /> Partidos
      </Link>

      <PageHeader
        title={existing ? 'Editar partido' : 'Nuevo partido'}
        actions={
          <>
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              Cancelar
            </Button>
            <Button size="sm" icon={<Save size={15} />} loading={busy} onClick={save}>
              Guardar partido
            </Button>
          </>
        }
      />

      {/* UN PARTIDO SON TRES COSAS: contra quién, cuándo y dónde se juega.
          Había nueve campos, y cuatro de ellos —competición, jornada, sistema
          previsto, notas del rival— son cosas que se saben después: la
          competición ya está guardada en el equipo, la jornada la pone el
          calendario de la federación y el sistema se decide la semana del
          partido. */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
        <Panel className="p-4 sm:p-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {teams.length > 1 && (
              <Field label="Equipo" className="sm:col-span-2">
                <Select
                  value={form.teamId}
                  onChange={(e) => {
                    const t = teams.find((x) => x.id === e.target.value);
                    patch({ teamId: e.target.value, competition: t?.competition ?? form.competition });
                  }}
                >
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </Select>
              </Field>
            )}
            <Field label="Rival" className="sm:col-span-2">
              <Input value={form.opponent} onChange={(e) => patch({ opponent: e.target.value })} placeholder="Ej.: Atlético Palma" />
            </Field>
            <Field label="Día">
              <Input type="date" value={form.date} onChange={(e) => patch({ date: e.target.value })} />
            </Field>
            <Field label="Hora">
              <Input type="time" value={form.start} onChange={(e) => patch({ start: e.target.value })} />
            </Field>

            <Field label="Dónde" className="sm:col-span-2">
              <div className="flex gap-2">
                {[
                  { v: true, label: 'Jugamos en casa' },
                  { v: false, label: 'Desplazamiento' },
                ].map((o) => (
                  <button
                    key={String(o.v)}
                    onClick={() => patch({ home: o.v })}
                    className={cn(
                      'flex-1 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all',
                      form.home === o.v
                        ? 'border-ink-400 bg-ink-50 text-ink-900 ring-2 ring-ink-100'
                        : 'border-line text-ink-600 hover:border-ink-200',
                    )}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </Field>
          </div>
        </Panel>

        <Desplegable titulo="Más opciones" pista="Competición, jornada, campo, sistema y notas del rival">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Competición" className="sm:col-span-2">
              <Input value={form.competition} onChange={(e) => patch({ competition: e.target.value })} />
            </Field>
            <Field label="Campo" className="sm:col-span-2" hint="Si lo dejas vacío, el del equipo.">
              <Input value={form.venue} onChange={(e) => patch({ venue: e.target.value })} />
            </Field>
            <Field label="Jornada">
              <Input
                type="number"
                inputMode="numeric"
                value={form.matchday ?? ''}
                onChange={(e) => patch({ matchday: e.target.value ? Number(e.target.value) : undefined })}
                placeholder="9"
              />
            </Field>
            <Field label="Sistema previsto">
              <Input
                value={form.formation ?? ''}
                onChange={(e) => patch({ formation: e.target.value })}
                placeholder="1-4-3-3"
              />
            </Field>
            <Field label="Notas del partido" className="sm:col-span-2" hint="Lo que sepas del rival, la estrategia o la logística.">
              <Textarea
                value={form.notes ?? ''}
                onChange={(e) => patch({ notes: e.target.value })}
                className="min-h-[110px]"
                placeholder="Ej.: rival que presiona alto tras saque de portería. Preparar salida en largo como plan B."
              />
            </Field>
          </div>
        </Desplegable>
        </div>

        {/* LA VISTA PREVIA SE QUEDA, el cartel explicativo no. La previa dice
            algo que no está escrito en ningún campo —quién es local y quién
            visitante, que es lo que decide el orden del marcador—; el cartel
            explicaba en cuatro líneas lo que pasa al guardar, que es lo que
            pasa siempre al guardar. */}
        <div className="space-y-4">
          <Panel className="p-5">
            <h2 className="text-base font-semibold">Cómo quedará</h2>
            <div className="mt-4 rounded-xl border border-line p-4">
              <p className="text-xs font-medium text-ink-900">
                {teams.find((t) => t.id === form.teamId)?.name}
              </p>
              <div className="mt-2.5 flex items-center gap-3">
                <span className="flex-1 text-right text-sm font-semibold text-ink-900">
                  {form.home ? ownName : form.opponent || 'Rival'}
                </span>
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-ink-50 text-2xs font-semibold text-ink-900">
                  vs
                </span>
                <span className="flex-1 text-sm font-semibold text-ink-900">
                  {form.home ? form.opponent || 'Rival' : ownName}
                </span>
              </div>
              <p className="mt-3 text-center text-xs text-muted">
                {form.date} · {form.start}
              </p>
              <p className="mt-0.5 text-center text-xs text-ink-500">{form.venue}</p>
            </div>
          </Panel>

        </div>
      </div>
    </>
  );
}
