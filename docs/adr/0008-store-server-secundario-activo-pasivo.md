# ADR-0008 — Store Server secundario activo/pasivo (F3-T3, diseño)

- **Estado:** Propuesto (diseño documentado; implementación diferida — ver "Por qué no se codifica esto ahora")
- **Fecha:** 2026-07-19
- **Autor:** `orquestador-pos` (rol asumido por Claude Code, ver ADR-0006)
- **Relacionados:** ADR-0001 (hub-and-spoke), ADR-0004 (fuente de verdad), ADR-0007 (Store Server NestJS/Postgres)
- **Requisitos:** F3-T3 de `PLAN_DE_PRODUCCION.md` ("Store Server secundario activo/pasivo (opcional, mitiga punto único de falla)"), riesgo abierto en `docs/arquitectura.md` §10 ("Store Server como punto único de fallo local")

## Contexto

El Store Server es, por diseño (ADR-0001), la fuente de verdad operativa de
cada tienda — y por eso mismo es un **punto único de fallo local**: si su
proceso o su máquina caen, la tienda pierde la capacidad de tomar pedidos
digitalmente, cobrar por sistema y reflejar el KDS, aunque internet/nube estén
perfectos. `PLAN_DE_PRODUCCION.md` marca F3-T3 como **opcional**, y
`docs/arquitectura.md` §2.2 ya documentaba la mitigación mínima del MVP
(hardware confiable, respaldo local, arranque rápido) dejando explícito que
"el diseño permite en futuro un Store Server secundario (activo/pasivo)".

Este ADR resuelve F3-T3 a nivel de **diseño**, no de código.

## Por qué no se codifica esto ahora

A diferencia de F3-T1/F3-T2 (lógica de negocio y monitoreo puro, testeables
con unit tests sin infraestructura real), un Store Server secundario
activo/pasivo es fundamentalmente un problema de **infraestructura de base de
datos** (replicación de PostgreSQL) y **orquestación de failover** (detectar
la caída del primario, promover el secundario, redirigir las terminales) —
nada de eso es verificable de forma honesta sin al menos dos instancias reales
de PostgreSQL corriendo y comunicándose. Este entorno de trabajo **no tiene
Docker ni PostgreSQL instalados** (confirmado repetidamente durante las Fases
1-3 de este mismo plan). Escribir código de replicación/failover que nunca se
ejecutó ni una sola vez contra una base real sería el mismo tipo de
"trabajo de mentira" que este proyecto ha evitado deliberadamente en cada
tarea anterior (ver, p. ej., la nota de honestidad en `store-server/README.md`
§16.1 sobre el driver ESC/POS). F3-T3 es, además, explícitamente **opcional**
en el plan — no bloquea ninguna fase posterior.

## Decisión de diseño (para implementar cuando haya un entorno con Postgres real)

1. **Replicación:** PostgreSQL **streaming replication** nativa (no una
   herramienta de terceros) del primario a un secundario **físicamente
   separado** dentro de la misma tienda (otra máquina en la misma LAN, no la
   nube — la nube ya es el respaldo *asíncrono* de ADR-0001, esto es
   redundancia *local* de baja latencia). Modo `hot_standby` (el secundario
   puede servir lecturas mientras replica) para que, en el futuro, reportes
   de solo-lectura puedan apuntar ahí sin cargar al primario.
2. **Failover, NO automático en el MVP:** dado que un failover automático mal
   diseñado (p. ej. *split-brain*, donde ambos nodos creen ser el primario y
   aceptan escrituras divergentes) es **peor** que la caída que se quiere
   mitigar — violaría C-SNAPSHOT/C-TENANT si dos "primarios" generan
   `numeroOrden` secuenciales duplicados para el mismo turno — la primera
   iteración es **failover asistido por el gerente**: el `ConectividadService`
   (F3-T2, ya construido) se extiende con una verificación adicional de
   "¿el Store Server local responde?" (hoy solo verifica conectividad a
   internet, no su propia salud); si no responde, la guía impresa de
   contingencia (`docs/operaciones/guia-contingencia-gerente.md`, F3-T2) ya
   cubre el procedimiento manual de papel — este ADR agrega el paso siguiente:
   un comando/script documentado (`store-server/scripts/promover-secundario.sh`,
   a escribir junto con la implementación real) que el gerente o soporte
   técnico ejecuta para: (a) promover el secundario a primario
   (`pg_ctl promote` o equivalente), (b) repuntar el `DATABASE_URL` que usan
   las terminales/KDS al nuevo primario (vía DNS local o config, no hardcodear
   IPs en cada terminal).
3. **Failover automático es un ADR futuro, no este.** Si más adelante se
   justifica (p. ej. tras el piloto, si las caídas de Store Server resultan
   más frecuentes de lo esperado), requeriría un mecanismo de consenso
   (p. ej. un *watchdog* de terceros o `pg_auto_failover`) que está fuera del
   alcance "opcional" de F3-T3 tal como lo pide el plan actual.
4. **Consistencia con el contrato:** el secundario promovido sigue siendo,
   para todo propósito, "el Store Server de esa `Ubicacion`" — mismo esquema,
   mismo contrato de API (arquitectura.md §5/§6), mismo agente de sync
   (F1-T5) apuntando al mismo `CLOUD_SYNC_URL`. No se introduce ningún
   concepto nuevo de identidad de nodo en el modelo de datos.

## Consecuencias

**Positivas**
- Documenta una ruta clara y de bajo riesgo (failover asistido, no automático)
  antes que una solución más compleja y más fácil de implementar mal.
- No introduce riesgo de *split-brain* en el MVP.
- Reutiliza el `ConectividadService` de F3-T2 en vez de crear un segundo
  mecanismo de monitoreo paralelo.

**Negativas / trade-offs**
- No resuelve el punto único de fallo de forma transparente/automática — el
  gerente debe notar la caída y ejecutar el procedimiento (mitigado por la
  guía impresa de F3-T2).
- Queda sin implementar hasta contar con un entorno con PostgreSQL real para
  validar la replicación honestamente (no es código pendiente por descuido:
  es una dependencia de infraestructura real, igual que F2-T4 depende de
  hardware físico).

## Próximos pasos (cuando haya entorno con Postgres real)

1. Levantar un primario + un standby en `docker-compose.test.yml` (extender el
   ya existente de `store-server/`) para probar streaming replication de
   verdad antes de escribir ningún script de promoción.
2. Escribir y probar `promover-secundario.sh` contra ese par real.
3. Extender `ConectividadService` con un chequeo de salud del propio proceso
   Postgres local (no solo de internet).
4. Actualizar `docs/operaciones/guia-contingencia-gerente.md` con el
   procedimiento concreto una vez probado.
