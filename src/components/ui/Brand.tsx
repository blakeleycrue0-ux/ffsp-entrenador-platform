/**
 * Identidad visual.
 * ---------------------------------------------------------------------------
 * Hay dos marcas y no conviene mezclarlas:
 *
 *  · La del **producto** (`Wordmark`), igual para todos los clubes. Es
 *    tipográfica y MONOCROMA: el «360» iba en azul y ya no, porque el azul se
 *    ha ido del producto entero. La diferencia entre las dos mitades la hace
 *    ahora el peso y el tono de gris, que es más difícil de hacer bien y se
 *    nota más cuando sale. El nombre ya dice bastante; no hace falta meterlo
 *    dentro de un cuadrado.
 *  · La del **club** (`ClubCrest`), que cambia en cada instalación. Sin escudo
 *    subido, sus iniciales sobre navy: sobria y siempre disponible, nunca un
 *    escudo prestado que no es de nadie.
 *
 * `Marca` es el símbolo: el archivo real del logo, no una aproximación
 * dibujada a ojo. Se pinta como MÁSCARA CSS en vez de como imagen, por dos
 * motivos: así toma el color de donde esté (`currentColor`) —blanco sobre
 * negro, gris apagado donde acompaña— y así una sola imagen sirve para todos
 * en vez de tener una copia por color.
 */

import { cn } from '@/lib/utils';

export function Wordmark({
  size = 'md', showSubtitle = false, tone = 'dark', className,
}: {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSubtitle?: boolean;
  /**
   * `light`: letras blancas, para fondo oscuro —que es toda la aplicación—.
   * `dark`: usa la escala `ink`, pensada para el tema oscuro.
   * `tinta`: negro de verdad, para la PÁGINA PÚBLICA, que es clara.
   *
   * Hace falta el tercero porque en este proyecto la escala está invertida:
   * `text-ink-900` es BLANCO. Pedir `dark` sobre una cabecera blanca dejaba el
   * logotipo blanco sobre blanco, o sea invisible, y el nombre del tono no
   * ayudaba a verlo venir.
   */
  tone?: 'dark' | 'light' | 'tinta';
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
        <Marca
          size={marca}
          className={tone === 'light' ? 'text-white' : tone === 'tinta' ? 'text-[#10131A]' : 'text-ink-900'}
        />
        {/* Peso 560 en vez de extranegrita: una grotesca en negrita a tamaño
            grande se lee como un grito. La cifra va al mismo peso pero más
            apagada, de modo que «Playoff» manda y «360» acompaña. */}
        <span className={cn('font-display tracking-[-0.045em]', tipo)} style={{ fontWeight: 560 }}>
          <span className={tone === 'light' ? 'text-white' : tone === 'tinta' ? 'text-[#10131A]' : 'text-ink-900'}>
            Playoff
          </span>
          <span className={tone === 'light' ? 'text-white/55' : tone === 'tinta' ? 'text-[#727988]' : 'text-ink-600'}>
            360
          </span>
        </span>
      </span>
      {showSubtitle && (
        <span
          className={cn(
            'mt-2 whitespace-nowrap font-medium uppercase tracking-[0.14em]',
            pie,
            /* `text-muted` está pensado para el fondo oscuro de la
               aplicación: sobre blanco no se leería. */
            tone === 'light' ? 'text-white/55' : tone === 'tinta' ? 'text-[#727988]' : 'text-muted',
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
        'grid shrink-0 place-items-center rounded-md bg-ink-900 font-display font-semibold leading-none text-ink-0',
        className,
      )}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
    >
      {initials || '—'}
    </span>
  );
}
