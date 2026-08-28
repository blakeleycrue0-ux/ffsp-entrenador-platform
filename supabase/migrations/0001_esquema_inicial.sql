-- ============================================================================
-- FFSP — Esquema inicial
-- ----------------------------------------------------------------------------
-- Ejecutar UNA VEZ en el editor SQL de Supabase:
--   Panel de Supabase → SQL Editor → New query → pegar todo → Run
--
-- Modelo de seguridad:
--   · Todas las tablas tienen RLS activado. Sin sesión no se lee ni se escribe
--     absolutamente nada (la clave anónima por sí sola no da acceso a datos).
--   · Un entrenador sólo ve los equipos que tiene asignados en `team_staff`.
--   · El coordinador del club crea equipos y asigna entrenadores.
--   · El PRIMER usuario que se registre queda como coordinador automáticamente.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ─────────────────────────────── Tipos ──────────────────────────────────────

do $$ begin
  create type staff_role as enum (
    'entrenadora', 'segunda-entrenadora', 'preparadora-fisica',
    'directora-deportiva', 'coordinadora', 'admin-club'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type availability_status as enum (
    'disponible', 'lesionada', 'enferma', 'ausente', 'sancionada', 'duda'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type session_status as enum ('borrador', 'planificado', 'completado');
exception when duplicate_object then null; end $$;

do $$ begin
  create type match_status as enum ('programado', 'jugado', 'aplazado');
exception when duplicate_object then null; end $$;

do $$ begin
  create type callup_status as enum ('borrador', 'enviada');
exception when duplicate_object then null; end $$;

do $$ begin
  create type message_status as enum (
    'borrador', 'programado', 'enviado', 'entregado', 'leido', 'respondido'
  );
exception when duplicate_object then null; end $$;

-- ─────────────────────────────── Perfiles ───────────────────────────────────

create table if not exists public.profiles (
  id          uuid primary key references auth.users on delete cascade,
  full_name   text not null default '',
  email       text,
  phone       text,
  licence     text,
  role        staff_role not null default 'entrenadora',
  avatar_url  text,
  created_at  timestamptz not null default now()
);

-- Crea el perfil al registrarse. El primer usuario del club es coordinador.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_first boolean;
begin
  select count(*) = 0 into is_first from public.profiles;

  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.email,
    case when is_first then 'coordinadora'::staff_role else 'entrenadora'::staff_role end
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ──────────────────────────────── Equipos ───────────────────────────────────

create table if not exists public.teams (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  category       text not null default '',
  season         text not null default '',
  competition    text not null default '',
  venue          text not null default '',
  training_slots jsonb not null default '[]'::jsonb,
  created_by     uuid references public.profiles(id) on delete set null,
  created_at     timestamptz not null default now()
);

create table if not exists public.team_staff (
  team_id    uuid not null references public.teams(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role       staff_role not null default 'entrenadora',
  created_at timestamptz not null default now(),
  primary key (team_id, profile_id)
);

-- ──────────────────────── Funciones de autorización ─────────────────────────
-- `security definer` para poder consultar sin recursión dentro de las políticas.

create or replace function public.is_coordinator()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('coordinadora', 'directora-deportiva', 'admin-club')
  );
$$;

create or replace function public.has_team_access(target uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select public.is_coordinator()
      or exists (
        select 1 from public.team_staff
        where team_id = target and profile_id = auth.uid()
      );
$$;


-- ─────────────────────────────── Jugadoras ──────────────────────────────────

create table if not exists public.players (
  id                   uuid primary key default gen_random_uuid(),
  team_id              uuid not null references public.teams(id) on delete cascade,
  name                 text not null,
  short_name           text not null default '',
  number               int  not null default 0,
  position             text not null default '',
  secondary_position   text,
  foot                 text not null default 'Diestra',
  birth_date           date,
  phone                text,
  email                text,
  photo_url            text,
  guardians            jsonb not null default '[]'::jsonb,
  availability_status  availability_status not null default 'disponible',
  availability_note    text,
  availability_since   date,
  availability_until   date,
  stats                jsonb not null default
    '{"matches":0,"minutes":0,"goals":0,"assists":0,"yellow":0,"red":0}'::jsonb,
  notes                text,
  joined_at            date not null default current_date,
  created_at           timestamptz not null default now()
);
create index if not exists players_team_idx on public.players(team_id);

-- ─────────────────────────────── Ejercicios ─────────────────────────────────

create table if not exists public.drills (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  objective     text not null default '',
  tags          text[] not null default '{}',
  age_range     text not null default '',
  players_range text not null default '',
  duration      int not null default 15,
  material      text[] not null default '{}',
  description   text not null default '',
  progressions  text[] not null default '{}',
  tactic        jsonb not null default '[]'::jsonb,
  created_by    uuid references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now()
);

-- Favoritos por persona, no por club.
create table if not exists public.drill_favorites (
  drill_id   uuid not null references public.drills(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  primary key (drill_id, profile_id)
);

-- ──────────────────────────── Entrenamientos ────────────────────────────────

create table if not exists public.sessions (
  id               uuid primary key default gen_random_uuid(),
  team_id          uuid not null references public.teams(id) on delete cascade,
  title            text not null,
  date             date not null,
  start_time       text not null default '19:00',
  duration         int not null default 0,
  venue            text not null default '',
  objective        text not null default '',
  expected_players int not null default 0,
  material         text[] not null default '{}',
  notes            text,
  blocks           jsonb not null default '[]'::jsonb,
  status           session_status not null default 'borrador',
  generated_by_ai  boolean not null default false,
  created_by       uuid references public.profiles(id) on delete set null,
  created_at       timestamptz not null default now()
);
create index if not exists sessions_team_date_idx on public.sessions(team_id, date);

-- ────────────────────────────── Partidos ────────────────────────────────────

create table if not exists public.matches (
  id           uuid primary key default gen_random_uuid(),
  team_id      uuid not null references public.teams(id) on delete cascade,
  opponent     text not null,
  competition  text not null default '',
  date         date not null,
  start_time   text not null default '17:00',
  venue        text not null default '',
  home         boolean not null default true,
  matchday     int,
  status       match_status not null default 'programado',
  result_own   int,
  result_rival int,
  formation    text,
  notes        text,
  created_by   uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now()
);
create index if not exists matches_team_date_idx on public.matches(team_id, date);

-- ──────────────────────────── Convocatorias ─────────────────────────────────

create table if not exists public.callups (
  id            uuid primary key default gen_random_uuid(),
  match_id      uuid not null unique references public.matches(id) on delete cascade,
  team_id       uuid not null references public.teams(id) on delete cascade,
  slots         int not null default 16,
  meeting_time  text not null default '',
  meeting_place text not null default '',
  kit           text not null default '',
  notes         text,
  entries       jsonb not null default '[]'::jsonb,
  status        callup_status not null default 'borrador',
  sent_at       timestamptz,
  created_at    timestamptz not null default now()
);

-- ────────────────────────────── Asistencia ──────────────────────────────────

create table if not exists public.attendance (
  id         uuid primary key default gen_random_uuid(),
  session_id uuid not null unique references public.sessions(id) on delete cascade,
  team_id    uuid not null references public.teams(id) on delete cascade,
  date       date not null,
  marks      jsonb not null default '{}'::jsonb,
  saved_at   timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null
);
create index if not exists attendance_team_date_idx on public.attendance(team_id, date);

-- ─────────────────────── Mensajes y plantillas ──────────────────────────────

create table if not exists public.message_templates (
  id          uuid primary key default gen_random_uuid(),
  kind        text not null,
  name        text not null,
  description text not null default '',
  body        text not null,
  variables   text[] not null default '{}',
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);

create table if not exists public.messages (
  id            uuid primary key default gen_random_uuid(),
  team_id       uuid not null references public.teams(id) on delete cascade,
  player_id     uuid references public.players(id) on delete set null,
  channel       text not null default 'whatsapp',
  kind          text not null default 'general',
  scope         text not null default 'equipo',
  subject       text not null default '',
  body          text not null default '',
  status        message_status not null default 'borrador',
  scheduled_for timestamptz,
  sent_at       timestamptz,
  recipients    int not null default 0,
  responses     jsonb,
  simulated     boolean not null default true,
  created_by    uuid references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now()
);
create index if not exists messages_team_idx on public.messages(team_id, created_at desc);

-- ─────────────────── Tareas, avisos y actividad ─────────────────────────────

create table if not exists public.tasks (
  id         uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  team_id    uuid references public.teams(id) on delete cascade,
  title      text not null,
  detail     text,
  done       boolean not null default false,
  due_date   date,
  priority   text not null default 'media',
  link       text,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  icon       text not null default 'alerta',
  title      text not null,
  detail     text,
  link       text,
  read       boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.activity (
  id         uuid primary key default gen_random_uuid(),
  team_id    uuid references public.teams(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete set null,
  kind       text not null default 'sesion',
  text       text not null,
  link       text,
  created_at timestamptz not null default now()
);
create index if not exists activity_team_idx on public.activity(team_id, created_at desc);

-- ============================================================================
-- SEGURIDAD POR FILAS
-- ============================================================================

alter table public.profiles          enable row level security;
alter table public.teams             enable row level security;
alter table public.team_staff        enable row level security;
alter table public.players           enable row level security;
alter table public.drills            enable row level security;
alter table public.drill_favorites   enable row level security;
alter table public.sessions          enable row level security;
alter table public.matches           enable row level security;
alter table public.callups           enable row level security;
alter table public.attendance        enable row level security;
alter table public.message_templates enable row level security;
alter table public.messages          enable row level security;
alter table public.tasks             enable row level security;
alter table public.notifications     enable row level security;
alter table public.activity          enable row level security;

-- Perfiles ───────────────────────────────────────────────────────────────────
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_coordinator());

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists profiles_update_coord on public.profiles;
create policy profiles_update_coord on public.profiles for update to authenticated
  using (public.is_coordinator()) with check (public.is_coordinator());

-- Equipos ────────────────────────────────────────────────────────────────────
drop policy if exists teams_select on public.teams;
create policy teams_select on public.teams for select to authenticated
  using (public.has_team_access(id));

drop policy if exists teams_write on public.teams;
create policy teams_write on public.teams for all to authenticated
  using (public.is_coordinator()) with check (public.is_coordinator());

-- Asignación de cuerpo técnico ───────────────────────────────────────────────
drop policy if exists team_staff_select on public.team_staff;
create policy team_staff_select on public.team_staff for select to authenticated
  using (profile_id = auth.uid() or public.has_team_access(team_id));

drop policy if exists team_staff_write on public.team_staff;
create policy team_staff_write on public.team_staff for all to authenticated
  using (public.is_coordinator()) with check (public.is_coordinator());

-- Tablas con ámbito de equipo ────────────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array['players', 'sessions', 'matches', 'callups', 'attendance', 'messages', 'activity']
  loop
    execute format('drop policy if exists %I_team_access on public.%I;', t, t);
    execute format(
      'create policy %I_team_access on public.%I for all to authenticated
         using (public.has_team_access(team_id))
         with check (public.has_team_access(team_id));', t, t);
  end loop;
end $$;

-- Ejercicios: biblioteca compartida del club ─────────────────────────────────
drop policy if exists drills_select on public.drills;
create policy drills_select on public.drills for select to authenticated using (true);

drop policy if exists drills_insert on public.drills;
create policy drills_insert on public.drills for insert to authenticated
  with check (created_by = auth.uid());

drop policy if exists drills_update on public.drills;
create policy drills_update on public.drills for update to authenticated
  using (created_by = auth.uid() or public.is_coordinator());

drop policy if exists drills_delete on public.drills;
create policy drills_delete on public.drills for delete to authenticated
  using (created_by = auth.uid() or public.is_coordinator());

drop policy if exists drill_favorites_own on public.drill_favorites;
create policy drill_favorites_own on public.drill_favorites for all to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- Plantillas de mensaje: comunes al club ─────────────────────────────────────
drop policy if exists templates_select on public.message_templates;
create policy templates_select on public.message_templates for select to authenticated using (true);

drop policy if exists templates_write on public.message_templates;
create policy templates_write on public.message_templates for all to authenticated
  using (created_by = auth.uid() or public.is_coordinator())
  with check (created_by = auth.uid() or public.is_coordinator());

-- Tareas y avisos: estrictamente personales ──────────────────────────────────
drop policy if exists tasks_own on public.tasks;
create policy tasks_own on public.tasks for all to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

drop policy if exists notifications_own on public.notifications;
create policy notifications_own on public.notifications for all to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- ============================================================================
-- Plantillas de mensaje por defecto.
-- No contienen datos del club: sólo la estructura con variables {{...}} que
-- cada entrenadora rellena. Se pueden editar o borrar desde la aplicación.
-- ============================================================================

insert into public.message_templates (kind, name, description, body, variables)
select * from (values
  ('convocatoria', 'Convocatoria de partido',
   'Lista de convocadas con hora de citación y equipación.',
   E'*CONVOCATORIA*\n{{equipo}}\n\n⚽ {{rival}}\n📅 {{fecha}}\n🕐 {{hora}}\n📍 {{campo}}\n\n⏰ Citación: {{citacion}}\n👕 {{equipacion}}\n\n*Convocadas:*\n{{lista}}\n\nConfirmad asistencia respondiendo a este mensaje:\n✅ Voy   ❌ No puedo   ❓ Aún no lo sé',
   array['equipo','rival','fecha','hora','campo','citacion','equipacion','lista']),

  ('horario', 'Horarios de la semana',
   'Resumen semanal de entrenamientos y partido.',
   E'*HORARIOS — {{equipo}}*\nSemana del {{semana}}\n\n{{detalle}}\n\nCualquier cambio se avisará por aquí.',
   array['equipo','semana','detalle']),

  ('cambio-entrenamiento', 'Cambio de entrenamiento',
   'Aviso de cambio de hora o cancelación.',
   E'⚠️ *CAMBIO DE ENTRENAMIENTO*\n{{equipo}}\n\n📅 {{fecha}}\n🕐 Nueva hora: {{hora_nueva}}\n\nMotivo: {{motivo}}\n\nGracias por confirmar la recepción.',
   array['equipo','fecha','hora_nueva','motivo']),

  ('cambio-campo', 'Cambio de campo',
   'Aviso de cambio de instalación.',
   E'📍 *CAMBIO DE CAMPO*\n{{equipo}}\n\n📅 {{fecha}}\nNuevo campo: *{{campo_nuevo}}*\n\nMisma hora de citación.',
   array['equipo','fecha','campo_nuevo']),

  ('info-partido', 'Información de partido',
   'Detalles logísticos para las familias.',
   E'*PARTIDO — {{equipo}}*\n\n⚽ {{rival}}\n📅 {{fecha}}\n🕐 {{hora}}\n📍 {{campo}}\n\n🚌 {{desplazamiento}}',
   array['equipo','rival','fecha','hora','campo','desplazamiento']),

  ('recordatorio', 'Recordatorio',
   'Recordatorio breve del próximo compromiso.',
   E'🔔 Recordatorio {{equipo}}\n\n{{que}}\n{{cuando}}\n\nNos vemos allí.',
   array['equipo','que','cuando'])
) as v(kind, name, description, body, variables)
where not exists (select 1 from public.message_templates);
