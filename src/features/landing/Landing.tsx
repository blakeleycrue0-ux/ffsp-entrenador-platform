/**
 * Página pública.
 * ---------------------------------------------------------------------------
 * Enseña el producto funcionando: la pizarra de la portada es la de verdad,
 * interactiva, y las capturas son pantallas reales de la aplicación con un
 * club de ejemplo.
 *
 * Lo que NO hay, y no es un descuido: cifras de uso, escudos de clubes,
 * premios, testimonios y precios. Nada de eso está verificado ni decidido, y
 * ponerlo sería mentir en la primera pantalla que ve alguien.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, ArrowUpRight, Check, Minus, Plus, Shield, Smartphone, Zap,
} from 'lucide-react';
import { Aro, Wordmark } from '@/components/ui/Brand';
import { BoardDemo } from '@/features/board/BoardDemo';
import { cn } from '@/lib/utils';

/* ───────────────────────────── Texturas de fondo ──────────────────────────── */

/** Grano finísimo. Quita el aspecto de plano de color y no pesa nada. */
const GRANO =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)'/%3E%3C/svg%3E\")";

/** Líneas de campo, muy tenues. No compiten con el texto. */
const RETICULA =
  'repeating-linear-gradient(90deg, #fff 0 1px, transparent 1px 96px),' +
  'repeating-linear-gradient(0deg, #fff 0 1px, transparent 1px 96px)';

/* ──────────────────────────── Aparición al bajar ──────────────────────────── */

/**
 * Aparece cuando entra en pantalla, y una sola vez. Si el sistema pide menos
 * movimiento, no hay animación: se muestra y punto.
 */
function Revelar({
  children, delay = 0, className,
}: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      (entradas) => {
        if (entradas[0]?.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: '0px 0px -10% 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={cn(
        'transition-[opacity,transform] duration-700 ease-out motion-reduce:transition-none',
        visible ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0',
        className,
      )}
      style={{ transitionDelay: visible ? `${delay}ms` : '0ms' }}
    >
      {children}
    </div>
  );
}

/* ─────────────────────────────── Piezas ──────────────────────────────────── */

/** Marco de navegador. Hace que una captura se lea como producto. */
function Ventana({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border border-white/10 bg-night shadow-[0_30px_80px_-30px_rgba(8,17,28,0.65)]',
        className,
      )}
    >
      <div className="flex items-center gap-2 border-b border-white/10 bg-white/[0.04] px-3.5 py-2.5">
        <span className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
        </span>
        <span className="mx-auto hidden rounded-full bg-white/[0.06] px-3 py-0.5 text-[11px] text-white/35 sm:block">
          playoff360
        </span>
      </div>
      {children}
    </div>
  );
}

/** Marco de teléfono para las capturas verticales. */
function Telefono({ src, alt, className }: { src: string; alt: string; className?: string }) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-[2.1rem] border-[7px] border-ink-900 bg-ink-900',
        'shadow-[0_28px_60px_-24px_rgba(16,28,45,0.5)]',
        className,
      )}
    >
      <img src={src} alt={alt} loading="lazy" decoding="async" className="block w-full" />
    </div>
  );
}

/* ──────────────────────────────── Contenido ───────────────────────────────── */

