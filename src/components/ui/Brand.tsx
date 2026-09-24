/**
 * Identidad visual.
 * ---------------------------------------------------------------------------
 * Hay dos marcas y no conviene mezclarlas:
 *
 *  · La del **producto** (`Wordmark`, `Mark`), que es la misma para todos los
 *    clubes y aparece en el acceso, la página pública y la barra lateral.
 *  · La del **club** (`ClubCrest`), que cambia en cada instalación. Como no
 *    todos los clubes suben un escudo, la alternativa son sus iniciales sobre
 *    navy: sobria y siempre disponible, nunca un escudo genérico que no es
 *    de nadie.
 */

import { cn } from '@/lib/utils';

/** Marca del producto: campo visto desde arriba, reducido a lo esencial. */
export function Mark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={cn('shrink-0', className)}
      role="img"
      aria-label="FFSP"
    >
      <rect width="32" height="32" rx="7" fill="#101C2D" />
      {/* Línea de medio campo y círculo central: a 20 px sigue leyéndose. */}
      <g stroke="#FFFFFF" strokeWidth="2" fill="none" strokeLinecap="round">
        <line x1="16" y1="5" x2="16" y2="27" />
        <circle cx="16" cy="16" r="6" />
      </g>
    </svg>
  );
}

export function Wordmark({
  size = 'md', showSubtitle = true, className,
}: { size?: 'sm' | 'md' | 'lg'; showSubtitle?: boolean; className?: string }) {
  const mark = { sm: 24, md: 28, lg: 36 }[size];
  const title = { sm: 'text-[15px]', md: 'text-[17px]', lg: 'text-[21px]' }[size];

  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <Mark size={mark} />
      <span className="flex flex-col leading-none">
        <span className={cn('font-semibold tracking-[-0.02em] text-navy-900', title)}>FFSP</span>
        {showSubtitle && (
          <span className="mt-1 whitespace-nowrap text-[9.5px] font-medium uppercase tracking-[0.11em] text-muted">
            Sistema para entrenadores
          </span>
        )}
      </span>
    </span>
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
        'grid shrink-0 place-items-center rounded-md bg-navy-900 font-bold leading-none text-white',
        className,
      )}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
    >
      {initials || '—'}
    </span>
  );
}
