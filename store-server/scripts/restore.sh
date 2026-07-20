#!/usr/bin/env bash
#
# Restauracion de un respaldo de PostgreSQL del Store Server. ESTE SCRIPT ES
# DESTRUCTIVO: reemplaza el contenido de la base de datos destino. Se trata
# con la misma cautela que cualquier operacion destructiva del proyecto (ver
# el Git Safety Protocol que sigue este mismo repo para comandos destructivos
# equivalentes) — requiere una bandera EXPLICITA y, si corre en una terminal
# interactiva, una confirmacion escrita ademas de la bandera.
#
# Mapea al procedimiento de recuperacion documentado en
# docs/operaciones/respaldo-y-recuperacion-store-server.md ("Se murio el
# disco del Store Server, tenemos un respaldo de hace N horas, que hacemos").
#
# Que hace, en orden:
#   1. Valida que el archivo de respaldo existe y es un dump valido
#      (pg_restore --list) ANTES de tocar nada en la base de datos.
#   2. Exige --force. Sin --force, el script explica que haria y termina sin
#      cambiar nada (modo "dry-run" de facto).
#   3. Si stdin es una terminal interactiva, pide escribir el NOMBRE de la
#      base de datos destino como confirmacion adicional (protege contra un
#      --force copiado/pegado sin pensar). Si stdin NO es interactivo (ej.
#      corriendo desde otro script/automatizacion), se exige en su lugar la
#      variable de entorno CONFIRMAR_RESTORE=si — nunca procede en silencio.
#   4. pg_restore --clean --if-exists --no-owner --no-privileges contra la
#      base indicada por DATABASE_URL (o --database-url si se pasa
#      explicito): borra y recrea cada objeto que el dump conoce, DENTRO de
#      esa base de datos (no dropea la base de datos completa — ver la
#      seccion "Restauracion en una maquina nueva" del runbook para el caso
#      de un Postgres recien instalado desde cero, donde primero hay que
#      crear la base vacia con createdb/CREATE DATABASE).
#
# NOTA DE HONESTIDAD: este script se escribio y se reviso cuidadosamente
# (flags de pg_restore verificadas contra la documentacion oficial), pero
# NUNCA se ejecuto contra un Postgres real en este entorno de desarrollo (sin
# Docker/Postgres disponibles, confirmado con `which pg_restore`). Un
# simulacro de restore REAL contra una base de prueba (no la de produccion)
# es un paso obligatorio antes de confiar en este procedimiento durante una
# emergencia real — ver checklist en el documento operativo.
#
# Uso:
#   ./scripts/restore.sh --file /var/backups/ckpos-store-server/ckpos_store_20260720T060000Z.dump --force
#
# Variables de entorno:
#   DATABASE_URL       cadena de conexion a la base DESTINO (misma variable
#                      que usa la app; ver .env.example). Puede sobreescribirse
#                      con --database-url si se quiere restaurar a una base
#                      distinta de prueba sin tocar el .env real.
#   CONFIRMAR_RESTORE  "si" para saltar el prompt interactivo cuando stdin no
#                      es una terminal (uso en automatizacion/CI de pruebas).

set -euo pipefail

ARCHIVO=""
DATABASE_URL_DESTINO="${DATABASE_URL:-}"
FORZAR="false"

uso() {
  cat >&2 <<'EOF'
Uso: restore.sh --file <ruta_al_dump> [--database-url <cadena_de_conexion>] --force

  --file <ruta>            Ruta al archivo .dump generado por backup-local.sh
                            (formato custom de pg_dump, -Fc).
  --database-url <cadena>  Cadena de conexion destino (default: $DATABASE_URL).
  --force                  OBLIGATORIA. Sin esta bandera el script no hace
                            nada destructivo (solo valida el archivo).

Este script SIEMPRE requiere --force porque BORRA Y RECREA el contenido de
la base de datos destino. Ver docs/operaciones/
respaldo-y-recuperacion-store-server.md para el procedimiento completo.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --file)
      ARCHIVO="${2:-}"
      shift 2
      ;;
    --database-url)
      DATABASE_URL_DESTINO="${2:-}"
      shift 2
      ;;
    --force)
      FORZAR="true"
      shift
      ;;
    -h|--help)
      uso
      exit 0
      ;;
    *)
      echo "[restore] ERROR: argumento desconocido: $1" >&2
      uso
      exit 2
      ;;
  esac
done

if [[ -z "$ARCHIVO" ]]; then
  echo "[restore] ERROR: falta --file <ruta_al_dump>." >&2
  uso
  exit 2
fi

if [[ ! -f "$ARCHIVO" ]]; then
  echo "[restore] ERROR: el archivo no existe: ${ARCHIVO}" >&2
  exit 1
fi

