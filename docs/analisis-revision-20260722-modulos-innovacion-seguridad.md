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
