# Análisis — Llamada de revisión del 2026-07-22 (Diego Cataño, Mateo Franco, Felipe Serna)

- **Fuente:** `Llamada con Revisión POS-20260722_103059-Grabación de la reunión.mp4` (1h05m), transcrita
  por el usuario en `Llamada con Revisión POS.docx` (no se conserva en el repo, ver `.gitignore`).
- **Entregable solicitado por el usuario:** un documento Word con módulos a mejorar/editar/eliminar,
  ideas de innovación y un plan de seguridad para producción. Ese documento (`Revision-POS-20260722-
  Modulos-e-Innovacion.docx`, generado con python-docx) vive en la raíz de `SistemaPOS/` y **no se
  commitea** (excluido en `.gitignore`, es un entregable, no fuente del proyecto). Este archivo es el
  espejo versionado de su contenido, para que quede en el historial del proyecto.
- **Contexto:** llamada de revisión de la demo actual (pantalla compartida) con dos revisores con
  experiencia operativa real en QSR/restaurantes (Diego Cataño, ya conocido de la reunión del 17 de
  julio; Mateo Franco, nueva voz en el proyecto, con experiencia en Andrés Carne de Res y otros
  restaurantes de servicio a la mesa en Colombia).

## Resumen de hallazgos (ver el Word para el detalle completo)

**Módulos a mejorar:** terminal de cajero (fijar línea tras descuento), personal/RRHH (editar horario,
tarifa por persona), gestión de menú (editar insumos de receta, clasificar modificadores, empaque
automático en "para llevar"), chequeo de jornada (fallback universal a Face ID), reportes (trazabilidad
completa de tiempos por etapa), autorización de anulación (mecanismo + registro de patrones por empleado).

**Módulos a editar (cambio estructural):**
1. El flujo cobrar-vs-enviar-a-cocina debe ser **configurable** (mostrador cobra primero; servicio a la
   mesa cobra al final); para Chicken Kitchen el valor por defecto debe ser cobrar antes de enviar a cocina.
2. La interfaz debe ser **condicional según permisos**: un usuario con un solo rol/acceso entra directo a
   su única pantalla, sin sidebar.
3. Los pedidos de agregadores (Uber/DoorDash/Olo) deben entrar **directo a cocina**, nunca a una cola de
   "por cobrar" que dependa de que el cajero los apruebe manualmente (riesgo de colapso de cocina en hora
   pico) — documentado para cuando se construya esa integración (fuera del MVP actual).
4. El módulo de nómina se **reduce de alcance** — ver decisión formal abajo (S-17).

**Se elimina:** el cálculo de tarifa/neto a pagar y el botón "Pagar" dentro del POS (ver S-17).

**Módulos nuevos identificados:** apertura/cierre de caja con bloqueos duros (no tomar pedidos sin turno
abierto; no permitir clock-out con turno abierto; conciliación contra el reporte del datáfono por
franquicia de tarjeta); reparto de propinas por rol/puntos (herramienta operativa, no contable).

**Ideas de innovación (ver Word §6 para el detalle):** chatbot 100% por voz (manos libres, reutiliza la
infraestructura de voz ya real del proyecto), toma de pedido por voz para el cajero, QR rotativo para
clock-in (reutiliza el TOTP ya construido para el chequeo de jornada), autorización remota por
notificación push al gerente, auto-86 al llegar a stock cero, resumen diario en lenguaje natural (una vez
el chatbot use un LLM real), sugerencias de venta cruzada contextual, QR de seguimiento de pedido en el
recibo.

**Seguridad para producción (ver Word §7):** aclaración honesta de que un frontend web siempre es
inspeccionable — lo que realmente se protege es el backend (ya diseñado así desde el ADR-0001); tokens de
sesión firmados en vez del header simple actual; bloqueo por intentos fallidos de PIN; certificado mTLS
por terminal; modo kiosko de SO; firma de peticiones terminal↔Store Server; gestión de secretos real;
pentest externo antes de producción.

## Decisión formal: S-17 — Reducción de alcance del módulo de nómina

Ver `docs/requisitos.md` S-17 para el detalle completo. Resumen: el cálculo real de tarifa/hora, neto a
pagar y cualquier botón de "pagar" se retira del alcance de producción del POS — el módulo se limita a
reportar horas trabajadas (regulares + overtime) como referencia para un sistema de nómina/ERP externo.
Esto es una **reducción de alcance**, no un bug a corregir: los defectos ya documentados de la demo sobre
nómina (retención solo sobre bruto, regla única de horas extra, propinas ligadas a quien abrió el turno —
ver `PLAN_DE_PRODUCCION.md` §6) siguen siendo válidos como deuda técnica de la DEMO, pero dejan de ser
relevantes para producción en la parte de cálculo/pago, precisamente porque esa parte no va a existir ahí.

