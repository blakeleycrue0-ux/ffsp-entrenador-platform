/**
 * Acceso a la plataforma — Supabase Auth (correo y contraseña).
 * Entrar, crear cuenta, recuperar contraseña y aceptar una invitación.
 *
 * No hay proveedores sociales: no hay ninguno configurado, así que no se
 * ofrecen botones que no funcionarían.
 */

import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { useClub } from '@/store/store';
import { auth } from '@/services/auth';
import { compruebaConexion, humanError } from '@/services/supabase';
import { marcarDesbloqueado } from '@/services/passcode';
import {
  ACCEPT_ERROR, CLUB_ROLE_LABEL, invitations, type InvitationPeek,
} from '@/services/invitations';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { Button, Field, Input, Tag } from '@/components/ui';
import { ImagenDeFondo } from '@/components/layout/FondoPlataforma';
import { Wordmark } from '@/components/ui/Brand';
import { cn } from '@/lib/utils';

type Mode = 'entrar' | 'registro' | 'recuperar';

export default function Login() {
  const { userId, loading, actions } = useClub();
  const location = useLocation() as { state?: { from?: string } };
  const [params] = useSearchParams();
  const token = params.get('invitacion');

  const [mode, setMode] = useState<Mode>('entrar');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  /* Sin marcar, y eso es el valor por defecto a propósito: ver la casilla. */
  const [novedades, setNovedades] = useState(false);
  const [busy, setBusy] = useState(false);
  const [verClave, setVerClave] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [invite, setInvite] = useState<InvitationPeek | null>(null);
  const [accepted, setAccepted] = useState(false);
  /** Si el servidor no responde conviene decirlo antes de pedir la contraseña. */
  const [sinConexion, setSinConexion] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    void compruebaConexion().then((r) => {
      if (vivo && !r.ok) setSinConexion(r.motivo ?? null);
    });
    return () => {
      vivo = false;
    };
  }, []);

  /* Qué hay detrás del enlace de invitación, antes de pedir nada. */
  useEffect(() => {
    if (!token) return;
    invitations
      .peek(token)
      .then((i) => {
        setInvite(i);
        if (i.found && i.email) setEmail(i.email);
        if (i.found && !i.accepted && !i.expired && !i.revoked) setMode('registro');
      })
      .catch((e) => setError(humanError(e)));
  }, [token]);

  /* Con sesión abierta y una invitación válida, se acepta y se entra. */
  useEffect(() => {
    if (!token || !userId || accepted || !invite?.found) return;
    setBusy(true);
    invitations
      .accept(token)
      .then(async (res) => {
        if (res.ok) {
          setAccepted(true);
          await actions.refresh();
        } else {
          setError(ACCEPT_ERROR[res.error ?? ''] ?? 'No hemos podido aceptar la invitación.');
          setAccepted(true);
        }
      })
      .catch((e) => setError(humanError(e)))
      .finally(() => setBusy(false));
  }, [token, userId, accepted, invite, actions]);

  /* ── QUIEN LLEGA DESDE EL CORREO DE RECUPERACIÓN ────────────────────────
     El enlace de «he olvidado la contraseña» traía aquí, Supabase abría la
     sesión con el testigo del enlace… y ya está: entraba en la aplicación sin
     haber puesto ninguna contraseña nueva. La que no recordaba seguía siendo
     la suya, y para cambiarla en Ajustes hace falta escribir la anterior, que
     es justo la que no sabe. El camino de recuperación no llevaba a ninguna
     parte.
     Supabase marca estas vueltas con `type=recovery` en el trozo de después
     de la almohadilla. Se lee una vez al cargar y se limpia la dirección, para
     que un `F5` no vuelva a plantar el formulario. */
  const [recuperando, setRecuperando] = useState(false);
  useEffect(() => {
    const trozo = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    if (trozo.get('type') === 'recovery') {
      setRecuperando(true);
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  }, []);

  if (recuperando) {
    return <NuevaContrasena onHecho={() => setRecuperando(false)} />;
  }

  if (userId && !loading && (!token || accepted)) {
    return <Navigate to={location.state?.from ?? '/app'} replace />;
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);

    if (!email.trim()) return setError('Escribe tu correo electrónico.');
    if (mode !== 'recuperar' && password.length < 6) {
      return setError('La contraseña debe tener al menos 6 caracteres.');
    }
    if (mode === 'registro' && !fullName.trim()) return setError('Escribe tu nombre y apellidos.');

    setBusy(true);
    try {
      if (mode === 'entrar') {
        const user = await auth.signIn(email, password);
        /* Acaba de escribir la contraseña de la cuenta, que es la
           autenticación de verdad: pedirle además el código en el mismo
           segundo sería pedir dos veces lo mismo. El candado es para VOLVER
           a la aplicación, no para entrar. */
        if (user) marcarDesbloqueado(user.id);
      } else if (mode === 'registro') {
        const result = await auth.signUp(email, password, fullName, novedades);
        if (result.session?.user) marcarDesbloqueado(result.session.user.id);
        if (!result.session) {
          setNotice(
            'Cuenta creada. Te hemos enviado un correo de confirmación: ábrelo y vuelve aquí para entrar.',
          );
          setMode('entrar');
        }
      } else {
        await auth.resetPassword(email);
        setNotice('Si ese correo tiene cuenta, recibirás un enlace para cambiar la contraseña.');
        setMode('entrar');
      }
    } catch (err) {
      setError(humanError(err));
    } finally {
      setBusy(false);
    }
  };

  const titles: Record<Mode, { title: string; sub: string; cta: string }> = {
    entrar: {
      title: 'Entrar',
      sub: 'Accede con el correo con el que te dieron de alta en tu club.',
      cta: 'Entrar',
    },
    registro: {
      title: token ? 'Crear tu cuenta' : 'Crear cuenta',
      sub: token
        ? 'Crea tu acceso con el correo al que se envió la invitación.'
        : 'Crea tu acceso y, al entrar, tu club. Si te han invitado a uno, abre su enlace.',
      cta: 'Crear cuenta',
    },
    recuperar: {
      title: 'Recuperar contraseña',
      sub: 'Te enviaremos un enlace para elegir una contraseña nueva.',
      cta: 'Enviar enlace',
    },
  };
  const t = titles[mode];

  const inviteBlocked =
    invite?.found && (invite.expired || invite.revoked || invite.accepted);

  /* Los tres pasos del camino completo. Sólo se enseñan al crear cuenta: en
     «entrar» no hay camino que recorrer, y pintar un progreso que no avanza es
     peor que no pintar nada. */
  const PASOS = [
    ['01', 'Cuenta'],
    ['02', 'Club'],
    ['03', 'Equipo'],
  ] as const;

  return (
    /* `plataforma`: la entrada ya es el producto, no la página pública. De
       aquí para dentro no hay azul. */
    <div className="plataforma min-h-[100svh] bg-surface lg:grid lg:grid-cols-[minmax(0,1.04fr)_minmax(0,1fr)] lg:gap-0 lg:p-3">
      {/* ── El panel visual ──────────────────────────────────────────────────
          En escritorio es una superficie de grafito redondeada con el ambiente
          dentro. En el móvil no se apila debajo —eso es lo que hace una
          maqueta que sólo «responde»— sino que se convierte en la cabecera:
          una franja de ambiente detrás de la marca, y el formulario debajo. */}
      {/* EL PANEL VISUAL, CON LA MISMA IMAGEN QUE INICIO. Tuvo dentro el
          «cielo» —un degradado azul con partículas, que es el ambiente de la
          página pública— y después unas ondas dibujadas. Ahora es la misma
          foto en blanco y negro que hay detrás de Inicio: lo que se ve antes
          de entrar es lo que se encuentra al entrar. */}
      <div className="relative hidden overflow-hidden rounded-3xl bg-black lg:flex lg:flex-col lg:justify-between">
        <ImagenDeFondo velo="bg-black/55" />

        <div className="relative p-10">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-white/60 transition-colors duration-250 ease-suave hover:text-white"
          >
            <ArrowLeft size={14} />
            Volver a la página principal
          </Link>
        </div>

        <div className="relative px-10">
          <Wordmark size="lg" tone="light" />
          <p className="mt-8 max-w-[22ch] text-4xl text-white" style={{ fontWeight: 520 }}>
            La herramienta de tu club, en un mismo sitio.
          </p>
          <p className="mt-5 max-w-[46ch] text-md text-white/65">
            Plantilla, asistencia, entrenamientos y partidos. Menos gestión y más tiempo para
            entrenar.
          </p>
        </div>

        <div className="relative p-10">
          {mode === 'registro' ? (
            <ol className="flex flex-wrap gap-2">
              {PASOS.map(([n, texto], i) => (
                <li
                  key={n}
                  className={cn(
                    'flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors duration-250 ease-suave',
                    i === 0
                      ? 'bg-white text-ink-900'
                      : 'border border-white/15 text-white/70',
                  )}
                >
                  <span className="tabular-nums opacity-60">{n}</span>
                  <span className="font-medium">{texto}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-white/60">
              Cada club, con sus datos separados de los demás. El permiso lo aplica el servidor, no
              la pantalla.
            </p>
          )}
        </div>
      </div>

      {/* ── El formulario ───────────────────────────────────────────────── */}
      <div className="relative flex min-h-[100svh] flex-col lg:min-h-0">
        {/* ── LA CABECERA DEL MÓVIL ───────────────────────────────────────
            MEDÍA EL 30 % DE LA PANTALLA Y NO HACÍA NADA. Era una franja de
            cielo de 30 svh con un mínimo de 180 px: en un iPhone SE eso son
            200 px de los 667 que hay, y el primer campo empezaba por debajo
            de la mitad de la pantalla. Para entrar en una herramienta de
            trabajo, con el teclado abierto y el pulgar en la pantalla, eso es
            desplazarse antes de poder escribir nada.

            Ahora es una barra: la marca, el enlace de volver y el cielo
            detrás, 76 px en total. El cielo sigue ahí —se reconoce el
            producto— pero como fondo de la cabecera, no como un cartel.
            Medido en 375×667: el primer campo pasa de empezar en y=404 a
            empezar en y=250. */}
        <div className="relative shrink-0 overflow-hidden bg-black lg:hidden">
          <ImagenDeFondo velo="bg-black/55" />
          <div className="relative flex h-[76px] items-center justify-between gap-3 px-5 pt-[var(--safe-top)]">
            <Wordmark size="sm" tone="light" />
            <Link
              to="/"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-white/70 transition-colors hover:text-white"
            >
              <ArrowLeft size={14} />
              Volver
            </Link>
          </div>
        </div>

        {/* `justify-start` en el móvil y `justify-center` a partir de `lg`.
            Centrado verticalmente en una pantalla de móvil, el formulario
            baila: con tres campos empieza más arriba que con dos, y al salir
            un error se mueve entero. Arriba, empieza siempre en el mismo
            sitio. */}
        <div className="flex flex-1 flex-col px-5 pb-[max(28px,var(--safe-bottom))] pt-7 sm:px-10 lg:justify-center lg:px-14 lg:py-12">
          <div className="mx-auto w-full max-w-[420px]">
            {/* Invitación */}
            {token && (
              <div className="mb-7 rounded-xl border border-line-sutil bg-panel p-4">
                {invite === null ? (
                  <p className="text-base text-ink-600">Comprobando la invitación…</p>
                ) : !invite.found ? (
                  <p className="text-base leading-relaxed text-ink-800">
                    Ese enlace de invitación no existe. Pide uno nuevo a quien administra el club.
                  </p>
                ) : (
                  <>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-base font-medium text-ink-900">
                        Invitación {invite.clubName ? `de ${invite.clubName}` : 'al club'}
                      </p>
                      {invite.accepted && <Tag tone="neutral" size="sm">Ya aceptada</Tag>}
                      {invite.revoked && <Tag tone="bad" size="sm">Anulada</Tag>}
                      {invite.expired && !invite.accepted && <Tag tone="warn" size="sm">Caducada</Tag>}
                    </div>
                    <p className="mt-1.5 text-sm leading-relaxed text-ink-700">
                      Para <strong className="text-ink-900">{invite.email}</strong>
                      {invite.role && ` · ${CLUB_ROLE_LABEL[invite.role]}`}
                      {invite.teamName && ` · ${invite.teamName}`}
                    </p>
                    {inviteBlocked && (
                      <p className="mt-2 text-sm leading-relaxed text-ink-600">
                        Esta invitación ya no se puede usar. Pide una nueva al club.
                      </p>
                    )}
                  </>
                )}
              </div>
            )}

            <h1 className="text-3xl text-ink-900 sm:text-4xl" style={{ fontWeight: 520 }}>
              {t.title}
            </h1>
            <p className="mt-2.5 text-base leading-relaxed text-ink-700 sm:text-md">{t.sub}</p>

            <form onSubmit={submit} className="mt-7 space-y-4">
              {mode === 'registro' && (
                <Field label="Nombre y apellidos" required>
                  <Input
                    className="field-grande"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    autoComplete="name"
                    /* `words`, no la mayúscula de toda la frase: un apellido
                       compuesto se escribe con dos mayúsculas y el teclado
                       del móvil, por defecto, sólo pone la primera. */
                    autoCapitalize="words"
                  />
                </Field>
              )}

              {/* ── EL PERMISO, Y VA SIN MARCAR ────────────────────────────
                  Una casilla premarcada no es consentimiento: el RGPD pide un
                  acto, y marcarla de antemano es justo lo contrario de un
                  acto. La guía del alta no depende de esto —es un correo de
                  servicio y sale igual—; esto es sólo para las novedades y
                  los avisos. Quien no la marque no recibe ninguno, y se puede
                  cambiar de idea en Ajustes o desde el pie de cualquiera. */}
              {mode === 'registro' && (
                <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-line bg-panel/60 p-3 text-sm leading-relaxed text-ink-700">
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={novedades}
                    onChange={(e) => setNovedades(e.target.checked)}
                  />
                  <span>
                    Quiero recibir novedades de Playoff360 y algún aviso si dejo la cuenta
                    parada. Puedes darte de baja de un clic en cualquier momento.
                  </span>
                </label>
              )}

              <Field label="Correo electrónico" required>
                <Input
                  className="field-grande"
                  type="email"
                  /* `inputMode` saca el teclado con la arroba a la vista, y
                     las dos correcciones apagadas evitan que el móvil
                     convierta un correo en una frase con mayúscula. */
                  inputMode="email"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nombre@correo.com"
                  autoComplete="email"
                  readOnly={!!(token && invite?.found && invite.email)}
                />
              </Field>

              {mode !== 'recuperar' && (
                <Field
                  label="Contraseña"
                  hint={mode === 'registro' ? 'Mínimo 6 caracteres.' : undefined}
                  required
                >
                  {/* VER LO QUE SE ESCRIBE. En un móvil, escribir una
                      contraseña a ciegas con el teclado tapando media
                      pantalla es la primera causa de «no me deja entrar».
                      El ojo no guarda nada ni cambia el `autoComplete`: sólo
                      cambia el `type`, así que el gestor de contraseñas
                      sigue funcionando igual. */}
                  <div className="relative">
                    <Input
                      className="field-grande pr-12"
                      type={verClave ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete={mode === 'registro' ? 'new-password' : 'current-password'}
                    />
                    <button
                      type="button"
                      onClick={() => setVerClave((v) => !v)}
                      aria-label={verClave ? 'Ocultar la contraseña' : 'Ver la contraseña'}
                      className="absolute right-1.5 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-lg text-ink-500 transition-colors hover:text-ink-900"
                    >
                      {verClave ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </Field>
              )}

              {sinConexion && !error && (
                <p className="rounded-lg border border-warn/35 bg-warn/8 px-3.5 py-2.5 text-sm leading-relaxed text-warn">
                  {sinConexion}
                </p>
              )}
              {error && (
                <p className="rounded-lg border border-bad/30 bg-bad/8 px-3.5 py-2.5 text-sm leading-relaxed text-bad">
                  {error}
                </p>
              )}
              {notice && (
                <p className="rounded-lg border border-ok/30 bg-ok/8 px-3.5 py-2.5 text-sm leading-relaxed text-ok">
                  {notice}
                </p>
              )}

              <Button type="submit" block size="lg" loading={busy} className="!mt-7">
                {t.cta}
              </Button>
            </form>

            <div className="mt-6 space-y-2 text-sm">
              {mode === 'entrar' && (
                <>
                  <p className="text-ink-600">
                    ¿Has olvidado la contraseña?{' '}
                    <button
                      onClick={() => {
                        setMode('recuperar');
                        setError(null);
                      }}
                      className="font-medium text-ink-900 underline underline-offset-4 decoration-ink-400 transition-colors hover:decoration-ink-900"
                    >
                      Recupérala
                    </button>
                  </p>
                  {!token && (
                    <p className="text-ink-600">
                      ¿Aún no tienes cuenta?{' '}
                      <button
                        onClick={() => {
                          setMode('registro');
                          setError(null);
                        }}
                        className="font-medium text-ink-900 underline underline-offset-4 decoration-ink-400 transition-colors hover:decoration-ink-900"
                      >
                        Crear cuenta
                      </button>
                    </p>
                  )}
                </>
              )}
              {mode !== 'entrar' && (
                <p className="text-ink-600">
                  ¿Ya tienes cuenta?{' '}
                  <button
                    onClick={() => {
                      setMode('entrar');
                      setError(null);
                    }}
                    className="font-medium text-ink-900 underline underline-offset-4 decoration-ink-400 transition-colors hover:decoration-ink-900"
                  >
                    Iniciar sesión
                  </button>
                </p>
              )}
            </div>

            {!token && (
              <p className="mt-9 border-t border-line-sutil pt-6 text-xs leading-relaxed text-ink-500">
                Al entrar por primera vez creas tu club y quedas como su administración: desde ahí
                creas los equipos e invitas al resto del cuerpo técnico. Los datos de cada club
                están separados de los de cualquier otro.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Poner una contraseña nueva tras el enlace del correo.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Es la pantalla que faltaba. El correo de recuperación abría la sesión y
 * dejaba a la persona dentro de la aplicación sin haber cambiado nada: la
 * contraseña que no recordaba seguía siendo la suya, y en Ajustes hace falta
 * escribir la anterior para cambiarla. El camino se quedaba a medias.
 *
 * AQUÍ NO SE PIDE LA ANTERIOR, Y ES CORRECTO. Quien llega por este camino es
 * precisamente quien no la sabe. Lo que demuestra que es ella es el correo:
 * ha recibido el enlace en su buzón y Supabase ha abierto la sesión con él.
 *
 * Las dos casillas son la misma contraseña escrita dos veces. Con una sola, un
 * dedo torpe en un móvil deja la cuenta con una contraseña que nadie conoce y
 * hay que volver a empezar.
 */
function NuevaContrasena({ onHecho }: { onHecho: () => void }) {
  const [clave, setClave] = useState('');
  const [repetida, setRepetida] = useState('');
  const [ver, setVer] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hecho, setHecho] = useState(false);

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (clave.length < 8) return setError('La contraseña debe tener al menos 8 caracteres.');
    if (clave !== repetida) return setError('Las dos no coinciden. Repítela igual.');
    setGuardando(true);
    try {
      await auth.setPasswordAfterRecovery(clave);
      setHecho(true);
    } catch (err) {
      setError(humanError(err));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="plataforma relative flex min-h-[100svh] flex-col bg-surface">
      <div className="relative shrink-0 overflow-hidden bg-black">
        <ImagenDeFondo velo="bg-black/55" />
        <div className="relative flex h-[76px] items-center px-5 pt-[var(--safe-top)]">
          <Wordmark size="sm" tone="light" />
        </div>
      </div>

      <div className="flex flex-1 flex-col px-5 pb-[max(28px,var(--safe-bottom))] pt-7 sm:px-10 lg:justify-center">
        <div className="mx-auto w-full max-w-[420px]">
          {hecho ? (
            <>
              <h1 className="cifra text-3xl">Contraseña cambiada</h1>
              <p className="mt-3 text-md leading-relaxed text-ink-600">
                Ya puedes entrar con la nueva. Guárdala donde guardes las demás.
              </p>
              <Button size="lg" block className="mt-7" onClick={onHecho}>
                Continuar
              </Button>
            </>
          ) : (
            <form onSubmit={guardar} noValidate>
              <h1 className="cifra text-3xl">Nueva contraseña</h1>
              <p className="mt-3 text-md leading-relaxed text-ink-600">
                Escribe la que quieras usar a partir de ahora. No hace falta la anterior: has
                llegado desde el enlace de tu correo.
              </p>

              <div className="mt-7 space-y-4">
                <Field label="Nueva contraseña" hint="Mínimo 8 caracteres." required>
                  <Input
                    type={ver ? 'text' : 'password'}
                    value={clave}
                    onChange={(ev) => setClave(ev.target.value)}
                    autoComplete="new-password"
                    autoFocus
                  />
                </Field>
                <Field label="Repítela" required>
                  <Input
                    type={ver ? 'text' : 'password'}
                    value={repetida}
                    onChange={(ev) => setRepetida(ev.target.value)}
                    autoComplete="new-password"
                  />
                </Field>
                <label className="flex items-center gap-2 text-sm text-ink-600">
                  <input type="checkbox" checked={ver} onChange={(ev) => setVer(ev.target.checked)} />
                  Ver lo que escribo
                </label>
              </div>

              {error && (
                <p className="mt-5 rounded-xl border border-bad/25 bg-bad/5 px-4 py-3 text-base text-bad">
                  {error}
                </p>
              )}

              <Button type="submit" size="lg" block loading={guardando} className="mt-7">
                Guardar la contraseña
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
