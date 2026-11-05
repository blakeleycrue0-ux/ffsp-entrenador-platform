-- ════════════════════════════════════════════════════════════════════════════
-- ¿UN TUTOR VE AL HIJO DEL VECINO?
-- ════════════════════════════════════════════════════════════════════════════
-- La pregunta que quedó sin responder. Las políticas de Postgres se SUMAN, así
-- que una mal escrita no recorta: amplía. La única prueba que vale es hacerse
-- pasar por el tutor y mirar.
--
-- El escenario: un club, un equipo, dos jugadores —Hijo Propio e Hijo Ajeno—
-- y una cuenta de tutor vinculada SÓLO al primero.

\set ON_ERROR_STOP on
set client_min_messages to warning;

-- ── El montaje, como superusuario ───────────────────────────────────────────
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'admin@prueba.test'),
  ('22222222-2222-2222-2222-222222222222', 'tutor@prueba.test');

/* Un disparador de 0010 ya crea el perfil al nacer la cuenta, así que esto
   sólo le pone el nombre. Que choque fue la primera señal de que ese
   disparador funciona. */
insert into profiles (id, email, full_name) values
  ('11111111-1111-1111-1111-111111111111', 'admin@prueba.test', 'Admin Club'),
  ('22222222-2222-2222-2222-222222222222', 'tutor@prueba.test', 'Tutor Propio')
on conflict (id) do update set full_name = excluded.full_name, email = excluded.email;

insert into clubs (id, name, created_by) values
  ('33333333-3333-3333-3333-333333333333', 'Club de prueba', '11111111-1111-1111-1111-111111111111');

insert into club_members (club_id, profile_id, role) values
  ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'admin');

insert into teams (id, name, club_id, created_by) values
  ('44444444-4444-4444-4444-444444444444', 'Equipo A', '33333333-3333-3333-3333-333333333333',
   '11111111-1111-1111-1111-111111111111');

insert into players (id, team_id, name, birth_date, notes) values
  ('55555555-5555-5555-5555-555555555555', '44444444-4444-4444-4444-444444444444',
   'Hijo Propio', '2012-03-04', 'nota del cuerpo tecnico sobre Propio'),
  ('66666666-6666-6666-6666-666666666666', '44444444-4444-4444-4444-444444444444',
   'Hijo Ajeno', '2012-07-08', 'nota del cuerpo tecnico sobre Ajeno');

-- El vínculo: esta cuenta es tutora de Hijo Propio. De Ajeno, nadie.
insert into player_guardians (player_id, profile_id, relation)
values ('55555555-5555-5555-5555-555555555555',
        '22222222-2222-2222-2222-222222222222', 'Padre');

-- Un recibo para cada uno, para ver si se filtran.
insert into fee_charges (club_id, player_id, concept, amount_cents, period_label) values
  ('33333333-3333-3333-3333-333333333333', '55555555-5555-5555-5555-555555555555',
   'Cuota Propio', 4500, '2026-11'),
  ('33333333-3333-3333-3333-333333333333', '66666666-6666-6666-6666-666666666666',
   'Cuota Ajeno', 4500, '2026-11');

-- Una sesión con la asistencia de los DOS en la misma fila, que es el caso
-- difícil: el permiso en Postgres es por fila y el dato ajeno está dentro.
insert into sessions (id, team_id, title, date, created_by) values
  ('77777777-7777-7777-7777-777777777777', '44444444-4444-4444-4444-444444444444',
   'Entreno de prueba', current_date, '11111111-1111-1111-1111-111111111111');

insert into attendance (session_id, team_id, date, marks) values (
  '77777777-7777-7777-7777-777777777777',
  '44444444-4444-4444-4444-444444444444',
  current_date,
  jsonb_build_object(
    '55555555-5555-5555-5555-555555555555',
      jsonb_build_object('status', 'presente', 'reason', ''),
    '66666666-6666-6666-6666-666666666666',
      jsonb_build_object('status', 'ausente', 'reason', 'ingresado por una lesion de rodilla')
  )
);

-- ── Ahora SOY el tutor ──────────────────────────────────────────────────────
\echo ''
\echo '  ── haciéndome pasar por el tutor de Hijo Propio ──'

/* DENTRO DE UNA TRANSACCION, y no es un detalle: `set local` fuera de una
   transaccion no hace nada, avisa con un WARNING facil de pasar por alto, y
   entonces las consultas siguen corriendo como superusuario — que SE SALTA
   las politicas. El primer intento "aprobo" ensenando los dos hijos. */
begin;
set local role authenticated;
set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
set local request.jwt.claim.role = 'authenticated';

\echo ''
\echo '  jugadores que ve (debe ser SÓLO Hijo Propio):'
select '    -> ' || name from players;

\echo ''
\echo '  recibos que ve (debe ser SÓLO Cuota Propio):'
select '    -> ' || concept || ' ' || (amount_cents/100.0) || ' EUR' from fee_charges;

\echo ''
\echo '  equipos que ve (el de su hijo, sin la plantilla):'
select '    -> ' || name from teams;

\echo ''
\echo '  filas de attendance que ve DIRECTAMENTE (debe ser 0: el motivo'
\echo '  medico de Ajeno esta en la misma fila):'
select '    -> ' || count(*)::text || ' filas' from attendance;

\echo ''
\echo '  inscripciones que ve (debe ser 0, no es administrador):'
select '    -> ' || count(*)::text || ' filas' from enrollments;

\echo ''
\echo '  formularios de inscripcion que ve (debe ser 0):'
select '    -> ' || count(*)::text || ' filas' from enrollment_forms;

commit;
