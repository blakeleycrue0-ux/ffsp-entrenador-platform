/**
 * Página pública.
 * ---------------------------------------------------------------------------
 * Enseña el producto funcionando: la pizarra es de verdad, interactiva, y las
 * capturas son pantallas reales de la aplicación con un club de ejemplo.
 *
 * Lo que NO hay, y no es un descuido: cifras de uso, escudos de clubes,
 * premios, testimonios y precios. Nada de eso está verificado ni decidido, y
 * ponerlo sería mentir en la primera pantalla que ve alguien.
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, Minus } from 'lucide-react';
import { Wordmark } from '@/components/ui/Brand';
import { BoardDemo } from '@/features/board/BoardDemo';
import { cn } from '@/lib/utils';

/* ─────────────────────────────── Piezas ──────────────────────────────────── */

/** Marco de navegador. Hace que una captura parezca producto y no un dibujo. */
function Ventana({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('overflow-hidden rounded-xl border border-white/10 bg-night shadow-2xl', className)}>
      <div className="flex items-center gap-1.5 border-b border-white/10 bg-white/[0.04] px-3 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
        <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
        <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
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
        'overflow-hidden rounded-[2rem] border-[6px] border-navy-900 bg-navy-900 shadow-2xl',
        className,
      )}
    >
      <img src={src} alt={alt} loading="lazy" className="block w-full" />
    </div>
  );
}

const CAPACIDADES = [
  {
    titulo: 'Pizarra táctica animada',
    texto:
      'Coloca a las jugadoras, muévelas en distintos instantes y la jugada se reproduce sola, de forma continua. Línea de tiempo, velocidad, bucle y exportación a imagen.',
    imagen: '/producto/pizarra.png',
    alto: 'Campo completo o medio · F11 y F7 · carrera, conducción, pase y desmarque',
  },
  {
    titulo: 'La semana, resuelta',
    texto:
      'Entrenamientos con sus bloques y su material, partidos con convocatoria, y un calendario que lo junta todo. Pasas lista en el campo desde el móvil, de pie y con prisa.',
    imagen: '/producto/inicio.png',
    alto: 'Seis estados de asistencia, con «llegó tarde» y «sin registrar»',
  },
  {
    titulo: 'Analíticas que no se inventan nada',
    texto:
      'Asistencia y participación calculadas sobre lo que habéis registrado. Una falta justificada o una sesión sin lista no cuentan como un cero: donde no hay dato, lo dice.',
    imagen: '/producto/analiticas.png',
    alto: 'Cada cifra explica cómo se calcula',
  },
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
];

/* ─────────────────────────────── Página ──────────────────────────────────── */

