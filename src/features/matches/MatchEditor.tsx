import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { useClub } from '@/store/store';
import { visibleTeams } from '@/store/selectors';
import { Button, Card, Field, Input, PageHeader, Select, Textarea } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { CLUB_NAME, cn, toISODate, today } from '@/lib/utils';
import { humanError } from '@/services/supabase';
import type { Match } from '@/types';

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
  const { matchId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { data, teamId, actions } = useClub();
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
      toast.success(existing ? 'Partido actualizado ✓' : 'Partido creado ✓', 'Ya aparece en el calendario del equipo.');
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
        className="mb-4 inline-flex items-center gap-1.5 text-[13.5px] font-medium text-ink-500 transition-colors hover:text-brand-800"
      >
        <ArrowLeft size={15} /> Partidos
      </Link>

      <PageHeader
        title={existing ? 'Editar partido' : 'Nuevo partido'}
        description="Con el partido creado podrás preparar la convocatoria y avisar a las familias en dos pasos."
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

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <Card className="p-5 sm:p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Equipo">
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
            <Field label="Rival">
              <Input value={form.opponent} onChange={(e) => patch({ opponent: e.target.value })} placeholder="Ej.: Atlético Palma" />
            </Field>
            <Field label="Competición" className="sm:col-span-2">
              <Input value={form.competition} onChange={(e) => patch({ competition: e.target.value })} />
            </Field>
            <Field label="Jornada">
              <Input
                type="number"
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
            <Field label="Fecha">
              <Input type="date" value={form.date} onChange={(e) => patch({ date: e.target.value })} />
            </Field>
            <Field label="Hora">
              <Input type="time" value={form.start} onChange={(e) => patch({ start: e.target.value })} />
            </Field>
            <Field label="Campo" className="sm:col-span-2">
              <Input value={form.venue} onChange={(e) => patch({ venue: e.target.value })} />
            </Field>

            <Field label="Condición" className="sm:col-span-2">
              <div className="flex gap-2">
                {[
                  { v: true, label: 'Jugamos en casa' },
                  { v: false, label: 'Desplazamiento' },
                ].map((o) => (
                  <button
                    key={String(o.v)}
                    onClick={() => patch({ home: o.v })}
                    className={cn(
                      'flex-1 rounded-xl border px-4 py-2.5 text-[14px] font-medium transition-all',
                      form.home === o.v
                        ? 'border-brand-400 bg-brand-50 text-brand-800 ring-2 ring-brand-100'
                        : 'border-ink-200 text-ink-600 hover:border-brand-200',
                    )}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
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
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <h2 className="text-[14.5px] font-semibold">Vista previa</h2>
            <div className="mt-4 rounded-xl border border-ink-200 p-4">
              <p className="text-[12px] font-medium text-brand-700">
                {teams.find((t) => t.id === form.teamId)?.name}
              </p>
              <div className="mt-2.5 flex items-center gap-3">
                <span className="flex-1 text-right text-[14px] font-semibold text-ink-900">
                  {form.home ? CLUB_NAME : form.opponent || 'Rival'}
                </span>
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-50 text-[10.5px] font-semibold text-brand-700">
                  vs
                </span>
                <span className="flex-1 text-[14px] font-semibold text-ink-900">
                  {form.home ? form.opponent || 'Rival' : CLUB_NAME}
                </span>
              </div>
              <p className="mt-3 text-center text-[12.5px] text-ink-500">
                {form.date} · {form.start}
              </p>
              <p className="mt-0.5 text-center text-[12px] text-ink-400">{form.venue}</p>
            </div>
          </Card>

          <Card className="bg-brand-50/40 p-5">
            <p className="text-[12.5px] leading-relaxed text-ink-600">
              Al guardar, el partido aparecerá en el calendario y en el panel de todos tus equipos. Desde su ficha
              podrás crear la convocatoria y enviarla por WhatsApp.
            </p>
          </Card>
        </div>
      </div>
    </>
  );
}
