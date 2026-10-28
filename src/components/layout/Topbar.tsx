import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, LogOut, PanelLeftOpen, Plus, Search } from 'lucide-react';
import { Avatar, Button, Dot, Dropdown, MenuItem } from '@/components/ui';
import { CUENTA } from './navigation';
import { useClub } from '@/store/store';
import { currentStaff } from '@/store/selectors';
import { cn, relativeTime } from '@/lib/utils';
import type { Notification } from '@/types';

type Tono = 'bad' | 'info' | 'neutral' | 'warn';

const NOTIF_TONE: Record<Notification['icon'], Tono> = {
  alerta: 'bad',
  calendario: 'info',
  mensaje: 'neutral',
  tarea: 'neutral',
  partido: 'warn',
  plan: 'info',
};

/* La columna de la base es texto libre y la escribe también el webhook de
   Stripe. Un valor que esta versión no conozca no puede dejar el punto sin
   color: el aviso se vería a medias y parecería un fallo de pintado. */
const tonoDe = (icon: string): Tono => NOTIF_TONE[icon as Notification['icon']] ?? 'neutral';

export function Topbar({
  onSearch, onCreate, menu, onMenu,
}: {
  onSearch: () => void;
  onCreate: () => void;
  /** Si el menú de la izquierda está desplegado. */
  menu: boolean;
  onMenu: () => void;
}) {
  const { data, actions, signOut } = useClub();
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
    /* LA CABECERA NO TIENE FONDO. Tenía uno opaco porque todo lo de debajo
       era oscuro y había que tapar el contenido que se desplazaba por
       detrás. Ahora el fondo de la plataforma es una imagen y lo que flota
       encima son piezas claras translúcidas: el buscador y los dos botones
       redondos. La barra en sí desaparece —ni fondo ni línea— y lo que se ve
       es la imagen con tres objetos encima.
       LO QUE SÍ LLEVA ES UN VELO QUE SE DESVANECE, el mismo recurso que la
       pastilla de abajo y por el mismo motivo: sin él, el contenido que se
       desplaza aparecía cortado a cuchillo justo detrás del buscador —media
       etiqueta de un acceso asomando por el canto de arriba— y parecía un
       fallo de maquetación. Con el velo, lo que pasa por detrás se apaga
       antes de llegar. Es un degradado, no un desenfoque: cuesta cero. */
    <header
      className="sticky top-0 z-nav flex items-center gap-2.5 px-4 sm:gap-3 lg:border-b lg:border-line lg:bg-surface lg:px-6"
      style={{ height: 'calc(var(--header-h) + var(--safe-top))', paddingTop: 'var(--safe-top)' }}
    >
      <div
        aria-hidden
        /* DEL COLOR DEL TEMA, Y CON DESENFOQUE.
           El velo era `rgba(10,10,12,…)` fijo: negro. Venía de cuando el
           móvil tenía marco oscuro, y sobre el fondo claro de ahora era
           justo la «franja negra de arriba, detrás de la Dynamic Island».
           Ahora sale de `--surface`, así que en claro es gris claro y en
           oscuro es oscuro, sin tocar nada más.
           Y lleva desenfoque además del degradado: lo que pasa por detrás se
           difumina en vez de verse nítido asomando bajo la isla. */
        className="absolute inset-x-0 top-0 -z-10 backdrop-blur-xl lg:hidden"
        style={{
          height: 'calc(var(--header-h) + var(--safe-top) + 20px)',
          background:
            'linear-gradient(to bottom, rgb(var(--surface) / 0.92) 0%,'
            + ' rgb(var(--surface) / 0.58) 55%, rgb(var(--surface) / 0) 100%)',
          maskImage: 'linear-gradient(to bottom, #000 62%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, #000 62%, transparent 100%)',
        }}
      />
      {/* QUIÉN ERES, A LA IZQUIERDA. La hamburguesa estaba aquí y se ha ido
          abajo, a la pastilla, por un motivo que se ve en cuanto abres
          Entrenamientos: con el menú en la cabecera, la navegación de abajo
          no marcaba nada en ocho de las once secciones. Ahora la cabecera se
          queda con lo suyo —quién eres, buscar y los avisos— y la pastilla
          siempre dice dónde estás.

          Sin logotipo, también a propósito: ocupaba de 96 a 150 px de una
          barra de 320 para decir dónde estás cuando ya estás dentro. La
          marca está en la portada, en la entrada y en el cajón. */}
      {/* TU AVATAR ABRE TU CUENTA, y eso es lo que sustituye al cajón de once
          secciones en el móvil. Antes llevaba directamente a «Mi perfil» y
          Ajustes vivía en la lista del cajón; sin cajón, Ajustes tenía que
          estar en algún sitio, y el sitio donde cualquiera lo busca en una
          aplicación del teléfono es detrás de su propia cara. */}
      <Dropdown
        align="left"
        className="w-[228px]"
        trigger={
          <button aria-label="Mi cuenta" className="-ml-0.5 shrink-0 lg:hidden">
            <Avatar name={staff?.name ?? '—'} size={38} />
          </button>
        }
      >
        {(close) => (
          <>
            <p className="truncate px-2.5 pb-1.5 pt-1 text-sm font-semibold text-ink-900">
              {staff?.name ?? '—'}
            </p>
            {CUENTA.map((p) => (
              <MenuItem key={p.to} to={p.to} onClick={close}>
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
        /* GRIS CLARO TRANSLÚCIDO, ICONO Y TEXTO OSCUROS. Era blanco al 7 %
           sobre azul noche —una mancha más clara sobre oscuro—; ahora es una
           superficie clara de verdad sobre el negro, que es lo que la hace
           legible y lo que la convierte en un objeto y no en un hueco. */
        className="flex h-[38px] min-w-0 flex-1 items-center gap-2 rounded-full bg-raised/80 px-3.5 text-left text-base text-ink-600 backdrop-blur-sm transition-colors active:bg-ink-0 sm:max-w-[420px] lg:ml-0 lg:mr-auto lg:h-8 lg:max-w-[300px] lg:flex-none lg:gap-2 lg:rounded-md lg:border lg:border-line lg:bg-panel lg:px-2.5 lg:text-sm lg:text-ink-500 lg:backdrop-blur-none lg:hover:border-line-fuerte"
      >
        <Search size={17} className="shrink-0 lg:hidden" />
        <Search size={15} className="hidden shrink-0 lg:block" />
        <span className="truncate lg:hidden">Buscar</span>
        <span className="hidden lg:inline">Buscar jugador, sesión, partido…</span>
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
              className="relative grid h-10 w-10 place-items-center rounded-full bg-raised/80 text-ink-800 backdrop-blur-sm transition-colors active:bg-ink-0 lg:h-8 lg:w-8 lg:rounded-md lg:bg-transparent lg:text-ink-500 lg:backdrop-blur-none lg:hover:bg-raised lg:hover:text-ink-900"
              aria-label={unread > 0 ? `Notificaciones, ${unread} sin leer` : 'Notificaciones'}
            >
              <Bell size={18} />
              {unread > 0 && (
                <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-[16px] place-items-center rounded-full bg-ink-900 px-1 text-[9px] font-bold tabular-nums text-ink-0 ring-2 ring-ink-0 lg:ring-surface">
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
                      <Dot tone={tonoDe(n.icon)} className="mt-1.5" />
                      <span className="min-w-0 flex-1">
                        <span className={cn('block text-sm leading-snug', n.read ? 'text-ink-700' : 'font-medium text-ink-900')}>
                          {n.title}
                        </span>
                        {n.detail && <span className="mt-0.5 block truncate text-xs text-muted">{n.detail}</span>}
                        <span className="mt-0.5 block text-2xs text-ink-500">{relativeTime(n.createdAt)}</span>
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </Dropdown>

      </div>
    </header>
  );
}
