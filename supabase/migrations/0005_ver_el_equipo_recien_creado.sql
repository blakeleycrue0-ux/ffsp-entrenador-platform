-- ════════════════════════════════════════════════════════════════════════════
-- 0005 · Poder ver el equipo que acabas de crear
-- ════════════════════════════════════════════════════════════════════════════
--
-- Crear un equipo fallaba SIEMPRE, con «new row violates row-level security
-- policy for table "teams"». Y no era falta de permisos: quien lo intentaba
-- era administración de su club y `is_club_admin()` respondía que sí.
--
-- El problema estaba en la política de SELECT, no en la de INSERT. La
-- aplicación guarda con `.select()`, que en SQL es `RETURNING`, y devolver la
-- fila recién escrita exige pasar también la política de lectura:
--
--     teams_select ... using (has_team_access(id))
--
-- `has_team_access` es `stable`, así que trabaja con la instantánea del
-- principio de la sentencia, y dentro se busca a sí misma:
--
--     ... from public.teams t join public.club_members m ... where t.id = target
--
-- En esa instantánea la fila nueva todavía no existe. La función devolvía
-- `false`, la lectura se rechazaba y con ella toda la inserción. Medido: el
-- mismo `insert` sin `returning` se guarda, y con `returning` se rechaza.
--
-- LA REGLA QUE SE SACA DE AQUÍ: una política sobre una tabla no debe volver a
-- consultar ESA MISMA tabla para decidir sobre una fila que se está
-- escribiendo. Tiene que decidir con las columnas que la fila ya trae. Por eso
-- `plays` o `drills` nunca dieron problema: miran su propio `club_id` y su
-- propio `created_by`.
--
-- Las políticas quedan diciendo exactamente lo mismo que antes —se ve el
-- equipo si perteneces a su club o si estás asignada a él; lo administra quien
-- administra su club— pero leyéndolo de la fila.
--
-- Es ADITIVA: no toca tablas, columnas ni registros. Sólo redefine políticas.
-- Se puede ejecutar más de una vez. Requiere 0001, 0002 y 0003.
-- ════════════════════════════════════════════════════════════════════════════

-- ── Ver un equipo ───────────────────────────────────────────────────────────
-- Antes: has_team_access(id), que releía `teams`.
-- Ahora: se mira el `club_id` de la propia fila. La comprobación de
-- `team_staff` se mantiene para quien esté asignada a un equipo, y consulta
-- otra tabla, así que la instantánea no le afecta.
drop policy if exists teams_select on public.teams;
create policy teams_select on public.teams for select to authenticated
  using (
    public.has_club_access(club_id)
    or exists (
      select 1 from public.team_staff ts
      where ts.team_id = teams.id and ts.profile_id = auth.uid()
    )
  );

-- ── Editar y borrar ─────────────────────────────────────────────────────────
-- Antes: can_manage_team(id), que también releía `teams`. Al editar la fila ya
-- existe y funcionaba, pero deja de funcionar en cuanto la escritura y la
-- lectura ocurren en la misma sentencia (un `upsert`, por ejemplo). Se lee el
-- club de la fila y se acabó el problema.
drop policy if exists teams_update on public.teams;
create policy teams_update on public.teams for update to authenticated
  using (club_id is not null and public.is_club_admin(club_id))
  with check (club_id is not null and public.is_club_admin(club_id));

drop policy if exists teams_delete on public.teams;
create policy teams_delete on public.teams for delete to authenticated
  using (club_id is not null and public.is_club_admin(club_id));

-- `teams_insert` no se toca: ya decidía con el `club_id` de la fila.


-- ════════════════════════════════════════════════════════════════════════════
-- VERIFICACIÓN
-- ════════════════════════════════════════════════════════════════════════════
-- Ninguna política de `teams` debe volver a nombrar a `teams`. La única
-- excepción admitida es `teams.id` dentro de la consulta a `team_staff`.

select policyname,
       cmd,
       qual       as using_clause,
       with_check
from pg_policies
where schemaname = 'public' and tablename = 'teams'
order by cmd, policyname;
