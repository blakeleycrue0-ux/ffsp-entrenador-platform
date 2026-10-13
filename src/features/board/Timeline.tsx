/**
 * Línea de tiempo. El cabezal se puede arrastrar a cualquier instante y cada
 * marca es un fotograma clave de la jugada: se ve dónde cambia el movimiento y
 * se puede quitar sin tocar el resto.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import type { Playback } from './playback';
import { formatSeconds } from './playback';
import type { Scene } from './scene';

export function Timeline({
  scene, playback, selected, onRemoveKeyframe, editable,
}: {
  scene: Scene;
  playback: Playback;
  selected: string | null;
  onRemoveKeyframe: (objectId: string, t: number) => void;
  editable: boolean;
}) {
  const barRef = useRef<HTMLDivElement>(null);
  const headRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const [dragging, setDragging] = useState(false);
  const duration = Math.max(1, scene.durationMs);

  /* El cabezal se mueve con la reproducción, sin volver a dibujar la página. */
  useEffect(() => {
    return playback.subscribe((ms) => {
      const pct = `${(ms / duration) * 100}%`;
      if (headRef.current) headRef.current.style.left = pct;
      if (labelRef.current) labelRef.current.textContent = formatSeconds(ms);
    });
  }, [playback, duration]);

  const seekFromPointer = useCallback(
    (clientX: number) => {
      const el = barRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      playback.seek(ratio * duration);
    },
    [playback, duration],
  );

  useEffect(() => {
    if (!dragging) return;
    const move = (e: PointerEvent) => seekFromPointer(e.clientX);
    const up = () => setDragging(false);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
  }, [dragging, seekFromPointer]);

  const ticks = Math.min(20, Math.max(2, Math.round(duration / 1000)));

  /** Lo que se mueve, con su tramo: de aquí sale la tira de abajo. */
  const mueven = scene.objects
    .map((obj) => ({ obj, track: scene.tracks[obj.id] ?? [] }))
    .filter(({ track }) => track.length >= 2)
    .map(({ obj, track }) => ({
      obj,
      sale: track[0].t,
      termina: track[track.length - 1].t,
    }));

  return (
    <div className="select-none">
      <div className="mb-1.5 flex items-center justify-between text-xs text-muted">
        <span ref={labelRef} className="tabular-nums font-medium text-ink-900">
          {formatSeconds(playback.time)}
        </span>
        <span className="tabular-nums">Duración {formatSeconds(duration)}</span>
      </div>

      <div
        ref={barRef}
        className="relative h-11 cursor-pointer rounded-md border border-line bg-panel"
        onPointerDown={(e) => {
          setDragging(true);
          seekFromPointer(e.clientX);
        }}
        role="slider"
        aria-label="Instante de la jugada"
        aria-valuemin={0}
        aria-valuemax={Math.round(duration / 100) / 10}
        aria-valuenow={Math.round(playback.time / 100) / 10}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') playback.seek(playback.time + 100);
          if (e.key === 'ArrowLeft') playback.seek(playback.time - 100);
          if (e.key === 'Home') playback.seek(0);
          if (e.key === 'End') playback.seek(duration);
        }}
      >
        {/* Segundos */}
        {Array.from({ length: ticks + 1 }, (_, i) => (
          <div
            key={i}
            className="absolute top-0 h-2 w-px bg-line"
            style={{ left: `${(i / ticks) * 100}%` }}
          />
        ))}

        {/* Fotogramas clave por objeto */}
        <div className="absolute inset-x-0 bottom-1.5 top-3 px-0">
          {scene.objects.map((obj) => {
            const track = scene.tracks[obj.id] ?? [];
            if (track.length < 2 && obj.id !== selected) return null;
            const on = obj.id === selected;
            return track.map((k) => (
              <button
                key={`${obj.id}-${k.t}`}
                type="button"
                title={`${obj.kind === 'balon' ? 'Balón' : obj.label} · ${formatSeconds(k.t)}`}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  playback.seek(k.t);
                }}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  if (editable && k.t > 0) onRemoveKeyframe(obj.id, k.t);
                }}
                className={cn(
                  'absolute -translate-x-1/2 rotate-45 border transition-colors',
                  on
                    ? 'h-2.5 w-2.5 border-ink-900 bg-ink-900'
                    : 'h-2 w-2 border-ink-300 bg-panel hover:border-ink-600',
                )}
                style={{ left: `${(k.t / duration) * 100}%`, top: on ? 8 : 9 }}
                aria-label={`Fotograma de ${obj.label} en ${formatSeconds(k.t)}`}
              />
            ));
          })}
        </div>

        {/* Cabezal */}
        <div
          ref={headRef}
          className="pointer-events-none absolute inset-y-0 w-px bg-ink-900"
          style={{ left: `${(playback.time / duration) * 100}%` }}
        >
          <span className="absolute -left-[3px] -top-px h-1.5 w-1.5 rounded-full bg-ink-900" />
        </div>
      </div>

      {/* ── QUIÉN SALE CUÁNDO ────────────────────────────────────────────────
          Arriba, todas las marcas caen sobre la misma línea: se ve que hay
          fotogramas, no se ve de quién son ni en qué orden entra cada una. Con
          todo amontonado, una jugada en la que las cinco arrancan a la vez en
          el segundo cero y otra escalonada se dibujan casi igual, y la única
          manera de notar la diferencia era darle al play.
          Una barra por ficha, cada una empezando donde empieza de verdad, lo
          dice de un vistazo: si están todas pegadas al borde izquierdo, salen
          todas a la vez. */}
      {mueven.length > 0 && (
        <div className="mt-2 space-y-1">
          {mueven.map(({ obj, sale, termina }) => {
            const on = obj.id === selected;
            return (
              <div key={obj.id} className="flex items-center gap-2">
                <span
                  className={cn(
                    'w-14 shrink-0 truncate text-right text-[11px] leading-none',
                    on ? 'font-semibold text-ink-900' : 'text-muted',
                  )}
                  title={obj.kind === 'balon' ? 'Balón' : obj.label}
                >
                  {obj.kind === 'balon' ? 'Balón' : obj.label}
                </span>
                <div className="relative h-2 flex-1 rounded-full bg-ink-900/5">
                  <div
                    className={cn(
                      'absolute inset-y-0 rounded-full',
                      on ? 'bg-ink-900' : 'bg-ink-900/30',
                    )}
                    style={{
                      left: `${(sale / duration) * 100}%`,
                      width: `${Math.max(1.5, ((termina - sale) / duration) * 100)}%`,
                    }}
                  />
                </div>
                <span className="w-9 shrink-0 text-[11px] leading-none tabular-nums text-muted">
                  {formatSeconds(sale)}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {editable && (
        <p className="mt-1.5 text-xs text-muted">
          Arrastra sobre la barra para ir a cualquier instante. Doble clic en una marca para borrar
          ese fotograma. Cuándo sale cada una se cambia en su ficha, en «Sale».
        </p>
      )}
    </div>
  );
}
