-- ════════════════════════════════════════════════════════════════════════════
-- 0022 · LAS LÍNEAS DE CADA DEPORTE
-- ════════════════════════════════════════════════════════════════════════════
--
-- La plantilla agrupa las posiciones por líneas y le da a cada una un color:
-- de un vistazo se ve cuánta gente hay atrás y si falta portería. Esa
-- agrupación estaba escrita en el código, en castellano y sólo para fútbol
-- —`{ Portera: 'porteria', Central: 'defensa', … }`—, así que un club de
-- baloncesto veía sus cinco posiciones sin color y sin filtros.
--
-- Aquí pasa a la tabla, al lado de las posiciones que agrupa.
--
--     [ { "id": "porteria", "label": "Portería", "positions": ["Portero"] },
--       { "id": "defensa",  "label": "Defensa",  "positions": [...] }, … ]
--
-- EL COLOR NO SE GUARDA, SE SACA DEL ORDEN. La paleta tiene cuatro colores de
-- posición y la interfaz coge el que toca por el índice de la línea. Guardar
-- aquí un nombre de color sería meter diseño en la base de datos: el día que
-- se cambie el verde, habría que tocar diez filas de SQL para repintar una
-- plantilla. Por eso ninguna lista pasa de cuatro líneas.
--
-- LOS DEPORTES SIN POSICIONES SE QUEDAN VACÍOS. Atletismo, natación y «otro
-- deporte» no tienen puestos; una lista vacía es la respuesta correcta y la
-- interfaz simplemente no enseña ni colores ni filtros. No se les inventa una
-- agrupación para que la columna no quede coja.
--
-- CADA POSICIÓN DE UNA LÍNEA EXISTE EN `positions`, y al revés: toda posición
-- del deporte cae en exactamente una línea. No es un comentario piadoso, lo
-- comprueba `pruebas/deportes.mjs` leyendo la tabla; si alguien añade una
-- posición y se olvida de ponerla en su línea, salta.
--
-- ADITIVA: añade una columna con valor por defecto y rellena diez filas. No
-- toca `players`, ni `positions`, ni ninguna política.
-- ════════════════════════════════════════════════════════════════════════════

alter table sports add column if not exists lines jsonb not null default '[]'::jsonb;

comment on column sports.lines is
  'Agrupación de las posiciones en líneas, en orden. El color lo pone la interfaz según el índice, por eso ninguna lista pasa de cuatro.';

update sports set lines = '[
  {"id":"porteria","label":"Portería","positions":["Portero"]},
  {"id":"defensa","label":"Defensa","positions":["Central","Lateral derecho","Lateral izquierdo"]},
  {"id":"medio","label":"Medio","positions":["Pivote","Interior","Mediapunta"]},
  {"id":"ataque","label":"Ataque","positions":["Extremo derecho","Extremo izquierdo","Delantero"]}
]'::jsonb where code = 'futbol';

update sports set lines = '[
  {"id":"porteria","label":"Portería","positions":["Portero"]},
  {"id":"cierre","label":"Cierre","positions":["Cierre"]},
  {"id":"alas","label":"Alas","positions":["Ala derecha","Ala izquierda"]},
  {"id":"pivot","label":"Pívot","positions":["Pívot"]}
]'::jsonb where code = 'futbol-sala';

-- Baloncesto va en tres y no en cinco: exterior, alero e interior es como se
-- habla de una plantilla, y cinco colores en una lista de doce nombres ya no
-- se leen de un vistazo, que es justo para lo que sirven.
update sports set lines = '[
  {"id":"exterior","label":"Exterior","positions":["Base","Escolta"]},
  {"id":"alero","label":"Alero","positions":["Alero"]},
  {"id":"interior","label":"Interior","positions":["Ala-pívot","Pívot"]}
]'::jsonb where code = 'baloncesto';

update sports set lines = '[
  {"id":"porteria","label":"Portería","positions":["Portero"]},
  {"id":"extremos","label":"Extremos","positions":["Extremo izquierdo","Extremo derecho"]},
  {"id":"laterales","label":"Laterales","positions":["Lateral izquierdo","Lateral derecho"]},
  {"id":"interior","label":"Interior","positions":["Central","Pivote"]}
]'::jsonb where code = 'balonmano';

update sports set lines = '[
  {"id":"colocacion","label":"Colocación","positions":["Colocador"]},
  {"id":"ataque","label":"Ataque","positions":["Opuesto","Receptor"]},
  {"id":"centro","label":"Centro","positions":["Central"]},
  {"id":"libero","label":"Líbero","positions":["Líbero"]}
]'::jsonb where code = 'voleibol';

update sports set lines = '[
  {"id":"porteria","label":"Portería","positions":["Portero"]},
  {"id":"defensa","label":"Defensa","positions":["Defensa"]},
  {"id":"exterior","label":"Exterior","positions":["Exterior"]},
  {"id":"boya","label":"Boya","positions":["Boya"]}
]'::jsonb where code = 'waterpolo';

update sports set lines = '[
  {"id":"derecha","label":"Derecha","positions":["Derecha"]},
  {"id":"reves","label":"Revés","positions":["Revés"]}
]'::jsonb where code = 'tenis-padel';

-- Atletismo, natación y «otro deporte» se quedan en `[]`, que es su verdad.
