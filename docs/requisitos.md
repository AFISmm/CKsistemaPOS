# Requisitos del MVP — Sistema POS de Chicken Kitchen

- **Proyecto:** Sistema POS de Chicken Kitchen (Digenius)
- **Fase:** 0 — Descubrimiento
- **Documento:** Especificación de requisitos del MVP
- **Autor:** Analista de requisitos POS
- **Fecha:** 2026-07-10
- **Estado:** Borrador para arquitectura

---

## 1. Objetivo y alcance del MVP

### 1.1 Contexto del negocio

Chicken Kitchen es una cadena QSR (Quick Service Restaurant) de pollo a la parrilla,
con **~30 sucursales en Florida (FL) y Texas (TX)**. Su operación combina:

- Servicio de **mostrador** con cocina abierta, pollo hecho al momento a la vista del cliente.
- **Kioscos de autoservicio** para pedidos sin cajero.
- Pedidos **online / app / delivery** (integración tipo Olo).
- **Catering** (pedidos grandes programados).
- Programa de lealtad **Gold Wing Club**.

La operación es intensiva en velocidad durante los *dayparts* de almuerzo y cena,
y debe seguir funcionando aunque se caiga el internet de la tienda (**offline-first**).

### 1.2 Objetivo del MVP

Poner en producción, en **una sola tienda piloto**, el flujo operativo esencial que
permite **tomar un pedido en mostrador, prepararlo en cocina, cobrarlo y descontar
el inventario correspondiente**, funcionando de forma fiable incluso sin conexión a internet.

El MVP busca validar el núcleo transaccional del negocio con el mínimo de piezas,
antes de escalar a más canales, más sucursales y programas de fidelización.

### 1.3 Qué SÍ entra en el MVP

| Área | Incluido |
|------|----------|
| **Mostrador / Cajero** | Toma de pedidos, carta con combos y modificadores, identificación del pedido por nombre/número, edición y cancelación de líneas antes de cobro. |
| **Cocina / KDS** | Recepción de comandas en pantalla de cocina, marcado de preparación y "orden lista", enrutamiento básico de tickets. |
| **Cobro / Pagos** | Efectivo, tarjeta (EMV / contactless), **pago mixto**, propinas opcionales, cálculo de impuesto por ubicación, recibo impreso/digital, apertura de cajón. |
| **Menú / Inventario** | Carta con combos y modificadores con precio, recetas ligadas a insumos, descuento de inventario al vender, alertas de stock bajo, marcar producto agotado (86). |
| **Fiscal básico** | Impuesto sobre ventas por ubicación (FL vs. TX), recibo conforme. |
| **Roles** | Cajero, Cocina, Gerente de tienda (accesos diferenciados). |
| **Offline-first** | Operación completa sin internet con sincronización posterior. |
| **Reportes básicos** | Cierre de caja / turno (Z), ventas del día, mix de productos, por *daypart*. |

### 1.4 Qué NO entra en el MVP (con justificación)

| Excluido | Justificación |
|----------|---------------|
| **Kiosco de autoservicio** | Requiere UX de autoservicio, flujo de pago desatendido y hardware adicional; no aporta al núcleo validable en piloto de una tienda. Fase posterior. |
| **Canales online / app / delivery (Olo)** | Depende de integraciones externas y de un modelo de ingesta unificada a KDS; añade complejidad y dependencias de terceros. Fase posterior. |
| **Catering** | Flujo de pedido programado, anticipos y logística de entrega distinto al de mostrador. Fase posterior. |
| **Gold Wing Club (lealtad)** | Requiere identidad del cliente, acumulación/canje y reglas de campaña; no bloquea el cobro básico. Fase posterior. |
| **Multi-sucursal / gestión central multi-estado** | El MVP asume una tienda (o gestión mínima). La administración centralizada, precios por región y consolidación corporativa se difieren. Fase posterior. |
| **Nómina / gestión avanzada de mano de obra** | Fuera del núcleo transaccional. Fase posterior. |

> **Nota de alcance:** El MVP es de **una sola tienda**, pero el diseño de datos y de
> reglas fiscales debe contemplar desde ya la **diferencia FL vs. TX**, para no rehacer
> el modelo al escalar a multi-sucursal (ver Supuesto S-08).

---

## 2. Actores y roles del MVP

