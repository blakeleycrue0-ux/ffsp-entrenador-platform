-- ════════════════════════════════════════════════════════════════════════════
-- 0018 · Añadir el nivel «club» al tipo de plan
-- ════════════════════════════════════════════════════════════════════════════
--
-- VA SOLO EN SU PROPIA MIGRACIÓN, y no es manía: Postgres deja añadir un valor
-- a un enum dentro de una transacción, pero NO deja usarlo en esa misma
-- transacción. Si el `insert` de la fila 'club' fuera detrás de este `alter`,
-- fallaría con «unsafe use of new value of enum type».
--
-- Es exactamente el mismo reparto que 0007 y 0008 cuando se añadió «max»: aquí
-- el valor, en 0019 la fila que lo usa.
--
-- POR QUÉ CLUB VA DESPUÉS DE MAX Y NO ANTES. El orden del enum no decide nada
-- —quien ordena es `NIVELES` en el código— pero se añade al final porque es lo
-- único que Postgres hace sin reescribir el tipo.
--
-- ADITIVA. No toca ninguna fila, ninguna política ni ninguna función. Un enum
-- con un valor que nadie usa no cambia el comportamiento de nada.
-- ════════════════════════════════════════════════════════════════════════════

alter type plan_tier add value if not exists 'club';


-- ════════════════════════════════════════════════════════════════════════════
-- VERIFICACIÓN
-- ════════════════════════════════════════════════════════════════════════════

-- Debe devolver cuatro filas: free, pro, max, club.
select unnest(enum_range(null::plan_tier))::text as niveles_disponibles;
