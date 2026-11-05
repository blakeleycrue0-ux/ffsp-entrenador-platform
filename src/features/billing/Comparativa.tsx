/**
 * Qué trae cada plan. La misma comparativa que la portada, dentro.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * LO QUE HABÍA AQUÍ, Y POR QUÉ NO VALÍA. La pantalla de plan enseñaba tres
 * renglones: «Gratis · Un equipo», «Pro · Un equipo», «Max · Hasta 5 equipos».
 * Nada más. Ni el precio, ni para quién es cada uno, ni una sola de las nueve
 * herramientas que trae el plan de abajo. Quien ya estaba dentro —justo quien
 * va a pagar— veía MENOS información que quien pasaba por la página pública
 * sin registrarse.
 *
 * Y lo que veía, además, le daba la razón para no pagar: dos planes con el
 * mismo número de equipos y uno de los dos a 5,99 € al mes.
 *
 * ASÍ QUE AQUÍ ESTÁ LA MISMA COMPARATIVA QUE EN LA PORTADA: las tres columnas,
 * con su precio mensual y anual, el ahorro restado, para quién es cada una,
 * cuántos equipos caben y qué herramientas trae.
 *
 * ── DE DÓNDE SALE CADA COSA, QUE ES LA PARTE QUE IMPORTA ──────────────────
 *
 *   El precio, los equipos y los días de prueba  →  la tabla `plans`.
 *   Las herramientas                             →  el catálogo de capacidades.
 *
 * NI UNA SOLA LÍNEA ESCRITA A MANO. Ni aquí ni en la portada: las dos
 * pantallas le preguntan a las mismas dos fuentes. Por eso no pueden
 * contradecirse, que es exactamente lo que pasó la vez anterior —la pantalla
 * de planes prometía cinco equipos en Pro con un diccionario viejo mientras la
 * base de datos daba uno—. Y por si alguien vuelve a escribir un texto a mano
 * en cualquiera de las dos, `pruebas/planes-iguales.mjs` abre las dos y
 * compara línea por línea.
 *
 * LA COLUMNA DESTACADA SE SEPARA POR CONTRASTE, NO POR COLOR, y esto se
 * intentó cambiar y se volvió atrás, que es la parte que merece quedar
 * escrita.
 *
 * El intento: pintarla con el azul de la marca, ahora que el azul volvió a la
 * aplicación. Compila, se lee bien —el blanco al 80 % sobre `--marca-fondo`
 * da 4,9:1— y `contraste.mjs` lo aprobó.
 *
 * LO PARÓ `marca.mjs`, Y TENÍA RAZÓN. Dentro de la herramienta el azul está
 * reservado a tres sitios y significa UNA cosa: la acción principal y dónde
 * estás. `.metal-claro`, `[aria-current="page"]` y `.heroe`, y nada más. Una
 * columna entera de azul añade un segundo significado —«este plan es el que
 * te recomiendo»— y a partir de ahí el azul ya no dice dónde se pulsa: dice
 * dos cosas, o sea ninguna. Un sistema con dos reglas no tiene ninguna.
 *
 * Así que la jerarquía se dice con el fondo más contrastado que hay y el azul
 * se queda donde significa algo. Lo que sí hacía falta arreglar en esta
 * pantalla no era el color: eran cuatro planes metidos en una rejilla de tres.
 */

import { Check } from 'lucide-react';
import { importe, NIVELES, type Plan, type PlanTier } from '@/services/billing';
import { loQueFalta, todoLoQueTrae } from '@/services/entitlements';
import { limiteDeEquipos, PARA_QUIEN } from './SelectorDePlanes';
import { cn } from '@/lib/utils';

