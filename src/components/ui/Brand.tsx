/**
 * Identidad visual.
 * ---------------------------------------------------------------------------
 * Hay dos marcas y no conviene mezclarlas:
 *
 *  · La del **producto** (`Wordmark`), igual para todos los clubes. Es
 *    tipográfica: el nombre escrito con peso y una barra de acento. Un símbolo
 *    genérico dentro de un cuadrado no dice nada y se ve como un hueco sin
 *    resolver, así que no lo hay.
 *  · La del **club** (`ClubCrest`), que cambia en cada instalación. Sin escudo
 *    subido, sus iniciales sobre navy: sobria y siempre disponible, nunca un
 *    escudo prestado que no es de nadie.
 */

import { cn } from '@/lib/utils';

export function Wordmark({
  size = 'md', showSubtitle = true, tone = 'dark', className,
}: {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSubtitle?: boolean;
  /** `dark`: letras navy sobre claro. `light`: letras blancas sobre oscuro. */
  tone?: 'dark' | 'light';
  className?: string;
}) {
  const tipo = {
    sm: 'text-[19px] tracking-[-0.045em]',
    md: 'text-[23px] tracking-[-0.045em]',
    lg: 'text-[30px] tracking-[-0.05em]',
    xl: 'text-[40px] tracking-[-0.055em]',
  }[size];
  const barra = { sm: 'h-[3px]', md: 'h-[3px]', lg: 'h-1', xl: 'h-1.5' }[size];
  const pie = { sm: 'text-[8.5px]', md: 'text-[9px]', lg: 'text-[10px]', xl: 'text-[11px]' }[size];

  return (
    <span className={cn('inline-flex flex-col leading-none', className)} aria-label="FFSP">
      <span
        className={cn(
          'font-display font-black',
          tipo,
          tone === 'light' ? 'text-white' : 'text-navy-900',
        )}
      >
        FFSP
      </span>
      {/* La barra es el único elemento gráfico de la marca: el verde del campo. */}
      <span className={cn('mt-[3px] w-full rounded-full bg-pitch-500', barra)} />
      {showSubtitle && (
        <span
          className={cn(
            'mt-1.5 whitespace-nowrap font-medium uppercase tracking-[0.14em]',
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
        'grid shrink-0 place-items-center rounded-md bg-navy-900 font-display font-bold leading-none text-white',
        className,
      )}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
    >
      {initials || '—'}
    </span>
  );
}
