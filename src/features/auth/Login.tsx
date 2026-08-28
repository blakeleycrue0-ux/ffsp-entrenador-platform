/**
 * Acceso a la plataforma — Supabase Auth (correo y contraseña).
 * Tres modos en la misma pantalla: entrar, crear cuenta y recuperar contraseña.
 */

import { useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle2, Lock, Mail, ShieldCheck, User } from 'lucide-react';
import { useClub } from '@/store/store';
import { auth } from '@/services/auth';
import { humanError } from '@/services/supabase';
import { Button, Field, Input } from '@/components/ui';
import { Crest, Wordmark } from '@/components/ui/Brand';

type Mode = 'entrar' | 'registro' | 'recuperar';

export default function Login() {
  const { userId, loading } = useClub();
  const location = useLocation() as { state?: { from?: string } };

  const [mode, setMode] = useState<Mode>('entrar');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  if (userId && !loading) return <Navigate to={location.state?.from ?? '/app'} replace />;

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
        // El cambio de sesión lo detecta el store y redirige solo.
      } else if (mode === 'registro') {
        const result = await auth.signUp(email, password, fullName);
        if (result.session) {
          setNotice('Cuenta creada. Entrando…');
        } else {
          setNotice(
            'Cuenta creada. Te hemos enviado un correo de confirmación: ábrelo y después vuelve a entrar aquí.',
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
      sub: 'Accede con el correo con el que te dio de alta la coordinadora del club.',
      cta: 'Entrar',
    },
    registro: {
      title: 'Crear cuenta',
      sub: 'Crea tu acceso. La coordinadora te asignará después tu equipo.',
      cta: 'Crear cuenta',
    },
    recuperar: {
      title: 'Recuperar contraseña',
      sub: 'Te enviaremos un enlace para que puedas elegir una contraseña nueva.',
      cta: 'Enviar enlace',
    },
  };
  const t = titles[mode];

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Marca */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-brand-50/50 p-12 lg:flex">
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-brand-100/50 blur-3xl" />
        <Link
          to="/"
          className="relative inline-flex items-center gap-1.5 text-[14px] font-medium text-ink-600 transition-colors hover:text-brand-800"
        >
          <ArrowLeft size={16} /> Volver
        </Link>

        <div className="relative">
          <Crest size={110} />
          <h1 className="mt-9 max-w-md text-[38px] font-semibold leading-[1.12] tracking-[-0.02em] text-ink-900">
            El centro de operaciones de la entrenadora.
          </h1>
          <p className="mt-5 max-w-sm text-[16px] leading-relaxed text-ink-500">
            Planifica, gestiona, comunica y mejora desde un único lugar.
          </p>

          <div className="mt-10 flex items-center gap-3 rounded-xl border border-ink-200 bg-white px-4 py-3">
            <ShieldCheck size={18} className="shrink-0 text-brand-600" />
            <p className="text-[13px] leading-relaxed text-ink-600">
              Cada entrenadora ve únicamente los equipos que tiene asignados. Los datos de las jugadoras son privados.
            </p>
          </div>
        </div>

        <p className="relative text-[13px] text-ink-400">FFSP · Santa Ponsa CF</p>
      </div>

      {/* Formulario */}
      <div className="flex flex-col justify-center px-5 py-12 sm:px-12">
        <div className="mx-auto w-full max-w-md">
          <div className="lg:hidden">
            <Link to="/" className="mb-8 inline-flex items-center gap-2 text-[14px] font-medium text-ink-600">
              <ArrowLeft size={16} /> Volver
            </Link>
            <Wordmark size="lg" />
          </div>

          <div className="mt-8 lg:mt-0">
            <h2 className="text-[24px] font-semibold leading-tight">{t.title}</h2>
            <p className="mt-2 text-[14px] leading-relaxed text-ink-500">{t.sub}</p>
          </div>

          <form onSubmit={submit} className="mt-7 space-y-4">
            {mode === 'registro' && (
              <Field label="Nombre y apellidos">
                <div className="relative">
                  <User size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
                  <Input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Nombre y apellidos"
                    autoComplete="name"
                    className="pl-10"
                  />
                </div>
              </Field>
            )}

            <Field label="Correo electrónico">
              <div className="relative">
                <Mail size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nombre@correo.com"
                  autoComplete="email"
                  className="pl-10"
                />
              </div>
            </Field>

            {mode !== 'recuperar' && (
              <Field
                label="Contraseña"
                hint={mode === 'registro' ? 'Mínimo 6 caracteres.' : undefined}
              >
                <div className="relative">
                  <Lock size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete={mode === 'registro' ? 'new-password' : 'current-password'}
                    className="pl-10"
                  />
                </div>
              </Field>
            )}

            {error && (
              <p className="rounded-xl border border-danger/25 bg-danger/5 px-3.5 py-2.5 text-[13px] leading-relaxed text-[#A63B34]">
                {error}
              </p>
            )}
            {notice && (
              <p className="flex items-start gap-2 rounded-xl border border-pitch/25 bg-pitch/5 px-3.5 py-2.5 text-[13px] leading-relaxed text-[#1F6B44]">
                <CheckCircle2 size={15} className="mt-0.5 shrink-0" />
                {notice}
              </p>
            )}

            <Button type="submit" block size="lg" loading={busy} icon={!busy ? <ArrowRight size={18} /> : undefined}>
              {t.cta}
            </Button>
          </form>

          <div className="mt-6 space-y-2 text-[13.5px]">
            {mode === 'entrar' && (
              <>
                <p className="text-ink-500">
                  ¿Has olvidado la contraseña?{' '}
                  <button onClick={() => { setMode('recuperar'); setError(null); }} className="font-medium text-brand-700 hover:text-brand-800">
                    Recupérala
                  </button>
                </p>
                <p className="text-ink-500">
                  ¿Aún no tienes cuenta?{' '}
                  <button onClick={() => { setMode('registro'); setError(null); }} className="font-medium text-brand-700 hover:text-brand-800">
                    Crear cuenta
                  </button>
                </p>
              </>
            )}
            {mode !== 'entrar' && (
              <button onClick={() => { setMode('entrar'); setError(null); }} className="font-medium text-brand-700 hover:text-brand-800">
                ← Volver a entrar
              </button>
            )}
          </div>

          <p className="mt-8 flex items-start gap-2 text-[12.5px] leading-relaxed text-ink-400">
            <Lock size={14} className="mt-0.5 shrink-0" />
            La primera persona que cree una cuenta queda como coordinadora del club y podrá crear los equipos y asignar
            al resto del cuerpo técnico.
          </p>
        </div>
      </div>
    </div>
  );
}
