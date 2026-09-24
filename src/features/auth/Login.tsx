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
import { humanError } from '@/services/supabase';
import {
  ACCEPT_ERROR, CLUB_ROLE_LABEL, invitations, type InvitationPeek,
} from '@/services/invitations';
import { Button, Field, Input, Tag } from '@/components/ui';
import { Mark, Wordmark } from '@/components/ui/Brand';

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
        await auth.signIn(email, password);
      } else if (mode === 'registro') {
        const result = await auth.signUp(email, password, fullName);
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
    <div className="grid min-h-screen bg-white lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)]">
      {/* Marca */}
      <div className="hidden flex-col justify-between border-r border-line bg-surface p-10 lg:flex">
        <Link to="/" className="text-sm font-medium text-navy-600 transition-colors hover:text-navy-900">
          Volver a la página principal
        </Link>

        <div>
          <Mark size={52} />
          <h1 className="mt-7 max-w-sm text-3xl font-semibold leading-tight tracking-[-0.015em]">
La herramienta de tu club: plantilla, entrenamientos, partidos y pizarra táctica.
          </h1>
          <p className="mt-4 max-w-sm text-md leading-relaxed text-navy-700">
            Menos gestión. Más tiempo para entrenar.
          </p>

          <p className="mt-8 max-w-sm rounded-md border border-line bg-white px-4 py-3 text-sm leading-relaxed text-navy-700">
            Cada persona del cuerpo técnico ve únicamente los equipos que tiene asignados. El permiso
            lo aplica el servidor, no la pantalla.
          </p>
        </div>

        <p className="text-sm text-navy-400">Cada club, con sus datos separados de los demás.</p>
      </div>

      {/* Formulario */}
      <div className="flex flex-col justify-center px-5 py-10 sm:px-12">
        <div className="mx-auto w-full max-w-md">
          <div className="lg:hidden">
            <Wordmark size="lg" />
          </div>

          {/* Invitación */}
          {token && (
            <div className="mb-6 mt-6 rounded-md border border-line bg-surface p-4 lg:mt-0">
              {invite === null ? (
                <p className="text-base text-muted">Comprobando la invitación…</p>
              ) : !invite.found ? (
                <p className="text-base leading-relaxed text-navy-800">
                  Ese enlace de invitación no existe. Pide uno nuevo a quien administra el club.
                </p>
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-base font-medium text-navy-900">
                      Invitación {invite.clubName ? `de ${invite.clubName}` : 'al club'}
                    </p>
                    {invite.accepted && <Tag tone="neutral" size="sm">Ya aceptada</Tag>}
                    {invite.revoked && <Tag tone="bad" size="sm">Anulada</Tag>}
                    {invite.expired && !invite.accepted && <Tag tone="warn" size="sm">Caducada</Tag>}
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed text-navy-700">
                    Para <strong>{invite.email}</strong>
                    {invite.role && ` · ${CLUB_ROLE_LABEL[invite.role]}`}
                    {invite.teamName && ` · ${invite.teamName}`}
                  </p>
                  {inviteBlocked && (
                    <p className="mt-2 text-sm leading-relaxed text-muted">
                      Esta invitación ya no se puede usar. Pide una nueva al club.
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          <div className={token ? '' : 'mt-8 lg:mt-0'}>
            <h2 className="text-2xl font-semibold leading-tight">{t.title}</h2>
            <p className="mt-1.5 text-base leading-relaxed text-muted">{t.sub}</p>
          </div>

          <form onSubmit={submit} className="mt-6 space-y-3.5">
            {mode === 'registro' && (
              <Field label="Nombre y apellidos" required>
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  autoComplete="name"
                />
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
              <Field label="Contraseña" hint={mode === 'registro' ? 'Mínimo 6 caracteres.' : undefined} required>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === 'registro' ? 'new-password' : 'current-password'}
                />
              </Field>
            )}

            {error && (
              <p className="rounded-md border border-bad/30 bg-bad/5 px-3 py-2 text-sm leading-relaxed text-bad">
                {error}
              </p>
            )}
            {notice && (
              <p className="rounded-md border border-ok/30 bg-ok/5 px-3 py-2 text-sm leading-relaxed text-ok">
                {notice}
              </p>
            )}

            <Button type="submit" block size="lg" loading={busy}>
              {t.cta}
            </Button>
          </form>

          <div className="mt-5 space-y-1.5 text-sm">
            {mode === 'entrar' && (
              <>
                <p className="text-muted">
                  ¿Has olvidado la contraseña?{' '}
                  <button
                    onClick={() => {
                      setMode('recuperar');
                      setError(null);
                    }}
                    className="font-medium text-navy-900 underline underline-offset-2"
                  >
                    Recupérala
                  </button>
                </p>
                {!token && (
                  <p className="text-muted">
                    ¿Aún no tienes cuenta?{' '}
                    <button
                      onClick={() => {
                        setMode('registro');
                        setError(null);
                      }}
                      className="font-medium text-navy-900 underline underline-offset-2"
                    >
                      Crear cuenta
                    </button>
                  </p>
                )}
              </>
            )}
            {mode !== 'entrar' && (
              <button
                onClick={() => {
                  setMode('entrar');
                  setError(null);
                }}
                className="font-medium text-navy-900 underline underline-offset-2"
              >
                Ya tengo cuenta, entrar
              </button>
            )}
          </div>

          {!token && (
            <p className="mt-7 text-xs leading-relaxed text-muted">
              Al entrar por primera vez creas tu club y quedas como su administración: desde ahí
              creas los equipos e invitas al resto del cuerpo técnico. Los datos de cada club están
              separados de los de cualquier otro.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