## Sección 2.3 — Gestión de menú: clasificación de modificadores, costeo e insumos elaborados (Fase B, 2026-07-22)

A partir del hallazgo ya listado arriba ("gestión de menú: ... clasificar modificadores") y de la matriz de
Alsea (S-16), esta Fase B implementa 4 piezas sobre el catálogo real importado (ver Anexo abajo para el
detalle de datos): (1) una clasificación de PRESENTACIÓN de modificador (`Modificador.categoria`:
topping/salsa/sustitución/otro, ver `lib/domain/types.ts`) independiente de `TipoModificador` (mecánica);
(2) costos DEMO estimados por insumo (`Insumo.costoUnitarioCentavos`); (3) un ejemplo funcional de BOM
multi-nivel (`Insumo.recetaBaseId`); (4) un catálogo DEMO de alérgenos por insumo (`Insumo.alergenos`,
`TipoAlergeno`) con un cálculo de alérgenos efectivos al simular "sin X". Las 4 son heurísticas/estimados
DEMO explícitamente documentados como tales (no datos reales verificados), siguiendo la misma convención de
`[SUPUESTO]` documentado + avanzar que ya usa `docs/requisitos.md` — ver Anexo.

## Anexo — Hallazgos de verificación de datos del import de `Recetario_Simplificado.xlsx` (Fase A/B)

**A.1 — Costo del insumo no es un dato importable.** El archivo fuente trae una columna "Costo ($)" por
línea de ingrediente, pero se verificó que NO es un costo unitario confiable: el mismo insumo (ej. "SALT
IODIZED GRANULAR", usado 185 veces en el archivo) implica un costo-por-onza que varía entre $0.019 y $3.58
según la receta en la que aparece — ~180x de varianza. `scripts/importar-recetario.js` documenta esto y
excluye esa columna del import por completo (ver su encabezado). Fase B NO intenta rescatar ese dato: en vez
de eso, `Insumo.costoUnitarioCentavos` se puebla con un ESTIMADO DEMO por categoría de insumo (proteína,
producto fresco, lácteo, especia/seco, salsa/aderezo/aceite, pan/almidón, bebida, postre, empaque/desechable),
detectada por palabras clave sobre el nombre real de cada uno de los 84 insumos (ver
`lib/data/catalog-insumos-costos.demo.ts`), documentado como estimado pendiente de validar contra facturas
reales.

**A.2 — Sin evidencia de BOM multi-nivel real en el archivo.** Se verificó que el archivo fuente NO trae
ningún caso real de un insumo que sea a su vez un producto elaborado a partir de otros insumos del mismo
archivo (0 coincidencias entre nombres de ingrediente y nombres de producto). Por eso el modelo de import
original (`scripts/importar-recetario.js`) es plano a propósito: `Producto -> Receta -> RecetaInsumo ->
Insumo`, sin niveles intermedios.

**A.3 — Ejemplo demo fabricado de BOM multi-nivel (Fase B, 2026-07-22).** Para no dejar la capacidad de BOM
multi-nivel del modelo de dominio (`Insumo.recetaBaseId`, agregado en Fase B) completamente sin ejercitar, se
construyó UN ejemplo end-to-end, **explícitamente fabricado como simplificación de demo**, no como una
afirmación sobre cómo opera realmente Chicken Kitchen: la salsa real "GARLIC CILANTRO" (categoría Sauces,
`prod-real-sauces-garlic-cilantro-3`, con receta real de limón, ajo, mayonesa, sal, cilantro y crema agria)
se modela ADEMÁS como un insumo compuesto (`insu-demo-salsa-garlic-cilantro-preparada`, ver
`lib/data/catalog-demo-fase-b.ts`) y se agrega como un ingrediente extra de "ORIGINAL CHOP-CHOP"
(`prod-real-chop-chop-original-chop-chop-21`), un plato real de la misma familia (Chop-Chop) que en el
archivo fuente NO incluye esa salsa. Esto crea una cadena real de 2 niveles (Plato → usa la Salsa como
insumo → la Salsa tiene su propia receta de insumos base) sobre la que SÍ cascadea correctamente el descuento
de stock (`lib/inventory/inventario.ts` / `lib/inventory/bom.ts`) y el costeo (`lib/menu/costeo.ts`). Sigue
abierta la pregunta operativa de S-14 (`docs/requisitos.md`): si Chicken Kitchen realmente prepara esta u
otra salsa en tienda a partir de insumos base, o las compra ya hechas — este ejemplo NO resuelve esa
pregunta, solo demuestra que el código puede modelarla correctamente el día que se confirme.
