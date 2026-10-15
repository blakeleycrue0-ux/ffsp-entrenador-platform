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
import { ChevronsUpDown, LogOut, Plus, Sparkles, UserRound } from 'lucide-react';
import { ClubCrest } from '@/components/ui/Brand';
import { Avatar, Dropdown, MenuItem } from '@/components/ui';
import { CUENTA, SECCIONES, seccionActiva } from './navigation';
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
                    t.id === activeTeam?.id ? 'bg-ink-900/[0.08] font-medium text-ink-900' : 'text-ink-700 hover:bg-surface',
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

/**
 * Las cuatro secciones.
 *
 * Eran once en cuatro grupos con sus títulos —«Equipo», «Trabajo en campo»,
 * «Club»—, y los títulos eran la prueba de que la lista era demasiado larga:
 * una lista que necesita índice no se lee de un vistazo. Ahora son cuatro
 * palabras sin grupos, y lo que había dentro de cada grupo está dentro de su
 * sección, en pestañas, a la vista al llegar.
 */
export function MenuSecciones({ onIr }: { onIr?: () => void }) {
  const { pathname } = useLocation();
  return (
    <nav aria-label="Secciones" className="min-h-0 flex-1 overflow-y-auto px-3 pb-4 pt-2">
      <ul className="space-y-px">
        {SECCIONES.map((s) => {
          const active = seccionActiva(pathname, s);
          const Icono = s.icono;
          return (
            <li key={s.to}>
              <Link
                to={s.to}
                onClick={onIr}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'relative flex items-center gap-3 rounded-2xl py-2.5 pl-4 pr-3 text-md transition-colors',
                  active
                    ? 'bg-ink-900/[0.08] font-semibold text-ink-900'
                    : 'font-medium text-ink-500 hover:bg-panel hover:text-ink-900',
                )}
              >
                {active && (
                  <span
                    aria-hidden
                    className="absolute inset-y-2.5 left-0 w-[3px] rounded-full bg-ink-900"
                  />
                )}
                {/* AHORA SÍ LLEVAN ICONO, y antes no. El motivo de entonces
                    sigue siendo bueno —«Pizarra táctica» no tiene dibujo
                    universal—, pero estas cuatro sí: una casa, un calendario,
                    unas personas y una pesa. Y son las mismas cuatro formas
                    que la pastilla del móvil, así que lo que se aprende en un
                    sitio sirve en el otro. */}
                <Icono size={17} strokeWidth={active ? 2.2 : 1.8} aria-hidden className="shrink-0" />
                <span className="truncate">{s.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>

      {/* ── PREMIUM, Y POR QUÉ NO ES LA QUINTA SECCIÓN ────────────────────
          Las cuatro de arriba contestan una pregunta del trabajo del día:
          qué toca, qué hay esta semana, con quién cuento, qué hacemos en el
          campo. El plan no es ninguna de esas. Metido en la lista sería una
          quinta pregunta que nadie se hace entrenando, y además empujaría la
          pastilla del móvil de cuatro iconos a cinco.

          Pero escondido detrás del avatar tampoco se encuentra: ahí es donde
          estaba, y por eso nadie llegaba. Así que va aquí abajo, separado por
          una línea, con el verde de la casa. Es la misma idea que tiene
          Spotify con «Premium»: se ve siempre, y no se mezcla con lo demás. */}
      <div className="mt-3 border-t border-line pt-3">
        <Link
          to="/app/ajustes/plan"
          onClick={onIr}
          aria-current={pathname.startsWith('/app/ajustes/plan') ? 'page' : undefined}
          className={cn(
            'relative flex items-center gap-3 rounded-2xl py-2.5 pl-4 pr-3 text-md font-medium transition-colors',
            pathname.startsWith('/app/ajustes/plan')
              ? 'bg-ink-900/[0.08] font-semibold text-ink-900'
              : 'text-ink-600 hover:bg-panel hover:text-ink-900',
          )}
        >
          <Sparkles size={17} strokeWidth={1.9} aria-hidden className="shrink-0 text-ink-900" />
          <span className="truncate">Premium</span>
          <span className="ml-auto h-2 w-2 shrink-0 rounded-full bg-lima" aria-hidden />
        </Link>
      </div>
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
            {CUENTA.map((p) => (
              <MenuItem
                key={p.to}
                icon={p.to === '/app/perfil' ? <UserRound size={15} /> : undefined}
                to={p.to}
                onClick={() => { close(); onIr?.(); }}
              >
                {p.label}
              </MenuItem>
            ))}
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
