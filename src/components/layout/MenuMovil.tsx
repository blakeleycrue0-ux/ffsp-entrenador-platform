/**
 * El menú del móvil: un cajón que se abre y SE CIERRA.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * QUÉ SUSTITUYE. Un dique fijo abajo con cuatro atajos y una hoja «Más» con
 * las otras siete secciones. Tres problemas, y los tres se arreglan solos
 * quitándolo:
 *
 *  · NO SE PODÍA CERRAR. Ocupaba 64 px de alto más su separación, siempre, en
 *    todas las pantallas. En la pizarra —que es donde más falta hace el alto—
 *    eran 100 px menos de campo.
 *  · SIETE SECCIONES ESCONDIDAS detrás de «Más», en otro orden que el del
 *    escritorio. Quien aprendía dónde estaba algo en el ordenador no lo
 *    encontraba en el móvil.
 *  · DOS NAVEGACIONES QUE MANTENER. Cada sección nueva había que acordarse de
 *    meterla en las dos listas.
 *
 * Ahora es la MISMA lista del escritorio dentro de un cajón. Se abre desde la
 * cabecera, se cierra con la X, tocando fuera, con Escape o al navegar.
 *
 * ENTRA POR LA IZQUIERDA, no desde abajo: es el mismo menú que en el
 * escritorio está a la izquierda, y que salga del mismo sitio es lo que hace
 * que se entienda que es el mismo.
 */

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { MenuCabecera, MenuCrear, MenuPie, MenuSecciones } from './MenuContenido';

export function MenuMovil({
  abierto, onCerrar, onCreate,
}: {
  abierto: boolean;
  onCerrar: () => void;
  onCreate: () => void;
}) {
  const cajon = useRef<HTMLDivElement>(null);

  /* Escape cierra, y con el cajón abierto la página de detrás no se desplaza:
     si se desplaza, al cerrar apareces en otro sitio del que estabas. */
  useEffect(() => {
    if (!abierto) return;
    const alTeclado = (e: KeyboardEvent) => { if (e.key === 'Escape') onCerrar(); };
    document.addEventListener('keydown', alTeclado);
    const antes = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    /* El foco entra en el cajón: si se queda detrás, tabular recorre la
       página tapada y no se ve dónde está el cursor. */
    cajon.current?.focus();
    return () => {
      document.removeEventListener('keydown', alTeclado);
      document.body.style.overflow = antes;
    };
  }, [abierto, onCerrar]);

  if (!abierto) return null;

  return (
    <div className="fixed inset-0 z-hoja lg:hidden">
      <div
        className="absolute inset-0 animate-fade-in bg-[#020617]/70 backdrop-blur-sm"
        onClick={onCerrar}
        aria-hidden
      />
      <div
        ref={cajon}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Menú"
        className="cristal-firme absolute inset-y-0 left-0 flex w-[min(19rem,86vw)] animate-cajon-in flex-col rounded-r-4xl outline-none"
        style={{ paddingTop: 'var(--safe-top)', paddingBottom: 'var(--safe-bottom)' }}
      >
        <MenuCabecera
          accion={
            <button
              onClick={onCerrar}
              aria-label="Cerrar el menú"
              className="-mr-1 grid h-9 w-9 shrink-0 place-items-center rounded-xl text-ink-500 transition-colors active:bg-raised"
            >
              <X size={18} />
            </button>
          }
        />
        <MenuCrear onCreate={() => { onCerrar(); onCreate(); }} />
        <MenuSecciones onIr={onCerrar} />
        <MenuPie onIr={onCerrar} />
      </div>
    </div>
  );
}
