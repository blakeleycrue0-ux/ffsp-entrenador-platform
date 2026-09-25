-- ════════════════════════════════════════════════════════════════════════════
-- 0003 · AISLAMIENTO POR CLUB
-- ════════════════════════════════════════════════════════════════════════════
--
-- La plataforma deja de ser de un solo club. Con varios clubes en la misma
-- base de datos, el esquema anterior tenía tres agujeros:
--
--   1. `is_coordinator()` miraba `profiles.role`, que es GLOBAL. Cualquier
--      persona con rol de coordinación veía los equipos, las jugadoras y los
--      correos de TODOS los clubes, no sólo del suyo.
--   2. Las políticas de `drills`, `plays` y `message_templates` dejaban pasar
--      cualquier fila con `club_id` nulo, así que eran visibles para todo el
--      mundo.
--   3. `profiles_update_coord` permitía a una coordinación modificar el perfil
--      de cualquier persona de la base de datos, incluido su rol.
--
-- A partir de aquí **la autoridad viene de la pertenencia al club**
-- (`club_members`), no de una etiqueta en el perfil. `profiles.role` pasa a ser
-- lo que siempre debió ser: el cargo que ocupa esa persona, un dato
-- descriptivo que no concede acceso a nada.
--
-- Esta migración es ADITIVA:
--   · No borra tablas ni columnas.
--   · No elimina ni vacía registros.
--   · Antes de cerrar el acceso, REPARTE la pertenencia al club para que nadie
--     pierda lo que ya veía.
--   · Es idempotente: se puede ejecutar más de una vez.
--
-- Requiere 0001 y 0002. Si falta 0002, se detiene sin tocar nada.
-- ════════════════════════════════════════════════════════════════════════════

do $$
begin
  if to_regclass('public.clubs') is null or to_regclass('public.club_members') is null then
    raise exception
      'Falta la migración 0002. Ejecuta antes 0002_clubes_pizarra_y_seguimiento.sql.';
  end if;
end $$;


-- ════════════════════════════════════════════════════════════════════════════
-- 1. REPARTO: que nadie se quede fuera al cerrar el acceso
-- ════════════════════════════════════════════════════════════════════════════

-- 1.1 · Equipos sin club ─────────────────────────────────────────────────────
-- Cada equipo huérfano se adjudica al club de quien lo creó. Si esa persona
-- tampoco tiene club, se le crea uno con su nombre: es su equipo, no del vecino.
do $$
declare
  creador record;
  club    uuid;
begin
  for creador in
    select distinct t.created_by
    from public.teams t
    where t.club_id is null
  loop
    if creador.created_by is null then
      continue;
    end if;

    select cm.club_id into club
    from public.club_members cm
    where cm.profile_id = creador.created_by
    order by cm.created_at
    limit 1;

    if club is null then
      insert into public.clubs (name, created_by)
      select coalesce(nullif(p.full_name, ''), 'Mi club'), creador.created_by
      from public.profiles p
      where p.id = creador.created_by
      returning id into club;

      insert into public.club_members (club_id, profile_id, role)
      values (club, creador.created_by, 'admin')
      on conflict (club_id, profile_id) do update set role = 'admin';
    end if;

    update public.teams set club_id = club
    where club_id is null and created_by = creador.created_by;
  end loop;
end $$;

-- Un equipo sin creador conocido se queda con el club que ya tenga más equipos,
-- para no dejarlo aislado. Si no hay ningún club, se crea uno genérico.
do $$
declare club uuid;
begin
  if exists (select 1 from public.teams where club_id is null) then
    select t.club_id into club
    from public.teams t
    where t.club_id is not null
    group by t.club_id
    order by count(*) desc
    limit 1;

    if club is null then
      insert into public.clubs (name) values ('Mi club') returning id into club;
    end if;

    update public.teams set club_id = club where club_id is null;
  end if;
end $$;

