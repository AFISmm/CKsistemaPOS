# Análisis — Reunión con Diego Cataño sobre arquitectura de Archis/Alsea (2026-07-17)

- **Fuente:** `POS-20260717_140501-Meeting Recording.mp4` (2h02m), transcrita por el usuario en `POS.docx` (ya no se conserva en el repo — solo este análisis; el docx/mp4 son material fuente del usuario, no artefactos de proyecto).
- **Participantes:** Diego Cataño (ex-responsable de TI/arquitectura del sistema POS de Archis bajo Alsea, ~28 tiendas, sobre software "Codesis"/"Cody Shop" español) y Felipe Serna (Digenius, este proyecto).
- **Propósito de este documento:** extraer del conocimiento de dominio de Diego lo que es **accionable** para el POS de Chicken Kitchen — qué valida decisiones ya tomadas, qué es un gap real de alcance, y qué explícitamente **no aplica** (Archis es un restaurante de mesa/servicio completo; Chicken Kitchen es mostrador/counter-service).

---

## 1. Contexto de la fuente (para juzgar qué tan aplicable es cada punto)

Archis operaba con una arquitectura **cliente-servidor con SQL local por tienda** (un "maestro" + "clientes"/KDS), más un servicio intermedio ("NT9") que sincronizaba cada tienda con una base de datos central on-premise (data center físico en Bogotá, no nube). Es la **misma familia arquitectónica** que ya elegimos en ADR-0001 (hub-and-spoke, fuente de verdad local), pero con una debilidad que Diego señaló explícitamente:

> "Si el servidor maestro se cae, se caen todos los clientes... hay otros como Aloha que sí permiten que las estaciones trabajen de forma independiente."

**Esto confirma, con un caso real de fallo en producción, la decisión de ADR-0007/F1-T3 de que las terminales cacheen catálogo y encolen escrituras en IndexedDB** — nuestro diseño ya es más resiliente que el de Archis en ese punto exacto (las terminales chicken Kitchen NO dependen 100% de que el Store Server esté vivo en todo momento gracias a la cola offline, aunque seguimos teniendo el mismo punto único de fallo *si* el Store Server cae por más tiempo del que la cola tolera — ver ADR-0008, ya documentado como riesgo aceptado).

---

## 2. Lo que VALIDA decisiones ya tomadas (no requiere cambios, solo confirma)

| Punto de Diego | Dónde ya lo tenemos |
|---|---|
| Monitoreo de conectividad que alerta ANTES de que se caiga la red ("como el Instituto de Sismología... se daban cuenta segundos antes") | `ConectividadService` (F3-T2) — implementado con el mismo espíritu, alerta temprana antes de que el outbox note el corte |
| Failover a 4G/LTE como mitigación de continuidad cuando se cae el internet de la tienda | Documentado en `docs/operaciones/requisitos-red-tienda-piloto.md` (F3-T2) |
| El costeo de combos/modificadores es "un rollo" porque el costo varía según la selección aunque el precio sea fijo | Exactamente el problema que resuelve `CosteoService` (F2-T1, BOM por variante) — confirma que no estábamos resolviendo un problema imaginario |
| Las bajas de inventario NO deben poder ingresar al sistema sin aprobación de calidad ("la gente no puede ingresar al sistema hasta que esté aprobado por calidad") | Exactamente el diseño de `BajasService` (F3-T1): `solicitarBaja` nunca toca stock, solo `aprobarBaja` lo hace |
| Estados Unidos no tiene mandato de facturación electrónica gubernamental (a diferencia de Colombia/DIAN) | Ya investigado y documentado en Fase 0 (`docs/requisitos.md`, sección de facturación) |
| La propina como % sugerido puede estar restringida por ley según el país (Colombia no lo permite legalmente) | Nuestro RN-02 (propina siempre opcional, nunca obligatoria) es compatible; anotar como **supuesto a revisar si el proyecto escala a otro país** distinto a US |
| Chicken Kitchen tiene una carta mucho menos compleja que un restaurante de servicio completo (el plato más complejo es el chop-chop bowl) | Confirma que el modelo de `Combo`/`GrupoModificador` actual (sin necesidad de una jerarquía de 4 niveles como Archis) es proporcional al problema real |

---

## 3. Gaps reales identificados (nuevos, no estaban en el backlog)

Ordenados por qué tan accionable/acotado es cada uno.

### 3.1 BOM multinivel — productos elaborados/intermedios (ALTO, acotado, recomendado implementar ya)

Diego describe un patrón que Archis sí necesitaba y que **Chicken Kitchen casi seguro necesita también** dado que el menú demo ya tiene "13 Signature Sauces":