| Rol | Descripción | Alcance en MVP |
|-----|-------------|----------------|
| **Cajero** | Toma pedidos en mostrador, cobra, entrega recibo, gestiona su cajón. | Completo |
| **Cocina (línea)** | Ve comandas en el KDS, prepara y marca "orden lista". | Completo |
| **Gerente de tienda** | Supervisa turnos, autoriza descuentos/reembolsos, cierra caja (Z), ajusta inventario, marca productos 86, ve reportes de tienda. | Completo |

**Roles futuros (fuera del MVP, documentados para el diseño de permisos):**

- **Gerente regional** — supervisa varias tiendas de un estado/región.
- **Corporativo / administrador central** — gestiona carta maestra, precios por región, usuarios y reportes consolidados.
- **Cliente autoservicio** — actor del kiosco y de app/online.

> El módulo de accesos del MVP debe usar un modelo de roles/permisos extensible
> que permita agregar estos roles sin rediseño (ver `seguridad-accesos-pos`).

---

## 3. Historias de usuario del MVP

Formato: **Como [rol] quiero [acción] para [beneficio]** + criterios de aceptación (CA).
Cada historia tiene un ID para trazabilidad.

### 3.1 Área: Mostrador / Cajero

#### HU-MOS-01 — Iniciar y armar un pedido
**Como** cajero **quiero** crear un pedido y agregarle productos de la carta rápidamente
**para** atender al cliente sin demoras en hora pico.
- CA1: Puedo iniciar un pedido nuevo en ≤1 toque desde la pantalla principal.
- CA2: Puedo buscar/seleccionar un producto por categoría visual (rejilla) y agregarlo con 1 toque.
- CA3: El pedido muestra en tiempo real líneas, cantidades y total parcial.
- CA4: Puedo aumentar/disminuir cantidad y eliminar una línea antes de cobrar.
- CA5: Puedo tener varios pedidos abiertos en paralelo y alternar entre ellos.

#### HU-MOS-02 — Combos y modificadores
**Como** cajero **quiero** seleccionar combos y aplicar modificadores (guarnición, salsa,
tamaño de porción, sin/con extra con precio)
**para** capturar el pedido exactamente como lo pide el cliente.
- CA1: Al elegir un combo, el sistema solicita las selecciones requeridas (p. ej. guarnición y bebida).
- CA2: Los modificadores con precio adicional se reflejan en el total de la línea.
- CA3: Los modificadores "sin X" (sin costo) se registran y aparecen en la comanda de cocina.
- CA4: No se puede cerrar una línea de combo sin completar las selecciones obligatorias.
- CA5: Un modificador marcado como agotado (86) no está disponible para seleccionar.

#### HU-MOS-03 — Identificar el pedido
**Como** cajero **quiero** asignar un nombre y/o número al pedido
**para** que cocina y el cliente lo identifiquen al estar listo.
- CA1: Puedo capturar el nombre del cliente o el sistema asigna un número secuencial de orden.
- CA2: El identificador aparece en la comanda de cocina, en el KDS y en el recibo.
- CA3: El número de orden es único dentro del turno de la tienda.

#### HU-MOS-04 — Editar o cancelar pedido antes del cobro
**Como** cajero **quiero** modificar o cancelar el pedido antes de cobrar
**para** corregir errores de captura.
- CA1: Puedo eliminar líneas o el pedido completo mientras no esté cobrado.
- CA2: La cancelación de un pedido ya enviado a cocina requiere confirmación y (según política) autorización del gerente.
- CA3: Toda cancelación queda registrada en auditoría con usuario y hora.

### 3.2 Área: Cocina / KDS

#### HU-KDS-01 — Recibir comandas en pantalla
**Como** personal de cocina **quiero** ver los pedidos enviados en la pantalla de cocina
**para** prepararlos en orden.
- CA1: Un pedido confirmado en mostrador aparece en el KDS en ≤2 segundos (en operación local/offline).
- CA2: Cada ticket muestra identificador del pedido, líneas, cantidades y modificadores (incluyendo "sin X").
- CA3: Los tickets se ordenan por hora de entrada (FIFO) y muestran el tiempo transcurrido.

