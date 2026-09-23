/**
 * Pizarra táctica — el centro del producto.
 *
 * Esta pantalla se ocupa de la jugada como documento: abrirla, nombrarla,
 * guardarla y borrarla. La edición y la reproducción viven en `BoardEditor`,
 * que comparte con la ficha de un ejercicio.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, Trash2 } from 'lucide-react';
import {
  Button, ConfirmDialog, EmptyState, ErrorState, Field, Modal, PageHeader, Panel, PanelHeader,
  SaveIndicator, Select, Skeleton, Tag, Textarea, type SaveState,
} from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { useClub } from '@/store/store';
import { visibleTeams } from '@/store/selectors';
import { plays, type Play as SavedPlay, type PlaySummary } from '@/services/plays';
import { humanError } from '@/services/supabase';
import { BoardEditor, useBoardHistory } from './BoardEditor';
import { formatSeconds, usePlayback } from './playback';
import { EMPTY_SCENE, layoutTeam, type Scene } from './scene';
import { exportSceneImage } from './exportImage';

export default function BoardPage() {
  const { playId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { data, userId, teamId } = useClub();
  const teams = visibleTeams(data);

  const [scene, setScene] = useState<Scene>(EMPTY_SCENE);
  const [list, setList] = useState<PlaySummary[] | null>(null);
  const [current, setCurrent] = useState<SavedPlay | null>(null);
  const [name, setName] = useState('Jugada sin nombre');
  const [description, setDescription] = useState('');
  const [playTeam, setPlayTeam] = useState<string>(teamId ?? '');
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [openList, setOpenList] = useState(false);

  const playback = usePlayback(scene.durationMs);
  const svgRef = useRef<SVGSVGElement>(null);

  const setSceneDirty = useCallback((s: Scene) => {
    setScene(s);
    setSaveState('idle');
  }, []);
  const history = useBoardHistory(scene, setSceneDirty);

  /* ─────────────────────────────── Carga ─────────────────────────────────── */

  useEffect(() => {
    let alive = true;
    plays
      .list()
      .then((rows) => alive && setList(rows))
      .catch((e) => alive && setLoadError(humanError(e)))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!playId) {
      setCurrent(null);
      return;
    }
    let alive = true;
    setLoading(true);
    plays
      .get(playId)
      .then((p) => {
        if (!alive) return;
        if (!p) {
          toast.error('Esa jugada ya no existe.');
          navigate('/app/pizarra', { replace: true });
          return;
        }
        setCurrent(p);
        setScene(p.scene);
        setName(p.name);
        setDescription(p.description);
        setPlayTeam(p.teamId ?? '');
        setSaveState('saved');
        history.reset();
        playback.reset();
      })
      .catch((e) => alive && setLoadError(humanError(e)))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
    // Sólo reaccionamos al identificador: el resto son referencias estables.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playId]);

  /* ─────────────────────────────── Guardar ───────────────────────────────── */

  const save = async () => {
    if (!userId) return;
    setSaveState('saving');
    try {
      const saved = await plays.save({
        id: current?.id,
        name,
        description,
        teamId: playTeam || null,
        scene,
        userId,
      });
      setCurrent(saved);
      setSaveState('saved');
      setList((rows) => [saved, ...(rows ?? []).filter((r) => r.id !== saved.id)]);
      if (!playId) navigate(`/app/pizarra/${saved.id}`, { replace: true });
    } catch (e) {
      setSaveState('error');
      toast.error('No hemos podido guardar la jugada', humanError(e));
    }
  };

  const nueva = useCallback(() => {
    setScene(EMPTY_SCENE);
    setCurrent(null);
    setName('Jugada sin nombre');
    setDescription('');
    setSaveState('idle');
    history.reset();
    playback.reset();
  }, [history, playback]);

  const remove = async () => {
    if (!current) return;
    try {
      await plays.remove(current.id);
      setList((rows) => (rows ?? []).filter((r) => r.id !== current.id));
      toast.success('Jugada eliminada');
      nueva();
      navigate('/app/pizarra', { replace: true });
    } catch (e) {
      toast.error('No hemos podido eliminarla', humanError(e));
    } finally {
      setConfirmDelete(false);
    }
  };

  if (loadError) return <ErrorState description={loadError} onRetry={() => window.location.reload()} />;

  return (
    <>
      <PageHeader
        eyebrow={current ? 'Pizarra táctica · guardada en el club' : 'Pizarra táctica'}
        title={
          <input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setSaveState('idle');
            }}
            aria-label="Nombre de la jugada"
            className="w-full max-w-xl rounded border border-transparent bg-transparent px-1 py-0.5 text-xl font-semibold leading-tight outline-none transition-colors hover:border-line focus:border-navy-600 sm:text-2xl"
          />
        }
        actions={
          <>
            <SaveIndicator state={saveState} />
            <Button variant="secondary" onClick={() => setOpenList(true)}>
              Mis jugadas
            </Button>
            <Button onClick={save} loading={saveState === 'saving'}>
              Guardar
            </Button>
          </>
        }
      />

      {loading && !current && scene.objects.length === 0 ? (
        <Skeleton className="aspect-[111/74] w-full" />
      ) : (
        <BoardEditor
          scene={scene}
          onChange={setSceneDirty}
          playback={playback}
          history={history}
          svgRef={svgRef}
          onExportImage={() =>
            void exportSceneImage(svgRef.current, name).catch(() =>
              toast.error('No hemos podido generar la imagen en este navegador.'),
            )
          }
          aside={
            <>
              <Panel>
                <PanelHeader title="Ficha" />
                <div className="space-y-3 p-3">
                  <Field label="Equipo" hint="Opcional. Sirve para encontrarla después.">
                    <Select
                      value={playTeam}
                      onChange={(e) => {
                        setPlayTeam(e.target.value);
                        setSaveState('idle');
                      }}
                    >
                      <option value="">Sin equipo concreto</option>
                      {teams.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </Select>
                  </Field>

                  <Field label="Notas">
                    <Textarea
                      value={description}
                      onChange={(e) => {
                        setDescription(e.target.value);
                        setSaveState('idle');
                      }}
                      placeholder="Qué se trabaja, a qué prestar atención…"
                      className="min-h-[70px]"
                    />
                  </Field>

                  {current && (
                    <Button
                      variant="danger"
                      size="sm"
                      block
                      icon={<Trash2 size={14} />}
                      onClick={() => setConfirmDelete(true)}
                    >
                      Eliminar jugada
                    </Button>
                  )}
                </div>
              </Panel>

              <p className="px-1 text-xs leading-relaxed text-muted">
                La exportación genera una imagen del instante actual. Grabar la animación en vídeo
                desde el navegador no es fiable en todos los equipos, así que no lo ofrecemos
                todavía.
              </p>
            </>
          }
        />
      )}

      {scene.objects.length === 0 && !loading && (
        <Panel className="mt-3">
          <EmptyState
            title="El campo está vacío"
            description="Coloca las jugadoras y el balón, muévelos en distintos instantes y la jugada se reproducirá sola. Puedes empezar con una alineación completa."
            action={
              <Button onClick={() => history.commit(layoutTeam(scene, 'jugadora'))}>
                Colocar mi equipo
              </Button>
            }
          />
        </Panel>
      )}

      {/* Jugadas guardadas */}
      <Modal
        open={openList}
        onClose={() => setOpenList(false)}
        title="Jugadas del club"
        description="Se comparten con el cuerpo técnico que tiene acceso al club."
        footer={
          <Button
            icon={<Plus size={15} />}
            onClick={() => {
              setOpenList(false);
              navigate('/app/pizarra');
              nueva();
            }}
          >
            Nueva jugada
          </Button>
        }
      >
        {list === null ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : list.length === 0 ? (
          <EmptyState
            title="Todavía no hay jugadas guardadas"
            description="Cuando guardes la primera, aparecerá aquí para todo el cuerpo técnico del club."
          />
        ) : (
          <ul className="divide-y divide-line">
            {list.map((p) => (
              <li key={p.id}>
                <button
                  onClick={() => {
                    setOpenList(false);
                    navigate(`/app/pizarra/${p.id}`);
                  }}
                  className="flex w-full items-center gap-3 px-1 py-2.5 text-left transition-colors hover:bg-surface"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-base font-medium text-navy-900">{p.name}</span>
                    {p.description && (
                      <span className="mt-0.5 block truncate text-sm text-muted">{p.description}</span>
                    )}
                  </span>
                  <span className="shrink-0 text-xs tabular-nums text-muted">
                    {formatSeconds(p.durationMs)}
                  </span>
                  {p.id === current?.id && (
                    <Tag size="sm" tone="solid">
                      Abierta
                    </Tag>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </Modal>

      <ConfirmDialog
        open={confirmDelete}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={remove}
        title="Eliminar la jugada"
        description={
          <>
            Se eliminará <strong>{name}</strong> para todo el cuerpo técnico. No se puede deshacer.
          </>
        }
      />
    </>
  );
}
