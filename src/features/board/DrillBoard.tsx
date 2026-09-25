/**
 * La pizarra dentro de un ejercicio.
 * ---------------------------------------------------------------------------
 * Es el mismo motor que la pizarra táctica, en versión compacta. Un ejercicio
 * puede llevar una animación que explique la situación mejor que un párrafo.
 */

import { useCallback, useMemo, useRef, useState } from 'react';
import { Pause, Play, RotateCcw } from 'lucide-react';
import { Button, EmptyState } from '@/components/ui';
import { BoardEditor, useBoardHistory } from './BoardEditor';
import { BoardStage } from './BoardStage';
import { formatSeconds, usePlayback } from './playback';
import { EMPTY_SCENE, layoutTeam, parseScene, type Scene } from './scene';
import { cn } from '@/lib/utils';

/** Editor para la ficha de un ejercicio. */
export function DrillBoardEditor({
  value, onChange,
}: { value: unknown; onChange: (scene: Scene | null) => void }) {
  const [scene, setScene] = useState<Scene>(() => parseScene(value));
  const playback = usePlayback(scene.durationMs);
  const svgRef = useRef<SVGSVGElement>(null);

  const apply = useCallback(
    (s: Scene) => {
      setScene(s);
      onChange(s.objects.length === 0 ? null : s);
    },
    [onChange],
  );
  const history = useBoardHistory(scene, apply);

  if (scene.objects.length === 0) {
    return (
      <EmptyState
        title="Este ejercicio no tiene esquema"
        description="Dibuja la situación y, si quieres, anímala: se reproducirá dentro de la ficha del ejercicio."
        action={
          <>
            <Button onClick={() => history.commit(layoutTeam({ ...EMPTY_SCENE, pitch: 'medio' }, 'jugadora'))}>
              Empezar con una alineación
            </Button>
            <Button
              variant="secondary"
              onClick={() => history.commit({ ...EMPTY_SCENE, pitch: 'medio', durationMs: 5000 })}
            >
              Empezar en blanco
            </Button>
          </>
        }
      />
    );
  }

  return (
    <BoardEditor scene={scene} playback={playback} history={history} svgRef={svgRef} compact />
  );
}

/** Reproductor de sólo lectura para ver el ejercicio. */
export function DrillBoardViewer({ value, className }: { value: unknown; className?: string }) {
  const scene = useMemo(() => parseScene(value), [value]);
  const playback = usePlayback(scene.durationMs);
  const animada = Object.values(scene.tracks).some((t) => t.length > 1);

  if (scene.objects.length === 0) return null;

  return (
    <div className={cn('overflow-hidden rounded-md border border-line', className)}>
      <div className="bg-navy-900/5 p-2">
        <BoardStage
          scene={scene}
          playback={playback}
          selected={null}
          onSelect={() => {}}
          onMove={() => {}}
          editable={false}
          showPaths={!playback.playing}
        />
      </div>
      {animada && (
        <div className="flex items-center gap-2 border-t border-line px-2.5 py-1.5">
          <Button
            size="sm"
            onClick={playback.toggle}
            icon={playback.playing ? <Pause size={14} /> : <Play size={14} />}
          >
            {playback.playing ? 'Pausar' : 'Reproducir'}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={playback.reset}
            icon={<RotateCcw size={14} />}
            aria-label="Volver al principio"
          />
          <span className="ml-auto text-xs tabular-nums text-muted">
            {formatSeconds(playback.time)} / {formatSeconds(scene.durationMs)}
          </span>
        </div>
      )}
    </div>
  );
}
