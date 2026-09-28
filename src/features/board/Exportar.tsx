/**
 * «Exportar jugada».
 * ---------------------------------------------------------------------------
 * Una hoja de cristal con tres estados y ni uno más: elegir, esperar y ver lo
 * que ha salido. Lo que se enseña en cada uno es lo que de verdad hay:
 *
 *  · Si el navegador no sabe grabar vídeo, se dice ANTES de elegir nada y se
 *    ofrece la imagen. Nada de una barra que acaba en un error.
 *  · El progreso es el de verdad —la grabación va en tiempo real—, no una
 *    animación que va al 90 % y se queda esperando.
 *  · El formato que se anuncia es el del archivo. Si sale WebM, pone WebM.
 *  · Al terminar se puede VER antes de guardar. Guardar a ciegas un archivo
 *    de varios megas para descubrir que no era lo que se quería es tiempo
 *    tirado.
 */

import { useEffect, useRef, useState } from 'react';
import { Button, Checkbox, Segmented } from '@/components/ui';
import { AJUSTES_POR_DEFECTO, type Ajustes } from './lienzo';
import {
  exportaVideo, formatoDisponible, guardaArchivo, tamano, type Resultado,
} from './exportVideo';
import type { Scene } from './scene';
import { cn } from '@/lib/utils';

type Estado = 'eligiendo' | 'grabando' | 'listo';

