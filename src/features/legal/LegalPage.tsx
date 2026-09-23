/**
 * Aviso legal y privacidad.
 * ---------------------------------------------------------------------------
 * Los datos del titular no se inventan. Todo lo que debe aportar el club está
 * marcado como pendiente, de forma visible, para que nadie los dé por buenos.
 */

import { Link, useLocation } from 'react-router-dom';
import { Wordmark } from '@/components/ui/Brand';
import { Tag } from '@/components/ui';

/** Dato que el club tiene que facilitar antes de publicar. */
const Pendiente = ({ children }: { children: React.ReactNode }) => (
  <span className="inline-flex items-center gap-1.5 rounded border border-warn/35 bg-warn/8 px-1.5 py-0.5 text-sm text-warn">
    {children}
  </span>
);

export default function LegalPage() {
  const { pathname } = useLocation();
  const privacy = pathname.includes('privacidad');

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4">
          <Link to="/">
            <Wordmark size="sm" />
          </Link>
          <Link
            to={privacy ? '/aviso-legal' : '/privacidad'}
            className="text-sm text-navy-700 underline underline-offset-2 hover:text-navy-900"
          >
            {privacy ? 'Aviso legal' : 'Privacidad'}
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-10">
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold">
            {privacy ? 'Política de privacidad' : 'Aviso legal'}
          </h1>
          <Tag tone="warn">Pendiente de revisión</Tag>
        </div>

        <div className="rounded-md border border-warn/30 bg-warn/6 px-4 py-3 text-base leading-relaxed text-navy-800">
          Este texto está redactado pero <strong>no está completo ni revisado</strong>. Los datos
          marcados en amarillo los debe aportar el club antes de publicar la web, y el conjunto debe
          revisarlo alguien con criterio jurídico. Hasta entonces no puede considerarse un documento
          legal válido.
        </div>

        <div className="mt-8 space-y-7 text-base leading-relaxed text-navy-800 [&_h2]:text-lg [&_h2]:font-semibold">
          <section>
            <h2>Titular</h2>
            <ul className="mt-2 space-y-1.5">
              <li>
                Denominación: <Pendiente>razón social del club</Pendiente>
              </li>
              <li>
                Identificación fiscal: <Pendiente>CIF / NIF</Pendiente>
              </li>
              <li>
                Domicilio: <Pendiente>dirección postal completa</Pendiente>
              </li>
              <li>
                Contacto: <Pendiente>correo electrónico de contacto</Pendiente>
              </li>
              <li>
                Inscripción registral: <Pendiente>registro y número, si procede</Pendiente>
              </li>
            </ul>
          </section>

          {privacy ? (
            <>
              <section>
                <h2>Qué datos se tratan</h2>
                <p className="mt-2">
                  La plataforma almacena los datos que el cuerpo técnico introduce para gestionar los
                  equipos: nombre, dorsal, posición, fecha de nacimiento, teléfono y correo de la
                  jugadora o de sus tutores legales, disponibilidad, asistencia a entrenamientos,
                  convocatorias, minutos y anotaciones del cuerpo técnico, incluidos los partes de
                  lesión.
                </p>
                <p className="mt-2">
                  De quien accede a la plataforma se guarda el correo electrónico, el nombre y el rol
                  dentro del club. Las contraseñas las gestiona el proveedor de autenticación y nunca
                  son visibles para el club ni para la plataforma.
                </p>
              </section>

              <section>
                <h2>Datos de menores</h2>
                <p className="mt-2">
                  Cuando la jugadora es menor de edad, los datos de contacto corresponden a sus
                  tutores legales y su tratamiento requiere el consentimiento de estos.{' '}
                  <Pendiente>procedimiento de recogida del consentimiento</Pendiente>
                </p>
              </section>

              <section>
                <h2>Para qué se usan</h2>
                <p className="mt-2">
                  Únicamente para la gestión deportiva de los equipos: planificar entrenamientos,
                  convocar, registrar asistencia y hacer seguimiento de la temporada. No se usan con
                  fines comerciales, no se ceden a terceros ni se utilizan para elaborar perfiles
                  automáticos.
                </p>
                <p className="mt-2">
                  Las anotaciones de lesión sirven para que el cuerpo técnico sepa con quién puede
                  contar. <strong>La plataforma no emite diagnósticos ni recomendaciones médicas.</strong>
                </p>
              </section>

              <section>
                <h2>Quién puede verlos</h2>
                <p className="mt-2">
                  El acceso está limitado por equipo: cada persona del cuerpo técnico sólo puede ver
                  los datos de los equipos que tiene asignados. La restricción se aplica en el
                  servidor, no en la interfaz. Los datos de contacto sólo aparecen dentro de la ficha
                  individual.
                </p>
              </section>

              <section>
                <h2>Dónde se guardan</h2>
                <p className="mt-2">
                  Los datos se alojan en la infraestructura de Supabase.{' '}
                  <Pendiente>región de alojamiento y contrato de encargado de tratamiento</Pendiente>
                </p>
              </section>

              <section>
                <h2>Cuánto tiempo se conservan</h2>
                <p className="mt-2">
                  <Pendiente>plazos de conservación que fije el club</Pendiente> Una jugadora que deja
                  el equipo se archiva para conservar el historial deportivo de la temporada; su
                  supresión definitiva se realiza a petición.
                </p>
              </section>

              <section>
                <h2>Derechos</h2>
                <p className="mt-2">
                  Puede solicitarse el acceso, la rectificación, la supresión, la limitación, la
                  portabilidad y la oposición al tratamiento escribiendo a{' '}
                  <Pendiente>correo de contacto para ejercer derechos</Pendiente>. También puede
                  presentarse una reclamación ante la Agencia Española de Protección de Datos.
                </p>
              </section>
            </>
          ) : (
            <>
              <section>
                <h2>Objeto</h2>
                <p className="mt-2">
                  Este sitio es la herramienta de trabajo del cuerpo técnico del club para gestionar
                  equipos, entrenamientos, partidos y disponibilidad. El acceso está restringido a las
                  personas autorizadas por el club.
                </p>
              </section>

              <section>
                <h2>Condiciones de uso</h2>
                <p className="mt-2">
                  Cada cuenta es personal e intransferible. Quien accede se compromete a usar la
                  plataforma para la gestión deportiva del club y a tratar con confidencialidad los
                  datos de jugadoras y familias a los que tenga acceso.
                </p>
              </section>

              <section>
                <h2>Propiedad intelectual</h2>
                <p className="mt-2">
                  El escudo y los signos distintivos del club pertenecen a su titular. El resto del
                  contenido de la plataforma pertenece a{' '}
                  <Pendiente>titular de los derechos sobre el software</Pendiente>.
                </p>
              </section>

              <section>
                <h2>Responsabilidad</h2>
                <p className="mt-2">
                  La plataforma registra la información que introduce el cuerpo técnico. No genera
                  valoraciones médicas ni previsiones automáticas, y la exactitud de los datos
                  registrados es responsabilidad de quien los introduce.
                </p>
              </section>

              <section>
                <h2>Legislación aplicable</h2>
                <p className="mt-2">
                  <Pendiente>jurisdicción y legislación que determine el club</Pendiente>
                </p>
              </section>
            </>
          )}
        </div>

        <p className="mt-10 border-t border-line pt-5 text-sm text-muted">
          Última revisión: pendiente. Este documento no debe publicarse como definitivo hasta que se
          completen los datos marcados y lo revise el club.
        </p>
      </main>
    </div>
  );
}
