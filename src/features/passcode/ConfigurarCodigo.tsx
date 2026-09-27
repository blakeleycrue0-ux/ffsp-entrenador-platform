/**
 * Poner o cambiar el código de acceso.
 * ---------------------------------------------------------------------------
 * Tres momentos como mucho: el código de ahora (sólo si ya había uno), el
 * nuevo y repetirlo. La repetición no es burocracia: un código de cuatro
 * cifras mal tecleado no se nota hasta el día siguiente, cuando ya no se
 * puede entrar, y entonces hay que rehacer la sesión entera.
 *
 * SI NO COINCIDEN SE VUELVE AL PRINCIPIO. Dejar la segunda pantalla puesta
 * invita a insistir sobre un código que a lo mejor no era el que se quería;
 * empezar de cero es un toque más y quita la duda.
 */

import { useEffect, useRef, useState } from 'react';
import { Puntos, Teclado, LARGO, type Fase } from './Teclado';
import { esCodigoObvio, passcode } from '@/services/passcode';
import { humanError } from '@/services/supabase';

type Paso = 'actual' | 'nuevo' | 'repetir';

const TITULO: Record<Paso, string> = {
  actual: 'Tu código de ahora',
  nuevo: 'Elige un código',
  repetir: 'Repítelo',
};

export function ConfigurarCodigo({
  /** Si ya hay código puesto, primero hay que escribirlo. */
  yaTiene,
  onHecho,
  onCancelar,
}: {
  yaTiene: boolean;
  onHecho: () => void;
  onCancelar?: () => void;
}) {
  const [paso, setPaso] = useState<Paso>(yaTiene ? 'actual' : 'nuevo');
  const [pin, setPin] = useState('');
  const [actual, setActual] = useState('');
  const [primero, setPrimero] = useState('');
  const [fase, setFase] = useState<Fase>('escribiendo');
  const [aviso, setAviso] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const relojes = useRef<number[]>([]);

  // Ningún temporizador debe sobrevivir a la pantalla: pintaría sobre nada.
  useEffect(() => {
    const lista = relojes.current;
    return () => lista.forEach(window.clearTimeout);
  }, []);
  const luego = (fn: () => void, ms: number) => {
    relojes.current.push(window.setTimeout(fn, ms));
  };

  const fallar = (mensaje: string, siguiente: Paso) => {
    setFase('mal');
    setError(mensaje);
    luego(() => {
      setPin('');
      setFase('escribiendo');
      setPaso(siguiente);
    }, 520);
  };

  const guardar = async (nuevo: string, elDeAntes: string) => {
    setEnviando(true);
    setError(null);
    try {
      const r = await passcode.guardar(nuevo, elDeAntes || undefined);
      if (r.ok) {
        setFase('bien');
        luego(onHecho, 780);
        return;
      }
      if (r.motivo === 'bloqueado') {
        fallar('Demasiados intentos. Espera un poco antes de volver a probar.', 'actual');
        return;
      }
      fallar('El código de ahora no es correcto.', 'actual');
    } catch (e) {
      setFase('escribiendo');
      setPin('');
      setError(humanError(e));
    } finally {
      setEnviando(false);
    }
  };

  const escribir = (v: string) => {
    if (fase !== 'escribiendo' || enviando) return;
    setError(null);
    setPin(v);
    if (v.length < LARGO) return;

    if (paso === 'actual') {
      setActual(v);
      luego(() => { setPin(''); setPaso('nuevo'); }, 120);
      return;
    }

    if (paso === 'nuevo') {
      setPrimero(v);
      setAviso(esCodigoObvio(v) ? 'Es de los primeros que prueba cualquiera. Puedes usarlo, pero protege menos.' : null);
      luego(() => { setPin(''); setPaso('repetir'); }, 120);
      return;
    }

    if (v !== primero) {
      setPrimero('');
      setAviso(null);
      fallar('No coinciden. Empezamos otra vez.', 'nuevo');
      return;
    }

    void guardar(v, actual);
  };

  return (
    <div className="mx-auto w-full max-w-[340px] text-center">
      <h2 className="cifra text-2xl">{TITULO[paso]}</h2>
      <p className="mt-2 min-h-[38px] px-2 text-base leading-relaxed text-ink-500">
        {error ? (
          <span className="text-bad">{error}</span>
        ) : paso === 'actual' ? (
          'Para cambiarlo, escribe primero el que tienes puesto.'
        ) : paso === 'nuevo' ? (
          'Cuatro cifras. Te las pedirá al volver a la aplicación en este móvil.'
        ) : (
          'Otra vez, para asegurarnos de que no hay un dedo de más.'
        )}
      </p>

      <div className="mt-3">
        <Puntos valor={pin} fase={fase} />
      </div>

      <div className="mt-7">
        <Teclado
          valor={pin}
          onChange={escribir}
          disabled={fase !== 'escribiendo' || enviando}
          extra={onCancelar ? { label: 'Cancelar', onClick: onCancelar } : undefined}
        />
      </div>

      {aviso && paso === 'repetir' && (
        <p className="mt-6 text-sm leading-relaxed text-warn">{aviso}</p>
      )}

      <p className="mt-6 text-sm leading-relaxed text-ink-500">
        El código se queda en este dispositivo como candado. Tu cuenta sigue entrando con el correo y
        la contraseña de siempre.
      </p>
    </div>
  );
}
