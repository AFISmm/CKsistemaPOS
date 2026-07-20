# Plan de producción por fases — POS Chicken Kitchen (Digenius)

> **Para Claude Code.** Este archivo es la fuente de verdad del plan de producción.
> Léelo completo antes de escribir código. Usa el subagente `orquestador-pos` como
> punto de entrada y delega en los agentes indicados en cada tarea. Al terminar cada
> tarea, actualiza `docs/backlog.md` y crea/actualiza los ADR que correspondan.

---

## 0. Cómo usar este archivo

1. **Arranca con el orquestador:**
   `Usa el subagente orquestador-pos para ejecutar el PLAN_DE_PRODUCCION.md, empezando por la Fase 0.`
2. **Trabaja fase por fase, de arriba hacia abajo.** No pases a la siguiente fase hasta
   cumplir la *Definición de Hecho (DoD)* y pasar el *Gate de pruebas* de la actual.
3. **Respeta el contrato** de la sección 3 en todo momento (nombres de entidades,
   restricciones `C-*`, offline-first, PCI). Si necesitas desviarte, escribe un ADR nuevo
   en `docs/adr/` y déjalo aprobado antes de implementar.
4. **Cada entregable incluye pruebas.** No se considera terminado sin sus tests.
5. **Commits pequeños y descriptivos**, un tema por commit; referencia el ID de la tarea
   (p. ej. `F1-T2`).

---

## 1. Contexto del proyecto

- **Negocio:** cadena QSR de pollo a la parrilla, ~30 sucursales en Florida (FL) y Texas (TX).
  Canales: mostrador, kiosco, online/app/delivery (tipo Olo), catering y lealtad (Gold Wing Club).
- **MVP:** una tienda piloto (Miami, FL) con el núcleo transaccional — tomar pedido, cocinar,
  cobrar y descontar inventario — funcionando **incluso sin internet**.
- **Documentos base ya existentes** (respétalos, no los reinventes):
  - `docs/requisitos.md` — alcance, historias de usuario (HU-*), RNF, reglas de negocio (RN-*), supuestos (S-*).
  - `docs/arquitectura.md` — arquitectura de referencia y **contrato compartido** de la Fase 2.
  - `docs/adr/0001..0005` — decisiones de arquitectura.
  - `docs/backlog.md` — estado por fases (mantenerlo actualizado).
  - `README.md` (equipo de agentes) y `README-DEMO.md` (qué es mock y qué reemplazar).

---

## 2. Estado actual → objetivo

**Hoy (demo):** una única app **Next.js** desplegable en Vercel, con **estado en memoria**
(`lib/db/store.ts`), **mocks** de PSP y hardware, y **polling** en vez de WebSocket. Es una
desviación *deliberada y temporal* para validar el flujo. Ya recorre: catálogo → pedido →
KDS → cobro (efectivo/tarjeta/offline) → descuento de inventario, más empleados, nómina,
chequeo de jornada (TOTP real) y chatbot.

**Objetivo (producción):** la arquitectura de los ADR — **híbrida hub-and-spoke, offline-first**,
con **Store Server local por tienda** (fuente de verdad) y nube fuera del camino crítico.

> **Regla de oro:** ninguna operación de venta puede requerir la nube. La tienda vende,
> cocina y cobra en efectivo aunque el internet o la nube estén caídos.

---

## 3. Contrato inviolable (aplica a todas las fases)

Ver detalle en `docs/arquitectura.md` §5 y §9. Resumen de restricciones `C-*`:

- **C-NOMBRES:** usa exactamente los nombres del modelo de datos (entidades PascalCase,
  campos camelCase, en español) y los nombres de eventos (PascalCase en pasado).
- **C-ID:** IDs transaccionales = **UUID v7** generados en la tienda/cliente. `numeroOrden`
  legible lo asigna el Store Server, secuencial por turno. (La demo usa v4; en producción → v7.)
- **C-DINERO:** montos en **centavos enteros** o `DECIMAL(12,2)`; jamás `float`.
- **C-SNAPSHOT:** `LineaDePedido` y `Pago` congelan precio/impuesto al momento de la venta.
- **C-OFFLINE:** ninguna operación del camino crítico requiere la nube; toda escritura genera
  un evento para el event log/outbox.
- **C-EVENTOS:** publica los eventos del bus (§6.3 de arquitectura) con su envelope
  `{ id, tipo, ubicacionId, ocurridoEn, version, payload }`; no acoples módulos por llamadas
  directas cuando existe un evento definido.
- **C-AUDIT:** toda acción sensible genera `EventoDeAuditoria` (usuario, motivo, hora).
- **C-PCI:** prohibido almacenar/loguear PAN/CVV/pista; solo **token + últimos 4 + resultado**.
- **C-TENANT:** toda entidad transaccional lleva `ubicacionId`.

