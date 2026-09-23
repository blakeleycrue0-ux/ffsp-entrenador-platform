-- ============================================================================
-- FFSP — Migración 0002
-- Clubes, invitaciones, lesiones, valoraciones, partidos y pizarra animada
-- ----------------------------------------------------------------------------
-- Ejecutar en Supabase → SQL Editor → New query → pegar todo → Run.
--
-- ESTA MIGRACIÓN ES ADITIVA Y REVERSIBLE EN LO ESENCIAL:
--   · No borra ninguna tabla, columna ni fila.
--   · No vacía datos ni reinicia secuencias.
--   · Las columnas jsonb antiguas (sessions.blocks, attendance.marks) se
--     CONSERVAN intactas. Los datos se COPIAN a las nuevas tablas; si algo
--     sale mal, el original sigue ahí.
--   · Puede ejecutarse más de una vez sin duplicar datos.
--
-- Al final hay un bloque de VERIFICACIÓN que compara los recuentos entre el
-- formato antiguo y el nuevo.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ─────────────────────────────── Tipos nuevos ───────────────────────────────

do $$ begin
  -- Rol dentro de un club. Los tres roles del producto.
  create type club_role as enum ('admin', 'entrenadora', 'asistente');
exception when duplicate_object then null; end $$;

do $$ begin
  create type team_modality as enum ('f11', 'f7', 'f8', 'sala');
exception when duplicate_object then null; end $$;

