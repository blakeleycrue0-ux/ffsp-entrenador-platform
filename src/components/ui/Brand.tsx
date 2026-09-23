/**
 * Identidad visual — escudo del Santa Ponsa CF.
 * El escudo se usa entero y con aire, nunca deformado ni recoloreado.
 */

import { cn } from '@/lib/utils';

export function Crest({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <img
      src="/brand/crest-256.png"
      alt="Escudo del Santa Ponsa CF"
      className={cn('select-none object-contain', className)}
      style={{ height: size, width: 'auto' }}
      draggable={false}
    />
  );
}

export function Wordmark({
  size = 'md', showSubtitle = true, className,
}: { size?: 'sm' | 'md' | 'lg'; showSubtitle?: boolean; className?: string }) {
  const crest = { sm: 26, md: 30, lg: 40 }[size];
  const title = { sm: 'text-[15px]', md: 'text-[17px]', lg: 'text-[21px]' }[size];

  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <Crest size={crest} />
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
