#!/usr/bin/env bash
#
# Respaldo local de PostgreSQL para el Store Server (ADR-0001: el Store
# Server es la fuente de verdad operativa de la tienda; hasta que el agente
# de sincronizacion (F1-T5, src/sync/) drene el outbox, este Postgres es la
# UNICA copia de las ventas del dia). Ver docs/operaciones/
# respaldo-y-recuperacion-store-server.md para el runbook completo y el
# esquema de retencion documentado en prosa.
#
# Que hace:
#   1. pg_dump en formato "custom" (-Fc) de la base indicada por DATABASE_URL
#      (misma variable que usa la app real, ver src/common/prisma/
#      prisma.service.ts y .env.example — este script NO reinventa un
#      parseo paralelo de la cadena de conexion).
#   2. Verificacion basica de integridad del archivo recien creado
#      (pg_restore --list, sin restaurar nada) antes de darlo por bueno.
#   3. Poda de respaldos locales viejos segun la politica de retencion
#      "diario denso + semanal esparcido" (ver scripts/lib/retention.js).
#   4. Best-effort: si BACKUP_CLOUD_DEST esta configurado, invoca
#      backup-cloud-sync.sh para subir el respaldo recien creado fuera de
#      sitio. Un fallo de la nube NUNCA hace fallar este script (mismo
#      criterio que el resto del proyecto: la nube nunca esta en el camino
#      critico, ver ADR-0001) — solo se loguea un WARNING.
#
# Formato "custom" (-Fc), no plano (.sql) ni tar: permite restauracion
# selectiva/paralela con pg_restore (--jobs, --schema, --table) y viene
# comprimido por defecto — la eleccion recomendada por la documentacion
# oficial de pg_dump para este caso de uso.
#
# NOTA DE HONESTIDAD (igual criterio que store-server/README.md y ADR-0008):
# este script se escribio y se revisa cuidadosamente linea por linea, pero
# este entorno de desarrollo NO tiene Docker ni PostgreSQL instalados (se
# verifico con `which pg_dump`/`which docker` antes de escribir esto, ambos
# ausentes) — por lo tanto NUNCA se ejecuto contra una base real. Antes de
# confiar en esto para produccion: (a) correrlo contra un Postgres real y
# confirmar que el archivo resultante existe y no esta vacio, (b) hacer un
# simulacro de restore completo con restore.sh contra una base de prueba
# (un backup que nunca se restauro no es un backup confiable).
#
# Variables de entorno (ver .env.example para los defaults documentados):
#   DATABASE_URL              (requerida) misma cadena que usa la app.
#   BACKUP_DIR                directorio local de respaldos.
#   BACKUP_RETENCION_DIAS     dias de ventana "diaria densa" (conserva TODO).
#   BACKUP_RETENCION_SEMANAS  semanas adicionales de ventana "semanal" (solo
#                             el respaldo mas reciente de cada semana ISO).
#   BACKUP_CLOUD_DEST         si esta seteada, se intenta sync a la nube tras
#                             el respaldo local (ver backup-cloud-sync.sh).
#   BACKUP_CLOUD_AUTO         "false" para desactivar el auto-sync aunque
#                             BACKUP_CLOUD_DEST este configurada (default
#                             "true" si BACKUP_CLOUD_DEST existe).
#
# Uso tipico (ver seccion de cron en el runbook):
#   BACKUP_DIR=/var/backups/ckpos-store-server ./scripts/backup-local.sh
#
# Nota Windows: si la tienda piloto termina desplegandose sobre un Store
# Server con Windows (no confirmado — requisitos-red-tienda-piloto.md no fija
# el sistema operativo, pero ADR-0006 F0-T3 y el driver ESC/POS asumen
# "drivers Linux/Node", ver store-server/README.md, lo que sugiere una
# maquina Linux para el piloto), este script de bash NO corre ahi tal cual.
# Se necesitaria un equivalente en PowerShell (mismo pg_dump/pg_restore, que
# SI tienen binarios nativos de Windows) — deliberadamente no se escribe ese
# equivalente en este pase porque el SO real del Store Server del piloto
# todavia no esta confirmado y hacerlo sin esa confirmacion seria construir
# a ciegas; ver el runbook para la nota completa.