**Entidades núcleo (contrato):** `Ubicacion, ReglaDeImpuesto, Categoria, Producto, Combo,
GrupoModificador, Modificador, Insumo, Receta, RecetaInsumo, Stock, Pedido, LineaDePedido,
LineaModificador, Pago, Turno, Usuario, Rol, EventoDeAuditoria` (+ `Empleado, HorarioTurno,
Marcaje` del módulo de personal).

---

## 4. Arquitectura objetivo y flujo de datos

Tres capas. La fuente de verdad operativa vive en la **tienda**.

```
[ TERMINALES (LAN) ]   Cajero(PWA) · KDS · Pantalla cliente · Terminal EMV/PSP · Reloj/jornada
   - Cada terminal cachea catálogo y encola escrituras en IndexedDB (opera sin LAN un rato)
        │  HTTP + WebSocket (LAN)              ▲ token+resultado (P2PE, nunca PAN)
        ▼                                      │
[ STORE SERVER (por tienda) = FUENTE DE VERDAD ]
   - API local (NestJS): ventas · menú/inventario · pagos · calcula total/impuesto
   - PostgreSQL local: datos de la tienda + event log append-only
   - Bus de eventos (WebSocket): notifica KDS/pantalla ≤2 s
   - Agente de sync (outbox/inbox): idempotente por id (UUID v7)
        │  HTTPS / mTLS — asíncrono, tolerante a cortes (encola y drena al reconectar)
        ▼
[ NUBE (hub) — NO crítica para vender ]
   - API central (upsert idempotente) · PostgreSQL central (consolidado + respaldo)
   - Reportes corporativos + catálogo maestro (fases multi-tienda)
```

**De dónde vienen y dónde se guardan los datos:**

| Dato | Se origina en | Se almacena en |
|---|---|---|
| Pedidos/líneas/modificadores | Terminal de cajero | IndexedDB (temporal/offline) → PostgreSQL local (verdad) |
| Estado de cocina (KDS) | KDS vía eventos | PostgreSQL local (event log); el KDS solo refleja |
| Pagos | Cajero (efectivo) / terminal EMV (tarjeta) | PostgreSQL local: token + últimos 4 (nunca PAN/CVV) |
| Catálogo/precios/recetas | Backstore / catálogo maestro (nube) | PostgreSQL central → local → caché IndexedDB |
| Inventario/stock | Ventas (receta) y ajustes/mermas | PostgreSQL local por tienda (autoritativo) |
| Empleados/marcajes/nómina | Reloj checador / jornada | PostgreSQL local → central |
| Auditoría | Acciones sensibles | Event log append-only local → replicado a nube |
| Consolidado y respaldo | Todas las tiendas (agente sync) | PostgreSQL central (idempotente por id) |

---

## 5. Plan de fases

> Tiempos estimados con un equipo pequeño (3–5 personas). Rangos, no compromisos.
> Cada fase: **Objetivo → Tareas (dueño) → DoD → Gate de pruebas → Datos a recolectar**.

### Fase 0 · Preparación y bloqueantes  ·  *2–3 semanas*
**Objetivo:** resolver lo que condiciona el diseño antes de codificar producción.

| ID | Tarea | Dueño |
|----|-------|-------|
| F0-T1 | Confirmar con el PSP si soporta **store-and-forward** (tarjeta offline). Documentar resultado (bloqueante **S-05**). | `pagos-pos` |
| F0-T2 | Obtener **tasas fiscales oficiales** FL/TX (estatal + local) y lista de exentos (**S-06/S-08**). | `arquitecto-pos` + finanzas |
| F0-T3 | Seleccionar **hardware/periféricos** (impresora ESC/POS, cajón, terminal EMV, pantallas) (**S-02**). | `hardware-perifericos-pos` |
| F0-T4 | Definir **dayparts**, **umbrales de descuento** y **% de merma** permitido con auditoría. | `analista-requisitos-pos` |

- **DoD:** cada bloqueante cerrado o con decisión documentada (ADR/nota en requisitos).
- **Gate:** no hay código; el gate es que S-05, S-06/S-08 y S-02 tengan respuesta escrita.
- **Datos a recolectar:** tasas por jurisdicción, catálogo real con precios y recetas, política de descuentos/mermas.

### Fase 1 · Fundación de producción  ·  *7–9 semanas*
**Objetivo:** pasar de la demo en memoria a la arquitectura real.

