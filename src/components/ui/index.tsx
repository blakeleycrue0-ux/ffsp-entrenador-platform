/**
 * Sistema de componentes — Playoff360
 * ---------------------------------------------------------------------------
 * Navy mate y blanco. Bordes finos, esquinas discretas, sombras mínimas.
 * Ninguna pieza conoce el dominio: todas reciben props.
 *
 * Los iconos son responsabilidad de quien usa el componente y sólo deben
 * acompañar acciones (guardar, reproducir, editar), nunca decorar.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, ChevronDown, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

/* ─────────────────────────────────── Botón ───────────────────────────────── */

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'quiet';
type ButtonSize = 'sm' | 'md' | 'lg';

/**
 * Botones.
 * ---------------------------------------------------------------------------
 * LA ACCIÓN PRINCIPAL ES AZUL, con el texto blanco. Es exactamente el mismo
 * botón que el de la portada: mismo degradado, mismo filo de luz arriba,
 * misma sombra proyectada. Antes era blanco con texto negro, porque el
 * producto no tenía color de marca; el resultado era que al registrarte
 * cambiaba el botón que acabas de pulsar.
 *
 * EL CONTRASTE, MEDIDO. Blanco sobre #0868F9 da 4,6:1, que pasa el mínimo
 * para texto normal (4,5). Lo que no pasaba era azul sobre blanco —3,2—, que
 * es la combinación contraria y la que hizo que se quitara en su día.
 *
 * Al pulsar encoge un 2 %. Es lo que hace que un botón se sienta como un
 * objeto y no como un enlace.
 */
const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'metal-claro text-white ' +
    'disabled:[background-image:none] disabled:bg-[rgba(148,180,255,0.08)] disabled:text-ink-500 disabled:shadow-none',
  secondary: 'metal text-ink-800',
  ghost: 'bg-transparent text-ink-600 hover:bg-panel hover:text-ink-900',
  quiet: 'border border-line-sutil bg-panel text-ink-800 hover:bg-raised',
  danger: 'border border-bad/25 bg-bad/10 text-bad hover:bg-bad/18',
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: 'h-9 px-3.5 text-sm gap-1.5 rounded-lg',
  md: 'h-11 px-4 text-base gap-2 rounded-xl',
  lg: 'h-14 px-5 text-md gap-2 rounded-xl',
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
  block?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, icon, block, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex select-none items-center justify-center whitespace-nowrap font-medium',
        'transition-[transform,background-color,color] duration-250 ease-suave',
        'active:scale-[0.98] disabled:cursor-not-allowed disabled:active:scale-100',
        BUTTON_VARIANTS[variant],
        BUTTON_SIZES[size],
        block && 'w-full',
        className,
      )}
      {...rest}
    >
      {loading ? <Loader2 size={15} className="animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  );
});

export function LinkButton({
  to, state, variant = 'primary', size = 'md', icon, block, className, children,
}: { to: string; state?: unknown } & Omit<ButtonProps, 'ref'>) {
  return (
    <Link
      to={to}
      state={state}
      className={cn(
        'inline-flex select-none items-center justify-center whitespace-nowrap font-medium',
        'transition-[transform,background-color,color] duration-250 ease-suave active:scale-[0.98]',
        BUTTON_VARIANTS[variant],
        BUTTON_SIZES[size],
        block && 'w-full',
        className,
      )}
    >
      {icon}
      {children}
    </Link>
  );
}

/* ─────────────────────────────────── Panel ───────────────────────────────── */

export function Panel({
  className, children, ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('panel', className)} {...rest}>
      {children}
    </div>
  );
}

