/**
 * Dibujo del campo. Líneas blancas sobre verde apagado: se lee bien y no
 * compite con las jugadoras, que son lo que hay que seguir.
 */

import type { PitchSpec } from './scene';

const GRASS = '#20573C';
const LINE = 'rgba(255,255,255,0.72)';

export function Pitch({ spec }: { spec: PitchSpec }) {
  const { length: L, width: W, boxLength: bl, boxWidth: bw, smallBoxLength: sl, smallBoxWidth: sw } = spec;
  const cy = W / 2;
  const s = 0.22; // grosor de línea en metros

  return (
    <g>
      <rect x={0} y={0} width={L} height={W} fill={GRASS} />

      {/* Franjas de siega: sólo textura, sin brillo */}
      {Array.from({ length: 8 }, (_, i) => (
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

      <g fill="none" stroke={LINE} strokeWidth={s}>
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
            <circle cx={L / 2} cy={cy} r={0.35} fill={LINE} stroke="none" />
          </>
        )}

        {/* Área grande y pequeña de la portería izquierda */}
        <rect x={0} y={cy - bw / 2} width={bl} height={bw} />
        <rect x={0} y={cy - sw / 2} width={sl} height={sw} />
        <circle cx={11} cy={cy} r={0.3} fill={LINE} stroke="none" />

        {/* Portería derecha, sólo en campo completo */}
        {!spec.half && (
          <>
            <rect x={L - bl} y={cy - bw / 2} width={bl} height={bw} />
            <rect x={L - sl} y={cy - sw / 2} width={sl} height={sw} />
            <circle cx={L - 11} cy={cy} r={0.3} fill={LINE} stroke="none" />
          </>
        )}

      </g>

      {/* Porterías: quedan fuera del verde, así que se dibujan en oscuro */}
      <g fill="none" stroke="#47556B" strokeWidth={s}>
        <rect x={-1.6} y={cy - spec.goalWidth / 2} width={1.6} height={spec.goalWidth} />
        {!spec.half && <rect x={L} y={cy - spec.goalWidth / 2} width={1.6} height={spec.goalWidth} />}
      </g>
    </g>
  );
}
