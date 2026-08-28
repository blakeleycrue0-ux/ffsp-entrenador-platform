import { useState } from 'react';
import {
  AlertTriangle, Bell, CalendarDays, CheckCircle2, MessageSquare, Shield, Sparkles,
} from 'lucide-react';
import { useClub } from '@/store/store';
import { currentStaff, visibleTeams } from '@/store/selectors';
import { ROLE_LABEL, auth, isCoordinator } from '@/services/auth';
import { humanError } from '@/services/supabase';
import { whatsapp } from '@/services/whatsapp';
import { Badge, Button, Card, Input, Modal, PageHeader, Tabs, Toggle } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';
import type { IntegrationId } from '@/types';

const INTEGRATION_ICON: Record<IntegrationId, typeof MessageSquare> = {
  whatsapp: MessageSquare,
  ia: Sparkles,
  calendario: CalendarDays,
};

export default function SettingsPage() {
  const { data, actions } = useClub();
  const toast = useToast();
  const staff = currentStaff(data);
  const teams = visibleTeams(data);
  const [newPassword, setNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [tab, setTab] = useState('integraciones');
  const [connecting, setConnecting] = useState<IntegrationId | null>(null);
  const [reason, setReason] = useState<string | null>(null);

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
          { id: 'cuenta', label: 'Cuenta' },
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
                    onClick={() => connect(i.id)}
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
              La aplicación está construida con la capa de integración lista, pero ninguna conexión externa está
              activa. Por eso cualquier mensaje se marca como no enviado y el asistente indica que usa el motor local.
              Preferimos que la plataforma diga la verdad antes que aparentar algo que todavía no existe.
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
              <p className="section-title">Qué puedes hacer</p>
              <div className="mt-2.5 grid gap-1.5 sm:grid-cols-2">
                {(isCoordinator(staff)
                  ? [
                      'Crear equipos y asignar cuerpo técnico',
                      'Ver todos los equipos del club',
                      'Gestionar jugadoras, sesiones y partidos',
                      'Enviar mensajes y convocatorias',
                      'Ver los datos personales de las jugadoras',
                    ]
                  : [
                      'Gestionar tus equipos asignados',
                      'Dar de alta y editar jugadoras',
                      'Planificar entrenamientos y partidos',
                      'Registrar asistencia y convocatorias',
                      'Enviar mensajes a tu equipo',
                    ]
                ).map((p) => (
                  <span key={p} className="flex items-center gap-2 text-[13px] text-ink-600">
                    <CheckCircle2 size={14} className="shrink-0 text-pitch" />
                    {p}
                  </span>
                ))}
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="text-[14.5px] font-semibold">Privacidad de los datos de las jugadoras</h3>
            <p className="mt-2 max-w-3xl text-[13px] leading-relaxed text-ink-500">
              Los datos personales de las jugadoras y sus familias son privados. Sólo se muestran dentro de la ficha
              individual y nunca en listados, búsquedas ni exportaciones. El servidor aplica seguridad por filas: cada
              entrenadora sólo puede leer y escribir en los equipos que tiene asignados, aunque manipule la aplicación.
            </p>
          </Card>
        </div>
      )}

      {tab === 'cuenta' && (
        <div className="space-y-4">
          <Card className="p-5">
            <h2 className="text-[15px] font-semibold">Contraseña</h2>
            <p className="mt-1.5 max-w-2xl text-[13px] leading-relaxed text-ink-500">
              Cambia tu contraseña de acceso. Se aplicará la próxima vez que entres.
            </p>
            <div className="mt-4 flex max-w-md flex-col gap-3 sm:flex-row">
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Nueva contraseña (mínimo 6 caracteres)"
              />
              <Button
                size="md"
                loading={changingPassword}
                onClick={async () => {
                  if (newPassword.length < 6) {
                    toast.error('Contraseña demasiado corta', 'Debe tener al menos 6 caracteres.');
                    return;
                  }
                  setChangingPassword(true);
                  try {
                    await auth.updatePassword(newPassword);
                    setNewPassword('');
                    toast.success('Contraseña actualizada ✓');
                  } catch (e) {
                    toast.error('No hemos podido cambiarla', humanError(e));
                  } finally {
                    setChangingPassword(false);
                  }
                }}
              >
                Cambiar
              </Button>
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="text-[15px] font-semibold">Tus datos en la plataforma</h2>
            <p className="mt-1.5 max-w-2xl text-[13px] leading-relaxed text-ink-500">
              Esto es lo que hay ahora mismo en los equipos a los que tienes acceso.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {[
                ['Equipos', data.teams.length],
                ['Jugadoras', data.players.length],
                ['Ejercicios', data.drills.length],
                ['Entrenamientos', data.sessions.length],
                ['Partidos', data.matches.length],
                ['Mensajes', data.messages.length],
              ].map(([l, n]) => (
                <div key={l as string} className="rounded-xl bg-ink-50 px-4 py-3">
                  <p className="text-[19px] font-semibold text-ink-900 tabular-nums">{n as number}</p>
                  <p className="mt-0.5 text-[12px] text-ink-500">{l as string}</p>
                </div>
              ))}
            </div>
            <Button variant="outline" size="sm" className="mt-5" onClick={() => void actions.refresh()}>
              Recargar desde el servidor
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

    </>
  );
}
