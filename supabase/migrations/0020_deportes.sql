-- ════════════════════════════════════════════════════════════════════════════
-- 0020 · MULTIDEPORTE: la configuración en una tabla, no repartida por el código
-- ════════════════════════════════════════════════════════════════════════════
--
-- Hasta aquí el fútbol estaba escrito dentro del programa: las diez posiciones
-- en `src/types/index.ts`, la convocatoria en la pantalla de partidos, los
-- noventa minutos donde tocara. Añadir el baloncesto por ese camino significa
-- buscar «Portera» por todo el repositorio y rezar.
--
-- Aquí cada deporte es UNA FILA. Añadir waterpolo es un `insert`, y cambiar la
-- convocatoria de balonmano es un `update`: sin tocar código y sin publicar.
--
-- ADITIVA Y SIN RIESGO. Una tabla nueva y dos columnas con valor por defecto
-- `futbol`: los cuatro clubes y los cinco equipos que ya existen siguen
-- exactamente igual, porque hoy todos son de fútbol.
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.sports (
  code           text primary key,
  name           text not null,

  /* CÓMO SE LLAMAN LAS COSAS. La aplicación dice «jugadora» y «partido» por
     todas partes. En natación no hay partidos y en atletismo no hay jugadores,
     y llamarlo así es la clase de detalle que hace que un club no se crea que
     la herramienta es para él. */
  player_noun    text not null default 'jugador',
  player_noun_pl text not null default 'jugadores',
  match_noun     text not null default 'partido',
  match_noun_pl  text not null default 'partidos',

  /* Las posiciones del deporte, en orden. Vacío significa que el deporte no
     usa posiciones —atletismo, natación—, y entonces el campo no se pide. */
  positions      text[] not null default '{}',

  /* Cuántos caben en una convocatoria y cuántos están en juego a la vez.
     Nulo = no hay número fijo; no se inventa uno. */
  squad_size     int,
  on_field       int,

  /* Duración de un encuentro, en minutos. Nulo donde no se mide así: una
     jornada de atletismo o una competición de natación duran lo que duran. */
  match_minutes  int,


  orden          int  not null default 100,
  activo         boolean not null default true,
  created_at     timestamptz not null default now()
);

comment on table public.sports is
  'Configuración por deporte. Añadir un deporte es un insert, no un despliegue.';

-- ── RLS ─────────────────────────────────────────────────────────────────────
-- Es configuración del producto, no datos de nadie: se puede leer siempre
-- —hace falta para pintar el selector de deporte ANTES de crear el club— pero
-- no se puede escribir desde la aplicación. Cambiarla es una migración.
alter table public.sports enable row level security;

drop policy if exists "sports lectura para todos" on public.sports;
create policy "sports lectura para todos"
  on public.sports for select
  to anon, authenticated
  using (activo);

-- Ni insert, ni update, ni delete: sin política, PostgREST los niega.

-- ── LOS DEPORTES ────────────────────────────────────────────────────────────
-- Los números son los reglamentarios de cada deporte. Donde no hay un número
-- único —la convocatoria depende de la competición— se deja el habitual en
-- base, y donde no tiene sentido se deja nulo en vez de inventarlo.

insert into public.sports
  (code, name, player_noun, player_noun_pl, match_noun, match_noun_pl, positions, squad_size, on_field, match_minutes, orden)
values
  ('futbol', 'Fútbol', 'jugador', 'jugadores', 'partido', 'partidos',
   array['Portero','Central','Lateral derecho','Lateral izquierdo','Pivote','Interior','Mediapunta','Extremo derecho','Extremo izquierdo','Delantero'],
   18, 11, 90,  10),

  ('futbol-sala', 'Fútbol sala', 'jugador', 'jugadores', 'partido', 'partidos',
   array['Portero','Cierre','Ala derecha','Ala izquierda','Pívot'],
   12, 5, 40,  20),

  ('baloncesto', 'Baloncesto', 'jugador', 'jugadores', 'partido', 'partidos',
   array['Base','Escolta','Alero','Ala-pívot','Pívot'],
   12, 5, 40,  30),

  ('balonmano', 'Balonmano', 'jugador', 'jugadores', 'partido', 'partidos',
   array['Portero','Extremo izquierdo','Lateral izquierdo','Central','Lateral derecho','Extremo derecho','Pivote'],
   16, 7, 60,  40),

  ('voleibol', 'Voleibol', 'jugador', 'jugadores', 'partido', 'partidos',
   array['Colocador','Opuesto','Receptor','Central','Líbero'],
   14, 6, null,  50),

  ('waterpolo', 'Waterpolo', 'jugador', 'jugadores', 'partido', 'partidos',
   array['Portero','Boya','Defensa','Exterior'],
   13, 7, 32,  60),

  ('tenis-padel', 'Tenis / pádel', 'jugador', 'jugadores', 'partido', 'partidos',
   array['Derecha','Revés'],
   null, 2, null,  70),

  ('atletismo', 'Atletismo', 'atleta', 'atletas', 'competición', 'competiciones',
   array[]::text[],
   null, null, null,  80),

  ('natacion', 'Natación', 'nadador', 'nadadores', 'competición', 'competiciones',
   array[]::text[],
   null, null, null,  90),

  ('otro', 'Otro deporte', 'deportista', 'deportistas', 'competición', 'competiciones',
   array[]::text[],
   null, null, null,  999)
on conflict (code) do update
   set name = excluded.name,
       player_noun = excluded.player_noun,
       player_noun_pl = excluded.player_noun_pl,
       match_noun = excluded.match_noun,
       match_noun_pl = excluded.match_noun_pl,
       positions = excluded.positions,
       squad_size = excluded.squad_size,
       on_field = excluded.on_field,
       match_minutes = excluded.match_minutes,
       orden = excluded.orden;

-- ── EL DEPORTE DEL CLUB Y DEL EQUIPO ────────────────────────────────────────
-- EN LOS DOS SITIOS, y no sólo en el club: un club puede tener fútbol y fútbol
-- sala, y el equipo manda sobre el club. El valor por defecto es `futbol`, así
-- que todo lo que ya existe sigue comportándose igual.

alter table public.clubs add column if not exists sport text not null default 'futbol';
alter table public.teams add column if not exists sport text not null default 'futbol';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'clubs_sport_fkey') then
    alter table public.clubs add constraint clubs_sport_fkey
      foreign key (sport) references public.sports(code);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'teams_sport_fkey') then
    alter table public.teams add constraint teams_sport_fkey
      foreign key (sport) references public.sports(code);
  end if;
end $$;


-- ════════════════════════════════════════════════════════════════════════════
-- VERIFICACIÓN
-- ════════════════════════════════════════════════════════════════════════════

select code, name, coalesce(array_length(positions,1),0) as posiciones,
       coalesce(squad_size::text,'—') as convocatoria,
       coalesce(match_minutes::text,'—') as minutos
from public.sports order by orden;

-- Nada se ha movido: todo lo que había sigue siendo de fútbol.
do $$
declare otros int;
begin
  select count(*) into otros from public.clubs where sport <> 'futbol';
  if otros > 0 then raise exception 'Algún club ha cambiado de deporte y no debería'; end if;
  select count(*) into otros from public.teams where sport <> 'futbol';
  if otros > 0 then raise exception 'Algún equipo ha cambiado de deporte y no debería'; end if;
  raise notice 'Los % clubes y los % equipos que ya existían siguen en fútbol.',
    (select count(*) from public.clubs), (select count(*) from public.teams);
end $$;
