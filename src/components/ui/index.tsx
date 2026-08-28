/**
 * Sistema de componentes — FFSP
 * ---------------------------------------------------------------------------
 * Piezas neutras y reutilizables. Ninguna conoce el dominio: reciben props.
 * Paleta: blanco + grises + lila del escudo del Santa Ponsa CF.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, ChevronDown, Loader2, X } from 'lucide-react';
import { cn, initials } from '@/lib/utils';

/* ─────────────────────────────────── Botón ───────────────────────────────── */

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger' | 'whatsapp';
type ButtonSize = 'sm' | 'md' | 'lg';

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-brand-700 text-white hover:bg-brand-800 active:bg-brand-900 shadow-brand disabled:bg-brand-300',
  secondary: 'bg-brand-50 text-brand-800 hover:bg-brand-100 border border-brand-200/80',
  outline: 'bg-white text-ink-800 border border-ink-200 hover:border-brand-300 hover:text-brand-800 hover:bg-brand-50/50',
  ghost: 'text-ink-600 hover:bg-ink-100 hover:text-ink-900',
  danger: 'bg-white text-danger border border-danger/30 hover:bg-danger/5',
  whatsapp: 'bg-[#1F9D55] text-white hover:bg-[#188045] shadow-[0_6px_18px_-8px_rgba(31,157,85,.6)]',
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-[13px] gap-1.5 rounded-lg',
  md: 'h-10 px-4 text-[14px] gap-2 rounded-xl',
  lg: 'h-12 px-6 text-[15px] gap-2.5 rounded-xl',
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
        'inline-flex items-center justify-center whitespace-nowrap font-medium transition-all duration-150 select-none',
        'disabled:opacity-60 disabled:cursor-not-allowed active:scale-[.985]',
        BUTTON_VARIANTS[variant],
        BUTTON_SIZES[size],
        block && 'w-full',
        className,
      )}
      {...rest}
    >
      {loading ? <Loader2 size={16} className="animate-spin" /> : icon}
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
        'inline-flex items-center justify-center whitespace-nowrap font-medium transition-all duration-150',
        'active:scale-[.985]',
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

/* ─────────────────────────────────── Card ────────────────────────────────── */

export function Card({
  className, children, interactive, ...rest
}: React.HTMLAttributes<HTMLDivElement> & { interactive?: boolean }) {
  return (
    <div className={cn('card', interactive && 'card-hover cursor-pointer', className)} {...rest}>
      {children}
    </div>
  );
}

export function CardHeader({
  title, subtitle, action, icon, className,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-start justify-between gap-4 px-5 pt-5 pb-3', className)}>
      <div className="flex items-start gap-3 min-w-0">
        {icon && (
          <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700">
            {icon}
          </span>
        )}
        <div className="min-w-0">
          <h3 className="text-[15px] font-semibold leading-tight truncate">{title}</h3>
          {subtitle && <p className="mt-0.5 text-[13px] text-ink-500 truncate">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/* ─────────────────────────────────── Badge ───────────────────────────────── */

type BadgeTone = 'brand' | 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'outline';

const BADGE_TONES: Record<BadgeTone, string> = {
  brand: 'bg-brand-50 text-brand-800 ring-brand-200/70',
  neutral: 'bg-ink-100 text-ink-600 ring-ink-200',
  success: 'bg-pitch/10 text-[#1F6B44] ring-pitch/20',
  warning: 'bg-sun/12 text-[#9A6412] ring-sun/25',
  danger: 'bg-danger/10 text-[#A63B34] ring-danger/20',
  info: 'bg-sea/10 text-[#28618C] ring-sea/20',
  outline: 'bg-white text-ink-600 ring-ink-200',
};

export function Badge({
  tone = 'neutral', children, className, dot, size = 'md',
}: {
  tone?: BadgeTone;
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
  size?: 'sm' | 'md';
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium ring-1 ring-inset whitespace-nowrap',
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-[12px]',
        BADGE_TONES[tone],
        className,
      )}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />}
      {children}
    </span>
  );
}

/* ─────────────────────────────────── Avatar ──────────────────────────────── */

