/**
 * Club — panel de coordinación.
 * ---------------------------------------------------------------------------
 * Aquí se crean los equipos y se asigna a cada entrenadora el suyo. Es la
 * única pantalla que ve el club entero; el resto de perfiles ni siquiera
 * pueden abrir la ruta (lo impide el guardián de rutas y, sobre todo, RLS).
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardCopy, Plus, UserPlus, X } from 'lucide-react';
import { useClub } from '@/store/store';
import { ASSIGNABLE_ROLES, ROLE_LABEL } from '@/services/auth';
import { humanError } from '@/services/supabase';
import { clubs } from '@/services/clubs';
import { ClubCrest } from '@/components/ui/Brand';
import {
  CLUB_ROLE_LABEL, invitationLink, invitationState, invitations,
  type ClubRole, type Invitation,
} from '@/services/invitations';
import {
  Avatar, Button, EmptyState, Field, Input, LinkButton, Modal, PageHeader, Panel, Select,
  SkeletonRows, Tabs, Tag,
} from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { squadOf } from '@/store/selectors';
import { longDate } from '@/lib/utils';
import type { Club, Staff, StaffRole } from '@/types';

export default function ClubAdminPage() {
  const { data, actions } = useClub();
  const toast = useToast();
  const [tab, setTab] = useState('equipos');
  const [assignTo, setAssignTo] = useState<string | null>(null);

  const unassigned = useMemo(
    () => data.staff.filter((s) => s.teamIds.length === 0 && s.id !== data.profile?.id),
    [data.staff],
  );

  return (
    <>
      <PageHeader
        eyebrow="Administración del club"
        title="Equipo técnico"
        description="Equipos de la temporada, quién trabaja en cada uno e invitaciones pendientes."
        actions={
          <LinkButton to="/app/equipo-tecnico/nuevo-equipo" size="sm" icon={<Plus size={16} />}>
            Crear equipo
          </LinkButton>
        }
      />

      {unassigned.length > 0 && (
        <Panel className="mb-5 border-warn/30 bg-warn/5 p-4">
          <p className="text-[14px] font-medium text-[#8A5A10]">
            {unassigned.length} {unassigned.length === 1 ? 'persona' : 'personas'} sin equipo asignado
          </p>
          <p className="mt-1 text-[13px] leading-relaxed text-[#8A5A10]/85">
            Han creado su cuenta pero todavía no ven nada al entrar: {unassigned.map((s) => s.name).join(', ')}.
          </p>
        </Panel>
      )}

      <Tabs
        className="mb-6"
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'equipos', label: 'Equipos', count: data.teams.length },
          { id: 'personas', label: 'Cuerpo técnico', count: data.staff.length },
          { id: 'invitaciones', label: 'Invitaciones' },
          { id: 'club', label: 'Datos del club' },
        ]}
      />

      {tab === 'equipos' &&
        (data.teams.length === 0 ? (
          <Panel>
            <EmptyState
             
              title="Todavía no hay equipos"
              description="Crea el primer equipo de la temporada. Después podrás asignarle entrenadoras y ellas empezarán a meter sus jugadoras."
              action={
                <LinkButton to="/app/equipo-tecnico/nuevo-equipo" size="sm">
                  Crear el primer equipo
                </LinkButton>
              }
            />
          </Panel>
        ) : (
          <div className="space-y-3">
            {data.teams.map((team) => {
              const links = data.teamStaff.filter((l) => l.teamId === team.id);
              const people = links
                .map((l) => ({ staff: data.staff.find((s) => s.id === l.profileId), role: l.role }))
                .filter((x) => x.staff);

              return (
                <Panel key={team.id} className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-navy-900 text-[13px] font-bold text-white">
                        {team.name.replace(/[^A-Z0-9]/gi, '').slice(0, 2).toUpperCase() || '—'}
                      </span>
                      <div className="min-w-0">
                        <Link to={`/app/equipo-tecnico/${team.id}`} className="text-[16px] font-semibold hover:text-navy-900">
                          {team.name}
                        </Link>
                        <p className="mt-0.5 text-[12.5px] text-muted">
                          {[team.category, team.competition, team.season].filter(Boolean).join(' · ') || 'Sin detalles'}
                        </p>
                        <p className="mt-1 text-[12.5px] text-navy-400">
                          {squadOf(data, team.id).length} jugadoras
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <LinkButton to={`/app/equipo-tecnico/${team.id}/editar`} variant="secondary" size="sm">
                        Editar
                      </LinkButton>
                      <Button size="sm" icon={<UserPlus size={15} />} onClick={() => setAssignTo(team.id)}>
                        Asignar
                      </Button>
                    </div>
                  </div>

                  <div className="mt-4 border-t border-navy-100 pt-3">
                    {people.length === 0 ? (
                      <p className="text-[13px] text-muted">
                        Sin cuerpo técnico asignado. Nadie ve este equipo todavía.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {people.map(({ staff, role }) => (
                          <span
                            key={staff!.id}
                            className="inline-flex items-center gap-2 rounded-xl border border-line py-1.5 pl-1.5 pr-2.5"
                          >
                            <Avatar name={staff!.name} size={26} />
                            <span className="text-[13px] text-navy-700">{staff!.name}</span>
                            <span className="text-[11.5px] text-navy-400">{ROLE_LABEL[role]}</span>
                            <button
                              onClick={async () => {
                                try {
                                  await actions.unassignStaff(team.id, staff!.id);
                                  toast.success('Asignación retirada');
                                } catch (e) {
                                  toast.error('No hemos podido retirarla', humanError(e));
                                }
                              }}
                              className="text-navy-300 transition-colors hover:text-bad"
                              aria-label={`Quitar a ${staff!.name}`}
                            >
                              <X size={14} />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </Panel>
              );
            })}
          </div>
        ))}

      {tab === 'personas' && (
        <div className="space-y-3">
          {data.staff.length === 0 ? (
            <Panel>
              <EmptyState title="Todavía no hay nadie registrado" />
            </Panel>
          ) : (
            data.staff.map((person) => <StaffRow key={person.id} person={person} />)
          )}

          <Panel className="p-4">
            <h3 className="text-base font-semibold">Cómo se da de alta a una entrenadora</h3>
            <ol className="mt-2 space-y-1.5 text-sm leading-relaxed text-navy-700">
              <li>1. Le creas una invitación desde la pestaña «Invitaciones».</li>
              <li>2. Le pasas el enlace por donde habléis habitualmente.</li>
              <li>3. Ella crea su cuenta con ese correo y la invitación se acepta sola.</li>
              <li>4. A partir de ese momento ve su equipo y sólo el suyo.</li>
            </ol>
          </Panel>
        </div>
      )}

      {tab === 'invitaciones' && <InvitationsTab />}

      {tab === 'club' && <ClubDataTab />}

      <AssignModal teamId={assignTo} onClose={() => setAssignTo(null)} />
    </>
  );
}

/* ─────────────────────────── Fila de cuerpo técnico ──────────────────────── */

