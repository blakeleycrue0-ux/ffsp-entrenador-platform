-- ════════════════════════════════════════════════════════════════════════════
-- 0013 · Apagar la guía de primeros pasos
-- ════════════════════════════════════════════════════════════════════════════
--
-- La pantalla de inicio enseña una guía con las primeras cosas que hay que
-- hacer —crear el equipo, poner el horario, pasar la primera lista— y cada
-- línea se marca sola cuando el dato existe de verdad. Cuando están todas, la
-- guía desaparece sin que nadie tenga que hacer nada.
--
-- ESTA COLUMNA ES PARA EL OTRO CASO: quien no quiere verla desde el primer
-- día. Guarda CUÁNDO la apagó, no un simple «sí»: saber la fecha permite
-- entender después si alguien la cerró antes de empezar o después de medio
-- montar el club, y no cuesta nada más.
--
-- POR QUÉ EN LA BASE Y NO EN EL NAVEGADOR. Es una decisión de la persona, no
-- de un aparato: quien la apaga en el móvil no quiere encontrársela otra vez
-- al abrir el portátil. `localStorage` serviría para recordar una pestaña
-- abierta; esto no.
--
-- NO HACE FALTA NINGUNA POLÍTICA NUEVA. `profiles_update_own` ya deja a cada
-- cual escribir en su propia fila, y es la única que se toca aquí: la guía de
-- una persona no la apaga otra. (La de administración del club puede escribir
-- en las filas de su club por `profiles_update_coord`, que ya existía y no se
-- amplía; lo peor que puede hacer con esto es ocultarle a alguien una guía.)
--
-- ADITIVA e idempotente: una columna que nace a nulo. Nadie pierde nada y
-- quien ya estaba dentro ve la guía con las líneas que lleve hechas.
-- ════════════════════════════════════════════════════════════════════════════

alter table public.profiles
  add column if not exists setup_hidden_at timestamptz;

comment on column public.profiles.setup_hidden_at is
  'Cuándo apagó esta persona la guía de primeros pasos. Nulo = la ve.';


-- ════════════════════════════════════════════════════════════════════════════
-- VERIFICACIÓN
-- ════════════════════════════════════════════════════════════════════════════

-- 1) La columna existe y admite nulos.
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public' and table_name = 'profiles' and column_name = 'setup_hidden_at';

-- 2) Nadie la tiene puesta todavía, y nadie ha perdido su fila.
select count(*) as perfiles,
       count(setup_hidden_at) as con_la_guia_apagada
from public.profiles;

-- 3) Las políticas de `profiles` siguen siendo las mismas tres.
select polname from pg_policy p
join pg_class c on c.oid = p.polrelid
where c.relname = 'profiles'
order by polname;
