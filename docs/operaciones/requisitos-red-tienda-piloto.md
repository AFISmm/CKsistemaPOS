# Requisitos de red — tienda piloto (Miami, FL)

- **Para:** quien instale/configure la red de la tienda piloto antes de F4-T1
  (`PLAN_DE_PRODUCCION.md` Fase 4, "Despliegue en la tienda piloto").
- **Fase del proyecto:** F3-T2, Fase 3 (Contingencia operativa).
- **Fecha:** 2026-07-19.
- **Estado:** Recomendación técnica, **no es una orden de compra**. Igual
  criterio de honestidad que `docs/adr/0006-cierre-fase0-bloqueantes-produccion.md`
  §F0-T3 (hardware de impresora/EMV): las marcas/modelos citados son
  referencias de la industria, pendientes de validación y aprobación de
  compras/IT antes de instalar.

---

## 1. Qué NO es este documento

Este NO es un manual de instalación paso a paso ni una cotización. Es la
especificación funcional mínima para que quien compre/instale el equipo de
red sepa exactamente qué necesita el Store Server y por qué, y para que el
`ConectividadService` del backend (F3-T2, ver `store-server/README.md` §18)
tenga una red sobre la cual monitorear con sentido.

## 2. Por qué esto es una decisión de hardware de red, no de software de aplicación

`docs/arquitectura.md` §2.2 documenta que, si cae internet/nube, "la tienda
sigue 100% operativa... solo se difiere la sincronización" — el Store Server
no necesita saber por qué canal llega a internet ni participar en la lógica
de conmutación. Un **router/gateway dual-WAN o con failover LTE** se instala
delante del uplink de internet de la tienda y es completamente transparente
para el Store Server: desde el punto de vista del software, "hay internet" o
"no hay internet" es la única pregunta relevante, sin importar si la
respuesta viene por el enlace primario (cable/fibra) o por el secundario
(4G/LTE). Por eso el software de este proyecto (F3-T2) no implementa ningún
mecanismo de "failover" — eso lo resuelve el hardware de red descrito abajo.

## 3. Topología recomendada

```
Internet primario (cable/fibra del ISP local)  ─┐
                                                  ├─→ Router dual-WAN / failover LTE  ─→ Switch LAN de la tienda ─→ Store Server + terminales + KDS + impresora + terminal EMV
Internet secundario (modem 4G/LTE, ISP distinto) ─┘
```

- **Dos enlaces de internet independientes**, de proveedores/tecnologías
  DISTINTOS cuando sea posible (ej. cable + LTE de un operador celular
  distinto al de telefonía fija del local) — un solo proveedor con dos
  "conexiones" que comparten la misma infraestructura física no protege
  contra el escenario más común de corte (falla del ISP/última milla).
- El **router de failover** detecta la caída del enlace primario y conmuta al
  secundario automáticamente, sin intervención humana y sin que el Store
  Server necesite reconfigurarse. La velocidad de conmutación (segundos a
  ~1 minuto según el equipo) es aceptable: el `ConectividadService` (ver
  sección 5) ya está diseñado con un **debounce de confirmación** para no
  generar una alerta prematura durante ese breve corte real de conmutación.

## 4. Recomendación de equipo (referencia de industria, pendiente de validar con compras/IT)

Mismo criterio de honestidad que ADR-0006 §F0-T3: esto es una recomendación
técnica basada en productos ampliamente citados en el sector retail/QSR para
este caso de uso, **no una decisión de compra cerrada**.

