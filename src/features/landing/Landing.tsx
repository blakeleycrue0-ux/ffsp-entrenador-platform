/**
 * Página pública.
 * ---------------------------------------------------------------------------
 * Dice qué hace la herramienta y la enseña funcionando. Sin cifras de uso, sin
 * escudos de clubes, sin premios, sin testimonios: nada de eso está verificado,
 * así que no aparece. Tampoco hay precios ni planes: no están decididos.
 */

import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Wordmark } from '@/components/ui/Brand';
import { BoardDemo } from '@/features/board/BoardDemo';

const SECCIONES = [
  {
    title: 'Pizarra táctica animada',
    body: 'Coloca a las jugadoras, muévelas en distintos instantes y la jugada se reproduce sola, de forma continua. Línea de tiempo, velocidad, bucle y exportación a imagen.',
  },
  {
    title: 'Entrenamientos y asistencia',
    body: 'Monta la sesión con ejercicios de tu biblioteca, pasa lista en el campo y anota cómo ha ido. Lo planificado y lo que ocurrió de verdad se guardan por separado.',
  },
  {
    title: 'Plantilla y disponibilidad',
    body: 'Fichas, dorsales, posiciones y partes de lesión con seguimiento. Quien deja el equipo se archiva: el historial de la temporada se conserva.',
  },
  {
    title: 'Partidos y calendario',
    body: 'Convocatorias, alineación, minutos, goles y tarjetas. Entrenamientos y partidos en un único calendario, con series periódicas.',
  },
  {
    title: 'Analíticas de lo registrado',
    body: 'Asistencia, minutos y participación calculados sobre lo que habéis anotado. Si falta un dato se dice que falta; nunca se convierte en un cero.',
  },
  {
    title: 'Un club, sus datos',
    body: 'Cada club es independiente: sus equipos, sus jugadoras y sus jugadas no son visibles para ningún otro. Dentro del club, cada persona ve sólo los equipos que tiene asignados. Lo aplica el servidor, no la pantalla.',
  },
];

const FAQ = [
  [
    '¿Envía mensajes a las familias?',
    'No. Prepara las convocatorias y las listas para que las compartáis por donde ya habléis con el equipo. No prometemos un envío que no hacemos.',
  ],
  [
    '¿Se puede exportar la animación en vídeo?',
    'Todavía no. Se exporta una imagen del instante que elijas. Grabar vídeo desde el navegador no funciona igual en todos los equipos y preferimos no ofrecerlo hasta que sea fiable.',
  ],
  [
    '¿Quién puede ver los datos de las jugadoras?',
    'Sólo el cuerpo técnico asignado a ese equipo. Los datos de contacto aparecen únicamente dentro de la ficha individual, nunca en listados ni exportaciones.',
  ],
  [
    '¿La plataforma valora lesiones o predice el rendimiento?',
    'No. Guarda lo que anota el cuerpo técnico. No emite diagnósticos, ni estimaciones de riesgo, ni métricas calculadas automáticamente.',
  ],
  [
    '¿Cómo empiezo con mi club?',
    'Creas tu cuenta, creas tu club y quedas como su administración. Desde ahí montas los equipos e invitas al resto del cuerpo técnico con un enlace.',
  ],
  [
    '¿Puede otro club ver lo nuestro?',
    'No. El aislamiento entre clubes lo imponen las políticas de acceso de la base de datos, así que no depende de que la aplicación se comporte bien.',
  ],
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
          <Wordmark />
          <Link
            to="/entrar"
            className="inline-flex h-9 items-center rounded-md bg-navy-900 px-4 text-base font-medium text-white transition-colors hover:bg-navy-800"
          >
            Entrar
          </Link>
        </div>
      </header>

      <main>
        {/* Presentación */}
        <section className="mx-auto max-w-6xl px-5 pb-12 pt-14 lg:pt-20">
          <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
            <div>
              <h1 className="text-3xl font-semibold leading-tight tracking-[-0.015em] sm:text-4xl">
                La herramienta de trabajo del cuerpo técnico
              </h1>
              <p className="mt-4 max-w-xl text-lg leading-relaxed text-navy-700">
                Plantilla, entrenamientos, partidos y una pizarra táctica que se mueve de verdad.
                Para cualquier club: cada uno con sus datos, separados de los de los demás.
              </p>
              <p className="mt-6 text-md font-medium text-navy-900">
                Menos gestión. Más tiempo para entrenar.
              </p>
              <div className="mt-7 flex flex-wrap gap-2">
                <Link
                  to="/entrar"
                  className="inline-flex h-11 items-center gap-2 rounded-md bg-navy-900 px-5 text-md font-medium text-white transition-colors hover:bg-navy-800"
                >
                  Entrar en la plataforma <ArrowRight size={17} />
                </Link>
                <a
                  href="#pizarra"
                  className="inline-flex h-11 items-center rounded-md border border-line px-5 text-md font-medium text-navy-900 transition-colors hover:border-navy-400"
                >
                  Ver la pizarra
                </a>
              </div>
            </div>

            <div id="pizarra">
              <BoardDemo />
              <p className="mt-2.5 text-sm leading-relaxed text-muted">
                Esta es la pizarra real de la aplicación. Pulsa reproducir: las jugadoras y el balón
                se desplazan de forma continua, no es una sucesión de imágenes.
              </p>
            </div>
          </div>
        </section>

        {/* Qué hace */}
        <section className="border-t border-line bg-surface">
          <div className="mx-auto max-w-6xl px-5 py-14">
            <h2 className="text-2xl font-semibold">Qué hace</h2>
            <div className="mt-7 grid gap-x-8 gap-y-7 sm:grid-cols-2 lg:grid-cols-3">
              {SECCIONES.map((s) => (
                <div key={s.title}>
                  <h3 className="text-md font-semibold">{s.title}</h3>
                  <p className="mt-1.5 text-base leading-relaxed text-navy-700">{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Qué no hace */}
        <section className="mx-auto max-w-6xl px-5 py-14">
          <h2 className="text-2xl font-semibold">Qué no hace</h2>
          <p className="mt-2 max-w-2xl text-base leading-relaxed text-navy-700">
            Preferimos decirlo antes de que lo descubras usándola.
          </p>
          <ul className="mt-6 grid gap-x-8 gap-y-3 sm:grid-cols-2">
            {[
              'No envía mensajes ni correos a las familias.',
              'No genera diagnósticos ni recomendaciones médicas.',
              'No calcula métricas físicas ni predice rendimiento.',
              'No rellena con ceros lo que nadie ha registrado.',
              'No exporta la animación en vídeo, todavía.',
              'No tiene planes de pago: no están decididos.',
            ].map((t) => (
              <li key={t} className="flex gap-2.5 text-base leading-relaxed text-navy-700">
                <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-navy-300" />
                {t}
              </li>
            ))}
          </ul>
        </section>

        {/* Preguntas */}
        <section className="border-t border-line bg-surface">
          <div className="mx-auto max-w-3xl px-5 py-14">
            <h2 className="text-2xl font-semibold">Preguntas frecuentes</h2>
            <dl className="mt-6 divide-y divide-line border-y border-line">
              {FAQ.map(([q, a]) => (
                <div key={q} className="py-4">
                  <dt className="text-md font-semibold">{q}</dt>
                  <dd className="mt-1.5 text-base leading-relaxed text-navy-700">{a}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-8">
          <Wordmark size="sm" />
          <nav className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted">
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
