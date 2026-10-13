-- ════════════════════════════════════════════════════════════════════════════
-- CORREO: EL CONSENTIMIENTO PRIMERO, Y LA CUENTA DE LO QUE SE HA MANDADO.
-- ════════════════════════════════════════════════════════════════════════════
--
-- Hasta hoy esta aplicación no manda un solo correo propio. Los únicos que
-- salen son los de Supabase Auth —confirmar el alta y recuperar la contraseña—
-- y ésos no los decide este código.
--
-- Se quieren tres cosas: la guía al darse de alta, novedades del producto, y
-- un aviso cuando alguien lleva tiempo sin aparecer. Y no son la misma cosa
-- ante la ley, así que tampoco lo son aquí.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- POR QUÉ ESTA TABLA EXISTE ANTES QUE NINGÚN CORREO
-- ─────────────────────────────────────────────────────────────────────────────
--
-- LA GUÍA AL DARSE DE ALTA NO NECESITA PERMISO. Es un correo de servicio: va
-- una sola vez, a quien acaba de crear una cuenta, y explica lo que acaba de
-- contratar. Eso es parte de prestar el servicio.
--
-- LAS NOVEDADES SÍ. Son comunicaciones comerciales: la LSSI (art. 21) las
-- prohíbe sin consentimiento previo, y el RGPD exige poder DEMOSTRAR que se
-- dio. «Demostrar» quiere decir guardar cuándo y desde dónde, y por eso hay
-- tres columnas y no un `boolean` suelto. Una casilla marcada de antemano no
-- vale: el consentimiento es un acto, así que el valor por defecto es `false`.
--
-- EL AVISO POR INACTIVIDAD VA CON LAS NOVEDADES. Se puede discutir si es
-- servicio o reclamo, y cuando algo se puede discutir se pide permiso. Quien
-- no lo dé no recibe ninguno.
--
-- `unsubscribe_token` es para poder darse de baja SIN ENTRAR. Un enlace de
-- baja que te obliga a iniciar sesión no es un enlace de baja; y la ley pide
-- un medio sencillo y gratuito en cada mensaje.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- Y POR QUÉ SE APUNTA CADA ENVÍO
-- ─────────────────────────────────────────────────────────────────────────────
--
-- `emails_enviados` es lo que hace que un correo no se mande dos veces. La
-- bienvenida se dispara desde el navegador al terminar el alta, pero un
-- navegador se cierra, se queda sin red o el alta termina en otra pestaña, así
-- que una ronda programada repasa a diario quién se quedó sin ella. Con dos
-- caminos hacia el mismo envío hace falta un sitio donde conste que ya salió,
-- y la clave primaria lo impone: no es que el código se acuerde de mirar, es
-- que la base de datos no deja meterlo dos veces.
--
-- Para el aviso por inactividad guarda además la fecha, que es lo que evita
-- que se mande todas las semanas a la misma persona.
--
-- ADITIVA e idempotente. No borra nada ni toca ninguna fila existente.
-- Requiere 0001 (profiles).
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1 · El permiso, con su prueba ───────────────────────────────────────────

alter table public.profiles
  add column if not exists marketing_consent     boolean not null default false,
  add column if not exists marketing_consent_at  timestamptz,
  add column if not exists marketing_consent_src text,
  add column if not exists unsubscribe_token     uuid not null default gen_random_uuid();

comment on column public.profiles.marketing_consent is
  'Permiso para novedades y avisos por inactividad. Falso por defecto: el '
  'consentimiento es un acto, no una casilla premarcada. No cubre los correos '
  'de servicio (la guía del alta), que no lo necesitan.';
comment on column public.profiles.marketing_consent_at is
  'Cuándo se dio o se retiró. El RGPD pide poder demostrarlo.';
comment on column public.profiles.marketing_consent_src is
  'Desde dónde: «alta» o «ajustes». La otra mitad de la prueba.';
comment on column public.profiles.unsubscribe_token is
  'Para darse de baja desde el enlace del correo sin tener que iniciar sesión.';

-- El token no puede repetirse entre personas: es lo único que identifica a
-- quien pulsa el enlace de baja.
create unique index if not exists profiles_unsubscribe_token_key
  on public.profiles (unsubscribe_token);

-- ── 1 bis · Que el permiso llegue desde el alta ─────────────────────────────
--
-- La casilla se marca ANTES de que exista el perfil: en ese momento no hay
-- fila que actualizar, y además la persona puede no tener sesión todavía si
-- hace falta confirmar el correo. Así que el navegador lo manda dentro de los
-- metadatos del alta —donde ya viaja `full_name`— y lo copia quien crea el
-- perfil.
--
-- `asegurar_perfil()` se redefine entera porque así es como se cambia una
-- función en Postgres. Lo único nuevo son las dos columnas del final; el
-- resto es idéntico a 0010, incluido el `on conflict do nothing` que hace que
-- un perfil que ya existe no se toque: el permiso se copia al crearlo, una
-- vez, y a partir de ahí manda lo que diga Ajustes.

