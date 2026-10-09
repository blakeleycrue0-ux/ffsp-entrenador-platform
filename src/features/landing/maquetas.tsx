/**
 * Las maquetas de producto de la portada.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * QUÉ SON. Trozos de interfaz dibujados a mano que se parecen a los de verdad:
 * el panel de inicio, la ficha de una jugadora, la asistencia y la pizarra.
 * Sirven para que alguien que llega entienda en dos segundos qué es esto, sin
 * tener que registrarse para verlo.
 *
 * POR QUÉ NO SON CAPTURAS. Una captura se queda vieja en cuanto se toca una
 * pantalla, pesa, y al escalarla en una composición flotante se ve borrosa —
 * que es justo lo que no puede pasar en lo primero que se ve—. Esto es texto y
 * rectángulos: pesa nada, es nítido a cualquier tamaño y en cualquier pantalla,
 * y se lee con un lector de pantalla.
 *
 * POR QUÉ SON OSCURAS SOBRE UN FONDO AZUL. Porque el producto es oscuro. Una
 * maqueta clara aquí estaría vendiendo una aplicación que no existe, y la
 * primera pantalla después de registrarse desmentiría la portada.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * LOS NÚMEROS SON DE UN EQUIPO DE EJEMPLO, Y SE DICE
 *
 * Nada de lo que sale aquí es de un club real, y nada pretende ser una métrica
 * del producto. No hay «4.900 clubes confían en nosotros» ni valoraciones ni
 * logotipos de nadie, porque no los hay. Lo que se enseña es la FORMA de la
 * herramienta —qué campos tiene una ficha, cómo se ve una semana de
 * entrenamientos— con datos inventados que se declaran como tales en el pie de
 * la composición.
 */

import { BoardDemo } from '@/features/board/BoardDemo';

/* ─────────────────────────── Piezas compartidas ──────────────────────────── */

/**
 * El marco de una maqueta.
 *
 * TODO LO DE DENTRO VA EN `em`, NO EN PÍXELES. La misma tarjeta mide 348 px
 * en un escritorio ancho y 216 en un iPad; con los tamaños clavados, los
 * rótulos de las cajas pequeñas se salían y se pisaban. `.maqueta-escala`
 * mide la tarjeta y `.maqueta-base` fija la letra en proporción, de modo que
 * a cualquier ancho se ve lo mismo encogido —que es lo que hace que parezca
 * una captura— y la relación entre un rótulo y su caja nunca cambia.
 *
 * Las equivalencias son 14 px = 1em: 13 px → 0,929em, 9 px → 0,643em…
 */
function Marco({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`maqueta maqueta-escala overflow-hidden rounded-2xl ${className}`}>
      <div className="maqueta-base">{children}</div>
    </div>
  );
}

/** La barra de título de una ventana, con sus tres puntos. */
function Barra({ titulo }: { titulo: string }) {
  return (
    <div className="flex items-center gap-[0.571em] border-b border-white/10 px-[1em] py-[0.714em]">
      <span className="flex gap-[0.429em]" aria-hidden>
        <i className="block h-[0.571em] w-[0.571em] rounded-full bg-white/18" />
        <i className="block h-[0.571em] w-[0.571em] rounded-full bg-white/18" />
        <i className="block h-[0.571em] w-[0.571em] rounded-full bg-white/18" />
      </span>
      <span className="ml-[0.286em] truncate text-[0.786em] font-medium tracking-[0.02em] text-white/45">
        {titulo}
      </span>
    </div>
  );
}

function Rotulo({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[0.679em] font-semibold uppercase tracking-[0.14em] text-white/35">
      {children}
    </p>
  );
}

/**
 * Una barra de progreso. `valor` va de 0 a 1.
 *
 * El relleno es azul SÓLO aquí dentro, no en el producto: en la portada estas
 * maquetas compiten con un fondo de color y en gris puro desaparecerían.
 */
function Barrita({ valor, tono = 'claro' }: { valor: number; tono?: 'claro' | 'azul' }) {
  return (
    <span className="block h-[0.429em] w-full overflow-hidden rounded-full bg-white/10">
      <span
        className={`block h-full rounded-full ${tono === 'azul' ? 'bg-marca-500' : 'bg-white/55'}`}
        style={{ width: `${Math.round(valor * 100)}%` }}
      />
    </span>
  );
}

/* ═══════════════════════════ 1 · Panel del equipo ════════════════════════ */

