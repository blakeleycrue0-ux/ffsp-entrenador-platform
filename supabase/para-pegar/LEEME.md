# Las migraciones, sin comentarios, para pegar en el editor de Supabase

## Por qué existe esta carpeta

Las migraciones de `supabase/migrations/` llevan comentarios largos: por qué se
tomó cada decisión, qué se intentó antes y qué se rompió. Eso es deliberado y
se queda ahí, porque es donde hace falta el día que alguien —incluido yo— tenga
que entender por qué una política está escrita así.

Pero esos comentarios **se copian mal**. Pasó de verdad: al pegar
`0027_inscripciones.sql` en el editor SQL de Supabase, la selección empezó en la
segunda línea del encabezado y se quedó sin su `--` delante:

```
ERROR:  42601: syntax error at or near "INSCRIPCIONES"
LINE 1: INSCRIPCIONES: LA CUOTA DEJA DE CREARSE DE UN CLIC
```

El archivo estaba perfecto. Lo que falló fue el viaje entre el archivo y el
editor, y de ese viaje no se puede culpar a quien copia: un bloque de cuarenta
líneas de comentario antes de la primera instrucción es fácil de recortar mal, y
la primera línea de un archivo así no se parece en nada a SQL.

Así que aquí está la misma migración **sin un solo comentario fuera de las
funciones**. La primera línea es `create table`, que es inconfundible: si se
recorta mal, el error dirá algo que se entiende, y no «syntax error» en una
frase en castellano.

## Que son lo mismo, comprobado y no supuesto

No basta con que «parezca igual». Se construyeron dos bases de datos desde cero
—una con la migración original y otra con esta— y se compararon:

- tablas y columnas, con su tipo, si admiten nulo y su valor por omisión
- todas las restricciones, con su definición
- todas las políticas de acceso, con sus roles, su `using` y su `with check`
- todas las funciones, con sus argumentos, si son `security definer`, su
  `search_path` y **el md5 del cuerpo entero**
- índices, disparadores, permisos de ejecución y los cubos de almacenamiento

**986 líneas de volcado por cada lado y ni una diferencia.** Y después las doce
comprobaciones de comportamiento de `pruebas/sql/20_inscripcion.sql` contra la
base construida con esta versión: las doce dan lo mismo.

El md5 de cada función sale idéntico porque el filtro **no entra en los bloques
`$$ … $$`**: lo que hay dentro de una función es su cuerpo, no un comentario del
archivo, y tocarlo cambiaría lo que Postgres guarda. Ahí no se toca nada.

## Cómo se regenera

```sh
python3 supabase/pelar.py supabase/migrations/0027_inscripciones.sql \
  > supabase/para-pegar/0027_inscripciones.sql
```

Sirve para cualquier migración. **Si se cambia una migración, hay que volver a
generar su copia de aquí**, y por eso no hay ninguna nota dentro del archivo
generado avisando de ello: una nota así tendría que ir en la primera línea, y la
primera línea sin SQL es justo el problema que esta carpeta resuelve.

## Qué hacer con el archivo

Abrir el editor SQL de Supabase, pegarlo entero y ejecutarlo. Es idempotente
—todo va con `if not exists`, `or replace` y `on conflict`—, así que si se queda
a medias se puede volver a lanzar sin romper nada ni duplicar nada.
