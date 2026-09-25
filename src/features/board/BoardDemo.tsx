/**
 * Demostración de la pizarra para la página pública.
 * Usa exactamente el mismo motor que la aplicación: lo que se ve aquí es lo
 * que hace el producto, no una animación grabada aparte.
 */

import { useMemo, useState } from 'react';
import { Pause, Play, RotateCcw } from 'lucide-react';
import { BoardStage } from './BoardStage';
import { usePlayback, formatSeconds } from './playback';
import type { Scene } from './scene';
import { cn } from '@/lib/utils';

/**
 * Una salida de balón desde atrás: la portera abre a la lateral, se progresa
 * por dentro y se termina con un centro. Las posiciones están separadas a
 * propósito para que ninguna ficha tape a otra.
 */
const DEMO: Scene = {
  version: 1,
  pitch: 'completo',
  durationMs: 7000,
  objects: [
    { id: 'p1', kind: 'jugadora', label: '1' },
    { id: 'p4', kind: 'jugadora', label: '4' },
    { id: 'p6', kind: 'jugadora', label: '6' },
    { id: 'p8', kind: 'jugadora', label: '8' },
    { id: 'p10', kind: 'jugadora', label: '10' },
    { id: 'p11', kind: 'jugadora', label: '11' },
    { id: 'p9', kind: 'jugadora', label: '9' },
    { id: 'r5', kind: 'rival', label: '2' },
    { id: 'r8', kind: 'rival', label: '3' },
    { id: 'r7', kind: 'rival', label: '7' },
    { id: 'ball', kind: 'balon', label: '' },
  ],
  tracks: {
    p1: [{ t: 0, x: 7, y: 34 }, { t: 1400, x: 11, y: 34, move: 'carrera' }],
    p4: [
      { t: 0, x: 22, y: 14 },
      { t: 1600, x: 31, y: 10, move: 'carrera' },
      { t: 3600, x: 44, y: 9, move: 'conduccion' },
    ],
    p6: [{ t: 0, x: 30, y: 40 }, { t: 2200, x: 41, y: 38, move: 'desmarque' }],
    p8: [
      { t: 0, x: 47, y: 24 },
      { t: 2800, x: 60, y: 22, move: 'carrera' },
      { t: 4800, x: 73, y: 20, move: 'carrera' },
    ],
    p10: [{ t: 0, x: 54, y: 46 }, { t: 3200, x: 68, y: 44, move: 'desmarque' }],
    p11: [
      { t: 0, x: 62, y: 60 },
      { t: 3400, x: 78, y: 60, move: 'carrera' },
      { t: 5400, x: 92, y: 52, move: 'carrera' },
    ],
    p9: [
      { t: 0, x: 76, y: 34 },
      { t: 4000, x: 88, y: 30, move: 'desmarque' },
      { t: 6200, x: 96, y: 38, move: 'carrera' },
    ],
    r5: [{ t: 0, x: 36, y: 26 }, { t: 2000, x: 30, y: 18, move: 'carrera' }],
    r8: [{ t: 0, x: 55, y: 32 }, { t: 3000, x: 62, y: 28, move: 'carrera' }],
    r7: [{ t: 0, x: 72, y: 50 }, { t: 3800, x: 82, y: 52, move: 'carrera' }],
    ball: [
      { t: 0, x: 9, y: 34 },
      { t: 1400, x: 11, y: 34, ease: 'lineal' },
      { t: 2000, x: 31, y: 10, ease: 'lineal', move: 'pase' },
      { t: 3600, x: 44, y: 9, ease: 'lineal', move: 'conduccion' },
      { t: 4300, x: 60, y: 22, ease: 'lineal', move: 'pase' },
      { t: 4900, x: 73, y: 20, ease: 'lineal', move: 'conduccion' },
      { t: 5600, x: 92, y: 52, ease: 'lineal', move: 'pase' },
      { t: 6400, x: 96, y: 38, ease: 'lineal', move: 'pase' },
    ],
  },
};

export function BoardDemo({
  tone = 'light', className,
}: {
  /** `dark` para las bandas oscuras de la página pública. */
  tone?: 'light' | 'dark';
  className?: string;
}) {
  const scene = useMemo(() => DEMO, []);
  const playback = usePlayback(scene.durationMs);
  // El campo arranca limpio. Dibujar de golpe todas las trayectorias sólo
  // consigue que no se entienda ninguna; el movimiento se explica solo.
  const [verTrayectorias, setVerTrayectorias] = useState(false);
  const oscuro = tone === 'dark';

  return (
    <div
      className={cn(
        'overflow-hidden rounded-lg border',
        oscuro ? 'border-white/10 bg-white/[0.04]' : 'border-line bg-white',
        className,
      )}
    >
      <div className={cn('p-2', oscuro ? 'bg-black/20' : 'bg-navy-900/5')}>
        <div className="w-full overflow-hidden rounded">
          <BoardStage
            scene={scene}
            playback={playback}
            selected={null}
            onSelect={() => {}}
            onMove={() => {}}
            editable={false}
            showPaths={verTrayectorias && !playback.playing}
          />
        </div>
      </div>

      <div className={cn('flex items-center gap-2 border-t px-3 py-2', oscuro ? 'border-white/10' : 'border-line')}>
        <button
          onClick={() => {
            setVerTrayectorias(true);
            playback.toggle();
          }}
          className={cn(
            'inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors',
            oscuro
              ? 'bg-pitch-500 text-night hover:bg-pitch-400'
              : 'bg-navy-900 text-white hover:bg-navy-800',
          )}
        >
          {playback.playing ? <Pause size={14} /> : <Play size={14} />}
          {playback.playing ? 'Pausar' : 'Reproducir'}
        </button>
        <button
          onClick={playback.reset}
          aria-label="Volver al principio"
          className={cn(
            'inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-sm transition-colors',
            oscuro
              ? 'border-white/20 text-white/70 hover:border-white/50'
              : 'border-line text-navy-700 hover:border-navy-400',
          )}
        >
          <RotateCcw size={14} />
        </button>
        <span className={cn('ml-auto text-xs tabular-nums', oscuro ? 'text-white/45' : 'text-muted')}>
          {formatSeconds(playback.time)} / {formatSeconds(scene.durationMs)}
        </span>
      </div>
    </div>
  );
}
