-- ════════════════════════════════════════════════════════════════════════════
-- 0011 · Subir el escudo del club
-- ════════════════════════════════════════════════════════════════════════════
--
-- QUÉ FALTABA. `clubs.crest_url` existía desde el principio, pero no había
-- dónde guardar la imagen: en la pantalla ponía, literalmente, «todavía no se
-- pueden subir archivos: pega una URL pública». Eso no lo hace nadie. Para
-- tener el escudo del club había que subir el archivo a otro sitio, copiar la
-- dirección y pegarla aquí, así que en la práctica la mayoría de los clubes se
-- quedaban con sus iniciales.
--
-- QUÉ SE AÑADE. Un cubo de almacenamiento, `escudos`, y sus reglas de acceso.
-- Nada más: ninguna tabla cambia, ninguna fila se toca y ninguna política
-- existente se modifica.
--
-- CÓMO SE ORDENA. Cada archivo vive bajo la carpeta del club al que pertenece:
--
--     escudos/<id del club>/<marca de tiempo>.<extensión>
--
-- y de ahí sale el permiso: para escribir en la carpeta de un club hay que
-- administrar ESE club. La comprobación la hace `public.is_club_admin`, que ya
-- es la que decide el resto de permisos del club; aquí no se inventa ninguna
-- regla nueva, se reutiliza la que ya hay.
--
-- POR QUÉ EL CUBO ES PÚBLICO DE LECTURA. El escudo se pinta con un `<img>` en
-- la barra lateral, en la pantalla de bloqueo y en las convocatorias. Una
-- dirección firmada caduca y habría que renovarla en cada pantalla; y un
-- escudo no es un dato personal: es el emblema del club, que ya está en su
-- página y en sus camisetas. **Escribir sigue estando cerrado.**
--
-- Lo que NO se puede subir aquí: sólo imágenes de mapa de bits y hasta 2 MB.
-- Sin SVG a propósito, que es un formato que puede traer cosas dentro.
-- ════════════════════════════════════════════════════════════════════════════

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'escudos',
  'escudos',
  true,
  2097152,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

/**
 * El club al que pertenece una ruta de archivo, o NULL si la ruta no tiene la
 * forma esperada.
 *
 * El porqué de la comprobación: la primera carpeta se convierte a uuid, y
 * convertir un texto cualquiera a uuid LANZA UN ERROR en lugar de devolver
 * nulo. Dentro de una política eso no es un detalle: quien suba un archivo a
 * `escudos/loquesea/x.png` reventaría la comprobación en vez de que se le
 * denegara limpiamente. Por eso se mira la forma antes de convertir.
 */
create or replace function public.club_de_la_ruta(ruta text)
returns uuid
language sql
immutable
set search_path = public
as $$
  select case
    when (storage.foldername(ruta))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then ((storage.foldername(ruta))[1])::uuid
  end;
$$;

revoke all on function public.club_de_la_ruta(text) from public;
grant execute on function public.club_de_la_ruta(text) to anon, authenticated;

/* ─────────────────────────── Quién puede qué ─────────────────────────────── */

drop policy if exists "escudos a la vista" on storage.objects;
create policy "escudos a la vista"
  on storage.objects for select
  using (bucket_id = 'escudos');

drop policy if exists "escudo: sube quien administra el club" on storage.objects;
create policy "escudo: sube quien administra el club"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'escudos'
    and public.is_club_admin(public.club_de_la_ruta(name))
  );

drop policy if exists "escudo: cambia quien administra el club" on storage.objects;
create policy "escudo: cambia quien administra el club"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'escudos'
    and public.is_club_admin(public.club_de_la_ruta(name))
  );

drop policy if exists "escudo: borra quien administra el club" on storage.objects;
create policy "escudo: borra quien administra el club"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'escudos'
    and public.is_club_admin(public.club_de_la_ruta(name))
  );