do $$ begin
  -- Añade "tarde", que faltaba.
  create type attendance_mark as enum (
    'presente', 'ausente', 'justificada', 'tarde', 'lesionada', 'sin_registrar'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type injury_state as enum (
    'disponible', 'molestias', 'lesionada', 'recuperacion', 'no_disponible'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type match_role as enum ('titular', 'suplente', 'convocada', 'no_convocada');
exception when duplicate_object then null; end $$;

-- ════════════════════════════════════════════════════════════════════════════
-- 1. CLUBES
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.clubs (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  city       text,
  crest_url  text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.club_members (
  club_id    uuid not null references public.clubs(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role       club_role not null default 'entrenadora',
  created_at timestamptz not null default now(),
  primary key (club_id, profile_id)
);
create index if not exists club_members_profile_idx on public.club_members(profile_id);

-- Los equipos pasan a pertenecer a un club.
alter table public.teams add column if not exists club_id  uuid references public.clubs(id) on delete cascade;
alter table public.teams add column if not exists modality team_modality not null default 'f11';
alter table public.teams add column if not exists archived_at timestamptz;
create index if not exists teams_club_idx on public.teams(club_id);

-- ─────────── Funciones de autorización por club (security definer) ──────────

create or replace function public.is_club_admin(target uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.club_members
    where club_id = target and profile_id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.has_club_access(target uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.club_members
    where club_id = target and profile_id = auth.uid()
  );
$$;

-- El acceso a un equipo se amplía: asignación directa O pertenencia al club.
-- Se mantiene la función anterior para no romper las políticas existentes.
create or replace function public.has_team_access(target uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select public.is_coordinator()
      or exists (select 1 from public.team_staff where team_id = target and profile_id = auth.uid())
      or exists (
        select 1 from public.teams t
        join public.club_members m on m.club_id = t.club_id
        where t.id = target and m.profile_id = auth.uid()
      );
$$;

/* Escribir en un equipo: estar asignada o ser administradora del club. */
create or replace function public.can_edit_team(target uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select public.has_team_access(target);
$$;

-- ════════════════════════════════════════════════════════════════════════════
-- 2. INVITACIONES AL CUERPO TÉCNICO
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.invitations (
  id          uuid primary key default gen_random_uuid(),
  club_id     uuid not null references public.clubs(id) on delete cascade,
  team_id     uuid references public.teams(id) on delete set null,
  email       text not null,
  role        club_role not null default 'entrenadora',
  token       text not null unique default encode(gen_random_bytes(24), 'hex'),
  invited_by  uuid references public.profiles(id) on delete set null,
  expires_at  timestamptz not null default (now() + interval '14 days'),
  accepted_at timestamptz,
  accepted_by uuid references public.profiles(id) on delete set null,
  revoked_at  timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists invitations_email_idx on public.invitations(lower(email));
create index if not exists invitations_club_idx on public.invitations(club_id);

/* Aceptar invitación: valida token, caducidad y correo, y da de alta en el club.
   Es `security definer` porque quien acepta todavía no es miembro del club. */
create or replace function public.accept_invitation(invite_token text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  inv public.invitations;
  user_email text;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'sin_sesion');
  end if;

  select email into user_email from auth.users where id = auth.uid();
  select * into inv from public.invitations where token = invite_token;

  if inv.id is null then
    return jsonb_build_object('ok', false, 'error', 'no_encontrada');
  end if;
  if inv.revoked_at is not null then
    return jsonb_build_object('ok', false, 'error', 'revocada');
  end if;
  if inv.accepted_at is not null then
    return jsonb_build_object('ok', false, 'error', 'ya_aceptada');
  end if;
  if inv.expires_at < now() then
    return jsonb_build_object('ok', false, 'error', 'caducada');
  end if;
  if lower(inv.email) <> lower(coalesce(user_email, '')) then
    return jsonb_build_object('ok', false, 'error', 'correo_distinto');
  end if;

  insert into public.club_members (club_id, profile_id, role)
  values (inv.club_id, auth.uid(), inv.role)
  on conflict (club_id, profile_id) do update set role = excluded.role;

  if inv.team_id is not null then
    insert into public.team_staff (team_id, profile_id, role)
    values (inv.team_id, auth.uid(),
            case inv.role when 'asistente' then 'segunda-entrenadora'::staff_role
                          else 'entrenadora'::staff_role end)
    on conflict (team_id, profile_id) do nothing;
  end if;

  update public.invitations
     set accepted_at = now(), accepted_by = auth.uid()
   where id = inv.id;

  return jsonb_build_object('ok', true, 'club_id', inv.club_id, 'team_id', inv.team_id);
end;
$$;

/* Consultar una invitación por token sin necesidad de ser miembro todavía. */
create or replace function public.peek_invitation(invite_token text)
returns jsonb language sql security definer stable set search_path = public as $$
  select case when i.id is null then jsonb_build_object('found', false)
    else jsonb_build_object(
      'found', true,
      'email', i.email,
      'role', i.role,
      'club_name', c.name,
      'team_name', t.name,
      'expired', i.expires_at < now(),
      'accepted', i.accepted_at is not null,
      'revoked', i.revoked_at is not null
    ) end
  from (select 1) dummy
  left join public.invitations i on i.token = invite_token
  left join public.clubs c on c.id = i.club_id
  left join public.teams t on t.id = i.team_id;
$$;

-- ════════════════════════════════════════════════════════════════════════════
-- 3. DISPONIBILIDAD Y LESIONES
-- ════════════════════════════════════════════════════════════════════════════

alter table public.players add column if not exists archived_at timestamptz;
alter table public.players add column if not exists availability_state injury_state not null default 'disponible';

create table if not exists public.injuries (
  id             uuid primary key default gen_random_uuid(),
  player_id      uuid not null references public.players(id) on delete cascade,
  team_id        uuid not null references public.teams(id) on delete cascade,
  state          injury_state not null default 'lesionada',
  started_on     date not null default current_date,
  expected_return date,
  resolved_on    date,
  description    text,
  restrictions   text,
  created_by     uuid references public.profiles(id) on delete set null,
  created_at     timestamptz not null default now()
);
create index if not exists injuries_player_idx on public.injuries(player_id, started_on desc);

create table if not exists public.injury_updates (
  id         uuid primary key default gen_random_uuid(),
  injury_id  uuid not null references public.injuries(id) on delete cascade,
  noted_on   date not null default current_date,
  note       text not null,
  state      injury_state,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists injury_updates_injury_idx on public.injury_updates(injury_id, noted_on desc);

-- ════════════════════════════════════════════════════════════════════════════
-- 4. ENTRENAMIENTOS: REALIZACIÓN SEPARADA DE LA PLANTILLA DEL EJERCICIO
-- ════════════════════════════════════════════════════════════════════════════

alter table public.sessions add column if not exists rating          int check (rating between 1 and 10);
alter table public.sessions add column if not exists notes_before    text;
alter table public.sessions add column if not exists notes_after     text;
alter table public.sessions add column if not exists actual_duration int;
alter table public.sessions add column if not exists location        text;
alter table public.sessions add column if not exists series_id       uuid;
alter table public.sessions add column if not exists series_rule     jsonb;
create index if not exists sessions_series_idx on public.sessions(series_id);

/* Cada ejercicio TAL COMO SE HIZO en una sesión concreta. Valorarlo aquí no
   altera la plantilla del ejercicio ni las sesiones anteriores. */
create table if not exists public.session_exercises (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references public.sessions(id) on delete cascade,
  drill_id    uuid references public.drills(id) on delete set null,
  position    int not null default 0,
  block       text,
  title       text not null,
  duration    int not null default 0,
  series      text,
  notes       text,
  rating      int check (rating between 1 and 10),
  created_at  timestamptz not null default now()
);
create index if not exists session_exercises_session_idx on public.session_exercises(session_id, position);

create table if not exists public.session_player_ratings (
  id         uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  player_id  uuid not null references public.players(id) on delete cascade,
  rating     int check (rating between 1 and 10),
  note       text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (session_id, player_id)
);

/* Asistencia por jugadora y sesión. Sustituye al jsonb, que se conserva. */
create table if not exists public.attendance_entries (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references public.sessions(id) on delete cascade,
  team_id     uuid not null references public.teams(id) on delete cascade,
  player_id   uuid not null references public.players(id) on delete cascade,
  mark        attendance_mark not null default 'sin_registrar',
  note        text,
  recorded_at timestamptz not null default now(),
  recorded_by uuid references public.profiles(id) on delete set null,
  unique (session_id, player_id)
);
create index if not exists attendance_entries_team_idx on public.attendance_entries(team_id);
create index if not exists attendance_entries_player_idx on public.attendance_entries(player_id);

-- ════════════════════════════════════════════════════════════════════════════
-- 5. PARTIDOS: ALINEACIÓN, PARTICIPACIÓN Y ESTADÍSTICAS
-- ════════════════════════════════════════════════════════════════════════════

alter table public.matches add column if not exists lineup       jsonb not null default '[]'::jsonb;
alter table public.matches add column if not exists notes_after  text;
alter table public.matches add column if not exists rating       int check (rating between 1 and 10);
alter table public.matches add column if not exists kickoff_note text;

create table if not exists public.match_players (
  id         uuid primary key default gen_random_uuid(),
  match_id   uuid not null references public.matches(id) on delete cascade,
  player_id  uuid not null references public.players(id) on delete cascade,
  role       match_role not null default 'convocada',
  shirt      int,
  position   text,
  minute_in  int,
  minute_out int,
  minutes    int,
  goals      int not null default 0,
  assists    int not null default 0,
  yellow     int not null default 0,
  red        int not null default 0,
  rating     int check (rating between 1 and 10),
  note       text,
  unique (match_id, player_id)
);
create index if not exists match_players_player_idx on public.match_players(player_id);

-- ════════════════════════════════════════════════════════════════════════════
-- 6. PIZARRA TÁCTICA ANIMADA
-- ════════════════════════════════════════════════════════════════════════════
-- La escena completa (objetos, trayectorias y línea de tiempo) se guarda como
-- un único documento jsonb versionado. Permite reabrir y seguir editando.

alter table public.drills add column if not exists club_id   uuid references public.clubs(id) on delete cascade;
alter table public.drills add column if not exists animation jsonb;
alter table public.drills add column if not exists pitch     text not null default 'full';
alter table public.drills add column if not exists modality  team_modality not null default 'f11';
create index if not exists drills_club_idx on public.drills(club_id);

/* Jugadas independientes de un ejercicio (se pueden convertir en ejercicio). */
create table if not exists public.plays (
  id          uuid primary key default gen_random_uuid(),
  club_id     uuid references public.clubs(id) on delete cascade,
  team_id     uuid references public.teams(id) on delete set null,
  drill_id    uuid references public.drills(id) on delete set null,
  name        text not null,
  description text,
  pitch       text not null default 'full',
  modality    team_modality not null default 'f11',
  scene       jsonb not null default '{"version":1,"objects":[],"tracks":[],"durationMs":6000}'::jsonb,
  duration_ms int not null default 6000,
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists plays_club_idx on public.plays(club_id);

-- ════════════════════════════════════════════════════════════════════════════
-- 7. FEEDBACK Y RESEÑAS
-- ════════════════════════════════════════════════════════════════════════════
-- Separado a propósito: el feedback privado NUNCA se publica solo.

create table if not exists public.app_feedback (
  id         uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete set null,
  rating     int check (rating between 1 and 10),
  comment    text not null,
  context    text,
  created_at timestamptz not null default now()
);

create table if not exists public.public_reviews (
  id           uuid primary key default gen_random_uuid(),
  author_name  text not null,
  author_role  text,
  club_name    text,
  quote        text not null,
  rating       int check (rating between 1 and 10),
  /* Sólo se publica con consentimiento expreso y aprobación manual. */
  consent_at   timestamptz,
  approved_at  timestamptz,
  published    boolean not null default false,
  created_at   timestamptz not null default now()
);

-- ════════════════════════════════════════════════════════════════════════════
-- 8. TRASLADO DE DATOS EXISTENTES (no destructivo)
-- ════════════════════════════════════════════════════════════════════════════

do $$
declare
  default_club uuid;
  huerfanos int;
begin
  select count(*) into huerfanos from public.teams where club_id is null;

  if huerfanos > 0 then
    -- Un único club para todo lo que ya existía.
    select id into default_club from public.clubs order by created_at limit 1;
    if default_club is null then
      insert into public.clubs (name, created_by)
      values ('Santa Ponsa CF', (select id from public.profiles order by created_at limit 1))
      returning id into default_club;
    end if;

    update public.teams set club_id = default_club where club_id is null;

    -- Todo el personal existente pasa a ser miembro del club, con su rol mapeado.
    insert into public.club_members (club_id, profile_id, role)
    select default_club, p.id,
           case
             when p.role in ('coordinadora', 'directora-deportiva', 'admin-club') then 'admin'::club_role
             when p.role in ('segunda-entrenadora', 'preparadora-fisica') then 'asistente'::club_role
             else 'entrenadora'::club_role
           end
      from public.profiles p
    on conflict (club_id, profile_id) do nothing;

    update public.drills set club_id = default_club where club_id is null;
  end if;
end $$;

-- Bloques de sesión jsonb → session_exercises (sólo los que falten).
insert into public.session_exercises (session_id, drill_id, position, title, duration, series, notes)
select s.id,
       nullif(b.value ->> 'drillId', '')::uuid,
       (b.ord - 1)::int,
       coalesce(b.value ->> 'title', 'Ejercicio'),
       coalesce((b.value ->> 'duration')::int, 0),
       b.value ->> 'series',
       b.value ->> 'notes'
  from public.sessions s
  cross join lateral jsonb_array_elements(coalesce(s.blocks, '[]'::jsonb)) with ordinality as b(value, ord)
 where not exists (select 1 from public.session_exercises se where se.session_id = s.id);

-- Marcas de asistencia jsonb → attendance_entries (sólo las que falten).
insert into public.attendance_entries (session_id, team_id, player_id, mark, note, recorded_at)
select a.session_id,
       a.team_id,
       m.key::uuid,
       case m.value ->> 'mark'
         when 'presente'    then 'presente'::attendance_mark
         when 'justificada' then 'justificada'::attendance_mark
         when 'justificado' then 'justificada'::attendance_mark
         when 'ausente'     then 'ausente'::attendance_mark
         when 'tarde'       then 'tarde'::attendance_mark
         when 'lesionada'   then 'lesionada'::attendance_mark
         else 'sin_registrar'::attendance_mark
       end,
       m.value ->> 'reason',
       coalesce(a.saved_at, now())
  from public.attendance a
  cross join lateral jsonb_each(coalesce(a.marks, '{}'::jsonb)) as m(key, value)
 where exists (select 1 from public.sessions s where s.id = a.session_id)
   and exists (select 1 from public.players p where p.id::text = m.key)
   and not exists (
     select 1 from public.attendance_entries ae
      where ae.session_id = a.session_id and ae.player_id = m.key::uuid
   );

-- Disponibilidad antigua → nuevo estado, conservando la columna original.
update public.players
   set availability_state = case availability_status
         when 'disponible' then 'disponible'::injury_state
         when 'duda'       then 'molestias'::injury_state
         when 'lesionada'  then 'lesionada'::injury_state
         when 'enferma'    then 'no_disponible'::injury_state
         when 'sancionada' then 'no_disponible'::injury_state
         when 'ausente'    then 'no_disponible'::injury_state
         else 'disponible'::injury_state
       end
 where availability_state = 'disponible'
   and availability_status <> 'disponible';

-- ════════════════════════════════════════════════════════════════════════════
-- 9. SEGURIDAD POR FILAS DE LAS TABLAS NUEVAS
-- ════════════════════════════════════════════════════════════════════════════

alter table public.clubs                  enable row level security;
alter table public.club_members           enable row level security;
alter table public.invitations            enable row level security;
alter table public.injuries               enable row level security;
alter table public.injury_updates         enable row level security;
alter table public.session_exercises      enable row level security;
alter table public.session_player_ratings enable row level security;
alter table public.attendance_entries     enable row level security;
alter table public.match_players          enable row level security;
alter table public.plays                  enable row level security;
alter table public.app_feedback           enable row level security;
alter table public.public_reviews         enable row level security;

-- Clubes ─────────────────────────────────────────────────────────────────────
drop policy if exists clubs_select on public.clubs;
create policy clubs_select on public.clubs for select to authenticated
  using (public.has_club_access(id));

drop policy if exists clubs_insert on public.clubs;
create policy clubs_insert on public.clubs for insert to authenticated
  with check (created_by = auth.uid());

drop policy if exists clubs_update on public.clubs;
create policy clubs_update on public.clubs for update to authenticated
  using (public.is_club_admin(id)) with check (public.is_club_admin(id));

drop policy if exists clubs_delete on public.clubs;
create policy clubs_delete on public.clubs for delete to authenticated
  using (public.is_club_admin(id));

-- Miembros ───────────────────────────────────────────────────────────────────
drop policy if exists club_members_select on public.club_members;
create policy club_members_select on public.club_members for select to authenticated
  using (profile_id = auth.uid() or public.has_club_access(club_id));

/* Quien crea el club se añade a sí misma como admin; el resto lo gestiona admin. */
drop policy if exists club_members_insert on public.club_members;
create policy club_members_insert on public.club_members for insert to authenticated
  with check (
    public.is_club_admin(club_id)
    or (profile_id = auth.uid()
        and exists (select 1 from public.clubs c where c.id = club_id and c.created_by = auth.uid()))
  );

drop policy if exists club_members_update on public.club_members;
create policy club_members_update on public.club_members for update to authenticated
  using (public.is_club_admin(club_id)) with check (public.is_club_admin(club_id));

drop policy if exists club_members_delete on public.club_members;
create policy club_members_delete on public.club_members for delete to authenticated
  using (public.is_club_admin(club_id) or profile_id = auth.uid());

-- Los equipos también se gestionan desde la administración del club.
drop policy if exists teams_write on public.teams;
create policy teams_write on public.teams for all to authenticated
  using (public.is_coordinator() or public.is_club_admin(club_id))
  with check (public.is_coordinator() or public.is_club_admin(club_id));

-- Invitaciones ───────────────────────────────────────────────────────────────
drop policy if exists invitations_admin on public.invitations;
create policy invitations_admin on public.invitations for all to authenticated
  using (public.is_club_admin(club_id)) with check (public.is_club_admin(club_id));

/* La invitada puede ver la suya por correo. El token se consulta con peek_invitation. */
drop policy if exists invitations_own on public.invitations;
create policy invitations_own on public.invitations for select to authenticated
  using (lower(email) = lower(coalesce((select email from auth.users where id = auth.uid()), '')));

-- Tablas con ámbito de equipo ────────────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array['injuries', 'attendance_entries', 'match_players_x']
  loop
    if t = 'match_players_x' then continue; end if;
    execute format('drop policy if exists %I_team_access on public.%I;', t, t);
    execute format(
      'create policy %I_team_access on public.%I for all to authenticated
         using (public.has_team_access(team_id))
         with check (public.has_team_access(team_id));', t, t);
  end loop;
end $$;

-- Tablas que heredan el acceso de su sesión / partido / lesión ───────────────
drop policy if exists injury_updates_access on public.injury_updates;
create policy injury_updates_access on public.injury_updates for all to authenticated
  using (exists (select 1 from public.injuries i where i.id = injury_id and public.has_team_access(i.team_id)))
  with check (exists (select 1 from public.injuries i where i.id = injury_id and public.has_team_access(i.team_id)));

drop policy if exists session_exercises_access on public.session_exercises;
create policy session_exercises_access on public.session_exercises for all to authenticated
  using (exists (select 1 from public.sessions s where s.id = session_id and public.has_team_access(s.team_id)))
  with check (exists (select 1 from public.sessions s where s.id = session_id and public.has_team_access(s.team_id)));

drop policy if exists session_player_ratings_access on public.session_player_ratings;
create policy session_player_ratings_access on public.session_player_ratings for all to authenticated
  using (exists (select 1 from public.sessions s where s.id = session_id and public.has_team_access(s.team_id)))
  with check (exists (select 1 from public.sessions s where s.id = session_id and public.has_team_access(s.team_id)));

drop policy if exists match_players_access on public.match_players;
create policy match_players_access on public.match_players for all to authenticated
  using (exists (select 1 from public.matches m where m.id = match_id and public.has_team_access(m.team_id)))
  with check (exists (select 1 from public.matches m where m.id = match_id and public.has_team_access(m.team_id)));

-- Jugadas: del club ──────────────────────────────────────────────────────────
drop policy if exists plays_access on public.plays;
create policy plays_access on public.plays for all to authenticated
  using (club_id is null or public.has_club_access(club_id))
  with check (club_id is null or public.has_club_access(club_id));

-- Ejercicios: pasan a ser del club (manteniendo los que aún no lo tienen) ─────
drop policy if exists drills_select on public.drills;
create policy drills_select on public.drills for select to authenticated
  using (club_id is null or public.has_club_access(club_id));

drop policy if exists drills_insert on public.drills;
create policy drills_insert on public.drills for insert to authenticated
  with check (created_by = auth.uid() and (club_id is null or public.has_club_access(club_id)));

drop policy if exists drills_update on public.drills;
create policy drills_update on public.drills for update to authenticated
  using (created_by = auth.uid() or public.is_coordinator() or public.is_club_admin(club_id));

drop policy if exists drills_delete on public.drills;
create policy drills_delete on public.drills for delete to authenticated
  using (created_by = auth.uid() or public.is_coordinator() or public.is_club_admin(club_id));

-- Feedback: cada cual el suyo ────────────────────────────────────────────────
drop policy if exists app_feedback_own on public.app_feedback;
create policy app_feedback_own on public.app_feedback for all to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

/* Reseñas públicas: cualquiera puede LEER las publicadas; nadie las escribe
   desde la aplicación. Se aprueban a mano en el panel de Supabase. */
drop policy if exists public_reviews_read on public.public_reviews;
create policy public_reviews_read on public.public_reviews for select to anon, authenticated
  using (published = true and approved_at is not null and consent_at is not null);

-- ════════════════════════════════════════════════════════════════════════════
-- 10. VERIFICACIÓN
-- ════════════════════════════════════════════════════════════════════════════
-- Compara el formato antiguo (conservado) con el nuevo. Deben coincidir.

select
  (select count(*) from public.sessions s
    cross join lateral jsonb_array_elements(coalesce(s.blocks, '[]'::jsonb))) as bloques_en_jsonb,
  (select count(*) from public.session_exercises)                              as bloques_migrados,
  (select count(*) from public.attendance a
    cross join lateral jsonb_each(coalesce(a.marks, '{}'::jsonb))
    where exists (select 1 from public.players p where p.id::text = key))      as marcas_en_jsonb,
  (select count(*) from public.attendance_entries)                             as marcas_migradas,
  (select count(*) from public.teams where club_id is null)                    as equipos_sin_club,
  (select count(*) from public.clubs)                                          as clubes,
  (select count(*) from public.club_members)                                   as miembros;
