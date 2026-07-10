# ADR-0002 — Estrategia offline-first y sincronización

- **Estado:** Aceptado
- **Fecha:** 2026-07-10
- **Autor:** `arquitecto-pos`
- **Relacionados:** ADR-0001 (topología), ADR-0004 (fuente de verdad), ADR-0005 (pagos)
- **Requisitos:** RNF-02, RNF-06, RN-04, RN-06, S-05

## Contexto

La tienda debe operar completamente sin internet y sincronizar al reconectar sin
pérdida ni duplicados (RNF-02). El pago con tarjeta puede degradarse según la
capacidad store-and-forward del PSP (S-05, riesgo alto). Necesitamos un mecanismo de
sincronización robusto y una política clara de conflictos e identificadores.

## Opciones consideradas

1. **Base de datos distribuida multi-maestro (CRDT nativo, ej. Couch/Realm).**
   - Pro: sincronización automática. Contra: modelo transaccional/fiscal complejo de
     expresar como CRDT; menos control sobre orden y auditoría. Descartada para MVP.
2. **Sincronización por "última escritura gana" sobre estado mutable.**
   - Contra: peligroso para dinero/inventario (pérdida de eventos concurrentes,
     saldos incorrectos). Descartada como mecanismo principal.
3. **Event log append-only + patrón outbox/inbox con idempotencia (elegida).**

## Decisión

- **Fuente de verdad operativa en el Store Server** (ver ADR-0004).
- **IDs generados en cliente/tienda como UUID v7** (ordenables); el `numeroOrden`
  legible secuencial lo asigna el Store Server por turno/tienda (RN-06).
- **Event log append-only:** cada cambio de dominio produce un evento inmutable con
  envelope `{ id, tipo, agregadoId, ubicacionId, ocurridoEn, version, payload }`.
- **Outbox/inbox:** el agente de sincronización envía eventos pendientes a la nube por
  HTTPS/mTLS en lotes; la nube aplica **upsert idempotente por `id`** (sin
  duplicados) y confirma (ack). Sin ack → reintento con backoff.
- **Resolución de conflictos:**
  - Hechos transaccionales (pedidos, pagos, movimientos de stock) son **inmutables**;
    no hay conflicto — la nube solo agrega. Correcciones = eventos compensatorios
    (reembolso/anulación, RN-04), nunca edición del hecho.
  - Configuración editable (catálogo/precios, futuro): **last-writer-wins por
    version/ocurridoEn** con la nube como árbitro; overrides locales (86, ajustes)
    ganan localmente y se reportan.
  - Inventario: autoritativo por tienda; conflictos por **suma de deltas**, no por
    sobrescritura de saldo.
- **Degradación por función (S-05):** efectivo, cocina, inventario y recibo funcionan
  offline; tarjeta depende del PSP (ver ADR-0005). Las terminales mantienen caché de
  catálogo y cola local de escritura para tolerar reinicios cortos del Store Server.

## Consecuencias

**Positivas**
- Cero pérdida y cero duplicados por idempotencia (RNF-02).
- Auditoría e historia naturales (el event log es también la bitácora).
- Reversas correctas de dinero e inventario vía compensación (RN-04).

**Negativas / trade-offs**
- Los implementadores DEBEN emitir eventos disciplinadamente y tratar toda escritura
  como append (curva de aprendizaje, restricción C-EVENTOS/C-OFFLINE).
- Consistencia eventual con la nube: los reportes corporativos pueden ir con retraso.
- S-05 sigue siendo bloqueante hasta que `pagos-pos` confirme el PSP.