const CAPACIDADES = [
  {
    clave: 'pizarra',
    titulo: 'Pizarra táctica animada',
    texto:
      'Coloca a las jugadoras, muévelas en distintos instantes y dale a reproducir: las posiciones se calculan en cada fotograma a partir del reloj, así que el movimiento es continuo y al pausar no salta. Línea de tiempo, velocidad, bucle y exportación a imagen.',
    imagen: '/producto/pizarra.png',
    detalles: ['Campo completo o medio', 'Carrera, conducción, pase y desmarque', 'Deshacer y rehacer'],
  },
  {
    clave: 'plantilla',
    titulo: 'La plantilla, al día',
    texto:
      'Ficha de cada jugadora con su dorsal, su posición y su historial. La disponibilidad se lleva aparte, con sus fechas y sus limitaciones, y la importación desde CSV detecta duplicados antes de escribir nada.',
    imagen: '/producto/plantilla.png',
    detalles: ['Importar desde CSV con vista previa', 'Disponibilidad con fechas', 'Nada se guarda sin confirmar'],
  },
  {
    clave: 'entrenamientos',
    titulo: 'La semana, montada',
    texto:
      'Cada sesión se monta por bloques, con su duración, su material y su objetivo, tirando de la biblioteca de ejercicios. Pasar lista son dos toques en el campo: todas presentes y corriges las excepciones.',
    imagen: '/producto/entrenamientos.png',
    detalles: ['Biblioteca de ejercicios reutilizable', 'Seis estados de asistencia', '«Sin registrar» no es una ausencia'],
  },
  {
    clave: 'calendario',
    titulo: 'Todo en un calendario',
    texto:
      'Entrenamientos, partidos y convocatorias en una sola vista, para ver los choques antes de que ocurran. La convocatoria se prepara aquí y se copia para compartirla por donde ya habléis con el equipo.',
    imagen: '/producto/calendario.png',
    detalles: ['Exporta a tu calendario', 'Convocatoria lista para copiar', 'Por equipo, no revuelto'],
  },
  {
    clave: 'analiticas',
    titulo: 'Analíticas que no se inventan nada',
    texto:
      'La asistencia se calcula sólo sobre las sesiones con lista pasada en las que la jugadora podía estar. Una falta justificada, una lesión o una sesión sin registrar no cuentan como un cero: se escribe «sin datos» y se explica por qué.',
    imagen: '/producto/analiticas.png',
    detalles: ['Cada cifra explica su cálculo', 'Sin ceros inventados', 'Sin predicciones de rendimiento'],
  },
] as const;

const PILARES = [
  {
    icono: Shield,
    titulo: 'Cada club, aislado',
    texto:
      'El aislamiento lo imponen las políticas de la base de datos, no la interfaz. Esconder un botón no autoriza nada.',
  },
  {
    icono: Smartphone,
    titulo: 'En el campo, desde el móvil',
    texto:
      'Todo el trabajo cabe en el bolsillo y no hay que instalar ninguna aplicación. Se abre y ya está.',
  },
  {
    icono: Zap,
    titulo: 'Empieza vacía',
    texto:
      'Sin datos de mentira que luego hay que borrar. Se llena con el trabajo real de tu club desde el primer día.',
  },
];

const PASOS = [
  ['Crea tu cuenta y tu club', 'Quien lo crea queda como su administración. Un minuto.'],
  ['Monta los equipos y la plantilla', 'A mano o importando un CSV, con vista previa antes de escribir.'],
  ['Invita al cuerpo técnico', 'Un enlace ligado a un correo que caduca a los catorce días.'],
];

const NO_HACE = [
  'No envía mensajes ni correos a las familias.',
  'No genera diagnósticos ni recomendaciones médicas.',
  'No calcula métricas físicas ni rendimiento predictivo.',
  'No convierte en ceros los datos que faltan.',
  'No exporta la animación en vídeo, todavía.',
  'No tiene planes de pago: no están decididos.',
];

const FAQ: [string, string][] = [
  [
    '¿Puede otro club ver lo nuestro?',
    'No. Cada club está aislado del resto, y el aislamiento lo imponen las políticas de acceso de la base de datos: no depende de que la aplicación se comporte bien. Dentro del club, cada persona ve sólo los equipos que tiene asignados.',
  ],
  [
    '¿Cómo empiezo con mi club?',
    'Creas tu cuenta, creas tu club y quedas como su administración. Desde ahí montas los equipos e invitas al resto del cuerpo técnico con un enlace que caduca a los catorce días.',
  ],
  [
    '¿Envía las convocatorias a las familias?',
    'No. Prepara la lista y la copias para compartirla por donde ya habléis con el equipo. No prometemos un envío que no hacemos.',
  ],
  [
    '¿Se puede exportar la animación en vídeo?',
    'Todavía no. Se exporta una imagen del instante que elijas. Grabar vídeo desde el navegador no funciona igual en todos los equipos y preferimos no ofrecerlo hasta que sea fiable.',
  ],
  [
    '¿Valora lesiones o predice el rendimiento?',
    'No. Guarda lo que anota el cuerpo técnico, con sus fechas y sus limitaciones. No emite diagnósticos ni estimaciones: eso es competencia del personal sanitario del club.',
  ],
  [
    '¿Cuánto cuesta?',
    'No hay planes de pago decididos ni pasarela de cobro, así que ahora mismo no cuesta nada y tampoco se puede pagar. Cuando haya una decisión se dirá aquí, no en la letra pequeña.',
  ],
];

