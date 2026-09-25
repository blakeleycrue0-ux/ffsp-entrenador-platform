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

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-navy-900 text-white border border-navy-900 hover:bg-navy-800 hover:border-navy-800 ' +
    'disabled:bg-navy-400 disabled:border-navy-400',
  secondary:
    'bg-white text-navy-900 border border-line hover:border-navy-400 hover:bg-surface',
  ghost: 'bg-transparent text-navy-700 border border-transparent hover:bg-navy-100',
  quiet: 'bg-surface text-navy-800 border border-transparent hover:bg-navy-100',
  danger: 'bg-white text-bad border border-bad/35 hover:bg-bad/5',
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 px-2.5 text-sm gap-1.5 rounded-md',
  md: 'h-9 px-3.5 text-base gap-2 rounded-md',
  lg: 'h-11 px-5 text-md gap-2 rounded-md',
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
        'transition-colors duration-120 disabled:cursor-not-allowed disabled:opacity-70',
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
        'inline-flex select-none items-center justify-center whitespace-nowrap font-medium transition-colors duration-120',
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
    <div className={cn('flex items-start justify-between gap-4 border-b border-line px-4 py-3', className)}>
      <div className="min-w-0">
        <h3 className="text-md font-semibold leading-snug">{title}</h3>
        {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

/* ──────────────────────────────── Etiquetas ──────────────────────────────── */

type Tone = 'neutral' | 'ok' | 'warn' | 'bad' | 'info' | 'solid';

const TONES: Record<Tone, string> = {
  neutral: 'bg-surface text-navy-700 border-line',
  ok: 'bg-ok/8 text-ok border-ok/25',
  warn: 'bg-warn/8 text-warn border-warn/25',
  bad: 'bg-bad/8 text-bad border-bad/25',
  info: 'bg-info/8 text-info border-info/25',
  solid: 'bg-navy-900 text-white border-navy-900',
};

export function Tag({
  tone = 'neutral', children, className, size = 'md', dot,
}: { tone?: Tone; children: React.ReactNode; className?: string; size?: 'sm' | 'md'; dot?: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded border font-medium',
        size === 'sm' ? 'px-1.5 py-0.5 text-2xs' : 'px-2 py-0.5 text-xs',
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
    neutral: 'bg-navy-400', ok: 'bg-ok', warn: 'bg-warn', bad: 'bg-bad', info: 'bg-info', solid: 'bg-navy-900',
  }[tone];
  return <span className={cn('inline-block h-1.5 w-1.5 shrink-0 rounded-full', bg, className)} />;
}

/* ─────────────────────────────────── Avatar ──────────────────────────────── */

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
        className="grid place-items-center overflow-hidden rounded-full bg-navy-100 font-semibold text-navy-700"
        style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
      >
        {src ? <img src={src} alt="" className="h-full w-full object-cover" /> : initials || '—'}
      </span>
      {badge !== undefined && (
        <span
          className="absolute -bottom-0.5 -right-0.5 grid place-items-center rounded-full bg-navy-900 px-1 text-white"
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

export function Select({ className, children, ...rest }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select className={cn('field cursor-pointer appearance-none pr-8', className)} {...rest}>
        {children}
      </select>
      <ChevronDown size={15} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-navy-400" aria-hidden />
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
          checked ? 'border-navy-900 bg-navy-900 text-white' : 'border-navy-300 bg-white hover:border-navy-500',
        )}
      >
        {checked && <Check size={11} strokeWidth={3} aria-hidden />}
      </button>
      {label && <span className="text-base text-navy-800">{label}</span>}
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
          checked ? 'bg-navy-900' : 'bg-navy-300',
        )}
      >
        {/* `left-0` es imprescindible: sin él la bolita se coloca al final del
            botón y el desplazamiento la saca fuera, encima de la etiqueta. */}
        <span
          className={cn(
            'absolute left-0 top-0.5 h-4 w-4 rounded-full bg-white transition-transform',
            checked ? 'translate-x-[18px]' : 'translate-x-0.5',
          )}
        />
      </button>
      {label && <span className="text-base text-navy-800">{label}</span>}
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
                ? 'border-navy-900 bg-navy-900 text-white'
                : 'border-line bg-white text-navy-600 hover:border-navy-400',
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
          className="ml-1 self-center text-xs text-muted underline-offset-2 hover:text-navy-800 hover:underline"
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
    return <span className={cn('text-sm text-navy-400', className)}>Sin valorar</span>;
  }
  return (
    <span className={cn('inline-flex items-baseline gap-0.5 tabular-nums', className)}>
      <span className="text-md font-semibold text-navy-900">{value}</span>
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
              active ? 'text-navy-900' : 'text-muted hover:text-navy-800',
            )}
          >
            {t.label}
            {t.count !== undefined && <span className="ml-1.5 text-sm text-navy-400 tabular-nums">{t.count}</span>}
            {active && <span className="absolute inset-x-1.5 -bottom-px h-0.5 bg-navy-900" />}
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
    <div className={cn('inline-flex rounded-md border border-line bg-white p-0.5', className)}>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          aria-pressed={value === o.id}
          className={cn(
            'rounded-[4px] font-medium transition-colors',
            size === 'sm' ? 'px-2 py-1 text-xs' : 'px-2.5 py-1 text-sm',
            value === o.id ? 'bg-navy-900 text-white' : 'text-navy-600 hover:text-navy-900',
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
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-6">
      <div className="absolute inset-0 bg-navy-900/35 animate-fade-in" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          'relative z-10 flex max-h-[92vh] w-full flex-col overflow-hidden border border-line bg-white shadow-pop',
          'rounded-t-xl sm:rounded-lg animate-slide-up sm:animate-fade-up',
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
              className="-mr-1 -mt-0.5 rounded p-1.5 text-navy-400 transition-colors hover:bg-surface hover:text-navy-800"
              aria-label="Cerrar"
            >
              <X size={16} />
            </button>
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-2 border-t border-line bg-surface px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
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
      <div className="text-base leading-relaxed text-navy-700">{description}</div>
    </Modal>
  );
}