function StaffRow({ person }: { person: Staff }) {
  const { data, actions } = useClub();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const teams = person.teamIds
    .map((id) => data.teams.find((t) => t.id === id)?.name)
    .filter(Boolean) as string[];

  const changeRole = async (role: StaffRole) => {
    setBusy(true);
    try {
      await actions.updateProfile(person.id, { role });
      toast.success('Rol actualizado');
    } catch (e) {
      toast.error('No hemos podido cambiar el rol', humanError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel className="flex flex-wrap items-center gap-4 p-4">
      <Avatar name={person.name} size={42} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14.5px] font-medium text-navy-900">{person.name}</p>
        <p className="truncate text-[12.5px] text-muted">{person.email}</p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {teams.length === 0 ? (
            <Tag tone="warn" size="sm">
              Sin equipo
            </Tag>
          ) : (
            teams.map((t) => (
              <Tag key={t} tone="solid" size="sm">
                {t}
              </Tag>
            ))
          )}
        </div>
      </div>
      <Select
        value={person.role}
        disabled={busy}
        onChange={(e) => changeRole(e.target.value as StaffRole)}
        className="w-auto min-w-[190px]"
      >
        {ASSIGNABLE_ROLES.map((r) => (
          <option key={r} value={r}>
            {ROLE_LABEL[r]}
          </option>
        ))}
      </Select>
    </Panel>
  );
}

/* ──────────────────────────── Asignar a un equipo ────────────────────────── */

function AssignModal({ teamId, onClose }: { teamId: string | null; onClose: () => void }) {
  const { data, actions } = useClub();
  const toast = useToast();
  const [profileId, setProfileId] = useState('');
  const [role, setRole] = useState<StaffRole>('entrenadora');
  const [busy, setBusy] = useState(false);

  if (!teamId) return null;
  const team = data.teams.find((t) => t.id === teamId);
  const already = new Set(data.teamStaff.filter((l) => l.teamId === teamId).map((l) => l.profileId));
  const candidates = data.staff.filter((s) => !already.has(s.id));

  const assign = async () => {
    if (!profileId) {
      toast.error('Selecciona a una persona');
      return;
    }
    setBusy(true);
    try {
      await actions.assignStaff(teamId, profileId, role);
      toast.success('Asignada al equipo', 'Ya puede ver y gestionar este equipo al entrar.');
      setProfileId('');
      onClose();
    } catch (e) {
      toast.error('No hemos podido asignarla', humanError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={`Asignar a ${team?.name ?? 'equipo'}`}
      description="Sólo verá los equipos que le asignes."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button loading={busy} onClick={assign}>
            Asignar
          </Button>
        </>
      }
    >
      {candidates.length === 0 ? (
        <p className="text-[14px] leading-relaxed text-navy-600">
          Ya están asignadas todas las personas registradas. Cuando alguien nuevo cree su cuenta, aparecerá aquí.
        </p>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="label">Persona</label>
            <Select value={profileId} onChange={(e) => setProfileId(e.target.value)}>
              <option value="">Selecciona…</option>
              {candidates.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} — {s.email}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="label">Rol en este equipo</label>
            <Select value={role} onChange={(e) => setRole(e.target.value as StaffRole)}>
              {ASSIGNABLE_ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABEL[r]}
                </option>
              ))}
            </Select>
          </div>
        </div>
      )}
    </Modal>
  );
}

