-- ════════════════════════════════════════════════════════════════════════════
-- EL CAMINO ENTERO DE UNA INSCRIPCIÓN, HACIÉNDOME PASAR POR CADA UNO
-- ════════════════════════════════════════════════════════════════════════════
-- Se prueba lo que el club promete a la familia:
--   1. Un formulario en BORRADOR no abre, aunque tengas el enlace.
--   2. Publicado, abre, y sólo devuelve lo que hace falta para pintarlo.
--   3. Un envío sin un dato obligatorio se rechaza EN EL SERVIDOR.
--   4. Un envío sin aceptar el consentimiento se rechaza.
--   5. Un envío bueno guarda, devuelve justificante y avisa al club.
--   6. `anon` NO puede leer ni una fila de ninguna de las tres tablas.
--   7. Aprobar crea el jugador y emite su recibo, en una sola pieza.
--   8. Aprobar en el equipo de OTRO club se rechaza.
--   9. Quien no administra el club no puede aprobar nada.

\set ON_ERROR_STOP on
set client_min_messages to notice;

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'admin@prueba.test'),
  ('22222222-2222-2222-2222-222222222222', 'otro@prueba.test');
update profiles set full_name = 'Admin' where id = '11111111-1111-1111-1111-111111111111';

insert into clubs (id, name, created_by) values
  ('33333333-3333-3333-3333-333333333333', 'CE Prueba', '11111111-1111-1111-1111-111111111111');
insert into club_members (club_id, profile_id, role) values
  ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'admin');
insert into teams (id, name, club_id, created_by) values
  ('44444444-4444-4444-4444-444444444444', 'Alevín A',
   '33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111');

-- Un club ajeno, para la prueba 8.
insert into clubs (id, name, created_by) values
  ('99999999-9999-9999-9999-999999999999', 'Club Ajeno', '22222222-2222-2222-2222-222222222222');
insert into teams (id, name, club_id, created_by) values
  ('98989898-9898-9898-9898-989898989898', 'Equipo Ajeno',
   '99999999-9999-9999-9999-999999999999', '22222222-2222-2222-2222-222222222222');

insert into fee_plans (id, club_id, team_id, name, amount_cents, period, due_day, season)
values ('55555555-5555-5555-5555-555555555555',
        '33333333-3333-3333-3333-333333333333', '44444444-4444-4444-4444-444444444444',
        'Cuota alevín 2026/27', 4500, 'mensual', 5, '2026/27');

insert into enrollment_forms (
  id, club_id, team_id, fee_plan_id, title, intro, season, token, campos, documentos, consentimientos
) values (
  '66666666-6666-6666-6666-666666666666',
  '33333333-3333-3333-3333-333333333333', '44444444-4444-4444-4444-444444444444',
  '55555555-5555-5555-5555-555555555555',
  'Inscripción Alevín A 2026/27',
  'Rellena una ficha por jugador.',
  '2026/27',
  'abcdef0123456789abcdef0123456789',
  '[{"id":"alergias","label":"Alergias","tipo":"texto","obligatorio":true},
    {"id":"talla","label":"Talla de camiseta","tipo":"opcion","opciones":["6","8","10","12"],"obligatorio":false}]'::jsonb,
  '[{"id":"dni","label":"DNI del jugador","obligatorio":true}]'::jsonb,
  '[{"id":"datos","label":"Tratamiento de datos del menor","obligatorio":true},
    {"id":"imagen","label":"Uso de imagen","obligatorio":false}]'::jsonb
);

\echo ''
\echo '  1 · en BORRADOR, con el enlace correcto'
begin;
  set local role anon;
  select '    abierto=' || abierto || '  motivo=' || coalesce(motivo, '-')
    from formulario_de_inscripcion('abcdef0123456789abcdef0123456789');
commit;

\echo ''
\echo '  2 · publicado por el admin, y lo que ve el publico'
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
  update enrollment_forms set status = 'abierta'
   where id = '66666666-6666-6666-6666-666666666666';
