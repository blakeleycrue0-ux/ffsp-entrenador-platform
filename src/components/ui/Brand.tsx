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
 * `Marca` es el símbolo: el archivo real del logo, no una aproximación
 * dibujada a ojo. Se pinta como MÁSCARA CSS en vez de como imagen, por dos
 * motivos: así toma el color de donde esté (`currentColor`) —blanco sobre
 * negro, azul cuando toca— y así una sola imagen sirve para todos los casos
 * en vez de tener una copia por color.
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

  const marca = { sm: 18, md: 22, lg: 28, xl: 38 }[size];

  return (
    <span
      className={cn('inline-flex flex-col leading-none', className)}
      aria-label="Playoff360"
    >
      <span className="inline-flex items-center gap-2">
        <Marca size={marca} className={tone === 'light' ? 'text-white' : 'text-ink-900'} />
        <span className={cn('font-display font-extrabold tracking-[-0.035em]', tipo)}>
          <span className={tone === 'light' ? 'text-white' : 'text-ink-900'}>Playoff</span>
          <span className="text-azul-500">360</span>
        </span>
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

/**
 * El símbolo de Playoff360.
 *
 * El archivo es blanco con transparencia, así que se usa como máscara: el
 * color sale de `currentColor` y no hay que mantener una imagen por cada
 * fondo. Si el navegador no supiera enmascarar —ninguno actual—, quedaría un
 * hueco, así que lleva respaldo a imagen normal.
 */
export function Marca({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn('inline-block shrink-0 bg-current', className)}
      style={{
        width: size,
        height: size,
        WebkitMaskImage: 'url(/playoff360.png)',
        maskImage: 'url(/playoff360.png)',
        WebkitMaskSize: 'contain',
        maskSize: 'contain',
        WebkitMaskRepeat: 'no-repeat',
        maskRepeat: 'no-repeat',
        WebkitMaskPosition: 'center',
        maskPosition: 'center',
      }}
    />
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
