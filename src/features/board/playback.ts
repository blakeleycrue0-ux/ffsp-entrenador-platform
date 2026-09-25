/**
 * Motor de reproducción.
 * ---------------------------------------------------------------------------
 * El tiempo lo lleva el reloj del navegador (`performance.now`), no una cadena
 * de temporizadores: cada fotograma se calcula a partir del tiempo transcurrido
 * de verdad. Por eso la reproducción es igual de larga en un portátil que en un
 * móvil, aunque uno dibuje a 60 fps y el otro a 30, y por eso pausar y
 * continuar no produce ningún salto — al reanudar se reajusta el origen.
 *
 * El estado de reproducción vive aquí, aparte del estado de edición: mover el
 * cabezal no modifica la jugada.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

export type Speed = 0.5 | 1 | 2;

export interface Playback {
  /** Instante actual en milisegundos. */
  time: number;
  playing: boolean;
  speed: Speed;
  loop: boolean;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  reset: () => void;
  /** Lleva el cabezal a un instante concreto sin alterar la jugada. */
  seek: (ms: number) => void;
  setSpeed: (s: Speed) => void;
  setLoop: (v: boolean) => void;
  /** Se suscribe a cada fotograma. Devuelve la función para darse de baja. */
  subscribe: (fn: (ms: number) => void) => () => void;
}

export function usePlayback(durationMs: number): Playback {
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<Speed>(1);
  const [loop, setLoop] = useState(false);

  const timeRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const lastRef = useRef(0);
  const listeners = useRef(new Set<(ms: number) => void>());

  // Los valores que necesita el bucle sin reiniciarlo en cada cambio.
  const speedRef = useRef(speed);
  const loopRef = useRef(loop);
  const durationRef = useRef(durationMs);
  speedRef.current = speed;
  loopRef.current = loop;
  durationRef.current = Math.max(1, durationMs);

  const publish = useCallback((ms: number) => {
    timeRef.current = ms;
    listeners.current.forEach((fn) => fn(ms));
  }, []);

  const stopLoop = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const tick = useCallback(
    (now: number) => {
      const delta = now - lastRef.current;
      lastRef.current = now;

      // Un salto grande (pestaña en segundo plano) no debe adelantar la jugada.
      const step = Math.min(delta, 100) * speedRef.current;
      let next = timeRef.current + step;

      if (next >= durationRef.current) {
        if (loopRef.current) {
          next = next % durationRef.current;
        } else {
          publish(durationRef.current);
          setTime(durationRef.current);
          setPlaying(false);
          stopLoop();
          return;
        }
      }

      publish(next);
      setTime(next);
      rafRef.current = requestAnimationFrame(tick);
    },
    [publish, stopLoop],
  );

  const play = useCallback(() => {
    if (rafRef.current !== null) return;
    // Al llegar al final, reproducir vuelve a empezar.
    if (timeRef.current >= durationRef.current - 1) {
      publish(0);
      setTime(0);
    }
    setPlaying(true);
    lastRef.current = performance.now();
    rafRef.current = requestAnimationFrame(tick);
  }, [publish, tick]);

  const pause = useCallback(() => {
    stopLoop();
    setPlaying(false);
  }, [stopLoop]);

  const toggle = useCallback(() => {
    if (rafRef.current !== null) pause();
    else play();
  }, [pause, play]);

  const seek = useCallback(
    (ms: number) => {
      const clamped = Math.min(durationRef.current, Math.max(0, ms));
      publish(clamped);
      setTime(clamped);
      // Si estaba reproduciendo, el siguiente fotograma parte de aquí.
      lastRef.current = performance.now();
    },
    [publish],
  );

  const reset = useCallback(() => {
    stopLoop();
    setPlaying(false);
    publish(0);
    setTime(0);
  }, [publish, stopLoop]);

  const subscribe = useCallback((fn: (ms: number) => void) => {
    listeners.current.add(fn);
    fn(timeRef.current);
    return () => {
      listeners.current.delete(fn);
    };
  }, []);

  // Si la jugada se acorta por debajo del cabezal, se recoloca.
  useEffect(() => {
    if (timeRef.current > durationMs) seek(durationMs);
  }, [durationMs, seek]);

  useEffect(() => stopLoop, [stopLoop]);

  return { time, playing, speed, loop, play, pause, toggle, reset, seek, setSpeed, setLoop, subscribe };
}

/** «1,5 s» — con coma decimal, como se escribe en español. */
export const formatSeconds = (ms: number) =>
  `${(ms / 1000).toFixed(1).replace('.', ',')} s`;