> "Preparan 1 litro de vinagreta... y sobre esa unidad empiezan a sacar porciones... Son productos grandes que salen del almacén y se transforman en un producto terminado que se llama salsa barbecue."

Hoy, `Receta`/`RecetaInsumo` (arquitectura.md §5.1, `store-server/prisma/schema.prisma`) solo modela **un nivel**: Producto → Insumos directos. No hay forma de decir "la Receta de Chop-Chop Bowl usa 2 oz de Salsa BBQ, y la Salsa BBQ *en sí misma* es un producto elaborado con su propia receta de insumos base (tomate, especias, etc.)". Sin esto:
- El costeo (`CosteoService`, F2-T1) de cualquier plato que use una salsa preparada internamente **no puede resolver el costo real** de esa salsa (solo sabe costear insumos comprados directamente).
- El descuento de inventario al vender un plato con salsa preparada **descontaría el insumo equivocado** (o ninguno) si la salsa no se modela como su propia entidad con su propio stock.

**Recomendación:** extender el modelo para que un `Insumo` pueda, opcionalmente, tener su propia `Receta` (auto-referencia: un insumo "elaborado" se produce a partir de otros insumos base), y que exista un movimiento de "producción/transformación" (consume insumos base, genera stock del insumo elaborado) — análogo a `registrarMermaAprobada` pero para producción interna en vez de merma. Esto es un gap concreto, acotado y de alto valor — **implementado más abajo en este mismo pase** (ver sección 5).

### 3.2 Motor de promociones/descuentos condicionales (ALTO, pero NO acotado — requiere su propio ciclo de diseño)

Hoy solo tenemos `aplicarDescuento` (un % o monto plano con umbral de autorización, S-03). Archis tenía un motor de reglas mucho más rico:

- Vigencia por fecha/hora, por tienda, por segmento de cliente.
- Reglas condicionadas al contenido del ticket ("20% de descuento sobre risottos SOLO SI el ticket también tiene un postre X").
- Cupones electrónicos validados contra un API externo (¿ya fue canjeado? ¿sigue vigente?).
- Cupones de partners/alianzas (empleados, Falabella) con su propia validación.
- Botones manuales de contingencia para cuando la validación externa no responde — con el riesgo real que Diego menciona: **un gerente fue descubierto dando 99% de descuento usando un botón de contingencia mal controlado**, lo que forzó a que toda contingencia se registre como "cortesía" auditada en vez de un botón de descuento libre.

**Esto es explícitamente fuera de alcance del MVP actual** (Chicken Kitchen no tiene todavía un programa de cupones/partners ni Gold Wing Club implementado — ver `docs/requisitos.md` §7, "Fuera de alcance del MVP"). **No lo voy a implementar a medias ahora** porque un motor de reglas de descuento mal diseñado es exactamente el tipo de superficie de fraude que Diego describe (el incidente del 99%). Se documenta como un ítem de backlog explícito para cuando el proyecto llegue a Gold Wing Club / lealtad (fuera de Fase 0-3), con la lección de diseño ya incorporada: **cualquier descuento de contingencia manual debe auditarse como excepción explícita, nunca como un botón de "% libre" sin trazabilidad**.

### 3.3 Trazabilidad por lote/código de barras para recepción y bajas (MEDIO, relevante para EE.UU. específicamente)

Felipe mismo aportó un dato clave de su experiencia en Subway EE.UU.: las auditorías de saneamiento son estrictas, las etiquetas de vencimiento van codificadas por color según el día, y las franquicias tienen un **% de merma esperado por insumo** (~1.3% mensual en el ejemplo del pan) usado por el corporativo/franquiciante para **detectar fraude disfrazado de merma** (empleados haciendo sándwiches "gratis" y reportándolos como baja). Diego recomienda trazabilidad por código de barras/lote para:
1. Facilitar el registro de recepción y de bajas (menos captura manual).
2. Poder conciliar automáticamente cuánto entró vs. cuánto salió por lote.

Hoy `SolicitudBaja` (F3-T1) tiene `insumoId`, `cantidad`, `motivo`, `etiqueta` (texto libre) — **no tiene un campo de lote/código de barras estructurado ni una comparación automática contra el % de merma esperado por insumo** (solo tenemos el umbral global `Ubicacion.umbralMermaPorcentaje`, S-13, que es agregado por tienda/período, no por insumo específico). Esto es un gap real pero de **mayor alcance que un fix rápido** (requiere decidir si se adopta código de barras físico, qué hardware de escaneo, y un umbral por insumo en vez de global) — se documenta como supuesto/pregunta abierta nueva (ver sección 4), no se implementa en este pase.