create or replace function public.asegurar_perfil()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  quien  uuid := auth.uid();
  creado boolean := false;
begin
  if quien is null then
    raise exception 'Hace falta iniciar sesión.' using errcode = '42501';
  end if;

  if exists (select 1 from public.profiles where id = quien) then
    return false;
  end if;

  insert into public.profiles (
    id, full_name, email, role, marketing_consent, marketing_consent_at, marketing_consent_src
  )
  select
    u.id,
    coalesce(nullif(trim(u.raw_user_meta_data ->> 'full_name'), ''), split_part(u.email, '@', 1)),
    u.email,
    'entrenadora',
    coalesce((u.raw_user_meta_data ->> 'marketing_consent')::boolean, false),
    case when coalesce((u.raw_user_meta_data ->> 'marketing_consent')::boolean, false)
         then coalesce(u.created_at, now()) end,
    case when coalesce((u.raw_user_meta_data ->> 'marketing_consent')::boolean, false)
         then 'alta' end
  from auth.users u
  where u.id = quien
  on conflict (id) do nothing;

  get diagnostics creado = row_count;
  return creado;
end;
$$;

revoke all on function public.asegurar_perfil() from public, anon, authenticated;
grant execute on function public.asegurar_perfil() to authenticated;

comment on function public.asegurar_perfil() is
  'Crea el perfil de quien llama si falta. Desde 0017 copia también el '
  'consentimiento de novedades que viajó en los metadatos del alta.';

-- ── 2 · Qué se le ha mandado a quién ────────────────────────────────────────

create table if not exists public.emails_enviados (
  profile_id uuid        not null references public.profiles (id) on delete cascade,
  tipo       text        not null,
  enviado_at timestamptz not null default now(),
  primary key (profile_id, tipo)
);

comment on table public.emails_enviados is
  'Un renglón por correo propio enviado. La clave primaria es lo que impide '
  'que el mismo correo salga dos veces, vengan de donde vengan las dos '
  'llamadas. Los correos de Supabase Auth no pasan por aquí.';

-- ── 3 · Cerrada ─────────────────────────────────────────────────────────────
--
-- Nadie lee ni escribe esta tabla desde el navegador. La escribe la función de
-- Netlify con la clave de servicio, que se salta las políticas. Igual que
-- `user_passcodes` en 0009: RLS encendida y ni una política es la forma de
-- decir «por la API pública, nada».

alter table public.emails_enviados enable row level security;
revoke all on public.emails_enviados from anon, authenticated;


-- ════════════════════════════════════════════════════════════════════════════
-- VERIFICACIÓN
-- ════════════════════════════════════════════════════════════════════════════

-- 1) Nadie tiene permiso sin haberlo dado. Al añadir la columna con `default
--    false`, todos los perfiles que ya existían quedan sin consentimiento, que
--    es exactamente lo correcto: nunca se les preguntó.
do $$
declare
  con_permiso int;
  total       int;
begin
  select count(*) filter (where marketing_consent), count(*)
    into con_permiso, total
    from public.profiles;
  if con_permiso > 0 then
    raise exception
      'Hay % perfil(es) con consentimiento sin que nadie lo haya pedido', con_permiso;
  end if;
  raise notice '% perfiles, ninguno con consentimiento todavía. Correcto.', total;
end $$;

-- 2) Todos tienen token de baja, y ninguno repetido.
do $$
declare
  sin_token int;
  repetidos int;
begin
  select count(*) into sin_token from public.profiles where unsubscribe_token is null;
  select count(*) into repetidos from (
    select unsubscribe_token from public.profiles
     group by unsubscribe_token having count(*) > 1
  ) t;
  if sin_token > 0 or repetidos > 0 then
    raise exception 'Tokens de baja mal: % sin token, % repetidos', sin_token, repetidos;
  end if;
  raise notice 'Todos los perfiles tienen un token de baja único.';
end $$;

-- 3) La tabla de envíos no se puede tocar desde la API pública.
do $$
declare n int;
begin
  select count(*) into n
    from information_schema.role_table_grants
   where table_schema = 'public'
     and table_name   = 'emails_enviados'
     and grantee in ('anon', 'authenticated');
  if n > 0 then
    raise exception 'emails_enviados tiene % permiso(s) para anon/authenticated', n;
  end if;
  raise notice 'emails_enviados: cerrada a la API pública.';
end $$;
