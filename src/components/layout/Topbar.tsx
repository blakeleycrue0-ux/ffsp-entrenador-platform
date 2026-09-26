import { Link, useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, Plus, Search } from 'lucide-react';
import { Avatar, Button, Dot, Dropdown } from '@/components/ui';
import { Wordmark } from '@/components/ui/Brand';
import { useClub } from '@/store/store';
import { currentStaff } from '@/store/selectors';
import { cn, relativeTime } from '@/lib/utils';
import type { Notification } from '@/types';

const NOTIF_TONE: Record<Notification['icon'], 'bad' | 'info' | 'neutral' | 'warn'> = {
  alerta: 'bad',
  calendario: 'info',
  mensaje: 'neutral',
  tarea: 'neutral',
  partido: 'warn',
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
    <header className="sticky top-0 z-30 flex h-[var(--header-h)] items-center gap-3 border-b border-line bg-panel px-4 lg:px-6">
      <Link to="/app" className="lg:hidden">
        <Wordmark size="sm" showSubtitle={false} />
      </Link>

      <button
        onClick={onSearch}
        className="ml-auto flex h-8 items-center gap-2 rounded-md border border-line bg-panel px-2.5 text-sm text-ink-400 transition-colors hover:border-ink-400 lg:ml-0 lg:mr-auto lg:w-[300px]"
      >
        <Search size={15} className="shrink-0" />
        <span className="hidden lg:inline">Buscar jugadora, sesión, partido…</span>
        <kbd className="ml-auto hidden rounded border border-line px-1 py-px text-2xs font-medium lg:block">⌘K</kbd>
      </button>

      <div className="flex items-center gap-1.5">
        <Button
          size="sm"
          icon={<Plus size={15} strokeWidth={2.2} />}
          onClick={onCreate}
          className="hidden sm:inline-flex lg:hidden"
        >
          Crear
        </Button>

        <Dropdown
          className="w-[340px] max-w-[calc(100vw-2rem)] p-0"
          trigger={
            <button
              className="relative grid h-8 w-8 place-items-center rounded-md text-ink-500 transition-colors hover:bg-surface hover:text-ink-900"
              aria-label={unread > 0 ? `Notificaciones, ${unread} sin leer` : 'Notificaciones'}
            >
              <Bell size={17} />
              {unread > 0 && (
                <span className="absolute right-1 top-1 grid h-3.5 min-w-[14px] place-items-center rounded-full bg-ink-900 px-1 text-[9px] font-bold tabular-nums text-ink-0 ring-2 ring-white">
                  {unread}
                </span>
              )}
            </button>
          }
        >
          {(close) => (
            <div>
              <div className="flex items-center justify-between border-b border-line px-3 py-2">
                <p className="text-base font-semibold">Notificaciones</p>
                {unread > 0 && (
                  <button
                    onClick={() => void actions.readAllNotifications()}
                    className="flex items-center gap-1.5 text-xs font-medium text-ink-700 hover:text-ink-900"
                  >
                    <CheckCheck size={13} /> Marcar todas
                  </button>
                )}
              </div>
              <div className="max-h-[400px] overflow-y-auto p-1">
                {data.notifications.length === 0 ? (
                  <p className="px-4 py-8 text-center text-sm text-muted">No tienes avisos pendientes.</p>
                ) : (
                  data.notifications.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => openNotification(n, close)}
                      className={cn(
                        'flex w-full items-start gap-2.5 rounded px-2.5 py-2 text-left transition-colors hover:bg-surface',
                        !n.read && 'bg-surface',
                      )}
                    >
                      <Dot tone={NOTIF_TONE[n.icon]} className="mt-1.5" />
                      <span className="min-w-0 flex-1">
                        <span className={cn('block text-sm leading-snug', n.read ? 'text-ink-700' : 'font-medium text-ink-900')}>
                          {n.title}
                        </span>
                        {n.detail && <span className="mt-0.5 block truncate text-xs text-muted">{n.detail}</span>}
                        <span className="mt-0.5 block text-2xs text-ink-400">{relativeTime(n.createdAt)}</span>
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </Dropdown>

        <Link to="/app/perfil" className="lg:hidden">
          <Avatar name={staff?.name ?? '—'} size={30} />
        </Link>
      </div>
    </header>
  );
}