#### HU-KDS-02 — Marcar avance y "orden lista"
**Como** personal de cocina **quiero** marcar un pedido en preparación y luego como listo
**para** coordinar la entrega al cliente.
- CA1: Puedo cambiar el estado de un ticket a "en preparación" y a "listo".
- CA2: Al marcar "listo", el pedido se identifica como tal para llamado al cliente (pantalla/lista de listos).
- CA3: Puedo marcar líneas individuales como completadas dentro de un ticket (deseable).
- CA4: Un ticket completado sale de la cola activa pero queda consultable en el turno.

#### HU-KDS-03 — Enrutamiento básico de tickets
**Como** personal de cocina **quiero** que los pedidos lleguen a la estación correcta
**para** organizar el trabajo de la línea.
- CA1: En el MVP existe al menos una cola de cocina; el diseño permite dividir por estación en el futuro.
- CA2: El re-envío de una comanda (reimpresión/reproyección) queda registrado.

### 3.3 Área: Cobro / Pagos

#### HU-PAG-01 — Cobrar en efectivo
**Como** cajero **quiero** cobrar en efectivo y calcular el cambio
**para** cerrar la venta correctamente.
- CA1: El sistema calcula el cambio a partir del monto recibido.
- CA2: Al confirmar el pago en efectivo, se abre el cajón monedero.
- CA3: La venta queda registrada con método "efectivo" y afecta el arqueo del turno.

#### HU-PAG-02 — Cobrar con tarjeta (EMV / contactless)
**Como** cajero **quiero** cobrar con tarjeta por chip o contactless
**para** aceptar pagos electrónicos de forma segura.
- CA1: El cobro con tarjeta se procesa vía terminal/PSP certificado (EMV y contactless).
- CA2: El sistema **no almacena** datos sensibles de la tarjeta (PAN completo, CVV) — cumplimiento PCI (ver RNF-04).
- CA3: Ante aprobación, la venta se marca pagada y se emite recibo; ante rechazo, el cajero puede reintentar u ofrecer otro método.

#### HU-PAG-03 — Pago mixto
**Como** cajero **quiero** dividir el cobro entre efectivo y tarjeta (u otros)
**para** aceptar pagos combinados.
- CA1: Puedo registrar dos o más pagos parciales hasta cubrir el total.
- CA2: El sistema muestra el saldo pendiente tras cada pago parcial.
- CA3: No se cierra la venta hasta que el pagado iguala el total.

#### HU-PAG-04 — Propinas
**Como** cajero **quiero** ofrecer propina opcional
**para** permitir que el cliente propine cuando lo desee.
- CA1: La propina es opcional (nunca obligatoria por defecto).
- CA2: Puede ingresarse como monto fijo o porcentaje sugerido.
- CA3: La propina se registra separada del importe de venta y del impuesto.

#### HU-PAG-05 — Impuesto por ubicación
**Como** sistema **quiero** aplicar la tasa de impuesto sobre ventas según la ubicación de la tienda
**para** cobrar el impuesto correcto (FL vs. TX).
- CA1: La tasa de impuesto se configura por tienda/ubicación.
- CA2: El impuesto se calcula y muestra desglosado antes de cobrar y en el recibo.
- CA3: El cálculo contempla productos exentos/gravados según reglas locales (ver RN-01).

#### HU-PAG-06 — Recibo
**Como** cajero **quiero** emitir un recibo
**para** entregar comprobante al cliente.
- CA1: El recibo incluye tienda, fecha/hora, líneas, subtotal, impuesto desglosado, propina, total y método de pago.
- CA2: El recibo puede imprimirse; formato digital es deseable en el MVP.
- CA3: El recibo cumple los requisitos fiscales mínimos de FL/TX (ver RN-01).

#### HU-PAG-07 — Descuentos y reembolsos
**Como** gerente de tienda **quiero** aplicar descuentos y procesar reembolsos con control
**para** manejar cortesías, errores y devoluciones.
- CA1: La aplicación de un descuento por encima de un umbral requiere autorización de gerente.
- CA2: Un reembolso (total o parcial) requiere autorización de gerente y queda en auditoría.
- CA3: El reembolso ajusta ventas del turno y, cuando aplica, revierte el descuento de inventario (ver RN-04).
- CA4: Todo descuento/reembolso registra usuario, motivo (de una lista) y hora.