export function Comparativa({
  planes,
  nivelActual,
}: {
  planes: Plan[];
  /** El plan que rige ahora mismo: se marca, para no tener que adivinarlo. */
  nivelActual?: PlanTier;
}) {
  const ordenados = NIVELES.map((n) => planes.find((p) => p.tier === n)).filter((p): p is Plan => Boolean(p));
  if (ordenados.length === 0) {
    return (
      <p className="px-5 py-5 text-base leading-relaxed text-ink-500">
        No hemos podido cargar los planes.
      </p>
    );
  }

  /* Si hoy no se puede contratar nada, no hay diferencias que enseñar: lo
     tiene todo el mundo, y así se lista. Es la misma regla que aplica
     `puede()`, preguntada al mismo sitio. */
  const seVende = ordenados.some((p) => p.contratable);
  /* EL PLAN DE JUSTO DEBAJO, sacado del orden real y no escrito a mano.
     Esto decía `plan.tier === 'pro' ? 'Gratis' : 'Pro'`, de cuando había tres
     columnas. Al añadir la cuarta, la tarjeta de Club se quedó diciendo «Todo
     lo de Pro, y», saltándose Max: quien la leyera entendía que pagando 59 €
     no entraba lo de 29 €. Con el índice, la frase la decide el mismo orden
     que coloca las columnas, así que un quinto plan no vuelve a romperla. */
  const anteriorA = (t: PlanTier) => {
    const i = ordenados.findIndex((p) => p.tier === t);
    return i > 0 ? ordenados[i - 1].name : null;
  };

  return (
    /* CUATRO PLANES EN UNA REJILLA DE TRES. Esto decía `lg:grid-cols-3` de
       cuando había tres columnas; al entrar Club, la cuarta caía sola a una
       segunda fila, a lo ancho de la pantalla y sin línea que la separase, de
       modo que el plan más caro parecía una nota al pie. En pantallas medianas
       van de dos en dos, que es lo que cabe sin apretar el texto. */
    <div className="grid grid-cols-1 divide-y divide-line sm:grid-cols-2 sm:divide-x lg:grid-cols-4 lg:divide-y-0">
      {ordenados.map((plan) => {
        const destacado = plan.tier === 'pro';
        const gratis = plan.priceMonthly === 0;
        const mensual = importe(plan.priceMonthly, plan.currency);
        const anual = importe(plan.priceYearly, plan.currency);
        /* El ahorro no se escribe: se resta. Así no puede quedarse desfasado
           respecto a los dos importes que tiene justo al lado. */
        const ahorro =
          plan.priceMonthly !== null && plan.priceYearly !== null && plan.priceMonthly > 0
            ? importe(plan.priceMonthly * 12 - plan.priceYearly, plan.currency)
            : null;
        /* Gratis enseña todo lo suyo; los de arriba, sólo lo que AÑADEN.
           Repetir las nueve líneas en las tres columnas obliga a leerlas tres
           veces para descubrir que son las mismas. */
        const lista = plan.tier === 'free' ? todoLoQueTrae('free', seVende) : loQueFalta(plan.tier, seVende);
        const anterior = anteriorA(plan.tier);

        /* ── LOS COLORES DE LA COLUMNA, NOMBRADOS UNA VEZ ──────────────────
           Estaban repartidos por doce `destacado ? … : …` dentro del JSX, uno
           por cada texto. Nombrarlos aquí deja el JSX diciendo qué PAPEL tiene
           cada cosa —titular, segundo, cuerpo— en vez de repetir doce veces la
           misma condición, y cambiar la paleta de la columna vuelve a ser
           tocar cuatro líneas y no doce.

           Todo en la escala `ink`, que se da la vuelta con el tema: `ink-900`
           es el fondo más contrastado que hay y `ink-0` lo que se lee encima,
           en claro y en oscuro, sin una sola variante `dark:`. */
        const titular = destacado ? 'text-ink-0' : 'text-ink-900';
        const segundo = destacado ? 'text-ink-0/60' : 'text-ink-500';
        const cuerpo = destacado ? 'text-ink-0/85' : 'text-ink-700';
        const pastilla = destacado ? 'bg-ink-0/15 text-ink-0' : 'bg-ink-900 text-ink-0';

        return (
          <article
            key={plan.tier}
            className={cn('flex flex-col p-5', destacado && 'bg-ink-900')}
            data-plan={plan.tier}
          >
            <div className="flex flex-wrap items-center gap-2">
              <h3 className={cn('font-titulo text-base font-semibold', titular)}>
                {plan.name}
              </h3>
              {nivelActual === plan.tier && (
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-xs font-semibold', pastilla,
                  )}
                >
                  El tuyo
                </span>
              )}
            </div>

            <p className={cn('mt-2 min-h-[2.8em] text-sm leading-snug', segundo)}>
              {PARA_QUIEN[plan.tier]}
            </p>

            <p className="mt-4 flex items-baseline gap-1.5">
              <span className={cn('cifra text-4xl leading-none', titular)}>
                {mensual ?? 'Sin precio'}
              </span>
              {mensual && !gratis && (
                <span className={cn('text-sm font-medium', segundo)}>/mes</span>
              )}
            </p>

            <p className={cn('mt-1.5 min-h-[1.25rem] text-sm', segundo)}>
              {gratis
                ? 'Para siempre, sin tarjeta'
                : anual
                  ? `o ${anual} al año${ahorro ? ` — ahorras ${ahorro}` : ''}`
                  : 'Sin precio anual'}
            </p>

            <p className={cn('mt-5 font-titulo text-base font-semibold', titular)}>
              {limiteDeEquipos(plan)}
            </p>

            <p className={cn('mt-5 rotulo', segundo)}>
              {anterior ? `Todo lo de ${anterior}, y` : 'Incluye'}
            </p>

            {lista.length > 0 ? (
              <ul className="mt-3 flex-1 space-y-2">
                {lista.map((t) => (
                  <li
                    key={t}
                    className={cn('flex items-start gap-2 text-base leading-snug', cuerpo)}
                  >
                    <Check size={15} className={cn('mt-1 shrink-0', segundo)} />
                    <span className="min-w-0">{t}</span>
                  </li>
                ))}
              </ul>
            ) : (
              /* Si un plan de pago no añade NINGUNA función construida, lo que
                 lo distingue es cuántos equipos caben. Decirlo es mejor que
                 rellenar la columna con promesas. */
              <p className={cn('mt-3 flex-1 text-base leading-relaxed', segundo)}>
                Ninguna función nueva de momento: lo que cambia es cuántos equipos caben.
              </p>
            )}

            {/* Los días de prueba salen de la tabla, y sólo se enseñan cuando
                hay de verdad algo que contratar. */}
            {seVende && !gratis && plan.trialDays > 0 && (
              <p className={cn('mt-4 text-sm', segundo)}>
                {plan.trialDays} días de prueba antes del primer cobro
              </p>
            )}
          </article>
        );
      })}
    </div>
  );
}
