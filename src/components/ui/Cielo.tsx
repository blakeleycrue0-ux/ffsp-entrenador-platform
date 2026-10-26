/**
 * LAS PANTALLAS DE ANTES DE ENTRAR.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * El acceso y el alta son el último trozo de la página pública, no el primero
 * de la aplicación: se llega desde un anuncio, se contesta y se entra. Por eso
 * llevan su cara —el cielo azul, su tipografía, sus botones— y no la gris de
 * la herramienta.
 *
 * ESTO NO IMITA A LA PORTADA: USA SUS CLASES. `.cielo`, `.nubes`, `.t-l`,
 * `.entradilla`, `.rotulo`, `.btn` y `.btn-claro` están en `index.css` y son
 * literalmente las de la página pública. El día que allí se cambie el azul,
 * esto cambia solo.
 *
 * Y VIVE AQUÍ, EN UN SOLO SITIO, porque son dos pantallas seguidas: quien
 * crea la cuenta pasa al alta un segundo después. Con el campo y el botón
 * copiados en cada una, bastaba tocar uno para que el paso de la primera a la
 * segunda diera un salto visual.
 */

import { useEffect } from 'react';
import { cn } from '@/lib/utils';

/** El azul del cielo, para la barra del navegador. */
const AZUL = '#1E86FB';

/**
 * El marco: cielo a pantalla completa, con su contenido desplazable.
 *
 * FIJO A LA VENTANA, y no `min-h-dvh` dentro del flujo. Con
 * `viewport-fit=cover`, lo que queda por encima y por debajo de la página lo
 * pinta el DOCUMENTO, que es gris claro: salían dos franjas blancas, una
 * detrás de la hora y otra detrás de la barra de Safari, con el azul en
 * medio. Fijo, el azul ocupa la ventana entera.
 */
export function Cielo({
  cabecera, pie, children,
}: { cabecera?: React.ReactNode; pie?: React.ReactNode; children: React.ReactNode }) {
  /* Safari pinta su barra con el `theme-color` de la página, que es el gris
     de la aplicación: encima del azul se veía como una franja clara pegada al
     borde. Mientras dure esta pantalla se pone el azul, y al salir se
     devuelve el que había. */
  useEffect(() => {
    const metas = [...document.querySelectorAll('meta[name="theme-color"]')] as HTMLMetaElement[];
    const antes = metas.map((m) => m.content);
    metas.forEach((m) => { m.content = AZUL; });
    return () => { metas.forEach((m, i) => { m.content = antes[i]; }); };
  }, []);

  return (
    <div className="portada cielo fixed inset-0 z-nav flex flex-col overflow-hidden text-white">
      <div aria-hidden className="nubes nubes-mueve pointer-events-none absolute inset-0 opacity-60" />

      {cabecera && (
        <div className="relative z-10 px-5 pt-[max(14px,var(--safe-top))]">{cabecera}</div>
      )}

      {/* El contenido se desplaza por DENTRO. Si la zona fuera de alto fijo,
          lo que no cupiera —un formulario con el teclado abierto— se saldría
          por abajo en vez de poder subirse. */}
      <main className="relative z-10 flex min-h-0 flex-1 flex-col overflow-y-auto px-5 py-7">
        {children}
      </main>

      {pie && (
        <footer className="relative z-10 px-5 pb-[max(20px,var(--safe-bottom))] pt-2">{pie}</footer>
      )}
    </div>
  );
}

/**
 * Un campo sobre el cielo.
 *
 * NO ES EL `Input` DE LA PLATAFORMA, a propósito: aquél es tinta sobre blanco
 * y aquí el fondo es azul. Mismo alto de toque, otro color.
 */