#### HU-PAG-08 — Cierre de caja / turno (Z)
**Como** gerente de tienda **quiero** cerrar la caja del turno
**para** cuadrar efectivo y ventas.
- CA1: El cierre muestra totales por método de pago, propinas, descuentos y reembolsos.
- CA2: Permite conteo de efectivo y muestra diferencia (sobrante/faltante) vs. lo esperado.
- CA3: Genera un reporte Z consultable e inalterable tras el cierre.

### 3.4 Área: Menú / Inventario

#### HU-INV-01 — Mantener la carta
**Como** gerente de tienda **quiero** gestionar productos, combos y modificadores con sus precios
**para** que el mostrador venda con datos correctos.
- CA1: Puedo crear/editar productos con nombre, categoría, precio e indicador gravable.
- CA2: Puedo definir combos y sus componentes/selecciones.
- CA3: Puedo definir modificadores (con o sin precio) y asociarlos a productos.

#### HU-INV-02 — Recetas y descuento de inventario
**Como** gerente de tienda **quiero** ligar cada producto a los insumos que consume
**para** que el inventario se descuente automáticamente al vender.
- CA1: Cada producto puede tener una receta (insumos y cantidades).
- CA2: Al confirmarse una venta, el stock de los insumos se descuenta según la receta.
- CA3: Un reembolso/anulación de línea revierte el descuento correspondiente (ver RN-04).

#### HU-INV-03 — Stock, alertas y 86
**Como** gerente de tienda **quiero** ver el stock y marcar productos agotados
**para** evitar vender lo que no hay.
- CA1: Puedo consultar el nivel de stock de insumos y productos.
- CA2: El sistema alerta cuando un insumo baja de un umbral configurable.
- CA3: Puedo marcar un producto/modificador como agotado (86) y deja de ser vendible en mostrador y KDS hasta reactivarlo.
- CA4: Puedo ajustar manualmente el stock (mermas, recepción) con registro en auditoría.

### 3.5 Área: Reportes básicos (soporte al MVP)

#### HU-REP-01 — Reportes de tienda del día
**Como** gerente de tienda **quiero** ver ventas del día, mix de productos y desempeño por *daypart*
**para** tomar decisiones operativas.
- CA1: Reporte de ventas del día con desglose por método de pago e impuesto.
- CA2: Mix de productos (unidades y monto) del turno/día.
- CA3: Ventas agrupadas por *daypart* (desayuno/almuerzo/cena, franjas configurables).

---

## 4. Requisitos no funcionales (RNF)

| ID | Requisito | Criterio de aceptación |
|----|-----------|------------------------|
| **RNF-01 — Velocidad en hora pico** | El POS debe responder con fluidez bajo carga de *rush*. | Agregar un ítem al pedido responde en <300 ms; enviar a cocina y cobrar sin bloqueos perceptibles con múltiples pedidos abiertos. El KDS refleja pedidos en ≤2 s. |
| **RNF-02 — Offline-first** | La tienda opera completamente sin internet. | Se pueden tomar pedidos, enviarlos a cocina, cobrar en efectivo, descontar inventario e imprimir recibo sin conexión. Al reconectar, las transacciones sincronizan sin pérdida ni duplicados. Pago con tarjeta puede degradarse según capacidad del PSP offline (ver Supuesto S-05). |
| **RNF-03 — Facilidad de aprendizaje** | Un cajero nuevo aprende el flujo básico en <30 min. | Un cajero sin experiencia previa completa toma de pedido + cobro efectivo + envío a cocina tras ≤30 min de inducción, sin manual. UI de rejilla táctil, mínimos pasos, botones grandes. |
| **RNF-04 — Cumplimiento PCI** | Los pagos con tarjeta cumplen PCI-DSS. | El sistema nunca almacena PAN completo/CVV; el procesamiento de tarjeta se delega a terminal/PSP certificado. (Aplica ya en MVP de una tienda; ver `pagos-pos` y `seguridad-accesos-pos`.) |
| **RNF-05 — Cumplimiento fiscal FL/TX** | Recibo e impuestos conformes a la ubicación. | Impuesto sobre ventas correcto por estado; recibo con datos fiscales mínimos. Aunque el MVP sea una tienda, el modelo soporta tasas por ubicación (ver S-08). |
| **RNF-06 — Disponibilidad y hardware** | El sistema funciona sobre el hardware de tienda de forma confiable. | Opera con impresora de comanda/recibo, cajón monedero, lector de tarjeta y pantalla KDS. Degradación controlada si un periférico falla (p. ej. reimpresión manual). Objetivo de disponibilidad local: la caída de la nube no detiene la operación (deriva de RNF-02). |
| **RNF-07 — Auditoría y trazabilidad** | Acciones sensibles quedan registradas. | Descuentos, reembolsos, cancelaciones, ajustes de inventario y aperturas de cajón registran usuario, hora y motivo. |
| **RNF-08 — Seguridad de acceso** | Acceso por rol con identificación de operador. | Login por PIN/credencial de operador; acciones restringidas por rol; cambio de operador rápido en el mostrador. |

