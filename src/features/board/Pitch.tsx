/**
 * Dibujo del campo. Líneas blancas sobre verde apagado: se lee bien y no
 * compite con las jugadoras, que son lo que hay que seguir.
 *
 * La superficie «impresión» es la misma geometría en blanco y negro: para
 * llevarse el ejercicio en papel sin gastar media impresora en verde.
 */

import type { PitchSpec, Surface } from './scene';

const PALETA: Record<Surface, { grass: string; line: string; goal: string; stripes: boolean }> = {
  cesped: { grass: '#20573C', line: 'rgba(255,255,255,0.72)', goal: '#47556B', stripes: true },
  impresion: { grass: '#FFFFFF', line: 'rgba(16,28,45,0.55)', goal: '#647184', stripes: false },
};

export function Pitch({ spec, surface = 'cesped' }: { spec: PitchSpec; surface?: Surface }) {
  const { length: L, width: W, boxLength: bl, boxWidth: bw, smallBoxLength: sl, smallBoxWidth: sw } = spec;
  const cy = W / 2;
  const s = 0.22; // grosor de línea en metros
  const { grass, line, goal, stripes } = PALETA[surface];

  /* Superficie libre: un rectángulo y nada más. Para ejercicios que no son de
     campo, donde las áreas y el círculo central sólo estorban. */
  if (spec.blank) {
    return (
      <g>
        <rect x={0} y={0} width={L} height={W} fill={grass} />
        <rect
          x={s / 2}
          y={s / 2}
          width={L - s}
          height={W - s}
          fill="none"
          stroke={line}
          strokeWidth={s}
        />
      </g>
    );
  }

  return (
    <g>
      <rect x={0} y={0} width={L} height={W} fill={grass} />

      {/* Franjas de siega: sólo textura, sin brillo */}
      {stripes &&
        Array.from({ length: 8 }, (_, i) => (
          <rect
            key={i}
            x={(L / 8) * i}
            y={0}
            width={L / 8}
            height={W}
            fill="#FFFFFF"
            opacity={i % 2 === 0 ? 0.028 : 0}
          />
        ))}

      <g fill="none" stroke={line} strokeWidth={s}>
        <rect x={s / 2} y={s / 2} width={L - s} height={W - s} />

        {spec.half ? (
          <>
            {/* Medio campo: la línea divisoria queda al fondo */}
            <line x1={L} y1={0} x2={L} y2={W} />
            <path d={`M ${L - spec.circleR} ${cy - 0} A ${spec.circleR} ${spec.circleR} 0 0 0 ${L - spec.circleR} ${cy}`} />
            <circle cx={L} cy={cy} r={spec.circleR} />
          </>
        ) : (
          <>
            <line x1={L / 2} y1={0} x2={L / 2} y2={W} />
            <circle cx={L / 2} cy={cy} r={spec.circleR} />
            <circle cx={L / 2} cy={cy} r={0.35} fill={line} stroke="none" />
          </>
        )}

        {/* Área grande y pequeña de la portería izquierda */}
        <rect x={0} y={cy - bw / 2} width={bl} height={bw} />
        <rect x={0} y={cy - sw / 2} width={sl} height={sw} />
        <circle cx={11} cy={cy} r={0.3} fill={line} stroke="none" />

        {/* Portería derecha, sólo en campo completo */}
        {!spec.half && (
          <>
            <rect x={L - bl} y={cy - bw / 2} width={bl} height={bw} />
            <rect x={L - sl} y={cy - sw / 2} width={sl} height={sw} />
            <circle cx={L - 11} cy={cy} r={0.3} fill={line} stroke="none" />
          </>
        )}
      </g>

      {/* Porterías: quedan fuera del verde, así que se dibujan en oscuro */}
      <g fill="none" stroke={goal} strokeWidth={s}>
        <rect x={-1.6} y={cy - spec.goalWidth / 2} width={1.6} height={spec.goalWidth} />
        {!spec.half && <rect x={L} y={cy - spec.goalWidth / 2} width={1.6} height={spec.goalWidth} />}
      </g>
    </g>
  );
}