| ID | Tarea | Dueño |
|----|-------|-------|
| F1-T1 | **Store Server** (NestJS) con la API local por dominio, reemplazando el store en memoria. | `arquitecto-pos` + `backend-ventas-pos` |
| F1-T2 | **PostgreSQL local** con esquema del modelo canónico + **event log append-only**. | `backend-ventas-pos` |
| F1-T3 | **Terminales PWA offline**: Service Worker + **IndexedDB** (caché de catálogo + cola de escritura). | `frontend-mostrador-kiosco-pos` |
| F1-T4 | **Bus de eventos WebSocket** (reemplaza polling); KDS/pantalla reflejan ≤2 s. | `kds-cocina-pos` + `backend-ventas-pos` |
| F1-T5 | **Agente de sincronización** outbox/inbox con **UUID v7**, idempotencia y **mTLS** tienda↔nube. | `devops-despliegue-pos` + `backend-ventas-pos` |
| F1-T6 | **RBAC real** + PIN con bcrypt/argon2 + `EventoDeAuditoria` inmutable. | `seguridad-accesos-pos` |

- **DoD:** el flujo mostrador→KDS→cobro efectivo corre 100% contra el Store Server, sin nube; sync a nube funciona y es idempotente.
- **Gate de pruebas:**
  - Corte de LAN: la terminal encola y drena al reconectar **sin duplicar** ni perder ventas.
  - Corte de internet: la tienda opera completa; el outbox drena al volver.
  - KDS refleja un pedido en **≤2 s** (RNF-01).
  - Reintento idempotente de un pago/pedido no crea duplicados.
- **Datos a recolectar:** migrar catálogo/recetas reales al esquema de PostgreSQL.

### Fase 2 · Negocio + hardware  ·  *7–9 semanas*
**Objetivo:** completar el MVP funcional con periféricos y datos reales.

| ID | Tarea | Dueño |
|----|-------|-------|
| F2-T1 | **Costeo por combinación (BOM por variante):** cada combo/modificador resuelve su costo real aunque el precio sea fijo. | `menu-inventario-pos` |
| F2-T2 | **Hold & fire (retener/marchar):** retener líneas y liberarlas a cocina cuando se decida; envío por curso/"al final". | `menu-inventario-pos` + `kds-cocina-pos` |
| F2-T3 | **Reportes del día** completos: ventas, mix de productos, arqueo y análisis por daypart (HU-REP-01). | `reportes-analitica-pos` |
| F2-T4 | **Periféricos reales:** driver ESC/POS (impresora + cajón por pulso) y **terminal EMV semi-integrado (P2PE)**. | `hardware-perifericos-pos` + `pagos-pos` |
| F2-T5 | **Fiscalidad real FL/TX** + **pagos productivos** (integración PSP real, degradación según S-05). | `backend-ventas-pos` + `pagos-pos` |

- **DoD:** una venta real imprime recibo/comanda, abre cajón, cobra con tarjeta vía terminal, aplica impuesto correcto por ubicación y descuenta inventario por receta con costo correcto.
- **Gate de pruebas:**
  - EMV: aprobación, rechazo y (si aplica) store-and-forward offline.
  - Impuesto correcto FL vs TX sobre subtotal gravable **tras** descuentos; propina exenta.
  - Impresión y apertura de cajón reales; degradación controlada si falla un periférico.
- **Datos a recolectar:** recetas detalladas por variante y datos de costeo de insumos.

### Fase 3 · Robustez y contingencia  ·  *4–6 semanas*
**Objetivo:** resiliencia operativa e inventario avanzado; saldar deuda técnica.

| ID | Tarea | Dueño |
|----|-------|-------|
| F3-T1 | **Bajas con aprobación de calidad:** la baja no impacta stock hasta ser aprobada; etiquetado, motivo, **% de merma** y **alerta de auditoría** al superarlo. | `menu-inventario-pos` + `seguridad-accesos-pos` |
| F3-T2 | **Contingencia operativa:** failover a **4G/LTE**, **monitoreo de conectividad** por tienda con alertas tempranas, y **guía impresa** para el gerente. | `devops-despliegue-pos` |
| F3-T3 | **Store Server secundario** activo/pasivo (opcional, mitiga punto único de falla). | `devops-despliegue-pos` |
| F3-T4 | **Saldar deuda técnica** (ver sección 6). | según ítem |

- **DoD:** simulacros de caída (LAN, internet, Store Server) pasan con la operación degradando de forma controlada; deuda técnica cerrada.
- **Gate de pruebas:** ejercicio de caída total con procedimiento manual documentado; recuperación del Store Server en minutos desde respaldo.

### Fase 4 · Piloto en tienda + estabilización  ·  *4–6 semanas*
**Objetivo:** validar en operación real (Miami, FL).

| ID | Tarea | Dueño |
|----|-------|-------|
| F4-T1 | Despliegue en la tienda piloto + **capacitación** de cajeros/cocina/gerente. | `devops-despliegue-pos` + `qa-pruebas-pos` |
| F4-T2 | **Operación asistida** en horas pico; recolección de métricas e incidencias. | `qa-pruebas-pos` |
| F4-T3 | Ajustes finales de rendimiento y UX según lo observado. | equipo |