export function Exportar({
  scene, nombre, onCerrar, onImagen,
}: {
  scene: Scene;
  nombre: string;
  onCerrar: () => void;
  /** La otra salida: el instante actual como PNG. */
  onImagen?: () => void;
}) {
  const [estado, setEstado] = useState<Estado>('eligiendo');
  const [alto, setAlto] = useState<'720' | '1080'>('1080');
  const [ajustes, setAjustes] = useState<Ajustes>(AJUSTES_POR_DEFECTO);
  const [parte, setParte] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [salida, setSalida] = useState<Resultado | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const aborto = useRef<AbortController | null>(null);

  const formato = formatoDisponible();

  // Ni una URL de objeto viva de más: cada una retiene el archivo en memoria.
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);
  useEffect(() => () => aborto.current?.abort(), []);

  const grabar = async () => {
    setEstado('grabando');
    setError(null);
    setParte(0);
    aborto.current = new AbortController();
    try {
      const r = await exportaVideo({
        scene,
        alto: Number(alto),
        ajustes,
        senal: aborto.current.signal,
        onProgreso: setParte,
      });
      setSalida(r);
      setUrl(URL.createObjectURL(r.blob));
      setEstado('listo');
    } catch (e) {
      if ((e as Error)?.name === 'AbortError') {
        setEstado('eligiendo');
        return;
      }
      setError((e as Error)?.message ?? 'No hemos podido generar el vídeo.');
      setEstado('eligiendo');
    }
  };

  const segundos = (scene.durationMs / 1000).toFixed(1).replace('.', ',');

  return (
    <div className="fixed inset-0 z-hoja flex items-end justify-center sm:items-center">
      <button
        aria-label="Cerrar"
        onClick={estado === 'grabando' ? () => aborto.current?.abort() : onCerrar}
        className="absolute inset-0 animate-fade-in bg-black/60 backdrop-blur-sm"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-exportar"
        className="cristal relative w-full max-w-[440px] animate-sheet-in rounded-t-4xl px-5 pb-7 pt-6 sm:rounded-4xl sm:pb-6"
      >
        <span aria-hidden className="absolute left-1/2 top-2.5 h-1 w-10 -translate-x-1/2 rounded-full bg-white/25 sm:hidden" />

        <p className="rotulo">Exportar</p>
        <h2 id="titulo-exportar" className="cifra mt-1.5 text-2xl">{nombre || 'La jugada'}</h2>

        {estado === 'eligiendo' && (
          <div className="mt-5 space-y-5">
            {!formato ? (
              <>
                <p className="text-base leading-relaxed text-ink-500">
                  Este navegador no sabe grabar vídeo, así que no podemos generarlo aquí. Prueba
                  desde Chrome, Safari o Firefox actualizados. Mientras tanto puedes llevarte el
                  instante que hay en pantalla como imagen.
                </p>
                {onImagen && (
                  <Button size="lg" block onClick={() => { onImagen(); onCerrar(); }}>
                    Guardar imagen
                  </Button>
                )}
              </>
            ) : (
              <>
                <div>
                  <p className="rotulo mb-2">Calidad</p>
                  <Segmented<'720' | '1080'>
                    value={alto}
                    onChange={setAlto}
                    options={[{ id: '720', label: '720p' }, { id: '1080', label: '1080p' }]}
                  />
                </div>

                <div className="space-y-2.5">
                  <p className="rotulo">Qué se ve</p>
                  <Checkbox
                    checked={ajustes.dorsales}
                    onChange={(v) => setAjustes((a) => ({ ...a, dorsales: v }))}
                    label="Dorsales"
                  />
                  <Checkbox
                    checked={ajustes.nombres}
                    onChange={(v) => setAjustes((a) => ({ ...a, nombres: v }))}
                    label="Nombres"
                  />
                  <Checkbox
                    checked={ajustes.trayectorias}
                    onChange={(v) => setAjustes((a) => ({ ...a, trayectorias: v }))}
                    label="Trayectorias"
                  />
                  <Checkbox
                    checked={ajustes.marca}
                    onChange={(v) => setAjustes((a) => ({ ...a, marca: v }))}
                    label="Marca de Playoff360"
                  />
                </div>

                {error && <p className="text-base leading-relaxed text-bad">{error}</p>}

                <div>
                  <Button size="lg" block onClick={() => void grabar()}>
                    Generar vídeo
                  </Button>
                  {/* Lo que va a pasar, dicho antes: cuánto tarda y qué sale. */}
                  <p className="mt-2.5 text-center text-sm leading-relaxed text-ink-500">
                    Tarda lo que dura la jugada, {segundos} s, porque se graba mientras se
                    reproduce. Saldrá un archivo {formato.nombre}. No cierres esta pestaña.
                  </p>
                  {/* La imagen sigue estando SIEMPRE, no sólo cuando el vídeo
                      falla: para meter una jugada en una pizarra de vestuario
                      o en un grupo de mensajes, un PNG va mejor que un vídeo. */}
                  {onImagen && (
                    <Button
                      size="lg"
                      block
                      variant="ghost"
                      className="mt-2"
                      onClick={() => { onImagen(); onCerrar(); }}
                    >
                      Guardar el instante como imagen
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {estado === 'grabando' && (
          <div className="mt-8 flex flex-col items-center">
            <Aro parte={parte} />
            <p className="mt-5 text-md text-ink-700">Preparando la jugada</p>
            <p className="mt-1 text-sm text-ink-500">Se está grabando en tiempo real.</p>
            <Button variant="ghost" className="mt-6" onClick={() => aborto.current?.abort()}>
              Cancelar
            </Button>
          </div>
        )}

        {estado === 'listo' && salida && url && (
          <div className="mt-5 space-y-4">
            <video
              src={url}
              controls
              autoPlay
              loop
              playsInline
              className="w-full rounded-2xl border border-line bg-black"
            />
            <p className="text-sm text-ink-500">
              {salida.ancho} × {salida.alto} · {salida.formato.nombre} · {tamano(salida.blob.size)}
            </p>
            <div className="space-y-2">
              <Button
                size="lg"
                block
                onClick={() => guardaArchivo(salida.blob, nombre, salida.formato.ext)}
              >
                Guardar vídeo
              </Button>
              <Button size="lg" block variant="ghost" onClick={() => { setEstado('eligiendo'); setSalida(null); }}>
                Hacer otra
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** El progreso, en un anillo. Es el de verdad: sube con la grabación. */
function Aro({ parte }: { parte: number }) {
  const r = 34;
  const vuelta = 2 * Math.PI * r;
  return (
    <div className="relative grid h-[92px] w-[92px] place-items-center">
      <svg width="92" height="92" viewBox="0 0 92 92" className="-rotate-90" aria-hidden>
        <circle cx="46" cy="46" r={r} fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="5" />
        <circle
          cx="46" cy="46" r={r}
          fill="none" stroke="#0A8CFF" strokeWidth="5" strokeLinecap="round"
          strokeDasharray={vuelta}
          strokeDashoffset={vuelta * (1 - Math.min(1, Math.max(0, parte)))}
          style={{ transition: 'stroke-dashoffset .12s linear' }}
        />
      </svg>
      <span
        className={cn('cifra absolute text-lg tabular-nums')}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(parte * 100)}
      >
        {Math.round(parte * 100)} %
      </span>
    </div>
  );
}
