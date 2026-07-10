# ADR-0003 — Stack tecnológico

- **Estado:** Aceptado
- **Fecha:** 2026-07-10
- **Autor:** `arquitecto-pos`
- **Relacionados:** ADR-0001, ADR-0002, ADR-0004
- **Requisitos:** RNF-01, RNF-02, RNF-03, RNF-06

## Contexto

Necesitamos un stack que: (a) permita offline-first en la terminal y el Store Server,
(b) sea rápido en hora pico (RNF-01), (c) sea táctil y fácil de aprender (RNF-03),
(d) corra en hardware modesto de tienda con periféricos QSR (ESC/POS, cajón, EMV,
KDS), y (e) comparta un contrato de tipos entre módulos para reducir fricción de
integración en Fase 2.

## Opciones consideradas

- **Frontend:** React (PWA) vs. nativo Android/iOS vs. .NET/WPF.
- **Backend local:** Node.js/NestJS vs. .NET vs. Java/Spring vs. Go.
- **DB local:** PostgreSQL vs. SQLite vs. base embebida NoSQL.
- **Mensajería:** WebSocket simple vs. NATS/Redis Streams vs. MQTT.

## Decisión

| Capa | Elección | Justificación |
|------|----------|---------------|
| Frontend cajero/KDS/CFD | **TypeScript + React (PWA)**, opción Electron/Tauri para pantallas dedicadas | Un lenguaje de UI, Service Worker + IndexedDB para caché/cola offline, táctil, tiempo de aprendizaje bajo (RNF-03) |
| Backend local (Store Server) | **Node.js + TypeScript (NestJS)** | Mismo lenguaje que el front → tipos compartidos del modelo/contrato; modular por dominio; WebSocket nativo; corre en hardware modesto |
| DB local | **PostgreSQL** | ACID para la fuente de verdad; JSONB para payloads de eventos y catálogo flexible |
| Almacén en terminal | **IndexedDB** (service worker) | Caché de catálogo + cola local de escritura para cortes/reinicios |
| DB central | **PostgreSQL gestionado** | Consolidación/respaldo; mismo motor evita fricción de esquema |
| Mensajería local | **WebSocket** (MVP) sobre bus del Store Server; **NATS/Redis Streams** como evolución | Baja latencia LAN para KDS/CFD (≤2 s); MVP simple, camino de migración claro |
| Sync nube | **HTTPS/mTLS** + outbox/inbox idempotente | Tolerante a cortes, sin duplicados (RNF-02) |
| Impresión/cajón | **ESC/POS** (USB o TCP 9100) | Estándar de facto QSR; abre cajón por pulso |
| Pago EMV | **SDK semi-integrado del PSP (P2PE)** | Aísla PAN, reduce alcance PCI (ADR-0005) |
| Contratos/tipos | **Paquete TS compartido + Zod/JSON Schema** | Fuente única de DTO y modelo entre módulos |

## Consecuencias

**Positivas**
- Un solo lenguaje (TypeScript) end-to-end → tipos compartidos, menos errores de
  integración, curva de equipo más corta.
- PWA + IndexedDB da offline en la terminal sin instalar apps pesadas.
- PostgreSQL cubre transaccional y eventos (JSONB) sin sumar otro motor.
- WebSocket cumple ≤2 s en LAN sin infraestructura de broker en el MVP.

**Negativas / trade-offs**
- Node.js exige cuidado en operaciones CPU-intensivas (mitigable; el camino crítico
  es I/O ligero).
- WebSocket simple en MVP puede quedar corto para ruteo avanzado de KDS multi-estación
  → migrar a NATS/Redis Streams cuando llegue (S-11).
- Electron/Tauri añade peso si se usa para pantallas dedicadas; opcional, no obligatorio.
- El stack es recomendación de referencia; un módulo puede proponer alternativa vía
  nuevo ADR siempre que respete modelo, contratos y restricciones.