| Rol | Ejemplos citados en la industria (a validar) | Por qué se menciona |
|---|---|---|
| Router dual-WAN / failover LTE | Peplink Balance/MAX (series SMB), Cradlepoint (series E1xx/E3xx) | Ambos son referencias comunes en documentación de retail/QSR para failover WAN con conmutación automática y modem LTE integrado o vía USB; requieren validación de cobertura celular real en la ubicación de Miami-Dade antes de comprar. |
| Plan de datos LTE del enlace secundario | Plan de datos móvil de un operador (a definir por compras) | Debe ser un plan con suficiente margen de datos para cubrir la operación completa de la tienda durante un corte prolongado del enlace primario, no solo "monitoreo" — durante un failover real, TODO el tráfico de internet de la tienda (incluida la sincronización a la nube) pasa por este enlace. |
| Switch LAN | Switch gestionable o no gestionable estándar, según lo que ya tenga instalado el local | No es una decisión crítica para esta tarea: la LAN interna de la tienda (terminales ↔ Store Server) NO depende de que haya internet (arquitectura.md §2.2). |

**Costo directional:** fuera de alcance de este documento (depende del router
elegido y del plan LTE); solicitar cotización a compras junto con el resto
del hardware de F0-T3/F2-T4 (impresora, cajón, terminal EMV).

## 5. Qué necesita el Store Server específicamente

| Requisito | Detalle | Por qué |
|---|---|---|
| **IP LAN fija o reserva DHCP** | El Store Server debe tener siempre la misma dirección IP dentro de la LAN de la tienda (ya sea IP estática configurada en el equipo, o una reserva DHCP en el router/switch por su MAC address). | Los terminales de cajero, el KDS y la pantalla de cliente (CFD) se conectan al Store Server por IP/hostname dentro de la LAN (`docs/arquitectura.md` §2, HTTP + WebSocket); si la IP cambiara de forma impredecible, todos los clientes perderían la conexión hasta reconfigurarse manualmente. |
| **Puertos abiertos hacia los terminales (LAN interna, no hacia internet)** | Puerto HTTP/WebSocket del Store Server (`PORT` en `store-server/.env`, default **3001**) accesible desde toda la LAN de la tienda (terminales de cajero, KDS, CFD). | Es el puerto donde corre la API local y el bus de eventos WebSocket (`EventosGateway`, Socket.IO) — `store-server/README.md` §4 y §8. |
| **Puerto de impresora ESC/POS** | Si la impresora es de red (no USB): puerto TCP **9100** (RAW/JetDirect, default de facto en impresoras térmicas Epson/Star) alcanzable desde el Store Server hacia la IP de la impresora. | `store-server/README.md` §16 (`IMPRESORA_HOST`/`IMPRESORA_PUERTO`), ADR-0006 §F0-T3. |
| **Salida HTTPS/mTLS hacia la nube** | Puerto **443** saliente desde el Store Server hacia el endpoint de sincronización (`CLOUD_SYNC_URL`), sin bloqueo de firewall/proxy que intercepte el certificado cliente mTLS. | `docs/arquitectura.md` §6.4/§7.3: "mTLS obligatorio en ambos sentidos" para el agente de sincronización (F1-T5, `src/sync/`). Si un proxy corporativo hiciera SSL-inspection sobre este tráfico, rompería el handshake mTLS — debe configurarse una excepción si el router/firewall de la tienda tuviera esa función activada. |
| **Salida HTTPS hacia los hosts de verificación de conectividad** | Puerto 443 saliente sin restricciones hacia los hosts configurados en `CONECTIVIDAD_HOSTS` (default: Google/Cloudflare/Microsoft — ver `store-server/README.md` §18.2). | El `ConectividadService` (F3-T2) verifica reachability contra estos hosts para detectar degradación de internet; si un firewall los bloqueara selectivamente, el monitoreo reportaría falsos "sin conexión". Deliberadamente son hosts públicos genéricos, no la nube propia de Chicken Kitchen, para que el monitoreo no dependa de que la nube corporativa esté arriba. |
| **No requiere IP pública ni puertos entrantes desde internet** | El Store Server nunca debe ser accesible directamente desde internet (solo tráfico saliente hacia la nube de sincronización). | Reduce superficie de ataque; coherente con que "la nube nunca está en el camino crítico de venta" (`docs/arquitectura.md` §4.1). |

## 6. Cómo encaja el monitoreo de conectividad (F3-T2) en este diseño de red

