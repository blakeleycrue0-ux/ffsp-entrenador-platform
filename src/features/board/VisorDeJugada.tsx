/**
 * La pizarra en el móvil: se ve, se reproduce, no se edita.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * POR QUÉ NO SE EDITA AQUÍ, Y NO ES UNA FUNCIÓN QUE FALTE.
 *
 * Montar una jugada es colocar quince fichas con precisión de medio metro,
 * dibujar recorridos a mano alzada y cuadrar tiempos en una regla. Eso pide
 * un puntero fino y sitio para ver el campo entero a la vez. En una pantalla
 * de 390 px con un dedo encima no hay ni una cosa ni la otra: el dedo tapa
 * justo lo que está moviendo, los mandos ocupan la mitad del campo, y cada
 * gesto de arrastrar compite con el de desplazar la página.
 *
 * Se intentó igual y el resultado era el que era. Dejarlo a medias no es
 * neutral: una herramienta que se puede abrir pero no usar hace perder más
 * tiempo que una que dice desde el principio dónde se usa.
 *
 * ASÍ QUE AQUÍ SE VE Y SE REPRODUCE, QUE ES EL 90 % DE LAS VECES QUE SE ABRE
 * UNA PIZARRA EN UN MÓVIL: estás en el campo, quieres enseñarle a alguien la
 * jugada que montaste anoche, le das al play y la ves. Eso funciona perfecto
 * con un dedo, y es lo que se queda.
 *
 * LO QUE NO SE HACE: esconder la pizarra del móvil. Las jugadas siguen ahí,
 * se abren, se ven y se reproducen. Lo único que no está es la edición, y se
 * dice por qué y dónde se hace.
 */

import { useEffect, useState } from 'react';
import { Monitor, Pause, Play, RotateCcw } from 'lucide-react';
import { BoardStage } from './BoardStage';
import { type Scene } from './scene';
import { formatSeconds, type Playback } from './playback';
import { cn } from '@/lib/utils';

/**
 * ¿Cabe el editor? A partir de 1024 px, sí.
 *
 * SE DECIDE AQUÍ Y NO CON CLASES DE CSS, y hay un motivo que no es de estilo:
 * con `lg:hidden` y `hidden lg:block` se montan LAS DOS pizarras y sólo se
 * esconde una. Son dos lienzos completos, cada uno con sus suscripciones a la
 * reproducción y su trabajo en cada fotograma, y uno de los dos no se ve.
 * Además el campo oculto seguía apareciendo en el documento, que es
 * exactamente la clase de cosa que hace que una prueba agarre el elemento
 * equivocado — y que pasó.
 *
 * Con esto sólo existe el que se usa.
 */
export function useCabeElEditor(): boolean {
  const [cabe, setCabe] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches,
  );
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const alCambiar = () => setCabe(mq.matches);
    mq.addEventListener('change', alCambiar);
    return () => mq.removeEventListener('change', alCambiar);
  }, []);
  return cabe;
}

export function VisorDeJugada({
  scene,
  playback,
  className,
}: {
  scene: Scene;
  playback: Playback;
  className?: string;
}) {
  const [aviso, setAviso] = useState(true);
  const vacia = scene.objects.length === 0;

  return (
    <div className={cn('space-y-3', className)}>
      {/* ── EL CAMPO ─────────────────────────────────────────────────────
          `editable={false}` y sin herramienta: ni se arrastra una ficha ni se
          dibuja nada. Lo que sí funciona es la reproducción, que es a lo que
          se viene. */}
      <div className="overflow-hidden rounded-2xl">
        <BoardStage
          scene={scene}
          playback={playback}
          selected={null}
          onSelect={() => {}}
          onMove={() => {}}
          editable={false}
          showPaths
          presenting
          llenar
        />
      </div>

      {vacia ? (
        <p className="px-1 text-base leading-relaxed text-ink-600">
          Esta jugada no tiene nada colocado todavía.
        </p>
      ) : (
        /* Los mandos: reproducir, volver al principio y dónde va. Tres cosas,
           grandes y separadas, que es lo que se puede tocar con un pulgar
           mientras sujetas el móvil con la otra mano. */
        <div className="flex items-center gap-2">
          <button
            onClick={() => (playback.playing ? playback.pause() : playback.play())}
            aria-label={playback.playing ? 'Pausa' : 'Reproducir'}
            className="metal-claro grid h-12 w-12 shrink-0 place-items-center rounded-full text-white"
          >
            {playback.playing ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
          </button>
          <button
            onClick={playback.reset}
            aria-label="Volver al principio"
            className="metal grid h-12 w-12 shrink-0 place-items-center rounded-full text-ink-800"
          >
            <RotateCcw size={17} />
          </button>
          <span className="ml-1 text-base tabular-nums text-ink-600">
            {formatSeconds(playback.time)} / {formatSeconds(scene.durationMs)}
          </span>
        </div>
      )}

      {/* ── POR QUÉ NO SE PUEDE EDITAR, DICHO UNA VEZ ────────────────────
          Se puede cerrar. Quien ya lo sabe no tiene que leerlo cada vez que
          abre una jugada en el campo. */}
      {aviso && (
        <div className="flex items-start gap-3 rounded-2xl border border-line-sutil bg-panel px-4 py-3.5">
          <Monitor size={18} className="mt-0.5 shrink-0 text-ink-500" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-base font-medium text-ink-900">Las jugadas se montan en el ordenador</p>
            <p className="mt-1 text-sm leading-relaxed text-ink-600">
              Colocar fichas y dibujar recorridos necesita una pantalla grande y un ratón. Desde el
              móvil puedes abrirlas y verlas en marcha, que es para lo que sirven en el campo.
            </p>
          </div>
          <button
            onClick={() => setAviso(false)}
            className="shrink-0 text-sm font-medium text-ink-500 underline-offset-4 hover:text-ink-900 hover:underline"
          >
            Vale
          </button>
        </div>
      )}
    </div>
  );
}
