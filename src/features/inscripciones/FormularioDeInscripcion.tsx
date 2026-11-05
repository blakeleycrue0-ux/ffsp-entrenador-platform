/**
 * El formulario que abre la familia. Sin cuenta, desde el enlace del club.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ESTA PANTALLA ES LA QUE MÁS CUIDADO PIDE DE TODO EL PROYECTO, y no por el
 * diseño: es el único sitio donde escribe alguien que no es del club, una sola
 * vez, con los datos de su hijo, probablemente desde el móvil y probablemente
 * sin volver a intentarlo si algo falla. Si aquí se pierde lo escrito, el club
 * no se enterará nunca de que esa familia lo intentó.
 *
 * DE AHÍ LAS CUATRO DECISIONES QUE PARECEN EXAGERADAS Y NO LO SON:
 *
 *   1. LO ESCRITO SE GUARDA EN EL PROPIO MÓVIL MIENTRAS SE RELLENA. Un
 *      formulario largo en un móvil compite con una llamada entrante, con el
 *      navegador cerrando pestañas por memoria y con un dedo que da atrás sin
 *      querer. Se guarda en `sessionStorage` por token, y al volver sigue ahí.
 *      No es la base de datos y no pretende serlo: es el borrador de alguien
 *      que todavía no ha enviado nada. Se borra al enviar.
 *
 *   2. LOS DOCUMENTOS SE SUBEN DESPUÉS DE GUARDAR LA FICHA, NO ANTES. Si se
 *      subieran primero y la ficha fallara, habría archivos de un menor
 *      colgando de ninguna inscripción. Y al revés —ficha primero— lo peor que
 *      pasa es una inscripción con un documento menos, que el club ve y puede
 *      reclamar. El orden está elegido por cuál es el fallo menos malo.
 *
 *   3. SI UN DOCUMENTO FALLA, NO SE PIERDE LA INSCRIPCIÓN. Se enseña el
 *      justificante igual, con la lista de lo que no subió y la pantalla para
 *      reintentarlo. Tirar media hora de trabajo de alguien porque el tercer
 *      archivo pesaba demasiado sería lo contrario de lo que hay que hacer.
 *
 *   4. NO SE DICE «ENVIADO» HASTA QUE EL SERVIDOR LO CONFIRMA. El justificante
 *      lo escribe la base de datos, no esta pantalla. Mientras no haya código,
 *      no hay inscripción, y no se finge que sí.
 *
 * Y UNA MÁS, DE LAS QUE NO SE VEN: aquí no se enseña el importe de la cuota.
 * El formulario no cobra. Prometer un precio en la pantalla donde alguien se
 * inscribe, cuando el cobro lo decide el club después y a mano, sería
 * comprometer al club con una cifra que esta pantalla no controla.
 */

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AlertCircle, Check, FileUp, Loader2, ShieldCheck, X } from 'lucide-react';
import {
  publico, respuestaVacia, peso, MIMES, TOPE_BYTES,
  type Campo, type FormularioPublico, type Respuesta,
} from '@/services/inscripciones';
import { humanError } from '@/services/supabase';
import { cn } from '@/lib/utils';

type Paso = 'cargando' | 'cerrado' | 'rellenando' | 'enviando' | 'hecho' | 'roto';