### 3.4 Mejoras concretas al KDS (MEDIO, kds-cocina-pos, fuera de alcance de `store-server`)

Varias ideas de Diego son directamente aplicables al `kds-cocina-pos` (dueño distinto, no `store-server` — ver arquitectura.md §9.5) cuando se construya en producción:
- **Modo split-screen**: si un KDS físico falla, otro puede dividir su pantalla para cubrir 2 estaciones (mitigación de hardware, complementa F2-T4).
- **Priorizar/expeditar un ticket manualmente** (el gerente puede adelantar un pedido en la cola).
- **Recuperar un ticket ya cerrado** (si hay que rehacer un plato, vuelve a aparecer en cocina con su cronómetro).
- **Cola priorizada por canal/SLA**: pedidos con SLA de entrega estricto (ej. un agregador tipo "turbo") deberían entrar con prioridad visual/de cola sobre pedidos de mostrador normales — relevante para cuando Chicken Kitchen integre canales online/delivery (fuera del MVP actual, `docs/requisitos.md` §1.4).
- **Filtro para ocultar anotaciones/modificadores** que saturan la pantalla.

Se agregan como ítems de backlog para `kds-cocina-pos` (Fase 2/futuro), no se implementan ahora (el KDS de producción no se ha construido en `store-server` — arquitectura.md se lo asigna a otro dueño).

### 3.5 Control de proceso: creación de usuarios del sistema (BAJO, ya cubierto en espíritu)

Diego relató que tuvieron que **quitarle a los gerentes la capacidad de crear usuarios directamente** porque un gerente dañó la base de datos, forzando un proceso formal de solicitud con anticipación. Nuestro `SeguridadModule` (F1-T6) ya no expone una ruta de "crear Usuario" sin control — los usuarios se siembran vía `prisma/seed.ts` en el MVP; **antes de producción real** (Fase 2+), si se construye un endpoint de alta de empleados/usuarios, debe quedar restringido a un permiso gerencial/corporativo, nunca abierto sin aprobación — ya es el criterio de diseño que hemos seguido en todo el proyecto (RBAC granular), solo se deja la anécdota como refuerzo, no requiere cambio de código.

---

## 4. Nuevos supuestos/preguntas abiertas para `docs/requisitos.md`

- **S-14 [SUPUESTO]:** los productos elaborados/intermedios (salsas, aderezos preparados en tienda) se modelan como `Insumo` con su propia `Receta` de insumos base, y se descuentan/producen mediante un movimiento de "producción" — ver sección 5. Pendiente de confirmar con operaciones qué salsas/preparaciones de Chicken Kitchen se hacen en tienda vs. se compran ya preparadas.
- **S-15 [SUPUESTO]:** el motor de promociones condicionales/cupones (más allá del descuento plano actual) se construye cuando el proyecto llegue a Gold Wing Club/lealtad — explícitamente fuera de Fase 0-3. Cualquier botón de descuento de "contingencia" debe auditarse como excepción, nunca como % libre sin control (lección directa del incidente del 99% de descuento en Archis).
- **Pregunta abierta nueva:** ¿Chicken Kitchen usa o planea usar trazabilidad por código de barras/lote en recepción de insumos? Esto habilitaría bajas más precisas y comparables contra un % de merma esperado *por insumo* (no solo un umbral agregado por tienda como hoy, S-13).
- **Acción de seguimiento (no técnica):** Diego ofreció compartir una **matriz de ~120 requerimientos funcionales** que armó al llegar a Archis. Vale la pena que Felipe se la pida — es un insumo de requisitos reales de un sistema QSR/restaurante en producción que puede revelar más gaps de los que esta única sesión alcanzó a cubrir (ejemplos que él mismo mencionó al pasar: soporte de multi-moneda en aeropuertos/zonas fronterizas, corte automático de día configurable para operaciones 24 horas — ninguno crítico para el MVP actual de Chicken Kitchen, pero la matriz completa puede tener más).

---

## 5. Qué se implementó en este mismo pase (ver commit correspondiente)

Se implementó el punto 3.1 (BOM multinivel para productos elaborados/intermedios) en `store-server`, por ser el único gap de esta sesión que es a la vez **de alto valor, concreto, y del tamaño correcto** para no violar el principio de este proyecto de no sobre-construir. Los demás (3.2 motor de promociones, 3.3 trazabilidad por lote, 3.4 mejoras de KDS) quedan documentados como backlog explícito de fases futuras, no como código a medias.

## 6. Qué NO aplica a Chicken Kitchen (explícitamente descartado, no es deuda pendiente)

