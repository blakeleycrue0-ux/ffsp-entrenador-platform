-- ════════════════════════════════════════════════════════════════════════════
-- LO QUE SUPABASE TRAE PUESTO Y UN POSTGRES DESNUDO NO
-- ════════════════════════════════════════════════════════════════════════════
-- Esto NO se sube a ninguna parte: vive sólo en el Postgres de prueba de este
-- contenedor. Sirve para una cosa que no se puede hacer contra el servidor de
-- verdad: ejecutar las 27 migraciones desde cero, hacerme pasar por un tutor
-- y comprobar qué ve y qué no. Lo que falle aquí, falla allí.
--
-- NO INTENTA IMITAR A SUPABASE ENTERO. Imita exactamente aquello en lo que se
-- apoyan las migraciones: el esquema `auth` con su `uid()`, los tres roles,
-- `storage.buckets` y las extensiones.

create extension if not exists pgcrypto;
create extension if not exists "uuid-ossp";

create schema if not exists auth;
create schema if not exists storage;
create schema if not exists extensions;

-- Los roles de PostgREST.
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin noinherit bypassrls;
  end if;
end $$;

grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to service_role;

-- auth.users: sólo las columnas que mira el proyecto.
create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  raw_user_meta_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

/* auth.uid() de verdad lee el JWT. Aquí lee una variable de sesión, que es lo
   que permite hacerse pasar por alguien: `set local request.jwt.claim.sub`. */
create or replace function auth.uid() returns uuid
language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

create or replace function auth.role() returns text
language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), current_user);
$$;

create or replace function auth.email() returns text
language sql stable as $$
  select nullif(current_setting('request.jwt.claim.email', true), '');
$$;

-- storage, lo justo para que 0027 pueda declarar su cubo privado.
create table if not exists storage.buckets (
  id text primary key,
  name text not null,
  public boolean not null default false,
  file_size_limit bigint,
  allowed_mime_types text[],
  created_at timestamptz not null default now()
);

create table if not exists storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets(id),
  name text,
  owner uuid,
  metadata jsonb,
  created_at timestamptz not null default now()
);
alter table storage.objects enable row level security;

grant usage on schema auth, storage to anon, authenticated, service_role;
grant select on auth.users to anon, authenticated, service_role;

-- Dos que faltaban y que Supabase sí trae: las descubrió el primer intento.
create or replace function storage.foldername(name text) returns text[]
language sql immutable as $$
  select (string_to_array(name, '/'))[1:greatest(array_length(string_to_array(name, '/'), 1) - 1, 0)];
$$;

create or replace function auth.jwt() returns jsonb
language sql stable as $$
  select jsonb_build_object(
    'sub',   nullif(current_setting('request.jwt.claim.sub',   true), ''),
    'email', nullif(current_setting('request.jwt.claim.email', true), ''),
    'role',  nullif(current_setting('request.jwt.claim.role',  true), '')
  );
$$;