El `ConectividadService` del Store Server (`store-server/src/conectividad/`,
ver `store-server/README.md` §18) verifica cada ~20 segundos (configurable)
si hay salida real a internet, mediante peticiones HTTP livianas a un puñado
de hosts públicos configurables. Esto es **complementario** al router de
failover, no un reemplazo:

- El **router de failover** resuelve el problema de raíz (mantener la salida
  a internet viva cambiando de enlace).
- El **`ConectividadService`** resuelve el problema de **visibilidad**: le
  avisa al gerente de tienda (vía `GET /api/v1/conectividad/estado` y el bus
  WebSocket, para un futuro banner en pantalla) que efectivamente hubo un
  corte y cuánto duró — incluso si el router conmutó exitosamente al enlace
  LTE y la tienda "nunca notó" el corte desde el punto de vista de la venta.
  Esto es valioso para: (a) que operaciones pueda ver cuántas veces y por
  cuánto tiempo se usó el enlace de respaldo (posible indicador de que el
  enlace primario tiene un problema recurrente que amerita una llamada al
  ISP), y (b) que un gerente sepa, durante un corte real de AMBOS enlaces (el
  peor caso), cuánto tiempo lleva sin internet.
- Un dato práctico para la instalación: si el router de failover conmuta en
  menos tiempo del que tarda `ConectividadService` en CONFIRMAR una
  transición (debounce de `CONFIRMACIONES_REQUERIDAS` ciclos, default 2 × 20s
  = ~40s), es posible que una conmutación exitosa y rápida ni siquiera
  aparezca como "sin conexión" en el historial — es el comportamiento
  esperado y deseable (un failover que funciona bien no debería generar
  alertas). Si operaciones quisiera ver también las conmutaciones rápidas y
  exitosas, se puede bajar `CONECTIVIDAD_INTERVALO_MS`/`CONECTIVIDAD_CONFIRMACIONES_REQUERIDAS`
  (ver `store-server/.env.example`), a costa de más sensibilidad a falsos
  positivos.

## 7. Checklist para quien instale la red de la tienda piloto

- [ ] Enlace primario de internet contratado e instalado (cable/fibra).
- [ ] Enlace secundario (LTE) contratado, con cobertura celular verificada
      **en la ubicación física exacta** de la tienda piloto (Miami-Dade) antes
      de comprar el equipo — la cobertura LTE varía por zona.
- [ ] Router dual-WAN/failover instalado y probado: desconectar manualmente
      el enlace primario y confirmar que el secundario toma la carga sin
      intervención manual.
- [ ] Store Server con IP LAN fija o reserva DHCP configurada.
- [ ] Puerto del Store Server (`PORT`, default 3001) accesible desde todos los
      terminales de la LAN de la tienda (cajero, KDS, CFD).
- [ ] Si la impresora es de red: puerto 9100 accesible desde el Store Server.
- [ ] Salida HTTPS/mTLS (puerto 443) desde el Store Server hacia
      `CLOUD_SYNC_URL` sin interceptación de certificado.
- [ ] Salida HTTPS (puerto 443) sin restricciones hacia los hosts de
      `CONECTIVIDAD_HOSTS` (o hacia los hosts que finalmente se configuren).
- [ ] Confirmar con `GET /api/v1/conectividad/estado` (una vez el Store Server
      esté desplegado) que el estado inicial es `en_linea` antes de abrir la
      tienda al público.

## 8. Qué NO cubre este documento (fuera de alcance de F3-T2)

- Cotización/compra real del equipo (pendiente de aprobación de
  compras/operaciones, igual que el hardware de F0-T3/F2-T4).
- Configuración detallada del router específico elegido (depende de la marca
  final, fuera de alcance de una tarea de software).
- El `Store Server secundario activo/pasivo` (mitigación del punto único de
  fallo LOCAL, es decir que el propio equipo del Store Server falle) es
  **F3-T3**, una tarea distinta — este documento cubre la conectividad a
  internet, no la redundancia del servidor de tienda en sí.