export function PanelHeader({
  title, description, actions, className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-start justify-between gap-4 px-4 pb-1 pt-3.5', className)}>
      <div className="min-w-0">
        <h3 className="text-lg font-semibold leading-snug tracking-[-0.01em]">{title}</h3>
        {description && <p className="mt-0.5 text-base leading-relaxed text-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

/* ──────────────────────────────── Etiquetas ──────────────────────────────── */

type Tone = 'neutral' | 'ok' | 'warn' | 'bad' | 'info' | 'solid';

/* Sobre negro, un relleno tenue del propio color se lee mejor que un borde
   fino: el borde desaparece y el relleno no. */
const TONES: Record<Tone, string> = {
  neutral: 'bg-raised text-ink-700 border-transparent',
  ok: 'bg-ok/15 text-ok border-transparent',
  warn: 'bg-warn/15 text-warn border-transparent',
  bad: 'bg-bad/15 text-bad border-transparent',
  info: 'border-line bg-raised text-ink-800',
  solid: 'bg-ink-900 text-ink-0 border-transparent',
};

export function Tag({
  tone = 'neutral', children, className, size = 'md', dot,
}: { tone?: Tone; children: React.ReactNode; className?: string; size?: 'sm' | 'md'; dot?: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border font-medium',
        size === 'sm' ? 'px-2 py-0.5 text-2xs' : 'px-2.5 py-0.5 text-xs',
        TONES[tone],
        className,
      )}
    >
      {dot && <Dot tone={tone} />}
      {children}
    </span>
  );
}

/** Punto de estado: el color es la única información, sin icono. */
export function Dot({ tone = 'neutral', className }: { tone?: Tone; className?: string }) {
  const bg = {
    neutral: 'bg-ink-400', ok: 'bg-ok', warn: 'bg-warn', bad: 'bg-bad', info: 'bg-info', solid: 'bg-ink-900',
  }[tone];
  return <span className={cn('inline-block h-1.5 w-1.5 shrink-0 rounded-full', bg, className)} />;
}

/* ─────────────────────────────────── Avatar ──────────────────────────────── */

/**
 * Seis tonos de avatar, y ninguno con color.
 * ---------------------------------------------------------------------------
 * Una lista de jugadoras con dieciséis círculos idénticos no se lee: hay que ir
 * letra a letra. Hace falta que cada persona tenga su tono estable, para que la
 * vista distinga filas antes de leer y para reconocer a la misma jugadora en la
 * plantilla, en la convocatoria y en la asistencia.
 *
 * Antes eso se hacía con ocho colores —azul, verde, naranja, morado…—, y ocho
 * colores en una plantilla de veinte es un mosaico. Ahora son seis escalones de
 * grafito con su letra más o menos clara: distinguen igual de bien, no compiten
 * con el estado de disponibilidad (que sí usa color porque significa algo) y
 * no meten un color de marca por la puerta de atrás.
 *
 * El tono sale del NOMBRE, no de la posición en la lista: si saliera del orden,
 * cambiaría al ordenar de otra forma y dejaría de servir para reconocer a
 * nadie. Todos se leen sobre su propio fondo.
 */
/* SEIS ESCALONES DE AZUL NOCHE, NO DE GRAFITO. Eran grises puros —#1F1F1F y
   compañía— de cuando la aplicación entera era negra. Sobre el azul de ahora
   no se leen como «un tono más oscuro», se leen como manchas de otro
   producto: una lista de dieciséis jugadoras quedaba con dieciséis círculos
   grises sobre paneles azules. Son los mismos seis escalones, con el azul
   dentro. */
const COLORES_DE_AVATAR = [
  'bg-[#17233C] text-[#DCE6F7]',
  'bg-[#101A2E] text-[#A8B8D4]',
  'bg-[#1E2C49] text-[#FFFFFF]',
  'bg-[#131E35] text-[#C6D3E9]',
  'bg-[#1A2740] text-[#93A3C0]',
  'bg-[#0D1626] text-[#CFDAEE]',
];

const colorDe = (name: string) => {
  let h = 0;
  for (let i = 0; i < name.length; i += 1) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return COLORES_DE_AVATAR[h % COLORES_DE_AVATAR.length];
};

export function Avatar({
  name, src, size = 32, badge, className,
}: { name: string; src?: string; size?: number; badge?: React.ReactNode; className?: string }) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  return (
    <span className={cn('relative inline-flex shrink-0', className)}>
      <span
        className={cn(
          'grid place-items-center overflow-hidden rounded-full font-semibold',
          src ? 'bg-ink-100' : colorDe(name),
        )}
        style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
      >
        {src ? <img src={src} alt="" className="h-full w-full object-cover" /> : initials || '—'}
      </span>
      {badge !== undefined && (
        <span
          className="absolute -bottom-0.5 -right-0.5 grid place-items-center rounded-full bg-ink-900 px-1 text-ink-0"
          style={{ minWidth: size * 0.44, height: size * 0.44, fontSize: Math.round(size * 0.26) }}
        >
          {badge}
        </span>
      )}
    </span>
  );
}

/* ─────────────────────────────── Formularios ─────────────────────────────── */