export function CampoCielo({
  etiqueta, tipo = 'text', value, onChange, placeholder, autoFocus, autoComplete,
  className, onEnter, derecha,
}: {
  /* OBLIGATORIA. Un campo cuyo único nombre es el texto de dentro deja de
     tener nombre en cuanto se escribe algo: con un lector de pantalla se oye
     «cuadro de edición» y nada más. */
  etiqueta: string;
  tipo?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  autoComplete?: string;
  className?: string;
  onEnter?: () => void;
  /** Para el ojo de la contraseña. */
  derecha?: React.ReactNode;
}) {
  return (
    <div className={cn('relative', className)}>
      <input
        type={tipo}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && onEnter) { e.preventDefault(); onEnter(); } }}
        aria-label={etiqueta}
        placeholder={placeholder}
        autoFocus={autoFocus}
        /* SIEMPRE DECLARADO. Un campo sin `autocomplete` lo rellena el
           navegador por su cuenta, y al hacerlo pinta un fondo sólido que
           gana a cualquier clase: salía una caja blanca opaca en mitad del
           cielo. Con el color en línea, el fondo lo decide esta pantalla. */
        autoComplete={autoComplete ?? 'off'}
        style={{ backgroundColor: 'rgba(255,255,255,0.14)', colorScheme: 'light' }}
        className={cn(
          'h-[52px] w-full rounded-2xl border border-white/25 px-4 text-[17px] text-white',
          'placeholder:text-white/45 outline-none transition-colors focus:border-white/60',
          derecha && 'pr-12',
        )}
      />
      {derecha && <div className="absolute right-1.5 top-1/2 -translate-y-1/2">{derecha}</div>}
    </div>
  );
}

/** Una opción que se toca. Cincuenta y dos píxeles de alto, mínimo. */
export function OpcionCielo({
  activa, onClick, titulo, pie, icono,
}: { activa: boolean; onClick: () => void; titulo: string; pie?: string; icono?: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activa}
      className={cn(
        'flex min-h-[52px] w-full items-center justify-between gap-2 rounded-2xl border px-4 py-2.5 text-left transition-all duration-150 active:scale-[0.985]',
        activa
          ? 'border-white bg-white text-marca-700'
          : 'border-white/22 bg-white/10 text-white active:bg-white/[0.16]',
      )}
    >
      <span className="min-w-0">
        <span className="block truncate text-[15.5px] font-semibold">{titulo}</span>
        {pie && (
          <span className={cn('block truncate text-[12.5px]', activa ? 'text-marca-700/65' : 'text-white/55')}>
            {pie}
          </span>
        )}
      </span>
      {icono}
    </button>
  );
}

/**
 * El botón de la portada, a lo ancho.
 *
 * INACTIVO SE VE, no se desvanece. Al 45 % sobre el azul parecía un fallo de
 * pintado; así se lee que el botón está ahí y que espera.
 */
export function BotonCielo({
  children, onClick, type = 'button', cargando, puede = true, form,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit';
  cargando?: boolean;
  puede?: boolean;
  /* El `id` del formulario al que pertenece, cuando el botón vive FUERA de
     él. Es lo que deja tenerlo pegado abajo, siempre en el mismo sitio, sin
     que el formulario deje de enviarse con la tecla Intro. */
  form?: string;
}) {
  return (
    <button
      type={type}
      form={form}
      onClick={onClick}
      disabled={!puede || cargando}
      className={cn(
        'btn h-[54px] w-full text-[16px]',
        puede && !cargando
          ? 'btn-claro'
          : 'pointer-events-none border border-white/25 bg-white/15 text-white/60',
      )}
    >
      {cargando ? 'Un momento…' : children}
    </button>
  );
}

/** Un aviso sobre el cielo: error, confirmación o advertencia. */
export function AvisoCielo({ children, tono = 'normal' }: { children: React.ReactNode; tono?: 'normal' | 'bien' }) {
  return (
    <p
      role="alert"
      className={cn(
        'rounded-2xl px-4 py-2.5 text-[14px] leading-snug',
        tono === 'bien' ? 'bg-white text-marca-700' : 'bg-white/15 text-white',
      )}
    >
      {children}
    </p>
  );
}