- Todo el módulo de **plano de mesas** (floor plan, mapa de bits, mesas verdes/azules/rosadas, unir/separar mesas, conteo de comensales, "pancito" por cada 4 personas) — Chicken Kitchen es mostrador/counter-service, no servicio a la mesa (confirmado en `docs/requisitos.md` §1.1: "Servicio de mostrador con cocina abierta... no servicio a la mesa").
- **Dividir cuenta entre múltiples tarjetas de distintas personas en la misma mesa** — Diego y Felipe coinciden en que esto es raro en EE.UU. (todo el mundo paga con una sola tarjeta); el pago mixto que sí tenemos (RN-05, un solo pagador con múltiples métodos) cubre el caso real relevante.
- **Facturación electrónica obligatoria ante una entidad gubernamental** — no existe ese mandato en EE.UU. (ya confirmado en Fase 0).
- **Voucher de aerolíneas, multi-moneda en aeropuertos** — Chicken Kitchen no opera en aeropuertos en el MVP; no aplica al piloto de Miami.
- **NT9 / arquitectura on-premise en un data center físico propio** — ya superado por nuestra decisión de Store Server por tienda + nube (ADR-0001), que es estrictamente mejor para el caso de 30 tiendas distribuidas.

---

## 7. Addendum (2026-07-20) — Matriz de requerimientos funcionales (`Matriz Funcional POS.xlsx`)

Diego compartió la matriz que ofreció en la reunión: **120 requerimientos funcionales reales** de la evaluación de proveedores de Alsea, organizados en 3 áreas (FRONT, BACKOFFICE, TÉCNICO) con una columna de observaciones del propio equipo de Alsea sobre cómo cada ítem se resolvió en producción. Es un documento de RFP real, no una lista genérica — se cruzó fila por fila contra el diseño y el código actual de Chicken Kitchen. El archivo original (`Matriz Funcional POS.xlsx`) **no se conserva en el repo** (excluir explícitamente si se agrega al `.gitignore` en el futuro — por ahora no se commiteó), solo este análisis.

### 7.1 Fuerte validación adicional (sin acción requerida)

- **Arquitectura cliente-servidor centralizada + modo offline + P2P entre terminales** — la sección 3.2 de la matriz (TÉCNICO/ARQUITECTURA) describe punto por punto lo que Alsea terminó construyendo, marcado por ellos mismos como "Cumple con la arquitectura". Es prácticamente idéntico a ADR-0001/ADR-0002. La única diferencia real: sus terminales podían hablar peer-to-peer entre sí como respaldo si el servidor caía; las nuestras no (van siempre al Store Server), pero mitigamos el mismo riesgo con la cola offline en IndexedDB (F1-T3) — una solución distinta al mismo problema, no un gap.
- **Consola de administración central con jerarquías (país/región/marca) y aplicación calendarizada de cambios** (matriz 3.1) — es exactamente lo que ya está planeado como F5-T1 ("Consola central multi-tienda + catálogo maestro") en `PLAN_DE_PRODUCCION.md`. Confirma que es la funcionalidad correcta a construir cuando llegue esa fase, no antes.
- **Canales online/delivery resueltos por un sistema externo ("Ordering"), no por el POS mismo** (matriz 1.3, casi todas las observaciones dicen "ya funciona con Ordering") — confirma la decisión ya tomada en `docs/requisitos.md` §1.4 de que integraciones online/delivery quedan fuera del MVP.
- **Lealtad (registro de clientes, frecuencia/consumo, tarjeta de regalo, puntos)** (matriz 1.4) — confirma que es exactamente el alcance de Gold Wing Club, ya diferido.
- **Stack sin licenciamiento propietario, con acceso a código fuente y estructura de BD documentada** (matriz 3.3) — ya lo cumplimos por construcción (NestJS/Prisma/Postgres, código propio).

### 7.2 Gaps nuevos, reales y accionables (no estaban identificados antes)

