/**
 * El candado.
 * ---------------------------------------------------------------------------
 * Se pone delante de la aplicación cuando la cuenta tiene código y esta
 * pestaña todavía no lo ha escrito. Dos cosas que conviene tener claras:
 *
 * · NO ES UN PERMISO. Los permisos los da RLS en el servidor. Esto tapa la
 *   pantalla, que es justo el problema que resuelve: el móvil encendido encima
 *   de la mesa del vestuario. Quien tenga el testigo de sesión entero ya podía
 *   llamar a la API sin pasar por aquí, con candado o sin él.
 *
 * · NUNCA ES UN CALLEJÓN SIN SALIDA. Quien olvide el código entra con su
 *   contraseña —la autenticación de verdad, comprobada por Supabase Auth— y el
 *   código se quita. Un candado del que no se puede salir no protege: encierra.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Button, Field, Input } from '@/components/ui';
import { Marca } from '@/components/ui/Brand';
import { Puntos, Teclado, LARGO, type Fase } from './Teclado';
import {
  cuantoQueda, marcarDesbloqueado, olvidarDesbloqueo, passcode,
} from '@/services/passcode';
import { supabase, humanError } from '@/services/supabase';
import { auth } from '@/services/auth';

export function PantallaBloqueo({ userId, onEntrar }: { userId: string; onEntrar: () => void }) {
  const [pin, setPin] = useState('');
  const [fase, setFase] = useState<Fase>('escribiendo');
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [bloqueo, setBloqueo] = useState<Date | null>(null);
  const [ahora, setAhora] = useState(Date.now());
  const [olvidado, setOlvidado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const relojes = useRef<number[]>([]);

  useEffect(() => {
    const lista = relojes.current;
    return () => lista.forEach(window.clearTimeout);
  }, []);
  const luego = (fn: () => void, ms: number) => { relojes.current.push(window.setTimeout(fn, ms)); };

  // Mientras hay espera, la cuenta atrás se refresca sola.
  useEffect(() => {
    if (!bloqueo) return;
    const id = window.setInterval(() => setAhora(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [bloqueo]);

  const enEspera = Boolean(bloqueo && bloqueo.getTime() > ahora);
  const queda = enEspera ? cuantoQueda(bloqueo) : null;

  const entrar = useCallback(() => {
    marcarDesbloqueado(userId);
    onEntrar();
  }, [onEntrar, userId]);

  const comprobar = async (v: string) => {
    setEnviando(true);
    try {
      const r = await passcode.verificar(v);
      if (r.ok) {
        setFase('bien');
        luego(entrar, 720);
        return;
      }
      if (r.motivo === 'sin_pin') {
        entrar();
        return;
      }
      if (r.motivo === 'bloqueado') {
        setBloqueo(r.bloqueadoHasta ?? null);
        setAhora(Date.now());
        setFase('mal');
        setMensaje(null);
        luego(() => { setPin(''); setFase('escribiendo'); }, 520);
        return;
      }
      setFase('mal');
      setMensaje(
        r.restantes != null && r.restantes <= 2
          ? `No es ese. ${r.restantes === 1 ? 'Queda 1 intento' : `Quedan ${r.restantes} intentos`} antes de tener que esperar.`
          : 'No es ese código.',
      );
      luego(() => { setPin(''); setFase('escribiendo'); }, 520);
    } catch (e) {
      setFase('escribiendo');
      setPin('');
      setMensaje(humanError(e));
    } finally {
      setEnviando(false);
    }
  };

  const escribir = (v: string) => {
    if (fase !== 'escribiendo' || enviando || enEspera) return;
    setMensaje(null);
    setPin(v);
    if (v.length === LARGO) void comprobar(v);
  };

  if (olvidado) {
    return <OlvidadoElCodigo onVolver={() => setOlvidado(false)} onListo={entrar} />;
  }

  return (
    <Marco>
      <p className="mt-6 text-base leading-relaxed text-ink-500">
        {enEspera
          ? `Demasiados intentos. Vuelve a probar en ${queda}.`
          : (mensaje ?? 'Escribe tu código para entrar.')}
      </p>

      <div className="mt-4">
        <Puntos valor={pin} fase={fase} />
      </div>

      <div className="mt-8">
        <Teclado
          valor={pin}
          onChange={escribir}
          disabled={fase !== 'escribiendo' || enviando || enEspera}
          extra={{ label: 'No lo recuerdo', onClick: () => setOlvidado(true) }}
        />
      </div>
    </Marco>
  );
}

/**
 * La salida: la contraseña de la cuenta. La comprueba Supabase Auth, no
 * nosotros; si no la acepta, aquí no se quita ningún código.
 */
function OlvidadoElCodigo({ onVolver, onListo }: { onVolver: () => void; onListo: () => void }) {
  const [email, setEmail] = useState('');
  const [clave, setClave] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [yendo, setYendo] = useState(false);

  // El correo ya lo sabemos: no hay que hacérselo escribir otra vez.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setEmail(data.session?.user.email ?? ''));
  }, []);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setYendo(true);
    setError(null);
    try {
      await passcode.restablecerConContrasena(email, clave);
      onListo();
    } catch (err) {
      setError(humanError(err));
      setYendo(false);
    }
  };

  const salir = async () => {
    olvidarDesbloqueo();
    await auth.signOut();
  };

  return (
    <Marco>
      <p className="mt-6 text-base leading-relaxed text-ink-500">
        Escribe la contraseña de tu cuenta. Quitaremos el código y podrás poner otro cuando quieras.
      </p>

      <form onSubmit={(e) => void enviar(e)} className="mt-6 space-y-3 text-left">
        <Field label="Correo">
          <Input
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </Field>
        <Field label="Contraseña" error={error ?? undefined}>
          <Input
            type="password"
            autoComplete="current-password"
            value={clave}
            onChange={(e) => setClave(e.target.value)}
            autoFocus
            required
          />
        </Field>

        <Button type="submit" size="lg" block loading={yendo}>
          Quitar el código y entrar
        </Button>
        <Button type="button" size="lg" block variant="ghost" onClick={onVolver}>
          Volver al código
        </Button>
      </form>

      <button
        type="button"
        onClick={() => void salir()}
        className="mt-6 text-sm text-ink-500 underline-offset-4 hover:text-ink-800 hover:underline"
      >
        Cerrar sesión en este dispositivo
      </button>
    </Marco>
  );
}

function Marco({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen place-items-center bg-surface px-5 py-10">
      <div className="w-full max-w-[340px] animate-fade-up text-center">
        <Marca size={34} className="mx-auto text-ink-900" />
        <h1 className="cifra mt-5 text-2xl">Playoff360</h1>
        {children}
      </div>
    </div>
  );
}