commit;
select '    firmado por=' || coalesce((select full_name from profiles where id = published_by), 'NADIE')
       || '  a las=' || coalesce(published_at::text, 'NUNCA')
  from enrollment_forms where id = '66666666-6666-6666-6666-666666666666';
begin;
  set local role anon;
  select '    abierto=' || abierto || '  titulo=' || titulo || '  club=' || club_nombre
         || '  campos=' || jsonb_array_length(campos) || '  docs=' || jsonb_array_length(documentos)
    from formulario_de_inscripcion('abcdef0123456789abcdef0123456789');
commit;

\echo ''
\echo '  3 · envio SIN el dato obligatorio «alergias»'
begin;
  set local role anon;
  do $$
  begin
    perform enviar_inscripcion('abcdef0123456789abcdef0123456789', jsonb_build_object(
      'player_name', 'Marc Soler', 'guardian_name', 'Anna Soler',
      'guardian_email', 'anna@ejemplo.test',
      'respuestas', '{}'::jsonb,
      'consentimientos', jsonb_build_object('datos', now()::text)
    ));
    raise notice '    ✗ LO ACEPTO, y no debia';
  exception when others then
    raise notice '    ✓ rechazado: %', sqlerrm;
  end $$;
commit;

\echo ''
\echo '  4 · envio SIN aceptar el consentimiento obligatorio'
begin;
  set local role anon;
  do $$
  begin
    perform enviar_inscripcion('abcdef0123456789abcdef0123456789', jsonb_build_object(
      'player_name', 'Marc Soler', 'guardian_name', 'Anna Soler',
      'guardian_email', 'anna@ejemplo.test',
      'respuestas', jsonb_build_object('alergias', 'ninguna'),
      'consentimientos', '{}'::jsonb
    ));
    raise notice '    ✗ LO ACEPTO, y no debia';
  exception when others then
    raise notice '    ✓ rechazado: %', sqlerrm;
  end $$;
commit;

\echo ''
\echo '  5 · envio correcto'
begin;
  set local role anon;
  select '    justificante=' || justificante
    from enviar_inscripcion('abcdef0123456789abcdef0123456789', jsonb_build_object(
      'player_name', 'Marc Soler', 'player_birth_date', '2014-05-20',
      'player_doc', '12345678Z',
      'guardian_name', 'Anna Soler', 'guardian_email', 'ANNA@Ejemplo.test',
      'guardian_phone', '600111222', 'guardian_relation', 'Madre',
      'address', 'Carrer Gran, 1', 'postal_code', '07001', 'city', 'Palma',
      'respuestas', jsonb_build_object('alergias', 'ninguna', 'talla', '10'),
      'consentimientos', jsonb_build_object('datos', now()::text, 'imagen', now()::text)
    ));
commit;
select '    el correo se guarda en minusculas: ' || guardian_email from enrollments;
select '    avisos al club: ' || count(*)::text from notifications where title = 'Nueva inscripción';

\echo ''
\echo '  6 · que ve `anon` de las tablas (las tres deben dar 0)'
begin;
  set local role anon;
  select '    enrollments=' || (select count(*) from enrollments)
      || '  forms=' || (select count(*) from enrollment_forms)
      || '  documents=' || (select count(*) from enrollment_documents);
commit;

\echo ''
\echo '  7 · el admin aprueba'
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
  /* PRIMERO se llama, DESPUES se consulta. Puesta en un `where` contra
     `players`, que esta vacia, Postgres no tiene ni una fila que filtrar y
     la funcion no se ejecuta nunca: el primer intento "paso" sin aprobar
     nada. */
  do $$
  declare nuevo uuid;
  begin
    nuevo := aprobar_inscripcion(
      (select id from enrollments where codigo like 'INS-%'), null, 'Todo en orden');
    raise notice '    jugador creado=% (%)',
      (select name from players where id = nuevo), nuevo;
  end $$;
commit;
select '    recibo emitido: ' || concept || ' ' || (amount_cents/100) || ' EUR, periodo ' || period_label
       || ', vence ' || coalesce(due_date::text, 'sin fecha') from fee_charges;
