-- ════════════════════════════════════════════════════════════════════════════
-- PRO DA DOS EQUIPOS. PAGAR 5,99 € PARA TENER LO MISMO QUE GRATIS NO ES UN PLAN.
-- ════════════════════════════════════════════════════════════════════════════
--
-- EL PROBLEMA, DICHO POR QUIEN PAGÓ. La migración 0012 dejó `max_teams` así:
-- Gratis 1, Pro 1, Max 5. Es decir, el único plan intermedio costaba 5,99 € al
-- mes y, en lo que la base de datos IMPONE de verdad, no daba absolutamente
-- nada más que el gratuito. Las dos funciones que añadía —trayectorias a mano
-- alzada y exportar la jugada en vídeo— están construidas, pero el límite que
-- se ve en pantalla, el que cuenta la política de RLS al crear un equipo, era
-- el mismo número: uno.
--
-- Se contrató la prueba de Pro en producción y lo primero que se encontró fue
-- eso: «sigo pudiendo tener un solo equipo».
--
-- QUÉ CAMBIA: una celda. Pro pasa de 1 a 2 equipos.
--
-- POR QUÉ 2 Y NO 5. Porque es lo que distingue los tres planes sin vaciar al
-- de arriba: Gratis es un equipo, Pro son dos —el entrenador que lleva dos
-- categorías—, Max son cinco —el club—. Subir Pro a cinco dejaría a Max sin
-- nada que vender salvo funciones que todavía no existen, y anunciar eso sería
-- cobrar por adelantado.
--
-- LO QUE NO CAMBIA: los precios (599 / 5999), los días de prueba, la moneda,
-- los identificadores de Stripe y el límite de los otros dos planes. El `do
-- update` de abajo nombra `max_teams` y nada más, así que ninguna otra columna
-- se toca aunque esté escrita en el `insert`.
--
-- SUBIR EL LÍMITE NO PUEDE ROMPER NADA. `teams_insert` sólo lo consulta al
-- CREAR, y pasa de rechazar a aceptar un segundo equipo en los clubes que
-- estén en Pro. Ningún equipo, ninguna suscripción y ningún club se tocan.
--
-- ADITIVA e idempotente. No crea ni borra tablas, no borra registros, no toca
-- `subscriptions`. Requiere 0006–0012.
-- ════════════════════════════════════════════════════════════════════════════

update public.plans
   set max_teams  = 2,
       updated_at = now()
 where tier = 'pro'
   and max_teams is distinct from 2;


-- ════════════════════════════════════════════════════════════════════════════
-- VERIFICACIÓN
-- ════════════════════════════════════════════════════════════════════════════

-- 1) Los tres límites, que ahora sí son tres números distintos.
select tier,
       name,
       coalesce(max_teams::text, 'sin límite')                 as equipos,
       to_char(price_monthly / 100.0, 'FM999D00') || ' €/mes'  as mensual
from public.plans
order by case tier when 'free' then 1 when 'pro' then 2 else 3 end;

-- 2) Que ningún plan de pago da lo mismo que el gratuito. Esto es la regla que
--    se incumplía, escrita de forma que vuelva a cantar si alguien la rompe.
do $$
declare
  gratis int := (select max_teams from public.plans where tier = 'free');
  n      int;
begin
  select count(*) into n
    from public.plans
   where tier <> 'free'
     and price_monthly > 0
     and max_teams is not null
     and max_teams <= gratis;
  if n > 0 then
    raise exception 'Hay % plan(es) de pago que no dan más equipos que Gratis', n;
  end if;
  raise notice 'Pro: % equipos. Max: % equipos. Gratis: %.',
    (select max_teams from public.plans where tier = 'pro'),
    (select max_teams from public.plans where tier = 'max'),
    gratis;
end $$;