export function Avatar({
  name, src, size = 40, number, className,
}: { name: string; src?: string; size?: number; number?: number; className?: string }) {
  return (
    <span className={cn('relative inline-flex shrink-0', className)}>
      <span
        className="grid place-items-center rounded-full bg-gradient-to-br from-brand-100 to-brand-200/70 font-semibold text-brand-800 ring-1 ring-inset ring-white/60"
        style={{ width: size, height: size, fontSize: size * 0.36 }}
      >
        {src ? (
          <img src={src} alt={name} className="h-full w-full rounded-full object-cover" />
        ) : (
          initials(name)
        )}
      </span>
      {number !== undefined && (
        <span
          className="absolute -bottom-1 -right-1 grid place-items-center rounded-full bg-white text-[10px] font-bold text-ink-700 ring-1 ring-ink-200"
          style={{ width: size * 0.45, height: size * 0.45 }}
        >
          {number}
        </span>
      )}
    </span>
  );
}

/* ─────────────────────────────── Campos de forma ─────────────────────────── */

export function Field({
  label, hint, error, children, className,
}: { label?: string; hint?: string; error?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      {label && <label className="label">{label}</label>}
      {children}
      {hint && !error && <p className="mt-1.5 text-[12px] text-ink-400">{hint}</p>}
      {error && <p className="mt-1.5 text-[12px] text-danger">{error}</p>}
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
    return <textarea ref={ref} className={cn('field resize-y min-h-[96px] leading-relaxed', className)} {...rest} />;
  },
);

export function Select({
  className, children, ...rest
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select className={cn('field appearance-none pr-9 cursor-pointer', className)} {...rest}>
        {children}
      </select>
      <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-400" />
    </div>
  );
}

export function Checkbox({
  checked, onChange, label, className,
}: { checked: boolean; onChange: (v: boolean) => void; label?: React.ReactNode; className?: string }) {
  return (
    <label className={cn('inline-flex cursor-pointer items-center gap-2.5 select-none', className)}>
      <span
        onClick={(e) => {
          e.preventDefault();
          onChange(!checked);
        }}
        className={cn(
          'grid h-[18px] w-[18px] shrink-0 place-items-center rounded-md border transition-all duration-150',
          checked ? 'border-brand-700 bg-brand-700 text-white' : 'border-ink-300 bg-white hover:border-brand-400',
        )}
      >
        {checked && <Check size={12} strokeWidth={3} />}
      </span>
      {label && <span className="text-[14px] text-ink-700">{label}</span>}
    </label>
  );
}