---

## 5. Reglas de negocio (RN)

- **RN-01 — Impuesto por ubicación (FL/TX):** El impuesto sobre ventas se determina por
  la tienda/ubicación. FL y TX tienen tasas y reglas distintas (incluida la posible
  combinación estatal + local). Los productos tienen indicador gravable/exento. *(Ver S-08
  para el detalle a confirmar por finanzas.)*
- **RN-02 — Propinas opcionales:** La propina nunca es obligatoria; se registra separada de
  la venta y del impuesto; no genera impuesto sobre ventas.
- **RN-03 — Descuentos con umbral:** Descuentos por encima de un porcentaje/monto umbral
  requieren autorización de gerente. Los descuentos se aplican antes del cálculo de impuesto
  sobre el importe gravable resultante. *(Umbral concreto: S-03.)*
- **RN-04 — Reembolsos:** Requieren autorización de gerente y motivo. Un reembolso revierte
  la venta y, si corresponde, el descuento de inventario. Reembolsos con tarjeta se procesan
  vía el PSP; en offline pueden quedar en cola hasta reconexión (S-05).
- **RN-05 — Pago mixto y efectivo:** Una venta puede saldarse con múltiples pagos parciales
  (efectivo + tarjeta). El cajón se abre en operaciones con efectivo. El arqueo del turno
  considera todos los métodos.
- **RN-06 — Numeración de órdenes:** El número de orden es secuencial y único por turno/tienda,
  visible en cocina, pantalla de listos y recibo.
- **RN-07 — Producto 86 (agotado):** Un producto o modificador marcado como agotado no puede
  venderse hasta reactivarse. El agotado por stock puede sugerirse automáticamente cuando la
  receta no tiene insumos suficientes (deseable).
- **RN-08 — Redondeo:** Los importes y el impuesto se redondean según regla estándar de moneda
  USD (2 decimales, redondeo al centavo). *(Método exacto de redondeo del impuesto: S-06.)*

---

## 6. Supuestos y decisiones de alcance

> **No hay usuario final disponible para aclaraciones en esta fase.** Ante cada ambigüedad
> se documenta un supuesto razonable, marcado como **[SUPUESTO]**, que debe validarse con
> el cliente/finanzas antes de cerrar la arquitectura o el desarrollo.

