/**
 * Ajustes y ayuda.
 * Sin integraciones inventadas: sólo lo que la plataforma hace de verdad.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useClub } from '@/store/store';
import { currentStaff, isClubAdmin, visibleTeams } from '@/store/selectors';
import { ROLE_LABEL, auth } from '@/services/auth';
import { humanError, supabase } from '@/services/supabase';
import {
  Button, Field, Figure, Input, PageHeader, Panel, PanelHeader, ScoreInput, Tabs, Tag, Textarea,
} from '@/components/ui';
import { useToast } from '@/components/ui/Toast';

export default function SettingsPage() {
  const { data, userId, actions } = useClub();
  const toast = useToast();
  const staff = currentStaff(data);
  const teams = visibleTeams(data);
  const [newPassword, setNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [tab, setTab] = useState('cuenta');

  // Comentarios privados para el club: no son reseñas públicas.
  const [feedback, setFeedback] = useState('');
  const [score, setScore] = useState<number | null>(null);
  const [sendingFeedback, setSendingFeedback] = useState(false);

  const sendFeedback = async () => {
    if (feedback.trim().length < 5) {
      toast.error('Escribe un poco más', 'Cuéntanos qué te ha pasado o qué echas en falta.');
      return;
    }
    setSendingFeedback(true);
    try {
      const { error } = await supabase.from('app_feedback').insert({
        profile_id: userId,
        message: feedback.trim(),
        score,
      });
      if (error) throw error;
      setFeedback('');
      setScore(null);
      toast.success('Gracias', 'Lo hemos recibido. No se publica en ningún sitio.');
    } catch (e) {
      toast.error('No hemos podido guardarlo', humanError(e));
    } finally {
      setSendingFeedback(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Ajustes y ayuda"
        description="Tu cuenta, lo que puedes hacer en la plataforma y cómo contarnos un problema."
      />

      <Tabs
        className="mb-5"
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'cuenta', label: 'Cuenta' },
          { id: 'permisos', label: 'Permisos' },
          { id: 'ayuda', label: 'Ayuda' },
        ]}
      />

      {tab === 'cuenta' && (
        <div className="grid gap-3 lg:grid-cols-2">
          <Panel>
            <PanelHeader title="Contraseña" description="Se aplica la próxima vez que entres." />
            <div className="space-y-3 p-4">
              <Field label="Nueva contraseña" hint="Mínimo 6 caracteres.">
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </Field>
              <Button
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
                    toast.success('Contraseña actualizada');
                  } catch (e) {
                    toast.error('No hemos podido cambiarla', humanError(e));
                  } finally {
                    setChangingPassword(false);
                  }
                }}
              >
                Cambiar contraseña
              </Button>
            </div>
          </Panel>

          <Panel>
            <PanelHeader
              title="Lo que hay en tus equipos"
              description="Cifras reales de lo que has registrado."
              actions={
                <Button variant="secondary" size="sm" onClick={() => void actions.refresh()}>
                  Recargar
                </Button>
              }
            />
            <div className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-3">
              <Figure label="Equipos" value={data.teams.length} />
              <Figure label="Jugadoras" value={data.players.filter((p) => !p.archivedAt).length} />
              <Figure label="Ejercicios" value={data.drills.length} />
              <Figure label="Entrenamientos" value={data.sessions.length} />
              <Figure label="Partidos" value={data.matches.length} />
              <Figure label="Asistencias" value={data.attendance.length} />
            </div>
          </Panel>
        </div>
      )}

      {tab === 'permisos' && (
        <div className="space-y-3">
          <Panel>
            <PanelHeader title="Tu perfil" />
            <div className="grid gap-4 p-4 sm:grid-cols-2">
              <div>
                <p className="eyebrow">Rol</p>
                <p className="mt-1 text-base font-medium text-navy-900">
                  {staff ? ROLE_LABEL[staff.role] : '—'}
                </p>
                {staff?.licence && <p className="mt-0.5 text-sm text-muted">{staff.licence}</p>}
              </div>
              <div>
                <p className="eyebrow">Equipos asignados</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {teams.length === 0 ? (
                    <p className="text-sm text-muted">Ninguno todavía.</p>
                  ) : (
                    teams.map((t) => (
                      <Tag key={t.id} size="sm">
                        {t.name}
                      </Tag>
                    ))
                  )}
                </div>
              </div>
            </div>
          </Panel>

          <Panel>
            <PanelHeader title="Qué puedes hacer" />
            <ul className="space-y-1.5 p-4 text-base text-navy-700">
              {(isClubAdmin(data)
                ? [
                    'Crear equipos y asignar al cuerpo técnico',
                    'Ver todos los equipos del club',
                    'Gestionar plantillas, entrenamientos y partidos',
                    'Ver los datos personales y de contacto de las jugadoras',
                  ]
                : [
                    'Trabajar en los equipos que tienes asignados',
                    'Dar de alta y editar jugadoras',
                    'Planificar entrenamientos y partidos',
                    'Registrar asistencia y convocatorias',
                  ]
              ).map((p) => (
                <li key={p} className="flex gap-2">
                  <span aria-hidden className="text-navy-300">
                    ·
                  </span>
                  {p}
                </li>
              ))}
            </ul>
          </Panel>

          <Panel>
            <PanelHeader title="Cómo se protegen los datos" />
            <div className="space-y-3 p-4 text-base leading-relaxed text-navy-700">
              <p>
                Los permisos no dependen de lo que se ve en pantalla: los aplica el servidor. Cada
                consulta pasa por las políticas de acceso de la base de datos, así que una entrenadora
                no puede leer ni escribir en un equipo que no tiene asignado aunque manipule la
                aplicación en su navegador.
              </p>
              <p>
                Los datos de contacto de jugadoras y familias sólo aparecen dentro de la ficha
                individual, nunca en listados ni exportaciones.
              </p>
              <p className="text-sm text-muted">
                <Link to="/privacidad" className="underline underline-offset-2 hover:text-navy-900">
                  Política de privacidad
                </Link>
                {' · '}
                <Link to="/aviso-legal" className="underline underline-offset-2 hover:text-navy-900">
                  Aviso legal
                </Link>
              </p>
            </div>
          </Panel>
        </div>
      )}

      {tab === 'ayuda' && (
        <div className="grid gap-3 lg:grid-cols-2">
          <Panel>
            <PanelHeader
              title="Cuéntanos un problema"
              description="Va directo a quien mantiene la plataforma. No se publica."
            />
            <div className="space-y-3 p-4">
              <Field label="Qué ha pasado">
                <Textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Qué estabas haciendo, qué esperabas y qué ha ocurrido."
                />
              </Field>
              <Field label="Cómo te está funcionando" hint="Opcional.">
                <ScoreInput value={score} onChange={setScore} name="Valoración de la plataforma" />
              </Field>
              <Button loading={sendingFeedback} onClick={sendFeedback}>
                Enviar
              </Button>
            </div>
          </Panel>

          <Panel>
            <PanelHeader title="Preguntas frecuentes" />
            <dl className="divide-y divide-line">
              {[
                [
                  '¿Por qué no veo ningún equipo?',
                  'Porque todavía no te han asignado ninguno. Quien administra el club lo hace desde Equipo técnico.',
                ],
                [
                  '¿La plataforma envía mensajes a las familias?',
                  'No. Prepara las listas y los textos, y tú los compartes por donde ya habléis con el equipo.',
                ],
                [
                  '¿Qué pasa si una jugadora deja el equipo?',
                  'Se archiva, no se borra: su historial de asistencia y de partidos se conserva.',
                ],
                [
                  '¿Se guarda solo lo que escribo?',
                  'Cada pantalla indica cuándo ha guardado. Si el servidor rechaza un cambio, se avisa y no se da por guardado.',
                ],
              ].map(([q, a]) => (
                <div key={q} className="px-4 py-3">
                  <dt className="text-base font-medium text-navy-900">{q}</dt>
                  <dd className="mt-1 text-base leading-relaxed text-muted">{a}</dd>
                </div>
              ))}
            </dl>
          </Panel>

          {/* Saber qué versión se está ejecutando evita confundir un fallo con
              una copia antigua guardada por el navegador. */}
          <p className="px-1 text-sm text-muted">
            Versión <span className="tabular-nums">{__VERSION__}</span>. Si algo no se comporta como
            se acaba de decir, recarga la página y comprueba que esta referencia cambia.
          </p>
        </div>
      )}
    </>
  );
}
