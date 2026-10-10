import { Link, useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, Menu, PanelLeftOpen, Plus, Search } from 'lucide-react';
import { Avatar, Button, Dot, Dropdown } from '@/components/ui';
import { Marca, Wordmark } from '@/components/ui/Brand';
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

export function Topbar({
  onSearch, onCreate, menu, onMenu, onCajon,
}: {
  onSearch: () => void;
  onCreate: () => void;
  /** Si el menú de la izquierda está desplegado. */
  menu: boolean;
  onMenu: () => void;
  /** Abre el cajón del móvil. */
  onCajon: () => void;
}) {
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
    /* EL FONDO TIENE QUE TAPAR. Estaba con `bg-panel`, que es un 4,5 % de
       blanco: la cabecera se quedaba pegada arriba y el contenido de la página
       pasaba por DEBAJO y se leía a través de ella, cruzándose con el logo y
       los iconos. Un fondo casi transparente en algo pegajoso no es un estilo,
       es un fallo. Cristal ahumado: tapa, desenfoca y se sigue notando poco. */
    <header
      className="cristal-firme sticky top-0 z-nav flex items-center gap-3 rounded-none border-x-0 border-t-0 px-4 lg:px-6"
      style={{ height: 'calc(var(--header-h) + var(--safe-top))', paddingTop: 'var(--safe-top)' }}
    >
      {/* LA HAMBURGUESA, Y LA PRIMERA. En el móvil es lo único que lleva a
          todas las secciones, así que va donde se busca: arriba a la
          izquierda, antes del nombre. */}
      <button
        onClick={onCajon}
        aria-label="Abrir el menú"
        className="-ml-1.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl text-ink-700 transition-colors active:bg-raised lg:hidden"
      >
        <Menu size={20} />
      </button>

      {/* A 320 px NO CABE EL NOMBRE ENTERO. Medido: con la hamburguesa, la
          lupa, el más, la campana y el avatar —cinco objetos de 40 px, que es
          lo que mide un dedo— el logotipo completo sacaba la cabecera 38 px
          por el lado en TODAS las pantallas. Hasta 380 px va sólo el símbolo,
          que es el que se reconoce; a partir de ahí, el nombre completo. */}
      <Link to="/app" aria-label="Inicio" className="shrink-0 min-[380px]:hidden">
        <Marca size={22} />
      </Link>
      <Link to="/app" className="hidden shrink-0 min-[380px]:block lg:hidden">
        <Wordmark size="sm" showSubtitle={false} />
      </Link>

      {/* Sólo cuando está plegado: con el menú a la vista, el botón de
          desplegarlo no dice nada y el de plegarlo ya está dentro de él. */}
      {!menu && (
        <button
          onClick={onMenu}
          aria-label="Mostrar el menú"
          title="Mostrar el menú (⌘B)"
          className="hidden h-8 w-8 shrink-0 place-items-center rounded-lg text-ink-500 transition-colors hover:bg-raised hover:text-ink-900 lg:grid"
        >
          <PanelLeftOpen size={16} />
        </button>
      )}

      {/* LA BÚSQUEDA. En el escritorio es un campo con su atajo a la vista; en
          el móvil, donde no hay sitio, se queda en el icono —pero con 40 px de
          lado, no 32: por debajo de 44 el dedo falla, y la diferencia entre
          fallar y acertar en una barra con cuatro botones seguidos es que se
          pulse la lupa o la campana. */}
      <button
        onClick={onSearch}
        aria-label="Buscar"
        className="ml-auto grid h-10 w-10 shrink-0 place-items-center rounded-xl text-ink-600 transition-colors active:bg-raised lg:ml-0 lg:mr-auto lg:flex lg:h-8 lg:w-[300px] lg:items-center lg:justify-start lg:gap-2 lg:rounded-md lg:border lg:border-line lg:bg-panel lg:px-2.5 lg:text-sm lg:text-ink-400 lg:hover:border-ink-400"
      >
        <Search size={18} className="shrink-0 lg:hidden" />
        <Search size={15} className="hidden shrink-0 lg:block" />
        <span className="hidden lg:inline">Buscar jugadora, sesión, partido…</span>
        <kbd className="ml-auto hidden rounded border border-line px-1 py-px text-2xs font-medium lg:block">⌘K</kbd>
      </button>

      <div className="flex items-center gap-0.5 sm:gap-1.5">
        {/* CREAR, TAMBIÉN EN EL MÓVIL. Estaba en `hidden sm:inline-flex`, así
            que en un teléfono de 390 px la acción principal de la aplicación
            no existía en pantalla: había que abrir el menú para encontrarla.
            Aquí es el signo más, en azul, del tamaño del dedo. */}
        <button
          onClick={onCreate}
          aria-label="Crear"
          className="metal-claro grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white sm:hidden"
        >
          <Plus size={19} strokeWidth={2.2} />
        </button>
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
              className="relative grid h-10 w-10 place-items-center rounded-xl text-ink-600 transition-colors active:bg-raised hover:bg-surface hover:text-ink-900 lg:h-8 lg:w-8 lg:rounded-md"
              aria-label={unread > 0 ? `Notificaciones, ${unread} sin leer` : 'Notificaciones'}
            >
              <Bell size={18} />
              {unread > 0 && (
                <span className="absolute right-1 top-1 grid h-4 min-w-[16px] place-items-center rounded-full bg-marca-600 px-1 text-[9px] font-bold tabular-nums text-white ring-2 ring-surface">
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

        <Link
          to="/app/perfil"
          aria-label="Mi perfil"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl transition-colors active:bg-raised lg:hidden"
        >
          <Avatar name={staff?.name ?? '—'} size={30} />
        </Link>
      </div>
    </header>
  );
}