export function Field({
  label, hint, error, children, className, required,
}: {
  label?: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
  required?: boolean;
}) {
  return (
    <div className={className}>
      {label && (
        <label className="label">
          {label}
          {required && <span className="ml-0.5 text-bad">*</span>}
        </label>
      )}
      {children}
      {hint && !error && <p className="mt-1 text-xs text-muted">{hint}</p>}
      {error && <p className="mt-1 text-xs text-bad">{error}</p>}
    </div>
  );
}

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...rest }, ref) {
    return <input ref={ref} className={cn('field', className)} {...rest} />;
  },
);

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...rest }, ref) {
    return <textarea ref={ref} className={cn('field min-h-[84px] resize-y leading-relaxed', className)} {...rest} />;
  },
);

/**
 * UN `<select>` NATIVO CRECE HASTA SU OPCIÓN MÁS LARGA. Con `w-auto`, un club
 * llamado «Club Deportivo Femenino Ciudad de San Fernando de Henares «B»»
 * estiraba el desplegable a 594 px dentro de una columna de 324 y sacaba la
 * página 237 px por el lado —medido—. `max-w-full` en los dos niveles le pone
 * el techo de su contenedor y el texto se recorta, que es lo que tiene que
 * pasar.
 */
export function Select({ className, children, ...rest }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative min-w-0 max-w-full">
      <select className={cn('field max-w-full cursor-pointer appearance-none pr-8', className)} {...rest}>
        {children}
      </select>
      <ChevronDown size={15} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-400" aria-hidden />
    </div>
  );
}

export function Checkbox({
  checked, onChange, label, disabled, className,
}: { checked: boolean; onChange: (v: boolean) => void; label?: React.ReactNode; disabled?: boolean; className?: string }) {
  return (
    <label className={cn('inline-flex select-none items-center gap-2', disabled ? 'opacity-50' : 'cursor-pointer', className)}>
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'grid h-4 w-4 shrink-0 place-items-center rounded-[3px] border transition-colors',
          checked ? 'border-ink-900 bg-ink-900 text-ink-0' : 'border-ink-300 bg-panel hover:border-ink-500',
        )}
      >
        {checked && <Check size={11} strokeWidth={3} aria-hidden />}
      </button>
      {label && <span className="text-base text-ink-800">{label}</span>}
    </label>
  );
}

export function Toggle({
  checked, onChange, label, disabled,
}: { checked: boolean; onChange: (v: boolean) => void; label?: string; disabled?: boolean }) {
  return (
    <label className={cn('flex select-none items-center gap-2.5', disabled ? 'opacity-50' : 'cursor-pointer')}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative h-5 w-9 shrink-0 rounded-full transition-colors',
          checked ? 'bg-ink-900' : 'bg-ink-300',
        )}
      >
        {/* `left-0` es imprescindible: sin él la bolita se coloca al final del
            botón y el desplazamiento la saca fuera, encima de la etiqueta. */}
        <span
          className={cn(
            'absolute left-0 top-0.5 h-4 w-4 rounded-full bg-panel transition-transform',
            checked ? 'translate-x-[18px]' : 'translate-x-0.5',
          )}
        />
      </button>
      {label && <span className="text-base text-ink-800">{label}</span>}
    </label>
  );
}

/** Valoración del 1 al 10. Sin estrellas: números, que es lo que se registra. */
export function ScoreInput({
  value, onChange, name, className,
}: { value: number | null; onChange: (v: number | null) => void; name?: string; className?: string }) {
  return (
    <div className={cn('inline-flex flex-wrap gap-1', className)} role="radiogroup" aria-label={name ?? 'Valoración de 1 a 10'}>
      {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
        const active = value === n;
        return (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(active ? null : n)}
            className={cn(
              'h-7 w-7 rounded border text-sm font-medium tabular-nums transition-colors',
              active
                ? 'border-ink-900 bg-ink-900 text-ink-0'
                : 'border-line bg-panel text-ink-600 hover:border-ink-400',
            )}
          >
            {n}
          </button>
        );
      })}
      {value !== null && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="ml-1 self-center text-xs text-muted underline-offset-2 hover:text-ink-800 hover:underline"
        >
          Quitar
        </button>
      )}
    </div>
  );
}

