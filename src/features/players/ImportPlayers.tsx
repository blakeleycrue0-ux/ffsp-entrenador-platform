/**
 * Importar jugadoras desde un archivo.
 * ---------------------------------------------------------------------------
 * Nada se escribe en la base de datos hasta que se ve lo que va a entrar. El
 * recorrido es: pegar o subir el archivo → decir qué columna es cada cosa →
 * revisar la vista previa con los avisos → importar.
 *
 * Los duplicados no se descartan en silencio: se señalan y tú decides.
 */

import { useMemo, useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import {
  Button, Checkbox, Field, Modal, Panel, Select, Tag, Textarea,
} from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { useClub } from '@/store/store';
import { squadOf } from '@/store/selectors';
import { humanError } from '@/services/supabase';
import { parseCsv } from '@/lib/csv';
import { normalize } from '@/lib/utils';
import { POSITIONS, type Player, type PlayerPosition } from '@/types';

/** Campos que sabemos rellenar. El nombre es el único obligatorio. */
interface Campo {
  id: CampoId;
  label: string;
  required?: boolean;
  /** Palabras que buscamos en el encabezado para adivinar la columna. */
  pistas: string[];
}

type CampoId = 'name' | 'number' | 'position' | 'birthDate' | 'phone' | 'email' | 'guardian';

const CAMPOS: Campo[] = [
  { id: 'name', label: 'Nombre y apellidos', required: true, pistas: ['nombre', 'jugadora', 'apellidos', 'name'] },
  { id: 'number', label: 'Dorsal', pistas: ['dorsal', 'numero', 'número', 'num', 'number'] },
  { id: 'position', label: 'Posición', pistas: ['posicion', 'posición', 'puesto', 'position'] },
  { id: 'birthDate', label: 'Fecha de nacimiento', pistas: ['nacimiento', 'fecha', 'nacida', 'birth'] },
  { id: 'phone', label: 'Teléfono', pistas: ['telefono', 'teléfono', 'movil', 'móvil', 'phone'] },
  { id: 'email', label: 'Correo', pistas: ['correo', 'email', 'mail'] },
  { id: 'guardian', label: 'Contacto de familia', pistas: ['tutor', 'madre', 'padre', 'familia', 'contacto'] },
];
type Mapa = Partial<Record<CampoId, number>>;

interface Fila {
  index: number;
  name: string;
  number: number | null;
  position: PlayerPosition | '';
  birthDate: string;
  phone: string;
  email: string;
  guardian: string;
  /** Motivos por los que conviene mirar esta fila antes de importar. */
  avisos: string[];
  /** Un problema que impide importarla. */
  error: string | null;
  incluir: boolean;
}

/** Acepta 12/03/2009, 12-03-2009 y 2009-03-12. */
function fecha(v: string): string {
  const t = v.trim();
  if (!t) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  const m = t.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (!m) return '';
  return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
}

function posicion(v: string): PlayerPosition | '' {
  const n = normalize(v);
  return POSITIONS.find((p) => normalize(p) === n) ?? '';
}

export function ImportPlayers({
  open, onClose, teamId,
}: { open: boolean; onClose: () => void; teamId: string }) {
  const toast = useToast();
  const { data, actions } = useClub();
  const squad = useMemo(() => squadOf(data, teamId), [data, teamId]);

  const [texto, setTexto] = useState('');
  const [mapa, setMapa] = useState<Mapa>({});
  const [paso, setPaso] = useState<'pegar' | 'columnas' | 'revisar'>('pegar');
  const [filas, setFilas] = useState<Fila[]>([]);
  const [busy, setBusy] = useState(false);
  const [resultado, setResultado] = useState<{ ok: number; fallos: string[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const tabla = useMemo(() => parseCsv(texto), [texto]);

  const leerArchivo = async (file: File) => {
    const contenido = await file.text();
    setTexto(contenido);
    avanzarAColumnas(contenido);
  };

  const avanzarAColumnas = (contenido = texto) => {
    const t = parseCsv(contenido);
    if (t.headers.length === 0) {
      toast.error('No hemos podido leer el archivo', 'Comprueba que tiene una fila de encabezados.');
      return;
    }
    // Correspondencia automática por el nombre del encabezado.
    const auto: Mapa = {};
    t.headers.forEach((h, i) => {
      const n = normalize(h);
      for (const campo of CAMPOS) {
        if (auto[campo.id] !== undefined) continue;
        if (campo.pistas.some((p) => n.includes(normalize(p)))) {
          auto[campo.id] = i;
          break;
        }
      }
    });
    setMapa(auto);
    setPaso('columnas');
  };

  const revisar = () => {
    if (mapa.name === undefined) {
      toast.error('Falta el nombre', 'Indica qué columna contiene el nombre de la jugadora.');
      return;
    }
    const usados = new Set(squad.map((p) => p.number));
    const nombresExistentes = new Map(squad.map((p) => [normalize(p.name), p]));
    const vistos = new Set<string>();

    const out: Fila[] = tabla.rows.map((r, index) => {
      const get = (id: CampoId) => (mapa[id] !== undefined ? (r[mapa[id]!] ?? '').trim() : '');
      const name = get('name');
      const rawNumber = get('number').replace(/\D/g, '');
      const number = rawNumber ? Number(rawNumber) : null;
      const avisos: string[] = [];
      let error: string | null = null;

      if (!name) error = 'Sin nombre';
      const clave = normalize(name);
      if (!error && vistos.has(clave)) error = 'Repetida dentro del archivo';
      vistos.add(clave);

      const yaExiste = nombresExistentes.get(clave);
      if (yaExiste) avisos.push(`Ya está en la plantilla con el dorsal ${yaExiste.number}`);
      if (number !== null && usados.has(number)) avisos.push(`El dorsal ${number} ya está ocupado`);
      if (number !== null && (number < 1 || number > 99)) avisos.push('Dorsal fuera de 1–99');

      const posRaw = get('position');
      const position = posicion(posRaw);
      if (posRaw && !position) avisos.push(`No reconocemos la posición «${posRaw}»`);

      const birthRaw = get('birthDate');
      const birthDate = fecha(birthRaw);
      if (birthRaw && !birthDate) avisos.push('No entendemos la fecha de nacimiento');

      return {
        index,
        name,
        number,
        position,
        birthDate,
        phone: get('phone'),
        email: get('email'),
        guardian: get('guardian'),
        avisos,
        error,
        incluir: !error && !yaExiste,
      };
    });

    setFilas(out);
    setPaso('revisar');
  };

  const importar = async () => {
    const aImportar = filas.filter((f) => f.incluir && !f.error);
    if (aImportar.length === 0) {
      toast.error('No hay ninguna fila marcada');
      return;
    }
    setBusy(true);
    const fallos: string[] = [];
    let ok = 0;

    // Los dorsales libres se reparten sobre la marcha para no repetirlos.
    const usados = new Set(squad.map((p) => p.number));
    const siguienteLibre = () => {
      for (let n = 1; n < 100; n += 1) if (!usados.has(n)) return n;
      return 0;
    };

    for (const f of aImportar) {
      const number = f.number !== null && !usados.has(f.number) ? f.number : siguienteLibre();
      usados.add(number);

      const player: Player = {
        id: '',
        teamId,
        name: f.name,
        shortName: f.name.split(' ')[0],
        number,
        position: f.position,
        foot: 'Diestra',
        birthDate: f.birthDate || undefined,
        phone: f.phone || undefined,
        email: f.email || undefined,
        guardians: f.guardian
          ? [{ name: f.guardian, relation: 'Tutor/a', phone: f.phone || '' }]
          : [],
        availability: { status: 'disponible' },
        stats: { matches: 0, minutes: 0, goals: 0, assists: 0, yellow: 0, red: 0 },
        joinedAt: new Date().toISOString().slice(0, 10),
      };

      try {
        await actions.savePlayer(player);
        ok += 1;
      } catch (e) {
        fallos.push(`${f.name}: ${humanError(e)}`);
      }
    }

    setBusy(false);
    setResultado({ ok, fallos });
  };

  const cerrar = () => {
    setTexto('');
    setMapa({});
    setFilas([]);
    setPaso('pegar');
    setResultado(null);
    onClose();
  };

  const marcadas = filas.filter((f) => f.incluir && !f.error).length;

  return (
    <Modal
      open={open}
      onClose={cerrar}
      size="xl"
      title="Importar jugadoras"
      description={
        paso === 'pegar'
          ? 'Sube un archivo .csv o pega el contenido de tu hoja de cálculo.'
          : paso === 'columnas'
            ? 'Dinos qué columna es cada cosa. Lo que no indiques se queda vacío.'
            : 'Revisa antes de importar. Todavía no se ha guardado nada.'
      }
      footer={
        resultado ? (
          <Button onClick={cerrar}>Cerrar</Button>
        ) : paso === 'pegar' ? (
          <>
            <Button variant="secondary" onClick={cerrar}>
              Cancelar
            </Button>
            <Button onClick={() => avanzarAColumnas()} disabled={!texto.trim()}>
              Continuar
            </Button>
          </>
        ) : paso === 'columnas' ? (
          <>
            <Button variant="secondary" onClick={() => setPaso('pegar')}>
              Atrás
            </Button>
            <Button onClick={revisar}>Ver la vista previa</Button>
          </>
        ) : (
          <>
            <Button variant="secondary" onClick={() => setPaso('columnas')}>
              Atrás
            </Button>
            <Button loading={busy} onClick={importar} disabled={marcadas === 0}>
              Importar {marcadas} {marcadas === 1 ? 'jugadora' : 'jugadoras'}
            </Button>
          </>
        )
      }
    >
      {resultado ? (
        <div className="space-y-3">
          <p className="text-base leading-relaxed text-navy-800">
            Se han añadido <strong>{resultado.ok}</strong>{' '}
            {resultado.ok === 1 ? 'jugadora' : 'jugadoras'} a la plantilla.
          </p>
          {resultado.fallos.length > 0 && (
            <Panel className="border-bad/30 p-3">
              <p className="text-base font-medium text-bad">
                {resultado.fallos.length} no se han podido guardar
              </p>
              <ul className="mt-1.5 space-y-1 text-sm leading-relaxed text-navy-700">
                {resultado.fallos.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </Panel>
          )}
        </div>
      ) : paso === 'pegar' ? (
        <div className="space-y-3">
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv,text/plain"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void leerArchivo(f);
            }}
          />
          <Button variant="secondary" icon={<Upload size={15} />} onClick={() => fileRef.current?.click()}>
            Elegir un archivo .csv
          </Button>

          <Field
            label="O pega aquí el contenido"
            hint="La primera fila debe ser la de los encabezados: Nombre, Dorsal, Posición…"
          >
            <Textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder={'Nombre,Dorsal,Posición\nMarta Ribas,1,Portera\nClara Vidal,4,Central'}
              className="min-h-[160px] font-mono text-sm"
            />
          </Field>
        </div>
      ) : paso === 'columnas' ? (
        <div className="space-y-3">
          <p className="text-sm text-muted">
            Hemos leído {tabla.rows.length} {tabla.rows.length === 1 ? 'fila' : 'filas'} y{' '}
            {tabla.headers.length} columnas.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {CAMPOS.map((c) => (
              <Field key={c.id} label={c.label} required={c.required}>
                <Select
                  value={mapa[c.id] === undefined ? '' : String(mapa[c.id])}
                  onChange={(e) =>
                    setMapa((m) => ({
                      ...m,
                      [c.id]: e.target.value === '' ? undefined : Number(e.target.value),
                    }))
                  }
                >
                  <option value="">No lo tengo</option>
                  {tabla.headers.map((h, i) => (
                    <option key={i} value={i}>
                      {h || `Columna ${i + 1}`}
                    </option>
                  ))}
                </Select>
              </Field>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Tag tone="ok">{marcadas} se importarán</Tag>
            {filas.some((f) => f.error) && (
              <Tag tone="bad">{filas.filter((f) => f.error).length} con error</Tag>
            )}
            {filas.some((f) => f.avisos.length > 0) && (
              <Tag tone="warn">{filas.filter((f) => f.avisos.length > 0).length} para revisar</Tag>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="grid-table min-w-[620px]">
              <thead>
                <tr>
                  <th className="w-10"></th>
                  <th>Nombre</th>
                  <th className="w-16 text-right">Dorsal</th>
                  <th>Posición</th>
                  <th>Avisos</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((f) => (
                  <tr key={f.index} className={f.error ? 'opacity-60' : undefined}>
                    <td>
                      <Checkbox
                        checked={f.incluir && !f.error}
                        disabled={!!f.error}
                        onChange={(v) =>
                          setFilas((list) =>
                            list.map((x) => (x.index === f.index ? { ...x, incluir: v } : x)),
                          )
                        }
                      />
                    </td>
                    <td className="font-medium text-navy-900">{f.name || <span className="text-navy-300">—</span>}</td>
                    <td className="text-right tabular-nums">
                      {f.number ?? <span className="text-navy-300">auto</span>}
                    </td>
                    <td>{f.position || <span className="text-navy-300">—</span>}</td>
                    <td className="text-sm">
                      {f.error ? (
                        <span className="text-bad">{f.error}</span>
                      ) : f.avisos.length > 0 ? (
                        <span className="text-warn">{f.avisos.join(' · ')}</span>
                      ) : (
                        <span className="text-navy-300">Todo correcto</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-xs leading-relaxed text-muted">
            Las jugadoras que ya están en la plantilla vienen desmarcadas para no duplicarlas, pero
            puedes marcarlas si de verdad son personas distintas. Un dorsal ocupado se sustituye por
            el primero libre.
          </p>
        </div>
      )}
    </Modal>
  );
}