| ID | Supuesto | Riesgo si es incorrecto |
|----|----------|-------------------------|
| **S-01** | **[SUPUESTO]** El MVP se despliega en **una tienda piloto** con configuración local; no hay consola central multi-tienda todavía. | Medio — reordenar prioridades si exigen central desde el día 1. |
| **S-02** | **[DECISIÓN — Fase 0 producción, 2026-07-18, pendiente de compra real]** Hardware recomendado tras investigación de `hardware-perifericos-pos` (ver ADR-0006): impresora térmica ESC/POS **Epson TM-m30III** (o Star TSP143IV) con **cajón monedero por pulso RJ11/12 a través de la impresora** (no HID directo); terminal EMV semi-integrado con P2PE/tokenización — **Datacap NETePay** como gateway recomendado por soportar *store-and-forward* documentado (procesador-agnóstico: Heartland, EVO, etc.), Elavon Safe-T Link como alternativa a validar; pantalla KDS en unidad táctil *fanless* de 21.5" (o tablet como alternativa económica para el piloto). Costo directional por tienda piloto: ~US$1,500–3,500 (mid-tier) o <US$1,000 con ruta económica (KDS en tablet). **Marca/modelo final y compra siguen pendientes de aprobación de compras/operaciones**; esto es una recomendación técnica, no una orden de compra. | Medio — cambios de drivers/periféricos si se elige otro proveedor. |
| **S-03** | **[SUPUESTO]** El umbral de autorización de descuento es configurable; valor inicial sugerido: descuentos ≥15% o cortesías totales requieren gerente. | Bajo — es parámetro. |
| **S-04** | **[SUPUESTO]** Los *dayparts* se definen como franjas configurables (p. ej. Desayuno, Almuerzo, Tarde, Cena); horarios exactos a confirmar por operaciones. | Bajo. |
| **S-05** | **[SUPUESTO — sigue bloqueante real, no resoluble sin contrato de PSP]** No hay todavía un PSP contratado con quien confirmar soporte de *store-and-forward*. Se documenta como **recomendación de arquitectura** (ver ADR-0006): al momento de contratar el PSP/gateway, dar prioridad a proveedores con *store-and-forward* documentado para EMV (p. ej. Datacap NETePay, o validar Elavon Safe-T Link) para no perder venta con tarjeta en cortes de internet. Mientras tanto, la arquitectura asume degradación a efectivo si el PSP elegido no lo soporta — el efectivo nunca se degrada. | **Alto** — afecta continuidad de negocio en cortes de internet; requiere confirmación real antes de Fase 2 (F2-T4/F2-T5). |
| **S-06** | **[DECISIÓN — Fase 0 producción, 2026-07-18, con fuente oficial]** El impuesto se calcula sobre el subtotal gravable (tras descuentos, RN-03) y se redondea al centavo por transacción. Confirmado con fuente oficial (Florida DOR, Texas Comptroller — ver ADR-0006 y S-08): la comida preparada de restaurante es 100% gravable en ambos estados (no aplican exenciones de "comida fría"/panadería típicas del canal de tienda, salvo ítems de grab-and-go que se vendieran sin utensilios, que sí deben soportar el flag `gravable=false` por SKU). La propina voluntaria no genera impuesto en ninguno de los dos estados. | Bajo — regla confirmada con fuente primaria. |
| **S-07** | **[SUPUESTO]** Moneda única USD; sin manejo de múltiples monedas. | Bajo. |
| **S-08** | **[DECISIÓN — Fase 0 producción, 2026-07-18, con fuente oficial]** Tasas confirmadas para el piloto (Miami-Dade, FL) y techo de referencia para TX (ver ADR-0006 para detalle y fuentes): **FL — Miami-Dade: 6% estatal + 1% surtax discrecional del condado = 7% combinado**, vigente para 2026 según Florida DOR (DR-15DSS); el condado republica la tasa cada noviembre para el año siguiente, por lo que **no debe hardcodearse** — se modela como `ReglaDeImpuesto` por `Ubicacion` con `vigenteDesde`/`vigenteHasta`. **TX — estatal 6.25% + local (ciudad+condado+tránsito) tope combinado 2%, máximo 8.25%**, pero el local **varía por ciudad** (algunas TX quedan por debajo del tope); cada una de las ~30 tiendas TX necesita su propia `ReglaDeImpuesto` verificada contra el Texas Comptroller antes de abrir, no un 8.25% global. Fuentes primarias: Florida DOR (floridarevenue.com) y Texas Comptroller Pub. 94-117. | Bajo para el piloto (Miami-Dade confirmado); Medio para el rollout TX si no se verifica tasa por ciudad antes de cada apertura. |
| **S-09** | **[SUPUESTO]** El recibo digital (correo/QR) es deseable pero no bloqueante; el MVP garantiza recibo impreso. | Bajo. |
| **S-10** | **[SUPUESTO]** Identificación de operador por PIN; sin integración con IdP corporativo en el MVP. | Bajo. |
| **S-11** | **[SUPUESTO]** El KDS del MVP usa una sola cola de cocina; el ruteo por estación se difiere pero el modelo lo contempla. | Bajo. |
| **S-12** | **[SUPUESTO]** El inventario se gestiona a nivel de tienda con conteo/recepción manual; no hay integración con proveedores/compras en el MVP. | Bajo. |
| **S-13** | **[SUPUESTO — Fase 0 producción, 2026-07-18]** Umbral de merma permitido antes de alerta automática de auditoría: **3% del valor de insumo recibido por período de conteo**, configurable por `Ubicacion`. Toda merma por encima del umbral genera `EventoDeAuditoria` de tipo alerta, visible al gerente de tienda. Valor inicial a validar con operaciones antes de Fase 3 (F3-T1). | Bajo — es parámetro configurable. |
| **S-14** | **[SUPUESTO — reunión con Diego Cataño, 2026-07-17, ver `docs/analisis-reunion-diego-arches-20260717.md`]** Los productos elaborados/intermedios (salsas, aderezos preparados en tienda a partir de insumos base — ej. las "13 Signature Sauces") se modelan como `Insumo` con su propia `Receta` de insumos base, y se descuentan/producen mediante un movimiento de "producción" que consume insumos base y genera stock del insumo elaborado. Pendiente confirmar con operaciones qué salsas de Chicken Kitchen se preparan en tienda vs. se compran ya preparadas. | Medio — si se compran ya preparadas, el nivel intermedio no aplica y se simplifica; si se preparan en tienda, no modelarlo produce costeo/descuento de inventario incorrecto. |
| **S-15** | **[SUPUESTO — reunión con Diego Cataño, 2026-07-17]** El motor de promociones condicionales/cupones (vigencia por fecha/tienda/segmento, reglas condicionadas al contenido del ticket, validación contra API externa) es un módulo de **alcance mayor**, explícitamente diferido hasta que el proyecto llegue a Gold Wing Club/lealtad (fuera de Fase 0-3). Mientras tanto, cualquier descuento de "contingencia" (ej. si un sistema de validación externo no responde) debe registrarse como excepción auditada por un gerente (motivo + monto), **nunca como un botón de % libre sin control** — lección directa de un incidente real (un gerente de Archis fue descubierto dando 99% de descuento por un botón de contingencia mal controlado). | Alto si se ignora la lección de control — fraude/pérdida no detectada. |
| **S-16** | **[SUPUESTO — matriz de requerimientos de Alsea, 2026-07-20, ver `docs/analisis-reunion-diego-arches-20260717.md` §7.2]** El catálogo de alérgenos (marcar qué `Insumo` contiene qué alérgeno, y omitirlo automáticamente en la comanda cuando el cliente pide "sin X") requiere datos reales de alérgenos por producto/insumo de Chicken Kitchen que no existen todavía en este proyecto. Se documenta como funcionalidad de **alta prioridad de seguridad alimentaria** (la matriz de Alsea la marca explícitamente como "super importante"), pendiente de que operaciones provea la lista real de alérgenos por insumo antes de construirla — no se modela con datos inventados. | Alto una vez haya datos reales — un alérgeno mal etiquetado es un riesgo de salud del cliente, no solo un defecto de software. |
| **S-17** | **[DECISIÓN — llamada de revisión, 2026-07-22, ver `docs/analisis-revision-20260722-modulos-innovacion-seguridad.md`]** El módulo de nómina **reduce su alcance de producción**: se retira el cálculo de tarifa por hora, el cálculo de neto a pagar, y cualquier botón de "pagar" real desde el POS. El módulo se limita a reportar horas trabajadas (regulares + overtime) como dato de referencia para un sistema de nómina/ERP externo. Motivo (Diego Cataño, Mateo Franco): un error o manipulación de tarifas dentro del POS puede generar pagos incorrectos sin el control que sí tiene un sistema de nómina dedicado — "normalmente la nómina arranca en el ERP", nunca en el POS. Esta es una decisión de **alcance**, no una corrección de bug: la deuda técnica ya documentada sobre nómina en la DEMO (retención solo sobre bruto, regla única de horas extra) sigue siendo válida como defecto de la demo, pero deja de ser relevante para producción en la parte de cálculo/pago porque esa parte se retira del alcance. | Alto si se ignora — riesgo financiero/legal real de pagar mal a empleados desde una herramienta sin los controles de un sistema de nómina dedicado. |