/* ────────────────────────────── Invitaciones ─────────────────────────────── */

/**
 * Flujo real: se crea la invitación en la base de datos con caducidad y se
 * entrega el enlace. **La plataforma no envía correos**, así que no decimos que
 * los envíe: quien invita comparte el enlace por donde ya hable con esa persona.
 */
function InvitationsTab() {
  const { data, userId } = useClub();
  const toast = useToast();
  const [club, setClub] = useState<Club | null | undefined>(undefined);
  const [rows, setRows] = useState<Invitation[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState('');
  const [role, setRole] = useState<ClubRole>('entrenadora');
  const [teamId, setTeamId] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const found = data.club ?? (data.teams[0] ? await clubs.ofTeam(data.teams[0].id) : null);
      setClub(found);
      setRows(found ? await invitations.listByClub(found.id) : []);
    } catch (e) {
      setError(humanError(e));
      setClub(null);
    }
  }, [data.club, data.teams]);

  useEffect(() => {
    void load();
  }, [load]);

  const create = async () => {
    if (!club || !userId) return;
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) {
      toast.error('Correo no válido', 'Escribe la dirección completa.');
      return;
    }
    setBusy(true);
    try {
      const inv = await invitations.create({
        clubId: club.id,
        email,
        role,
        teamId: teamId || null,
        userId,
      });
      setRows((r) => [inv, ...(r ?? [])]);
      setEmail('');
      await copy(invitationLink(inv.token));
      toast.success('Invitación creada', 'El enlace está copiado: pásaselo tú.');
    } catch (e) {
      toast.error('No hemos podido crear la invitación', humanError(e));
    } finally {
      setBusy(false);
    }
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  };

  if (club === undefined) return <SkeletonRows />;

  if (error) {
    return (
      <Panel>
        <EmptyState title="No hemos podido cargar las invitaciones" description={error} />
      </Panel>
    );
  }

  if (!club) {
    return (
      <Panel>
        <EmptyState
          title="Todavía no hay un club creado"
          description="Las invitaciones pertenecen a un club. Crea primero un equipo: se creará el club junto con él."
        />
      </Panel>
    );
  }

  return (
    <div className="space-y-3">
      <Panel>
        <div className="border-b border-line px-4 py-3">
          <h3 className="text-md font-semibold">Invitar a alguien a {club.name}</h3>
          <p className="mt-0.5 text-sm leading-relaxed text-muted">
            Se crea un enlace que caduca a los 14 días y sólo sirve para ese correo. La plataforma no
            envía el correo: el enlace lo compartes tú.
          </p>
        </div>
        <div className="grid gap-3 p-4 sm:grid-cols-[2fr_1fr_1fr_auto] sm:items-end">
          <Field label="Correo electrónico">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nombre@correo.com"
            />
          </Field>
          <Field label="Rol en el club">
            <Select value={role} onChange={(e) => setRole(e.target.value as ClubRole)}>
              {(['entrenadora', 'asistente', 'admin'] as ClubRole[]).map((r) => (
                <option key={r} value={r}>
                  {CLUB_ROLE_LABEL[r]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Equipo" hint="Opcional.">
            <Select value={teamId} onChange={(e) => setTeamId(e.target.value)}>
              <option value="">Sin equipo</option>
              {data.teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          </Field>
          <Button loading={busy} onClick={create}>
            Crear invitación
          </Button>
        </div>
      </Panel>

      <Panel>
        <div className="border-b border-line px-4 py-3">
          <h3 className="text-md font-semibold">Invitaciones</h3>
        </div>
        {rows === null ? (
          <SkeletonRows className="p-4" />
        ) : rows.length === 0 ? (
          <EmptyState
            title="Todavía no has invitado a nadie"
            description="Crea una invitación arriba y pásale el enlace a quien se incorpora."
          />
        ) : (
          <ul className="divide-y divide-line">
            {rows.map((i) => {
              const state = invitationState(i);
              const tone = { pendiente: 'warn', aceptada: 'ok', caducada: 'neutral', revocada: 'bad' } as const;
              return (
                <li key={i.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-base font-medium text-navy-900">{i.email}</span>
                    <span className="mt-0.5 block text-sm text-muted">
                      {CLUB_ROLE_LABEL[i.role]}
                      {state === 'pendiente' && ` · caduca el ${longDate(i.expiresAt.slice(0, 10))}`}
                      {state === 'aceptada' && i.acceptedAt && ` · aceptada el ${longDate(i.acceptedAt.slice(0, 10))}`}
                    </span>
                  </span>
                  <Tag tone={tone[state]} size="sm">
                    {state[0].toUpperCase() + state.slice(1)}
                  </Tag>
                  {state === 'pendiente' && (
                    <>
                      <Button
                        size="sm"
                        variant="secondary"
                        icon={<ClipboardCopy size={14} />}
                        onClick={async () => {
                          const ok = await copy(invitationLink(i.token));
                          if (ok) toast.success('Enlace copiado');
                          else toast.error('No hemos podido copiarlo', invitationLink(i.token));
                        }}
                      >
                        Copiar enlace
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={async () => {
                          try {
                            await invitations.revoke(i.id);
                            setRows((r) =>
                              (r ?? []).map((x) =>
                                x.id === i.id ? { ...x, revokedAt: new Date().toISOString() } : x,
                              ),
                            );
                            toast.success('Invitación anulada');
                          } catch (e) {
                            toast.error('No hemos podido anularla', humanError(e));
                          }
                        }}
                      >
                        Anular
                      </Button>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
}

/* ──────────────────────────── Datos del club ─────────────────────────────── */

/**
 * El nombre del club no está en el código: se guarda aquí y de aquí sale para
 * los marcadores, las convocatorias y la agenda exportada.
 */
function ClubDataTab() {
  const { data, actions } = useClub();
  const toast = useToast();
  const club = data.club;

  const [name, setName] = useState(club?.name ?? '');
  const [shortName, setShortName] = useState(club?.shortName ?? '');
  const [season, setSeason] = useState(club?.season ?? '');
  const [crestUrl, setCrestUrl] = useState(club?.crestUrl ?? '');
  const [busy, setBusy] = useState(false);

  if (!club) {
    return (
      <Panel>
        <EmptyState
          title="Todavía no hay un club"
          description="Crea un equipo y se creará el club junto con él."
        />
      </Panel>
    );
  }

  const save = async () => {
    if (name.trim().length < 2) {
      toast.error('El club necesita un nombre');
      return;
    }
    setBusy(true);
    try {
      await clubs.update(club.id, { name, shortName, season, crestUrl });
      await actions.refresh();
      toast.success('Datos del club guardados');
    } catch (e) {
      toast.error('No hemos podido guardarlos', humanError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <Panel>
        <div className="border-b border-line px-4 py-3">
          <h3 className="text-md font-semibold">Identidad</h3>
          <p className="mt-0.5 text-sm text-muted">
            De aquí salen los marcadores, las convocatorias y el nombre de la agenda exportada.
          </p>
        </div>
        <div className="space-y-3 p-4">
          <Field label="Nombre del club" required>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Nombre corto" hint="El que cabe en un marcador.">
            <Input value={shortName} onChange={(e) => setShortName(e.target.value)} maxLength={28} />
          </Field>
          <Field label="Temporada" hint="Opcional. Aparece bajo el nombre del club.">
            <Input value={season} onChange={(e) => setSeason(e.target.value)} placeholder="2025/26" />
          </Field>
          <Field
            label="Escudo"
            hint="Dirección de la imagen. Todavía no se pueden subir archivos: pega una URL pública."
          >
            <Input
              value={crestUrl}
              onChange={(e) => setCrestUrl(e.target.value)}
              placeholder="https://…/escudo.png"
              inputMode="url"
            />
          </Field>
          <Button loading={busy} onClick={save}>
            Guardar
          </Button>
        </div>
      </Panel>

      <Panel>
        <div className="border-b border-line px-4 py-3">
          <h3 className="text-md font-semibold">Cómo se verá</h3>
        </div>
        <div className="space-y-4 p-4">
          <div className="flex items-center gap-2.5">
            <ClubCrest name={name} src={crestUrl || undefined} size={34} />
            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-navy-900">{name || 'Tu club'}</p>
              {season && <p className="text-xs text-muted">{season}</p>}
            </div>
          </div>
          <div>
            <p className="eyebrow mb-1.5">En un marcador</p>
            <p className="text-base text-navy-800">
              {shortName || name || 'Tu club'} <span className="text-muted">vs</span> Rival
            </p>
          </div>
          <p className="text-xs leading-relaxed text-muted">
            Los datos de tu club no son visibles para ningún otro club de la plataforma. El
            aislamiento lo aplican las políticas de acceso de la base de datos.
          </p>
        </div>
      </Panel>
    </div>
  );
}