| # | Gap | Evidencia en la matriz | Prioridad |
|---|-----|------------------------|-----------|
| 1 | **Autorización requerida para modificar/eliminar una línea que YA fue enviada a cocina** | Fila "Candados de autorización... Autorización para modificar una orden que ya fue enviada a cocina" (matriz 1.1) | **Alta — se implementa en este mismo pase** (ver §7.3). Verificado en el código: `VentasService.actualizarLinea` hoy solo bloquea si el PEDIDO completo está cobrado/cancelado, nunca si la LÍNEA específica ya se envió a cocina — un cajero puede hoy borrar o cambiar la cantidad de un plato que la cocina ya está preparando, sin ningún permiso ni auditoría. |
| 2 | **Control de lotes y caducidad para insumos** | Fila "Control de lotes y caducidades" (matriz 2.1) — coincide EXACTAMENTE con lo que Diego ya había mencionado en la reunión (§3.3 de este documento) | Alta, pero de mayor alcance (requiere decisión de hardware de escaneo) — se mantiene como pregunta abierta ya documentada, ahora con doble confirmación (reunión + RFP formal) |
| 3 | **Catálogo de alérgenos con omisión automática** | Fila "Manejo de alérgenos como funcionalidad" (matriz 1.2), con la observación explícita "Alérgenos es super importante" | Alta (seguridad alimentaria/legal), pero requiere datos reales de alérgenos por producto de Chicken Kitchen que no existen todavía — se documenta como nuevo supuesto (S-16), no se implementa con datos inventados |
| 4 | **Reporte de uso Real vs. Ideal de inventario (variación de food cost)** | Fila "Uso diario del Inventario" (matriz 2.2): inventario inicial, repartido, usado real, uso ideal (por receta), variación real vs. ideal, costo real vs. costo ideal | Alta — ya tenemos TODOS los datos para esto (`Receta`/`RecetaInsumo` de F2-T1, movimientos de `Stock`) pero ningún reporte los cruza. Es el tipo de reporte que un gerente de operaciones usa constantemente para detectar merma/fraude no reportado (exactamente el problema que describió Felipe con Subway). **Se documenta como backlog de alto valor para F2-T3/futuro**, no se implementa en este pase por alcance (requiere diseñar qué es "uso ideal" con el nuevo BOM multinivel de S-14 ya en el sistema). |
| 5 | **Depósitos y retiros parciales de caja durante el turno** | Fila "Manejo de Cortes, Depósitos y Retiros Parciales" (matriz 1.1) | Media — práctica común de control de pérdidas (cash drops), no modelada en `Turno` hoy (solo apertura/cierre). Backlog nuevo. |
| 6 | **Respaldos locales y en la nube de PostgreSQL, con plan de mantenimiento de BD** | Filas "Funcionalidad de respaldos locales", "...en la nube", "Mantenimiento DB" (matriz 3.3) | **Alta — se implementa en este mismo pase** (ver §7.3). Es un gap real: en toda la Fase 0-3 de este proyecto nunca se documentó una estrategia de respaldo/recuperación para el Store Server, a pesar de que es la fuente de verdad operativa de la tienda (ADR-0001). |
| 7 | **Redundancia automática de impresora/monitor KDS de respaldo** | Fila "Manejo de Monitores e Impresoras" — "se tiene la opción para asignar impresoras o monitores de respaldo... la orden se re-direcciona automáticamente" (matriz 1.2) | Media — hoy `EscPosImpresoraAdapter` (F2-T4) degrada a log si falla, pero no reintenta contra un segundo dispositivo configurado. Backlog para cuando haya hardware físico real que probar (F4-T1). |
| 8 | **Política de retención/depuración de históricos + rotación de contraseñas/PIN** | Filas "Archivo y depuración de históricos programable", "Mantenimiento a Cuentas de Usuario" (matriz 3.3) | Media — ninguna de las dos existe hoy. Backlog para antes del piloto real (F4). |
| 9 | **Costeo por última entrega vs. costo promedio ponderado** | Fila "diferentes presentaciones de entrega para un mismo artículo... tomando el precio de la última entrega o promediando los costos" (matriz 2.1) | Baja — refinamiento futuro de `CosteoService` (F2-T1); hoy `Insumo.costoUnitario` es un solo valor manual, suficiente para el MVP. |
| 10 | **Costo real vs. ideal de labor (labor cost %)** | Fila "Manejo de costo Real e Ideal de Labor" (matriz 2.3) | Baja/futuro — depende de que `nomina-pos`/`rrhh-personal-pos` (hoy solo en la demo, nunca migrados a `store-server`) se integren con ventas; analítica futura, no MVP. |

### 7.3 Qué se implementó en este mismo pase

De los 10 gaps de §7.2, se implementaron los dos de **prioridad alta que son acotados, no requieren datos de negocio inventados, y no dependen de una decisión externa pendiente**:

1. **Autorización para modificar/eliminar una línea ya enviada a cocina** (`store-server/src/ventas/*`).
2. **Estrategia de respaldo de PostgreSQL** (script + documentación operativa, `store-server/scripts/` y `docs/operaciones/`).

Los demás (alérgenos, lote/caducidad, uso real vs. ideal, depósitos parciales de caja, redundancia de impresora, retención de históricos, costeo por última entrega, costo de labor) quedan como backlog explícito — ver `docs/backlog.md` para el estado de cada uno.
