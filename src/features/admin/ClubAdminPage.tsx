/**
 * Club — panel de coordinación.
 * ---------------------------------------------------------------------------
 * Aquí se crean los equipos y se asigna a cada entrenadora el suyo. Es la
 * única pantalla que ve el club entero; el resto de perfiles ni siquiera
 * pueden abrir la ruta (lo impide el guardián de rutas y, sobre todo, RLS).
 */

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Shield, UserPlus, Users, X } from 'lucide-react';
import { useClub } from '@/store/store';
import { ASSIGNABLE_ROLES, ROLE_LABEL, isCoordinator } from '@/services/auth';
import { humanError } from '@/services/supabase';
import { Avatar, Badge, Button, Card, EmptyState, LinkButton, Modal, PageHeader, Select, Tabs } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { squadOf } from '@/store/selectors';
import type { Staff, StaffRole } from '@/types';

export default function ClubAdminPage() {
  const { data, actions } = useClub();
  const toast = useToast();
  const [tab, setTab] = useState('equipos');
  const [assignTo, setAssignTo] = useState<string | null>(null);

  const unassigned = useMemo(
    () => data.staff.filter((s) => s.teamIds.length === 0 && !isCoordinator(s)),
    [data.staff],
  );

  return (
    <>
      <PageHeader
        eyebrow={<Badge tone="brand" size="sm">Coordinación</Badge>}
        title="Club"
        description="Crea los equipos de la temporada y asigna a cada persona del cuerpo técnico el suyo."
        actions={
          <LinkButton to="/app/equipos/nuevo" size="sm" icon={<Plus size={16} />}>
            Crear equipo
          </LinkButton>
        }
      />

      {unassigned.length > 0 && (
        <Card className="mb-5 border-sun/30 bg-sun/5 p-4">
          <p className="text-[14px] font-medium text-[#8A5A10]">
            {unassigned.length} {unassigned.length === 1 ? 'persona' : 'personas'} sin equipo asignado
          </p>
          <p className="mt-1 text-[13px] leading-relaxed text-[#8A5A10]/85">
            Han creado su cuenta pero todavía no ven nada al entrar: {unassigned.map((s) => s.name).join(', ')}.
          </p>
        </Card>
      )}

      <Tabs
        className="mb-6"
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'equipos', label: 'Equipos', count: data.teams.length },
          { id: 'personas', label: 'Cuerpo técnico', count: data.staff.length },
        ]}
      />

      {tab === 'equipos' &&
        (data.teams.length === 0 ? (
          <Card>
            <EmptyState
              icon={<Shield size={26} />}
              title="Todavía no hay equipos"
              description="Crea el primer equipo de la temporada. Después podrás asignarle entrenadoras y ellas empezarán a meter sus jugadoras."
              action={
                <LinkButton to="/app/equipos/nuevo" size="sm">
                  Crear el primer equipo
                </LinkButton>
              }
            />
          </Card>
        ) : (
          <div className="space-y-3">
            {data.teams.map((team) => {
              const links = data.teamStaff.filter((l) => l.teamId === team.id);
              const people = links
                .map((l) => ({ staff: data.staff.find((s) => s.id === l.profileId), role: l.role }))
                .filter((x) => x.staff);

              return (
                <Card key={team.id} className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-700 text-[13px] font-bold text-white">
                        {team.name.replace(/[^A-Z0-9]/gi, '').slice(0, 2).toUpperCase() || '—'}
                      </span>
                      <div className="min-w-0">
                        <Link to={`/app/equipos/${team.id}`} className="text-[16px] font-semibold hover:text-brand-800">
                          {team.name}
                        </Link>
                        <p className="mt-0.5 text-[12.5px] text-ink-500">
                          {[team.category, team.competition, team.season].filter(Boolean).join(' · ') || 'Sin detalles'}
                        </p>
                        <p className="mt-1 text-[12.5px] text-ink-400">
                          {squadOf(data, team.id).length} jugadoras
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <LinkButton to={`/app/equipos/${team.id}/editar`} variant="outline" size="sm">
                        Editar
                      </LinkButton>
                      <Button size="sm" icon={<UserPlus size={15} />} onClick={() => setAssignTo(team.id)}>
                        Asignar
                      </Button>
                    </div>
                  </div>

                  <div className="mt-4 border-t border-ink-100 pt-3">
                    {people.length === 0 ? (
                      <p className="text-[13px] text-ink-500">
                        Sin cuerpo técnico asignado. Nadie ve este equipo todavía.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {people.map(({ staff, role }) => (
                          <span
                            key={staff!.id}
                            className="inline-flex items-center gap-2 rounded-xl border border-ink-200 py-1.5 pl-1.5 pr-2.5"
                          >
                            <Avatar name={staff!.name} size={26} />
                            <span className="text-[13px] text-ink-700">{staff!.name}</span>
                            <span className="text-[11.5px] text-ink-400">{ROLE_LABEL[role]}</span>
                            <button
                              onClick={async () => {
                                try {
                                  await actions.unassignStaff(team.id, staff!.id);
                                  toast.success('Asignación retirada');
                                } catch (e) {
                                  toast.error('No hemos podido retirarla', humanError(e));
                                }
                              }}
                              className="text-ink-300 transition-colors hover:text-danger"
                              aria-label={`Quitar a ${staff!.name}`}
                            >
                              <X size={14} />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        ))}

      {tab === 'personas' && (
        <div className="space-y-3">
          {data.staff.length === 0 ? (
            <Card>
              <EmptyState icon={<Users size={26} />} title="Todavía no hay nadie registrado" />
            </Card>
          ) : (
            data.staff.map((person) => <StaffRow key={person.id} person={person} />)
          )}

          <Card className="bg-ink-50/60 p-5">
            <h3 className="text-[14.5px] font-semibold">Cómo se da de alta a una entrenadora</h3>
            <ol className="mt-2.5 space-y-1.5 text-[13px] leading-relaxed text-ink-600">
              <li>1. Ella entra en la plataforma y pulsa «Crear cuenta» con su correo.</li>
              <li>2. Aparece en esta lista sin ningún equipo asignado.</li>
              <li>3. Tú le asignas su equipo desde la pestaña «Equipos».</li>
              <li>4. A partir de ese momento ve su equipo y sólo el suyo.</li>
            </ol>
          </Card>
        </div>
      )}

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
      toast.success('Rol actualizado ✓');
    } catch (e) {
      toast.error('No hemos podido cambiar el rol', humanError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="flex flex-wrap items-center gap-4 p-4">
      <Avatar name={person.name} size={42} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14.5px] font-medium text-ink-900">{person.name}</p>
        <p className="truncate text-[12.5px] text-ink-500">{person.email}</p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {teams.length === 0 ? (
            <Badge tone="warning" size="sm">
              Sin equipo
            </Badge>
          ) : (
            teams.map((t) => (
              <Badge key={t} tone="brand" size="sm">
                {t}
              </Badge>
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
    </Card>
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
      toast.success('Asignada al equipo ✓', 'Ya puede ver y gestionar este equipo al entrar.');
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
      subtitle="Sólo verá los equipos que le asignes."
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
        <p className="text-[14px] leading-relaxed text-ink-600">
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
