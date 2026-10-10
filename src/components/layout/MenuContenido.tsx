/**
 * El contenido del menú: UNO, en dos presentaciones.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Antes había dos navegaciones distintas y sin relación: la barra lateral del
 * escritorio, con las once secciones agrupadas, y un dique en el móvil con
 * cuatro atajos más una hoja «Más» que repetía el resto en otro orden. Dos
 * listas que decían lo mismo de dos maneras, y cada sección nueva había que
 * acordarse de meterla en las dos.
 *
 * Ahora esto es la lista, y hay dos marcos que la enseñan:
 *
 *   · `Sidebar`   — fija a la izquierda, a partir de 1024 px.
 *   · `MenuMovil` — un cajón que entra desde la izquierda, por debajo.
 *
 * El mismo orden, los mismos grupos y la misma marca de «sección abierta» en
 * los dos sitios. Quien aprende dónde está «Pizarra táctica» en el ordenador
 * la encuentra en el mismo sitio en el móvil.
 */

import { Link, useLocation } from 'react-router-dom';
import { ChevronsUpDown, LogOut, Plus, UserRound } from 'lucide-react';
import { ClubCrest } from '@/components/ui/Brand';
import { Avatar, Dropdown, MenuItem } from '@/components/ui';
import { NAV, isActive } from './navigation';
import { useClub } from '@/store/store';
import { clubName, currentStaff, visibleTeams } from '@/store/selectors';
import { ROLE_LABEL } from '@/services/auth';
import { cn } from '@/lib/utils';

/** El club y el selector de equipo: el contexto de todo lo demás. */
export function MenuCabecera({ accion }: { accion?: React.ReactNode }) {
  const { data, teamId, setTeamId } = useClub();
  const teams = visibleTeams(data);
  const activeTeam = teams.find((t) => t.id === teamId) ?? teams[0];

  return (
    <>
      <div className="flex items-center gap-2.5 px-4 py-4">
        <ClubCrest name={clubName(data)} src={data.club?.crestUrl} size={30} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold leading-tight text-ink-900">
            {clubName(data)}
          </p>
          {data.club?.season && <p className="text-xs text-ink-500">{data.club.season}</p>}
        </div>
        {accion}
      </div>

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
                    t.id === activeTeam?.id ? 'bg-marca-600/14 font-medium text-ink-900' : 'text-ink-700 hover:bg-surface',
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
    </>
  );
}

/** El botón de crear. */
export function MenuCrear({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="px-3 pb-2">
      <button
        onClick={onCreate}
        className="metal-claro flex h-11 w-full items-center justify-center gap-2 rounded-xl px-3 text-base font-medium text-white"
      >
        <Plus size={16} strokeWidth={2.2} />
        Crear
      </button>
    </div>
  );
}

/** Las secciones, agrupadas. `onIr` sirve para cerrar el cajón al navegar. */
export function MenuSecciones({ onIr }: { onIr?: () => void }) {
  const { pathname } = useLocation();
  return (
    <nav aria-label="Secciones" className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
      {NAV.map((group) => (
        <div key={group.id} className="mb-0.5">
          {group.label && (
            <p className="px-3 pb-1.5 pt-5 font-display text-2xs font-semibold uppercase tracking-[0.12em] text-ink-400">
              {group.label}
            </p>
          )}
          <ul className="space-y-px">
            {group.items.map((item) => {
              const active = isActive(pathname, item);
              return (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    onClick={onIr}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      /* Sin icono, lo que marca la sección abierta es el peso
                         del texto, el fondo azul y la barra de la izquierda. */
                      'relative flex items-center rounded-2xl py-2.5 pl-4 pr-3 text-md transition-colors',
                      active
                        ? 'bg-marca-600/14 font-semibold text-ink-900'
                        : 'font-medium text-ink-500 hover:bg-panel hover:text-ink-900',
                    )}
                  >
                    {active && (
                      <span
                        aria-hidden
                        className="absolute inset-y-2.5 left-0 w-[3px] rounded-full bg-marca-500"
                      />
                    )}
                    <span className="truncate">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

/** Quién eres, y cómo salir. */
export function MenuPie({ onIr }: { onIr?: () => void }) {
  const { data, signOut } = useClub();
  const staff = currentStaff(data);

  return (
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
            <MenuItem icon={<UserRound size={15} />} to="/app/perfil" onClick={() => { close(); onIr?.(); }}>
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
  );
}
