# Respaldo y recuperación de PostgreSQL — Store Server

- **Para:** quien instala/configura el Store Server de una tienda (soporte
  técnico/IT), y quien responde a una emergencia de hardware en la tienda.
  No requiere ser desarrollador de NestJS — sí requiere poder usar una
  terminal Linux y tener acceso al Store Server.
- **Fase del proyecto:** gap identificado en el análisis de la matriz de
  requerimientos de Alsea (`docs/analisis-reunion-diego-arches-20260717.md`
  §7.2, ítem 6: "Respaldos locales y en la nube de PostgreSQL, con plan de
  mantenimiento de BD").
- **Fecha:** 2026-07-20.
- **Relacionado:** ADR-0001 (hub-and-spoke), ADR-0008 (Store Server
  secundario activo/pasivo — ese ADR resuelve la redundancia de un servidor
  que sigue *vivo*; este documento resuelve qué hacer cuando el Store Server
  se pierde por completo).

> **Estado de este documento y de los scripts que describe: revisado, NO
> ejecutado contra una base de datos real.** El entorno donde se escribió
> esto no tiene Docker ni PostgreSQL instalados (se confirmó con
> `which pg_dump`/`which docker`/`which rclone`, los tres ausentes) — mismo
> criterio de honestidad que el resto del proyecto (ver
> `store-server/README.md`, sección de notas de entorno, y ADR-0008). Los
> scripts se revisaron línea por línea y sus flags se verificaron contra la
> documentación oficial de `pg_dump`/`pg_restore`, pero **nunca corrieron
> contra un Postgres real**. Antes de confiar en esto en producción, ver la
> sección "Qué falta validar con Postgres real" al final.

---

## 1. Por qué esto importa (léalo aunque tenga prisa)

El Store Server (`store-server/`) es, por diseño (ADR-0001), la **fuente de
verdad operativa de la tienda**. Todo lo que pasa en el mostrador — pedidos,
cobros, inventario, cierres de caja — se guarda primero y de inmediato en su
base de datos PostgreSQL local. La nube central es solo un respaldo
*asíncrono y diferido*: la sincronización (`SyncModule`, F1-T5) drena los
eventos cada 15 segundos cuando hay internet, pero **hasta que ese drenado
ocurre, la única copia completa de las ventas del día vive en el disco del
Store Server**.

Esto significa algo muy concreto: **si el disco del Store Server se daña, o
la máquina se pierde por completo (robo, incendio, falla catastrófica de
hardware), y no hay un respaldo propio de la base de datos, se pierde
información real de ventas que la nube todavía no alcanzó a recibir** —
además de todo el catálogo, configuración de impuestos, usuarios y turnos
abiertos de esa tienda. No es un escenario hipotético: es exactamente el
motivo por el que ADR-0008 documenta el Store Server como "punto único de
fallo local" y por el que la matriz de requerimientos de un sistema POS real
(Alsea/Archis) exige explícitamente una funcionalidad de respaldos.

**Dos ideas para no perder de vista:**

1. Un respaldo que nunca se restauró no es un respaldo confiable, es una
   suposición. Este documento incluye, además del backup rutinario, el
   procedimiento de restauración — y deja explícito qué falta probar de
   verdad antes de abrir el piloto (sección final).
2. El respaldo local y el respaldo en la nube resuelven problemas
   **distintos**: el local te recupera rápido de un problema del disco/la
   base de datos sin perder tiempo bajando algo de internet; el de la nube
   te salva si la máquina *completa* (con su disco) desaparece.

---

## 2. Qué se respalda y con qué frecuencia

- **Qué:** la base de datos PostgreSQL completa del Store Server (la que
  apunta `DATABASE_URL` en `store-server/.env` — por defecto `ckpos_store`),
  usando `pg_dump` en **formato custom** (`-Fc`). Ese formato es un archivo
  binario comprimido que además permite una restauración selectiva/paralela
  si algún día hiciera falta (no es un archivo `.sql` de texto plano).
- **Con qué frecuencia:** cada **4 horas**, todo el día (recomendación por
  defecto — ver el porqué abajo). Un turno de tienda puede acumular varias
  horas de ventas no sincronizadas si hay un corte prolongado de internet
  (ver `docs/operaciones/guia-contingencia-gerente.md`); un respaldo cada 4
  horas acota cuánto se podría llegar a perder en el peor escenario (disco
  dañado justo antes del siguiente respaldo) a, como máximo, esas 4 horas de
  ventas.

  `docs/requisitos.md` (S-04) todavía no tiene confirmados por operaciones
  los horarios exactos de apertura/cierre de la tienda (los *dayparts* de
  `store-server/src/reportes/dayparts.ts` cubren las 24 horas del día
  precisamente porque ese horario real no está cerrado todavía). Por eso la
  recomendación por defecto es correr el respaldo **las 24 horas**, no solo
  "en horario de tienda": es más simple de configurar, no tiene costo
  operativo real (un `pg_dump` de una base de tienda individual es rápido y
  liviano), y no depende de que alguien mantenga sincronizado el cron con el
  horario real de la tienda si este cambia. Si operaciones confirma un
  horario fijo más adelante, el cron puede acotarse a esas horas sin cambiar
  nada del script.

- **Cómo se programa:** con `cron` (ver sección 4). No se construyó un
  scheduler propio — sería reinventar una herramienta que ya existe en
  cualquier Linux y que el equipo de soporte ya conoce.

## 3. Dónde viven los respaldos y por cuánto tiempo

### 3.1 Local

- **Dónde:** el directorio configurado en `BACKUP_DIR` (`store-server/.env`,
  default `/var/backups/ckpos-store-server`), en el mismo disco del Store
  Server (o, mejor si es posible en la instalación física real, en un disco
  *distinto* al de la base de datos — eso es una decisión de la instalación
  de hardware, no del script).
- **Por cuánto tiempo (esquema de retención):** "diario denso + semanal
  esparcido" —
  - Los respaldos de los últimos **`BACKUP_RETENCION_DIAS` días (default
    7)** se conservan **todos**, sin adelgazar (con un cron cada 4h son
    ~6 respaldos por día, ~42 en total en esa ventana).
  - Más allá de esos 7 días, y hasta `BACKUP_RETENCION_DIAS +
    BACKUP_RETENCION_SEMANAS*7` días de antigüedad (default 7 + 4×7 = 35
    días), se conserva **solo el respaldo más reciente de cada semana
    calendario**.
  - Cualquier respaldo más viejo que eso se borra automáticamente.

  Este esquema es la lógica implementada y probada (11 tests unitarios,
  sin necesitar Postgres) en `store-server/scripts/lib/retention.js` /
  `store-server/test/unit/backup-retention.spec.ts` — se factorizó como
  función pura precisamente para poder verificar los casos de borde (cruce
  de semana ISO, cruce de año, política en cero) sin depender de una base de
  datos real.

### 3.2 En la nube (fuera de sitio)

- **Dónde:** el destino configurado en `BACKUP_CLOUD_DEST`
  (`store-server/.env`), vía `rclone` — un "remoto:ruta" (ej. un bucket
  S3-compatible, Backblaze B2, Google Cloud Storage, SFTP...). Se eligió
  `rclone` por ser agnóstico de proveedor: **este proyecto todavía no tiene
  una cuenta de almacenamiento en la nube contratada para respaldos** —
  elegir de antemano un proveedor específico (ej. hardcodear el CLI de AWS)
  sería anticipar una decisión de compras/infraestructura que no está
  tomada. Configurar el remoto real de `rclone` (credenciales, bucket) es un
  paso de despliegue de la tienda, no algo que este documento decida.
- **Por cuánto tiempo:** este proyecto **no** replica el esquema de
  retención local a la nube. El script de sync (`backup-cloud-sync.sh`)
  hace una *copia* (nunca un espejo/mirror) — sube y acumula, sin borrar en
  la nube lo que la poda local ya eliminó. La retención del lado de la nube
  debe resolverse con una política propia del proveedor elegido (ej. una
  "lifecycle rule" de S3/B2 que expire objetos después de N meses) — eso se
  configura una vez, en el proveedor, al momento del despliegue real; no es
  responsabilidad del script.
- **Si `BACKUP_CLOUD_DEST` no está configurada:** el respaldo local sigue
  funcionando igual; simplemente no hay copia fuera de sitio todavía. Esto
  es un estado válido mientras no exista la cuenta de nube contratada, no un
  error — se loguea una advertencia clara en cada corrida para que quede
  visible en los logs que falta ese paso.

## 4. Cómo se instala/programa (cron)

En la máquina del Store Server (asumida Linux — ver nota de sistema
operativo en la sección 7):

```bash
# 1. Clonar/copiar store-server/ en la maquina, con .env configurado
#    (DATABASE_URL, BACKUP_DIR, BACKUP_RETENCION_DIAS, BACKUP_RETENCION_SEMANAS,
#    BACKUP_CLOUD_DEST si ya existe cuenta de nube contratada).
# 2. Confirmar que pg_dump/pg_restore (misma major version que el Postgres
#    del servidor) y node estan en el PATH del usuario que correra cron.
# 3. Editar el crontab del usuario que debe correr el respaldo
#    (recomendado: un usuario de servicio dedicado, no root):
crontab -e
```

Agregar una línea como esta (respaldo cada 4 horas, con las variables de
entorno necesarias cargadas explícitamente porque `cron` NO lee `.env`
automáticamente):

```cron
0 */4 * * * . /opt/ckpos/store-server/.env && /opt/ckpos/store-server/scripts/backup-local.sh >> /var/log/ckpos-backup.log 2>&1
```

Notas sobre esa línea:

- `0 */4 * * *` corre a las 00:00, 04:00, 08:00, 12:00, 16:00 y 20:00 (hora
  del sistema) — 6 veces al día.
- `. /opt/ckpos/store-server/.env` carga las variables del `.env` en el
  shell del cron job (ajustar la ruta real de instalación). Alternativa más
  robusta si el `.env` tiene comentarios/formato que no es 100% shell-safe:
  usar un wrapper que exporte solo las variables necesarias, o una unidad de
  `systemd` con `EnvironmentFile=` en vez de cron — cualquiera de las dos es
  válida, se documenta cron aquí por ser la opción más simple y universal en
  cualquier Linux.
- Redirigir la salida a un log (`>> ... 2>&1`) es importante: sin esto, un
  fallo del respaldo (disco lleno, Postgres caído) pasaría desapercibido —
  cron por defecto solo manda un email local si hay salida, que casi nunca
  se revisa en una tienda.
- **Revisar el log periódicamente** (o, mejor, configurar una alerta si el
  archivo de log no cambia en más de ~5 horas) — un respaldo que falla en
  silencio durante semanas es peor que no tener respaldo, porque da una
  falsa sensación de seguridad.

## 5. Runbook de recuperación — "el disco del Store Server murió"

Este es el procedimiento para cuando la Situación 2 de
`docs/operaciones/guia-contingencia-gerente.md` ("el sistema completo no
responde") resulta ser un problema de hardware real (no un simple reinicio)
y hay que reconstruir el Store Server desde un respaldo.

### Antes de empezar

- Confirme que de verdad se perdió la base de datos (no un problema de red,
  de energía, o algo que se resuelve reiniciando — ver la guía de
  contingencia del gerente primero).
- Si la máquina física sigue viva pero el disco de datos está dañado: puede
  bastar con reemplazar el disco y reinstalar PostgreSQL. Si la máquina
  completa se perdió: hace falta una máquina nueva con PostgreSQL 14+
  instalado antes de continuar (ver `store-server/README.md`, sección 1 y
  3, para los requisitos de instalación desde cero).

### Pasos

1. **Ubique el respaldo más reciente disponible.**
   - Primero busque en `BACKUP_DIR` de la máquina (si el disco de *datos*
     murió pero el respaldo estaba en un disco separado, o si se pudo
     recuperar el disco antes de reemplazarlo).
   - Si no hay nada local recuperable, descargue el respaldo más reciente
     del destino en la nube (`rclone copy remoto:ruta /ruta/local/`, el
     comando inverso al que usa `backup-cloud-sync.sh`).
   - **Anote la hora del respaldo elegido** (va en el nombre del archivo,
     ej. `ckpos_store_20260720T060000Z.dump` = 2026-07-20 06:00:00 UTC) —
     todo lo vendido DESPUÉS de esa hora y ANTES de la falla se perdió a
     nivel del Store Server local (puede que parte ya haya llegado a la nube
     vía sincronización, eso se reconcilia después, no es parte de este
     runbook).

2. **Prepare el Postgres destino.**
   - Máquina nueva/Postgres recién instalado: cree la base de datos vacía
     primero (`createdb -U ckpos ckpos_store`, o el nombre que use
     `DATABASE_URL`) — `restore.sh` restaura DENTRO de una base existente,
     no crea la base de datos por sí mismo.
   - Máquina existente con una base dañada/inconsistente: puede restaurar
     directamente sobre ella (`restore.sh` hace `--clean --if-exists`, borra
     y recrea cada objeto que el dump conoce).

3. **Ejecute el script de restauración, primero SIN `--force`** para
   confirmar que el archivo es válido y ver el mensaje informativo:
   ```bash
   ./scripts/restore.sh --file /ruta/al/ckpos_store_20260720T060000Z.dump
   ```
4. **Ejecute con `--force`** cuando esté seguro. El script pedirá que
   escriba `CONFIRMAR` de forma interactiva (protección adicional contra un
   `--force` copiado sin pensar):
   ```bash
   DATABASE_URL="postgresql://ckpos:ckpos@localhost:5432/ckpos_store?schema=public" \
     ./scripts/restore.sh --file /ruta/al/ckpos_store_20260720T060000Z.dump --force
   ```
5. **Después de restaurar:**
   - Corra `npm run prisma:generate` y confirme que `npm run start:prod` (o
     `start:dev`) levanta sin errores contra la base restaurada.
   - Confirme `GET /api/v1/catalogo` (o cualquier endpoint de lectura
     simple) responde con datos coherentes.
   - Avise a soporte/operaciones la hora exacta del respaldo restaurado, para
     poder reconstruir manualmente (papel → sistema, ver la guía de
     contingencia) cualquier venta ocurrida entre esa hora y el momento en
     que el sistema volvió a estar disponible.
   - Confirme que el agente de sincronización (`SyncModule`) vuelve a
     drenar con normalidad hacia la nube una vez que haya conectividad.

## 6. Qué NO cubre este documento

- **Redundancia de un Store Server que sigue vivo** (un segundo servidor en
  la misma tienda por streaming replication de PostgreSQL) — eso es
  ADR-0008 (F3-T3), una tarea de infraestructura distinta y todavía en fase
  de diseño, no de código, por el mismo motivo de honestidad que este
  documento: no hay dos instancias de Postgres reales en este entorno para
  probar la replicación.
- **Mantenimiento de rendimiento de la base** (VACUUM/ANALYZE programado,
  monitoreo de bloat, índices) — la matriz de Alsea también menciona
  "Mantenimiento DB" en un sentido más amplio que solo respaldo/recuperación;
  PostgreSQL moderno (14+) hace autovacuum automático por defecto, que
  cubre el caso base sin configuración adicional. Un ajuste fino de
  mantenimiento (tuning de `autovacuum`, particionado de tablas grandes como
  `EventoDominio`/`EventoDeAuditoria` a futuro) queda como backlog para
  cuando haya datos de producción reales que perfilar — no tiene sentido
  afinar el mantenimiento de una base que todavía no existe con volumen
  real.
- **Encriptación en reposo del archivo de respaldo.** El respaldo local
  queda en texto/binario sin cifrar en `BACKUP_DIR`, y sube a la nube tal
  cual (cifrado en tránsito por HTTPS vía `rclone`, pero no necesariamente
  cifrado en reposo salvo que el proveedor de nube elegido lo haga por
  defecto). Si el respaldo contiene datos sensibles (nombres de clientes,
  aunque este POS no maneja PAN de tarjetas — C-PCI ya lo evita en todo el
  proyecto), evaluar cifrado en reposo como parte de la decisión de
  proveedor de nube al desplegar. No se implementó cifrado propio en el
  script para no reinventar algo que la mayoría de proveedores de
  almacenamiento ya ofrecen nativamente (server-side encryption).

## 7. Nota sobre el sistema operativo del Store Server

Los tres scripts (`backup-local.sh`, `backup-cloud-sync.sh`, `restore.sh`)
son **bash**, pensados para un Store Server Linux. `docs/operaciones/
requisitos-red-tienda-piloto.md` no fija explícitamente el sistema operativo
del Store Server de la tienda piloto, pero `store-server/README.md`
(sección de hardware ESC/POS, ADR-0006 §F0-T3) menciona "drivers Linux/Node"
para la impresora térmica, lo que sugiere que la máquina del piloto se
asume Linux. **Si en el despliegue real el Store Server termina corriendo
sobre Windows**, estos scripts de bash no sirven tal cual — haría falta un
equivalente en PowerShell (mismo `pg_dump`/`pg_restore`, que sí tienen
binarios nativos para Windows, y el mismo esquema de retención podría
reutilizarse llamando al mismo `node scripts/lib/retention.js` ya que Node
corre igual en Windows). **Deliberadamente no se escribió ese equivalente en
este pase**: hacerlo sin que el sistema operativo real del piloto esté
confirmado sería construir a ciegas una segunda versión completa de estos
scripts que quizás nunca se use. Si se confirma un piloto sobre Windows,
esto queda identificado como el siguiente paso concreto.

## 8. Qué falta validar con Postgres real (antes de confiar en esto en producción)

Ninguno de los tres scripts se ejecutó contra una base de datos real en este
entorno de desarrollo (sin Docker/PostgreSQL disponibles). Antes de dar esto
por cerrado para el piloto:

1. **Levantar un Postgres real** (local, o el `docker-compose.test.yml` ya
   existente del proyecto) y correr `backup-local.sh` contra él al menos
   una vez — confirmar que el archivo `.dump` se genera, que
   `pg_restore --list` lo reconoce, y que el tamaño es coherente con los
   datos sembrados (`npm run prisma:seed`).
2. **Hacer un simulacro de restore completo**: restaurar ese `.dump` en una
   base de prueba DISTINTA (nunca sobre una base con datos que importen) con
   `restore.sh --force`, y confirmar que el Store Server levanta contra la
   base restaurada y responde correctamente. Un respaldo que nunca se
   restauró no es un respaldo confiable — este es el paso más importante de
   toda esta lista.
3. **Probar la poda de retención con datos reales de varios días/semanas**
   (los 11 tests de `test/unit/backup-retention.spec.ts` cubren la lógica
   pura con fechas sintéticas; falta confirmar que la integración con
   `find`/`node` en `backup-local.sh` calcula los timestamps de archivos
   reales correctamente en el sistema de archivos real de la tienda).
4. **Configurar y probar `rclone` contra un remoto real** una vez que exista
   una cuenta de almacenamiento en la nube contratada para el proyecto — hoy
   no existe (mismo estado que "no hay nube real" documentado para
   `SyncModule`, F1-T5).
5. **Confirmar con operaciones el horario real de la tienda** (S-04,
   pendiente) para decidir si el cron de respaldo debe correr las 24 horas
   (recomendación actual, por simplicidad) o solo en horario de apertura.
6. **Decidir si el sistema operativo del piloto es Linux o Windows** (ver
   sección 7) y, si es Windows, escribir el equivalente en PowerShell antes
   del despliegue.