if [[ -z "$DATABASE_URL_DESTINO" ]]; then
  echo "[restore] ERROR: no hay base de datos destino. Definir DATABASE_URL o pasar --database-url." >&2
  exit 1
fi

if ! command -v pg_restore >/dev/null 2>&1; then
  echo "[restore] ERROR: pg_restore no esta instalado o no esta en el PATH." >&2
  exit 1
fi

# ---------------------------------------------------------------------------
# 1. Validar el archivo ANTES de tocar cualquier base de datos.
# ---------------------------------------------------------------------------

echo "[restore] Validando el archivo de respaldo (pg_restore --list, no toca ninguna base de datos)..."
if ! pg_restore --list "$ARCHIVO" >/dev/null 2>&1; then
  echo "[restore] ERROR: '${ARCHIVO}' no es un dump valido de pg_dump formato custom (o esta corrupto). Abortando ANTES de tocar la base de datos destino." >&2
  exit 1
fi
echo "[restore] Archivo valido."

# ---------------------------------------------------------------------------
# 2. Exigir --force (dry-run informativo si falta).
# ---------------------------------------------------------------------------

if [[ "$FORZAR" != "true" ]]; then
  cat >&2 <<EOF

[restore] MODO DRY-RUN (sin --force): no se realizo ningun cambio.

Si se ejecutara con --force, este script BORRARIA Y RECREARIA el contenido
de la base de datos destino (segun DATABASE_URL/--database-url) con el
contenido de:
  ${ARCHIVO}

Esto es IRREVERSIBLE salvo que exista otro respaldo de la base ANTES de
correr esto. Vuelva a ejecutar con --force cuando este seguro, y responda la
confirmacion que se le pedira a continuacion.
EOF
  exit 3
fi

# ---------------------------------------------------------------------------
# 3. Confirmacion adicional (interactiva o via variable de entorno).
# ---------------------------------------------------------------------------

if [[ -t 0 ]]; then
  echo
  echo "[restore] ADVERTENCIA: esto va a REEMPLAZAR el contenido de la base de datos destino."
  echo "[restore] Archivo:  ${ARCHIVO}"
  echo "[restore] Destino:  ${DATABASE_URL_DESTINO}"
  echo
  read -r -p "Escriba exactamente CONFIRMAR para continuar: " RESPUESTA
  if [[ "$RESPUESTA" != "CONFIRMAR" ]]; then
    echo "[restore] Cancelado por el usuario (no se escribio 'CONFIRMAR' exactamente). No se realizo ningun cambio." >&2
    exit 4
  fi
else
  if [[ "${CONFIRMAR_RESTORE:-}" != "si" ]]; then
    echo "[restore] ERROR: stdin no es interactivo (ej. corriendo desde otro script) y CONFIRMAR_RESTORE!=si. Por seguridad, no se procede sin confirmacion explicita. Definir CONFIRMAR_RESTORE=si si esto es intencional (ej. un simulacro de restore automatizado)." >&2
    exit 4
  fi
  echo "[restore] Confirmacion no interactiva recibida (CONFIRMAR_RESTORE=si)."
fi

# ---------------------------------------------------------------------------
# 4. pg_restore real.
# ---------------------------------------------------------------------------

echo "[restore] Restaurando... (esto puede tardar segun el tamano de la base)"

# --clean --if-exists: dropea cada objeto (tablas, indices, etc.) antes de
#   recrearlo, sin fallar si un objeto todavia no existe (ej. primera
#   restauracion en una base vacia). Deja la base DESTINO con EXACTAMENTE el
#   contenido del dump al terminar.
# --no-owner --no-privileges: no intenta reasignar OWNER/GRANTs del dump
#   original (que puede haberse tomado con un rol distinto al que existe en
#   el destino) — evita errores de "role does not exist" en una restauracion
#   a una maquina/entorno distinto del original.
# --exit-on-error: si un solo statement falla, pg_restore se detiene en vez
#   de seguir e imprimir un resumen de errores al final — para una
#   restauracion de disaster-recovery preferimos fallar ruidoso y temprano.
if pg_restore \
    --dbname="$DATABASE_URL_DESTINO" \
    --clean \
    --if-exists \
    --no-owner \
    --no-privileges \
    --exit-on-error \
    "$ARCHIVO"; then
  echo "[restore] Restauracion completada con exito."
else
  echo "[restore] ERROR: pg_restore reporto errores. Revisar el detalle arriba antes de asumir que la base quedo consistente." >&2
  exit 1
fi

echo "[restore] Listo. Ver docs/operaciones/respaldo-y-recuperacion-store-server.md, seccion 'Despues de restaurar', para los pasos de verificacion posteriores (arrancar el Store Server, confirmar que levanta, validar una venta de prueba)."
