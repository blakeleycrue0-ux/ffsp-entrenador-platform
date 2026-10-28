-- ════════════════════════════════════════════════════════════════════════════
-- 0026 · LAS FAMILIAS: QUE UN PADRE VEA LO DE SU HIJO Y NADA MÁS
-- ════════════════════════════════════════════════════════════════════════════
--
-- ⚠ ESTA MIGRACIÓN TODAVÍA NO SE HA APLICADO. Está escrita y revisada, pero
--   la base de datos NO la tiene: ninguna de estas políticas existe ahora
--   mismo en producción, y ninguna familia puede entrar.
--
--   Se queda aquí sin aplicar a propósito. Es la migración que más riesgo
--   tiene de toda la serie —añade permisos de lectura sobre tablas con datos
--   de menores— y las políticas de Postgres se SUMAN: una mal escrita no
--   recorta nada, amplía. Antes de lanzarla hay que comprobarla simulando un
--   usuario de verdad (`set local role authenticated` con el identificador de
--   un tutor) y confirmar las dos mitades: que ve lo de su hijo, y que NO ve
--   lo de los demás.
--
--   Quien la aplique: ejecútela y acto seguido compruebe lo segundo.
--
-- Hasta aquí, quien entraba en Playoff360 era del cuerpo técnico y veía el
-- club entero. Una familia necesita lo contrario: ver UNA ficha —la de su
-- hijo— y lo que le afecta, sin ver a los demás.
--
-- `players.guardians` ya existía, pero es otra cosa: un jsonb con nombres y
-- teléfonos de contacto que escribe el entrenador. No es una cuenta, no
-- entra nadie con eso y no sirve para dar acceso.
--
-- ── LO QUE MÁS CUIDADO LLEVA, Y POR QUÉ ────────────────────────────────────
--
-- Las políticas de Postgres se SUMAN: añadir una sólo puede ampliar lo que se
-- ve, nunca recortarlo. Así que cada política de aquí se ha escrito
-- preguntándose «¿qué es lo MÁS que deja ver esto?», no «¿qué quiero que
-- vea?». Son datos de menores de familias que no se conocen entre ellas.
--
-- LA ASISTENCIA NO LLEVA POLÍTICA, Y ES LA DECISIÓN IMPORTANTE. Una fila de
-- `attendance` es la lista de un día ENTERA: un `marks` con el estado de los
-- veinte. Si se diera permiso de lectura sobre esa fila «porque dentro está
-- mi hijo», el padre se llevaría de paso quién faltó de los otros
-- diecinueve, con su motivo escrito a mano. Eso no se arregla con una
-- política más fina, porque el permiso en Postgres es por FILA y el dato
-- ajeno está dentro de la misma fila.
--
-- Por eso la asistencia se sirve con una función —`asistencia_de_mi_hijo`—
-- que saca del jsonb sólo la clave de ese jugador y devuelve el resto
-- tirado. Lo que no sale de la base no se puede filtrar después.
--
-- ── Y LO QUE SIGUE SIN VER UNA FAMILIA ─────────────────────────────────────
--
--   · la plantilla: sólo su hijo, no los compañeros;
--   · los recibos de nadie más, ni cuánto debe otro;
--   · las notas del cuerpo técnico, los motivos de falta y las lesiones;
--   · el cuerpo técnico, las invitaciones, el plan del club y las cuotas
--     como regla.
--
-- ── NO SE TOCA NI UNA POLÍTICA EXISTENTE ───────────────────────────────────
--
-- Todo lo de abajo es `create`: tabla nueva, funciones nuevas y políticas
-- nuevas con nombre propio. Si mañana hubiera que retirarlo entero, se
-- borran estas políticas y el cuerpo técnico sigue exactamente igual.
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists player_guardians (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references players(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  -- «madre», «padre», «tutora legal»… Texto libre: la forma de una familia
  -- no cabe en una lista cerrada.
  relation text,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  -- Una persona, una vez por jugador. Un tutor puede tener varios hijos.
  unique (player_id, profile_id)
);

comment on table player_guardians is
  'Qué cuenta puede ver la ficha de qué jugador. No confundir con players.guardians, que son datos de contacto escritos por el cuerpo técnico.';

create index if not exists player_guardians_profile_idx on player_guardians (profile_id);
create index if not exists player_guardians_player_idx on player_guardians (player_id);

alter table player_guardians enable row level security;

-- ── Quién es tutor de quién ─────────────────────────────────────────────────

create or replace function es_tutor_de(target uuid)
returns boolean language sql stable security definer set search_path to 'public' as $$
  select exists (
    select 1 from public.player_guardians
    where player_id = target and profile_id = auth.uid()
  );
$$;

/* ¿Tengo algún hijo en este equipo? Sirve para dejar ver el calendario del
   equipo —cuándo entrenan, contra quién juegan—, que es información de
   grupo y no de nadie en concreto. */
create or replace function tutela_en_equipo(target uuid)
returns boolean language sql stable security definer set search_path to 'public' as $$
  select exists (
    select 1
    from public.player_guardians g
    join public.players p on p.id = g.player_id
    where p.team_id = target and g.profile_id = auth.uid()
  );
$$;

/* ¿Y en este club? Para el nombre y el escudo, nada más. */
create or replace function tutela_en_club(target uuid)
returns boolean language sql stable security definer set search_path to 'public' as $$
  select exists (
    select 1
    from public.player_guardians g
    join public.players p on p.id = g.player_id
    join public.teams t on t.id = p.team_id
    where t.club_id = target and g.profile_id = auth.uid()
  );
$$;

-- ── Quién administra el vínculo ─────────────────────────────────────────────

-- Lo crea y lo quita el club. Una familia no se da acceso a sí misma: eso
-- sería poder leer la ficha de cualquier menor escribiendo su identificador.
create policy player_guardians_club on player_guardians
  for all
  using (exists (
    select 1 from players p join teams t on t.id = p.team_id
    where p.id = player_guardians.player_id and is_club_admin(t.club_id)
  ))
  with check (exists (
    select 1 from players p join teams t on t.id = p.team_id
    where p.id = player_guardians.player_id and is_club_admin(t.club_id)
  ));

-- Y cada cual puede ver de qué hijos es tutor, para que la aplicación sepa
-- qué enseñarle al entrar.
create policy player_guardians_mios on player_guardians
  for select using (profile_id = auth.uid());

-- ── Lo que ve una familia ───────────────────────────────────────────────────

-- SU HIJO, Y SÓLO SU HIJO. `es_tutor_de(id)` es por fila: la del compañero
-- de equipo no entra, aunque sea del mismo equipo y del mismo club.
create policy players_tutor on players
  for select using (es_tutor_de(id));

-- El equipo, para poder decir cómo se llama.
create policy teams_tutor on teams
  for select using (tutela_en_equipo(id));

-- El club, por el nombre y el escudo.
create policy clubs_tutor on clubs
  for select using (tutela_en_club(id));

-- El calendario del equipo: cuándo se entrena y contra quién se juega. Es
-- información de grupo, la misma que va en el grupo de mensajería.
create policy sessions_tutor on sessions
  for select using (tutela_en_equipo(team_id));

create policy matches_tutor on matches
  for select using (tutela_en_equipo(team_id));

-- Sus recibos, y los de nadie más.
create policy fee_charges_tutor on fee_charges
  for select using (es_tutor_de(player_id));

-- ── LA ASISTENCIA, APARTE ───────────────────────────────────────────────────
--
-- Sin política sobre `attendance`: ver la fila sería ver la lista entera del
-- día. Esta función saca del jsonb la clave de un solo jugador y tira el
-- resto, así que lo de los demás no llega a salir de la base.
--
-- `security definer` para poder leer la tabla, y lo primero que hace es
-- comprobar la tutela: sin eso, cualquiera con sesión pediría la asistencia
-- de cualquier menor con sólo poner su identificador.
--
-- Y NO DEVUELVE EL MOTIVO DE LA FALTA. En `marks` cada ausencia puede llevar
-- una razón escrita a mano por el entrenador, que es donde la gente escribe
-- «tiene el tobillo fatal». Eso es información que el club anota para
-- trabajar, no un parte para la familia, y además puede ser información de
-- salud. Sale la marca y la fecha; el porqué, no.

create or replace function asistencia_de_mi_hijo(target uuid)
returns table (fecha date, marca text)
language sql stable security definer set search_path to 'public' as $$
  select a.date, (a.marks -> target::text ->> 'mark')::text
  from public.attendance a
  join public.players p on p.id = target
  where a.team_id = p.team_id
    and a.marks ? target::text
    and public.es_tutor_de(target)
  order by a.date desc;
$$;

comment on function asistencia_de_mi_hijo is
  'La asistencia de UN jugador, para su tutor. No se da política sobre attendance porque una fila es la lista del día entera.';

revoke all on function asistencia_de_mi_hijo(uuid) from anon;
