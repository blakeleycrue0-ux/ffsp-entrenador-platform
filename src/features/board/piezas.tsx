/**
 * Las piezas que se ponen sobre el campo.
 * ---------------------------------------------------------------------------
 * Antes todo esto eran siluetas planas: el cono, un triángulo; la portería, un
 * rectángulo blanco. A vista de pájaro casi colaba, pero en cuanto la cámara
 * se inclina un triángulo tumbado deja de parecer un cono y pasa a parecer un
 * error.
 *
 * CÓMO SE DIBUJA CADA PIEZA. No hace falta proyectar una por una: cerca de un
 * punto, la proyección se comporta de una manera muy simple y basta con tres
 * números que da la cámara.
 *
 *   · Lo que está TUMBADO en el césped se achata en vertical por `aplanado`
 *     (el coseno de la inclinación). Un círculo de un metro se ve como una
 *     elipse de un metro de ancho por `aplanado` de alto.
 *   · Lo que tiene ALTURA sube en pantalla `alzado` metros por cada metro de
 *     alto (el seno). A vista de pájaro es cero: nada sobresale, que es justo
 *     lo que pasa cuando miras un cono desde encima.
 *   · Lo que está alineado con el campo gira `vuelta` grados, el giro de la
 *     cámara.
 *
 * Con eso una ficha se dibuja una sola vez en coordenadas propias y se coloca
 * con un `translate` y un `scale`, así que la reproducción sigue costando lo
 * mismo que antes: mover un atributo por ficha y por fotograma.
 *
 * QUÉ ERROR TIENE. Tratar cada pieza como si toda ella estuviera a la misma
 * distancia que su centro. Para una ficha de dos metros no se nota. Para lo
 * más grande que se puede poner —una zona de 30 × 20 en un campo de fútbol 7,
 * con la cámara al máximo— el lado de atrás sale un 8 % más grande de lo que
 * debería: un paralelogramo donde tocaría un trapecio. Medido, aceptado y
 * escrito aquí para que nadie lo descubra por sorpresa. El campo y sus
 * porterías, que son lo grande de verdad, sí se proyectan punto a punto.
 */

import type { BoardObject, ObjectKind } from './scene';
import type { Proyeccion } from './camara';

/* ─────────────────────────────── Colores ─────────────────────────────────── */

export const FILL: Record<ObjectKind, string> = {
  jugadora: '#101C2D',
  rival: '#FFFFFF',
  portera: '#E2A33C',
  comodin: '#7FB2F0',
  balon: '#FFFFFF',
  cono: '#E2A33C',
  pica: '#E8695C',
  porteria: '#FFFFFF',
  miniporteria: '#FFFFFF',
  zona: '#3ECF8E',
  nota: 'transparent',
};

export const TEXT: Record<ObjectKind, string> = {
  jugadora: '#FFFFFF',
  rival: '#101C2D',
  portera: '#101C2D',
  comodin: '#101C2D',
  balon: '#101C2D',
  cono: '#101C2D',
  pica: '#101C2D',
  porteria: '#101C2D',
  miniporteria: '#101C2D',
  zona: '#101C2D',
  nota: '#FFFFFF',
};

const SOMBRA = 'rgba(8,16,12,0.34)';

/* ──────────────────────────────── Ayudas ─────────────────────────────────── */

