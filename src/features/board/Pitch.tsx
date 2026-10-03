/**
 * Dibujo del campo, visto desde donde diga la cámara.
 * ---------------------------------------------------------------------------
 * Todo pasa por `proyeccion`: las rectas siguen siendo rectas y basta con sus
 * extremos, pero los círculos y los arcos dejan de serlo y se trocean. Sin
 * inclinación la proyección es la identidad, así que la vista de siempre sale
 * exactamente igual que antes.
 *
 * LAS PORTERÍAS. Eran un rectángulo gris pegado al fondo, y se notaba: una
 * portería no es una caja, es un marco con red, y desde cualquier ángulo que
 * no sea el cenital se ve que tiene fondo. Ahora se dibujan en tres
 * dimensiones de verdad —postes, larguero, red con caída y profundidad—,
 * porque la cámara ya sabe dónde cae un punto que está a dos metros y medio
 * del suelo. Las medidas son las reglamentarias: 7,32 × 2,44 en fútbol once,
 * y proporcionales en fútbol 7.
 */

import { useMemo } from 'react';
import type { PitchSpec, Point, Surface } from './scene';
import {
  aPuntos, aRuta, arcoProyectado, circuloProyectado, rectProyectado,
  type Proyeccion,
} from './camara';

const PALETA: Record<
  Surface,
  {
    grass: string;
    grassFar: string;
    line: string;
    poste: string;
    red: string;
    sombra: string;
    stripes: boolean;
  }
> = {
  cesped: {
    grass: '#20573C',
    /* Un verde algo más apagado para el fondo. No es decoración: con
       inclinación, el césped lejano reflejaría menos luz, y sin esa diferencia
       la profundidad no se lee. */
    grassFar: '#1A4731',
    line: 'rgba(255,255,255,0.72)',
    poste: '#F2F5F8',
    /* La portería se sale del césped, así que buena parte de la red se ve
       contra el fondo de la página, que es casi negro. Con la red al 30 %
       quedaba un borrón gris sin forma: hay que subirla para que se lea el
       mallado, que es lo que dice «esto es una portería». */
    red: 'rgba(255,255,255,0.50)',
    sombra: 'rgba(8,18,14,0.22)',
    stripes: true,
  },
  impresion: {
    grass: '#FFFFFF',
    grassFar: '#FFFFFF',
    line: 'rgba(16,28,45,0.55)',
    poste: '#3C475A',
    red: 'rgba(16,28,45,0.22)',
    sombra: 'rgba(16,28,45,0.10)',
    stripes: false,
  },
};

/** Alto de la portería, en metros, a partir del ancho reglamentario. */
const altoPorteria = (ancho: number) => (ancho >= 7 ? 2.44 : 2);
/** Lo que se mete la red hacia atrás. */
const fondoPorteria = (ancho: number) => (ancho >= 7 ? 1.9 : 1.4);

