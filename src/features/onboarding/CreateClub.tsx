/**
 * Alta de un club.
 * ---------------------------------------------------------------------------
 * Es la puerta de entrada del producto: quien se registra y todavía no
 * pertenece a ningún club, crea el suyo y queda como administración.
 *
 * Quien llega invitada por un club no pasa por aquí: su invitación ya la deja
 * dentro, y esta pantalla se lo recuerda por si ha entrado sin usar el enlace.
 */

import { useState } from 'react';
import { useClub } from '@/store/store';
import { clubs } from '@/services/clubs';
import { humanError } from '@/services/supabase';
import { Button, Field, Input, Panel } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { Wordmark } from '@/components/ui/Brand';

export default function CreateClub() {
  const { actions, signOut } = useClub();
  const toast = useToast();
  const [name, setName] = useState('');
  const [shortName, setShortName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (name.trim().length < 2) {
      setError('Escribe el nombre del club.');
      return;
    }
    setBusy(true);
    try {
      const res = await clubs.create(name, shortName);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      // Se recarga el espacio de trabajo para entrar ya dentro del club.
      await actions.refresh();
      toast.success('Club creado', 'Ya puedes crear tu primer equipo.');
    } catch (err) {
      setError(humanError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-5 py-3">
          <Wordmark />
          <button
            onClick={() => void signOut()}
            className="text-sm text-muted underline underline-offset-2 hover:text-navy-900"
          >
            Cerrar sesión
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-5 py-12">
        <h1 className="text-2xl font-semibold leading-tight">Crea tu club</h1>
        <p className="mt-2 max-w-lg text-base leading-relaxed text-navy-700">
          Todo lo que registres —equipos, plantillas, entrenamientos y jugadas— pertenece a tu club y
          sólo lo ve el cuerpo técnico al que invites. Ningún otro club puede verlo.
        </p>

        <Panel className="mt-6">
          <form onSubmit={submit} className="space-y-4 p-5">
            <Field label="Nombre del club" required hint="Como aparece oficialmente.">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej.: Club Deportivo Ejemplo"
                autoFocus
              />
            </Field>

            <Field
              label="Nombre corto"
              hint="El que cabe en un marcador. Si lo dejas vacío usamos el nombre completo."
            >
              <Input
                value={shortName}
                onChange={(e) => setShortName(e.target.value)}
                placeholder="Ej.: CD Ejemplo"
                maxLength={28}
              />
            </Field>

            {error && (
              <p className="rounded-md border border-bad/30 bg-bad/5 px-3 py-2 text-sm leading-relaxed text-bad">
                {error}
              </p>
            )}

            <Button type="submit" size="lg" loading={busy}>
              Crear el club
            </Button>
          </form>
        </Panel>

        <Panel className="mt-3 px-5 py-4">
          <h2 className="text-base font-medium text-navy-900">¿Te han invitado a un club?</h2>
          <p className="mt-1 text-base leading-relaxed text-muted">
            Entonces no crees uno nuevo: abre el enlace de invitación que te hayan pasado y entrarás
            directamente en el club que te corresponde, con tu equipo ya asignado. Si no lo tienes,
            pídeselo a quien administra el club.
          </p>
        </Panel>
      </main>
    </div>
  );
}