/** Oscurece un color para el lado en sombra. No vale para `transparent`. */
function oscuro(hex: string, k = 0.62): string {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const r = Math.round(((n >> 16) & 255) * k);
  const g = Math.round(((n >> 8) & 255) * k);
  const b = Math.round((n & 255) * k);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

/**
 * La mancha en el césped. Sin ella, con la cámara inclinada, todo flota.
 *
 * Va floja a propósito. Una sombra marcada bajo una ficha levantada se lee
 * como un agujero negro alrededor —se vio en el balón— y encima compite con
 * la ficha, que es lo que hay que mirar.
 */
function Sombra({ rx, proy, opacidad = 1 }: { rx: number; proy: Proyeccion; opacidad?: number }) {
  if (proy.alzado < 0.05) return null;
  return (
    <ellipse
      rx={rx}
      ry={rx * proy.aplanado}
      fill={SOMBRA}
      opacity={opacidad * Math.min(0.55, proy.alzado * 0.7)}
    />
  );
}

/** Un punto del plano del césped, en coordenadas de la propia ficha. */
const enSuelo = (dx: number, dy: number, ang: number, proy: Proyeccion) => {
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  return { x: dx * c - dy * s, y: (dx * s + dy * c) * proy.aplanado };
};

const pts = (ps: { x: number; y: number }[]) =>
  ps.map((p) => `${p.x.toFixed(3)},${p.y.toFixed(3)}`).join(' ');

/* ──────────────────────────────── Fichas ─────────────────────────────────── */

export function ObjectShape({
  obj,
  selected,
  proy,
}: {
  obj: BoardObject;
  selected: boolean;
  proy: Proyeccion;
}) {
  const color = obj.color || FILL[obj.kind];
  const { aplanado: ap, alzado: al } = proy;
  /* El giro propio de la pieza más el de la cámara: una pica alineada con la
     banda tiene que seguir alineada con la banda se mire desde donde se mire. */
  const vuelta = (obj.rot ?? 0) + proy.vuelta;

  /* La marca de selección va pintada en el césped, no flotando delante: es un
     sitio del campo lo que está seleccionado. */
  const ring = selected ? (
    <ellipse
      rx={2.5}
      ry={2.5 * ap}
      fill="none"
      stroke="#FFFFFF"
      strokeWidth={0.3}
      strokeDasharray="0.8 0.6"
    />
  ) : null;

  /* ──────────────────────────────── Zona ──────────────────────────────── */
  if (obj.kind === 'zona') {
    const w = obj.w ?? 14;
    const h = obj.h ?? 10;
    return (
      <>
        {ring}
        <g transform={`scale(1 ${ap}) rotate(${vuelta})`}>
          {obj.shape === 'circulo' ? (
            <ellipse
              rx={w / 2}
              ry={h / 2}
              fill={color}
              fillOpacity={0.16}
              stroke={color}
              strokeWidth={0.28}
              strokeDasharray="1.2 0.8"
            />
          ) : (
            <rect
              x={-w / 2}
              y={-h / 2}
              width={w}
              height={h}
              fill={color}
              fillOpacity={0.16}
              stroke={color}
              strokeWidth={0.28}
              strokeDasharray="1.2 0.8"
            />
          )}
        </g>
        {/* El rótulo NO se achata: un texto aplastado no se lee. */}
        {obj.label && (
          <text textAnchor="middle" dominantBaseline="middle" fontSize={1.8} fill={color} fontWeight={600}>
            {obj.label}
          </text>
        )}
      </>
    );
  }

  /* ──────────────────────────────── Balón ─────────────────────────────── */
  if (obj.kind === 'balon') {
    const r = 0.95;
    return (
      <>
        {ring}
        <Sombra rx={r * 0.78} proy={proy} opacidad={0.75} />
        {/* Una esfera se ve redonda desde cualquier sitio: no se achata. */}
        <g transform={`translate(0 ${(-r * al).toFixed(3)})`}>
          <circle r={r} fill="#FFFFFF" stroke="#101C2D" strokeWidth={0.18} />
          {/* El pentágono central: lo justo para que se lea «balón» y no «círculo». */}
          <polygon
            points={pts(
              Array.from({ length: 5 }, (_, i) => {
                const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
                return { x: 0.36 * Math.cos(a), y: 0.36 * Math.sin(a) };
              }),
            )}
            fill="#101C2D"
            opacity={0.82}
          />
        </g>
      </>
    );
  }

  /* ──────────────────────────────── Cono ──────────────────────────────── */
  if (obj.kind === 'cono') {
    /* Un cono es MÁS ALTO QUE ANCHO. Con la base de antes, casi tan ancha
       como alta la silueta, salía un sombrero. La proporción manda. */
    const rb = 0.8; // radio de la base
    const h = 2.4; // alto
    const cima = -h * al;
    const sombraColor = oscuro(color);

    /* Visto desde arriba un cono es un círculo con otro dentro. No hace falta
       nada más, y cualquier otra cosa que se le pinte encima deja de parecer
       un cono y empieza a parecer un botón. */
    if (al <= 0.04) {
      return (
        <>
          {ring}
          <circle r={rb} fill={color} stroke={sombraColor} strokeWidth={0.08} />
          <circle r={rb * 0.42} fill={sombraColor} opacity={0.55} />
        </>
      );
    }

    return (
      <>
        {ring}
        <Sombra rx={rb} proy={proy} opacidad={0.8} />
        {/* El cuerpo: de un lado de la base a la cima y al otro lado, cerrando
            por la mitad de delante de la base.
            Nada de pestaña ancha ni de banda blanca. Con las dos, a este
            tamaño, la silueta dejaba de ser un cono y pasaba a ser un bulbo
            de ajo: lo que define un cono es el perfil, y el perfil hay que
            dejarlo limpio. */}
        <path
          d={`M ${-rb} 0 L 0 ${cima.toFixed(3)} L ${rb} 0 A ${rb} ${(rb * ap).toFixed(3)} 0 0 1 ${-rb} 0 Z`}
          fill={color}
          stroke={sombraColor}
          strokeWidth={0.07}
          strokeLinejoin="round"
        />
        {/* El lado de sombra, para que tenga volumen y no sea una pegatina. */}
        <path
          d={`M 0 ${cima.toFixed(3)} L ${rb} 0 A ${rb} ${(rb * ap).toFixed(3)} 0 0 1 0 ${(rb * ap).toFixed(3)} Z`}
          fill={sombraColor}
          opacity={0.45}
        />
      </>
    );
  }

  /* ──────────────────────────────── Pica ──────────────────────────────── */
  if (obj.kind === 'pica') {
    const largo = 3.6;
    const grueso = 0.34;
    return (
      <>
        {ring}
        {/* La pica está tumbada, así que su sombra es la pica, no un redondel:
            una mancha circular debajo se leía como un agujero en el césped. */}
        <g transform={`scale(1 ${ap}) rotate(${vuelta})`}>
          {al > 0.05 && (
            <rect
              x={-grueso / 2}
              y={-largo / 2}
              width={grueso}
              height={largo}
              rx={grueso / 2}
              fill={SOMBRA}
              opacity={0.5}
              transform={`translate(${(grueso * 0.5).toFixed(3)} 0)`}
            />
          )}
        </g>
        <g transform={`scale(1 ${ap}) rotate(${vuelta})`}>
          <rect
            x={-grueso / 2}
            y={-largo / 2}
            width={grueso}
            height={largo}
            rx={grueso / 2}
            fill={color}
          />
          {/* Las dos marcas de los extremos: se distingue de una línea pintada. */}
          <circle cy={-largo / 2} r={grueso * 0.62} fill={oscuro(color, 0.78)} />
          <circle cy={largo / 2} r={grueso * 0.62} fill={oscuro(color, 0.78)} />
        </g>
      </>
    );
  }

  /* ─────────────────────── Portería y miniportería ────────────────────── */
  if (obj.kind === 'porteria' || obj.kind === 'miniporteria') {
    const esGrande = obj.kind === 'porteria';
    const fondo = obj.w ?? (esGrande ? 1 : 0.7); // lo que se mete hacia atrás
    const boca = obj.h ?? (esGrande ? 5 : 2); // la anchura entre postes
    const alto = Math.min(esGrande ? 2.2 : 1.1, boca * 0.5);
    const ang = (vuelta * Math.PI) / 180;

    /* El marco mira hacia −x en coordenadas propias; el fondo, hacia +x. */
    const S = (dx: number, dy: number) => enSuelo(dx, dy, ang, proy);
    const sube = (p: { x: number; y: number }, z: number) => ({ x: p.x, y: p.y - z * al });

    const bocaIzq = S(-fondo / 2, -boca / 2);
    const bocaDer = S(-fondo / 2, boca / 2);
    const fondoIzq = S(fondo / 2, -boca / 2);
    const fondoDer = S(fondo / 2, boca / 2);

    const marcoIzq = sube(bocaIzq, alto);
    const marcoDer = sube(bocaDer, alto);
    const traseraIzq = sube(fondoIzq, alto * 0.45);
    const traseraDer = sube(fondoDer, alto * 0.45);

    /* Los hilos de la red. Sin ellos los paños translúcidos se leen como un
       cristal, no como una portería: lo que dice «red» es el mallado. */
    const hilos: { x: number; y: number }[][] = [];
    const n = Math.max(3, Math.round(boca * 1.6));
    for (let i = 1; i < n; i += 1) {
      const t = i / n;
      const mezcla = (a: { x: number; y: number }, b: { x: number; y: number }) => ({
        x: a.x + (b.x - a.x) * t,
        y: a.y + (b.y - a.y) * t,
      });
      hilos.push([mezcla(marcoIzq, marcoDer), mezcla(traseraIzq, traseraDer), mezcla(fondoIzq, fondoDer)]);
    }

    return (
      <>
        {ring}
        {/* Huella en el césped */}
        <polygon points={pts([bocaIzq, fondoIzq, fondoDer, bocaDer])} fill={SOMBRA} opacity={0.42} />
        {/* Red: el techo, la caída y los dos costados */}
        <g fill="rgba(255,255,255,0.20)" stroke="none">
          <polygon points={pts([marcoIzq, traseraIzq, traseraDer, marcoDer])} />
          <polygon points={pts([traseraIzq, fondoIzq, fondoDer, traseraDer])} />
          <polygon points={pts([bocaIzq, marcoIzq, traseraIzq, fondoIzq])} />
          <polygon points={pts([bocaDer, marcoDer, traseraDer, fondoDer])} />
        </g>
        <g fill="none" stroke="rgba(255,255,255,0.42)" strokeWidth={0.045} strokeLinejoin="round">
          {hilos.map((h, i) => (
            <polyline key={i} points={pts(h)} />
          ))}
          <polyline points={pts([traseraIzq, traseraDer])} />
          <polyline points={pts([fondoIzq, fondoDer])} />
        </g>
        {/* Marco: postes y larguero, por delante de la red */}
        <polyline
          points={pts([bocaIzq, marcoIzq, marcoDer, bocaDer])}
          fill="none"
          stroke="#EEF2F6"
          strokeWidth={esGrande ? 0.2 : 0.16}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </>
    );
  }

  /* ──────────────────────────────── Nota ──────────────────────────────── */
  if (obj.kind === 'nota') {
    return (
      <>
        {ring}
        <text
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={2.4}
          fill={color === 'transparent' ? '#FFFFFF' : color}
          fontWeight={600}
        >
          {obj.label}
        </text>
      </>
    );
  }

  /* ─────────────── Jugadoras, rivales, porteras y comodines ───────────── */
  /*
   * La ficha es un disco con el dorsal, y eso no se toca: es lo que hay que
   * poder leer de un vistazo. Lo que cambia con la cámara es que deja de estar
   * pintada en el suelo y pasa a estar DE PIE sobre él, con su huella y su
   * sombra. A vista de pájaro la huella queda justo debajo y no se ve, así que
   * la vista de siempre sigue siendo la de siempre.
   */
  const r = 1.75;
  const levanta = -1.15 * al;
  return (
    <>
      {ring}
      <Sombra rx={r * 0.82} proy={proy} />
      {al > 0.05 && (
        <>
          <ellipse rx={r * 0.82} ry={r * 0.82 * ap} fill="none" stroke={color} strokeWidth={0.12} opacity={0.5} />
          <line y1={0} y2={levanta} stroke={color} strokeWidth={0.26} opacity={0.75} />
        </>
      )}
      <g transform={levanta ? `translate(0 ${levanta.toFixed(3)})` : undefined}>
        <circle
          r={r}
          fill={color}
          stroke={obj.kind === 'rival' ? '#101C2D' : '#FFFFFF'}
          strokeWidth={0.22}
        />
        <text
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={1.9}
          fontWeight={600}
          fill={obj.color ? '#FFFFFF' : TEXT[obj.kind]}
          style={{ pointerEvents: 'none' }}
        >
          {obj.label}
        </text>
      </g>
    </>
  );
}
