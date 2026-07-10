# ADR-0005 — Seguridad, PCI y alcance de tokenización de pagos

- **Estado:** Aceptado
- **Fecha:** 2026-07-10
- **Autor:** `arquitecto-pos`
- **Relacionados:** ADR-0002, ADR-0004
- **Requisitos:** RNF-04, RNF-07, RNF-08, RN-01, RN-04, HU-PAG-02, S-05, S-10

## Contexto

El POS acepta tarjeta EMV/contactless y debe cumplir PCI-DSS sin almacenar datos
sensibles (RNF-04, HU-PAG-02 CA2). Además necesita control de acceso por rol
(RNF-08), auditoría de acciones sensibles (RNF-07) y cumplimiento fiscal por
ubicación (RN-01). Queremos **minimizar el alcance PCI** del sistema y aislar el
dato de tarjeta.

## Opciones consideradas

1. **Integración directa (el POS captura/transmite PAN).** Máximo alcance PCI-DSS,
   riesgo alto, costoso de certificar. Descartada.
2. **Integración semi-integrada con P2PE y tokenización (elegida).** El terminal
   EMV cifra punto a punto hasta el PSP; el POS solo maneja token + resultado.
3. **Redirección total al PSP para todo.** Simple pero rompe UX de mostrador rápido y
   pago mixto controlado. Descartada para el flujo de mostrador.

## Decisión

**Aislamiento del dato de pago (PCI):**
- Integración **semi-integrada / P2PE**: el POS envía **monto** al terminal EMV; el
  terminal captura la tarjeta y devuelve `{ aprobado, pspTokenId, pspReferencia,
  ultimos4, marca }`. El POS **nunca** ve ni persiste PAN/CVV/pista.
- `Pago` almacena solo `pspTokenId`, `pspReferencia`, `ultimos4`, `marca` y resultado.
- Prohibido loguear datos de tarjeta (restricción C-PCI). Reembolsos por referencia
  del PSP; en offline quedan en cola según capacidad store-and-forward (S-05, RN-04).

**Control de acceso (RNF-08):**
- **RBAC** con `Rol` → lista de permisos granulares. Roles MVP: `cajero`, `cocina`,
  `gerenteTienda`; esquema extensible a `gerenteRegional`/`corporativo` (S-01).
- Login por **PIN** (S-10) con `pinHash` (bcrypt/argon2); nunca PIN en claro; cambio
  rápido de operador en mostrador. Acciones sensibles (descuento sobre umbral,
  reembolso, ajuste de stock, cierre Z) exigen permiso de gerente (RN-03, RN-04).

**Cifrado y secretos:**
- TLS en LAN donde sea posible; **mTLS obligatorio** tienda↔nube. Cifrado de disco del
  Store Server. Secretos (claves PSP, certificados) en gestor de secretos, fuera del
  código y del repositorio.

**Auditoría (RNF-07):**
- `EventoDeAuditoria` append-only e inmutable para descuentos, reembolsos,
  cancelaciones, ajustes de inventario, aperturas de cajón, 86 y cierre Z, con
  `usuarioId`, hora y `motivo`. Incluido en la sincronización a la nube.

**Fiscalidad (RN-01, RNF-05):**
- Impuesto por `Ubicacion` vía `ReglaDeImpuesto` (estatal + local acumulables); sobre
  subtotal gravable tras descuentos; propina exenta. Recibo con datos fiscales mínimos
  por estado (pendiente confirmación de finanzas, S-06 y preguntas abiertas).

## Consecuencias

**Positivas**
- Alcance PCI del POS minimizado: no almacena ni transmite PAN → menor riesgo y menor
  costo de cumplimiento.
- Auditoría inmutable satisface RNF-07 y da trazabilidad fiscal.
- RBAC extensible evita rediseño al sumar roles regionales/corporativos.

**Negativas / trade-offs**
- Dependencia fuerte del PSP y su SDK/terminal; el soporte offline de tarjeta depende
  de él (S-05, riesgo alto — bloqueante para `pagos-pos`).
- mTLS y gestor de secretos añaden trabajo de `devops-despliegue-pos`.
- Reembolsos con tarjeta pueden quedar diferidos en offline hasta reconexión.
