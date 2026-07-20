# ADR-0007 — Estructura de Fase 1: Store Server NestJS + PostgreSQL como app nueva

- **Estado:** Aceptado
- **Fecha:** 2026-07-18
- **Autor:** `orquestador-pos` (rol asumido por Claude Code, ver ADR-0006)
- **Relacionados:** ADR-0001..0006, `docs/arquitectura.md` §3, §5, §6
- **Requisitos:** F1-T1..F1-T6 de `PLAN_DE_PRODUCCION.md`

## Contexto

El repositorio hoy es **una sola app Next.js** (`ck-pos-demo`) con estado en
memoria, que sirve de DEMO de validación funcional (ver `README-DEMO.md`). La
arquitectura aprobada (ADR-0001/0002/0004) requiere un **Store Server local por
tienda** (NestJS + PostgreSQL, fuente de verdad) del que la app Next.js pasa a
ser **cliente** (terminal de cajero/PWA), no el backend. Hay que decidir cómo
convive el código nuevo de producción con la demo existente sin romperla
mientras se migra.

## Decisión

1. **Nueva carpeta de nivel superior `store-server/`** dentro de `SistemaPOS/`,
   con su propio `package.json`, NestJS + TypeScript. No se toca el código de
   la demo (`app/`, `lib/`, etc.) en este paso — la demo sigue funcionando y
   desplegable mientras el Store Server se construye en paralelo. Esto evita
   bloquear el piloto (regla de la sección 7 del plan: *"feature flags para lo
   que aún no esté listo en producción, de modo que el piloto no se bloquee"*).
2. **ORM: Prisma**, no TypeORM. Motivo: migraciones declarativas legibles
   (`schema.prisma`), tipado generado automático coherente con el "paquete
   compartido de tipos" que pide `arquitectura.md` §3, y mejor experiencia de
   testing con SQLite en memoria para unit tests rápidos + PostgreSQL real
   para integración. El stack de referencia en `arquitectura.md` no vincula un
   ORM específico — es una elección del implementador dentro del contrato.
3. **Reutilización de reglas de negocio de la demo**: los módulos de dominio
   (`lib/sales/*`, `lib/menu/*`, `lib/inventory/*`, `lib/payments/*` de la app
   Next.js) ya codifican correctamente varias reglas de negocio (cálculo de
   impuesto sobre subtotal gravable, pago mixto, snapshot de precio, reversa de
   stock). El Store Server **porta la lógica**, no la reinventa; corrige en el
   camino la deuda técnica ya identificada en `PLAN_DE_PRODUCCION.md` §6 (201
   en pagos rechazados, reembolso no revierte stock, evento
   `TicketEnviadoACocina` faltante, IDs v4→v7).
4. **La migración de la app Next.js a cliente del Store Server (F1-T3, PWA
   offline con IndexedDB) es un paso posterior y separado**, una vez el Store
   Server expone el contrato REST/WS de `arquitectura.md` §6. Mientras tanto
   ambas apps coexisten: la demo Next.js sigue siendo la referencia funcional
   y de UI; el Store Server implementa el backend real detrás del mismo
   contrato de nombres (C-NOMBRES) para que migrar el frontend sea un cambio
   de "a quién le hablo" (Store Server local en vez de rutas API de Next.js),
   no un rediseño de UI.
5. **Base de datos de test**: PostgreSQL real vía contenedor Docker para tests
   de integración (`docker-compose.test.yml` en `store-server/`); no se asume
   Docker disponible en todos los entornos de desarrollo, así que los tests
   unitarios de reglas de negocio puras (cálculo de impuesto, snapshot, etc.)
   se escriben sin dependencia de base de datos real.

## Consecuencias

**Positivas**
- Cero riesgo de romper la demo/piloto existente mientras se construye
  producción.
- Reutilizar lógica ya validada reduce reescritura y bugs nuevos.
- Prisma da migraciones versionadas desde el día 1 (necesario para C-TENANT y
  evolución del esquema en Fase 3/5).

**Negativas / trade-offs**
- Hay dos bases de código con reglas de negocio similares durante la
  transición (demo Next.js en memoria + Store Server NestJS/Postgres) hasta
  que F1-T3 conecte el frontend real al Store Server y se retire el store en
  memoria. Se acepta como costo temporal de no bloquear el piloto.
- Prisma implica una dependencia adicional de generación de código
  (`prisma generate`) en el pipeline de build.
