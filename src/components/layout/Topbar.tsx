import { Link, useNavigate } from 'react-router-dom';
import {
  AlertTriangle, Bell, CalendarDays, CheckCheck, ClipboardList, MessageSquare, Plus, Search, Swords,
} from 'lucide-react';
import { Avatar, Badge, Button, Dropdown } from '@/components/ui';
import { Wordmark } from '@/components/ui/Brand';
import { useClub } from '@/store/store';
import { currentStaff } from '@/store/selectors';
import { cn, relativeTime } from '@/lib/utils';
import type { Notification } from '@/types';

const NOTIF_ICON: Record<Notification['icon'], typeof Bell> = {
  alerta: AlertTriangle,
  calendario: CalendarDays,
  mensaje: MessageSquare,
  tarea: ClipboardList,
  partido: Swords,
};

const NOTIF_TONE: Record<Notification['icon'], string> = {
  alerta: 'bg-sun/12 text-[#9A6412]',
  calendario: 'bg-brand-50 text-brand-700',
  mensaje: 'bg-pitch/10 text-[#1F6B44]',
  tarea: 'bg-ink-100 text-ink-600',
  partido: 'bg-brand-100 text-brand-800',
};

export function Topbar({ onSearch, onCreate }: { onSearch: () => void; onCreate: () => void }) {
  const { data, actions } = useClub();
  const navigate = useNavigate();
  const staff = currentStaff(data);
  const unread = data.notifications.filter((n) => !n.read).length;

  const openNotification = (n: Notification, close: () => void) => {
    void actions.readNotification(n.id);
    if (n.link) navigate(n.link);
    close();
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-ink-200/80 bg-white/85 px-4 backdrop-blur-md lg:px-8">
      {/* Marca sólo en móvil (en escritorio ya está en el sidebar) */}
      <Link to="/app" className="lg:hidden">
        <Wordmark size="sm" showSubtitle={false} />
      </Link>

      {/* Buscador */}
      <button
        onClick={onSearch}
        className="ml-auto flex items-center gap-2.5 rounded-xl border border-ink-200 bg-white px-3 py-2 text-[13.5px] text-ink-400 transition-colors hover:border-brand-300 hover:bg-brand-50/40 lg:ml-0 lg:mr-auto lg:w-[340px]"
      >
        <Search size={16} className="shrink-0" />
        <span className="hidden lg:inline">Buscar en el club…</span>
        <kbd className="ml-auto hidden rounded-md border border-ink-200 px-1.5 py-0.5 text-[10.5px] font-medium lg:block">
          ⌘K
        </kbd>
      </button>

      <div className="flex items-center gap-1.5">
        <Button size="sm" icon={<Plus size={16} strokeWidth={2.4} />} onClick={onCreate} className="hidden sm:inline-flex lg:hidden">
          Crear
        </Button>

        {/* Centro de notificaciones */}
        <Dropdown
          className="w-[380px] max-w-[calc(100vw-2rem)] p-0"
          trigger={
            <button
              className="relative grid h-10 w-10 place-items-center rounded-xl text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-800"
              aria-label="Notificaciones"
            >
              <Bell size={19} />
              {unread > 0 && (
                <span className="absolute right-2 top-2 grid h-4 min-w-[16px] place-items-center rounded-full bg-brand-700 px-1 text-[10px] font-bold text-white ring-2 ring-white">
                  {unread}
                </span>
              )}
            </button>
          }
        >
          {(close) => (
            <div>
              <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3">
                <p className="text-[14px] font-semibold text-ink-900">Notificaciones</p>
                {unread > 0 && (
                  <button
                    onClick={() => void actions.readAllNotifications()}
                    className="flex items-center gap-1.5 text-[12.5px] font-medium text-brand-700 hover:text-brand-800"
                  >
                    <CheckCheck size={14} /> Marcar todas
                  </button>
                )}
              </div>
              <div className="max-h-[420px] overflow-y-auto p-1.5">
                {data.notifications.length === 0 ? (
                  <p className="px-4 py-10 text-center text-[13.5px] text-ink-500">
                    No tienes notificaciones. Todo bajo control.
                  </p>
                ) : (
                  data.notifications.map((n) => {
                    const Icon = NOTIF_ICON[n.icon];
                    return (
                      <button
                        key={n.id}
                        onClick={() => openNotification(n, close)}
                        className={cn(
                          'flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-ink-50',
                          !n.read && 'bg-brand-50/50',
                        )}
                      >
                        <span className={cn('mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg', NOTIF_TONE[n.icon])}>
                          <Icon size={15} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className={cn('block text-[13.5px] leading-snug', n.read ? 'text-ink-700' : 'font-medium text-ink-900')}>
                            {n.title}
                          </span>
                          {n.detail && <span className="mt-0.5 block truncate text-[12.5px] text-ink-500">{n.detail}</span>}
                          <span className="mt-1 block text-[11.5px] text-ink-400">{relativeTime(n.createdAt)}</span>
                        </span>
                        {!n.read && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-brand-600" />}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </Dropdown>

        <Link to="/app/perfil" className="ml-0.5 lg:hidden">
          <Avatar name={staff?.name ?? '—'} size={34} />
        </Link>
      </div>
    </header>
  );
}

export const DemoBadge = () => (
  <Badge tone="warning" size="sm">
    Datos de demostración
  </Badge>
);