export function Pitch({
  spec,
  surface = 'cesped',
  proy,
}: {
  spec: PitchSpec;
  surface?: Surface;
  proy: Proyeccion;
}) {
  const { length: L, width: W, boxLength: bl, boxWidth: bw, smallBoxLength: sl, smallBoxWidth: sw } = spec;
  const cy = W / 2;
  const s = 0.22; // grosor de línea en metros
  const paleta = PALETA[surface];
  const { grass, grassFar, line, stripes } = paleta;

  /* Se recalcula sólo cuando cambia el campo o la cámara: son unas cuantas
     decenas de senos y cosenos y no tienen por qué repetirse en cada
     fotograma de la reproducción. */
  return useMemo(() => {
    const P = (x: number, y: number, z = 0) => proy.proyecta(x, y, z);
    const poli = (ps: Point[]) => aPuntos(ps);
    const rect = (x: number, y: number, w: number, h: number) => poli(rectProyectado(proy, x, y, w, h));

    /** Una línea del campo, con grosor en metros: se dibuja como trazo. */
    const linea = (x1: number, y1: number, x2: number, y2: number) => {
      const a = P(x1, y1);
      const b = P(x2, y2);
      return <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} />;
    };

    /* ───────────────────── Superficie libre ───────────────────── */
    if (spec.blank) {
      return (
        <g>
          <polygon points={rect(0, 0, L, W)} fill={grass} />
          <polygon points={rect(s / 2, s / 2, L - s, W - s)} fill="none" stroke={line} strokeWidth={s} />
        </g>
      );
    }

    /* ────────────────────────── Césped ────────────────────────── */
    const franjas = stripes
      ? Array.from({ length: 8 }, (_, i) => (
          <polygon
            key={i}
            points={rect((L / 8) * i, 0, L / 8, W)}
            fill="#FFFFFF"
            opacity={i % 2 === 0 ? 0.028 : 0}
          />
        ))
      : null;

    /* El degradado de profundidad sólo se pinta si hay inclinación; en plano
       no hay fondo que oscurecer y además cambiaría el dibujo de siempre. */
    const profundidad =
      proy.sinProfundidad || surface === 'impresion' ? null : (
        <polygon points={rect(0, 0, L, W)} fill="url(#p360-fondo)" />
      );

    /* ────────────────────────── Marcas ────────────────────────── */
    const arco = (cx: number, cyy: number, r: number, desde: number, hasta: number) => (
      <path d={aRuta(arcoProyectado(proy, cx, cyy, r, desde, hasta))} />
    );

    /** Arco del área: el trozo del círculo que asoma fuera. */
    const arcoArea = (lado: 'izq' | 'der') => {
      const px = lado === 'izq' ? 11 : L - 11;
      const r = spec.circleR;
      const dx = bl - 11;
      if (Math.abs(dx) >= r) return null;
      const a = Math.acos(dx / r);
      return lado === 'izq' ? arco(px, cy, r, -a, a) : arco(px, cy, r, Math.PI - a, Math.PI + a);
    };

    /** Los cuartos de círculo de los córners. Un campo sin ellos no es un campo. */
    const corner = (x: number, y: number, desde: number) => arco(x, y, 1, desde, desde + Math.PI / 2);

    return (
      <g>
        <defs>
          {/* El fondo se oscurece con la distancia. La dirección del degradado
              se saca de la propia cámara: dónde cae el centro de la línea de
              fondo lejana y dónde el de la cercana. */}
          <linearGradient
            id="p360-fondo"
            gradientUnits="userSpaceOnUse"
            x1={P(L / 2, 0).x}
            y1={P(L / 2, 0).y}
            x2={P(L / 2, W).x}
            y2={P(L / 2, W).y}
          >
            <stop offset="0%" stopColor={grassFar} stopOpacity={0.85} />
            <stop offset="55%" stopColor={grassFar} stopOpacity={0.18} />
            <stop offset="100%" stopColor={grassFar} stopOpacity={0} />
          </linearGradient>
        </defs>

        <polygon points={rect(0, 0, L, W)} fill={grass} />
        {franjas}
        {profundidad}

        <g fill="none" stroke={line} strokeWidth={s} strokeLinecap="butt">
          <polygon points={rect(s / 2, s / 2, L - s, W - s)} />

          {spec.half ? (
            <>
              {/* Medio campo: la divisoria queda al fondo y el círculo asoma. */}
              {linea(L, 0, L, W)}
              {arco(L, cy, spec.circleR, Math.PI / 2, (3 * Math.PI) / 2)}
            </>
          ) : (
            <>
              {linea(L / 2, 0, L / 2, W)}
              <polygon points={poli(circuloProyectado(proy, L / 2, cy, spec.circleR))} />
            </>
          )}

          {/* Áreas de la portería izquierda */}
          <polygon points={rect(0, cy - bw / 2, bl, bw)} />
          <polygon points={rect(0, cy - sw / 2, sl, sw)} />
          {arcoArea('izq')}

          {!spec.half && (
            <>
              <polygon points={rect(L - bl, cy - bw / 2, bl, bw)} />
              <polygon points={rect(L - sl, cy - sw / 2, sl, sw)} />
              {arcoArea('der')}
            </>
          )}

          {/* Córners */}
          {corner(0, 0, 0)}
          {corner(0, W, -Math.PI / 2)}
          {!spec.half && corner(L, 0, Math.PI / 2)}
          {!spec.half && corner(L, W, Math.PI)}
        </g>

        {/* Puntos de penalti y centro del campo */}
        <g fill={line} stroke="none">
          <polygon points={poli(circuloProyectado(proy, 11, cy, 0.3, 16))} />
          {!spec.half && <polygon points={poli(circuloProyectado(proy, L - 11, cy, 0.3, 16))} />}
          {!spec.half && <polygon points={poli(circuloProyectado(proy, L / 2, cy, 0.35, 16))} />}
        </g>

        {/* Porterías */}
        <Porteria proy={proy} x={0} cy={cy} ancho={spec.goalWidth} hacia={-1} paleta={paleta} />
        {!spec.half && (
          <Porteria proy={proy} x={L} cy={cy} ancho={spec.goalWidth} hacia={1} paleta={paleta} />
        )}
      </g>
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proy, spec, surface, L, W, bl, bw, sl, sw, cy, grass, grassFar, line, stripes]);
}

