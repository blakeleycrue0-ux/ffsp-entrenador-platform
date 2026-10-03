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
import { useClub } from '@/store/store';
import { currentStaff, nombreReal } from '@/store/selectors';
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
    <Marco
      pie={
        /* La salida va al pie, separada del teclado: es lo último a lo que hay
           que recurrir, no una tecla más. */
        <button
          type="button"
          onClick={() => setOlvidado(true)}
          className="mt-6 shrink-0 text-[13px] font-medium text-ink-600 transition-colors hover:text-ink-900"
        >
          ¿Has olvidado el código?
        </button>
      }
    >
      {/* El renglón del aviso reserva su alto siempre: si apareciera y
          desapareciera, los puntos y el teclado darían un salto. */}
      <p className="mt-3 min-h-[40px] max-w-[280px] text-[13.5px] leading-relaxed text-ink-500">
        {enEspera
          ? `Demasiados intentos. Vuelve a probar en ${queda}.`
          : (mensaje ?? 'Escribe tu código para entrar.')}
      </p>

      <div className="mt-2">
        <Puntos valor={pin} fase={fase} />
      </div>

      {/* El hueco empuja el teclado a la mitad de abajo, que es donde llega el
          pulgar. En una pantalla alta crece; en una baja se encoge solo.
          En un ordenador se le pone tope: ahí no hay pulgar al que acercar el
          teclado, y un hueco de 250 px entre los puntos y el 1 no es diseño,
          es una columna de móvil estirada dentro de una ventana ancha. */}
      <div className="min-h-[18px] flex-1 sm:max-h-[80px]" />

      <Teclado
        valor={pin}
        onChange={escribir}
        disabled={fase !== 'escribiendo' || enviando || enEspera}
      />
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

/**
 * El marco de la pantalla de bloqueo.
 * ---------------------------------------------------------------------------
 * Compuesta como la pantalla de bloqueo de un móvil, que es lo que es: el
 * ESCUDO DEL CLUB arriba, el saludo debajo, los puntos en el centro, el
 * teclado abajo y la salida al pie. Antes era la marca del producto y un
 * párrafo, es decir, una página web con un teclado dentro.
 *
 * Arriba va el escudo del club, no el logotipo de Playoff360: quien desbloquea
 * sabe de sobra en qué aplicación está: lo que le dice algo es de qué club es
 * la pantalla que tiene delante, sobre todo si lleva dos.
 *
 * Todo cabe en una pantalla y el teclado queda SIEMPRE en la mitad de abajo,
 * donde llega el pulgar.
 */
/** Hasta tres iniciales del club, para cuando no hay escudo subido. */
const iniciales = (nombre?: string) =>
  (nombre ?? '')
    .split(/\s+/)
    .filter((p) => p.length > 1 || /\d/.test(p))
    .slice(0, 3)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
    .slice(0, 3) || '—';

function Marco({
  children, pie,
}: { children: React.ReactNode; pie?: React.ReactNode }) {
  const { data } = useClub();
  const club = data.club;
  const nombre = nombreReal(currentStaff(data))?.split(' ')[0];

  return (
    <div className="flex min-h-[100svh] flex-col items-center bg-surface px-5 pb-[max(22px,var(--safe-bottom))] pt-[max(68px,calc(var(--safe-top)+54px))] sm:justify-center sm:pt-[max(40px,var(--safe-top))]">
      {/* En el móvil la columna ocupa la pantalla entera, que es lo que se
          espera de un candado. En un ordenador se agrupa y se centra: el mismo
          contenido, pero como un bloque, no desparramado de arriba abajo. */}
      <div className="flex w-full max-w-[340px] flex-1 animate-fade-up flex-col items-center text-center sm:flex-none">
        {club?.crestUrl ? (
          <img
            src={club.crestUrl}
            alt={club.name ? `Escudo de ${club.name}` : 'Escudo del club'}
            className="h-[72px] w-[72px] rounded-full object-cover"
            draggable={false}
          />
        ) : (
          /* Sin escudo subido, las iniciales del club en un disco de grafito.
             No se usa `ClubCrest` porque ése va en cuadrado y en blanco: en
             esta pantalla, un cuadrado blanco de 72 px es lo único que se ve.
             Nunca un escudo prestado que no es de nadie. */
          <span
            aria-hidden
            className="grid h-[72px] w-[72px] place-items-center rounded-full bg-white/[0.08] font-display text-[22px] font-medium tracking-[-0.02em] text-ink-800"
          >
            {iniciales(club?.name)}
          </span>
        )}

        <h1 className="mt-5 text-xl text-ink-900" style={{ fontWeight: 560 }}>
          {nombre ? `Hola, ${nombre}` : (club?.name ?? 'Playoff360')}
        </h1>

        {children}
      </div>

      {pie}
    </div>
  );
}
