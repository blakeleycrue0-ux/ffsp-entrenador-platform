/**
 * Navegación móvil — pensada como app nativa, no como web encogida.
 * Cinco destinos fijos + botón flotante de creación rápida sobre el pulgar.
 * "Más" abre una hoja con TODO lo demás: en móvil no se esconden funciones.
 */

import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3, CalendarDays, ClipboardList, Dumbbell, Home, LogOut, MessageSquare, MoreHorizontal,
  Plus, Settings, Shield, Sparkles, Swords, UserRound, Users, UserSquare2, X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useClub } from '@/store/store';
import { currentStaff } from '@/store/selectors';
import { ROLE_LABEL } from '@/services/auth';
import { Avatar } from '@/components/ui';

const TABS = [
  { to: '/app', label: 'Inicio', icon: Home, exact: true },
  { to: '/app/equipos', label: 'Equipos', icon: Shield },
  { to: '/app/planificaciones', label: 'Planificar', icon: UserSquare2 },
  { to: '/app/mensajes', label: 'Mensajes', icon: MessageSquare },
];

const MORE = [
  { to: '/app/jugadoras', label: 'Jugadoras', icon: Users },
  { to: '/app/calendario', label: 'Calendario', icon: CalendarDays },
  { to: '/app/partidos', label: 'Partidos', icon: Swords },
  { to: '/app/asistencia', label: 'Asistencia', icon: ClipboardList },
  { to: '/app/ejercicios', label: 'Ejercicios', icon: Dumbbell },
  { to: '/app/asistente', label: 'Asistente IA', icon: Sparkles },
  { to: '/app/estadisticas', label: 'Estadísticas', icon: BarChart3 },
  { to: '/app/configuracion', label: 'Configuración', icon: Settings },
];

const QUICK = [
  { label: 'Nuevo entrenamiento', to: '/app/planificaciones/nuevo', icon: UserSquare2 },
  { label: 'Nuevo partido', to: '/app/partidos/nuevo', icon: Swords },
  { label: 'Nueva jugadora', to: '/app/jugadoras/nueva', icon: Users },
  { label: 'Nuevo mensaje', to: '/app/mensajes/nuevo', icon: MessageSquare },
  { label: 'Nuevo ejercicio', to: '/app/ejercicios/nuevo', icon: Dumbbell },
];

