import { Info, Sparkles } from 'lucide-react';
import { AssistantPanel } from './AssistantPanel';
import { useClub } from '@/store/store';
import { teamById, visibleTeams } from '@/store/selectors';
import { Card, PageHeader, Select } from '@/components/ui';

export default function AssistantPage() {
  const { data, teamId, setTeamId } = useClub();
  const teams = visibleTeams(data);
  const team = teamById(data, teamId);
  const integration = data.integrations.find((i) => i.id === 'ia');

  return (
    <>
      <PageHeader
        eyebrow={
          <span className="flex items-center gap-2">
            <span className="grid h-6 w-6 place-items-center rounded-lg bg-brand-700">
              <Sparkles size={13} className="text-white" />
            </span>
            FFSP Assistant
          </span>
        }
        title="Asistente de la entrenadora"
        description={`Conoce a tu ${team?.name ?? 'equipo'}: asistencias, lesiones, posiciones, calendario y convocatorias.`}
        actions={
          <Select value={teamId} onChange={(e) => setTeamId(e.target.value)} className="w-auto min-w-[180px]">
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                Contexto: {t.name}
              </option>
            ))}
          </Select>
        }
      />

      <Card className="flex flex-col overflow-hidden">
        <AssistantPanel variant="page" />
      </Card>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <h3 className="text-[14.5px] font-semibold">Cómo funciona</h3>
          <ol className="mt-3 space-y-2.5">
            {[
              'Tú preguntas en lenguaje natural, como se lo dirías a tu segunda entrenadora.',
              'El asistente consulta los datos reales del club: asistencias registradas, partes médicos, posiciones y calendario.',
              'Responde con una tarjeta accionable: una sesión completa, una tabla, un borrador de convocatoria o un mensaje.',
              'Tú decides. Guardar, editar o descartar. Nada sale del club sin tu confirmación explícita.',
            ].map((t, i) => (
              <li key={i} className="flex gap-3">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-brand-50 text-[11px] font-bold text-brand-700">
                  {i + 1}
                </span>
                <span className="text-[13.5px] leading-relaxed text-ink-600">{t}</span>
              </li>
            ))}
          </ol>
        </Card>

        <Card className="p-5">
          <h3 className="flex items-center gap-2 text-[14.5px] font-semibold">
            <Info size={15} className="text-ink-400" /> Estado de la integración
          </h3>
          <p className="mt-2.5 text-[13px] leading-relaxed text-ink-500">{integration?.detail}</p>
          <div className="mt-4 rounded-xl bg-ink-50 p-3.5">
            <p className="text-[11.5px] font-medium uppercase tracking-wide text-ink-400">Arquitectura</p>
            <p className="mt-1.5 font-mono text-[11.5px] leading-relaxed text-ink-600">
              UI del asistente
              <br />↓ servicio IA
              <br />↓ contexto del club
              <br />↓ respuesta accionable
            </p>
          </div>
          <p className="mt-3 text-[12px] leading-relaxed text-ink-400">
            La capa de servicio ya está aislada: conectar un modelo real ({integration?.provider}) no requiere tocar la
            interfaz.
          </p>
        </Card>
      </div>
    </>
  );
}
