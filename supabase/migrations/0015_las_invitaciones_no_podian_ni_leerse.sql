-- ════════════════════════════════════════════════════════════════════════════
-- LAS INVITACIONES NO FUNCIONABAN, Y NO ERA LA PANTALLA
-- ════════════════════════════════════════════════════════════════════════════
--
-- Ninguna invitación llegó nunca a la tabla: cero filas desde el primer día.
-- No fallaba el formulario ni el servicio. Fallaba la política de acceso.
--
-- `invitations_own` existe para que quien recibe una invitación pueda verla
-- aunque todavía no pertenezca al club, y comprobaba el correo así:
--
--     lower(email) = lower(coalesce(
--       (select users.email from auth.users where users.id = auth.uid()), ''))
--
-- Leer `auth.users` desde una política es el problema. Ese esquema pertenece a
-- Supabase y el rol `authenticated` no tiene permiso sobre él, así que
-- cualquier consulta a `invitations` —la del club incluida, que va por la otra
-- política— se caía antes de empezar:
--
--     ERROR: 42501: permission denied for table users
--
-- Postgres evalúa las políticas aplicables aunque la fila no tenga nada que
-- ver con ésta, y el `returning` de un `insert` también pasa por la de lectura.
-- Resultado: listar invitaciones fallaba, y crear una fallaba también. Las dos
-- cosas que hay en esa pantalla.
--
-- ── EL ARREGLO ──────────────────────────────────────────────────────────────
--
-- Una función que sepa el correo de quien llama sin pedirle permiso a nadie:
--
--  1. Primero del testigo (`auth.jwt() ->> 'email'`), que ya viaja en cada
--     petición y no toca ninguna tabla.
--  2. Y si ahí no viniera —puede pasar con un testigo viejo o con un alta por
--     otro medio—, de `auth.users`, pero desde dentro de una función
--     `security definer`, que es la manera de leer ese esquema sin repartir
--     permiso sobre él.
--
-- `search_path` va fijado: una función `security definer` sin eso es la forma
-- clásica de que alguien la engañe plantando una tabla con el mismo nombre.
--
-- NO SE AMPLÍA NADA. La regla es la misma de antes —ves las invitaciones
-- dirigidas a tu correo— y el resto de políticas no se tocan. Lo único que
-- cambia es que ahora se puede evaluar sin reventar.
--
-- Aditiva y compatible: no borra filas, no toca datos y se puede aplicar sobre
-- una base en uso.

-- ── El correo de quien llama ────────────────────────────────────────────────
create or replace function public.correo_de_la_sesion()
returns text
language sql
stable
security definer
set search_path = public, auth
as $$
  select nullif(
    coalesce(
      nullif(auth.jwt() ->> 'email', ''),
      (select u.email::text from auth.users u where u.id = auth.uid())
    ),
    ''
  );
$$;

comment on function public.correo_de_la_sesion() is
  'El correo de quien hace la petición. Existe para que las políticas no tengan '
  'que leer auth.users, que el rol authenticated no puede ni mirar.';

revoke all on function public.correo_de_la_sesion() from public;
grant execute on function public.correo_de_la_sesion() to authenticated, anon;

-- ── La política, con la misma regla y sin el fallo ──────────────────────────
drop policy if exists invitations_own on public.invitations;

create policy invitations_own on public.invitations
  for select
  using (lower(email) = lower(coalesce(public.correo_de_la_sesion(), '')));