export function BottomNav() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { data, signOut } = useClub();
  const staff = currentStaff(data);
  const [sheet, setSheet] = useState<null | 'more' | 'create'>(null);

  const active = (tab: (typeof TABS)[number]) =>
    tab.exact ? pathname === '/app' || pathname === '/app/' : pathname.startsWith(tab.to);

  const moreActive = MORE.some((m) => pathname.startsWith(m.to));

  return (
    <>
      {/* Botón flotante de creación */}
      <button
        onClick={() => setSheet('create')}
        aria-label="Crear"
        className="fixed bottom-[calc(72px+var(--safe-bottom))] right-4 z-40 grid h-14 w-14 place-items-center rounded-full bg-brand-700 text-white shadow-brand transition-transform active:scale-95 lg:hidden"
      >
        <Plus size={24} strokeWidth={2.3} />
      </button>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-ink-200/80 bg-white/95 pb-[var(--safe-bottom)] backdrop-blur-md lg:hidden">
        <div className="flex h-[64px] items-stretch">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const on = active(tab);
            return (
              <Link
                key={tab.to}
                to={tab.to}
                className="relative flex flex-1 flex-col items-center justify-center gap-1 pt-1"
              >
                {on && <span className="absolute top-0 h-[2.5px] w-8 rounded-b-full bg-brand-700" />}
                <Icon size={21} strokeWidth={on ? 2.2 : 1.8} className={on ? 'text-brand-700' : 'text-ink-400'} />
                <span className={cn('text-[10.5px] font-medium', on ? 'text-brand-800' : 'text-ink-500')}>
                  {tab.label}
                </span>
              </Link>
            );
          })}
          <button
            onClick={() => setSheet('more')}
            className="relative flex flex-1 flex-col items-center justify-center gap-1 pt-1"
          >
            {moreActive && <span className="absolute top-0 h-[2.5px] w-8 rounded-b-full bg-brand-700" />}
            <MoreHorizontal size={21} strokeWidth={moreActive ? 2.2 : 1.8} className={moreActive ? 'text-brand-700' : 'text-ink-400'} />
            <span className={cn('text-[10.5px] font-medium', moreActive ? 'text-brand-800' : 'text-ink-500')}>Más</span>
          </button>
        </div>
      </nav>

      {/* Hoja inferior */}
      {sheet && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <div className="absolute inset-0 bg-ink-900/25 backdrop-blur-[2px] animate-fade-in" onClick={() => setSheet(null)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[82vh] overflow-y-auto rounded-t-3xl bg-white pb-[calc(1.25rem+var(--safe-bottom))] shadow-pop animate-slide-up">
            <div className="sticky top-0 flex items-center justify-between bg-white px-5 pb-3 pt-4">
              <div className="absolute left-1/2 top-2 h-1 w-10 -translate-x-1/2 rounded-full bg-ink-200" />
              <p className="mt-2 text-[16px] font-semibold text-ink-900">
                {sheet === 'create' ? 'Crear' : 'Todas las secciones'}
              </p>
              <button
                onClick={() => setSheet(null)}
                className="mt-2 rounded-lg p-1.5 text-ink-400 hover:bg-ink-100"
                aria-label="Cerrar"
              >
                <X size={19} />
              </button>
            </div>

            {sheet === 'create' ? (
              <div className="px-4 pt-1">
                {QUICK.map((q) => {
                  const Icon = q.icon;
                  return (
                    <button
                      key={q.label}
                      onClick={() => {
                        navigate(q.to);
                        setSheet(null);
                      }}
                      className="flex w-full items-center gap-3.5 rounded-xl px-3 py-3.5 text-left transition-colors active:bg-brand-50"
                    >
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700">
                        <Icon size={19} />
                      </span>
                      <span className="text-[15px] font-medium text-ink-900">{q.label}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-2 px-4 pt-1">
                  {MORE.map((m) => {
                    const Icon = m.icon;
                    const on = pathname.startsWith(m.to);
                    return (
                      <button
                        key={m.to}
                        onClick={() => {
                          navigate(m.to);
                          setSheet(null);
                        }}
                        className={cn(
                          'flex flex-col items-center gap-2 rounded-2xl border p-3.5 transition-colors',
                          on ? 'border-brand-300 bg-brand-50' : 'border-ink-200 active:bg-ink-50',
                        )}
                      >
                        <Icon size={21} className={on ? 'text-brand-700' : 'text-ink-500'} />
                        <span className={cn('text-center text-[12px] font-medium leading-tight', on ? 'text-brand-800' : 'text-ink-700')}>
                          {m.label}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-5 border-t border-ink-100 px-4 pt-4">
                  <button
                    onClick={() => {
                      navigate('/app/perfil');
                      setSheet(null);
                    }}
                    className="flex w-full items-center gap-3 rounded-xl p-2 text-left active:bg-ink-50"
                  >
                    <Avatar name={staff?.name ?? '—'} size={40} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-medium text-ink-900">{staff?.name}</span>
                      <span className="block text-[12.5px] text-ink-500">{staff ? ROLE_LABEL[staff.role] : ''}</span>
                    </span>
                    <UserRound size={18} className="text-ink-300" />
                  </button>
                  <button
                    onClick={() => void signOut()}
                    className="mt-1 flex w-full items-center gap-3 rounded-xl px-2 py-3 text-left text-[14px] font-medium text-danger active:bg-danger/5"
                  >
                    <LogOut size={18} /> Cerrar sesión
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
