/**
 * Confirmar una acción con el código.
 * ---------------------------------------------------------------------------
 * NO ES OTRA PÁGINA. Mandar a alguien a una pantalla aparte para escribir
 * cuatro cifras le hace perder de vista qué estaba confirmando exactamente.
 * Aquí la aplicación se queda detrás, en cristal ahumado, y sobre ella sube
 * una hoja que dice qué se va a hacer y pide el código.
 *
 * CUÁNDO SE PIDE. Sólo para lo que de verdad importa: tocar el pago, cancelar
 * o bajar de plan, cambiar el propio código, borrar un club o una cuenta,
 * sacar datos fuera. NO al abrir la ficha de una jugadora: un candado que
 * salta cada dos pantallas se convierte en un trámite que se teclea sin mirar,
 * y entonces ya no protege nada.
 *
 * SI NO HAY CÓDIGO PUESTO, NO SE PIDE NADA. El código es opcional: quien no lo
 * tenga hace la acción directamente, igual que antes. Bloquear a quien no lo
 * tiene sería convertir una comodidad en un peaje.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Puntos, Teclado, LARGO, type Fase } from './Teclado';
import { cuantoQueda, passcode } from '@/services/passcode';
import { humanError } from '@/services/supabase';

export interface Peticion {
  /** Qué se va a hacer, en una línea. Se enseña antes de pedir el código. */
  titulo: string;
  detalle?: string;
  /** Lo que se ejecuta si el código es correcto. */
  hacer: () => void | Promise<void>;
}

/**
 * Devuelve una función `confirmar(peticion)`. Si la cuenta tiene código, sube
 * la hoja; si no, ejecuta la acción directamente.
 */
export function useConfirmacion() {
  const [peticion, setPeticion] = useState<Peticion | null>(null);
  const tiene = useRef<boolean | null>(null);

  const confirmar = useCallback(async (p: Peticion) => {
    if (tiene.current === null) {
      try {
        tiene.current = (await passcode.estado()).tiene;
      } catch {
        /* Si no se puede saber, no se bloquea: el código es una comodidad,
           no el permiso. El permiso lo aplica el servidor en la acción. */
        tiene.current = false;
      }
    }
    if (!tiene.current) {
      await p.hacer();
      return;
    }
    setPeticion(p);
  }, []);

  const hoja = peticion ? (
    <HojaDeConfirmacion
      peticion={peticion}
      onCerrar={() => setPeticion(null)}
      onSinCodigo={() => { tiene.current = false; setPeticion(null); void peticion.hacer(); }}
    />
  ) : null;

  return { confirmar, hoja };
}

function HojaDeConfirmacion({
  peticion, onCerrar, onSinCodigo,
}: {
  peticion: Peticion;
  onCerrar: () => void;
  /** El código se quitó entre medias: no se deja a nadie encerrado. */
  onSinCodigo: () => void;
}) {
  const [pin, setPin] = useState('');
  const [fase, setFase] = useState<Fase>('escribiendo');
  const [error, setError] = useState<string | null>(null);
  const [bloqueo, setBloqueo] = useState<Date | null>(null);
  const [yendo, setYendo] = useState(false);
  const relojes = useRef<number[]>([]);

  useEffect(() => {
    const lista = relojes.current;
    return () => lista.forEach(window.clearTimeout);
  }, []);
  const luego = (fn: () => void, ms: number) => { relojes.current.push(window.setTimeout(fn, ms)); };

  const enEspera = Boolean(bloqueo && bloqueo.getTime() > Date.now());

  const comprobar = async (v: string) => {
    setYendo(true);
    try {
      const r = await passcode.verificar(v);
      if (r.ok) {
        setFase('bien');
        luego(() => { onCerrar(); void peticion.hacer(); }, 620);
        return;
      }
      if (r.motivo === 'sin_pin') { onSinCodigo(); return; }
      if (r.motivo === 'bloqueado') {
        setBloqueo(r.bloqueadoHasta ?? null);
        setError(`Demasiados intentos. Vuelve a probar en ${cuantoQueda(r.bloqueadoHasta ?? null) ?? 'un momento'}.`);
      } else {
        setError('No es ese código.');
      }
      setFase('mal');
      luego(() => { setPin(''); setFase('escribiendo'); }, 520);
    } catch (e) {
      setPin('');
      setError(humanError(e));
    } finally {
      setYendo(false);
    }
  };

  const escribir = (v: string) => {
    if (fase !== 'escribiendo' || yendo || enEspera) return;
    setError(null);
    setPin(v);
    if (v.length === LARGO) void comprobar(v);
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center">
      {/* La aplicación sigue ahí detrás, en cristal ahumado. */}
      <button
        aria-label="Cancelar"
        onClick={onCerrar}
        className="absolute inset-0 animate-fade-in bg-black/55 backdrop-blur-md"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-confirmar"
        className="cristal relative w-full max-w-[400px] animate-sheet-in rounded-t-4xl px-5 pb-7 pt-6 text-center sm:rounded-4xl sm:pb-6"
      >
        <span aria-hidden className="absolute left-1/2 top-2.5 h-1 w-10 -translate-x-1/2 rounded-full bg-white/25 sm:hidden" />

        <p className="rotulo">Confirmar acción</p>
        <h2 id="titulo-confirmar" className="cifra mt-1.5 text-xl">{peticion.titulo}</h2>
        <p className="mt-2 min-h-[38px] px-2 text-base leading-relaxed text-ink-500">
          {error ? <span className="text-bad">{error}</span> : (peticion.detalle ?? 'Introduce tu código de Playoff360.')}
        </p>

        <div className="mt-2">
          <Puntos valor={pin} fase={fase} />
        </div>

        <div className="mt-7">
          <Teclado
            valor={pin}
            onChange={escribir}
            disabled={fase !== 'escribiendo' || yendo || enEspera}
            extra={{ label: 'Cancelar', onClick: onCerrar }}
          />
        </div>
      </div>
    </div>
  );
}
