/**
 * Acceso a la plataforma.
 * En la demostración se entra eligiendo un perfil del cuerpo técnico: así se
 * puede comprobar cómo cambian los permisos y los equipos visibles según el rol.
 */

import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Lock, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useClub } from '@/store/store';
import { ROLE_LABEL } from '@/services/auth';
import { Avatar, Button, Badge } from '@/components/ui';
import { Crest, Wordmark } from '@/components/ui/Brand';
import { cn } from '@/lib/utils';

export default function Login() {
  const { data, session, signIn, loading } = useClub();
  const navigate = useNavigate();
  const location = useLocation() as { state?: { from?: string } };
  const [selected, setSelected] = useState('st_1');
  const [busy, setBusy] = useState(false);

  if (session) return <Navigate to={location.state?.from ?? '/app'} replace />;

  const enter = async () => {
    setBusy(true);
    await signIn(selected);
    navigate(location.state?.from ?? '/app', { replace: true });
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Panel de marca */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-brand-50/50 p-12 lg:flex">
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-brand-100/50 blur-3xl" />
        <Link to="/" className="relative inline-flex items-center gap-2 text-[14px] font-medium text-ink-600 transition-colors hover:text-brand-800">
          <ArrowLeft size={16} /> Volver
        </Link>

        <div className="relative">
          <Crest size={110} />
          <h1 className="mt-9 max-w-md text-[38px] font-semibold leading-[1.12] tracking-[-0.02em] text-ink-900">
            El centro de operaciones del entrenador.
          </h1>
          <p className="mt-5 max-w-sm text-[16px] leading-relaxed text-ink-500">
            Planifica, gestiona, comunica y mejora desde un único lugar.
          </p>

          <div className="mt-10 flex items-center gap-3 rounded-xl border border-ink-200 bg-white px-4 py-3">
            <ShieldCheck size={18} className="shrink-0 text-brand-600" />
            <p className="text-[13px] leading-relaxed text-ink-600">
              Los datos de los jugadores son privados. Cada perfil sólo ve los equipos que tiene asignados.
            </p>
          </div>
        </div>

        <p className="relative text-[13px] text-ink-400">
          FFSP VLE · Santa Ponsa CF · Temporada 2025/26
        </p>
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
            <h2 className="text-[24px] font-semibold leading-tight">Entrar en el VLE</h2>
            <p className="mt-2 text-[14px] leading-relaxed text-ink-500">
              Elige el perfil con el que quieres recorrer la plataforma. Cada rol tiene permisos y equipos distintos.
            </p>
          </div>

          <div className="mt-7 space-y-2">
            {data.staff.map((s) => {
              const active = s.id === selected;
              return (
                <button
                  key={s.id}
                  onClick={() => setSelected(s.id)}
                  className={cn(
                    'flex w-full items-center gap-3.5 rounded-xl border p-3.5 text-left transition-all duration-150',
                    active
                      ? 'border-brand-400 bg-brand-50/60 ring-4 ring-brand-100'
                      : 'border-ink-200 bg-white hover:border-brand-200 hover:bg-brand-50/30',
                  )}
                >
                  <Avatar name={s.name} size={42} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14.5px] font-medium text-ink-900">{s.name}</span>
                    <span className="block truncate text-[12.5px] text-ink-500">
                      {ROLE_LABEL[s.role]} · {s.teamIds.length} equipo{s.teamIds.length === 1 ? '' : 's'}
                    </span>
                  </span>
                  {s.role === 'entrenador' && (
                    <Badge tone="brand" size="sm" className="shrink-0">
                      Recomendado
                    </Badge>
                  )}
                  <span
                    className={cn(
                      'grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 transition-colors',
                      active ? 'border-brand-700 bg-brand-700' : 'border-ink-300',
                    )}
                  >
                    {active && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                  </span>
                </button>
              );
            })}
          </div>

          <Button
            block
            size="lg"
            className="mt-7"
            loading={busy || loading}
            onClick={enter}
            icon={!busy ? <ArrowRight size={18} /> : undefined}
          >
            {busy ? 'Entrando…' : 'Entrar'}
          </Button>

          <p className="mt-5 flex items-start gap-2 text-[12.5px] leading-relaxed text-ink-400">
            <Lock size={14} className="mt-0.5 shrink-0" />
            Demostración con datos ficticios. En producción el acceso se hará con las credenciales del club y
            autenticación por roles.
          </p>
        </div>
      </div>
    </div>
  );
}