/* ──────────────────────────── Estados de pantalla ────────────────────────── */

export function EmptyState({
  title, description, action, className,
}: { title: string; description?: React.ReactNode; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn('px-6 py-12 text-center', className)}>
      <h3 className="text-md font-semibold text-navy-900">{title}</h3>
      {description && <p className="mx-auto mt-1.5 max-w-md text-base leading-relaxed text-muted">{description}</p>}
      {action && <div className="mt-5 flex justify-center gap-2">{action}</div>}
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
      {description && <p className="mt-1.5 max-w-2xl text-base leading-relaxed text-navy-700">{description}</p>}
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
  const bg = { neutral: 'bg-navy-400', ok: 'bg-ok', warn: 'bg-warn', bad: 'bg-bad', info: 'bg-info', solid: 'bg-navy-900' }[tone];
  return (
    <div className={cn('w-full overflow-hidden rounded-full bg-navy-100', className)} style={{ height }}>
      <div className={cn('h-full rounded-full transition-[width] duration-300', bg)} style={{ width: `${pct}%` }} />
    </div>
  );
}

/** Cifra con etiqueta. Sin icono decorativo. */
export function Figure({
  label, value, hint, tone, className,
}: { label: string; value: React.ReactNode; hint?: React.ReactNode; tone?: 'ok' | 'warn' | 'bad'; className?: string }) {
  const color = tone ? { ok: 'text-ok', warn: 'text-warn', bad: 'text-bad' }[tone] : 'text-navy-900';
  return (
    <div className={className}>
      <p className="eyebrow">{label}</p>
      <p className={cn('mt-1 text-2xl font-semibold leading-none tabular-nums', color)}>{value}</p>
      {hint && <p className="mt-1.5 text-sm text-muted">{hint}</p>}
    </div>
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
            'absolute z-50 mt-1 min-w-[200px] overflow-hidden rounded-md border border-line bg-white p-1 shadow-pop animate-fade-up',
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
    tone === 'danger' ? 'text-bad hover:bg-bad/6' : 'text-navy-700 hover:bg-surface hover:text-navy-900',
  );
  const inner = (
    <>
      {icon && <span className="text-navy-400">{icon}</span>}
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
  return (
    <div className={cn('mb-5', className)}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          {eyebrow && <div className="mb-1 flex flex-wrap items-center gap-2 text-sm text-muted">{eyebrow}</div>}
          <h1 className="text-xl font-semibold leading-tight sm:text-2xl">{title}</h1>
          {description && <p className="mt-1 max-w-2xl text-base leading-relaxed text-muted">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
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
      <span
        role="tooltip"
        className={cn(
          'pointer-events-none absolute left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded bg-navy-900 px-2 py-1 text-xs text-white opacity-0 transition-opacity duration-120 group-hover/tt:opacity-100',
          side === 'top' ? 'bottom-full mb-1.5' : 'top-full mt-1.5',
        )}
      >
        {label}
      </span>
    </span>
  );
}