/* ─────────────────────────────── Página ──────────────────────────────────── */

export default function Landing() {
  const [abierta, setAbierta] = useState<number | null>(0);
  const [activa, setActiva] = useState(0);
  const [conBorde, setConBorde] = useState(false);

  useEffect(() => {
    const alScroll = () => setConBorde(window.scrollY > 8);
    alScroll();
    window.addEventListener('scroll', alScroll, { passive: true });
    return () => window.removeEventListener('scroll', alScroll);
  }, []);

  const irA = useCallback((id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const cap = CAPACIDADES[activa]!;

  return (
    <div className="bg-panel">
      {/* ── Navegación ─────────────────────────────────────────────────── */}
      {/* Arriba del todo va transparente sobre la portada; al bajar se cierra
          con un cristal oscuro para que el texto no se pise con el contenido. */}
      <header
        className={cn(
          'sticky top-0 z-40 transition-colors duration-200',
          conBorde ? 'border-b border-white/10 bg-night/85 backdrop-blur-xl' : 'bg-transparent',
        )}
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-8 px-5">
          <a href="#" className="flex items-center gap-2.5" aria-label="Playoff360, inicio">
            <Aro size={26} className="text-accent-500" />
            <Wordmark tone="light" />
          </a>

          <nav className="hidden items-center gap-7 text-base text-white/60 md:flex">
            <a href="#producto" onClick={irA('producto')} className="transition-colors hover:text-white">
              Producto
            </a>
            <a href="#pizarra" onClick={irA('pizarra')} className="transition-colors hover:text-white">
              Pizarra
            </a>
            <a href="#limites" onClick={irA('limites')} className="transition-colors hover:text-white">
              Límites
            </a>
            <a href="#preguntas" onClick={irA('preguntas')} className="transition-colors hover:text-white">
              Preguntas
            </a>
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <Link
              to="/entrar"
              className="hidden h-10 items-center rounded-full px-4 text-base font-medium text-white/70 transition-colors hover:text-white sm:inline-flex"
            >
              Entrar
            </Link>
            <Link
              to="/entrar"
              className="inline-flex h-10 items-center rounded-full bg-accent-500 px-5 text-base font-semibold text-night transition-colors hover:bg-accent-400"
            >
              Crear mi club
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* ── Portada ──────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden bg-night text-white">
          {/* Resplandor verde detrás del titular */}
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-[-22rem] h-[44rem] w-[72rem] -translate-x-1/2 rounded-full opacity-[0.22] blur-[120px]"
            style={{ background: 'radial-gradient(closest-side, #19B877, transparent 70%)' }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.035]"
            style={{ backgroundImage: RETICULA }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.16] mix-blend-overlay"
            style={{ backgroundImage: GRANO }}
          />

          <div className="relative mx-auto max-w-6xl px-5 pb-14 pt-16 text-center lg:pt-24">
            <Revelar>
              <p className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-white/15 bg-white/[0.04] px-3.5 py-1.5 text-xs font-medium uppercase tracking-[0.12em] text-accent-400">
                <span className="h-1.5 w-1.5 rounded-full bg-accent-400" />
                Para el cuerpo técnico<span className="hidden sm:inline">&nbsp;de cualquier club</span>
              </p>
            </Revelar>

            <Revelar delay={60}>
              <h1 className="mx-auto mt-7 max-w-4xl font-display text-[clamp(2.2rem,8.6vw,5.25rem)] font-black leading-[0.94] tracking-[-0.045em] text-white">
                Prepara la semana.
                <br />
                <span className="bg-gradient-to-br from-accent-400 to-accent-600 bg-clip-text text-transparent">
                  Dibuja la jugada.
                </span>
              </h1>
            </Revelar>

            <Revelar delay={120}>
              <p className="mx-auto mt-7 max-w-2xl text-lg leading-relaxed text-white/65 [text-wrap:balance] sm:text-xl">
                Plantilla, entrenamientos, partidos y disponibilidad en un solo sitio. Y una pizarra
                táctica que se mueve como un vídeo, no como un pase de diapositivas.
              </p>
            </Revelar>

            <Revelar delay={180}>
              <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link
                  to="/entrar"
                  className="group inline-flex w-full items-center justify-center gap-2 rounded-full bg-accent-500 px-7 py-3.5 text-md font-semibold text-night transition-colors hover:bg-accent-400 sm:w-auto"
                >
                  Crear mi club
                  <ArrowRight size={18} className="transition-transform group-hover:translate-x-0.5" />
                </Link>
                <a
                  href="#pizarra"
                  onClick={irA('pizarra')}
                  className="inline-flex w-full items-center justify-center rounded-full border border-white/20 bg-white/[0.03] px-7 py-3.5 text-md font-semibold text-white transition-colors hover:border-white/45 sm:w-auto"
                >
                  Probar la pizarra
                </a>
              </div>
              <p className="mt-5 text-sm text-white/40">
                Empieza vacía · Sin instalar nada · Sin tarjeta, porque no hay nada que pagar
              </p>
            </Revelar>
          </div>

          {/* La pizarra real, jugable, encajada en la portada */}
          <div id="pizarra" className="relative mx-auto max-w-6xl scroll-mt-20 px-5 pb-20 lg:pb-24">
            <Revelar delay={220}>
              <div className="relative">
                <div
                  aria-hidden
                  className="pointer-events-none absolute -inset-x-10 -top-6 bottom-10 rounded-[3rem] opacity-40 blur-[64px]"
                  style={{ background: 'radial-gradient(closest-side, #19B877, transparent 72%)' }}
                />
                <div className="relative rounded-2xl border border-white/10 bg-white/[0.035] p-3 shadow-[0_40px_100px_-40px_rgba(0,0,0,0.9)] sm:p-5">
                  <BoardDemo tone="dark" />
                  <p className="mt-3.5 px-1 text-sm leading-relaxed text-white/45">
                    Esta es la pizarra de la aplicación, funcionando aquí mismo. Pulsa reproducir:
                    las jugadoras y el balón se desplazan de forma continua.
                  </p>
                </div>
              </div>
            </Revelar>
          </div>
        </section>

        {/* ── Tres cosas que la definen ────────────────────────────────── */}
        <section className="border-b border-line bg-panel">
          <div className="mx-auto grid max-w-6xl gap-8 px-5 py-14 md:grid-cols-3 md:gap-10 lg:py-16">
            {PILARES.map((p, i) => (
              <Revelar key={p.titulo} delay={i * 80}>
                <div className="flex gap-4">
                  <span className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-accent-50 text-accent-700">
                    <p.icono size={19} strokeWidth={2.2} />
                  </span>
                  <div>
                    <h3 className="font-display text-lg font-bold tracking-[-0.01em] text-ink-900">
                      {p.titulo}
                    </h3>
                    <p className="mt-1.5 text-base leading-relaxed text-ink-600">{p.texto}</p>
                  </div>
                </div>
              </Revelar>
            ))}
          </div>
        </section>

        {/* ── Qué hace, con pantallas reales ───────────────────────────── */}
        <section id="producto" className="scroll-mt-16 bg-panel">
          <div className="mx-auto max-w-6xl px-5 py-20 lg:py-28">
            <Revelar>
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-accent-600">
                El producto
              </p>
              <h2 className="mt-4 max-w-3xl font-display text-4xl font-extrabold leading-[1.04] tracking-[-0.035em] text-ink-900 sm:text-5xl">
                Lo que ves aquí es la aplicación, no un montaje.
              </h2>
              <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-600">
                Todas las capturas están hechas con la aplicación de verdad, rellenada con un club
                de ejemplo. Ni un pixel dibujado a mano.
              </p>
            </Revelar>

            <Revelar delay={80}>
              <div className="mt-12 grid gap-8 lg:mt-14 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)] lg:items-start lg:gap-14">
                {/* Selector. En ancho de sobremesa cada apartado se despliega
                    con su explicación; en móvil son pestañas que se deslizan. */}
                <div role="tablist" aria-label="Capacidades">
                  {/* Móvil: pestañas en una fila deslizable */}
                  <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 lg:hidden">
                    {CAPACIDADES.map((c, i) => (
                      <button
                        key={c.clave}
                        role="tab"
                        aria-selected={activa === i}
                        onClick={() => setActiva(i)}
                        className={cn(
                          'shrink-0 whitespace-nowrap rounded-full border px-4 py-2 font-display text-base font-bold transition-colors',
                          activa === i
                            ? 'border-ink-900 bg-ink-900 text-ink-0'
                            : 'border-line text-ink-700',
                        )}
                      >
                        {c.titulo}
                      </button>
                    ))}
                  </div>

                  {/* Sobremesa: lista desplegable */}
                  <div className="hidden lg:block">
                    {CAPACIDADES.map((c, i) => (
                      <div
                        key={c.clave}
                        className={cn(
                          'border-l-2 pl-5 transition-colors',
                          activa === i ? 'border-accent-500' : 'border-line',
                        )}
                      >
                        <button
                          role="tab"
                          aria-selected={activa === i}
                          onClick={() => setActiva(i)}
                          className="w-full py-3.5 text-left"
                        >
                          <span
                            className={cn(
                              'block font-display text-lg font-bold tracking-[-0.015em] transition-colors',
                              activa === i ? 'text-ink-900' : 'text-ink-500 hover:text-ink-800',
                            )}
                          >
                            {c.titulo}
                          </span>
                        </button>
                        <div
                          className={cn(
                            'grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none',
                            activa === i ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
                          )}
                        >
                          <div className="overflow-hidden">
                            <p className="pb-4 text-base leading-relaxed text-ink-600">{c.texto}</p>
                            <ul className="flex flex-wrap gap-1.5 pb-5">
                              {c.detalles.map((d) => (
                                <li
                                  key={d}
                                  className="inline-flex items-center gap-1.5 rounded-full bg-surface px-2.5 py-1 text-sm font-medium text-ink-700"
                                >
                                  <Check size={12} strokeWidth={3} className="text-accent-600" />
                                  {d}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Pantalla. La primera va en el flujo y marca la altura; las
                    demás se apilan encima, así que ninguna se recorta. */}
                <div>
                  <div className="relative">
                    {CAPACIDADES.map((c, i) => (
                      <Ventana
                        key={c.clave}
                        className={cn(
                          'transition-opacity duration-300 motion-reduce:transition-none',
                          i > 0 && 'absolute inset-0',
                          activa === i ? 'opacity-100' : 'pointer-events-none opacity-0',
                        )}
                      >
                        <img
                          src={c.imagen}
                          alt={c.titulo}
                          loading={i === 0 ? 'eager' : 'lazy'}
                          decoding="async"
                          className="block w-full"
                        />
                      </Ventana>
                    ))}
                  </div>

                  {/* En móvil la explicación va debajo de la captura */}
                  <div className="lg:hidden">
                    <p className="mt-6 text-md leading-relaxed text-ink-700">{cap.texto}</p>
                    <ul className="mt-4 flex flex-wrap gap-2">
                      {cap.detalles.map((d) => (
                        <li
                          key={d}
                          className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-sm font-medium text-ink-700"
                        >
                          <Check size={13} strokeWidth={3} className="text-accent-600" />
                          {d}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </Revelar>
          </div>
        </section>

        {/* ── En el campo, con el móvil ────────────────────────────────── */}
        <section className="border-y border-line bg-surface">
          <div className="mx-auto grid max-w-6xl items-center gap-14 px-5 py-20 lg:grid-cols-2 lg:gap-16 lg:py-28">
            <Revelar>
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-accent-600">
                En el campo
              </p>
              <h2 className="mt-4 font-display text-4xl font-extrabold leading-[1.04] tracking-[-0.035em] text-ink-900 sm:text-5xl">
                De pie, con prisa y con guantes.
              </h2>
              <p className="mt-5 max-w-lg text-lg leading-relaxed text-ink-600">
                Pasar lista son dos toques: todas presentes y corriges las excepciones. La
                plantilla, el entrenamiento del día y la convocatoria caben en el bolsillo, sin
                instalar nada.
              </p>
              <ul className="mt-8 space-y-3.5">
                {[
                  'Todo el trabajo también desde el móvil',
                  'Sin instalar ninguna aplicación: se abre y ya está',
                  'Cada quien ve sólo los equipos que tiene asignados',
                ].map((t) => (
                  <li key={t} className="flex items-start gap-3 text-md text-ink-800">
                    <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-accent-500 text-night">
                      <Check size={13} strokeWidth={3} />
                    </span>
                    {t}
                  </li>
                ))}
              </ul>
            </Revelar>

            <Revelar delay={100}>
              <div className="flex justify-center gap-4 sm:gap-7">
                <Telefono
                  src="/producto/plantilla-movil.png"
                  alt="La plantilla del equipo en el móvil"
                  className="w-[46%] max-w-[232px] -rotate-3"
                />
                <Telefono
                  src="/producto/entrenamientos-movil.png"
                  alt="Los entrenamientos de la semana en el móvil"
                  className="mt-12 w-[46%] max-w-[232px] rotate-3"
                />
              </div>
            </Revelar>
          </div>
        </section>

        {/* ── Cómo se empieza ──────────────────────────────────────────── */}
        <section className="bg-panel">
          <div className="mx-auto max-w-6xl px-5 py-20 lg:py-24">
            <Revelar>
              <h2 className="max-w-2xl font-display text-4xl font-extrabold leading-[1.04] tracking-[-0.035em] text-ink-900 sm:text-5xl">
                Tres pasos y estás dentro.
              </h2>
            </Revelar>
            <div className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
              {PASOS.map(([titulo, texto], i) => (
                <Revelar key={titulo} delay={i * 90}>
                  <div className="border-t-2 border-ink-900 pt-5">
                    <span className="font-display text-sm font-bold tracking-[0.1em] text-accent-600">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <h3 className="mt-2 font-display text-xl font-bold tracking-[-0.015em] text-ink-900">
                      {titulo}
                    </h3>
                    <p className="mt-2 text-base leading-relaxed text-ink-600">{texto}</p>
                  </div>
                </Revelar>
              ))}
            </div>
          </div>
        </section>

        {/* ── Qué no hace ──────────────────────────────────────────────── */}
        <section id="limites" className="relative scroll-mt-16 overflow-hidden bg-night text-white">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.14] mix-blend-overlay"
            style={{ backgroundImage: GRANO }}
          />
          <div className="relative mx-auto max-w-6xl px-5 py-20 lg:py-28">
            <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-20">
              <Revelar>
                <p className="text-sm font-semibold uppercase tracking-[0.14em] text-accent-400">
                  Honestidad
                </p>
                <h2 className="mt-4 font-display text-4xl font-extrabold leading-[1.04] tracking-[-0.035em] text-white sm:text-5xl">
                  Y lo que no hace.
                </h2>
                <p className="mt-5 max-w-md text-lg leading-relaxed text-white/55">
                  Preferimos decirlo aquí que dejar que lo descubras usándola. Si algo de esta lista
                  te hace falta, esta no es tu herramienta todavía.
                </p>
              </Revelar>

              <Revelar delay={100}>
                <ul>
                  {NO_HACE.map((t) => (
                    <li
                      key={t}
                      className="flex items-start gap-3.5 border-b border-white/10 py-4 text-md leading-relaxed text-white/75 first:border-t"
                    >
                      <Minus size={18} className="mt-0.5 shrink-0 text-white/25" />
                      {t}
                    </li>
                  ))}
                </ul>
              </Revelar>
            </div>
          </div>
        </section>

        {/* ── Preguntas ────────────────────────────────────────────────── */}
        <section id="preguntas" className="scroll-mt-16 bg-panel">
          <div className="mx-auto max-w-3xl px-5 py-20 lg:py-28">
            <Revelar>
              <h2 className="font-display text-4xl font-extrabold leading-[1.04] tracking-[-0.035em] text-ink-900 sm:text-5xl">
                Preguntas que nos harías.
              </h2>
            </Revelar>

            <Revelar delay={80}>
              <dl className="mt-10 border-t border-line">
                {FAQ.map(([q, a], i) => (
                  <div key={q} className="border-b border-line">
                    <dt>
                      <button
                        onClick={() => setAbierta(abierta === i ? null : i)}
                        aria-expanded={abierta === i}
                        className="flex w-full items-center justify-between gap-6 py-5 text-left"
                      >
                        <span className="text-lg font-semibold leading-snug text-ink-900">{q}</span>
                        <span
                          className={cn(
                            'grid h-7 w-7 shrink-0 place-items-center rounded-full border border-line text-ink-700 transition-transform duration-200',
                            abierta === i && 'rotate-45 border-ink-900 bg-ink-900 text-ink-0',
                          )}
                          aria-hidden
                        >
                          <Plus size={14} strokeWidth={2.5} />
                        </span>
                      </button>
                    </dt>
                    <dd
                      className={cn(
                        'grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none',
                        abierta === i ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
                      )}
                    >
                      <div className="overflow-hidden">
                        <p className="max-w-2xl pb-6 text-md leading-relaxed text-ink-700">{a}</p>
                      </div>
                    </dd>
                  </div>
                ))}
              </dl>
            </Revelar>
          </div>
        </section>

        {/* ── Llamada final ────────────────────────────────────────────── */}
        <section className="bg-panel px-5 pb-20 lg:pb-28">
          <Revelar>
            <div className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl bg-night px-6 py-16 text-center ring-1 ring-inset ring-white/10 sm:px-12 lg:py-24">
              {/* El verde sube desde abajo. Un degradado en porcentajes se
                  comporta igual en cualquier ancho; un desenfoque, no. */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    'radial-gradient(120% 110% at 50% 128%, #19B877 0%, rgba(25,184,119,0.45) 34%, transparent 62%)',
                }}
              />
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 opacity-[0.14] mix-blend-overlay"
                style={{ backgroundImage: GRANO }}
              />
              <div className="relative">
                <h2 className="mx-auto max-w-3xl font-display text-4xl font-extrabold leading-[1.04] tracking-[-0.035em] text-white sm:text-5xl">
                  Crea tu club y monta la semana.
                </h2>
                <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-white/60">
                  Empieza vacía y se llena con el trabajo real de tu club. Los datos de cada club
                  están separados de los de cualquier otro.
                </p>
                <Link
                  to="/entrar"
                  className="group mt-9 inline-flex items-center justify-center gap-2 rounded-full bg-accent-500 px-8 py-4 text-md font-semibold text-night transition-colors hover:bg-accent-400"
                >
                  Empezar
                  <ArrowRight size={18} className="transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>
            </div>
          </Revelar>
        </section>
      </main>

      {/* ── Pie ────────────────────────────────────────────────────────── */}
      <footer className="border-t border-line bg-panel">
        <div className="mx-auto max-w-6xl px-5 py-14">
          <div className="grid gap-10 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)]">
            <div>
              <div className="flex items-center gap-2.5">
                <Aro size={24} className="text-accent-500" />
                <Wordmark />
              </div>
              <p className="mt-4 max-w-xs text-base leading-relaxed text-ink-600">
                El sistema de trabajo del cuerpo técnico. Para cualquier club.
              </p>
            </div>

            <nav className="flex flex-col gap-3 text-base text-ink-700">
              <span className="text-sm font-semibold uppercase tracking-[0.1em] text-muted">
                Producto
              </span>
              <a href="#producto" onClick={irA('producto')} className="hover:text-ink-900">
                Qué hace
              </a>
              <a href="#limites" onClick={irA('limites')} className="hover:text-ink-900">
                Qué no hace
              </a>
              <a href="#preguntas" onClick={irA('preguntas')} className="hover:text-ink-900">
                Preguntas
              </a>
            </nav>

            <nav className="flex flex-col gap-3 text-base text-ink-700">
              <span className="text-sm font-semibold uppercase tracking-[0.1em] text-muted">
                Cuenta y legal
              </span>
              <Link to="/entrar" className="inline-flex items-center gap-1 hover:text-ink-900">
                Entrar <ArrowUpRight size={14} />
              </Link>
              <Link to="/aviso-legal" className="hover:text-ink-900">
                Aviso legal
              </Link>
              <Link to="/privacidad" className="hover:text-ink-900">
                Privacidad
              </Link>
            </nav>
          </div>

          <p className="mt-12 border-t border-line pt-6 text-sm text-muted">
            Los datos de cada club se guardan separados de los de cualquier otro y el aislamiento lo
            impone la base de datos.
          </p>
        </div>
      </footer>
    </div>
  );
}
