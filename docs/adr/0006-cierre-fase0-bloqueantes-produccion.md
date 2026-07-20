# ADR-0006 — Cierre de Fase 0 (bloqueantes) del plan de producción

- **Estado:** Aceptado (con dos ítems que permanecen abiertos por diseño)
- **Fecha:** 2026-07-18
- **Autor:** `orquestador-pos` (rol asumido por Claude Code en esta sesión; los
  subagentes con nombre `.claude/agents/*-pos.md` no estaban disponibles como
  `agent type` en esta sesión por directorio de trabajo — ver nota al final)
- **Relacionados:** ADR-0001, ADR-0002, ADR-0004, ADR-0005
- **Requisitos:** S-02, S-03, S-04, S-05, S-06, S-08, S-13, RN-01, RNF-05, RNF-06

## Contexto

`PLAN_DE_PRODUCCION.md`, Fase 0, define cuatro bloqueantes (F0-T1..F0-T4) que
debían cerrarse con decisión documentada antes de empezar Fase 1. No hay en esta
sesión un PSP contratado, un departamento de finanzas, ni un equipo de compras
disponible para responder en vivo. Siguiendo la propia regla de avance del plan
("documenta un supuesto y sigue; no bloquees el avance esperando aclaraciones
externas salvo en los bloqueantes de la Fase 0"), y con autorización explícita
del dueño del producto para usar datos DEMO/de investigación donde falte
información real, se investigó cada bloqueante con fuentes públicas donde era
posible (impuestos, hardware) y se documentó como supuesto donde la respuesta
depende de un contrato comercial que todavía no existe (PSP).

## Decisiones

### F0-T2 / S-06 / S-08 — Tasas fiscales FL/TX

**Confirmado con fuente primaria** (Florida Department of Revenue, Texas
Comptroller Pub. 94-117):

- **Florida — Miami-Dade (tienda piloto):** 6% estatal + 1% *discretionary
  surtax* del condado = **7% combinado**. La comida de restaurante (caliente,
  con utensilios, para consumo inmediato o "to go") es **100% gravable**; no
  aplican las exenciones de comida fría no lista para consumo que sí existen
  para canal de tienda/grocery. El condado republica la tasa de surtax cada
  noviembre para el año siguiente (0%–1.5% según condado) — **no hardcodear**.
- **Texas:** 6.25% estatal + hasta 2% local (ciudad + condado + tránsito +
  distritos especiales), **tope combinado 8.25%**, pero el componente local
  varía por ciudad — algunas quedan por debajo del tope. La comida de
  restaurante es gravable en TX salvo la excepción de panadería vendida sin
  utensilios (no aplica al modelo de negocio de mostrador de esta cadena).
- Propina voluntaria: exenta de impuesto en ambos estados (confirma RN-02).
  Propina obligatoria: gravable en FL; en TX exenta hasta el 20% si se etiqueta
  por separado y se entrega íntegra al personal.

**Decisión de modelado:** cada `Ubicacion` tiene su propia `ReglaDeImpuesto`
con `vigenteDesde`/`vigenteHasta` (ya contemplado en el modelo de
`docs/arquitectura.md` §5.1); **no existe una tasa global FL=7%/TX=8.25%
válida para las 30 tiendas** — el 8.25% de TX es un techo, no un valor fijo.
Antes de abrir cada tienda de TX, se debe verificar la tasa local exacta de esa
ciudad contra el Texas Comptroller. Ver `docs/requisitos.md` S-08 actualizado.

### F0-T3 / S-02 — Hardware y periféricos

**Recomendación técnica** (no orden de compra; pendiente de aprobación de
compras/operaciones):

- **Impresora de recibo/comanda:** Epson TM-m30III (o Star TSP143IV) — ESC/POS,
  drivers Linux/Node disponibles (`node-thermal-printer`, `escpos`).
- **Cajón monedero:** disparo por **pulso RJ11/12 a través de la impresora**
  (comando ESC/POS "drawer kick"), no HID directo — patrón dominante y más
  simple de integrar desde NestJS (un solo canal de comandos ESC/POS ya
  necesario para el recibo).
- **Terminal EMV / P2PE:** **Datacap NETePay** como gateway recomendado —
  documenta *store-and-forward* PCI-validado, P2PE y tokenización, y es
  agnóstico de procesador (Heartland, EVO, etc.), lo que da flexibilidad para
  la decisión comercial de S-05. Elavon Safe-T Link como alternativa a
  validar con documentación directa antes de decidir.
- **KDS:** unidad táctil *fanless* de 21.5" (ambiente de cocina/calor/grasa) o,
  como ruta económica para el piloto, un tablet Android de gama media.
- **Costo directional** por tienda piloto: ~US$1,500–3,500 (impresora + cajón +
  terminal EMV + KDS purpose-built), o <US$1,000 con KDS en tablet.

Esta decisión **no cierra S-02 como definitivo**: el modelo/marca final requiere
aprobación de compras. Lo que sí queda cerrado para Fase 2 (F2-T4) es el
**patrón de integración** (ESC/POS + cajón por pulso + terminal semi-integrado
P2PE), que es lo que condiciona el diseño del `hardware-perifericos-pos`.

### F0-T4 / S-03 / S-04 / S-13 — Dayparts, umbral de descuento, % de merma

**Documentado como supuesto DEMO** (valores razonables de la industria QSR,
pendientes de validación por operaciones antes de Fase 3):

- Umbral de autorización de descuento: descuentos ≥15% o cortesías totales
  requieren gerente (ya documentado como S-03 desde Fase 0 descubrimiento).
- Dayparts: franjas configurables (Desayuno/Almuerzo/Tarde/Cena), horario
  exacto pendiente de operaciones (S-04, sin cambios).
- **Nuevo S-13:** umbral de merma = 3% del valor de insumo recibido por
  período de conteo, configurable por `Ubicacion`; sobre ese umbral se emite
  `EventoDeAuditoria` de alerta (alimenta F3-T1).

### F0-T1 / S-05 — Store-and-forward del PSP

**Permanece como bloqueante real, no resoluble por investigación.** No existe
todavía un PSP/procesador contratado con quien confirmar soporte de
*store-and-forward* — esta es una decisión comercial (contrato, tarifas,
integración) que debe tomar el negocio, no una pregunta que se responda con
investigación pública. Se documenta la **recomendación de arquitectura**: al
elegir PSP, dar prioridad a gateways con *store-and-forward* documentado para
EMV (Datacap NETePay como referencia; Elavon Safe-T Link a validar), para que
el pago con tarjeta no se pierda en cortes de internet. Mientras no haya PSP
contratado, la arquitectura asume degradación a efectivo (RNF-02, S-05):
**el efectivo nunca se degrada; la tarjeta sí puede hacerlo** según el PSP que
finalmente se contrate. Este supuesto se revalida obligatoriamente en F2-T4/
F2-T5 antes de ir a producción con pagos reales.

## Consecuencias

**Positivas**
- S-06/S-08 quedan resueltos con fuente primaria citable para el piloto
  (Miami-Dade); el modelo de datos ya soporta lo encontrado (tasa por
  `Ubicacion`, no global) sin necesitar cambios de arquitectura.
- S-02 tiene una recomendación técnica concreta y accionable para
  `hardware-perifericos-pos` en Fase 2, con integración ESC/POS + P2PE ya
  acordada.
- El plan puede avanzar a Fase 1 sin quedar bloqueado por decisiones
  comerciales que no dependen de ingeniería.

**Negativas / riesgo aceptado**
- **S-05 sigue abierto y es de riesgo ALTO.** Ir a producción con pagos reales
  (Fase 2, F2-T4/F2-T5) sin confirmar store-and-forward con el PSP realmente
  contratado es el principal riesgo de continuidad de negocio del proyecto.
  No se debe interpretar el cierre de esta Fase 0 como resolución de S-05.
- Las tasas de TX documentadas son un **techo de referencia (8.25%)**, no la
  tasa real de cada una de las ~30 tiendas; cada apertura en TX necesita su
  propia verificación antes de vender (riesgo bajo si se respeta el proceso,
  alto si se asume 8.25% global sin verificar).
- El hardware recomendado no está comprado ni probado en campo; puede cambiar
  en la selección final de compras sin impacto arquitectónico (el contrato es
  el patrón de integración, no la marca).

## Nota sobre subagentes

Esta sesión de Claude Code se abrió con directorio de trabajo un nivel por
encima de `SistemaPOS/`, por lo que los subagentes nombrados en
`SistemaPOS/.claude/agents/*.md` (incluido `orquestador-pos`) no aparecían
como `agent type` invocable. Se optó, con aprobación del usuario, por que
Claude Code asuma directamente el rol de `orquestador-pos` y delegue en
agentes genéricos (`general-purpose`) instruidos con el contexto de cada
especialista según haga falta, en vez de detener el trabajo para reabrir la
sesión dentro de `SistemaPOS/`.