/* ───────────────────────────── La portería ───────────────────────────────── */

/**
 * Una portería de verdad: dos postes, un larguero y una red que se mete hacia
 * atrás y cae.
 *
 * `hacia` dice para qué lado queda el fondo: −1 en la portería izquierda, +1
 * en la derecha. Todo lo demás son las medidas reglamentarias.
 *
 * El orden de pintado importa. Primero la sombra en el suelo, luego la red
 * (que va detrás), luego el marco: así los postes tapan la red y no al revés,
 * que es lo que pasa de verdad.
 */
function Porteria({
  proy,
  x,
  cy,
  ancho,
  hacia,
  paleta,
}: {
  proy: Proyeccion;
  x: number;
  cy: number;
  ancho: number;
  hacia: -1 | 1;
  paleta: (typeof PALETA)[Surface];
}) {
  if (ancho <= 0) return null;

  const alto = altoPorteria(ancho);
  const fondo = fondoPorteria(ancho);
  /* La red no cae en vertical: tiene un techo corto y después baja en
     diagonal hasta el suelo. Es lo que le da la silueta reconocible. */
  const techo = fondo * 0.45;
  const y0 = cy - ancho / 2;
  const y1 = cy + ancho / 2;
  const xT = x + hacia * techo;
  const xF = x + hacia * fondo;

  const P = (px: number, py: number, pz: number) => proy.proyecta(px, py, pz);
  const grosor = ancho >= 7 ? 0.2 : 0.16;

  /* ── Red ────────────────────────────────────────────────────────────────
     Se pinta como tres paños —techo, fondo inclinado y los dos laterales— con
     un mallado por encima. Los paños van casi transparentes: una red tapa muy
     poco, y si se pinta sólida la portería parece un armario. */
  const panoTecho = [P(x, y0, alto), P(xT, y0, alto), P(xT, y1, alto), P(x, y1, alto)];
  const panoFondo = [P(xT, y0, alto), P(xF, y0, 0), P(xF, y1, 0), P(xT, y1, alto)];
  const lateral = (y: number) => [P(x, y, 0), P(x, y, alto), P(xT, y, alto), P(xF, y, 0)];

  /** Hilos de la red: a lo ancho y a lo largo del paño. */
  const hilos: Point[][] = [];
  const nAncho = Math.max(6, Math.round(ancho * 1.4));
  for (let i = 1; i < nAncho; i += 1) {
    const y = y0 + ((y1 - y0) * i) / nAncho;
    hilos.push([P(x, y, alto), P(xT, y, alto), P(xF, y, 0)]);
  }
  const nAlto = 4;
  for (let i = 1; i <= nAlto; i += 1) {
    const u = i / (nAlto + 1);
    /* Recorre el perfil: primero el techo, después la caída. */
    const [px, pz] =
      u < 0.4
        ? [x + hacia * techo * (u / 0.4), alto]
        : [xT + hacia * (fondo - techo) * ((u - 0.4) / 0.6), alto * (1 - (u - 0.4) / 0.6)];
    hilos.push([P(px, y0, pz), P(px, y1, pz)]);
  }

  return (
    <g>
      {/* Sombra en el césped: sin ella la portería flota. */}
      <polygon
        points={aPuntos([P(x, y0, 0), P(xF, y0, 0), P(xF, y1, 0), P(x, y1, 0)])}
        fill={paleta.sombra}
      />

      <g fill={paleta.red} fillOpacity={0.22} stroke="none">
        <polygon points={aPuntos(panoTecho)} />
        <polygon points={aPuntos(panoFondo)} />
        <polygon points={aPuntos(lateral(y0))} />
        <polygon points={aPuntos(lateral(y1))} />
      </g>

      <g fill="none" stroke={paleta.red} strokeWidth={0.05} strokeLinejoin="round">
        {hilos.map((h, i) => (
          <polyline key={i} points={aPuntos(h)} />
        ))}
      </g>

      {/* Marco: los dos postes y el larguero, por delante de la red. */}
      <g
        fill="none"
        stroke={paleta.poste}
        strokeWidth={grosor}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points={aPuntos([P(x, y0, 0), P(x, y0, alto), P(x, y1, alto), P(x, y1, 0)])} />
      </g>
    </g>
  );
}
