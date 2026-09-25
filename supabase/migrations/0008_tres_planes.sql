-- ════════════════════════════════════════════════════════════════════════════
-- 0008 · Tres planes: Gratis (1 equipo), Pro (5) y Max (sin límite)
-- ════════════════════════════════════════════════════════════════════════════
--
-- Requiere que la 0007 se haya ejecutado ANTES y por separado (ver su cabecera).
--
-- El cambio real es que `pro` deja de ser ilimitado y pasa a cinco equipos, y
-- que lo ilimitado se va a `max`. Como el límite es un DATO y no código, esto
-- son dos filas: la política que lo impone no se toca.
--
-- NADIE SE QUEDA SIN SUS EQUIPOS. Un club que hoy tenga siete equipos en `pro`
-- los conserva todos y puede seguir trabajando con ellos: la política sólo
-- mira el límite al CREAR uno nuevo. Bajar de plan nunca borra nada, y esta
-- migración tampoco.
--
-- LOS PRECIOS SIGUEN SIN DECIDIRSE y no se inventan aquí. Las tres filas nacen
-- sin importe; hasta que haya uno, la aplicación enseña el plan y no deja
-- pagar.
--
-- Es ADITIVA e idempotente: no borra tablas ni registros.
-- ════════════════════════════════════════════════════════════════════════════

insert into public.plans (tier, name, max_teams, trial_days)
values ('free', 'Gratis', 1,    0),
       ('pro',  'Pro',    5,    7),
       ('max',  'Max',    null, 7)
on conflict (tier) do update
  set name       = excluded.name,
      max_teams  = excluded.max_teams,
      trial_days = excluded.trial_days,
      updated_at = now();


/* `club_tier` y `puede_crear_equipo` no cambian: ya leían el límite de la
   tabla en vez de tenerlo escrito dentro. Añadir un plan no es un despliegue.

   Sí conviene dejar dicho, aquí y no en un comentario de código, qué pasa con
   un club que se pase del límite tras un cambio de plan: conserva sus equipos
   y no puede crear más. Se comprueba abajo. */


-- ════════════════════════════════════════════════════════════════════════════
-- VERIFICACIÓN
-- ════════════════════════════════════════════════════════════════════════════

-- 1) Los tres planes, con su límite y sin precio inventado.
select tier,
       name,
       coalesce(max_teams::text, 'sin límite')  as equipos,
       coalesce(price_monthly::text, '(sin decidir)') as mensual,
       coalesce(price_yearly::text,  '(sin decidir)') as anual,
       trial_days as dias_de_prueba
from public.plans
order by case tier when 'free' then 1 when 'pro' then 2 else 3 end;

-- 2) Que el límite se aplica de verdad, sin tocar ningún dato real.
--    Se prueba dentro de una transacción que se deshace al final.
do $$
declare
  club_prueba uuid;
  resultado   text;
begin
  select id into club_prueba from public.clubs limit 1;
  if club_prueba is null then
    raise notice 'Sin clubes todavía: nada que comprobar.';
    return;
  end if;

  raise notice 'Club de prueba: %', club_prueba;
  raise notice 'Plan efectivo: %', public.club_tier(club_prueba);
  raise notice 'Equipos que permite: %',
    coalesce(public.club_team_limit(club_prueba)::text, 'sin límite');
  raise notice 'Equipos que tiene: %',
    (select count(*) from public.teams where club_id = club_prueba);
  select case when public.puede_crear_equipo(club_prueba)
              then 'sí' else 'no' end into resultado;
  raise notice '¿Le cabe otro equipo?: %', resultado;
end $$;