set -euo pipefail

# ---------------------------------------------------------------------------
# Resolucion de configuracion (con defaults documentados en .env.example)
# ---------------------------------------------------------------------------

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "[backup-local] ERROR: DATABASE_URL no esta definida. Ver .env.example (misma variable que usa la app)." >&2
  exit 1
fi

BACKUP_DIR="${BACKUP_DIR:-/var/backups/ckpos-store-server}"
BACKUP_RETENCION_DIAS="${BACKUP_RETENCION_DIAS:-7}"
BACKUP_RETENCION_SEMANAS="${BACKUP_RETENCION_SEMANAS:-4}"
BACKUP_CLOUD_AUTO="${BACKUP_CLOUD_AUTO:-true}"

# Validaciones defensivas de la politica de retencion: deben ser enteros >= 0.
if ! [[ "$BACKUP_RETENCION_DIAS" =~ ^[0-9]+$ ]]; then
  echo "[backup-local] ERROR: BACKUP_RETENCION_DIAS debe ser un entero >= 0 (valor actual: '$BACKUP_RETENCION_DIAS')." >&2
  exit 1
fi
if ! [[ "$BACKUP_RETENCION_SEMANAS" =~ ^[0-9]+$ ]]; then
  echo "[backup-local] ERROR: BACKUP_RETENCION_SEMANAS debe ser un entero >= 0 (valor actual: '$BACKUP_RETENCION_SEMANAS')." >&2
  exit 1
fi

if ! command -v pg_dump >/dev/null 2>&1; then
  echo "[backup-local] ERROR: pg_dump no esta instalado o no esta en el PATH. Requiere PostgreSQL client tools 14+ (idealmente misma major version que el servidor)." >&2
  exit 1
fi

if ! command -v pg_restore >/dev/null 2>&1; then
  echo "[backup-local] ERROR: pg_restore no esta instalado o no esta en el PATH (se necesita para la verificacion post-dump)." >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

mkdir -p "$BACKUP_DIR"

# ---------------------------------------------------------------------------
# 1. pg_dump
# ---------------------------------------------------------------------------

# Timestamp en UTC (evita ambiguedad de zona horaria/horario de verano en el
# nombre del archivo; la conversion a hora local de la tienda, si se necesita
# para mostrarsela a un humano, se hace al leer el nombre, no al escribirlo).
TIMESTAMP_UTC="$(date -u +%Y%m%dT%H%M%SZ)"
NOMBRE_ARCHIVO="ckpos_store_${TIMESTAMP_UTC}.dump"
RUTA_DESTINO="${BACKUP_DIR}/${NOMBRE_ARCHIVO}"
RUTA_TEMPORAL="${RUTA_DESTINO}.in-progress"

echo "[backup-local] Iniciando pg_dump -> ${RUTA_DESTINO}"

# pg_dump acepta directamente una URI de conexion como argumento posicional
# (dbname); no se re-parsea DATABASE_URL a mano en bash (evita bugs con
# caracteres especiales en usuario/password — la responsabilidad de que la
# URI este correctamente URL-encodeada, si el password tiene caracteres
# reservados como @ : / #, es de quien configura DATABASE_URL, igual que para
# la app NestJS que consume la misma variable).
#
# Se escribe primero a un archivo ".in-progress" y se renombra al final SOLO
# si pg_dump termino con exito: un respaldo a medias (proceso interrumpido,
# disco lleno) nunca debe quedar con el nombre "final" que la logica de
# retencion/restore trataria como un respaldo valido.
if ! pg_dump --dbname="$DATABASE_URL" --format=custom --file="$RUTA_TEMPORAL"; then
  echo "[backup-local] ERROR: pg_dump fallo. No se genero un respaldo valido." >&2
  rm -f "$RUTA_TEMPORAL"
  exit 1
fi

if [[ ! -s "$RUTA_TEMPORAL" ]]; then
  echo "[backup-local] ERROR: pg_dump termino sin error pero el archivo resultante esta vacio." >&2
  rm -f "$RUTA_TEMPORAL"
  exit 1
