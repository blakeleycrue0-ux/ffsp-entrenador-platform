import { useState } from 'react';
import {
  AlertTriangle, Bell, CalendarDays, CheckCircle2, MessageSquare, RotateCcw, Shield, Sparkles,
} from 'lucide-react';
import { useClub } from '@/store/store';
import { currentStaff, visibleTeams } from '@/store/selectors';
import { ROLE_LABEL } from '@/services/auth';
import { whatsapp } from '@/services/whatsapp';
import { Badge, Button, Card, Modal, PageHeader, Tabs, Toggle } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';
import type { IntegrationId } from '@/types';

const INTEGRATION_ICON: Record<IntegrationId, typeof MessageSquare> = {
  whatsapp: MessageSquare,
  ia: Sparkles,
  calendario: CalendarDays,
};

export default function SettingsPage() {
  const { data, session, dispatch, resetDemo } = useClub();
  const toast = useToast();
  const staff = currentStaff(data, session?.staffId);
  const teams = visibleTeams(data, staff);
  const [tab, setTab] = useState('integraciones');
  const [connecting, setConnecting] = useState<IntegrationId | null>(null);
  const [reason, setReason] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const [prefs, setPrefs] = useState({
    pendientes: true,
    entrenamientos: true,
    respuestas: true,
    resumenSemanal: false,
  });

  const connect = async (id: IntegrationId) => {
    setConnecting(id);
    if (id === 'whatsapp') {
      const res = await whatsapp.connect();
      setConnecting(null);
      if (!res.ok) {
        setReason(res.reason ?? 'No se ha podido completar la conexión.');
        return;
      }
      dispatch({ type: 'integration/toggle', id, connected: true });
      return;
    }
    await new Promise((r) => setTimeout(r, 600));
    setConnecting(null);
    setReason(
      id === 'ia'
        ? 'Para conectar un modelo real hace falta una clave de API del proveedor elegido en la configuración del servidor. Hasta entonces el asistente funciona con el motor local de demostración, que consulta los datos reales del club.'
        : 'La sincronización bidireccional con Google Calendar o Apple Calendar requiere autorizar la cuenta del club. Mientras tanto puedes exportar la agenda en formato .ics desde el calendario.',
    );
  };

  return (
    <>
      <PageHeader
        title="Configuración"
        description="Integraciones, notificaciones, permisos y datos de la plataforma."
      />

      <Tabs
        className="mb-6"
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'integraciones', label: 'Integraciones' },
          { id: 'notificaciones', label: 'Notificaciones' },
          { id: 'permisos', label: 'Permisos' },
          { id: 'datos', label: 'Datos' },
        ]}
      />

      {tab === 'integraciones' && (
        <div className="space-y-4">
          {data.integrations.map((i) => {
            const Icon = INTEGRATION_ICON[i.id];
            return (
              <Card key={i.id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <span
                      className={cn(
                        'grid h-11 w-11 shrink-0 place-items-center rounded-xl',
                        i.connected ? 'bg-pitch/10 text-pitch' : 'bg-ink-100 text-ink-500',
                      )}
                    >
                      <Icon size={20} />
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-[15.5px] font-semibold">{i.name}</h3>
                        <Badge tone={i.connected ? 'success' : 'warning'} size="sm" dot>
                          {i.connected ? 'Conectado' : 'Sin conectar'}
                        </Badge>
                      </div>
                      <p className="mt-1 text-[13px] text-ink-500">{i.provider}</p>
                      <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-ink-500">{i.detail}</p>
                    </div>
                  </div>

                  <Button
                    variant={i.connected ? 'outline' : 'primary'}
                    size="sm"
                    loading={connecting === i.id}
                    onClick={() =>
                      i.connected
                        ? dispatch({ type: 'integration/toggle', id: i.id, connected: false })
                        : connect(i.id)
                    }
                  >
                    {i.connected ? 'Desconectar' : `Conectar ${i.name.split(' ')[0]}`}
                  </Button>
                </div>
              </Card>
            );
          })}

          <Card className="border-ink-200 bg-ink-50/60 p-5">
            <h3 className="flex items-center gap-2 text-[14.5px] font-semibold">
              <AlertTriangle size={16} className="text-[#B87C1C]" /> Sobre las integraciones en esta versión
            </h3>
            <p className="mt-2 max-w-3xl text-[13px] leading-relaxed text-ink-600">
              El VLE está construido con la capa de integración lista, pero ninguna conexión externa está activa. Por eso
              cualquier mensaje se marca como simulación y el asistente indica que usa el motor local. Preferimos que la
              plataforma diga la verdad antes que aparentar una funcionalidad que aún no existe.
            </p>
          </Card>
        </div>
      )}

      {tab === 'notificaciones' && (
        <Card className="p-5 sm:p-6">
          <h2 className="flex items-center gap-2 text-[15px] font-semibold">
            <Bell size={16} className="text-brand-600" /> Qué quieres que te avisemos
          </h2>
          <div className="mt-5 space-y-1">
            {[
              ['pendientes', 'Confirmaciones pendientes', 'Cuando falten respuestas en una convocatoria a menos de 48 h del partido.'],
              ['entrenamientos', 'Recordatorio de entrenamiento', 'Un aviso el día antes de cada sesión planificada.'],
              ['respuestas', 'Respuestas de las familias', 'Cada vez que alguien confirme o rechace una convocatoria.'],
              ['resumenSemanal', 'Resumen semanal del equipo', 'Los domingos, con asistencia, lesiones y agenda de la semana.'],
            ].map(([key, title, desc]) => (
              <div
                key={key}
                className="flex items-start justify-between gap-4 border-b border-ink-100 py-4 last:border-0"
              >
                <div className="min-w-0">
                  <p className="text-[14px] font-medium text-ink-800">{title}</p>
                  <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-500">{desc}</p>
                </div>
                <Toggle
                  checked={prefs[key as keyof typeof prefs]}
                  onChange={(v) => {
                    setPrefs((p) => ({ ...p, [key]: v }));
                    toast.success('Preferencia actualizada ✓');
                  }}
                />
              </div>
            ))}
          </div>
        </Card>
      )}

      {tab === 'permisos' && (
        <div className="space-y-4">
          <Card className="p-5">
            <h2 className="flex items-center gap-2 text-[15px] font-semibold">
              <Shield size={16} className="text-brand-600" /> Tu perfil y tus accesos
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="section-title">Rol</p>
                <p className="mt-1.5 text-[14.5px] font-medium text-ink-800">
                  {staff ? ROLE_LABEL[staff.role] : '—'}
                </p>
                <p className="mt-1 text-[12.5px] text-ink-500">{staff?.licence ?? 'Sin licencia registrada'}</p>
              </div>
              <div>
                <p className="section-title">Equipos asignados</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {teams.map((t) => (
                    <Badge key={t.id} tone="brand" size="sm">
                      {t.name}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-5">
              <p className="section-title">Permisos concedidos</p>
              <div className="mt-2.5 grid gap-1.5 sm:grid-cols-2">
                {(staff?.permissions ?? []).map((p) => (
                  <span key={p} className="flex items-center gap-2 text-[13px] text-ink-600">
                    <CheckCircle2 size={14} className="shrink-0 text-pitch" />
                    {PERMISSION_LABEL[p] ?? p}
                  </span>
                ))}
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="text-[14.5px] font-semibold">Privacidad de los datos de jugadores</h3>
            <p className="mt-2 max-w-3xl text-[13px] leading-relaxed text-ink-500">
              Los datos personales de jugadores y familias son privados. Sólo se muestran a los perfiles con el permiso
              «Ver datos personales» y únicamente dentro de la ficha individual: no aparecen en listados, búsquedas ni
              exportaciones. Un entrenador sólo puede ver y modificar los equipos que tiene asignados.
            </p>
          </Card>
        </div>
      )}

      {tab === 'datos' && (
        <div className="space-y-4">
          <Card className="p-5">
            <h2 className="text-[15px] font-semibold">Datos de demostración</h2>
            <p className="mt-2 max-w-3xl text-[13px] leading-relaxed text-ink-500">
              Esta instalación funciona con datos ficticios generados por la plataforma: 4 equipos, {data.players.length}{' '}
              jugadores, {data.sessions.length} sesiones, {data.matches.length} partidos y {data.attendance.length}{' '}
              registros de asistencia. Todo lo que edites se guarda en tu navegador; puedes restaurar el estado inicial
              cuando quieras.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {[
                ['Equipos', data.teams.length],
                ['Jugadores', data.players.length],
                ['Ejercicios', data.drills.length],
                ['Sesiones', data.sessions.length],
                ['Partidos', data.matches.length],
                ['Mensajes', data.messages.length],
              ].map(([l, n]) => (
                <div key={l as string} className="rounded-xl bg-ink-50 px-4 py-3">
                  <p className="text-[19px] font-semibold text-ink-900 tabular-nums">{n as number}</p>
                  <p className="mt-0.5 text-[12px] text-ink-500">{l as string}</p>
                </div>
              ))}
            </div>
            <Button
              variant="danger"
              size="sm"
              className="mt-5"
              icon={<RotateCcw size={15} />}
              onClick={() => setConfirmReset(true)}
            >
              Restaurar datos de demostración
            </Button>
          </Card>
        </div>
      )}

      {/* Motivo por el que no se puede conectar todavía */}
      <Modal
        open={!!reason}
        onClose={() => setReason(null)}
        title="Integración pendiente de credenciales"
        footer={<Button onClick={() => setReason(null)}>Entendido</Button>}
      >
        <p className="text-[14px] leading-relaxed text-ink-600">{reason}</p>
      </Modal>

      <Modal
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        title="¿Restaurar los datos de demostración?"
        subtitle="Se perderán los cambios que hayas hecho en esta sesión."
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmReset(false)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={async () => {
                setConfirmReset(false);
                await resetDemo();
                toast.success('Datos restaurados ✓', 'La plataforma ha vuelto a su estado inicial.');
              }}
            >
              Restaurar
            </Button>
          </>
        }
      >
        <p className="text-[14px] leading-relaxed text-ink-600">
          Se volverán a generar los equipos, jugadores, sesiones, partidos, convocatorias y mensajes de ejemplo. Es útil
          para preparar una demostración desde cero.
        </p>
      </Modal>
    </>
  );
}

const PERMISSION_LABEL: Record<string, string> = {
  'teams.read': 'Ver equipos',
  'teams.write': 'Gestionar equipos',
  'players.read': 'Ver jugadores',
  'players.read.sensitive': 'Ver datos personales',
  'players.write': 'Editar fichas de jugadores',
  'sessions.read': 'Ver planificaciones',
  'sessions.write': 'Crear y editar entrenamientos',
  'matches.write': 'Gestionar partidos',
  'callups.write': 'Gestionar convocatorias',
  'attendance.write': 'Registrar asistencia',
  'messages.send': 'Enviar mensajes',
  'club.admin': 'Administrar el club',
};
