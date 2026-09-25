-- ════════════════════════════════════════════════════════════════════════════
-- 0004 · Cerrar las funciones de autorización al rol anónimo
-- ════════════════════════════════════════════════════════════════════════════
--
-- Supabase publica como API REST **toda** función del esquema `public`. Eso
-- dejaba `is_club_admin`, `has_team_access`, `create_club` y compañía
-- invocables sin haber iniciado sesión, en `/rest/v1/rpc/<nombre>`.
--
-- No filtraban datos —todas responden sobre quien llama, y sin sesión responden
-- «no»— pero no pintan nada en la superficie pública, y cada función de más ahí
-- es una puerta que alguien tendrá que revisar algún día.
--
-- EL DETALLE QUE IMPORTA: no basta con `revoke ... from anon`. PostgreSQL
-- concede EXECUTE a PUBLIC por omisión en toda función nueva, y `anon` lo
-- hereda de ahí; quitarle una concesión directa que nunca tuvo no cambia nada.
-- Hay que retirar la concesión a PUBLIC y volver a darla a quien la necesita.
--
-- Y quien la necesita siempre es `authenticated`: las expresiones de una
-- política de acceso se evalúan con los permisos de quien consulta, no con los
-- de quien creó la política. Sin EXECUTE, la aplicación no leería ni una fila.
--
-- Es ADITIVA en el sentido que importa: no toca tablas, columnas ni registros.
-- Sólo cambia permisos. Se puede ejecutar más de una vez.
--
-- Requiere 0001, 0002 y 0003.
-- ════════════════════════════════════════════════════════════════════════════

do $$
declare
  f text;
begin
  foreach f in array array[
    'public.is_coordinator()',
    'public.is_club_admin(uuid)',
    'public.has_club_access(uuid)',
    'public.has_team_access(uuid)',
    'public.can_manage_team(uuid)',
    'public.can_edit_team(uuid)',
    'public.shares_club_with(uuid)',
    'public.accept_invitation(text)',
    'public.create_club(text, text)'
  ]
  loop
    execute format('revoke all on function %s from public, anon;', f);
    execute format('grant execute on function %s to authenticated;', f);
  end loop;
end $$;

/* Excepción a propósito: consultar una invitación se hace ANTES de tener
   cuenta. Quien recibe el enlace mira de qué club es y quién la invita. No
   devuelve nada del contenido del equipo y exige conocer el token. */
revoke all on function public.peek_invitation(text) from public;
grant execute on function public.peek_invitation(text) to anon, authenticated;

/* Función de disparador: no se llama por la API. Los disparadores no comprueban
   el permiso de ejecución, así que el alta de cuentas sigue funcionando. */
revoke all on function public.handle_new_user() from public, anon, authenticated;


-- ════════════════════════════════════════════════════════════════════════════
-- VERIFICACIÓN
-- ════════════════════════════════════════════════════════════════════════════
-- `anon_puede` debe ser falso en todas menos en `peek_invitation`.
-- `con_sesion_puede` debe ser cierto en todas menos en `handle_new_user`.

select p.proname                                                as funcion,
       has_function_privilege('anon',          p.oid, 'execute') as anon_puede,
       has_function_privilege('authenticated', p.oid, 'execute') as con_sesion_puede
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
order by p.proname;