export default function FormularioDeInscripcion() {
  const { token = '' } = useParams();
  const [paso, setPaso] = useState<Paso>('cargando');
  const [form, setForm] = useState<FormularioPublico | null>(null);
  const [datos, setDatos] = useState<Respuesta>(respuestaVacia);
  const [archivos, setArchivos] = useState<Record<string, File>>({});
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<{ codigo: string; fallaron: string[] } | null>(null);
  /* Para no repetir el aviso de un campo mientras se escribe en otro. */
  const [tocados, setTocados] = useState<Record<string, boolean>>({});

  const claveBorrador = `p360.inscripcion.${token}`;

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const f = await publico.formulario(token);
        if (!vivo) return;
        setForm(f);
        setPaso(f.abierto ? 'rellenando' : 'cerrado');
        /* El borrador de la vez anterior, si lo hay. */
        try {
          const guardado = sessionStorage.getItem(claveBorrador);
          if (guardado) setDatos({ ...respuestaVacia(), ...JSON.parse(guardado) });
        } catch { /* un sessionStorage que no deja leer no es motivo para no abrir */ }
      } catch (e) {
        if (!vivo) return;
        setError(humanError(e));
        setPaso('roto');
      }
    })();
    return () => { vivo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  /* Guardar el borrador en cuanto cambia algo. Los archivos no: un `File` no
     cabe en `sessionStorage` y no tendría sentido guardarlo a medias. */
  useEffect(() => {
    if (paso !== 'rellenando') return;
    try { sessionStorage.setItem(claveBorrador, JSON.stringify(datos)); } catch { /* da igual */ }
  }, [datos, paso, claveBorrador]);

  const falta = useMemo(() => comprobar(form, datos, archivos), [form, datos, archivos]);

  const poner = (k: keyof Respuesta) => (v: string) => setDatos((d) => ({ ...d, [k]: v }));
  const ponerRespuesta = (id: string, v: string) =>
    setDatos((d) => ({ ...d, respuestas: { ...d.respuestas, [id]: v } }));
  const ponerConsentimiento = (id: string, si: boolean) =>
    setDatos((d) => {
      const c = { ...d.consentimientos };
      if (si) c[id] = new Date().toISOString(); else delete c[id];
      return { ...d, consentimientos: c };
    });

  const enviar = async () => {
    if (!form) return;
    /* Si falta algo, se marcan todos como tocados para que se vean los avisos
       de una vez, en lugar de uno por uno. */
    if (falta.length > 0) {
      setTocados(Object.fromEntries(falta.map((f) => [f.campo, true])));
      const primero = document.querySelector<HTMLElement>(`[data-campo="${falta[0].campo}"]`);
      primero?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setPaso('enviando');
    setError(null);
    try {
      /* PRIMERO LA FICHA. Explicado arriba: si falla, no queda ningún archivo
         de un menor colgando sin dueño. */
      const { id, codigo } = await publico.enviar(token, datos);

      /* DESPUÉS LOS ARCHIVOS, uno a uno y anotando los que no suban. */
      const fallaron: string[] = [];
      for (const [kind, archivo] of Object.entries(archivos)) {
        try {
          await publico.subirDocumento(id, token, kind, archivo);
        } catch {
          fallaron.push(form.documentos.find((d) => d.id === kind)?.label ?? kind);
        }
      }

      try { sessionStorage.removeItem(claveBorrador); } catch { /* da igual */ }
      setResultado({ codigo, fallaron });
      setPaso('hecho');
    } catch (e) {
      setError(humanError(e));
      setPaso('rellenando');
    }
  };

  /* ── Lo que se pinta ──────────────────────────────────────────────────── */

  if (paso === 'cargando') {
    return (
      <Marco>
        <div className="flex items-center justify-center gap-2 py-16 text-ink-500">
          <Loader2 size={18} className="animate-spin" /> Abriendo el formulario…
        </div>
      </Marco>
    );
  }

  if (paso === 'roto') {
    return (
      <Marco>
        <Cartel icono={<AlertCircle size={22} />} titulo="No hemos podido abrir el formulario">
          {error ?? 'Vuelve a intentarlo en un momento.'}
        </Cartel>
      </Marco>
    );
  }

  if (paso === 'cerrado' && form) {
    return (
      <Marco club={form.clubNombre} escudo={form.clubEscudo}>
        <Cartel icono={<AlertCircle size={22} />} titulo={form.titulo ?? 'Inscripción no disponible'}>
          {form.motivo ?? 'Este formulario no está abierto.'}
          {form.clubNombre && (
            <> Si crees que es un error, habla con {form.clubNombre}: el enlace lo reparte el club.</>
          )}
        </Cartel>
      </Marco>
    );
  }

  if (paso === 'hecho' && resultado && form) {
    return (
      <Marco club={form.clubNombre} escudo={form.clubEscudo}>
        <div className="rounded-3xl bg-panel p-6 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-ok/15 text-ok">
            <Check size={24} />
          </div>
          <h1 className="mt-4 font-titulo text-2xl font-semibold text-ink-900">Inscripción enviada</h1>
          <p className="mt-2 text-base leading-relaxed text-ink-600">
            {form.clubNombre ?? 'El club'} ya la tiene y la revisará. Guarda este justificante:
          </p>
          <p className="cifra mt-4 select-all rounded-2xl bg-raised px-4 py-3 text-2xl text-ink-900">
            {resultado.codigo}
          </p>

          {resultado.fallaron.length > 0 && (
            /* NO SE ESCONDE. La inscripción está guardada —eso es lo primero
               que se dice— pero faltan archivos, y quien tiene que saberlo es
               quien puede volver a enviarlos. */
            <div className="mt-5 rounded-2xl bg-warn/12 px-4 py-3 text-left text-base leading-relaxed text-warn">
              <strong className="font-semibold">Hay {resultado.fallaron.length === 1
                ? 'un documento que no se ha subido' : 'documentos que no se han subido'}:</strong>{' '}
              {resultado.fallaron.join(', ')}. La inscripción está guardada igual. Habla con el club
              para enviarlos por otra vía, o vuelve a abrir este enlace y rellénala de nuevo.
            </div>
          )}

          <p className="mt-5 text-sm leading-relaxed text-ink-500">
            No se ha cobrado nada. Si la inscripción lleva cuota, el club te dirá cómo y cuándo
            se paga.
          </p>
        </div>
      </Marco>
    );
  }

  if (!form) return null;
  const enviando = paso === 'enviando';
  const aviso = (campo: string) =>
    tocados[campo] ? falta.find((f) => f.campo === campo)?.que ?? null : null;

  return (
    <Marco club={form.clubNombre} escudo={form.clubEscudo}>
      <header className="mb-6">
        <h1 className="font-titulo text-3xl font-semibold leading-tight text-ink-900">{form.titulo}</h1>
        {form.temporada && <p className="mt-1 text-base text-ink-500">Temporada {form.temporada}</p>}
        {form.intro && (
          <p className="mt-3 whitespace-pre-line text-base leading-relaxed text-ink-600">{form.intro}</p>
        )}
      </header>

      <div className="space-y-6">
        <Bloque titulo="El jugador">
          <Texto etiqueta="Nombre y apellidos" valor={datos.player_name} onChange={poner('player_name')}
            campo="player_name" aviso={aviso('player_name')} onBlur={() => setTocados((t) => ({ ...t, player_name: true }))}
            autoComplete="name" obligatorio />
          <Texto etiqueta="Fecha de nacimiento" tipo="date" valor={datos.player_birth_date}
            onChange={poner('player_birth_date')} campo="player_birth_date" />
          <Texto etiqueta="DNI o NIE" valor={datos.player_doc} onChange={poner('player_doc')}
            campo="player_doc" ayuda="Si todavía no tiene, déjalo en blanco." />
        </Bloque>

        <Bloque titulo="Quién lo inscribe"
          nota="Si el jugador es menor de edad, los datos del padre, madre o tutor.">
          <Texto etiqueta="Nombre y apellidos" valor={datos.guardian_name} onChange={poner('guardian_name')}
            campo="guardian_name" aviso={aviso('guardian_name')} onBlur={() => setTocados((t) => ({ ...t, guardian_name: true }))}
            autoComplete="name" obligatorio />
          <Texto etiqueta="Parentesco" valor={datos.guardian_relation} onChange={poner('guardian_relation')}
            campo="guardian_relation" ayuda="Madre, padre, tutor…" />
          <Texto etiqueta="Correo electrónico" tipo="email" valor={datos.guardian_email}
            onChange={poner('guardian_email')} campo="guardian_email" aviso={aviso('guardian_email')}
            onBlur={() => setTocados((t) => ({ ...t, guardian_email: true }))}
            autoComplete="email" obligatorio ayuda="Aquí es donde el club te escribirá." />
          <Texto etiqueta="Teléfono" tipo="tel" valor={datos.guardian_phone} onChange={poner('guardian_phone')}
            campo="guardian_phone" autoComplete="tel" />
          <Texto etiqueta="DNI o NIE" valor={datos.guardian_doc} onChange={poner('guardian_doc')} campo="guardian_doc" />
        </Bloque>

        <Bloque titulo="Dónde vive">
          <Texto etiqueta="Dirección" valor={datos.address} onChange={poner('address')}
            campo="address" autoComplete="street-address" />
          <div className="grid grid-cols-[7rem_1fr] gap-3">
            <Texto etiqueta="Código postal" valor={datos.postal_code} onChange={poner('postal_code')}
              campo="postal_code" autoComplete="postal-code" />
            <Texto etiqueta="Población" valor={datos.city} onChange={poner('city')}
              campo="city" autoComplete="address-level2" />
          </div>
        </Bloque>

        {form.campos.length > 0 && (
          <Bloque titulo={`Lo que pide ${form.clubNombre ?? 'el club'}`}>
            {form.campos.map((c) => (
              <CampoDelClub
                key={c.id} campo={c}
                valor={datos.respuestas[c.id] ?? ''}
                onChange={(v) => ponerRespuesta(c.id, v)}
                aviso={aviso(`campo:${c.id}`)}
                onBlur={() => setTocados((t) => ({ ...t, [`campo:${c.id}`]: true }))}
              />
            ))}
          </Bloque>
        )}

        {form.documentos.length > 0 && (
          <Bloque titulo="Documentos"
            nota={`Imagen o PDF, hasta ${peso(TOPE_BYTES)} cada uno. Una foto hecha con el móvil sirve.`}>
            {form.documentos.map((d) => (
              <Archivo
                key={d.id} pedido={d} archivo={archivos[d.id] ?? null}
                aviso={aviso(`doc:${d.id}`)}
                onElegir={(f) => setArchivos((a) => {
                  const n = { ...a };
                  if (f) n[d.id] = f; else delete n[d.id];
                  return n;
                })}
              />
            ))}
          </Bloque>
        )}

        {form.consentimientos.length > 0 && (
          <Bloque titulo="Autorizaciones">
            {form.consentimientos.map((c) => (
              <label
                key={c.id} data-campo={`cons:${c.id}`}
                className={cn(
                  'flex cursor-pointer gap-3 rounded-2xl border p-4 transition-colors',
                  aviso(`cons:${c.id}`) ? 'border-bad bg-bad/[0.06]' : 'border-line bg-raised',
                )}
              >
                <input
                  type="checkbox"
                  checked={Boolean(datos.consentimientos[c.id])}
                  onChange={(e) => {
                    ponerConsentimiento(c.id, e.target.checked);
                    setTocados((t) => ({ ...t, [`cons:${c.id}`]: true }));
                  }}
                  className="mt-0.5 size-5 shrink-0 accent-marca-solido"
                />
                <span className="min-w-0">
                  <span className="block text-base font-medium leading-snug text-ink-900">
                    {c.label}
                    {!c.obligatorio && <span className="font-normal text-ink-500"> (opcional)</span>}
                  </span>
                  {c.texto && (
                    <span className="mt-1 block text-sm leading-relaxed text-ink-600">{c.texto}</span>
                  )}
                </span>
              </label>
            ))}
          </Bloque>
        )}

        {error && (
          <p className="rounded-2xl bg-bad/12 px-4 py-3 text-base leading-relaxed text-bad">{error}</p>
        )}

        {/* EL BOTÓN NO SE DESACTIVA. Un botón apagado sin decir por qué es la
            peor versión de esto: se puede pulsar siempre, y si falta algo
            lleva al primer hueco. */}
        <button
          type="button" onClick={() => void enviar()} disabled={enviando}
          /* escala-ok: blanco sobre el azul de marca */
          className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-marca-solido text-lg font-semibold text-white transition-opacity active:opacity-90 disabled:opacity-60"
        >
          {enviando ? <><Loader2 size={18} className="animate-spin" /> Enviando…</> : 'Enviar la inscripción'}
        </button>

        {/* QUÉ FALTA, DEBAJO DEL BOTÓN Y NO ENCIMA. Estaba encima, y esa línea
            aparecía al perder el foco del último campo —o sea, exactamente
            mientras el dedo bajaba sobre «Enviar»—, empujaba el botón hacia
            abajo y el toque se perdía: había que pulsar dos veces. Lo cazó
            `pruebas/inscripcion.mjs` midiendo que el botón se movía 865 px
            entre el principio y el final del clic. Debajo, lo que crezca
            crece hacia el final de la página y no mueve nada que haya que
            pulsar. */}
        <p className="min-h-[1.5rem] text-base leading-relaxed text-ink-500">
          {falta.length > 0 && Object.keys(tocados).length > 0
            ? falta.length === 1 ? 'Falta un dato.' : `Faltan ${falta.length} datos.`
            : ''}
        </p>

        <p className="flex items-start gap-2 pb-10 text-sm leading-relaxed text-ink-500">
          <ShieldCheck size={15} className="mt-0.5 shrink-0" />
          <span>
            Estos datos los recibe {form.clubNombre ?? 'el club'}, que es quien decide para qué los
            usa y a quién se los pide. Playoff360 sólo le presta la herramienta. No se cobra nada
            desde esta página.
          </span>
        </p>
      </div>
    </Marco>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   QUÉ FALTA
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * SE COMPRUEBA AQUÍ PARA AVISAR, Y OTRA VEZ EN EL SERVIDOR PARA DECIDIR.
 * Esta lista sirve para que nadie pulse enviar y se lleve un error; la que
 * manda es la de `enviar_inscripcion`, porque quien envía puede no ser esta
 * pantalla.
 */
function comprobar(
  form: FormularioPublico | null, d: Respuesta, archivos: Record<string, File>,
): { campo: string; que: string }[] {
  if (!form) return [];
  const falta: { campo: string; que: string }[] = [];

  if (d.player_name.trim().length < 2) falta.push({ campo: 'player_name', que: 'Pon el nombre del jugador.' });
  if (d.guardian_name.trim().length < 2) falta.push({ campo: 'guardian_name', que: 'Pon tu nombre.' });
  /* El mismo patrón que el `check` de la columna, para que no haya un correo
     que pase aquí y lo rechace la base. */
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.guardian_email.trim()))
    falta.push({ campo: 'guardian_email', que: 'Revisa el correo: falta algo.' });

  for (const c of form.campos) {
    if (c.obligatorio && !(d.respuestas[c.id] ?? '').trim())
      falta.push({ campo: `campo:${c.id}`, que: `Falta «${c.label}».` });
  }
  for (const doc of form.documentos) {
    if (doc.obligatorio && !archivos[doc.id])
      falta.push({ campo: `doc:${doc.id}`, que: `Falta el archivo «${doc.label}».` });
  }
  for (const c of form.consentimientos) {
    if (c.obligatorio && !d.consentimientos[c.id])
      falta.push({ campo: `cons:${c.id}`, que: 'Hay que aceptarlo para poder inscribirse.' });
  }
  return falta;
}

/* ═══════════════════════════════════════════════════════════════════════════
   PIEZAS
   ═══════════════════════════════════════════════════════════════════════════ */

/* NO USA EL ARMAZÓN DE LA APLICACIÓN A PROPÓSITO. Esta página la abre alguien
   que no tiene cuenta: no hay menú, ni barra de abajo, ni buscador, ni nada
   donde pulsar que lleve a una pantalla que le va a pedir contraseña. Sólo el
   club y el formulario. */
function Marco({ children, club, escudo }: { children: React.ReactNode; club?: string | null; escudo?: string | null }) {
  return (
    <div className="min-h-dvh bg-surface">
      <div className="mx-auto w-full max-w-xl px-4 pt-6">
        {club && (
          <div className="mb-6 flex items-center gap-3">
            {escudo
              ? <img src={escudo} alt="" className="size-10 rounded-xl object-cover" />
              /* escala-ok: blanco sobre el azul de marca, que no se da la vuelta con el tema */
              : <div className="flex size-10 items-center justify-center rounded-xl bg-marca-fondo text-sm font-bold text-white">
                  {club.slice(0, 2).toUpperCase()}
                </div>}
            <p className="font-titulo text-base font-semibold text-ink-900">{club}</p>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

function Cartel({ icono, titulo, children }: { icono: React.ReactNode; titulo: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl bg-panel p-6">
      <div className="flex size-11 items-center justify-center rounded-full bg-raised text-ink-600">{icono}</div>
      <h1 className="mt-4 font-titulo text-xl font-semibold text-ink-900">{titulo}</h1>
      <p className="mt-2 text-base leading-relaxed text-ink-600">{children}</p>
    </div>
  );
}

function Bloque({ titulo, nota, children }: { titulo: string; nota?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl bg-panel p-5">
      <h2 className="font-titulo text-base font-semibold text-ink-900">{titulo}</h2>
      {nota && <p className="mt-1 text-sm leading-relaxed text-ink-500">{nota}</p>}
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

function Texto({
  etiqueta, valor, onChange, campo, tipo = 'text', obligatorio, ayuda, aviso, onBlur, autoComplete,
}: {
  etiqueta: string; valor: string; onChange: (v: string) => void; campo: string;
  tipo?: string; obligatorio?: boolean; ayuda?: string; aviso?: string | null;
  onBlur?: () => void; autoComplete?: string;
}) {
  return (
    <label className="block" data-campo={campo}>
      <span className="mb-1.5 block text-sm font-medium text-ink-700">
        {etiqueta}{obligatorio && <span className="text-bad"> *</span>}
      </span>
      <input
        type={tipo} value={valor} onChange={(e) => onChange(e.target.value)} onBlur={onBlur}
        autoComplete={autoComplete}
        /* 48 px de alto: se escribe con el pulgar. Y 16 px de letra, que por
           debajo de eso Safari en iOS hace zoom al enfocar y descoloca la
           página entera. */
        className={cn(
          'h-12 w-full rounded-xl border bg-surface px-3.5 text-base text-ink-900 outline-none transition-colors',
          'focus:border-marca-solido focus:ring-2 focus:ring-marca-solido/25',
          aviso ? 'border-bad' : 'border-line',
        )}
      />
      {/* EL HUECO DEL MENSAJE ESTÁ SIEMPRE, AUNQUE NO HAYA MENSAJE. Explicado
          largo arriba, en la nota 5 de la cabecera: si este `span` apareciera
          al perder el foco, la página crecería justo cuando el dedo está
          bajando sobre «Enviar», y el botón se iría de debajo del dedo. */}
      <span className={cn('mt-1.5 block min-h-[1.25rem] text-sm', aviso ? 'text-bad' : 'text-ink-500')}>
        {aviso ?? ayuda ?? ''}
      </span>
    </label>
  );
}

function CampoDelClub({
  campo, valor, onChange, aviso, onBlur,
}: { campo: Campo; valor: string; onChange: (v: string) => void; aviso?: string | null; onBlur?: () => void }) {
  const marca = `campo:${campo.id}`;

  if (campo.tipo === 'si-no') {
    return (
      <label className="flex items-center justify-between gap-3" data-campo={marca}>
        <span className="min-w-0 text-base text-ink-900">{campo.label}</span>
        <input
          type="checkbox" checked={valor === 'si'}
          onChange={(e) => onChange(e.target.checked ? 'si' : 'no')}
          className="size-5 shrink-0 accent-marca-solido"
        />
      </label>
    );
  }

  if (campo.tipo === 'opcion') {
    return (
      <label className="block" data-campo={marca}>
        <span className="mb-1.5 block text-sm font-medium text-ink-700">
          {campo.label}{campo.obligatorio && <span className="text-bad"> *</span>}
        </span>
        <select
          value={valor} onChange={(e) => onChange(e.target.value)} onBlur={onBlur}
          className={cn(
            'h-12 w-full rounded-xl border bg-surface px-3 text-base text-ink-900 outline-none',
            aviso ? 'border-bad' : 'border-line',
          )}
        >
          <option value="">Elige…</option>
          {(campo.opciones ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        <span className="mt-1.5 block min-h-[1.25rem] text-sm text-bad">{aviso ?? ''}</span>
      </label>
    );
  }

  if (campo.tipo === 'texto-largo') {
    return (
      <label className="block" data-campo={marca}>
        <span className="mb-1.5 block text-sm font-medium text-ink-700">
          {campo.label}{campo.obligatorio && <span className="text-bad"> *</span>}
        </span>
        <textarea
          value={valor} onChange={(e) => onChange(e.target.value)} onBlur={onBlur} rows={3}
          className={cn(
            'w-full rounded-xl border bg-surface p-3.5 text-base leading-relaxed text-ink-900 outline-none',
            aviso ? 'border-bad' : 'border-line',
          )}
        />
        <span className={cn('mt-1.5 block min-h-[1.25rem] text-sm', aviso ? 'text-bad' : 'text-ink-500')}>
          {aviso ?? campo.ayuda ?? ''}
        </span>
      </label>
    );
  }

  return (
    <Texto
      etiqueta={campo.label} valor={valor} onChange={onChange} campo={marca}
      tipo={campo.tipo === 'numero' ? 'number' : campo.tipo === 'fecha' ? 'date' : 'text'}
      obligatorio={campo.obligatorio} ayuda={campo.ayuda} aviso={aviso} onBlur={onBlur}
    />
  );
}

function Archivo({
  pedido, archivo, onElegir, aviso,
}: {
  pedido: { id: string; label: string; obligatorio: boolean; ayuda?: string };
  archivo: File | null; onElegir: (f: File | null) => void; aviso?: string | null;
}) {
  const [queja, setQueja] = useState<string | null>(null);

  /* SE COMPRUEBA ANTES DE SUBIR. El cubo rechaza lo que no cuadre, pero
     esperar al rechazo significa gastar la subida entera de una foto de 30 MB
     por una conexión de móvil para luego decir que no. */
  const elegir = (f: File | null) => {
    setQueja(null);
    if (!f) { onElegir(null); return; }
    if (f.size > TOPE_BYTES) {
      setQueja(`Pesa ${peso(f.size)} y el tope es ${peso(TOPE_BYTES)}. Prueba a hacer una foto con menos calidad.`);
      return;
    }
    if (!MIMES.includes(f.type)) {
      setQueja('Tiene que ser una imagen (JPG, PNG, HEIC o WEBP) o un PDF.');
      return;
    }
    onElegir(f);
  };

  return (
    <div data-campo={`doc:${pedido.id}`}>
      <span className="mb-1.5 block text-sm font-medium text-ink-700">
        {pedido.label}{pedido.obligatorio && <span className="text-bad"> *</span>}
      </span>

      {archivo ? (
        <div className="flex items-center gap-3 rounded-xl border border-ok/40 bg-ok/[0.07] p-3">
          <Check size={17} className="shrink-0 text-ok" />
          <span className="min-w-0 flex-1 truncate text-base text-ink-900">{archivo.name}</span>
          <span className="shrink-0 text-sm text-ink-500">{peso(archivo.size)}</span>
          <button
            type="button" onClick={() => onElegir(null)} aria-label={`Quitar ${pedido.label}`}
            className="flex size-8 shrink-0 items-center justify-center rounded-lg text-ink-500 active:bg-raised"
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <label
          className={cn(
            'flex h-12 cursor-pointer items-center gap-2.5 rounded-xl border border-dashed px-3.5 text-base transition-colors',
            aviso || queja ? 'border-bad text-bad' : 'border-line text-ink-600',
          )}
        >
          <FileUp size={17} className="shrink-0" />
          <span>Elegir archivo o hacer una foto</span>
          <input
            type="file" className="sr-only" accept={MIMES.join(',')}
            onChange={(e) => elegir(e.target.files?.[0] ?? null)}
          />
        </label>
      )}

      <span className={cn('mt-1.5 block min-h-[1.25rem] text-sm', (queja ?? aviso) ? 'text-bad' : 'text-ink-500')}>
        {queja ?? aviso ?? pedido.ayuda ?? ''}
      </span>
    </div>
  );
}