/** Lo que de verdad hay en el panel de inicio: lo próximo y lo que falta. */
export function MaquetaPanel({ className = '' }: { className?: string }) {
  return (
    <Marco className={className}>
      <Barra titulo="Cadete A · Inicio" />
      <div className="space-y-[0.857em] p-[1em]">
        <div className="rounded-[0.857em] border border-white/10 bg-white/[0.04] p-[0.857em]">
          <div className="flex items-start justify-between gap-[0.857em]">
            <div className="min-w-0">
              <Rotulo>Próximo partido</Rotulo>
              <p className="mt-[0.429em] truncate text-[0.929em] font-semibold text-white">
                CE Andratx
              </p>
              <p className="mt-[0.143em] text-[0.786em] text-white/45">Sábado · 11:00 · Casa</p>
            </div>
            <span className="shrink-0 rounded-[0.429em] bg-marca-500/18 px-[0.429em] py-[0.143em] text-[0.679em] font-semibold text-marca-300">
              EN 2 DÍAS
            </span>
          </div>
        </div>

        <div className="rounded-[0.857em] border border-white/10 bg-white/[0.04] p-[0.857em]">
          <Rotulo>Último entrenamiento</Rotulo>
          <p className="mt-[0.429em] truncate text-[0.929em] font-semibold text-white">
            Presión tras pérdida
          </p>
          <div className="mt-[0.714em] flex items-center gap-[0.571em]">
            <Barrita valor={0.875} tono="azul" />
            <span className="shrink-0 text-[0.786em] font-medium tabular-nums text-white/70">
              14/16
            </span>
          </div>
          <p className="mt-[0.429em] text-[0.75em] text-white/40">Asistieron 14 de 16 convocadas</p>
        </div>

        <div className="grid grid-cols-3 gap-[0.571em]">
          {[
            ['Disponibles', '13', 'bg-white/70'],
            ['Duda', '2', 'bg-white/35'],
            ['Lesionadas', '1', 'bg-white/20'],
          ].map(([rotulo, n, punto]) => (
            <div
              key={rotulo}
              className="min-w-0 rounded-[0.571em] border border-white/10 bg-white/[0.03] p-[0.571em]"
            >
              <span className="flex items-center gap-[0.429em]">
                <i className={`block h-[0.429em] w-[0.429em] shrink-0 rounded-full ${punto}`} aria-hidden />
                <span className="min-w-0 truncate text-[0.643em] font-medium uppercase tracking-[0.08em] text-white/40">
                  {rotulo}
                </span>
              </span>
              <p className="mt-[0.286em] text-[1.214em] font-semibold leading-none tabular-nums text-white">
                {n}
              </p>
            </div>
          ))}
        </div>
      </div>
    </Marco>
  );
}

/* ═════════════════════════ 2 · Ficha de jugadora ═════════════════════════ */

export function MaquetaJugadora({ className = '' }: { className?: string }) {
  const sesiones = [0.8, 0.6, 0.75, 0.9, 0.7, 0.95, 0.85];
  return (
    <Marco className={className}>
      <Barra titulo="Plantilla · Ficha" />
      <div className="space-y-[0.857em] p-[1em]">
        <div className="flex items-center gap-[0.714em]">
          <span
            className="grid h-[2.571em] w-[2.571em] shrink-0 place-items-center rounded-full bg-white/10 text-[0.857em] font-semibold text-white"
            aria-hidden
          >
            10
          </span>
          <div className="min-w-0">
            <p className="truncate text-[0.929em] font-semibold leading-tight text-white">
              Laia Munar
            </p>
            <p className="truncate text-[0.75em] text-white/45">Mediapunta · Cadete A</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-[0.571em]">
          {[['Asistencia', '92 %'], ['Minutos', '380']].map(([k, v]) => (
            <div
              key={k}
              className="min-w-0 rounded-[0.571em] border border-white/10 bg-white/[0.03] px-[0.714em] py-[0.571em]"
            >
              <p className="truncate text-[0.643em] font-medium uppercase tracking-[0.08em] text-white/40">
                {k}
              </p>
              <p className="mt-[0.143em] text-[1.071em] font-semibold leading-none tabular-nums text-white">
                {v}
              </p>
            </div>
          ))}
        </div>

        <div>
          <Rotulo>Valoración por sesión</Rotulo>
          {/* Un gráfico de barras de verdad, dibujado con cajas: ni librería
              ni imagen. Siete sesiones, que es lo que cabe sin apretarlo. */}
          <div className="mt-[0.571em] flex h-[3.429em] items-end gap-[0.429em]" aria-hidden>
            {sesiones.map((v, i) => (
              <span
                key={i}
                className="flex-1 rounded-[0.143em] bg-gradient-to-t from-marca-600 to-cielo"
                style={{ height: `${Math.round(v * 100)}%` }}
              />
            ))}
          </div>
          <p className="mt-[0.429em] text-[0.714em] text-white/40">Últimas siete sesiones</p>
        </div>
      </div>
    </Marco>
  );
}

/* ══════════════════════════ 3 · Asistencia ═══════════════════════════════ */