fi

mv "$RUTA_TEMPORAL" "$RUTA_DESTINO"
echo "[backup-local] pg_dump completo: $(du -h "$RUTA_DESTINO" 2>/dev/null | cut -f1) en ${RUTA_DESTINO}"

# ---------------------------------------------------------------------------
# 2. Verificacion basica de integridad (NO es una prueba de restore completa)
# ---------------------------------------------------------------------------

# pg_restore --list lee el TOC (table of contents) del archivo sin tocar
# ninguna base de datos: confirma que el archivo es un dump valido y legible,
# no que el restore completo vaya a funcionar sin errores (eso solo lo prueba
# un restore real — ver la nota de honestidad al principio de este archivo y
# el runbook operativo para el simulacro recomendado).
if ! pg_restore --list "$RUTA_DESTINO" >/dev/null 2>&1; then
  echo "[backup-local] ERROR: el archivo generado no paso la verificacion de 'pg_restore --list' (dump corrupto o incompleto). No se continua con la poda ni el sync a la nube." >&2
  exit 1
fi
echo "[backup-local] Verificacion basica (pg_restore --list) OK."

# ---------------------------------------------------------------------------
# 3. Poda de respaldos locales viejos (ver scripts/lib/retention.js)
# ---------------------------------------------------------------------------

echo "[backup-local] Aplicando politica de retencion (diarios completos: ${BACKUP_RETENCION_DIAS}d, semanales: ${BACKUP_RETENCION_SEMANAS} semana(s))..."

if ! command -v node >/dev/null 2>&1; then
  echo "[backup-local] ADVERTENCIA: 'node' no esta disponible; se omite la poda automatica de respaldos viejos. Revisar '${BACKUP_DIR}' manualmente." >&2
else
  LISTA_BACKUPS="$(
    find "$BACKUP_DIR" -maxdepth 1 -type f -name 'ckpos_store_*.dump' -printf '%T@|%f\n' 2>/dev/null \
      | awk -F'|' '{printf "%d|%s\n", $1*1000, $2}'
  )"

  ARCHIVOS_A_BORRAR="$(printf '%s\n' "$LISTA_BACKUPS" | node "${SCRIPT_DIR}/lib/retention.js" "$BACKUP_RETENCION_DIAS" "$BACKUP_RETENCION_SEMANAS" || true)"

  if [[ -n "$ARCHIVOS_A_BORRAR" ]]; then
    while IFS= read -r archivo; do
      [[ -z "$archivo" ]] && continue
      echo "[backup-local] Eliminando respaldo fuera de la ventana de retencion: ${archivo}"
      rm -f -- "${BACKUP_DIR}/${archivo}"
    done <<< "$ARCHIVOS_A_BORRAR"
  else
    echo "[backup-local] Nada que podar (todos los respaldos locales estan dentro de la ventana de retencion)."
  fi
fi

# ---------------------------------------------------------------------------
# 4. Sync a la nube (best-effort, nunca hace fallar el respaldo local)
# ---------------------------------------------------------------------------

if [[ -n "${BACKUP_CLOUD_DEST:-}" && "$BACKUP_CLOUD_AUTO" != "false" ]]; then
  echo "[backup-local] BACKUP_CLOUD_DEST configurada; invocando backup-cloud-sync.sh (best-effort)..."
  if ! "${SCRIPT_DIR}/backup-cloud-sync.sh" "$RUTA_DESTINO"; then
    echo "[backup-local] ADVERTENCIA: el sync a la nube fallo. El respaldo LOCAL sigue siendo valido; revisar conectividad/credenciales de BACKUP_CLOUD_DEST. No se reintenta automaticamente hasta el proximo ciclo de cron." >&2
  fi
else
  echo "[backup-local] BACKUP_CLOUD_DEST no configurada (o BACKUP_CLOUD_AUTO=false): el respaldo queda solo en local. Ver docs/operaciones/respaldo-y-recuperacion-store-server.md, seccion de respaldo fuera de sitio."
fi

echo "[backup-local] Listo."
