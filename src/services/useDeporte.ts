/**
 * EL DEPORTE DEL CLUB, ALLÍ DONDE HAGA FALTA.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Quién juega, cómo se llama lo que juegan y qué puestos hay salía escrito a
 * mano, en fútbol, repartido por media aplicación: diez posiciones en
 * `types`, su agrupación por colores en `StatusBits`, otra copia de la
 * agrupación en los filtros de la plantilla. Tres listas que había que
 * cambiar a la vez y que, cuando no se cambiaron a la vez, dejaron a los
 * porteros de dos clubes reales sin etiqueta y sin poder editar su puesto.
 *
 * Aquí se pregunta una vez y lo contesta la tabla `sports`.
 *
 * ── POR QUÉ UN ESTADO Y NO UNA LECTURA DIRECTA ─────────────────────────────
 *
 * El catálogo es una consulta, así que el primer pintado llega antes que la
 * respuesta. Durante ese rato se devuelve el deporte de reserva, que no tiene
 * posiciones: la ficha enseña el desplegable vacío un instante y luego se
 * llena. La alternativa —enseñar fútbol mientras carga— pondría puestos de
 * fútbol delante de un club de natación durante medio segundo, y eso es
 * peor que un hueco.
 *
 * ── Y NO HAY RESERVA DE FÚTBOL ─────────────────────────────────────────────
 *
 * Si la consulta falla del todo, se queda el deporte de reserva: sin
 * posiciones, con palabras genéricas. Escribir aquí una lista de fútbol «por
 * si acaso» sería volver a tener dos verdades, que es de lo que veníamos.
 */

import { useEffect, useState } from 'react';
import { useClub } from '@/store/store';
import { deportes, deporteDe, DEPORTE_DE_RESERVA, type Deporte } from './deportes';

/* El catálogo es el mismo para toda la aplicación y no cambia mientras dura
   la pestaña, así que se guarda fuera del componente: con esto, cambiar de
   pantalla no vuelve a pedirlo ni vuelve a parpadear. */
let catalogo: Deporte[] | null = null;
let enCurso: Promise<Deporte[]> | null = null;
const avisar = new Set<() => void>();

function pide() {
  if (catalogo) return;
  enCurso ??= deportes().then((d) => {
    catalogo = d;
    avisar.forEach((f) => f());
    return d;
  });
}

/** El deporte del club de quien ha entrado. */
export function useDeporte(): Deporte {
  const { data } = useClub();
  const [, repinta] = useState(0);

  useEffect(() => {
    if (catalogo) return undefined;
    const f = () => repinta((n) => n + 1);
    avisar.add(f);
    pide();
    return () => { avisar.delete(f); };
  }, []);

  if (!catalogo) return DEPORTE_DE_RESERVA;
  return deporteDe(catalogo, data?.club?.sport);
}
