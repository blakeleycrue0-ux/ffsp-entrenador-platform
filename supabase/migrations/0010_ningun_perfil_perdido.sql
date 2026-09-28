-- ════════════════════════════════════════════════════════════════════════════
-- 0010 · Que no se pueda quedar una cuenta sin perfil
-- ════════════════════════════════════════════════════════════════════════════
--
-- EL FALLO. Al crear un club salía en pantalla, en crudo:
--
--     insert or update on table "clubs" violates foreign key
--     constraint "clubs_created_by_fkey"
--
-- `clubs.created_by` apunta a `profiles(id)`. Quien no tenga fila en
-- `profiles` no puede crear club, y como `db.updateProfile` hace un UPDATE,
-- tampoco podía guardar su nombre: actualizaba cero filas sin decir nada. La
-- cuenta se quedaba viva pero inservible.
--
-- POR QUÉ PASÓ. El perfil lo crea un disparador sobre `auth.users`. El
-- disparador existe, está activo y funciona —probado insertando un usuario
-- dentro de una transacción revertida: crea el perfil—. Pero en esta base
-- había NUEVE usuarios y CERO perfiles, así que en algún momento esas filas no
-- llegaron a crearse o se fueron. Da igual cuál de las dos: el problema real
-- es que sólo había UN camino para crear un perfil y ninguna manera de
-- recuperarse si ese camino fallaba una vez.
--
-- Y no la había a propósito sin querer: `profiles` NO TIENE NINGUNA POLÍTICA
-- DE INSERT. Es lo correcto —nadie debe poder fabricarse un perfil con el
-- identificador de otra— pero deja al cliente sin forma de arreglarlo.
--
-- LA SOLUCIÓN son tres cosas:
--
--   1. Una función que crea el perfil de QUIEN LLAMA y de nadie más. No
--      recibe identificador: usa `auth.uid()`, así que sigue sin poder
--      fabricarse el perfil de otra persona, y se puede llamar mil veces
--      porque no hace nada si ya existe.
--   2. `create_club` la llama antes de insertar. Aunque el cliente se olvide,
--      crear un club deja de depender de que el disparador acertara.
--   3. Las cuentas que ya están atrapadas recuperan su perfil.
--
-- Es ADITIVA: no borra tablas ni filas, no toca la autenticación, no cambia
-- ninguna política y no renombra nada. Idempotente. Requiere 0001.
-- ════════════════════════════════════════════════════════════════════════════

/**
 * Crea el perfil de quien llama si le falta. Devuelve `true` si lo ha tenido
 * que crear.
 *
 * Los datos salen de `auth.users`, que es la fuente: el nombre del metadato
 * `full_name` y, si no lo hay, la parte del correo anterior a la arroba —lo
 * mismo que hace el disparador de alta, para que una cuenta recuperada no se
 * vea distinta de una recién creada.
 */
create or replace function public.asegurar_perfil()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  quien uuid := auth.uid();
  creado boolean := false;
begin
  if quien is null then
    raise exception 'Hace falta iniciar sesión.' using errcode = '42501';
  end if;

  if exists (select 1 from public.profiles where id = quien) then
    return false;
  end if;

  insert into public.profiles (id, full_name, email, role)
  select
    u.id,
    coalesce(nullif(trim(u.raw_user_meta_data ->> 'full_name'), ''), split_part(u.email, '@', 1)),
    u.email,
    'entrenadora'
  from auth.users u
  where u.id = quien
  on conflict (id) do nothing;

  get diagnostics creado = row_count;
  return creado;
end;
$$;

revoke all on function public.asegurar_perfil() from public, anon, authenticated;
grant execute on function public.asegurar_perfil() to authenticated;

/**
 * Crear club, ahora sin depender de que el perfil exista.
 *
 * Es la misma función de antes con una línea más al principio. Se deja aquí
 * entera porque `create or replace` lo exige, no porque haya cambiado el
 * resto.
 */
create or replace function public.create_club(club_name text, club_short_name text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  nuevo public.clubs;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'sin_sesion');
  end if;
  if coalesce(trim(club_name), '') = '' then
    return jsonb_build_object('ok', false, 'error', 'sin_nombre');
  end if;

  /* Sin esto, a quien le falte el perfil le sale un error de clave foránea en
     bruto y se queda sin poder empezar. */
  perform public.asegurar_perfil();

  insert into public.clubs (name, short_name, created_by)
  values (trim(club_name), coalesce(nullif(trim(club_short_name), ''), trim(club_name)), auth.uid())
  returning * into nuevo;

  insert into public.club_members (club_id, profile_id, role)
  values (nuevo.id, auth.uid(), 'admin')
  on conflict (club_id, profile_id) do update set role = 'admin';

  return jsonb_build_object(
    'ok', true,
    'id', nuevo.id,
    'name', nuevo.name,
    'short_name', nuevo.short_name
  );
end;
$$;

/* ─────────────────────── Las cuentas ya atrapadas ────────────────────────── */
/*
 * Sólo AÑADE los perfiles que faltan. No toca ni una fila existente: el
 * `where not exists` deja fuera a todo el que ya tenga el suyo.
 */
insert into public.profiles (id, full_name, email, role)
select
  u.id,
  coalesce(nullif(trim(u.raw_user_meta_data ->> 'full_name'), ''), split_part(u.email, '@', 1)),
  u.email,
  'entrenadora'
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id)
on conflict (id) do nothing;
