/**
 * Exportar la jugada como vídeo.
 * ---------------------------------------------------------------------------
 * SE DICE LA VERDAD SOBRE EL FORMATO. El navegador graba con los códecs que
 * tiene, y no son los mismos en todos: Safari da MP4 y Chrome suele dar WebM.
 * Se pide MP4 primero y, si no lo hay, se graba en WebM y el archivo se llama
 * `.webm`. Ponerle `.mp4` a un WebM es la clase de mentira que no se descubre
 * hasta que alguien intenta subirlo a algún sitio y le dice que está corrupto.
 * El nombre del archivo y lo que pone la pantalla coinciden siempre.
 *
 * Y si el navegador no sabe grabar vídeo, se dice antes de empezar y se ofrece
 * la imagen, en vez de dejar una barra de progreso que acaba en nada.
 *
 * LA GRABACIÓN VA EN TIEMPO REAL, a propósito. `MediaRecorder` marca cada
 * fotograma con el reloj de verdad: dibujar más deprisa no hace un vídeo más
 * corto, hace un vídeo acelerado. Así que una jugada de ocho segundos tarda
 * ocho segundos en exportarse, y el progreso que se enseña es el de verdad.
 */

import { medidas, pintaEscena, type Ajustes } from './lienzo';
import type { Scene } from './scene';

export interface Formato {
  mime: string;
  /** La extensión que de verdad le corresponde al archivo. */ ext: 'mp4' | 'webm';
  /** Cómo se llama en la pantalla. */ nombre: string;
}

/* Por orden de preferencia. MP4 primero porque es el que abre en todas
   partes sin explicaciones. */
const CANDIDATOS: Formato[] = [
  { mime: 'video/mp4;codecs=avc1.42E01E', ext: 'mp4', nombre: 'MP4' },
  { mime: 'video/mp4', ext: 'mp4', nombre: 'MP4' },
  { mime: 'video/webm;codecs=vp9', ext: 'webm', nombre: 'WebM' },
  { mime: 'video/webm;codecs=vp8', ext: 'webm', nombre: 'WebM' },
  { mime: 'video/webm', ext: 'webm', nombre: 'WebM' },
];

/** Qué puede grabar ESTE navegador, o `null` si no puede grabar vídeo. */
export function formatoDisponible(): Formato | null {
  if (typeof window === 'undefined' || typeof MediaRecorder === 'undefined') return null;
  for (const c of CANDIDATOS) {
    try {
      if (MediaRecorder.isTypeSupported(c.mime)) return c;
    } catch {
      /* algún navegador antiguo lanza aquí en vez de devolver false */
    }
  }
  return null;
}

export interface Resultado {
  blob: Blob;
  formato: Formato;
  ancho: number;
  alto: number;
}

export interface Peticion {
  scene: Scene;
  /** Alto del vídeo en píxeles: 720 o 1080. */
  alto: number;
  ajustes: Ajustes;
  /** 0 a 1. Se llama muchas veces; la pantalla decide cada cuánto repinta. */
  onProgreso?: (parte: number) => void;
  /** Para poder cancelar sin dejar la grabadora corriendo. */
  senal?: AbortSignal;
}

const FPS = 30;

/**
 * Graba la jugada entera y devuelve el archivo. No bloquea la interfaz: entre
 * fotograma y fotograma se devuelve el control al navegador.
 */
export async function exportaVideo({
  scene, alto, ajustes, onProgreso, senal,
}: Peticion): Promise<Resultado> {
  const formato = formatoDisponible();
  if (!formato) throw new Error('Este navegador no sabe grabar vídeo.');

  const tam = medidas(scene, alto);
  const canvas = document.createElement('canvas');
  canvas.width = tam.ancho;
  canvas.height = tam.alto;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No hemos podido preparar el lienzo.');

  // Un primer fotograma antes de empezar: si no, el vídeo abre en negro.
  pintaEscena(ctx, scene, 0, tam.ancho, tam.alto, ajustes);

  const stream = canvas.captureStream(FPS);
  const grabadora = new MediaRecorder(stream, {
    mimeType: formato.mime,
    videoBitsPerSecond: alto >= 1080 ? 8_000_000 : 4_000_000,
  });

  const trozos: BlobPart[] = [];
  grabadora.ondataavailable = (e) => { if (e.data.size > 0) trozos.push(e.data); };

  const parar = () => {
    if (grabadora.state !== 'inactive') grabadora.stop();
    stream.getTracks().forEach((t) => t.stop());
  };

  const duracion = Math.max(500, scene.durationMs);
  grabadora.start();

  try {
    await new Promise<void>((resolve, reject) => {
      const t0 = performance.now();
      const paso = () => {
        if (senal?.aborted) {
          reject(new DOMException('Cancelado', 'AbortError'));
          return;
        }
        const t = performance.now() - t0;
        pintaEscena(ctx, scene, Math.min(t, duracion), tam.ancho, tam.alto, ajustes);
        onProgreso?.(Math.min(1, t / duracion));
        /* Un pelín de más al final: sin ese margen, el último fotograma a
           veces no llega a entrar en el archivo y el vídeo acaba antes de que
           la jugada termine. */
        if (t >= duracion + 250) resolve();
        else requestAnimationFrame(paso);
      };
      requestAnimationFrame(paso);
    });

    const listo = new Promise<void>((resolve) => { grabadora.onstop = () => resolve(); });
    parar();
    await listo;
  } catch (e) {
    parar();
    throw e;
  }

  const blob = new Blob(trozos, { type: formato.mime });
  if (blob.size === 0) throw new Error('La grabación ha salido vacía. Vuelve a intentarlo.');
  return { blob, formato, ancho: tam.ancho, alto: tam.alto };
}

const limpiarNombre = (nombre: string) =>
  nombre.replace(/[^\p{L}\p{N} _-]/gu, '').trim() || 'jugada';

/** Descarga el archivo con la extensión que de verdad tiene. */
export function guardaArchivo(blob: Blob, nombre: string, ext: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${limpiarNombre(nombre)}.${ext}`;
  a.click();
  // Revocar en el acto cancela la descarga en algunos navegadores.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** «2,4 MB», para que se sepa lo que se va a guardar. */
export function tamano(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(1).replace('.', ',')} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} kB`;
}
