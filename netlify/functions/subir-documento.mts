/**
 * Guardar un documento de una inscripción.
 * ---------------------------------------------------------------------------
 * POR QUÉ PASA POR AQUÍ Y NO VA DIRECTO A SUPABASE. El cubo `inscripciones` es
 * privado y NO tiene política de subida para el rol anónimo. Esa decisión es
 * deliberada: si la familia pudiera escribir en el cubo desde el navegador,
 * cualquiera con el enlace —que se reparte por WhatsApp a doscientas familias—
 * podría subir lo que quisiera y cuanto quisiera al almacenamiento del club.
 * No hay política de Storage que arregle eso, porque el permiso lo tendría de
 * verdad.
 *
 * Así que la subida pasa por aquí, que es el único sitio con la clave de
 * servicio y por tanto el único que puede comprobar las cinco cosas que hay
 * que comprobar antes de escribir un archivo en el disco de otro:
 *
 *   1. Que el token sea de un formulario ABIERTO.
 *   2. Que la inscripción exista y sea DE ESE formulario. Sin esto, alguien con
 *      un enlace válido podría colgar archivos de la inscripción de otra
 *      familia pasando un id ajeno.
 *   3. Que el documento sea uno de los que el formulario PIDE. Un `kind`
 *      inventado sería una vía para meter archivos sin que nadie los mire.
 *   4. Que el tipo y el tamaño estén dentro de lo aceptado.
 *   5. Que no se pase del número de archivos que ese formulario pide. Es el
 *      tope que evita que una inscripción legítima se use para subir mil.
 *
 * Y UNA SEXTA, la de la ventana de tiempo: sólo se aceptan documentos de una
 * inscripción RECIBIDA y de hace menos de un día. Una inscripción ya revisada
 * no cambia, y el enlace de una de hace tres meses no sirve para subir nada.
 *
 * EL NOMBRE DEL ARCHIVO NO SE USA PARA LA RUTA. Lo pone quien sube, así que
 * puede traer `../`, caracteres de control o doscientos caracteres de nada. La
 * ruta se construye con el id de la inscripción y el `kind`, los dos nuestros;
 * el nombre original se guarda en la fila, sólo para enseñárselo al club.
 */

import { admin, error, json } from './_comun.mts';

/* Lo mismo que declara el cubo en la migración. Repetido aquí a propósito: el
   cubo rechazaría el archivo igual, pero así el motivo se explica en
   castellano en vez de llegar como un error de Storage. */
const MIMES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf']);
const TOPE_BYTES = 10 * 1024 * 1024;
/* Un poco más de los que pide el formulario, por si el club añade uno a mitad
   de temporada y una familia sube el nuevo sin quitar el viejo. */
const MARGEN_DE_ARCHIVOS = 4;

const EXTENSION: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp',
  'image/heic': 'heic', 'application/pdf': 'pdf',
};

export default async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') return error('Método no permitido.', 405);

  let formulario: FormData;
  try {
    formulario = await req.formData();
  } catch {
    return error('No hemos podido leer el archivo.', 400);
  }

  const inscripcionId = String(formulario.get('inscripcion') ?? '');
  const token = String(formulario.get('token') ?? '');
  const kind = String(formulario.get('kind') ?? '');
  const archivo = formulario.get('archivo');

  if (!inscripcionId || !token || !kind) return error('Falta algún dato de la subida.', 400);
  if (!(archivo instanceof File)) return error('No llega ningún archivo.', 400);

  /* 4 · tipo y tamaño, antes de hablar con la base de datos. */
  if (archivo.size === 0) return error('El archivo está vacío.', 400);
  if (archivo.size > TOPE_BYTES) return error('El archivo pesa más de 10 MB.', 413);
  if (!MIMES.has(archivo.type)) {
    return error('Tiene que ser una imagen (JPG, PNG, HEIC o WEBP) o un PDF.', 415);
  }

  const sb = admin();

  /* 1 · el formulario, por su token, y abierto. */
  const { data: form, error: eForm } = await sb
    .from('enrollment_forms')
    .select('id, club_id, status, documentos')
    .eq('token', token)
    .maybeSingle();

  if (eForm) return error('No hemos podido comprobar el formulario.', 500);
  if (!form || form.status !== 'abierta') return error('Este formulario no está abierto.', 403);

  /* 3 · que el documento sea uno de los que se piden. */
  const pedidos: { id?: string }[] = Array.isArray(form.documentos) ? form.documentos : [];
  if (!pedidos.some((d) => d?.id === kind)) {
    return error('Ese documento no es de este formulario.', 400);
  }

  /* 2 y 6 · la inscripción: de ESE formulario, sin revisar y reciente. */
  const { data: ins, error: eIns } = await sb
    .from('enrollments')
    .select('id, club_id, form_id, status, created_at')
    .eq('id', inscripcionId)
    .maybeSingle();

  if (eIns) return error('No hemos podido comprobar la inscripción.', 500);
  /* EL MISMO MENSAJE PARA «NO EXISTE» Y «NO ES TUYA», y es a propósito:
     distinguirlos le diría a quien prueba ids si ha acertado con uno. */
  if (!ins || ins.form_id !== form.id) return error('Esa inscripción no es de este formulario.', 403);
  if (ins.status !== 'recibida') return error('Esta inscripción ya está revisada.', 409);

  const horas = (Date.now() - new Date(ins.created_at as string).getTime()) / 36e5;
  if (horas > 24) return error('El plazo para añadir documentos a esta inscripción ha pasado.', 409);

  /* 5 · cuántos lleva ya. */
  const { count, error: eCuenta } = await sb
    .from('enrollment_documents')
    .select('id', { count: 'exact', head: true })
    .eq('enrollment_id', inscripcionId);
  if (eCuenta) return error('No hemos podido comprobar los documentos.', 500);
  if ((count ?? 0) >= pedidos.length + MARGEN_DE_ARCHIVOS) {
    return error('Ya hay demasiados archivos en esta inscripción.', 409);
  }

  /* LA RUTA LA PONEMOS NOSOTROS. Nada de lo que viene en el nombre original
     entra aquí. `upsert` para que reintentar el mismo documento lo sustituya
     en vez de dejar dos. */
  const ruta = `${form.club_id}/${inscripcionId}/${kind}.${EXTENSION[archivo.type]}`;

  const { error: eSubida } = await sb.storage
    .from('inscripciones')
    .upload(ruta, archivo, { contentType: archivo.type, upsert: true });

  if (eSubida) return error('No hemos podido guardar el archivo.', 502);

  /* LA FILA, DESPUÉS DEL ARCHIVO. Si fallara al revés —fila primero— el club
     vería un documento que no se puede abrir. Así, lo peor que queda es un
     archivo en el cubo sin fila, que no se enseña y no engaña a nadie. */
  const { error: eFila } = await sb
    .from('enrollment_documents')
    .upsert({
      enrollment_id: inscripcionId,
      club_id: form.club_id,
      kind,
      storage_path: ruta,
      /* El nombre original, recortado y sin saltos de línea: se enseña, no se
         ejecuta ni se usa para ninguna ruta. */
      filename: (archivo.name || 'documento').replace(/[\r\n]/g, ' ').slice(0, 200),
      mime: archivo.type,
      size_bytes: archivo.size,
    }, { onConflict: 'storage_path' });

  if (eFila) return error('El archivo se ha guardado pero no hemos podido anotarlo.', 500);

  return json({ ok: true });
};