-- 1.2 · Cuerpo técnico ───────────────────────────────────────────────────────
-- Quien está asignada a un equipo pasa a ser miembro del club de ese equipo.
-- Sin esto, al retirar el atajo global se quedarían sin ver su propio equipo.
insert into public.club_members (club_id, profile_id, role)
select distinct t.club_id, ts.profile_id, 'entrenadora'::club_role
from public.team_staff ts
join public.teams t on t.id = ts.team_id
where t.club_id is not null
on conflict (club_id, profile_id) do nothing;

-- Quien tenía rol de coordinación pasa a administrar los clubes donde está.
update public.club_members cm
   set role = 'admin'
  from public.profiles p
 where p.id = cm.profile_id
   and p.role in ('coordinadora', 'directora-deportiva', 'admin-club')
   and cm.role <> 'admin';

-- Quien creó un club lo administra, aunque nunca se añadiera a sí misma.
insert into public.club_members (club_id, profile_id, role)
select c.id, c.created_by, 'admin'::club_role
from public.clubs c
where c.created_by is not null
on conflict (club_id, profile_id) do update set role = 'admin';

-- 1.3 · Ejercicios y jugadas sin club ────────────────────────────────────────
-- Se adjudican al club de quien los creó. Lo que no tenga dueño identificable
-- se queda sin club: seguirá siendo visible para su creadora, pero para nadie
-- más. No se borra nada.
update public.drills d
   set club_id = (
     select cm.club_id from public.club_members cm
     where cm.profile_id = d.created_by
     order by cm.created_at
     limit 1
   )
 where d.club_id is null
   and d.created_by is not null
   and exists (select 1 from public.club_members cm where cm.profile_id = d.created_by);

update public.plays pl
   set club_id = (
     select cm.club_id from public.club_members cm
     where cm.profile_id = pl.created_by
     order by cm.created_at
     limit 1
   )
 where pl.club_id is null
   and pl.created_by is not null
   and exists (select 1 from public.club_members cm where cm.profile_id = pl.created_by);

-- 1.4 · Plantillas de mensaje ────────────────────────────────────────────────
-- Eran comunes a toda la base de datos. Se les añade club para que dejen de
-- serlo, sin perder ninguna.
alter table public.message_templates add column if not exists club_id uuid
  references public.clubs(id) on delete cascade;

update public.message_templates mt
   set club_id = (
     select cm.club_id from public.club_members cm
     where cm.profile_id = mt.created_by
     order by cm.created_at
     limit 1
   )
 where mt.club_id is null
   and mt.created_by is not null
   and exists (select 1 from public.club_members cm where cm.profile_id = mt.created_by);


-- ════════════════════════════════════════════════════════════════════════════
-- 2. IDENTIDAD DEL CLUB
-- ════════════════════════════════════════════════════════════════════════════
-- Cada club tiene su nombre y sus colores. El nombre corto es el que aparece en
-- los marcadores, donde no cabe «Club Deportivo Municipal de …».

alter table public.clubs add column if not exists short_name text;
alter table public.clubs add column if not exists season     text;
alter table public.clubs add column if not exists updated_at timestamptz not null default now();

update public.clubs
   set short_name = name
 where short_name is null or short_name = '';


-- ════════════════════════════════════════════════════════════════════════════
-- 3. FUNCIONES DE ACCESO
-- ════════════════════════════════════════════════════════════════════════════

/* `is_coordinator()` se conserva porque hay políticas que la nombran, pero
   cambia de significado: ya no lee `profiles.role` (global), sino que responde
   «administro algún club». Por sí sola no da acceso a ninguna fila concreta;
   las políticas comprueban además de QUÉ club se trata. */
create or replace function public.is_coordinator()
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.club_members
    where profile_id = auth.uid() and role = 'admin'
  );
$$;

/* Acceso a un equipo: pertenecer a su club o estar asignada a él.
   Sin atajos globales. */
create or replace function public.has_team_access(target uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
      select 1 from public.team_staff
      where team_id = target and profile_id = auth.uid()
    )
    or exists (
      select 1
      from public.teams t
      join public.club_members m on m.club_id = t.club_id
      where t.id = target and m.profile_id = auth.uid()
    );
$$;

/* Gestionar un equipo (crearlo, editarlo, asignar cuerpo técnico) es cosa de
   la administración del club al que pertenece. */