/** Muestra una valoración ya registrada. */
export function Score({ value, className }: { value: number | null | undefined; className?: string }) {
  if (value === null || value === undefined) {
    return <span className={cn('text-sm text-ink-400', className)}>Sin valorar</span>;
  }
  return (
    <span className={cn('inline-flex items-baseline gap-0.5 tabular-nums', className)}>
      <span className="text-md font-semibold text-ink-900">{value}</span>
      <span className="text-xs text-muted">/10</span>
    </span>
  );
}

/* ─────────────────────────────────── Tabs ───────────────────────────────── */

export function Tabs({
  tabs, value, onChange, className,
}: {
  tabs: { id: string; label: string; count?: number }[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
}) {
  return (
    <div className={cn('flex gap-0.5 overflow-x-auto border-b border-line no-scrollbar', className)} role="tablist">
      {tabs.map((t) => {
        const active = t.id === value;
        return (
          <button
            key={t.id}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.id)}
            className={cn(
              'relative shrink-0 px-3 py-2 text-base font-medium transition-colors',
              active ? 'text-ink-900' : 'text-muted hover:text-ink-800',
            )}
          >
            {t.label}
            {t.count !== undefined && <span className="ml-1.5 text-sm text-ink-400 tabular-nums">{t.count}</span>}
            {active && <span className="absolute inset-x-1.5 -bottom-px h-0.5 bg-ink-900" />}
          </button>
        );
      })}
    </div>
  );
}

