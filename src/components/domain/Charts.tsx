/**
 * Micrográficos.
 * Regla del producto: nunca gráficos innecesariamente complejos. Sólo dos
 * formas — barras y línea suave — dibujadas en SVG, sin librería y sin ejes
 * decorativos. Se leen de un vistazo.
 */

import { cn, shortDate } from '@/lib/utils';

export function BarTrend({
  data, height = 96, className, suffix = '%',
}: {
  data: { label: string; value: number }[];
  height?: number;
  className?: string;
  suffix?: string;
}) {
  // Suelo dinámico: si todos los valores están altos, arrancar en 0 aplana el
  // gráfico y no se lee nada. Se deja siempre algo de base visible.
  const max = Math.max(...data.map((d) => d.value), 1);
  const min = Math.min(...data.map((d) => d.value));
  const floor = Math.max(0, min - (max - min) * 0.6 - 4);
  const track = height - 36;

  return (
    <div className={cn('flex items-end gap-2', className)} style={{ height }}>
      {data.map((d, i) => (
        <div key={i} className="group flex flex-1 flex-col items-center justify-end gap-1.5">
          <span className="text-[11px] font-semibold text-ink-500 tabular-nums">
            {d.value}
            {suffix}
          </span>
          <div
            className="w-full rounded-t-md bg-brand-200 transition-colors duration-200 group-hover:bg-brand-500"
            style={{ height: `${Math.max(6, ((d.value - floor) / (max - floor || 1)) * track)}px` }}
            title={`${d.label}: ${d.value}${suffix}`}
          />
          <span className="text-[10.5px] text-ink-400">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

export function LineTrend({
  points, height = 110, className,
}: { points: { date: string; rate: number }[]; height?: number; className?: string }) {
  if (points.length < 2) {
    return (
      <div className={cn('grid place-items-center text-[13px] text-ink-400', className)} style={{ height }}>
        Aún no hay datos suficientes para dibujar la evolución.
      </div>
    );
  }
  const W = 320;
  const H = height;
  const pad = 12;
  const min = Math.min(50, ...points.map((p) => p.rate));
  const span = Math.max(1, 100 - min);
  const x = (i: number) => pad + (i * (W - pad * 2)) / (points.length - 1);
  const y = (v: number) => H - pad - ((v - min) / span) * (H - pad * 2);

  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(p.rate).toFixed(1)}`).join(' ');
  const area = `${line} L ${x(points.length - 1)} ${H - pad} L ${x(0)} ${H - pad} Z`;

  return (
    <div className={className}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }} preserveAspectRatio="none">
        <defs>
          <linearGradient id="lt-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#653F8A" stopOpacity="0.16" />
            <stop offset="100%" stopColor="#653F8A" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#lt-fill)" />
        <path d={line} fill="none" stroke="#7A5CA8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          <circle key={i} cx={x(i)} cy={y(p.rate)} r="3" fill="#fff" stroke="#653F8A" strokeWidth="2" />
        ))}
      </svg>
      <div className="mt-1 flex justify-between px-1 text-[10.5px] text-ink-400">
        <span>{shortDate(points[0].date)}</span>
        <span>{shortDate(points[points.length - 1].date)}</span>
      </div>
    </div>
  );
}

/** Anillo de progreso — para porcentajes únicos (asistencia media, confirmaciones). */
export function Ring({
  value, size = 72, stroke = 7, label, tone = 'brand',
}: { value: number; size?: number; stroke?: number; label?: string; tone?: 'brand' | 'success' | 'warning' }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const color = { brand: '#7A5CA8', success: '#2F8F5B', warning: '#E9A23B' }[tone];
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#F0EFF4" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={c}
          strokeDashoffset={c - (Math.min(100, Math.max(0, value)) / 100) * c}
          style={{ transition: 'stroke-dashoffset .7s cubic-bezier(.22,1,.36,1)' }}
        />
      </svg>
      <div className="absolute text-center">
        <span className="block text-[15px] font-semibold leading-none text-ink-900 tabular-nums">{value}%</span>
        {label && <span className="mt-0.5 block text-[10px] text-ink-400">{label}</span>}
      </div>
    </div>
  );
}

/** Barra segmentada (presentes / justificados / ausentes). */
export function SplitBar({
  segments, height = 8, className,
}: { segments: { value: number; color: string; label: string }[]; height?: number; className?: string }) {
  const total = segments.reduce((a, s) => a + s.value, 0) || 1;
  return (
    <div className={cn('flex w-full overflow-hidden rounded-full bg-ink-100', className)} style={{ height }}>
      {segments.map((s, i) => (
        <div
          key={i}
          className={cn('transition-[width] duration-500', s.color)}
          style={{ width: `${(s.value / total) * 100}%` }}
          title={`${s.label}: ${s.value}`}
        />
      ))}
    </div>
  );
}