select '    tutor colgado del jugador: ' || (guardians->0->>'name') || ' (' || (guardians->0->>'relation') || ')'
  from players where name = 'Marc Soler';
select '    la inscripcion queda: ' || status || ', revisada por '
       || coalesce((select full_name from profiles where id = reviewed_by), '?') from enrollments;

\echo ''
\echo '  8 · aprobar en el equipo de OTRO club'
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
  /* La fila se crea FUERA del bloque con `exception`. Un bloque con
     manejador es una subtransaccion: cuando salta la excepcion se deshace
     todo lo que hizo el bloque, el `insert` incluido. En el primer intento
     INS-SEGUNDA desaparecia y la prueba 9 fallaba por «no existe» en vez de
     por falta de permiso, que es lo que queria probar. Y con id fijo, para
     que la prueba 9 no tenga que buscarla: a quien no administra el club,
     RLS se la esconde. */
  insert into enrollments (id, form_id, club_id, codigo, player_name, guardian_name, guardian_email)
  values ('77777777-7777-7777-7777-777777777777',
          '66666666-6666-6666-6666-666666666666', '33333333-3333-3333-3333-333333333333',
          'INS-SEGUNDA', 'Nil Pons', 'Pere Pons', 'pere@ejemplo.test');
  do $$
  begin
    perform aprobar_inscripcion('77777777-7777-7777-7777-777777777777',
                                '98989898-9898-9898-9898-989898989898');
    raise notice '    ✗ LO ACEPTO, y no debia';
  exception when others then
    raise notice '    ✓ rechazado: %', sqlerrm;
  end $$;
commit;

\echo ''
\echo '  9 · aprobar sin administrar el club'
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
  do $$
  begin
    perform aprobar_inscripcion('77777777-7777-7777-7777-777777777777',
                                '44444444-4444-4444-4444-444444444444');
    raise notice '    ✗ LO ACEPTO, y no debia';
  exception when others then
    raise notice '    ✓ rechazado: %', sqlerrm;
  end $$;
commit;

\echo ''
\echo '  10 · cerrar un BORRADOR sin haberlo publicado nunca'
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
  do $$
  declare otro uuid;
  begin
    insert into enrollment_forms (club_id, title)
    values ('33333333-3333-3333-3333-333333333333', 'Borrador que se descarta')
    returning id into otro;
    update enrollment_forms set status = 'cerrada' where id = otro;
    raise notice '    ✓ se cierra sin reventar el check';
  exception when others then
    raise notice '    ✗ no deja cerrarlo: %', sqlerrm;
  end $$;
commit;

\echo ''
\echo '  11 · un visitante ANONIMO intenta aprobar y rechazar'
-- POR QUE ESTA PRUEBA EXISTE. La migracion solo concede `aprobar_inscripcion`
-- a `authenticated`, pero Supabase concede por omision EXECUTE sobre las
-- funciones de `public` a `anon` tambien, y el arnes de pruebas hace lo mismo
-- para parecerse. O sea: la concesion NO es la defensa. La defensa es el
-- `is_club_admin()` de la primera linea de la funcion, que con `auth.uid()`
-- nulo no puede dar verdadero. Eso es lo que se comprueba aqui.
begin;
  set local role anon;
  do $$
  begin
    perform aprobar_inscripcion('77777777-7777-7777-7777-777777777777',
                                '44444444-4444-4444-4444-444444444444');
    raise notice '    ✗ UN ANONIMO HA APROBADO UNA INSCRIPCION';
  exception when others then
    raise notice '    ✓ no puede aprobar: %', sqlerrm;
  end $$;
  do $$
  begin
    perform rechazar_inscripcion('77777777-7777-7777-7777-777777777777', 'porque quiero');
    raise notice '    ✗ UN ANONIMO HA RECHAZADO UNA INSCRIPCION';
  exception when others then
    raise notice '    ✓ no puede rechazar: %', sqlerrm;
  end $$;
commit;
