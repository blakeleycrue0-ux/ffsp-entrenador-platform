import { Link, useLocation } from 'react-router-dom';
import { ChevronsUpDown, LogOut, Plus, Settings, UserRound } from 'lucide-react';
import { Wordmark } from '@/components/ui/Brand';
import { Avatar, Dropdown, MenuItem } from '@/components/ui';
import { NAV, isActive } from './navigation';
import { useClub } from '@/store/store';
import { currentStaff, visibleTeams } from '@/store/selectors';
import { ROLE_LABEL } from '@/services/auth';
import { cn } from '@/lib/utils';

export function Sidebar({ onCreate }: { onCreate: () => void }) {
  const { data, session, teamId, setTeamId, signOut } = useClub();
  const { pathname } = useLocation();
  const staff = currentStaff(data, session?.staffId);
  const teams = visibleTeams(data, staff);
  const activeTeam = teams.find((t) => t.id === teamId) ?? teams[0];

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[var(--sidebar-w)] flex-col border-r border-ink-200/80 bg-white lg:flex">
      <div className="px-5 py-5">
        <Link to="/app" className="inline-block">
          <Wordmark />
        </Link>
      </div>

      {/* Selector de equipo activo: da contexto a todas las pantallas */}
      <div className="px-3.5 pb-4">
        <Dropdown
          align="left"
          className="w-[232px]"
          trigger={
            <button className="flex w-full items-center gap-2.5 rounded-xl border border-ink-200 bg-white px-3 py-2.5 text-left transition-colors hover:border-brand-300 hover:bg-brand-50/40">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-brand-700 text-[11px] font-bold text-white">
                {activeTeam?.name.replace(/[^A-Z0-9]/gi, '').slice(0, 2).toUpperCase() ?? '—'}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13.5px] font-semibold text-ink-900">
                  {activeTeam?.name ?? 'Sin equipo'}
                </span>
                <span className="block truncate text-[11.5px] text-ink-400">{activeTeam?.season}</span>
              </span>
              <ChevronsUpDown size={15} className="shrink-0 text-ink-400" />
            </button>
          }
        >
          {(close) => (
            <>
              <p className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-400">
                Equipos asignados
              </p>
              {teams.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setTeamId(t.id);
                    close();
                  }}
                  className={cn(
                    'flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-[14px] transition-colors',
                    t.id === activeTeam?.id ? 'bg-brand-50 text-brand-800' : 'text-ink-700 hover:bg-ink-50',
                  )}
                >
                  <span className="truncate">{t.name}</span>
                  <span className="text-[11.5px] text-ink-400">
                    {data.players.filter((p) => p.teamId === t.id).length}
                  </span>
                </button>
              ))}
            </>
          )}
        </Dropdown>
      </div>

      <div className="px-3.5 pb-3">
        <button
          onClick={onCreate}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-700 px-4 py-2.5 text-[14px] font-medium text-white shadow-brand transition-all hover:bg-brand-800 active:scale-[.985]"
        >
          <Plus size={17} strokeWidth={2.4} />
          Crear
        </button>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-3.5 pb-4">
        {NAV.map((group) => (
          <div key={group.id} className="mb-1">
            {group.label && <p className="section-title px-3 pb-1.5 pt-4">{group.label}</p>}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(pathname, item);
                const Icon = item.icon;
                return (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      className={cn(
                        'group relative flex items-center gap-3 rounded-xl px-3 py-2 text-[14px] font-medium transition-all duration-150',
                        active
                          ? 'bg-brand-50 text-brand-800'
                          : 'text-ink-600 hover:bg-ink-50 hover:text-ink-900',
                      )}
                    >
                      {active && (
                        <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-brand-700" />
                      )}
                      <Icon
                        size={18}
                        strokeWidth={active ? 2.2 : 1.9}
                        className={cn('shrink-0', active ? 'text-brand-700' : 'text-ink-400 group-hover:text-ink-600')}
                      />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Perfil del entrenador */}
      <div className="border-t border-ink-200/80 p-3">
        <Dropdown
          align="left"
          className="bottom-full mb-2 w-[232px]"
          trigger={
            <button className="flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-left transition-colors hover:bg-ink-50">
              <Avatar name={staff?.name ?? '—'} size={34} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13.5px] font-semibold text-ink-900">{staff?.name}</span>
                <span className="block truncate text-[11.5px] text-ink-400">
                  {staff ? ROLE_LABEL[staff.role] : ''}
                </span>
              </span>
              <ChevronsUpDown size={15} className="shrink-0 text-ink-400" />
            </button>
          }
        >
          {(close) => (
            <>
              <MenuItem icon={<UserRound size={16} />} to="/app/perfil" onClick={close}>
                Mi perfil
              </MenuItem>
              <MenuItem icon={<Settings size={16} />} to="/app/configuracion" onClick={close}>
                Configuración
              </MenuItem>
              <div className="my-1 h-px bg-ink-100" />
              <MenuItem icon={<LogOut size={16} />} tone="danger" onClick={signOut}>
                Cerrar sesión
              </MenuItem>
            </>
          )}
        </Dropdown>
      </div>
    </aside>
  );
}
