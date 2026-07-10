# ADR-0001 — Arquitectura híbrida hub-and-spoke (nube central + nodo local por tienda)

- **Estado:** Aceptado
- **Fecha:** 2026-07-10
- **Autor:** `arquitecto-pos`
- **Relacionados:** ADR-0002 (offline), ADR-0004 (fuente de verdad)
- **Requisitos:** RNF-01, RNF-02, RNF-06, S-01, S-08

## Contexto

Chicken Kitchen es un QSR de ~30 tiendas (FL/TX) que debe seguir vendiendo aunque
se caiga el internet (RNF-02) y responder con fluidez en hora pico (RNF-01). El MVP
se despliega en una tienda piloto (S-01), pero el diseño debe escalar a multi-tienda
y multi-estado sin retrabajo mayor (S-08). Necesitamos decidir dónde vive la lógica
y los datos: en la nube, en la tienda, o híbrido.

## Opciones consideradas

1. **Solo nube (SaaS puro, terminales delgadas).** Toda venta pega a la nube.
   - Contra: cualquier corte de internet detiene la venta → viola RNF-02. Latencia
     de red en hora pico → riesgo para RNF-01. Descartada.
2. **Solo local (por tienda, sin nube).** Cada tienda aislada.
   - Contra: sin respaldo central, sin consolidación multi-tienda, escalado manual y
     frágil. No cumple el objetivo estratégico de multi-tienda (S-08). Descartada.
3. **Híbrida hub-and-spoke (elegida).** Nodo local por tienda con la fuente de verdad
   operativa + nube central para respaldo, consolidación y config corporativa.

## Decisión

Adoptar **arquitectura híbrida hub-and-spoke**:

- **Spoke = Store Server por tienda:** contiene la fuente de verdad operativa y
  expone la API que consumen las terminales (cajero, KDS, CFD) por LAN local. Todo
  el camino crítico de venta ocurre aquí, sin depender de internet.
- **Hub = nube central:** respaldo, consolidación de ventas por `ubicacionId`,
  reportes corporativos y catálogo/precios maestros (futuro). **Nunca está en el
  camino crítico de venta.**
- La comunicación tienda↔nube es asíncrona, tolerante a cortes y por mTLS.

## Consecuencias

**Positivas**
- Cumple offline-first (RNF-02) y velocidad en hora pico (RNF-01) por diseño.
- Escala a N tiendas replicando el Store Server; la nube ya consolida por ubicación.
- La caída de la nube no detiene la operación (RNF-06).

**Negativas / trade-offs**
- El Store Server es un **punto único de fallo local** en el MVP (mitigación:
  hardware confiable, respaldo local, arranque rápido; futuro activo/pasivo).
- Mayor complejidad operativa: hay que desplegar y monitorear nodos por tienda
  (dependencia de `devops-despliegue-pos`).
- Sincronización eventual: requiere disciplina de idempotencia y conflictos
  (ver ADR-0002).
