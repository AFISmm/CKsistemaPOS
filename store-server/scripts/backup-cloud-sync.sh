#!/usr/bin/env bash
#
# Copia (no espejo) de los respaldos locales de PostgreSQL hacia un destino
# fuera de sitio, usando rclone. Ver docs/operaciones/
# respaldo-y-recuperacion-store-server.md para el porque de tener un segundo
# copia fuera de la tienda (si el disco/la maquina completa del Store Server
# se pierde -robo, incendio, falla de hardware-, un respaldo que SOLO vive en
# el mismo disco/maquina no sirve de nada).
#
# Por que rclone (y no aws s3 cp / scp / rsync directo):
#   - Es agnostico de proveedor: soporta S3 y compatibles (Backblaze B2,
#     Wasabi, MinIO), Google Cloud Storage, Azure Blob, SFTP, WebDAV, etc.,
#     todos con la MISMA interfaz de linea de comandos. Este proyecto todavia
#     NO tiene una cuenta de nube/almacenamiento contratada para respaldos
#     (es una decision de infraestructura a tomar en el despliegue real, no
#     algo que este script deba asumir) — eligiendo rclone en vez de, por
#     ejemplo, el CLI propietario de AWS, se evita atar el script a un
#     proveedor especifico antes de que exista ese contrato.
#   - Es un solo binario, sin dependencias de runtime (no requiere Python/AWS
#     SDK ni credenciales de un SDK especifico), lo que encaja con un cron job
#     simple en la maquina del Store Server.
#
# Que NO hace este script (a proposito):
#   - NO usa "rclone sync" (que borraria en la nube lo que ya no existe en
#     local). Usa "rclone copy": el respaldo sube y se ACUMULA en la nube de
#     forma independiente de la poda local (scripts/lib/retention.js). La
#     razon es exactamente la que motiva tener un respaldo fuera de sitio: si
#     la poda local ya borro un respaldo de hace 3 semanas, la copia en la
#     nube de ese mismo respaldo debe SEGUIR estando disponible ahi hasta que
#     una politica de retencion propia del proveedor de nube (ver mas abajo)
#     decida borrarla — nunca el mismo ciclo de poda local.
#   - NO define ninguna politica de retencion del LADO de la nube. Eso es una
#     decision de configuracion del bucket/remoto elegido en el momento del
#     despliegue real (ej. una "lifecycle rule" de S3/B2 que expire objetos
#     con mas de N meses) — no algo que este script deba imponer, porque cada
#     backend de rclone tiene su propio mecanismo nativo para eso y hacerlo
#     aqui duplicaria/contradiria esa configuracion.
#   - NO configura las credenciales/remoto de rclone (`rclone config`): eso es
#     un paso de configuracion de la maquina real (una sola vez, interactivo o
#     via variables de entorno de rclone), fuera del alcance de un script que
#     corre en cada ciclo de respaldo.
#
# NOTA DE HONESTIDAD: igual que backup-local.sh, este script NUNCA se ejecuto
# contra un remoto real (no hay cuenta de nube contratada para este proyecto
# todavia, y este entorno de desarrollo no tiene rclone instalado — se
# verifico con `which rclone`). Se revisa cuidadosamente la sintaxis y las
# banderas, pero falta la validacion real de un primer sync exitoso contra
# el remoto que finalmente se contrate.
#
# Uso:
#   backup-cloud-sync.sh                  # sincroniza TODO BACKUP_DIR
#   backup-cloud-sync.sh /ruta/archivo.dump  # sincroniza un unico archivo
#     (asi lo invoca backup-local.sh tras cada respaldo exitoso)
#
# Variables de entorno:
#   BACKUP_CLOUD_DEST   (requerida) remoto:ruta de rclone, ej.
#                       "ckpos-remoto:chicken-kitchen-backups/tienda-miami-fl"
#                       El "remoto" (la parte antes de ":") debe existir en la
#                       configuracion de rclone de la maquina (`rclone config`,
#                       o variables RCLONE_CONFIG_*), configurada UNA VEZ al
#                       desplegar — nunca credenciales hardcodeadas aqui.
#   BACKUP_DIR          directorio local de respaldos (mismo default que
#                       backup-local.sh: /var/backups/ckpos-store-server).
#   RCLONE_CONFIG       (opcional) ruta a un archivo de config de rclone
#                       distinto al default (~/.config/rclone/rclone.conf).
#
# Sin BACKUP_CLOUD_DEST definida, o sin rclone instalado, este script NO
# falla con error: loguea una advertencia clara y sale con codigo 0 (mismo
# criterio de "deshabilitado por defecto sin romper nada" que SyncModule usa
# para CLOUD_SYNC_URL, ver store-server/README.md seccion 8.1) — asi
# backup-local.sh puede invocarlo siempre de forma best-effort sin necesitar
# saber de antemano si esta configurado.

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/backups/ckpos-store-server}"
OBJETIVO="${1:-}"

if [[ -z "${BACKUP_CLOUD_DEST:-}" ]]; then
  echo "[backup-cloud-sync] BACKUP_CLOUD_DEST no esta configurada: no hay destino fuera de sitio definido todavia (decision de despliegue pendiente). No se hace nada; saliendo OK."
  exit 0
fi

if ! command -v rclone >/dev/null 2>&1; then
  echo "[backup-cloud-sync] ADVERTENCIA: rclone no esta instalado o no esta en el PATH. El respaldo queda SOLO en local hasta que se instale rclone y se configure el remoto. Ver docs/operaciones/respaldo-y-recuperacion-store-server.md." >&2
  exit 0
fi

RCLONE_FLAGS=(--fast-list --checksum)
if [[ -n "${RCLONE_CONFIG:-}" ]]; then
  RCLONE_FLAGS+=(--config "$RCLONE_CONFIG")
fi

if [[ -n "$OBJETIVO" ]]; then
  if [[ ! -f "$OBJETIVO" ]]; then
    echo "[backup-cloud-sync] ERROR: el archivo indicado no existe: ${OBJETIVO}" >&2
    exit 1
  fi
  echo "[backup-cloud-sync] Copiando ${OBJETIVO} -> ${BACKUP_CLOUD_DEST}"
  rclone copyto "${RCLONE_FLAGS[@]}" "$OBJETIVO" "${BACKUP_CLOUD_DEST}/$(basename "$OBJETIVO")"
else
  echo "[backup-cloud-sync] Copiando todo ${BACKUP_DIR} -> ${BACKUP_CLOUD_DEST}"
  rclone copy "${RCLONE_FLAGS[@]}" "$BACKUP_DIR" "$BACKUP_CLOUD_DEST"
fi

echo "[backup-cloud-sync] Listo."
