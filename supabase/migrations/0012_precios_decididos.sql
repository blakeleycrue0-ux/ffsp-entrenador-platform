-- ════════════════════════════════════════════════════════════════════════════
-- 0012 · Los precios, decididos: Pro 5,99 €/mes y Max 12,99 €/mes
-- ════════════════════════════════════════════════════════════════════════════
--
-- Hasta hoy las tres filas de `plans` nacían sin importe a propósito: no había
-- precio decidido y se prefería enseñar el plan sin cifra antes que inventar
-- una. Ya lo hay, y lo ha puesto quien manda en el producto:
--
--     Gratis  0 €              1 equipo
--     Pro     5,99 €/mes       59,99 €/año   (ahorra 11,89 €)   1 equipo
--     Max     12,99 €/mes      129,99 €/año  (ahorra 25,89 €)   hasta 5 equipos
--
-- Los importes van en CÉNTIMOS, que es lo que espera la columna y lo que usa
-- Stripe: 599, 5999, 1299, 12999. Nada de decimales en coma flotante para
-- dinero.
--
-- ───────────────────────────────────────────────────────────────────────────
-- ESTO NO ABRE EL COBRO, Y ES DELIBERADO
--
-- `stripe_price_monthly` y `stripe_price_yearly` SIGUEN VACÍAS. La aplicación
-- deriva de ellas si un plan se puede contratar (`billing.parsePlan`), así que
-- con esta migración la página de precios enseña cifras de verdad y el botón
-- de pagar sigue sin aparecer. Poner un precio y abrir la caja son dos cosas
-- distintas, y la caja no se abre hasta que la cuenta de Stripe esté
-- terminada: ahora mismo está en `connect_incomplete`.
--
-- Mientras eso siga así, `entitlements.permisosDe` deja usar TODO a todo el
-- mundo. Cerrar hoy una función detrás de un plan que nadie puede pagar no es
-- un incentivo, es una función rota.
--
-- ───────────────────────────────────────────────────────────────────────────
-- DOS LÍMITES BAJAN, Y HAY QUE DECIRLO
--
--     pro:  5 equipos  →  1
--     max:  sin límite →  5
--
-- Es lo que pide el nuevo encuadre comercial: Pro para un entrenador con su
-- equipo, Max para un club con varios. Ningún club pierde nada por esto:
--
--  · Bajar el límite NUNCA borra un equipo. La política `teams_insert` sólo
--    mira el límite al CREAR; editar y borrar no lo consultan. Un club que se
--    pase conserva todo y sigue trabajando, simplemente no crea más.
--  · Y hoy, además, no hay a quién afectar: comprobado antes de escribir esto,
--    la base tiene 0 clubes, 0 equipos y 0 suscripciones. La verificación de
--    abajo lo vuelve a comprobar al ejecutarse y canta si alguna vez deja de
--    ser cierto.
--
-- ADITIVA e idempotente: no crea ni borra tablas, no toca `subscriptions`, no
-- borra ningún registro. Sólo actualiza tres filas de catálogo. Requiere
-- 0006–0008.
-- ════════════════════════════════════════════════════════════════════════════

insert into public.plans
  (tier,   name,     max_teams, price_monthly, price_yearly, currency, trial_days)
values
  ('free', 'Gratis', 1,         0,             0,            'eur',    0),
  ('pro',  'Pro',    1,         599,           5999,         'eur',    7),
  ('max',  'Max',    5,         1299,          12999,        'eur',    7)
on conflict (tier) do update
  set name          = excluded.name,
      max_teams     = excluded.max_teams,
      price_monthly = excluded.price_monthly,
      price_yearly  = excluded.price_yearly,
      currency      = excluded.currency,
      trial_days    = excluded.trial_days,
      updated_at    = now();

/* Ni una palabra sobre `stripe_price_monthly` / `stripe_price_yearly`: el
   `do update` de arriba no las nombra, así que conservan lo que tuvieran
   —hoy, nada— y ningún plan pasa a ser contratable por esta migración. */


-- ════════════════════════════════════════════════════════════════════════════
-- VERIFICACIÓN
-- ════════════════════════════════════════════════════════════════════════════

-- 1) Los tres planes con su precio y su límite.
select tier,
       name,
       coalesce(max_teams::text, 'sin límite')                        as equipos,
       to_char(price_monthly / 100.0, 'FM999D00') || ' €/mes'         as mensual,
       to_char(price_yearly  / 100.0, 'FM999D00') || ' €/año'         as anual,
       to_char((price_monthly * 12 - price_yearly) / 100.0, 'FM999D00') || ' €' as ahorro_anual,
       trial_days                                                     as dias_de_prueba,
       coalesce(stripe_price_monthly, '(sin abrir)')                  as stripe_mensual
from public.plans
order by case tier when 'free' then 1 when 'pro' then 2 else 3 end;

-- 2) Que NADA se ha vuelto contratable sin querer.
do $$
declare n int;
begin
  select count(*) into n from public.plans
   where stripe_price_monthly is not null or stripe_price_yearly is not null;
  if n > 0 then
    raise exception 'Hay % plan(es) con precio de Stripe: el cobro se habría abierto sin pasarela.', n;
  end if;
  raise notice 'Ningún plan es contratable todavía, como debe ser.';
end $$;

-- 3) Qué clubes se pasan del nuevo límite. Debe salir vacío; si algún día no
--    sale vacío, esos clubes conservan sus equipos y no podrán crear más.
select c.id,
       c.name,
       public.club_tier(c.id)                            as plan,
       count(t.id)                                       as equipos,
       public.club_team_limit(c.id)                      as permite
from public.clubs c
left join public.teams t on t.club_id = c.id
group by c.id, c.name
having public.club_team_limit(c.id) is not null
   and count(t.id) > public.club_team_limit(c.id);

-- 4) Y que nadie ha perdido un equipo: el recuento total, antes y después, lo
--    da esta cifra. Esta migración no ejecuta ningún DELETE.
select count(*) as equipos_en_total from public.teams;