create or replace function public.can_manage_team(target uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1
    from public.teams t
    join public.club_members m on m.club_id = t.club_id
    where t.id = target and m.profile_id = auth.uid() and m.role = 'admin'
  );
$$;

/* Editar el contenido diario de un equipo lo puede hacer cualquiera con
   acceso a él. */
create or replace function public.can_edit_team(target uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select public.has_team_access(target);
$$;

/* Dos personas se ven entre sí sólo si comparten club. */
create or replace function public.shares_club_with(target uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1
    from public.club_members mine
    join public.club_members theirs on theirs.club_id = mine.club_id
    where mine.profile_id = auth.uid() and theirs.profile_id = target
  );
$$;


-- ════════════════════════════════════════════════════════════════════════════
-- 4. POLÍTICAS
-- ════════════════════════════════════════════════════════════════════════════

-- 4.1 · Perfiles ─────────────────────────────────────────────────────────────
-- Antes: cualquier coordinación veía y editaba TODOS los perfiles.
-- Ahora: se ve a quien comparte club y cada cual edita el suyo.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.shares_club_with(id));

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

/* La administración ajusta el cargo de su gente, pero sólo de la suya.
   El acceso real no está aquí, está en `club_members`. */
drop policy if exists profiles_update_coord on public.profiles;
create policy profiles_update_coord on public.profiles for update to authenticated
  using (
    exists (
      select 1
      from public.club_members mine
      join public.club_members theirs on theirs.club_id = mine.club_id
      where mine.profile_id = auth.uid() and mine.role = 'admin'
        and theirs.profile_id = profiles.id
    )
  )
  with check (
    exists (
      select 1
      from public.club_members mine
      join public.club_members theirs on theirs.club_id = mine.club_id
      where mine.profile_id = auth.uid() and mine.role = 'admin'
        and theirs.profile_id = profiles.id
    )
  );

-- 4.2 · Equipos ──────────────────────────────────────────────────────────────
drop policy if exists teams_select on public.teams;
create policy teams_select on public.teams for select to authenticated
  using (public.has_team_access(id));

drop policy if exists teams_write on public.teams;
drop policy if exists teams_insert on public.teams;
create policy teams_insert on public.teams for insert to authenticated
  with check (club_id is not null and public.is_club_admin(club_id));

drop policy if exists teams_update on public.teams;
create policy teams_update on public.teams for update to authenticated
  using (public.can_manage_team(id))
  with check (club_id is not null and public.is_club_admin(club_id));

drop policy if exists teams_delete on public.teams;
create policy teams_delete on public.teams for delete to authenticated
  using (public.can_manage_team(id));

-- 4.3 · Cuerpo técnico de cada equipo ────────────────────────────────────────
drop policy if exists team_staff_select on public.team_staff;
create policy team_staff_select on public.team_staff for select to authenticated
  using (profile_id = auth.uid() or public.has_team_access(team_id));

drop policy if exists team_staff_write on public.team_staff;
create policy team_staff_write on public.team_staff for all to authenticated
  using (public.can_manage_team(team_id))
  with check (public.can_manage_team(team_id));

-- 4.4 · Ejercicios: de su club, y punto ──────────────────────────────────────
-- Una fila sin club sólo la ve quien la creó. Así nada queda expuesto y nada
-- se pierde.
drop policy if exists drills_select on public.drills;
create policy drills_select on public.drills for select to authenticated
  using (
    (club_id is not null and public.has_club_access(club_id))
    or created_by = auth.uid()
  );

drop policy if exists drills_insert on public.drills;
create policy drills_insert on public.drills for insert to authenticated
  with check (
    created_by = auth.uid()
    and (club_id is null or public.has_club_access(club_id))
  );

drop policy if exists drills_update on public.drills;
create policy drills_update on public.drills for update to authenticated
  using (created_by = auth.uid() or public.is_club_admin(club_id))
  with check (club_id is null or public.has_club_access(club_id));

drop policy if exists drills_delete on public.drills;
create policy drills_delete on public.drills for delete to authenticated
  using (created_by = auth.uid() or public.is_club_admin(club_id));