export function MaquetaAsistencia({ className = '' }: { className?: string }) {
  const filas = [
    ['Ainhoa Ribas', 'presente'],
    ['Lucía Ferrer', 'presente'],
    ['Marta Colom', 'justificada'],
    ['Nerea Vidal', 'ausente'],
  ] as const;
  const punto = { presente: 'bg-white/80', justificada: 'bg-white/40', ausente: 'bg-white/15' };

  return (
    <Marco className={className}>
      <Barra titulo="Asistencia · Martes" />
      <div className="space-y-[0.857em] p-[1em]">
        <div className="flex items-end justify-between gap-[0.857em]">
          <div className="min-w-0">
            <Rotulo>Del equipo, este mes</Rotulo>
            <p className="mt-[0.286em] text-[1.857em] font-semibold leading-none tabular-nums text-white">
              87 %
            </p>
          </div>
          {/* Cuatro semanas, en columnas. */}
          <div className="flex h-[2.571em] shrink-0 items-end gap-[0.286em]" aria-hidden>
            {[0.7, 0.85, 0.8, 0.95].map((v, i) => (
              <span
                key={i}
                className="w-[0.571em] rounded-[0.143em] bg-white/35"
                style={{ height: `${Math.round(v * 100)}%` }}
              />
            ))}
          </div>
        </div>

        <ul className="space-y-[0.429em]">
          {filas.map(([nombre, estado]) => (
            <li
              key={nombre}
              className="flex items-center gap-[0.571em] rounded-[0.571em] border border-white/10 bg-white/[0.03] px-[0.714em] py-[0.429em]"
            >
              <i
                className={`block h-[0.429em] w-[0.429em] shrink-0 rounded-full ${punto[estado]}`}
                aria-hidden
              />
              <span className="min-w-0 flex-1 truncate text-[0.821em] text-white/85">{nombre}</span>
              <span className="shrink-0 text-[0.679em] uppercase tracking-[0.08em] text-white/35">
                {estado}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </Marco>
  );
}

/* ═══════════════════════════ 4 · Pizarra ═════════════════════════════════ */

/**
 * La pizarra NO es una maqueta: es el componente de verdad.
 *
 * `BoardDemo` es el mismo motor que hay dentro de la aplicación, con la misma
 * cámara y las mismas piezas. Aquí no hace falta fingir nada, y además lo que
 * se ve se mueve: es la mejor demostración que tiene este producto.
 */
export function MaquetaPizarra({ className = '' }: { className?: string }) {
  return (
    <Marco className={className}>
      <Barra titulo="Pizarra táctica · Salida desde atrás" />
      {/* `text-base` devuelve el tamaño normal: dentro va el componente de
          verdad, que no debe encoger con la escala de las maquetas. */}
      <div className="p-[0.571em] text-base">
        <BoardDemo />
      </div>
    </Marco>
  );
}

/* ═══════════════════════ 5 · Analíticas, en fila ═════════════════════════ */

/**
 * La tira de cifras del panel de analíticas, pensada para una tarjeta ANCHA.
 *
 * Hace falta porque una caja de dos columnas con tres líneas de texto dentro
 * se queda medio vacía, y un hueco así en mitad de una rejilla no se lee como
 * aire: se lee como que falta algo.
 *
 * Cada cifra lleva debajo DE DÓNDE SALE, igual que en el producto. Es la
 * diferencia entre una estadística y un número bonito, y es justo lo que esta
 * tarjeta está contando.
 */
export function MaquetaCifras({ className = '' }: { className?: string }) {
  const cifras: [string, string, string][] = [
    ['Asistencia media', '90 %', '3 sesiones registradas'],
    ['En plantilla', '16', '1 no disponible hoy'],
    ['Mejor asistencia', '100 %', 'Lucía Ferrer'],
  ];
  return (
    <Marco className={className}>
      <Barra titulo="Analíticas · Cadete A" />
      <div className="p-[1em]">
        <div className="grid gap-[0.571em] sm:grid-cols-3">
          {cifras.map(([k, v, pie]) => (
            <div key={k} className="min-w-0 rounded-[0.857em] border border-white/10 bg-white/[0.03] p-[0.857em]">
              <p className="text-[0.643em] font-semibold uppercase tracking-[0.1em] text-white/35">{k}</p>
              <p className="mt-[0.286em] text-[1.571em] font-semibold leading-none tabular-nums text-white">{v}</p>
              <p className="mt-[0.429em] text-[0.714em] text-white/40">{pie}</p>
            </div>
          ))}
        </div>

        <div className="mt-[0.714em] rounded-[0.857em] border border-white/10 bg-white/[0.03] p-[0.857em]">
          <Rotulo>Evolución de la asistencia</Rotulo>
          {/* Una línea de verdad, en SVG: tres sesiones con lista pasada. */}
          <svg viewBox="0 0 220 44" className="mt-[0.571em] block w-full" aria-hidden>
            <polyline
              points="8,12 76,16 144,22 212,14"
              fill="none"
              stroke="#36C8FF"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {[[8, 12], [76, 16], [144, 22], [212, 14]].map(([x, y]) => (
              <circle key={x} cx={x} cy={y} r="2.6" fill="#0B0E14" stroke="#36C8FF" strokeWidth="1.6" />
            ))}
          </svg>
          <p className="mt-[0.286em] text-[0.714em] text-white/40">
            Cada punto es una sesión con lista pasada
          </p>
        </div>
      </div>
    </Marco>
  );
}
