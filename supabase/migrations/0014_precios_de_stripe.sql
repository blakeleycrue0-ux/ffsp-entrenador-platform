-- ════════════════════════════════════════════════════════════════════════════
-- 0014 · Los precios de Stripe, enganchados a los planes
-- ════════════════════════════════════════════════════════════════════════════
--
-- La 0012 puso los importes —5,99 y 12,99— y dejó a propósito vacías las dos
-- columnas de Stripe, porque los precios no existían allí todavía. Ya existen:
-- se han creado en la cuenta conectada, en modo REAL, dos productos y cuatro
-- precios recurrentes en euros.
--
--     Playoff360 Pro   prod_VPmmAeummwTGGh
--       mensual  5,99 €   price_1UOxDEFB7wERNFpwh6doA5g5
--       anual   59,99 €   price_1UOxDLFB7wERNFpwRK5uyb46
--
--     Playoff360 Max   prod_VPmm5bfMFg7z6Q
--       mensual 12,99 €   price_1UOxDRFB7wERNFpwanYSotwr
--       anual  129,99 €   price_1UOxDYFB7wERNFpwpfMUMXif
--
-- Los importes no se tocan aquí: ya estaban y coinciden con los de Stripe.
-- Esto sólo engancha una cosa con la otra.
--
-- ───────────────────────────────────────────────────────────────────────────
-- ESTO HACE `contratable` VERDADERO, Y HAY QUE SABER QUÉ ARRASTRA
--
-- `billing.parsePlan` deriva `contratable` de que haya precio de Stripe. Con
-- esta migración pasa a ser cierto para Pro y Max, y eso enciende tres cosas:
--
--   · La portada deja de decir «todavía no se puede pagar» y empieza a
--     enseñar los días de prueba.
--   · La pantalla de planes de dentro ofrece contratar.
--   · `entitlements.permisosDe` deja de dar barra libre: `puede()` empieza a
--     mirar de qué plan es cada capacidad. Hoy ninguna pantalla llama a
--     `puede()` todavía, así que en la práctica no se cierra nada, pero el
--     día que alguna lo haga, lo hará de verdad.
--
-- LO QUE ESTO NO HACE: no cobra. Cobrar necesita además cuatro variables de
-- entorno en el servidor —la clave de Stripe, la de servicio de Supabase, su
-- URL y el secreto del webhook—, y ésas las pone una persona en el panel de
-- Netlify. Por eso la portada no se fía sólo de `contratable`: pregunta a
-- `/.netlify/functions/estado-pago` si el servidor tiene lo que necesita, y
-- hasta que lo tenga sigue diciendo la verdad.
--
-- ADITIVA e idempotente: actualiza dos filas de catálogo. No toca
-- `subscriptions`, no borra nada.
-- ════════════════════════════════════════════════════════════════════════════

update public.plans set
  stripe_price_monthly = 'price_1UOxDEFB7wERNFpwh6doA5g5',
  stripe_price_yearly  = 'price_1UOxDLFB7wERNFpwRK5uyb46',
  updated_at = now()
where tier = 'pro';

update public.plans set
  stripe_price_monthly = 'price_1UOxDRFB7wERNFpwanYSotwr',
  stripe_price_yearly  = 'price_1UOxDYFB7wERNFpwpfMUMXif',
  updated_at = now()
where tier = 'max';

/* Gratis no se toca: no se contrata, se usa. Dejarle un precio de Stripe
   sería ofrecer pagar cero euros con tarjeta. */


-- ════════════════════════════════════════════════════════════════════════════
-- VERIFICACIÓN
-- ════════════════════════════════════════════════════════════════════════════

-- 1) Qué quedó enganchado y qué no.
select tier,
       to_char(price_monthly / 100.0, 'FM999D00') || ' €/mes' as mensual,
       coalesce(stripe_price_monthly, '—')                    as stripe_mensual,
       coalesce(stripe_price_yearly,  '—')                    as stripe_anual,
       (stripe_price_monthly is not null
        or stripe_price_yearly is not null)                   as contratable
from public.plans
order by case tier when 'free' then 1 when 'pro' then 2 else 3 end;

-- 2) Gratis NO puede ser contratable: si lo fuera, la aplicación ofrecería
--    pagar por el plan gratuito.
do $$
declare n int;
begin
  select count(*) into n from public.plans
   where tier = 'free'
     and (stripe_price_monthly is not null or stripe_price_yearly is not null);
  if n > 0 then
    raise exception 'El plan gratuito tiene precio de Stripe: se ofrecería pagar por lo que es gratis.';
  end if;
  raise notice 'Gratis sigue sin precio de Stripe, como debe ser.';
end $$;

-- 3) Los dos de pago tienen SUS DOS precios. Con uno solo, el botón de
--    «anual» llevaría a una pasarela sin precio y fallaría al pulsarlo.
do $$
declare faltan text;
begin
  select string_agg(tier::text, ', ') into faltan
    from public.plans
   where tier <> 'free'
     and (stripe_price_monthly is null or stripe_price_yearly is null);
  if faltan is not null then
    raise exception 'Estos planes se pueden contratar a medias: %', faltan;
  end if;
  raise notice 'Pro y Max tienen los dos periodos.';
end $$;

-- 4) Nadie ha quedado suscrito por accidente: esto no toca `subscriptions`.
select count(*) as suscripciones from public.subscriptions;
