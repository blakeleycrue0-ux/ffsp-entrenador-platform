-- ════════════════════════════════════════════════════════════════════════════
-- 0007 · Añadir el nivel «max» al tipo de plan
-- ════════════════════════════════════════════════════════════════════════════
--
-- ESTA MIGRACIÓN VA SOLA, Y NO ES UN CAPRICHO. PostgreSQL deja añadir un valor
-- a un enum dentro de una transacción, pero NO deja usarlo en esa misma
-- transacción: la tabla de valores del tipo todavía no está publicada para el
-- resto de la sentencia. Si se pegara todo junto, el `insert` de la fila 'max'
-- fallaría con «unsafe use of new value of enum type».
--
-- Por eso se ejecuta esto primero, se deja terminar, y después la 0008.
--
-- Es ADITIVA e idempotente: añade un valor, no quita ninguno. Los clubes que
-- hoy son 'free' o 'pro' no se enteran.
-- ════════════════════════════════════════════════════════════════════════════

alter type plan_tier add value if not exists 'max';


-- ════════════════════════════════════════════════════════════════════════════
-- VERIFICACIÓN
-- ════════════════════════════════════════════════════════════════════════════
-- Debe devolver tres filas: free, pro, max.

select unnest(enum_range(null::plan_tier))::text as niveles_disponibles;
