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
import { ArrowLeft, ArrowRight, Check, Eye, EyeOff } from 'lucide-react';
import { Wordmark } from '@/components/ui/Brand';
import { Cielo, CampoCielo, BotonCielo, AvisoCielo } from '@/components/ui/Cielo';

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


  return (
    <Cielo
      cabecera={
        <div className="flex items-center justify-between gap-3">
          <Link
            to="/"
            aria-label="Volver a la portada"
            className="-ml-1.5 grid h-9 w-9 shrink-0 place-items-center rounded-full text-white/70 transition-colors active:bg-white/15 active:text-white"
          >
            <ArrowLeft size={18} />
          </Link>
          <Wordmark tone="light" size="sm" className="shrink-0 opacity-90" />
          <span className="w-9 shrink-0" />
        </div>
      }
      pie={
        <div className="mx-auto w-full max-w-[26rem] space-y-3">
          {sinConexion && !error && <AvisoCielo>{sinConexion}</AvisoCielo>}
          {error && <AvisoCielo>{error}</AvisoCielo>}
          {notice && <AvisoCielo tono="bien">{notice}</AvisoCielo>}

          {/* EL BOTÓN VA FUERA DEL FORMULARIO, pegado abajo, y lo enlaza
              `form`: así está siempre en el mismo sitio aunque el formulario
              tenga dos campos o cuatro, y la tecla Intro sigue enviando. */}
          <BotonCielo type="submit" form="acceso" cargando={busy} puede={!inviteBlocked}>
            {t.cta}
            <ArrowRight size={17} />
          </BotonCielo>

          <div className="pt-1 text-center text-[14px] text-white/70">
            {mode === 'entrar' ? (
              <>
                <button
                  type="button"
                  onClick={() => { setMode('recuperar'); setError(null); setNotice(null); }}
                  className="py-2 font-medium text-white/80 underline underline-offset-4 active:text-white"
                >
                  No me acuerdo de la contraseña
                </button>
                {!token && (
                  <p className="mt-1">
                    ¿No tienes cuenta?{' '}
                    <button
                      type="button"
                      onClick={() => { setMode('registro'); setError(null); setNotice(null); }}
                      className="font-semibold text-white underline underline-offset-4"
                    >
                      Crear una
                    </button>
                  </p>
                )}
              </>
            ) : (
              <p>
                ¿Ya tienes cuenta?{' '}
                <button
                  type="button"
                  onClick={() => { setMode('entrar'); setError(null); setNotice(null); }}
                  className="font-semibold text-white underline underline-offset-4"
                >
                  Entrar
                </button>
              </p>
            )}
          </div>
        </div>
      }
    >
      <div className="mx-auto w-full max-w-[26rem]">
        <h1 className="t-l text-white">{t.title}</h1>
        <p className="entradilla mt-3 text-white/70">{t.sub}</p>

        {/* ── La invitación, si se ha llegado por un enlace ─────────────── */}
        {token && (
          <div className="mt-6 rounded-2xl border border-white/22 bg-white/10 p-4">
            {invite === null ? (
              <p className="text-[14px] text-white/75">Comprobando la invitación…</p>
            ) : !invite.found ? (
              <p className="text-[14px] leading-relaxed text-white">
                Ese enlace de invitación no existe. Pide uno nuevo a quien administra el club.
              </p>
            ) : (
              <>
                <p className="text-[15px] font-semibold text-white">
                  Invitación {invite.clubName ? `de ${invite.clubName}` : 'al club'}
                  {invite.accepted && ' · ya aceptada'}
                  {invite.revoked && ' · anulada'}
                  {invite.expired && !invite.accepted && ' · caducada'}
                </p>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-white/70">
                  Para <strong className="text-white">{invite.email}</strong>
                  {invite.role && ` · ${CLUB_ROLE_LABEL[invite.role]}`}
                  {invite.teamName && ` · ${invite.teamName}`}
                </p>
                {inviteBlocked && (
                  <p className="mt-2 text-[13.5px] leading-relaxed text-white/70">
                    Esta invitación ya no se puede usar. Pide una nueva al club.
                  </p>
                )}
              </>
            )}
          </div>
        )}

        <form id="acceso" onSubmit={submit} className="mt-7 space-y-2.5">
          {mode === 'registro' && (
            <CampoCielo
              etiqueta="Nombre y apellidos"
              value={fullName}
              onChange={setFullName}
              placeholder="Nombre y apellidos"
              autoComplete="name"
            />
          )}

          <CampoCielo
            etiqueta="Correo electrónico"
            tipo="email"
            value={email}
            onChange={setEmail}
            placeholder="tu@correo.com"
            autoComplete="email"
          />

          {mode !== 'recuperar' && (
            <>
              <CampoCielo
                etiqueta="Contraseña"
                tipo={verClave ? 'text' : 'password'}
                value={password}
                onChange={setPassword}
                placeholder="Contraseña"
                autoComplete={mode === 'registro' ? 'new-password' : 'current-password'}
                /* VER LO QUE SE ESCRIBE. En un móvil, escribir a ciegas con
                   el teclado tapando media pantalla es la primera causa de
                   «no me deja entrar». El ojo sólo cambia el `type`: el
                   gestor de contraseñas sigue funcionando igual. */
                derecha={
                  <button
                    type="button"
                    onClick={() => setVerClave((v) => !v)}
                    aria-label={verClave ? 'Ocultar la contraseña' : 'Ver la contraseña'}
                    className="grid h-10 w-10 place-items-center rounded-full text-white/70 transition-colors active:bg-white/15 active:text-white"
                  >
                    {verClave ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                }
              />
              {mode === 'registro' && (
                <p className="px-1 pt-0.5 text-[13px] text-white/60">
                  Mínimo 6 caracteres.
                </p>
              )}
            </>
          )}

          {mode === 'registro' && (
            <label className="mt-1 flex cursor-pointer items-start gap-3 rounded-2xl border border-white/22 bg-white/10 p-3.5 text-[13.5px] leading-relaxed text-white/80">
              <input
                type="checkbox"
                checked={novedades}
                onChange={(e) => setNovedades(e.target.checked)}
                /* EL ESQUEMA EN CLARO, A MANO. La portada declara
                   `color-scheme: dark` para sus controles nativos y esta
                   pantalla lleva su clase: la casilla salía como un cuadrado
                   negro en mitad del cielo. */
                style={{ colorScheme: 'light', accentColor: '#ffffff' }}
                className="mt-0.5 h-[18px] w-[18px] shrink-0"
              />
              Quiero recibir novedades del producto por correo. Puedes darte de baja cuando quieras.
            </label>
          )}
        </form>
      </div>
    </Cielo>
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

  /* Lo que de verdad se exige, dicho antes de escribir y no después de
     fallar. Son las dos únicas reglas que comprueba `guardar`. */
  const bastanteLarga = clave.length >= 8;
  const coinciden = clave.length > 0 && clave === repetida;

  return (
    <Cielo
      cabecera={
        <div className="flex items-center justify-center">
          <Wordmark tone="light" size="sm" className="opacity-90" />
        </div>
      }
      pie={
        hecho ? (
          <div className="mx-auto w-full max-w-[26rem]">
            <BotonCielo onClick={onHecho}>Entrar con la nueva</BotonCielo>
          </div>
        ) : (
          <div className="mx-auto w-full max-w-[26rem] space-y-3">
            {error && <AvisoCielo>{error}</AvisoCielo>}
            <BotonCielo
              type="submit"
              form="clave-nueva"
              cargando={guardando}
              puede={bastanteLarga && coinciden}
            >
              Guardar la contraseña
            </BotonCielo>
          </div>
        )
      }
    >
      <div className="mx-auto w-full max-w-[26rem]">
        {hecho ? (
          <>
            <h1 className="t-l text-white">Contraseña cambiada.</h1>
            <p className="entradilla mt-3 text-white/70">
              Ya puedes entrar con la nueva. Guárdala donde guardes las demás.
            </p>
          </>
        ) : (
          <>
            <h1 className="t-l text-white">Elige una contraseña.</h1>
            <p className="entradilla mt-3 text-white/70">
              La anterior deja de funcionar en cuanto guardes ésta.
            </p>

            <form id="clave-nueva" onSubmit={guardar} className="mt-7 space-y-2.5">
              <CampoCielo
                etiqueta="Nueva contraseña"
                tipo={ver ? 'text' : 'password'}
                value={clave}
                onChange={setClave}
                placeholder="Nueva contraseña"
                autoComplete="new-password"
                autoFocus
              />
              <CampoCielo
                etiqueta="Repite la contraseña"
                tipo={ver ? 'text' : 'password'}
                value={repetida}
                onChange={setRepetida}
                placeholder="Repítela"
                autoComplete="new-password"
              />
              <label className="flex cursor-pointer items-center gap-2.5 px-1 pt-1 text-[14px] text-white/75">
                <input
                  type="checkbox"
                  checked={ver}
                  onChange={(ev) => setVer(ev.target.checked)}
                  style={{ colorScheme: 'light', accentColor: '#ffffff' }}
                  className="h-[18px] w-[18px]"
                />
                Ver lo que escribo
              </label>
            </form>

            {/* ── LOS REQUISITOS, MIENTRAS SE ESCRIBE ───────────────────────
                Antes sólo se sabía lo que fallaba DESPUÉS de pulsar guardar,
                y de uno en uno: primero que era corta, luego que no
                coincidían. Aquí están los dos a la vista y se van marcando
                solos. Son exactamente las dos reglas que comprueba el
                guardado; ni una más, para que no prometan nada falso. */}
            <ul className="mt-5 space-y-1.5">
              <Requisito cumplido={bastanteLarga}>Al menos 8 caracteres</Requisito>
              <Requisito cumplido={coinciden}>Las dos iguales</Requisito>
            </ul>
          </>
        )}
      </div>
    </Cielo>
  );
}

function Requisito({ cumplido, children }: { cumplido: boolean; children: React.ReactNode }) {
  return (
    <li className={`flex items-center gap-2.5 text-[14px] ${cumplido ? 'text-white' : 'text-white/55'}`}>
      <span
        aria-hidden
        className={`grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border ${
          cumplido ? 'border-white bg-white text-marca-700' : 'border-white/35'
        }`}
      >
        {cumplido && <Check size={11} strokeWidth={3} />}
      </span>
      {children}
    </li>
  );
}
