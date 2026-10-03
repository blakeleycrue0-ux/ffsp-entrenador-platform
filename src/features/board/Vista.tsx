/**
 * Desde dónde se mira el campo.
 * ---------------------------------------------------------------------------
 * Antes esto era un interruptor de dos posiciones, horizontal o vertical, y
 * las dos eran la misma vista plana. Ahora la cámara gira y se inclina, así
 * que hace falta un mando de verdad: unas cuantas vistas con nombre para ir
 * rápido y dos barras para dejarla donde se quiera.
 *
 * Las vistas con nombre no son un modo aparte. Cada una es sólo una pareja de
 * números, de manera que se puede empezar en «Banda» y seguir moviendo la
 * cámara desde ahí; cuando deja de coincidir con ninguna, se dice «A mano» en
 * lugar de fingir que sigue en la de antes.
 */

import { RotateCcw, RotateCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { INCLINACION_MAXIMA, VISTAS, normalizaCamara, vistaDe, type Camara } from './camara';

/* ────────────────────────────── Una barra ────────────────────────────────── */

function Barra({
  label, valor, min, max, paso = 1, sufijo, onChange, disabled, children,
}: {
  label: string;
  valor: number;
  min: number;
  max: number;
  paso?: number;
  sufijo: string;
  onChange: (v: number) => void;
  disabled?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="label mb-0">{label}</span>
        <span className="tabular-nums text-xs text-muted">
          {Math.round(valor)}
          {sufijo}
        </span>
      </div>
      <div className="mt-1.5 flex items-center gap-2">
        <input
          type="range"
          className="barra min-w-0 flex-1"
          min={min}
          max={max}
          step={paso}
          value={valor}
          disabled={disabled}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-label={label}
        />
        {children}
      </div>
    </div>
  );
}

/* ──────────────────────────── El mando entero ────────────────────────────── */

export function MandoDeVista({
  camara, onChange, disabled,
}: {
  camara: Camara;
  onChange: (c: Camara) => void;
  disabled?: boolean;
}) {
  const cam = normalizaCamara(camara);
  const actual = vistaDe(cam);
  const gira = (grados: number) => onChange({ ...cam, giro: cam.giro + grados });

  return (
    <div className="space-y-3">
      <div>
        <span className="label">Vista</span>
        <div className="mt-1 flex flex-wrap gap-1">
          {VISTAS.map((v) => (
            <button
              key={v.id}
              type="button"
              disabled={disabled}
              onClick={() => onChange(v.camara)}
              aria-pressed={actual === v.id}
              title={v.pista}
              className={cn(
                'rounded-md border px-2 py-1 text-xs font-medium transition-colors disabled:opacity-40',
                actual === v.id
                  ? 'border-transparent bg-ink-900 text-ink-0'
                  : 'border-line text-ink-600 hover:text-ink-900',
              )}
            >
              {v.label}
            </button>
          ))}
          {!actual && (
            /* No es un botón: es el estado en el que está. Fingir que una de
               las vistas con nombre sigue activa sería mentir. */
            <span className="rounded-md border border-dashed border-line px-2 py-1 text-xs text-muted">
              A mano
            </span>
          )}
        </div>
        {actual && <p className="mt-1.5 text-xs text-muted">{VISTAS.find((v) => v.id === actual)?.pista}</p>}
      </div>

      <Barra
        label="Inclinación"
        valor={cam.inclinacion}
        min={0}
        max={INCLINACION_MAXIMA}
        sufijo="°"
        disabled={disabled}
        onChange={(v) => onChange({ ...cam, inclinacion: v })}
      />

      <Barra
        label="Giro"
        valor={cam.giro}
        min={0}
        max={359}
        sufijo="°"
        disabled={disabled}
        onChange={(v) => onChange({ ...cam, giro: v })}
      >
        {/* Los cuartos de vuelta a mano, que es lo que se usa el 90 % de las
            veces y con la barra cuesta clavar. */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => gira(-90)}
          aria-label="Girar un cuarto de vuelta a la izquierda"
          className="shrink-0 rounded-md border border-line p-1.5 text-ink-600 transition-colors hover:text-ink-900 disabled:opacity-40"
        >
          <RotateCcw size={13} />
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => gira(90)}
          aria-label="Girar un cuarto de vuelta a la derecha"
          className="shrink-0 rounded-md border border-line p-1.5 text-ink-600 transition-colors hover:text-ink-900 disabled:opacity-40"
        >
          <RotateCw size={13} />
        </button>
      </Barra>

      <p className="text-xs text-muted">
        La vista es de la jugada: se guarda con ella y así se abre siempre como la dejaste.
      </p>
    </div>
  );
}
