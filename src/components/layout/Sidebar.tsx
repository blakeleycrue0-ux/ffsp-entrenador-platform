import { PanelLeftClose } from 'lucide-react';
import { MenuCabecera, MenuCrear, MenuPie, MenuSecciones } from './MenuContenido';

/**
 * El menú fijo del escritorio.
 *
 * Todo lo que hay dentro vive en `MenuContenido` y lo comparte con el cajón
 * del móvil: una sola lista de secciones, dos marcos. Esto sólo pone el
 * marco.
 *
 * Todo es del mismo azul noche: la barra y el contenido. Lo que las separa es
 * una línea de un píxel, no un cambio de fondo. En un tema oscuro, meter el
 * menú en otro tono sólo añade una mancha; lo que ordena la pantalla es el
 * aire y el peso del texto.
 */
export function Sidebar({ onCreate, onPlegar }: { onCreate: () => void; onPlegar: () => void }) {
  return (
    <aside className="fixed inset-y-0 left-0 z-nav hidden w-[var(--sidebar-w)] flex-col border-r border-line bg-surface lg:flex">
      <MenuCabecera
        accion={
          /* 236 px de menú permanente son 236 px que no tiene la pizarra, y en
             un portátil eso es la diferencia entre ver el campo y mirarlo de
             lejos. */
          <button
            onClick={onPlegar}
            aria-label="Plegar el menú"
            title="Plegar el menú (⌘B)"
            className="-mr-1 grid h-8 w-8 shrink-0 place-items-center rounded-lg text-ink-500 transition-colors hover:bg-raised hover:text-ink-900"
          >
            <PanelLeftClose size={16} />
          </button>
        }
      />
      <MenuCrear onCreate={onCreate} />
      <MenuSecciones />
      <MenuPie />
    </aside>
  );
}
