import { Link, useLocation } from 'react-router-dom';
import { ChevronsUpDown, LogOut, Plus, UserRound } from 'lucide-react';
import { ClubCrest } from '@/components/ui/Brand';
import { Avatar, Dropdown, MenuItem } from '@/components/ui';
import { NAV, isActive } from './navigation';
import { useClub } from '@/store/store';
import { clubName, currentStaff, visibleTeams } from '@/store/selectors';
import { ROLE_LABEL } from '@/services/auth';
import { cn } from '@/lib/utils';

export function Sidebar({ onCreate }: { onCreate: () => void }) {
  const { data, teamId, setTeamId, signOut } = useClub();
  const { pathname } = useLocation();
  const staff = currentStaff(data);
  const teams = visibleTeams(data);
  const activeTeam = teams.find((t) => t.id === teamId) ?? teams[0];

  return (
    /* Todo es negro: la barra y el contenido. Lo que las separa es una línea
       de un píxel, no un cambio de fondo. En un tema oscuro, meter el menú en
       otro tono sólo añade una mancha; lo que ordena la pantalla es el aire y
       el peso del texto. */
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[var(--sidebar-w)] flex-col border-r border-line bg-surface lg:flex">
      {/* El club de quien trabaja aquí, no la marca del producto */}
      <div className="flex items-center gap-2.5 px-4 py-4">
        <ClubCrest name={clubName(data)} src={data.club?.crestUrl} size={30} />
        <div className="min-w-0">
          <p className="truncate text-base font-semibold leading-tight text-ink-900">
            {clubName(data)}
          </p>
          {data.club?.season && <p className="text-xs text-ink-500">{data.club.season}</p>}
        </div>
      </div>

      {/* Equipo activo: da contexto a todas las pantallas */}
      <div className="px-3 pb-3">
        <Dropdown
          align="left"
          className="w-[212px]"
          trigger={
            <button className="flex w-full items-center gap-2 rounded-2xl bg-panel px-3 py-2.5 text-left transition-colors hover:bg-raised">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-ink-900">
                  {activeTeam?.name ?? 'Sin equipo'}
                </span>
                <span className="block truncate text-xs text-ink-500">
                  {activeTeam?.season || 'Pendiente de asignación'}
                </span>
              </span>
              <ChevronsUpDown size={14} className="shrink-0 text-ink-400" />
            </button>
          }
        >
          {(close) => (
            <>
              <p className="eyebrow px-2.5 py-1.5">Equipos</p>
              {teams.length === 0 && (
                <p className="px-2.5 py-2 text-sm leading-relaxed text-muted">
                  Todavía no tienes ningún equipo asignado.
                </p>
              )}
              {teams.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setTeamId(t.id);
                    close();
                  }}
                  className={cn(
                    'flex w-full items-center justify-between gap-2 rounded px-2.5 py-1.5 text-left text-base transition-colors',
                    t.id === activeTeam?.id ? 'bg-surface font-medium text-ink-900' : 'text-ink-700 hover:bg-surface',
                  )}
                >
                  <span className="truncate">{t.name}</span>
                  <span className="text-xs tabular-nums text-ink-400">
                    {data.players.filter((p) => p.teamId === t.id && !p.archivedAt).length}
                  </span>
                </button>
              ))}
            </>
          )}
        </Dropdown>
      </div>

      <div className="px-3 pb-2">
        <button
          onClick={onCreate}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-ink-900 px-3 text-base font-semibold text-ink-0 transition-colors hover:bg-ink-800"
        >
          <Plus size={16} strokeWidth={2.2} />
          Crear
        </button>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
        {NAV.map((group) => (
          <div key={group.id} className="mb-0.5">
            {group.label && (
              <p className="px-3 pb-1.5 pt-5 text-2xs font-semibold uppercase tracking-[0.07em] text-ink-400">
                {group.label}
              </p>
            )}
            <ul className="space-y-px">
              {group.items.map((item) => {
                const active = isActive(pathname, item);
                const Icon = item.icon;
                return (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'relative flex items-center gap-3 rounded-2xl px-3 py-2.5 text-base transition-colors',
                        active
                          ? 'bg-panel font-semibold text-ink-900'
                          : 'text-ink-600 hover:bg-panel hover:text-ink-900',
                      )}
                    >
                      {/* La sección abierta se marca también con una barra
                          verde: el color de fondo solo no se distingue bien en
                          una pantalla a pleno sol, que es donde se usa esto. */}
                      {active && (
                        <span
                          aria-hidden
                          className="absolute inset-y-2.5 left-0 w-[3px] rounded-full bg-ink-900"
                        />
                      )}
                      <Icon
                        size={17}
                        className={cn('shrink-0', active ? 'text-ink-900' : 'text-ink-400')}
                      />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-line p-2.5">
        <Dropdown
          align="left"
          className="bottom-full mb-2 w-[212px]"
          trigger={
            <button className="flex w-full items-center gap-2.5 rounded-2xl px-2 py-2 text-left transition-colors hover:bg-panel">
              <Avatar name={staff?.name ?? '—'} size={30} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-ink-900">{staff?.name}</span>
                <span className="block truncate text-xs text-ink-500">{staff ? ROLE_LABEL[staff.role] : ''}</span>
              </span>
              <ChevronsUpDown size={14} className="shrink-0 text-ink-400" />
            </button>
          }
        >
          {(close) => (
            <>
              <MenuItem icon={<UserRound size={15} />} to="/app/perfil" onClick={close}>
                Mi perfil
              </MenuItem>
              <div className="my-1 hairline" />
              <MenuItem icon={<LogOut size={15} />} tone="danger" onClick={signOut}>
                Cerrar sesión
              </MenuItem>
            </>
          )}
        </Dropdown>
      </div>
    </aside>
  );
}
