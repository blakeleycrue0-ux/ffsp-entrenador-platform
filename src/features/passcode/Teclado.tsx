/**
 * El teclado del código de acceso.
 * ---------------------------------------------------------------------------
 * POR QUÉ UN TECLADO PROPIO Y NO UN CAMPO DE TEXTO. Un `<input>` en el móvil
 * abre el teclado del sistema, que tapa media pantalla, sale con retraso y
 * ofrece autocompletado y sugerencias que aquí no pintan nada. Cuatro cifras
 * se escriben con cuatro toques; el teclado está siempre en el mismo sitio y
 * las teclas son grandes de verdad (56 px), que es lo que importa con una mano
 * y el campo de por medio.
 *
 * TAMBIÉN SE ESCRIBE CON EL TECLADO DE VERDAD. En el portátil, teclear los
 * números funciona igual, y el retroceso borra. Un teclado en pantalla que no
 * acepta el teclado físico es una trampa en escritorio.
 *
 * NO SE GUARDA NADA AQUÍ. Las cifras viven en el estado de React mientras se
 * escriben y se mandan al servidor; nunca se escriben en disco.
 */

import { useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';

export const LARGO = 4;

/* ──────────────────────────────── Los puntos ─────────────────────────────── */

export type Fase = 'escribiendo' | 'mal' | 'bien';

export function Puntos({ valor, fase }: { valor: string; fase: Fase }) {
  return (
    <div className="relative grid h-14 place-items-center">
      {/* Al acertar, los puntos se van y en su sitio queda el anillo. */}
      <div
        className={cn(
          'flex items-center gap-4',
          fase === 'mal' && 'animate-temblor',
          fase === 'bien' && 'animate-juntar',
        )}
      >
        {Array.from({ length: LARGO }, (_, i) => {
          const lleno = i < valor.length;
          return (
            <span
              key={i}
              className={cn(
                'block h-3.5 w-3.5 rounded-full border transition-all duration-150',
                fase === 'mal'
                  ? 'border-bad bg-bad'
                  : lleno
                    ? 'scale-110 border-transparent bg-ink-900'
                    : 'border-white/22 bg-transparent',
              )}
            />
          );
        })}
      </div>

      {fase === 'bien' && <Acierto />}
    </div>
  );
}

/** El anillo que se cierra con el visto. Dura poco más de medio segundo. */
function Acierto() {
  return (
    <svg
      className="absolute animate-anillo"
      width="52"
      height="52"
      viewBox="0 0 52 52"
      fill="none"
      aria-hidden
    >
      <circle cx="26" cy="26" r="24" stroke="#FFFFFF" strokeWidth="2.5" opacity=".9" />
      <path
        d="M17 26.5 L23.2 32.5 L35 20.5"
        stroke="#FFFFFF"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="animate-trazo"
        style={{ strokeDasharray: 26 }}
      />
    </svg>
  );
}

/* ──────────────────────────────── El teclado ─────────────────────────────── */

export function Teclado({
  valor,
  onChange,
  disabled,
  /** Acción del hueco de abajo a la izquierda: «Olvidé el código», «Cancelar»… */
  extra,
}: {
  valor: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  extra?: { label: string; onClick: () => void };
}) {
  const escribir = useCallback(
    (d: string) => {
      if (disabled || valor.length >= LARGO) return;
      onChange(valor + d);
    },
    [disabled, onChange, valor],
  );

  const borrar = useCallback(() => {
    if (disabled || valor.length === 0) return;
    onChange(valor.slice(0, -1));
  }, [disabled, onChange, valor]);

  // El teclado físico hace lo mismo que el de pantalla.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        escribir(e.key);
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        borrar();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [borrar, escribir]);

  return (
    <div className="mx-auto grid w-full max-w-[290px] grid-cols-3 gap-3">
      {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
        <Tecla key={d} onClick={() => escribir(d)} disabled={disabled}>
          {d}
        </Tecla>
      ))}

      {extra ? (
        <button
          type="button"
          onClick={extra.onClick}
          /* Cabe en una línea a propósito: partida en dos parece un fallo de
             maquetación al lado de unas teclas tan ordenadas. */
          className="h-14 whitespace-nowrap rounded-2xl text-2xs font-medium text-ink-500 transition-colors hover:text-ink-800 active:scale-[0.97]"
        >
          {extra.label}
        </button>
      ) : (
        <span />
      )}

      <Tecla onClick={() => escribir('0')} disabled={disabled}>
        0
      </Tecla>

      <button
        type="button"
        onClick={borrar}
        disabled={disabled || valor.length === 0}
        aria-label="Borrar la última cifra"
        className={cn(
          'grid h-14 place-items-center rounded-2xl transition-all active:scale-[0.97]',
          valor.length === 0 ? 'text-ink-400/40' : 'text-ink-600 hover:bg-panel hover:text-ink-900',
        )}
      >
        {/* Un icono funcional: la forma dice «borrar» más rápido que la palabra. */}
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M9.2 5.5h9.3A1.5 1.5 0 0 1 20 7v10a1.5 1.5 0 0 1-1.5 1.5H9.2a1.5 1.5 0 0 1-1.1-.48l-4.2-4.5a1.5 1.5 0 0 1 0-2.04l4.2-4.5a1.5 1.5 0 0 1 1.1-.48Z"
            stroke="currentColor"
            strokeWidth="1.6"
          />
          <path d="m11.8 9.8 4.4 4.4m0-4.4-4.4 4.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}

function Tecla({
  children, onClick, disabled,
}: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'h-14 rounded-2xl border border-line bg-panel font-display text-xl font-semibold text-ink-900',
        'tabular-nums transition-all duration-100',
        'hover:bg-raised active:scale-[0.95] active:bg-raised',
        'disabled:text-ink-400 disabled:hover:bg-panel',
      )}
    >
      {children}
    </button>
  );
}
