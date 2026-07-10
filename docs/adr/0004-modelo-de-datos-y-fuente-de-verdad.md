# ADR-0004 — Modelo de datos y fuente de verdad

- **Estado:** Aceptado
- **Fecha:** 2026-07-10
- **Autor:** `arquitecto-pos`
- **Relacionados:** ADR-0001, ADR-0002
- **Requisitos:** RN-01, RN-03, RN-04, RN-06, RN-08, S-06, S-07, S-08, RNF-07

## Contexto

El modelo de datos es el **contrato compartido** de la Fase 2: todos los módulos
deben usar los mismos nombres y relaciones (sección 5 de `arquitectura.md`). Debe
soportar combos/modificadores, recetas e inventario, impuestos por ubicación (FL/TX),
pagos mixtos, turnos/Z y auditoría inmutable, y contemplar multi-tienda desde el
esquema aunque el MVP sea una tienda (S-08).

## Opciones consideradas

1. **Estado mutable clásico (CRUD puro).** Simple, pero débil para auditoría,
   reversas y sincronización offline sin conflictos.
2. **Event sourcing completo.** Máxima trazabilidad, pero sobre-ingeniería para el MVP
   y curva alta.
3. **Modelo relacional con estado + event log/auditoría append-only (elegida).**
   Estado normalizado para consultas rápidas (hora pico) + eventos inmutables para
   auditoría y sincronización.

## Decisión

- **Fuente de verdad operativa = DB del Store Server** de cada tienda. La nube es
  fuente de verdad de configuración corporativa (futuro) y espejo consolidado.
- **Entidades núcleo canónicas** (nombres vinculantes): `Ubicacion`,
  `ReglaDeImpuesto`, `Categoria`, `Producto`, `Combo`, `GrupoModificador`,
  `Modificador`, `Insumo`, `Receta`, `RecetaInsumo`, `Stock`, `Pedido`,
  `LineaDePedido`, `LineaModificador`, `Pago`, `Turno`, `Usuario`, `Rol`,
  `EventoDeAuditoria`. Detalle de campos en `arquitectura.md` §5.
- **Reglas de integridad vinculantes:**
  - Toda entidad transaccional lleva `ubicacionId` (multi-tienda desde día 1, S-08).
  - IDs transaccionales = UUID v7 de cliente; `numeroOrden` secuencial por turno/tienda
    (RN-06).
  - **Snapshots** de precio, `gravable`, impuesto y modificadores en `LineaDePedido`
    y `Pago`: cambiar el catálogo no altera pedidos pasados.
  - Dinero en centavos enteros o `DECIMAL(12,2)`, nunca `float`; redondeo al centavo
    por transacción (RN-08, S-06). Moneda única USD (S-07).
  - Impuesto vía `ReglaDeImpuesto` por ubicación, sobre subtotal gravable tras
    descuentos (RN-01, RN-03); propina exenta (RN-02).
  - **Stock por movimientos/deltas** (venta, merma, recepción, reversa), nunca por
    sobrescritura de saldo; reembolsos/anulaciones generan eventos compensatorios
    (RN-04).
  - `EventoDeAuditoria` append-only para acciones sensibles y como base del event log
    de sincronización (RNF-07).

## Consecuencias

**Positivas**
- Consultas rápidas para hora pico (estado normalizado) + auditoría/reversa robustas.
- Multi-tienda y fiscalidad FL/TX soportadas sin rehacer el modelo (S-08).
- Snapshots evitan corrupción histórica al editar catálogo.

**Negativas / trade-offs**
- Doble escritura (estado + evento) exige disciplina transaccional (mitigable con el
  patrón outbox en la misma transacción).
- El modelo es vinculante: cambios de nombres/relaciones requieren actualizar este ADR
  y `arquitectura.md` antes de implementar.