export default function Landing() {
  const [abierta, setAbierta] = useState<number | null>(0);
  const [conSombra, setConSombra] = useState(false);

  useEffect(() => {
    const alScroll = () => setConSombra(window.scrollY > 8);
    alScroll();
    window.addEventListener('scroll', alScroll, { passive: true });
    return () => window.removeEventListener('scroll', alScroll);
  }, []);

  return (
    <div className="bg-white">
      {/* ── Navegación ─────────────────────────────────────────────────── */}
      <header
        className={cn(
          'sticky top-0 z-40 bg-night/95 backdrop-blur transition-shadow',
          conSombra && 'shadow-[0_1px_0_rgba(255,255,255,0.08)]',
        )}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
          <Wordmark tone="light" showSubtitle={false} />
          <Link
            to="/entrar"
            className="inline-flex h-10 items-center rounded-full bg-pitch-500 px-5 text-base font-semibold text-night transition-colors hover:bg-pitch-400"
          >
            Entrar
          </Link>
        </div>
      </header>

      <main>
        {/* ── Portada ──────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden bg-night text-white">
          {/* Textura de campo, muy tenue: no compite con el texto */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.045]"
            style={{
              backgroundImage:
                'repeating-linear-gradient(90deg, #fff 0 1px, transparent 1px 88px), repeating-linear-gradient(0deg, #fff 0 1px, transparent 1px 88px)',
            }}
          />

          <div className="relative mx-auto max-w-6xl px-5 pb-12 pt-12 lg:pb-16 lg:pt-16">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-1 text-xs font-medium uppercase tracking-[0.12em] text-pitch-400">
              Para cualquier club
            </p>

            <h1 className="mt-6 max-w-4xl font-display text-[clamp(2.9rem,8.5vw,5.5rem)] font-black leading-[0.95] tracking-[-0.04em] text-white">
              Prepara la semana.
              <br />
              <span className="text-pitch-400">Dibuja la jugada.</span>
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/70 sm:text-xl">
              Plantilla, entrenamientos, partidos y disponibilidad en un sitio. Y una pizarra
              táctica que se mueve como un vídeo, no como un pase de diapositivas.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/entrar"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-pitch-500 px-7 py-3.5 text-md font-semibold text-night transition-colors hover:bg-pitch-400"
              >
                Crear mi club <ArrowRight size={18} />
              </Link>
              <a
                href="#pizarra"
                className="inline-flex items-center justify-center rounded-full border border-white/20 px-7 py-3.5 text-md font-semibold text-white transition-colors hover:border-white/50"
              >
                Probar la pizarra
              </a>
            </div>

            <p className="mt-5 text-sm text-white/45">
              Menos gestión. Más tiempo para entrenar.
            </p>
          </div>

          {/* La pizarra real, jugable, encajada en la portada */}
          <div id="pizarra" className="relative mx-auto max-w-6xl px-5 pb-16 lg:pb-20">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 sm:p-5">
              <BoardDemo tone="dark" />
              <p className="mt-3 px-1 text-sm leading-relaxed text-white/50">
                Esta es la pizarra de la aplicación, funcionando aquí mismo. Pulsa reproducir: las
                jugadoras y el balón se desplazan de forma continua.
              </p>
            </div>
          </div>
        </section>

        {/* ── Qué hace, con pantallas reales ───────────────────────────── */}
        <section className="bg-white">
          <div className="mx-auto max-w-6xl px-5 py-20 lg:py-28">
            <h2 className="max-w-3xl font-display text-4xl font-extrabold leading-[1.05] tracking-[-0.03em] text-navy-900 sm:text-5xl">
              Lo que ves aquí es la aplicación, no un montaje.
            </h2>

            <div className="mt-16 space-y-20 lg:space-y-28">
              {CAPACIDADES.map((c, i) => (
                <div
                  key={c.titulo}
                  className={cn(
                    'grid items-center gap-8 lg:grid-cols-2 lg:gap-14',
                    i % 2 === 1 && 'lg:[&>*:first-child]:order-2',
                  )}
                >
                  <div>
                    <span className="font-display text-5xl font-black text-navy-100">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <h3 className="mt-3 font-display text-3xl font-extrabold leading-tight tracking-[-0.02em] text-navy-900">
                      {c.titulo}
                    </h3>
                    <p className="mt-4 max-w-lg text-lg leading-relaxed text-navy-700">{c.texto}</p>
                    <p className="mt-5 inline-flex rounded-full bg-pitch-50 px-3 py-1.5 text-sm font-medium text-pitch-700">
                      {c.alto}
                    </p>
                  </div>

                  <Ventana>
                    <img src={c.imagen} alt={c.titulo} loading="lazy" className="block w-full" />
                  </Ventana>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── En el campo, con el móvil ────────────────────────────────── */}
        <section className="bg-surface">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-20 lg:grid-cols-2 lg:gap-16 lg:py-28">
            <div>
              <h2 className="font-display text-4xl font-extrabold leading-[1.05] tracking-[-0.03em] text-navy-900 sm:text-5xl">
                En el campo, de pie y con prisa.
              </h2>
              <p className="mt-5 max-w-lg text-lg leading-relaxed text-navy-700">
                Pasar lista son dos toques: todas presentes y corriges las excepciones. La
                plantilla, el entrenamiento del día y la convocatoria caben en el bolsillo, sin
                instalar nada.
              </p>
              <ul className="mt-7 space-y-3">
                {[
                  'Todo el trabajo también desde el móvil',
                  'Sin instalar ninguna aplicación',
                  'Cada quien ve sólo los equipos que tiene asignados',
                ].map((t) => (
                  <li key={t} className="flex items-start gap-3 text-md text-navy-800">
                    <span className="mt-1 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-pitch-500 text-night">
                      <Check size={13} strokeWidth={3} />
                    </span>
                    {t}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex justify-center gap-4 sm:gap-6">
              <Telefono
                src="/producto/plantilla-movil.png"
                alt="La plantilla del equipo en el móvil"
                className="w-[46%] max-w-[230px] -rotate-2"
              />
              <Telefono
                src="/producto/entrenamientos-movil.png"
                alt="Los entrenamientos de la semana en el móvil"
                className="mt-10 w-[46%] max-w-[230px] rotate-2"
              />
            </div>
          </div>
        </section>

        {/* ── Qué no hace ──────────────────────────────────────────────── */}
        <section className="bg-night text-white">
          <div className="mx-auto max-w-6xl px-5 py-20 lg:py-28">
            <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:gap-16">
              <div>
                <h2 className="font-display text-4xl font-extrabold leading-[1.05] tracking-[-0.03em] text-white sm:text-5xl">
                  Y lo que no hace.
                </h2>
                <p className="mt-5 max-w-md text-lg leading-relaxed text-white/60">
                  Preferimos decirlo aquí que dejar que lo descubras usándola. Si algo de esta lista
                  te hace falta, esta no es tu herramienta todavía.
                </p>
              </div>

              <ul className="space-y-0">
                {NO_HACE.map((t) => (
                  <li
                    key={t}
                    className="flex items-start gap-3.5 border-b border-white/10 py-4 text-md leading-relaxed text-white/80 first:border-t"
                  >
                    <Minus size={18} className="mt-0.5 shrink-0 text-white/30" />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ── Preguntas ────────────────────────────────────────────────── */}
        <section className="bg-white">
          <div className="mx-auto max-w-3xl px-5 py-20 lg:py-28">
            <h2 className="font-display text-4xl font-extrabold leading-[1.05] tracking-[-0.03em] text-navy-900 sm:text-5xl">
              Preguntas que nos harías.
            </h2>

            <dl className="mt-10 border-t border-line">
              {FAQ.map(([q, a], i) => (
                <div key={q} className="border-b border-line">
                  <dt>
                    <button
                      onClick={() => setAbierta(abierta === i ? null : i)}
                      aria-expanded={abierta === i}
                      className="flex w-full items-center justify-between gap-6 py-5 text-left"
                    >
                      <span className="text-lg font-semibold leading-snug text-navy-900">{q}</span>
                      <span
                        className={cn(
                          'grid h-7 w-7 shrink-0 place-items-center rounded-full border border-line text-navy-700 transition-transform',
                          abierta === i && 'rotate-45',
                        )}
                        aria-hidden
                      >
                        +
                      </span>
                    </button>
                  </dt>
                  {abierta === i && (
                    <dd className="-mt-1 max-w-2xl pb-6 text-md leading-relaxed text-navy-700">{a}</dd>
                  )}
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* ── Llamada final ────────────────────────────────────────────── */}
        <section className="bg-white px-5 pb-20 lg:pb-28">
          <div className="mx-auto max-w-6xl overflow-hidden rounded-3xl bg-pitch-900 px-6 py-16 text-center sm:px-12 lg:py-24">
            <h2 className="mx-auto max-w-3xl font-display text-4xl font-extrabold leading-[1.05] tracking-[-0.03em] text-white sm:text-5xl">
              Crea tu club y monta la semana.
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-white/70">
              Empieza vacía y se llena con el trabajo real de tu club. Los datos de cada club están
              separados de los de cualquier otro.
            </p>
            <Link
              to="/entrar"
              className="mt-9 inline-flex items-center justify-center gap-2 rounded-full bg-white px-8 py-4 text-md font-semibold text-night transition-transform hover:scale-[1.02]"
            >
              Empezar <ArrowRight size={18} />
            </Link>
          </div>
        </section>
      </main>

      {/* ── Pie ────────────────────────────────────────────────────────── */}
      <footer className="border-t border-line bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-5 py-12 sm:flex-row sm:items-start sm:justify-between">
          <Wordmark />
          <nav className="flex flex-wrap gap-x-8 gap-y-3 text-base text-navy-700">
            <Link to="/entrar" className="hover:text-navy-900">
              Entrar
            </Link>
            <Link to="/aviso-legal" className="hover:text-navy-900">
              Aviso legal
            </Link>
            <Link to="/privacidad" className="hover:text-navy-900">
              Privacidad
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