### Preguntas abiertas para el cliente (a resolver antes de Fase 2)
1. ¿El PSP/terminal seleccionado soporta pagos con tarjeta offline (*store-and-forward*)? *(S-05 sigue bloqueante real — no hay PSP contratado aún; recomendación técnica documentada en ADR-0006, pendiente de decisión comercial)*
2. ~~Tasas de impuesto exactas por jurisdicción en FL y TX~~ — **Resuelto para Miami-Dade (S-08)**; pendiente verificar tasa local exacta por cada ciudad de TX antes de abrir esa tienda (no bloquea el piloto FL).
3. Reglas fiscales de recibo mínimas exigidas en FL y TX.
4. Umbrales y motivos válidos para descuentos y reembolsos según política interna — **valor inicial documentado en S-03/S-13**, pendiente de validación final por operaciones antes de Fase 3.
5. Definición horaria oficial de los *dayparts* — **valor inicial documentado en S-04**, pendiente de validación por operaciones.
6. Modelo y cantidad de periféricos por tienda piloto — **recomendación técnica documentada en S-02/ADR-0006**, pendiente de aprobación de compras.
7. **[Nueva, 2026-07-17]** ¿Chicken Kitchen usa o planea usar trazabilidad por código de barras/lote en recepción de insumos? Habilitaría bajas más precisas y un % de merma esperado *por insumo* (hoy S-13 es un umbral agregado por tienda, no por insumo). Ver `docs/analisis-reunion-diego-arches-20260717.md` §3.3.
8. **[Nueva, 2026-07-17]** Diego Cataño ofreció compartir una matriz de ~120 requerimientos funcionales de un sistema QSR/restaurante en producción (Archis) — pendiente que Felipe la solicite y se incorpore como insumo adicional de requisitos.

