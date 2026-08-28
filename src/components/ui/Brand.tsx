/**
 * Identidad visual — escudo del Santa Ponsa CF.
 * El escudo es el ancla de marca: se usa entero y con aire, nunca deformado
 * ni recoloreado. El lila del producto (#653F8A) sale de él.
 */

import { cn } from '@/lib/utils';

export function Crest({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <img
      src="/brand/crest-256.png"
      alt="Escudo del Santa Ponsa CF"
      width={size * 0.7}
      height={size}
      className={cn('select-none object-contain', className)}
      style={{ height: size, width: 'auto' }}
      draggable={false}
    />
  );
}

export function Wordmark({
  size = 'md', showSubtitle = true, className,
}: { size?: 'sm' | 'md' | 'lg'; showSubtitle?: boolean; className?: string }) {
  const crest = { sm: 28, md: 34, lg: 44 }[size];
  const title = { sm: 'text-[15px]', md: 'text-[17px]', lg: 'text-[21px]' }[size];

  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <Crest size={crest} />
      <span className="flex flex-col leading-none">
        <span className={cn('font-semibold tracking-[-0.02em] text-ink-900', title)}>
          FFSP <span className="text-brand-700">VLE</span>
        </span>
        {showSubtitle && (
          <span className="mt-1 whitespace-nowrap text-[9.5px] font-medium uppercase tracking-[0.1em] text-ink-400">
            Sistema para entrenadores
          </span>
        )}
      </span>
    </span>
  );
}

/** Marca de agua sutil del escudo para cabeceras destacadas. */
export function CrestWatermark({ className }: { className?: string }) {
  return (
    <img
      src="/brand/crest-256.png"
      alt=""
      aria-hidden
      className={cn('pointer-events-none absolute select-none opacity-[0.045]', className)}
      draggable={false}
    />
  );
}
