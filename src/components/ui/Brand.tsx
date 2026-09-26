/**
 * Identidad visual.
 * ---------------------------------------------------------------------------
 * Hay dos marcas y no conviene mezclarlas:
 *
 *  · La del **producto** (`Wordmark`), igual para todos los clubes. Es
 *    tipográfica: «Playoff» con peso y «360» en el verde del campo. El nombre
 *    ya dice bastante; no hace falta meterlo dentro de un cuadrado.
 *  · La del **club** (`ClubCrest`), que cambia en cada instalación. Sin escudo
 *    subido, sus iniciales sobre navy: sobria y siempre disponible, nunca un
 *    escudo prestado que no es de nadie.
 *
 * `Aro` es el símbolo suelto —la vuelta completa, con el balón cerrándola— y
 * sólo se usa donde hace falta un icono cuadrado de verdad: la pestaña del
 * navegador. En la página manda el nombre escrito.
 */

import { cn } from '@/lib/utils';

export function Wordmark({
  size = 'md', showSubtitle = false, tone = 'dark', className,
}: {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSubtitle?: boolean;
  /** `dark`: letras navy sobre claro. `light`: letras blancas sobre oscuro. */
  tone?: 'dark' | 'light';
  className?: string;
}) {
  const tipo = {
    sm: 'text-[17px]',
    md: 'text-[21px]',
    lg: 'text-[27px]',
    xl: 'text-[36px]',
  }[size];
  const pie = { sm: 'text-[8.5px]', md: 'text-[9px]', lg: 'text-[10px]', xl: 'text-[11px]' }[size];

  return (
    <span
      className={cn('inline-flex flex-col leading-none', className)}
      aria-label="Playoff360"
    >
      <span className={cn('font-display font-extrabold tracking-[-0.035em]', tipo)}>
        <span className={tone === 'light' ? 'text-white' : 'text-ink-900'}>Playoff</span>
        <span className="text-accent-500">360</span>
      </span>
      {showSubtitle && (
        <span
          className={cn(
            'mt-2 whitespace-nowrap font-medium uppercase tracking-[0.14em]',
            pie,
            tone === 'light' ? 'text-white/55' : 'text-muted',
          )}
        >
          Sistema para entrenadores
        </span>
      )}
    </span>
  );
}

/** El símbolo suelto: la vuelta completa y el balón que la cierra. */
export function Aro({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      className={cn('shrink-0', className)}
      aria-hidden
    >
      <circle
        cx="31"
        cy="33"
        r="15.5"
        stroke="currentColor"
        strokeWidth="6"
        strokeDasharray="83.4 13.9"
        strokeLinecap="round"
        transform="rotate(-6 31 33)"
      />
      <circle cx="45.8" cy="19.6" r="6.2" fill="currentColor" />
    </svg>
  );
}

/** Escudo del club. Sin imagen, sus iniciales. */
export function ClubCrest({
  name, src, size = 32, className,
}: { name?: string; src?: string; size?: number; className?: string }) {
  const initials = (name ?? '')
    .split(/\s+/)
    .filter((w) => w.length > 1 || /\d/.test(w))
    .slice(0, 3)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 3);

  if (src) {
    return (
      <img
        src={src}
        alt={name ? `Escudo de ${name}` : 'Escudo del club'}
        className={cn('select-none object-contain', className)}
        style={{ height: size, width: 'auto' }}
        draggable={false}
      />
    );
  }

  return (
    <span
      aria-hidden
      className={cn(
        'grid shrink-0 place-items-center rounded-md bg-ink-900 font-display font-bold leading-none text-ink-0',
        className,
      )}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
    >
      {initials || '—'}
    </span>
  );
}
