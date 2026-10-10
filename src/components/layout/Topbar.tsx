import { Link, useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, Menu, PanelLeftOpen, Plus, Search } from 'lucide-react';
import { Avatar, Button, Dot, Dropdown } from '@/components/ui';
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
    /* EL FONDO TAPA, Y YA NO DESENFOCA.
       Primero fue `bg-panel` —un 4,5 % de blanco— y el contenido se leía a
       través de la cabecera al desplazarse: un fondo casi transparente en
       algo pegajoso no es un estilo, es un fallo. Se arregló con cristal
       ahumado, que tapa pero pide `backdrop-filter`, y eso obliga al
       navegador a recomponer en cada fotograma todo lo que pasa por debajo.
       Encima de una lista que se desplaza con el dedo es el sitio más caro
       de la aplicación para pedirlo. Ahora es un color opaco: tapa igual,
       cuesta cero. */
    <header
      className="sticky top-0 z-nav flex items-center gap-2.5 border-b border-line-sutil bg-surface px-4 sm:gap-3 lg:px-6"
      style={{ height: 'calc(var(--header-h) + var(--safe-top))', paddingTop: 'var(--safe-top)' }}
    >
      {/* LA HAMBURGUESA, Y LA PRIMERA. En el móvil es lo único que lleva a
          las once secciones, así que va donde se busca: arriba a la
          izquierda. Es un disco, como los otros tres objetos de la barra: lo
          que se pulsa en esta cabecera es redondo, y eso se aprende en dos
          pantallas. */}
      <button
        onClick={onCajon}
        aria-label="Abrir el menú"
        className="-ml-1 grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/[0.07] text-ink-800 transition-colors active:bg-white/[0.14] lg:hidden"
      >
        <Menu size={19} />
      </button>

      {/* SIN LOGOTIPO EN EL MÓVIL, A PROPÓSITO. Ocupaba de 96 a 150 px de una
          barra de 320 para decir dónde estás cuando ya estás dentro: con él,
          la cabecera se salía 38 px —medido— y la búsqueda se quedaba en un
          icono. La marca está en la portada, en la entrada y en el cajón; una
          herramienta no necesita repetirla en cada pantalla. */}

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

      {/* LA BÚSQUEDA ES UNA CÁPSULA, NO UN ICONO. Con el logotipo fuera hay
          sitio de sobra, y una cápsula ancha dice «escribe aquí» mientras que
          una lupa suelta hay que reconocerla. Se estira con lo que sobre, así
          que a 320 px encoge y a 430 crece sin tocar nada. */}
      <button
        onClick={onSearch}
        className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-full bg-white/[0.07] px-3.5 text-left text-base text-ink-500 sm:max-w-[420px] transition-colors active:bg-white/[0.12] lg:ml-0 lg:mr-auto lg:h-8 lg:max-w-[300px] lg:flex-none lg:gap-2 lg:rounded-md lg:border lg:border-line lg:bg-panel lg:px-2.5 lg:text-sm lg:text-ink-400 lg:hover:border-ink-400"
      >
        <Search size={17} className="shrink-0 lg:hidden" />
        <Search size={15} className="hidden shrink-0 lg:block" />
        <span className="truncate lg:hidden">Buscar</span>
        <span className="hidden lg:inline">Buscar jugadora, sesión, partido…</span>
        <kbd className="ml-auto hidden rounded border border-line px-1 py-px text-2xs font-medium lg:block">⌘K</kbd>
      </button>

      <div className="flex items-center gap-0.5 sm:gap-1.5">
        {/* EL «+» NO ESTÁ EN EL MÓVIL, Y NO ES UN OLVIDO. En Inicio, crear son
            los cuatro discos del héroe, que es donde se mira; en cada lista
            —plantilla, entrenamientos, partidos, ejercicios— hay su propio
            botón de crear en la cabecera de la página; y el cajón lleva el
            suyo. Un quinto botón en una barra de 320 px le quitaba el ancho
            a la búsqueda para repetir lo que ya hay dos dedos más abajo. */}
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
              className="relative grid h-10 w-10 place-items-center rounded-full bg-white/[0.07] text-ink-800 transition-colors active:bg-white/[0.14] lg:h-8 lg:w-8 lg:rounded-md lg:bg-transparent lg:text-ink-500 lg:hover:bg-surface lg:hover:text-ink-900"
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

        <Link to="/app/perfil" aria-label="Mi perfil" className="shrink-0 lg:hidden">
          <Avatar name={staff?.name ?? '—'} size={40} />
        </Link>
      </div>
    </header>
  );
}
