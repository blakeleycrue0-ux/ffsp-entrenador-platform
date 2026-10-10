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
import { ArrowLeft } from 'lucide-react';
import { Button, Field, Input, Tag } from '@/components/ui';
import { Wordmark } from '@/components/ui/Brand';
import { Cielo } from '@/components/visual/Cielo';
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
  const [busy, setBusy] = useState(false);
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
        const result = await auth.signUp(email, password, fullName);
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
    <div className="min-h-[100svh] bg-surface lg:grid lg:grid-cols-[minmax(0,1.04fr)_minmax(0,1fr)] lg:gap-0 lg:p-3">
      {/* ── El panel visual ──────────────────────────────────────────────────
          En escritorio es una superficie de grafito redondeada con el ambiente
          dentro. En el móvil no se apila debajo —eso es lo que hace una
          maqueta que sólo «responde»— sino que se convierte en la cabecera:
          una franja de ambiente detrás de la marca, y el formulario debajo. */}
      <div className="relative hidden overflow-hidden rounded-3xl border border-line-sutil bg-panel lg:flex lg:flex-col lg:justify-between">
        <Cielo />

        <div className="relative p-10">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-ink-600 transition-colors duration-250 ease-suave hover:text-ink-900"
          >
            <ArrowLeft size={14} />
            Volver a la página principal
          </Link>
        </div>

        <div className="relative px-10">
          <Wordmark size="lg" tone="light" />
          <p className="mt-8 max-w-[22ch] text-4xl text-ink-900" style={{ fontWeight: 520 }}>
            La herramienta de tu club, en un mismo sitio.
          </p>
          <p className="mt-5 max-w-[46ch] text-md text-ink-700">
            Plantilla, entrenamientos, partidos y pizarra táctica. Menos gestión y más tiempo para
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
                      ? 'bg-ink-900 text-ink-0'
                      : 'border border-line-sutil bg-panel text-ink-600',
                  )}
                >
                  <span className="tabular-nums opacity-60">{n}</span>
                  <span className="font-medium">{texto}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-ink-600">
              Cada club, con sus datos separados de los demás. El permiso lo aplica el servidor, no
              la pantalla.
            </p>
          )}
        </div>
      </div>

      {/* ── El formulario ───────────────────────────────────────────────── */}
      <div className="relative flex min-h-[100svh] flex-col lg:min-h-0">
        {/* La franja de ambiente del móvil: ocupa la parte de arriba y lleva la
            marca encima. En escritorio no existe. */}
        <div className="relative h-[30svh] min-h-[180px] shrink-0 overflow-hidden lg:hidden">
          <Cielo velo="franja" />
          <div className="relative flex h-full flex-col justify-between p-5 pt-[max(20px,var(--safe-top))]">
            <Link
              to="/"
              className="inline-flex w-fit items-center gap-2 text-sm text-white/70 transition-colors hover:text-white"
            >
              <ArrowLeft size={14} />
              Volver
            </Link>
            <Wordmark size="md" tone="light" />
          </div>
        </div>

        <div className="flex flex-1 flex-col justify-center px-5 pb-[max(28px,var(--safe-bottom))] pt-8 sm:px-10 lg:px-14 lg:py-12">
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

            <h1 className="text-4xl text-ink-900" style={{ fontWeight: 520 }}>
              {t.title}
            </h1>
            <p className="mt-3 text-md leading-relaxed text-ink-700">{t.sub}</p>

            <form onSubmit={submit} className="mt-9 space-y-4">
              {mode === 'registro' && (
                <Field label="Nombre y apellidos" required>
                  <Input value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" />
                </Field>
              )}

              <Field label="Correo electrónico" required>
                <Input
                  type="email"
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
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete={mode === 'registro' ? 'new-password' : 'current-password'}
                  />
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