export function Toggle({
  checked, onChange, label,
}: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-3 select-none">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative h-6 w-11 rounded-full transition-colors duration-200',
          checked ? 'bg-brand-700' : 'bg-ink-200',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200',
            checked ? 'translate-x-[22px]' : 'translate-x-0.5',
          )}
        />
      </button>
      {label && <span className="text-[14px] text-ink-700">{label}</span>}
    </label>
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
    <div className={cn('flex gap-1 overflow-x-auto no-scrollbar border-b border-ink-200/80', className)}>
      {tabs.map((t) => {
        const active = t.id === value;
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className={cn(
              'relative shrink-0 px-3.5 py-2.5 text-[14px] font-medium transition-colors',
              active ? 'text-brand-800' : 'text-ink-500 hover:text-ink-800',
            )}
          >
            {t.label}
            {t.count !== undefined && (
              <span className={cn('ml-1.5 text-[12px]', active ? 'text-brand-500' : 'text-ink-400')}>{t.count}</span>
            )}
            {active && <span className="absolute inset-x-2 -bottom-px h-[2px] rounded-full bg-brand-700" />}
          </button>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────── Modal ───────────────────────────────── */

export function Modal({
  open, onClose, title, subtitle, children, footer, size = 'md',
}: {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
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
  const width = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl', xl: 'max-w-5xl' }[size];

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-6">
      <div className="absolute inset-0 bg-ink-900/25 backdrop-blur-[2px] animate-fade-in" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          'relative z-10 flex max-h-[92vh] w-full flex-col overflow-hidden bg-white shadow-pop',
          'rounded-t-3xl sm:rounded-2xl animate-slide-up sm:animate-scale-in',
          width,
        )}
      >
        {(title || subtitle) && (
          <div className="flex items-start justify-between gap-4 border-b border-ink-200/70 px-5 py-4 sm:px-6">
            <div className="min-w-0">
              {title && <h2 className="text-[17px] font-semibold leading-tight">{title}</h2>}
              {subtitle && <p className="mt-1 text-[13px] text-ink-500">{subtitle}</p>}
            </div>
            <button
              onClick={onClose}
              className="-mr-1 -mt-1 rounded-lg p-2 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700"
              aria-label="Cerrar"
            >
              <X size={18} />
            </button>
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-2.5 border-t border-ink-200/70 bg-ink-50/60 px-5 py-3.5 sm:px-6 pb-[max(0.875rem,env(safe-area-inset-bottom))]">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

/* ────────────────────────────── Estados vacíos ───────────────────────────── */

export function EmptyState({
  icon, title, description, action, compact,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center text-center', compact ? 'py-10 px-5' : 'py-16 px-6')}>
      {icon && (
        <span className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-brand-400">{icon}</span>
      )}
      <h3 className="text-[15px] font-semibold text-ink-800">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-[13.5px] leading-relaxed text-ink-500">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/* ───────────────────────────────── Skeletons ─────────────────────────────── */

export const Skeleton = ({ className }: { className?: string }) => (
  <div className={cn('skeleton', className)} />
);

export function SkeletonCard() {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-9 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3.5 w-1/3" />
          <Skeleton className="h-3 w-1/4" />
        </div>
      </div>
      <div className="mt-5 space-y-2.5">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-5/6" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </div>
  );
}

/* ───────────────────────── Progreso y micrográficos ──────────────────────── */

export function ProgressBar({
  value, tone = 'brand', className, height = 6,
}: { value: number; tone?: 'brand' | 'success' | 'warning' | 'danger'; className?: string; height?: number }) {
  const colors = {
    brand: 'bg-brand-600', success: 'bg-pitch', warning: 'bg-sun', danger: 'bg-danger',
  };
  return (
    <div className={cn('w-full overflow-hidden rounded-full bg-ink-100', className)} style={{ height }}>
      <div
        className={cn('h-full rounded-full transition-[width] duration-500 ease-out', colors[tone])}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

export function Stat({
  label, value, hint, tone,
}: { label: string; value: React.ReactNode; hint?: string; tone?: 'brand' | 'success' | 'warning' | 'danger' }) {
  const color = {
    brand: 'text-brand-700', success: 'text-[#1F6B44]', warning: 'text-[#9A6412]', danger: 'text-danger',
  }[tone ?? 'brand'];
  return (
    <div>
      <p className="text-[12px] font-medium uppercase tracking-wide text-ink-400">{label}</p>
      <p className={cn('mt-1 text-[26px] font-semibold leading-none tabular-nums', tone ? color : 'text-ink-900')}>
        {value}
      </p>
      {hint && <p className="mt-1.5 text-[12.5px] text-ink-500">{hint}</p>}
    </div>
  );
}

/* ──────────────────────────────── Tooltip ────────────────────────────────── */

export function Tooltip({ label, children, side = 'top' }: { label: string; children: React.ReactNode; side?: 'top' | 'right' }) {
  return (
    <span className="group/tt relative inline-flex">
      {children}
      <span
        className={cn(
          'pointer-events-none absolute z-50 whitespace-nowrap rounded-lg bg-ink-900 px-2.5 py-1.5 text-[12px] font-medium text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover/tt:opacity-100',
          side === 'top' ? 'bottom-full left-1/2 mb-2 -translate-x-1/2' : 'left-full top-1/2 ml-2 -translate-y-1/2',
        )}
      >
        {label}
      </span>
    </span>
  );
}

/* ─────────────────────────── Menú desplegable ────────────────────────────── */

export function Dropdown({
  trigger, children, align = 'right', className,
}: { trigger: React.ReactNode; children: (close: () => void) => React.ReactNode; align?: 'left' | 'right'; className?: string }) {
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
            'absolute z-50 mt-2 min-w-[220px] overflow-hidden rounded-xl border border-ink-200 bg-white p-1.5 shadow-pop animate-scale-in',
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
    'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[14px] transition-colors',
    tone === 'danger' ? 'text-danger hover:bg-danger/8' : 'text-ink-700 hover:bg-brand-50 hover:text-brand-800',
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
  eyebrow, title, description, actions, children,
}: {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          {eyebrow && <div className="mb-1.5 flex items-center gap-2 text-[13px] text-ink-500">{eyebrow}</div>}
          <h1 className="text-[24px] font-semibold leading-tight sm:text-[28px]">{title}</h1>
          {description && <p className="mt-1.5 max-w-2xl text-[14px] leading-relaxed text-ink-500">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  );
}

/* ─────────────────────────────── Segmentado ──────────────────────────────── */

export function SegmentedControl<T extends string>({
  options, value, onChange, className,
}: { options: { id: T; label: string }[]; value: T; onChange: (v: T) => void; className?: string }) {
  return (
    <div className={cn('inline-flex rounded-xl bg-ink-100 p-1', className)}>
      {options.map((o) => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          className={cn(
            'rounded-lg px-3.5 py-1.5 text-[13px] font-medium transition-all duration-150',
            value === o.id ? 'bg-white text-brand-800 shadow-sm' : 'text-ink-500 hover:text-ink-800',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
