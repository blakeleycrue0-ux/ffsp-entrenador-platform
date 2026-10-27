-- ════════════════════════════════════════════════════════════════════════════
-- 0023 · UNA SOLA GRAFÍA PARA LAS POSICIONES
-- ════════════════════════════════════════════════════════════════════════════
--
-- Llegaron a convivir tres listas de posiciones de fútbol escritas por
-- separado —la del formulario, la de las líneas de color y la del catálogo de
-- deportes— y los datos guardados usan una cuarta. Medido en la base antes de
-- escribir esto: de ocho posiciones guardadas, CINCO no existían en el
-- catálogo de su deporte, en dos clubes reales.
--
--     Delantera · Extremo derecha · Lateral derecha · Lateral izquierda
--
-- Lo que eso provoca, hoy, en la aplicación:
--
--   · la etiqueta de color no sale, porque la tabla de líneas no reconoce la
--     palabra, así que esas jugadores aparecen sin línea;
--   · al abrir la ficha, el desplegable de posición no encuentra el valor
--     guardado y se queda en blanco. Quien guarde sin tocarlo, la pierde.
--
-- NO SE BORRA NI SE VACÍA NADA: cada valor se cambia por el mismo puesto
-- escrito como lo escribe hoy el catálogo. «Lateral derecha» y «Lateral
-- derecho» son el mismo lateral derecho.
--
-- VA POR LA LISTA COMPLETA, no sólo por las cinco que había cuando se
-- escribió: si entre hoy y el despliegue alguien guarda otra de las formas
-- femeninas que el formulario ofrecía antes, también queda arreglada.
--
-- SÓLO TOCA LO QUE NO ESTÁ EN EL CATÁLOGO. La condición mira el deporte del
-- equipo —o el del club, o fútbol— y deja en paz cualquier valor que ya sea
-- correcto. Un club de baloncesto con «Pívot» no se entera de que esto pasó.
--
-- REVERSIBLE A OJO: son nueve parejas y están escritas aquí.
-- ════════════════════════════════════════════════════════════════════════════

with grafias(vieja, buena) as (values
  ('Portera',            'Portero'),
  ('Delantera',          'Delantero'),
  ('Lateral derecha',    'Lateral derecho'),
  ('Lateral izquierda',  'Lateral izquierdo'),
  ('Extremo derecha',    'Extremo derecho'),
  ('Extremo izquierda',  'Extremo izquierdo'),
  ('Medio centro',       'Pivote'),
  ('Media punta',        'Mediapunta'),
  ('Mediocentro',        'Pivote')
)
update players p
   set position = g.buena
  from grafias g, teams t, clubs c
 where t.id = p.team_id
   and c.id = t.club_id
   and coalesce(t.sport, c.sport, 'futbol') = 'futbol'
   and p.position = g.vieja;

with grafias(vieja, buena) as (values
  ('Portera',            'Portero'),
  ('Delantera',          'Delantero'),
  ('Lateral derecha',    'Lateral derecho'),
  ('Lateral izquierda',  'Lateral izquierdo'),
  ('Extremo derecha',    'Extremo derecho'),
  ('Extremo izquierda',  'Extremo izquierdo'),
  ('Medio centro',       'Pivote'),
  ('Media punta',        'Mediapunta'),
  ('Mediocentro',        'Pivote')
)
update players p
   set secondary_position = g.buena
  from grafias g, teams t, clubs c
 where t.id = p.team_id
   and c.id = t.club_id
   and coalesce(t.sport, c.sport, 'futbol') = 'futbol'
   and p.secondary_position = g.vieja;