export function Segmented<T extends string>({
  options, value, onChange, className, size = 'md',
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
  size?: 'sm' | 'md';
}) {
  return (
    <div className={cn('inline-flex rounded-md border border-line bg-panel p-0.5', className)}>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          aria-pressed={value === o.id}
          className={cn(
            'rounded-[4px] font-medium transition-colors',
            size === 'sm' ? 'px-2 py-1 text-xs' : 'px-2.5 py-1 text-sm',
            value === o.id ? 'bg-ink-900 text-ink-0' : 'text-ink-600 hover:text-ink-900',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ─────────────────────────────────── Modal ───────────────────────────────── */

export function Modal({
  open, onClose, title, description, children, footer, size = 'md',
}: {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;
  const width = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }[size];

  return (
    <div className="fixed inset-0 z-hoja flex items-end justify-center sm:items-center sm:p-6">
      {/* El velo es NEGRO. Con la paleta invertida, `ink-900` es blanco: puesto
          ahí aclaraba la página en vez de apagarla, y el diálogo —que iba con
          `bg-panel`, un 4,5 % de blanco— se leía con la pantalla de detrás
          atravesándolo. Aquí el fondo lo pone `.cristal`, que sí tapa. */}
      <div className="absolute inset-0 animate-fade-in bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          'cristal relative z-fijo flex max-h-[92vh] w-full flex-col overflow-hidden',
          'rounded-t-4xl animate-sheet-in sm:rounded-3xl sm:animate-fade-up',
          width,
        )}
      >
        {(title || description) && (
          <div className="flex items-start justify-between gap-4 border-b border-line px-4 py-3">
            <div className="min-w-0">
              {title && <h2 className="text-md font-semibold leading-snug">{title}</h2>}
              {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
            </div>
            <button
              onClick={onClose}
              className="-mr-1 -mt-0.5 rounded p-1.5 text-ink-400 transition-colors hover:bg-surface hover:text-ink-800"
              aria-label="Cerrar"
            >
              <X size={16} />
            </button>
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-2 border-t border-line bg-white/[0.03] px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

/** Confirmación para acciones destructivas. */
export function ConfirmDialog({
  open, onCancel, onConfirm, title, description, confirmLabel = 'Eliminar', loading,
}: {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  loading?: boolean;
}) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onCancel}>
            Cancelar
          </Button>
          <Button variant="danger" loading={loading} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="text-base leading-relaxed text-ink-700">{description}</div>
    </Modal>
  );
}

/* ──────────────────────────── Estados de pantalla ────────────────────────── */

/**
 * Cuando no hay nada que enseñar.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * POR DEFECTO ES UNA FILA, NO UN CARTEL. Esto era siempre `py-12` centrado, y
 * metido dentro de un panel daba una caja de casi trescientos píxeles de alto
 * para decir «no hay partidos». Con tres o cuatro en la misma pantalla —y en
 * el inicio las había— la aplicación se leía como una sucesión de huecos.
 * Medido en el móvil: el inicio de un club recién creado ocupaba más de dos
 * pantallas y media sin un solo dato dentro.
 *
 * Ahora hay dos tamaños y el pequeño es el que se usa casi siempre:
 *
 *   `fila`  (por defecto) Texto a la izquierda, acción a la derecha, y en el
 *           móvil la acción debajo. Alto: el de dos renglones. Es lo que va
 *           dentro de un módulo del inicio o de un panel.
 *   `pleno` Centrado y con aire. SÓLO cuando el vacío ES la pantalla: una
 *           plantilla sin jugadoras, una biblioteca sin ejercicios. Ahí el
 *           hueco no sobra, porque no hay nada más.
 *
 * En los dos casos el texto dice qué va a aparecer ahí y la acción lleva a
 * crearlo. Un vacío sin salida es una pantalla rota con buenos modales.
 */
export function EmptyState({
  title, description, action, size = 'fila', className,
}: {
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  size?: 'fila' | 'pleno';
  className?: string;
}) {
  if (size === 'pleno') {
    return (
      <div data-vacio="pleno" className={cn('px-6 py-10 text-center', className)}>
        <h3 className="text-md font-semibold text-ink-900">{title}</h3>
        {description && <p className="mx-auto mt-1.5 max-w-md text-base leading-relaxed text-muted">{description}</p>}
        {/* `flex-wrap`: dos acciones con etiqueta larga —«Añadir jugadora» e
            «Importar desde un archivo»— no caben en 320 px, y como los botones
            no parten su texto a propósito, lo que tiene que partir es la fila. */}
        {action && <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div>}
      </div>
    );
  }

  return (
    /* `data-vacio` NO ES DECORACIÓN: es lo que mide `pruebas/densidad.mjs`.
       Buscar los vacíos por su texto no sirve —el detector acababa midiendo
       el titular en vez de la caja, y un cartel de 250 px pasaba la prueba—.
       Con la marca puesta aquí, la medida es exacta y no se puede escapar un
       vacío sin que la prueba lo vea. */
    <div
      data-vacio="fila"
      className={cn(
        'flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-5',
        className,
      )}
    >
      <div className="min-w-0">
        <p className="text-base font-medium text-ink-900">{title}</p>
        {description && (
          <p className="mt-1 max-w-[56ch] text-sm leading-relaxed text-muted">{description}</p>
        )}
      </div>
      {action && <div className="flex shrink-0 flex-wrap gap-2">{action}</div>}
    </div>
  );
}

export function ErrorState({
  title = 'No hemos podido cargar esta información',
  description,
  onRetry,
  className,
}: { title?: string; description?: React.ReactNode; onRetry?: () => void; className?: string }) {
  return (
    <div className={cn('panel border-bad/30 bg-bad/4 px-5 py-6', className)}>
      <h3 className="text-md font-semibold text-bad">{title}</h3>
      {description && <p className="mt-1.5 max-w-2xl text-base leading-relaxed text-ink-700">{description}</p>}
      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-4" onClick={onRetry}>
          Reintentar
        </Button>
      )}
    </div>
  );
}

export const Skeleton = ({ className }: { className?: string }) => <div className={cn('skeleton', className)} />;

export function SkeletonRows({ rows = 4, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}

/* ───────────────────────── Indicadores y medidas ─────────────────────────── */

export function Meter({
  value, max = 100, tone = 'solid', className, height = 4,
}: { value: number; max?: number; tone?: Tone; className?: string; height?: number }) {
  const pct = max === 0 ? 0 : Math.min(100, Math.max(0, (value / max) * 100));
  const bg = { neutral: 'bg-ink-400', ok: 'bg-ok', warn: 'bg-warn', bad: 'bg-bad', info: 'bg-info', solid: 'bg-ink-900' }[tone];
  return (
    <div className={cn('w-full overflow-hidden rounded-full bg-ink-100', className)} style={{ height }}>
      <div className={cn('h-full rounded-full transition-[width] duration-300', bg)} style={{ width: `${pct}%` }} />
    </div>
  );
}

/** Cifra con etiqueta. Sin icono decorativo. */
export function Figure({
  label, value, hint, tone, className,
}: { label: string; value: React.ReactNode; hint?: React.ReactNode; tone?: 'ok' | 'warn' | 'bad'; className?: string }) {
  const color = tone ? { ok: 'text-ok', warn: 'text-warn', bad: 'text-bad' }[tone] : 'text-ink-900';
  return (
    <div className={className}>
      <p className="eyebrow">{label}</p>
      <p className={cn('mt-1 text-2xl font-semibold leading-none tabular-nums', color)}>{value}</p>
      {hint && <p className="mt-1.5 text-sm text-muted">{hint}</p>}
    </div>
  );
}

/* ───────────────────────── Módulos de una página ─────────────────────────── */

/**
 * La cabecera de un bloque dentro de una página: rótulo a la izquierda, un
 * enlace o una acción a la derecha.
 *
 * Estaba escrita a mano en catorce sitios —`flex items-center justify-between`
 * y un `eyebrow`— y en cada uno con un hueco distinto debajo: 12 px aquí, 16
 * allí, 14 en el inicio. Son diferencias que nadie sabe nombrar y que hacen
 * que una pantalla parezca mal compuesta sin que se vea por qué.
 */
export function SectionHeader({
  title, hint, action, className,
}: { title: React.ReactNode; hint?: React.ReactNode; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-baseline justify-between gap-3', className)}>
      <div className="flex min-w-0 items-baseline gap-2">
        <h2 className="eyebrow">{title}</h2>
        {hint && <span className="truncate text-2xs text-ink-500">{hint}</span>}
      </div>
      {action && <div className="shrink-0 text-sm font-medium text-ink-900">{action}</div>}
    </div>
  );
}

/**
 * Una cifra con su nombre, del tamaño de un botón.
 *
 * Es la pieza que sustituye a las tarjetas de ciento cincuenta píxeles de
 * alto que decían un número. Cuatro de éstas caben en la misma fila que una
 * de aquéllas, y el número se lee igual de bien porque lo que lo hacía
 * legible era el contraste, no el hueco alrededor.
 *
 * `tono` sólo cuando el número significa algo malo o bueno. Un panel donde
 * todo lleva color es un panel donde el color no avisa de nada.
 */
export function StatTile({
  label, value, hint, tone, to, className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: 'ok' | 'warn' | 'bad';
  /** Si lleva a algún sitio, la baldosa entera se pulsa. */
  to?: string;
  className?: string;
}) {
  const color = tone ? { ok: 'text-ok', warn: 'text-warn', bad: 'text-bad' }[tone] : 'text-ink-900';
  const inner = (
    <>
      <p className="truncate text-2xs font-medium uppercase tracking-[0.07em] text-ink-500">{label}</p>
      <p className={cn('mt-1.5 font-display text-xl font-semibold leading-none tabular-nums', color)}>{value}</p>
      {hint && <p className="mt-1 truncate text-2xs text-ink-500">{hint}</p>}
    </>
  );
  const cls = cn(
    'min-w-0 rounded-xl border border-line-sutil bg-panel px-3 py-3',
    to && 'transition-colors hover:bg-raised',
    className,
  );
  return to ? <Link to={to} className={cn('block', cls)}>{inner}</Link> : <div className={cls}>{inner}</div>;
}

/**
 * Un atajo: icono, nombre y nada más.
 *
 * 56 px de alto y toda la baldosa es el área sensible, no sólo el texto.
 * Cuatro en dos columnas caben en una pantalla de 320 px sin que ninguna se
 * parta, que era el motivo por el que antes los atajos vivían escondidos en
 * un menú.
 */
export function ActionTile({
  to, onClick, icon, children, className,
}: {
  to?: string;
  onClick?: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  const cls = cn(
    'flex min-h-[52px] w-full min-w-0 items-center gap-2.5 rounded-xl border border-line-sutil bg-panel px-3 py-2.5',
    'text-left text-base font-medium text-ink-800 transition-colors',
    'hover:border-line hover:bg-raised hover:text-ink-900 active:scale-[0.99]',
    className,
  );
  const inner = (
    <>
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-raised text-marca-400">{icon}</span>
      <span className="min-w-0 leading-snug">{children}</span>
    </>
  );
  return to ? (
    <Link to={to} className={cls}>{inner}</Link>
  ) : (
    <button type="button" onClick={onClick} className={cls}>{inner}</button>
  );
}

/* ─────────────────────────── Menú desplegable ────────────────────────────── */

export function Dropdown({
  trigger, children, align = 'right', className,
}: {
  trigger: React.ReactNode;
  children: (close: () => void) => React.ReactNode;
  align?: 'left' | 'right';
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <div onClick={() => setOpen((o) => !o)}>{trigger}</div>
      {open && (
        <div
          className={cn(
            'absolute z-hoja mt-1 min-w-[200px] overflow-hidden rounded-md border border-line bg-panel p-1 shadow-pop animate-fade-up',
            align === 'right' ? 'right-0' : 'left-0',
            className,
          )}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

export function MenuItem({
  icon, children, onClick, to, tone,
}: { icon?: React.ReactNode; children: React.ReactNode; onClick?: () => void; to?: string; tone?: 'danger' }) {
  const cls = cn(
    'flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-left text-base transition-colors',
    tone === 'danger' ? 'text-bad hover:bg-bad/6' : 'text-ink-700 hover:bg-surface hover:text-ink-900',
  );
  const inner = (
    <>
      {icon && <span className="text-ink-400">{icon}</span>}
      {children}
    </>
  );
  return to ? (
    <Link to={to} onClick={onClick} className={cls}>
      {inner}
    </Link>
  ) : (
    <button onClick={onClick} className={cls}>
      {inner}
    </button>
  );
}

/* ─────────────────────────── Cabecera de página ──────────────────────────── */

export function PageHeader({
  eyebrow, title, description, actions, children, className,
}: {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  /* El ritmo del encabezado, igual en todas las pantallas: título, ocho
     píxeles, descripción, treinta y dos hasta el contenido. Antes cada página
     lo remataba con su propio margen y ninguna empezaba a la misma altura.
     `min-w-0` en las dos columnas: sin él, un título largo o un nombre de
     equipo largo empujan los botones fuera de la pantalla en vez de cortarse. */
  return (
    <div className={cn('mb-8', className)}>
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        {/* `basis-[15rem]`: sin una anchura de partida, el navegador prefiere
            ESTRECHAR el título antes que bajar los botones a la línea de
            abajo, y «Entrenamientos» acababa en una caja de 139 px pidiendo
            187. Con una base, lo que se parte primero son los botones. */}
        <div className="min-w-0 flex-1 basis-[15rem]">
          {eyebrow && <div className="mb-1.5 flex min-w-0 flex-wrap items-center gap-2 text-sm text-ink-500">{eyebrow}</div>}
          <h1 className="break-words text-xl font-semibold leading-tight sm:text-2xl">{title}</h1>
          {description && <p className="mt-2 max-w-[62ch] text-base leading-relaxed text-ink-500">{description}</p>}
        </div>
        {/* Sin `shrink-0`: con él la caja de botones se negaba a estrecharse,
            así que `flex-wrap` no llegaba a entrar nunca y a 320 px se salía
            de la pantalla 127 px. Que se encoja y, si no cabe, que parta. */}
        {actions && <div className="flex min-w-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  );
}

/* ─────────────────────── Estado de guardado visible ──────────────────────── */

export type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export function SaveIndicator({ state, className }: { state: SaveState; className?: string }) {
  if (state === 'idle') return null;
  const text = { saving: 'Guardando…', saved: 'Guardado', error: 'No se ha guardado' }[state];
  const tone = { saving: 'text-muted', saved: 'text-ok', error: 'text-bad' }[state];
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-sm', tone, className)} aria-live="polite">
      {state === 'saving' && <Loader2 size={13} className="animate-spin" aria-hidden />}
      {text}
    </span>
  );
}

/* ──────────────────────────────── Tooltip ────────────────────────────────── */

export function Tooltip({
  label, children, side = 'top',
}: { label: string; children: React.ReactNode; side?: 'top' | 'bottom' }) {
  return (
    <span className="group/tt relative inline-flex">
      {children}
      {/* `hidden` y no `opacity-0`: invisible pero MAQUETADO, una etiqueta
          larga cerca del borde derecho ensanchaba la página cuatro píxeles y
          dejaba un desplazamiento lateral que no llevaba a ninguna parte.
          Sin maquetar no puede ensanchar nada. */}
      <span
        role="tooltip"
        className={cn(
          'pointer-events-none absolute left-1/2 z-hoja hidden -translate-x-1/2 whitespace-nowrap rounded bg-ink-900 px-2 py-1 text-xs text-ink-0 group-hover/tt:block',
          side === 'top' ? 'bottom-full mb-1.5' : 'top-full mt-1.5',
        )}
      >
        {label}
      </span>
    </span>
  );
}