---

## 7. Fuera de alcance del MVP (backlog de fases futuras)

Alineado con el flujo por fases del README:

- **Kiosco de autoservicio** y **pantalla al cliente** avanzada — `frontend-mostrador-kiosco-pos`.
- **Canales online / app / delivery** (tipo Olo) con ingesta unificada a KDS — `integraciones-canales-pos`.
- **Catering**: pedidos programados con anticipo y hora de entrega/recogida.
- **Programa de lealtad Gold Wing Club**: identidad de cliente, acumulación y canje, promociones dirigidas.
- **Multi-sucursal / gestión central**: consola corporativa, carta maestra, precios por región, roles regional/corporativo, reportes consolidados — `reportes-analitica-pos`, `seguridad-accesos-pos`.
- **Integración contable** y exportación a ERP/finanzas.
- **Ruteo avanzado de KDS** por estación y tiempos objetivo por plato.
- **Gestión de mano de obra** (horarios, marcaje) y reportes de labor avanzados.
- **Recibo digital** enriquecido (correo/QR/SMS) si no entra como deseable en MVP.

---

## 8. Glosario

| Término | Definición |
|---------|------------|
| **QSR** | *Quick Service Restaurant* — restaurante de comida rápida, alta rotación y servicio veloz. |
| **POS** | *Point of Sale* — punto de venta; sistema que registra pedidos y cobros. |
| **KDS** | *Kitchen Display System* — pantalla de cocina que muestra y gestiona las comandas. |
| **Daypart** | Franja horaria de servicio (desayuno, almuerzo, tarde, cena) usada para análisis y operación. |
| **PSP** | *Payment Service Provider* — proveedor que procesa los pagos con tarjeta. |
| **EMV** | Estándar de tarjetas con chip (Europay-Mastercard-Visa); incluye contactless. |
| **PCI-DSS** | *Payment Card Industry Data Security Standard* — normas de seguridad para datos de tarjetas. |
| **PAN** | *Primary Account Number* — número completo de la tarjeta; dato sensible que no debe almacenarse. |
| **Modificador** | Ajuste a un producto (guarnición, salsa, tamaño, sin/con extra), con o sin precio. |
| **Combo** | Conjunto de productos vendidos como paquete con selecciones (p. ej. plato + guarnición + bebida). |
| **86** | Jerga de cocina: producto agotado / no disponible para vender. |
| **Store-and-forward** | Técnica que guarda transacciones (p. ej. de tarjeta) localmente y las envía al reconectar. |
| **Cierre Z / Reporte Z** | Reporte de cierre de turno/día con totales inalterables tras el corte. |
| **Arqueo** | Conteo y cuadre del efectivo del cajón contra lo esperado. |
| **Gold Wing Club** | Programa de lealtad de Chicken Kitchen (fuera del MVP). |
| **Olo** | Plataforma de agregación de pedidos online/delivery (referencia de canal, fuera del MVP). |
| **Offline-first** | Diseño donde la operación local funciona sin internet y sincroniza al reconectar. |

---

*Fin del documento de requisitos del MVP — listo para revisión de arquitectura (`arquitecto-pos`).*