-- 4.5 · Jugadas de la pizarra ────────────────────────────────────────────────
drop policy if exists plays_access on public.plays;
drop policy if exists plays_select on public.plays;
create policy plays_select on public.plays for select to authenticated
  using (
    (club_id is not null and public.has_club_access(club_id))
    or created_by = auth.uid()
  );

drop policy if exists plays_insert on public.plays;
create policy plays_insert on public.plays for insert to authenticated
  with check (
    created_by = auth.uid()
    and (club_id is null or public.has_club_access(club_id))
  );

drop policy if exists plays_update on public.plays;
create policy plays_update on public.plays for update to authenticated
  using (created_by = auth.uid() or public.is_club_admin(club_id))
  with check (club_id is null or public.has_club_access(club_id));

drop policy if exists plays_delete on public.plays;
create policy plays_delete on public.plays for delete to authenticated
  using (created_by = auth.uid() or public.is_club_admin(club_id));

-- 4.6 · Plantillas de mensaje ────────────────────────────────────────────────
drop policy if exists templates_select on public.message_templates;
create policy templates_select on public.message_templates for select to authenticated
  using (
    (club_id is not null and public.has_club_access(club_id))
    or created_by = auth.uid()
  );

drop policy if exists templates_write on public.message_templates;
create policy templates_write on public.message_templates for all to authenticated
  using (created_by = auth.uid() or public.is_club_admin(club_id))
  with check (
    created_by = auth.uid()
    and (club_id is null or public.has_club_access(club_id))
  );

-- 4.7 · Clubes ───────────────────────────────────────────────────────────────
-- Cualquiera puede crear el suyo: es la puerta de entrada del producto.
drop policy if exists clubs_insert on public.clubs;
create policy clubs_insert on public.clubs for insert to authenticated
  with check (created_by = auth.uid());

drop policy if exists clubs_select on public.clubs;
create policy clubs_select on public.clubs for select to authenticated
  using (public.has_club_access(id) or created_by = auth.uid());


-- ════════════════════════════════════════════════════════════════════════════
-- 5. ALTA DE CUENTAS
-- ════════════════════════════════════════════════════════════════════════════
-- Ya no se reparte un rol global a la primera cuenta que llegue: con varios
-- clubes, eso concedía autoridad sobre una base de datos entera. Cada persona
-- entra como entrenadora y la autoridad se adquiere creando un club o
-- aceptando una invitación.

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.email,
    'entrenadora'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

/* Crear un club y quedar como su administración, en una sola operación.
   Hacerlo en el servidor evita el hueco entre crear el club y añadirse: si
   algo falla, no queda un club sin dueña. */
create or replace function public.create_club(club_name text, club_short_name text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  nuevo public.clubs;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'sin_sesion');
  end if;
  if coalesce(trim(club_name), '') = '' then
    return jsonb_build_object('ok', false, 'error', 'sin_nombre');
  end if;

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

revoke all on function public.create_club(text, text) from public;
grant execute on function public.create_club(text, text) to authenticated;


-- ════════════════════════════════════════════════════════════════════════════
-- 6. VERIFICACIÓN
-- ════════════════════════════════════════════════════════════════════════════
-- Las tres primeras cifras deben ser 0. Si alguna no lo es, avisa antes de
-- seguir: significa que hay filas que se quedarían sin club asignado.

select
  (select count(*) from public.teams where club_id is null)          as equipos_sin_club,
  (select count(*) from public.team_staff ts
     join public.teams t on t.id = ts.team_id
     left join public.club_members cm
       on cm.club_id = t.club_id and cm.profile_id = ts.profile_id
    where cm.profile_id is null)                                     as tecnicas_sin_club,
  (select count(*) from public.clubs where created_by is not null
     and not exists (select 1 from public.club_members cm
                     where cm.club_id = clubs.id and cm.role = 'admin'))
                                                                     as clubes_sin_admin,
  (select count(*) from public.clubs)                                as clubes,
  (select count(*) from public.club_members)                         as miembros,
  (select count(*) from public.drills where club_id is null)         as ejercicios_sin_club,
  (select count(*) from public.plays where club_id is null)          as jugadas_sin_club;