- **DoD:** N días de operación real sin incidencias bloqueantes; RNF-01 (≤300 ms agregar ítem, KDS ≤2 s) verificado bajo carga real.
- **Gate de pruebas:** semana de operación en producción con métricas dentro de objetivo.
- **Datos a recolectar:** métricas de rendimiento, incidencias, feedback del personal.

### Fase 5 · Rollout multi-tienda  ·  *8–12+ semanas (progresivo)*
**Objetivo:** escalar a las ~30 tiendas FL/TX.

| ID | Tarea | Dueño |
|----|-------|-------|
| F5-T1 | **Consola central multi-tienda** + **catálogo maestro** (baja a tiendas). | `reportes-analitica-pos` + `arquitecto-pos` |
| F5-T2 | **Precios por región** + roles **regional/corporativo** (el RBAC ya lo soporta). | `seguridad-accesos-pos` |
| F5-T3 | **Reportes consolidados** por tienda/región. | `reportes-analitica-pos` |
| F5-T4 | **Despliegue por olas** de tiendas (clonar Store Server + `Ubicacion` con su `ReglaDeImpuesto`). | `devops-despliegue-pos` |

- **DoD:** cada ola de tiendas operando y consolidando en la nube por `ubicacionId`.
- **Gate de pruebas:** consolidación correcta multi-tienda sin colisiones de datos.

---

## 6. Deuda técnica a saldar (repositorio)

Cerrar en Fase 1–3 según corresponda:

- `POST /api/v1/pagos` devuelve 201 también para rechazado/encolado → corregir semántica HTTP.
- El reembolso de pagos **no invoca** `engine.reembolsar` → integrar reversa a nivel Pedido/stock.
- `enviarACocina` **no registra** el evento `TicketEnviadoACocina` → agregar al enum y emitirlo.
- El handler de pagos captura `ErrorPago` pero no `ErrorDominio` → un error de dominio caería a 500.
- Nómina liga propinas por **quién abrió el turno de caja** → agregar vínculo directo pago↔empleado (cajero que atendió) en `Pago`/`LineaDePedido`.
- Asistencia: falta regla de **auto-cierre/alerta por "olvido de marcaje"** (hoy un ingreso sin salida se descarta).
- Jornada: **rate limit** en `intento-facial`; **secretos TOTP** aleatorios/rotados por tienda (hoy fijos); aprovisionar `ubicacionId` por tablet.
- Chatbot: reemplazar el motor de reglas por **LLM real** (Claude vía Anthropic API) y persistir el hilo; **verificación facial real** con SDK biométrico + marco de cumplimiento antes de producción.
- Nómina: retención hoy solo sobre salario bruto (no propinas) y horas extra con regla única `>40h/semana` → validar reglas fiscales/laborales reales por estado.
- IDs UUID **v4 → v7**; **polling → WebSocket**; estado en memoria → **PostgreSQL**.

---

## 7. Convenciones de trabajo

- **Tests obligatorios** por entregable (unitarios + integración; E2E en los flujos críticos).
  Mantén verde `npm run build` y la suite de pruebas antes de cerrar cada tarea.
- **ADR para cada decisión relevante** o desviación del contrato, en `docs/adr/` (numerado).
- **Actualiza `docs/backlog.md`** al cambiar el estado de una tarea (PENDIENTE/EN CURSO/LISTO).
- **No rompas el contrato** de nombres/eventos: otros módulos dependen de él.
- **Seguridad primero:** nunca loguear PAN/CVV; secretos (PSP, mTLS) en gestor de secretos, no en el repo.
- **Feature flags** para lo que aún no esté listo en producción, de modo que el piloto no se bloquee.

---

## 8. Cómo empezar (ahora)

```text
Usa el subagente orquestador-pos para ejecutar PLAN_DE_PRODUCCION.md.
Empieza por la Fase 0: coordina F0-T1..F0-T4, deja cada bloqueante documentado
(ADR o nota en docs/requisitos.md) y actualiza docs/backlog.md.
Cuando la Fase 0 cumpla su DoD, planifica la Fase 1 y delega F1-T1..F1-T6.
No avances de fase sin cumplir la Definición de Hecho y el Gate de pruebas.
```

**Criterio de avance entre fases:** DoD cumplido + Gate de pruebas en verde + backlog actualizado
+ ADRs de las decisiones tomadas. Ante cualquier ambigüedad, documenta un supuesto y sigue;
no bloquees el avance esperando aclaraciones externas salvo en los bloqueantes de la Fase 0.

Si necesitas informacion para seguir implementar, crea datos DEMO para ver la funcionalidad de todas las secciones y modulos que se van a implementar
