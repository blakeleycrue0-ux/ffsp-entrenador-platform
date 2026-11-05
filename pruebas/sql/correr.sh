#!/bin/bash
# ════════════════════════════════════════════════════════════════════════════
# LAS MIGRACIONES, CONTRA UN POSTGRES DE VERDAD Y EN LA MÁQUINA DE UNO
# ════════════════════════════════════════════════════════════════════════════
#
# POR QUÉ EXISTE ESTO. Hasta ahora una migración se comprobaba de la única
# manera que había: aplicándola al servidor de producción y mirando si algo se
# rompía. Eso no es una prueba, es una apuesta —y con las políticas de Postgres
# es la peor de todas, porque SE SUMAN: una política mal escrita no recorta
# nada, amplía, y amplía en silencio.
#
# Aquí se levanta un Postgres vacío, se le pone lo que Supabase trae de fábrica
# (el esquema `auth`, los tres roles, `storage`), se aplican LAS MIGRACIONES
# ENTERAS desde la 0001, y entonces se hace pasar a la sesión por un tutor o
# por un visitante anónimo con `set local role` para mirar qué ve.
#
# QUÉ NO PRUEBA, que conviene saberlo: no prueba PostgREST, ni el cliente de
# JavaScript, ni Storage de verdad. Prueba el esquema, las políticas y las
# funciones, que es donde está el riesgo de enseñar el dato de otro.
#
#   sudo pruebas/sql/correr.sh
set -u
PG=/usr/lib/postgresql/16/bin
[ -x $PG/initdb ] || { echo "Falta PostgreSQL 16. En Debian/Ubuntu: apt-get install -y postgresql-16"; exit 1; }
export PATH=$PG:$PATH

AQUI=$(cd "$(dirname "$0")" && pwd)
RAIZ=$(cd "$AQUI/../.." && pwd)
DATOS=${PGDATA_PRUEBA:-/var/lib/postgresql/p360}
PUERTO=${PGPORT_PRUEBA:-55432}
PSQL="psql -h /tmp -p $PUERTO -U postgres"

# El cluster se levanta una vez y se reutiliza entre ejecuciones.
if ! $PSQL -d postgres -tAc "select 1" >/dev/null 2>&1; then
  rm -rf "$DATOS"; mkdir -p "$DATOS"; chown postgres:postgres "$DATOS"; chmod 700 "$DATOS"
  su postgres -c "PATH=$PG:\$PATH initdb -D $DATOS -A trust --locale=C.UTF-8 -E UTF8" >/dev/null
  su postgres -c "PATH=$PG:\$PATH pg_ctl -D $DATOS -o '-p $PUERTO -k /tmp' -l $DATOS/log start" >/dev/null
  sleep 3
fi

rehacer() {
  $PSQL -d postgres -tAc "drop database if exists p360" >/dev/null
  $PSQL -d postgres -tAc "create database p360" >/dev/null
  $PSQL -d p360 -q -v ON_ERROR_STOP=1 -f "$AQUI/00_supabase.sql" >/dev/null || return 1
  for f in "$RAIZ"/supabase/migrations/*.sql; do
    $PSQL -d p360 -q -v ON_ERROR_STOP=1 -f "$f" >/dev/null 2>&1 \
      || { echo "  ✗ no aplica: $(basename "$f")"; $PSQL -d p360 -v ON_ERROR_STOP=1 -f "$f" 2>&1 | grep -E "ERROR|LINE" | head -4; return 1; }
  done
  # Los permisos de tabla van DESPUÉS: tienen que existir las tablas.
  $PSQL -d p360 -q -f "$AQUI/01_permisos.sql" >/dev/null
}

echo ""
echo "  ── las migraciones, desde cero ──"
rehacer || exit 1
echo "  ✓ $(ls "$RAIZ"/supabase/migrations/*.sql | wc -l | tr -d ' ') migraciones aplicadas sin un error"
echo "    $($PSQL -d p360 -tAc "select count(*) from information_schema.tables where table_schema='public'") tablas"

fallos=0
for prueba in "$AQUI"/[0-9][0-9]_*.sql; do
  case "$(basename "$prueba")" in 00_*|01_*) continue;; esac
  rehacer || exit 1
  salida=$($PSQL -d p360 -q -t -A -v ON_ERROR_STOP=1 -f "$prueba" 2>&1 | sed 's/^psql:[^ ]* //')
  echo "$salida" | grep -vE "^(INSERT|SET|UPDATE|BEGIN|COMMIT|DO|SELECT)" | grep -v "^$"
  if echo "$salida" | grep -q "✗\|ERROR"; then fallos=$((fallos+1)); fi
done

echo ""
if [ $fallos -gt 0 ]; then echo "  ✗ $fallos prueba(s) con algo que no cuadra"; exit 1; fi
echo "  Todo en orden: el esquema aplica y nadie ve lo que no es suyo."
echo ""
