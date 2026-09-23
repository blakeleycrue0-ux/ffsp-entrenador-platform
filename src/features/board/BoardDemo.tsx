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

/** Una salida de balón desde atrás: tres pases y una llegada al área. */
const DEMO: Scene = {
  version: 1,
  pitch: 'completo',
  durationMs: 7000,
  objects: [
    { id: 'p1', kind: 'jugadora', label: '1' },
    { id: 'p4', kind: 'jugadora', label: '4' },
    { id: 'p5', kind: 'jugadora', label: '5' },
    { id: 'p6', kind: 'jugadora', label: '6' },
    { id: 'p8', kind: 'jugadora', label: '8' },
    { id: 'p11', kind: 'jugadora', label: '11' },
    { id: 'p9', kind: 'jugadora', label: '9' },
    { id: 'r1', kind: 'rival', label: '9' },
    { id: 'r2', kind: 'rival', label: '10' },
    { id: 'r3', kind: 'rival', label: '6' },
    { id: 'ball', kind: 'balon', label: '' },
  ],
  tracks: {
    p1: [{ t: 0, x: 6, y: 34 }, { t: 1200, x: 9, y: 34 }],
    p4: [{ t: 0, x: 20, y: 22 }, { t: 1400, x: 26, y: 18 }, { t: 3200, x: 34, y: 16 }],
    p5: [{ t: 0, x: 20, y: 46 }, { t: 1400, x: 26, y: 50 }],
    p6: [{ t: 0, x: 34, y: 34 }, { t: 2000, x: 44, y: 30 }, { t: 4200, x: 56, y: 28 }],
    p8: [{ t: 0, x: 48, y: 44 }, { t: 2600, x: 62, y: 46 }, { t: 4600, x: 74, y: 44 }],
    p11: [{ t: 0, x: 58, y: 60 }, { t: 3000, x: 74, y: 62 }, { t: 5200, x: 88, y: 56 }],
    p9: [{ t: 0, x: 70, y: 34 }, { t: 3400, x: 82, y: 30 }, { t: 5400, x: 93, y: 36 }],
    r1: [{ t: 0, x: 30, y: 34 }, { t: 1600, x: 24, y: 26 }, { t: 3400, x: 34, y: 24 }],
    r2: [{ t: 0, x: 46, y: 26 }, { t: 2400, x: 44, y: 34 }, { t: 4400, x: 54, y: 34 }],
    r3: [{ t: 0, x: 62, y: 44 }, { t: 3000, x: 66, y: 50 }, { t: 5000, x: 78, y: 50 }],
    ball: [
      { t: 0, x: 8, y: 34 },
      { t: 1300, x: 9, y: 34, ease: 'lineal' },
      { t: 1900, x: 26, y: 18, ease: 'lineal' },
      { t: 3200, x: 34, y: 16, ease: 'lineal' },
      { t: 3900, x: 56, y: 28, ease: 'lineal' },
      { t: 4600, x: 74, y: 44, ease: 'lineal' },
      { t: 5400, x: 88, y: 56, ease: 'lineal' },
      { t: 6300, x: 93, y: 36, ease: 'lineal' },
    ],
  },
};

export function BoardDemo({ className }: { className?: string }) {
  const scene = useMemo(() => DEMO, []);
  const playback = usePlayback(scene.durationMs);
  const [started, setStarted] = useState(false);

  return (
    <div className={cn('overflow-hidden rounded-lg border border-line bg-white', className)}>
      <div className="bg-navy-900/5 p-2">
        <div className="aspect-[105/68] w-full overflow-hidden rounded">
          <BoardStage
            scene={scene}
            playback={playback}
            selected={null}
            onSelect={() => {}}
            onMove={() => {}}
            editable={false}
            showPaths={!started}
          />
        </div>
      </div>

      <div className="flex items-center gap-2 border-t border-line px-3 py-2">
        <button
          onClick={() => {
            setStarted(true);
            playback.toggle();
          }}
          className="inline-flex h-8 items-center gap-1.5 rounded-md bg-navy-900 px-3 text-sm font-medium text-white transition-colors hover:bg-navy-800"
        >
          {playback.playing ? <Pause size={14} /> : <Play size={14} />}
          {playback.playing ? 'Pausar' : 'Reproducir'}
        </button>
        <button
          onClick={playback.reset}
          aria-label="Volver al principio"
          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-line px-2.5 text-sm text-navy-700 transition-colors hover:border-navy-400"
        >
          <RotateCcw size={14} />
        </button>
        <span className="ml-auto text-xs tabular-nums text-muted">
          {formatSeconds(playback.time)} / {formatSeconds(scene.durationMs)}
        </span>
      </div>
    </div>
  );
}
