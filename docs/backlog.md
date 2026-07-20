# Backlog — POS Chicken Kitchen (Digenius)

Estado del proyecto por fases. Actualizado por `orquestador-pos`.

Leyenda de estado: `PENDIENTE` · `EN CURSO` · `LISTO` · `BLOQUEADO` · `POSTERGADO`

> **DESVIACION AUTORIZADA (DEMO):** Por pedido del dueno de producto se construye una
> DEMO funcional end-to-end desplegable en Vercel: una **unica app Next.js** con estado
> en memoria y mocks de PSP/hardware. Esto NO reemplaza la arquitectura aprobada
> (ADR-0001/0002, hub-and-spoke + Store Server local). Ver `README-DEMO.md`.

## Fase 0 — Descubrimiento
| Tarea | Dueño | Entregable | Estado |
|-------|-------|------------|--------|
| Alcance MVP, historias de usuario y supuestos | analista-requisitos-pos | docs/requisitos.md | LISTO |

## Fase 0 (Producción) — Bloqueantes de PLAN_DE_PRODUCCION.md
> Ver `PLAN_DE_PRODUCCION.md` (nuevo, raíz del repo) y `docs/adr/0006-cierre-fase0-bloqueantes-produccion.md`.
| Tarea | Dueño | Entregable | Estado |
|-------|-------|------------|--------|
| F0-T1 — Confirmar store-and-forward del PSP real | pagos-pos | docs/requisitos.md (S-05) | **BLOQUEADO** — no hay PSP contratado; recomendación técnica documentada (Datacap NETePay), decisión comercial pendiente del negocio |
| F0-T2 — Tasas fiscales oficiales FL/TX | arquitecto-pos + finanzas | docs/requisitos.md (S-06/S-08), ADR-0006 | LISTO — Miami-Dade 7% confirmado con fuente FL DOR; TX 8.25% como techo, verificar por ciudad antes de cada apertura |
| F0-T3 — Selección de hardware/periféricos | hardware-perifericos-pos | docs/requisitos.md (S-02), ADR-0006 | LISTO (recomendación técnica) — compra final pendiente de aprobación de compras |
| F0-T4 — Dayparts, umbral de descuento, % de merma | analista-requisitos-pos | docs/requisitos.md (S-03/S-04/S-13) | LISTO (supuesto DEMO documentado, pendiente de validar con operaciones antes de Fase 3) |

> **DoD de Fase 0 (producción):** cumplido salvo F0-T1, que por naturaleza depende
> de un contrato comercial con un PSP todavía no elegido — no es resoluble por
> investigación ni bloquea el inicio de Fase 1 (el riesgo aplica a Fase 2,
> F2-T4/F2-T5, cuando se integre el pago real). Avance a Fase 1 autorizado.

## Fase 1 — Arquitectura
| Tarea | Dueño | Entregable | Estado |
|-------|-------|------------|--------|
| Arquitectura técnica + ADRs iniciales | arquitecto-pos | docs/arquitectura.md, docs/adr/0001-0005.md | LISTO |

## Fase 1 (Producción) — Fundación de producción (PLAN_DE_PRODUCCION.md §Fase 1)
> Ver `PLAN_DE_PRODUCCION.md` (raíz del repo), `docs/adr/0007-fase1-store-server-nestjs-postgres.md`.
| Tarea | Dueño | Entregable | Estado |
|-------|-------|------------|--------|
| F1-T1 — Store Server (NestJS) API local por dominio | arquitecto-pos + backend-ventas-pos | `store-server/src/{catalogo,inventario,ventas,pagos,seguridad,common}` | LISTO — build (`nest build`) y `npm run test:unit` (12/12) verificados por el orquestador; contrato REST/nombres cotejado contra `docs/arquitectura.md` §5/§6 |
| F1-T2 — PostgreSQL local + event log append-only | backend-ventas-pos | `store-server/prisma/schema.prisma` (19 entidades + `EventoDominio` outbox-ready), `prisma/seed.ts` | LISTO (esquema/migraciones); **integración contra Postgres real sin verificar** — este entorno de trabajo no tiene Docker/Postgres disponible. Pendiente correr `test/integration/*` con Postgres real antes de cerrar el Gate de Fase 1 |
| F1-T4 — Bus de eventos WebSocket (reemplaza polling) | kds-cocina-pos + backend-ventas-pos | `store-server/src/common/eventos/*` (Socket.IO, envelope `{id,tipo,ubicacionId,ocurridoEn,version,payload}`) | LISTO (implementado); latencia real ≤2s (RNF-01) no medida en este entorno (requiere backend corriendo + cliente real) |
| F1-T5 — Agente de sincronización outbox/inbox + UUID v7 + mTLS | devops-despliegue-pos + backend-ventas-pos | `store-server/src/sync/*` (SyncService outbox, InboxService LWW por version, mTLS con fallback dev, mock-cloud de test) | LISTO — build + `npm run test:unit` (27/27, incluye 3 suites nuevas) verificados por el orquestador; integración contra Postgres real sin ejecutar (mismo gap de entorno que F1-T2) |
| F1-T6 — RBAC real + PIN hash + auditoría inmutable | seguridad-accesos-pos | `store-server/src/seguridad/*` | LISTO — guard RBAC con test unitario (401/403/200), PIN con bcrypt, `EventoDeAuditoria` sin update/delete expuesto |
| F1-T3 — Terminales PWA offline: Service Worker + IndexedDB (caché de catálogo + cola de escritura) | frontend-mostrador-kiosco-pos | `public/sw.js`, `lib/offline/*` (db.ts, queue.ts, autoDrenado.ts, useEstadoSync.ts, uuidv7.ts, registrarServiceWorker.ts), `components/pos/api.ts`, `app/pos/page.tsx`, `app/pos/nuevo/page.tsx`, `vitest.config.ts` + pruebas en `lib/offline/__tests__/*` y `components/pos/__tests__/api.test.ts` | LISTO — ver detalle y limitación conocida (creación de pedido 100% offline desde cero) en `README-DEMO.md` § F1-T3 |

> **Gate de pruebas de Fase 1 — estado real (no dar por cerrado sin lo pendiente):**
> Todo el código de F1-T1..F1-T6 está implementado y verificado a nivel de build +
> tests unitarios (39 tests unitarios total entre `store-server` y `lib/offline`,
> todos corridos y en verde por el orquestador, no solo reportados por los agentes).
> Lo que **falta verificar en vivo**, porque este entorno de trabajo confirmadamente
> no tiene Docker ni PostgreSQL instalados (se comprobó con `which docker`/`which psql`,
> ambos ausentes):
> 1. Los tests de integración (`store-server/test/integration/*`, incluye
>    reintento idempotente de `POST /pedidos`, reembolso revierte stock, y el
>    ciclo de sync outbox/inbox contra el mock-cloud) — escritos y compilando,
>    **nunca ejecutados contra Postgres real**.
> 2. Latencia real del bus WebSocket (objetivo ≤2s, RNF-01) con el backend y un
>    cliente corriendo de verdad.
> 3. Corte de LAN/internet real (no solo simulado en tests) con el flujo
>    completo cajero→Store Server→KDS.
>
> **Acción requerida antes de considerar la Fase 1 cerrada de verdad:** correr
> `docker compose -f store-server/docker-compose.test.yml up -d` (o un Postgres
> real) + `npm run test:integration` en una máquina/CI con Docker disponible, y
> levantar el Store Server + un cliente real para medir latencia WS y probar
> cortes de LAN/internet en vivo. Esto no es un problema de código pendiente;
> es una verificación que este entorno de trabajo no puede ejecutar.

## Fase 2 (Producción) — Negocio + hardware (PLAN_DE_PRODUCCION.md §Fase 2)
> Ver `PLAN_DE_PRODUCCION.md` (raíz del repo). F2-T1/T2/T3 construidos y verificados
> (build + unit tests) por el orquestador en `store-server/`. F2-T4/T5 dependen de
> hardware/PSP real que todavía no existe (ver S-02/S-05, ADR-0006) — se documentan
> como adaptadores/interfaces, no como integración real.
| Tarea | Dueño | Entregable | Estado |
|-------|-------|------------|--------|
| F2-T1 — Costeo por combinación (BOM por variante) | menu-inventario-pos | `store-server/src/costeo/*`, `Insumo.costoUnitario`, `RecetaModificador`, `GET /pedidos/:id/costeo` | LISTO — verificado por el orquestador (incluido en los 71/71 unit tests); integración sin ejecutar (gap de entorno) |
| F2-T2 — Hold & fire (retener/marchar) | menu-inventario-pos + kds-cocina-pos | `store-server/src/ventas/*` (`retenerLinea`/`liberarLinea`/`liberarLineasRetenidas`), `LineaDePedido.retenida` | LISTO — verificado (unit tests); integración sin ejecutar (gap de entorno) |
| F2-T3 — Reportes del día completos (ventas, mix, arqueo, daypart) | reportes-analitica-pos | `store-server/src/reportes/*` (reemplaza el endpoint básico de Fase 1) | LISTO — verificado; corrigió de paso un bug real (arqueo no restaba reembolsos en efectivo); integración sin ejecutar (gap de entorno) |
| F2-T4 — Periféricos reales (ESC/POS, cajón, EMV P2PE) | hardware-perifericos-pos + pagos-pos | `store-server/src/hardware/*` (`ImpresoraAdapter`, `EscPosImpresoraAdapter`, `SimuladorImpresoraAdapter`), extensión aditiva de `PspAdapter` (`cancelarTransaccionPendiente`) | LISTO (código de protocolo ESC/POS real, bytes verificados contra la especificación pública) — verificado por el orquestador: build limpio, 102/102 unit tests. **Limitación permanente, no pendiente de código:** el transporte TCP nunca corrió contra una impresora física ni hay PSP real contratado; se valida en el piloto (F4-T1). El agente original falló a mitad de escribir la documentación (error de stream) — el orquestador revisó el código en disco, confirmó que compilaba y pasaba tests, y completó `store-server/README.md` §16 |
| F2-T5 — Fiscalidad real FL/TX + pagos productivos | backend-ventas-pos + pagos-pos | — | PARCIAL — `ReglaDeImpuesto` por ubicación ya soporta FL/TX (S-06/S-08 resuelto con fuente oficial en Fase 0); integración de PSP real sigue bloqueada por S-05 (sin contrato comercial) |

> **Nota honesta sobre F2-T4/F2-T5:** a diferencia de F2-T1/T2/T3, estas dos tareas
> NO son resolubles solo con más ingeniería en este entorno — dependen de una
> decisión comercial (PSP contratado) y una compra real (impresora/cajón/terminal
> EMV) que todavía no existen (ver ADR-0006). Lo máximo responsable que se puede
> construir ahora es la capa de adaptador/interfaz para que integrarlos después sea
> un cambio acotado, no un rediseño — ver siguiente entrega.

## Fase 3 (Producción) — Robustez y contingencia (PLAN_DE_PRODUCCION.md §Fase 3)
> Ver `PLAN_DE_PRODUCCION.md` (raíz del repo), `docs/adr/0008-store-server-secundario-activo-pasivo.md`.
> F3-T1/F3-T2 se desarrollaron en paralelo en este mismo sandbox; F3-T3 se resolvió
> a nivel de diseño (ADR), no de código — ver justificación en el ADR.
| Tarea | Dueño | Entregable | Estado |
|-------|-------|------------|--------|
| F3-T1 — Bajas con aprobación de calidad + alerta de merma (S-13) | menu-inventario-pos + seguridad-accesos-pos | `store-server/src/bajas/*` (`SolicitudBaja`, flujo solicitar→aprobar/rechazar, no toca `Stock` hasta aprobar), `Ubicacion.umbralMermaPorcentaje`, `TipoEventoAuditoria.alertaMerma`, `store-server/README.md` §17 | LISTO — verificado por el orquestador: build limpio, 19 suites/151 unit tests; integración escrita y compilando, sin ejecutar (gap de entorno, mismo de siempre). Supuesto documentado: "período de conteo" (S-13) = ventana móvil de 30 días, configurable por `INVENTARIO_PERIODO_MERMA_DIAS` |
| F3-T2 — Contingencia operativa: monitoreo de conectividad + guía de gerente + requisitos de red | devops-despliegue-pos | `store-server/src/conectividad/*` (`ConectividadService`, evento `ConectividadCambiada`, `GET /api/v1/conectividad/estado`), `docs/operaciones/guia-contingencia-gerente.md`, `docs/operaciones/requisitos-red-tienda-piloto.md`, `store-server/README.md` §18 | LISTO (monitoreo de software) — build + `npm run test:unit` (19 suites/151 tests) verificados; integración (`test/integration/conectividad.integration.spec.ts`) escrita y compilando, sin ejecutar contra Postgres real (mismo gap de entorno que el resto del repo). El "failover a 4G/LTE" en sí es hardware de red (no software de este backend, ver §18.1 y la spec de red); queda documentado como especificación pendiente de compras/IT antes de F4-T1, no como código pendiente |
| F3-T3 — Store Server secundario activo/pasivo (opcional) | devops-despliegue-pos | `docs/adr/0008-store-server-secundario-activo-pasivo.md` | DISEÑADO, NO IMPLEMENTADO — deliberado: requiere al menos dos instancias reales de PostgreSQL para validar streaming replication honestamente, y este entorno no tiene Postgres/Docker. Tarea marcada opcional en el plan; no bloquea nada posterior. Decisión de diseño: failover asistido por el gerente (no automático) para evitar riesgo de split-brain |

> **Verificación consolidada de Fase 3 (build único, todo el trabajo concurrente integrado):**
> `store-server`: `npm run build` limpio, `npm run test:unit` → **19 suites, 151/151
> tests**, `git status` confirma que ningún agente tocó código fuera de su alcance
> declarado. Sin colisiones de esquema Prisma entre F3-T1 y F3-T2 (F3-T2 no tocó
> `schema.prisma`, decisión deliberada del agente para evitar el riesgo).

## Fase 1.5 — Andamiaje DEMO (orquestador)
| Tarea | Dueño | Entregable | Estado |
|-------|-------|------------|--------|
| Scaffold Next.js + contrato de tipos + almacen en memoria + stubs | orquestador-pos | package.json, lib/domain/types.ts, lib/db/store.ts, stubs, README-DEMO.md | LISTO |

## Fase 2 — Núcleo DEMO (paralelo) — LISTA (build + smoke test E2E OK)
| Tarea | Dueño | Entregable | Estado |
|-------|-------|------------|--------|
| Catálogo real + precios/recetas DEMO + inventario + 86 | menu-inventario-pos | lib/data/catalog.ts, lib/inventory/*, app/api/v1/catalogo, /productos/[id]/86, /stock | LISTO |
| Motor de ticket/total/impuesto/descuento/reembolso + cola offline | backend-ventas-pos | lib/sales/*, app/api/v1/pedidos/*, /turnos/* | LISTO |
| PSP mock (tarjeta/efectivo/split/propina/store-and-forward) | pagos-pos | lib/payments/*, app/api/v1/pagos/* | LISTO |
| Pantalla de cocina (KDS) recibido→preparando→listo | kds-cocina-pos | app/kds/*, lib/kitchen/* | LISTO |
| UI de cajero end-to-end + logo real + ticket | frontend-mostrador-kiosco-pos | app/pos/*, components/pos/*, public/cropped-Logo.webp | LISTO |
| Placeholder de reportes (evita enlace roto) | orquestador-pos | app/reportes/page.tsx | LISTO |

> Verificación: `npm install` OK; `npm run build` PASA (7 páginas + rutas API, sin
> errores de TS). Smoke test E2E en runtime OK: catálogo (9 cat / 31 prod) → pedido →
> línea con impuesto → enviar cocina → cola KDS → avanzar estado → cobro efectivo
> (cobrado) → tarjeta offline (encolado) → tarjeta rechazada (rechazado).

## Fase 3 — Refuerzo
| Tarea | Dueño | Entregable | Estado |
|-------|-------|------------|--------|
| Reportes básicos del día (ventas, mix, arqueo) — completar placeholder | reportes-analitica-pos | app/reportes/* | PENDIENTE |
| Roles, permisos, auditoría, PCI, fiscal | seguridad-accesos-pos | — | PENDIENTE |
| Stubs de periféricos (impresora, cajón, EMV) | hardware-perifericos-pos | lib/hardware/* | PENDIENTE |
| (Fuera de MVP) Integraciones de canales/lealtad | integraciones-canales-pos | — | POSTERGADO |
| Módulo de Empleados: onboarding, turnos/horarios, asistencia (reloj checador demo tipo XmartClock) | rrhh-personal-pos | lib/domain/types.ts (Empleado/HorarioTurno/Marcaje), lib/data/rrhh-seed.ts, lib/rrhh/*, app/api/v1/empleados/**, app/api/v1/asistencia/**, app/empleados/*, components/empleados/* | LISTO |
| Nómina básica: horas regulares/extra, propinas, retención DEMO, recibos de pago | nomina-pos | lib/nomina/*, app/api/v1/nomina/**, app/nomina/*, components/nomina/api.ts | LISTO |
| Chequeo de inicio de jornada (etapa 2): TOTP real (RFC 6238) + verificación facial simulada + bloqueo por intentos + PIN de respaldo | rrhh-personal-pos | lib/domain/types.ts (Ubicacion.secretoTotp, Marcaje.metodoVerificacion, EstadoVerificacionFacial), lib/jornada/*, app/api/v1/jornada/**, app/jornada/pantalla, app/jornada/marcar, components/jornada/api.ts | LISTO |
| Chatbot de ayuda (etapa 3): widget flotante texto/audio, motor de reglas bilingüe ES/EN, STT/TTS 100% navegador (Web Speech API) | shell de UI | lib/chatbot/respuestas.ts, lib/chatbot/voz.ts, components/shell/ChatbotWidget.tsx, components/shell/AppShell.tsx, lib/i18n/en.json, lib/i18n/es.json | LISTO |

## Fase 4 — Cierre
| Tarea | Dueño | Entregable | Estado |
|-------|-------|------------|--------|
| Plan y casos de prueba | qa-pruebas-pos | smoke test E2E ejecutado | EN CURSO |
| Verificación de build + despliegue Vercel | devops-despliegue-pos | build OK; falta push/deploy | EN CURSO |

## Deudas / arreglos menores detectados (no bloquean la demo)
- `POST /api/v1/pagos` devuelve 201 también para pagos rechazados/encolados (revisar semántica HTTP).
- `pagos` reembolso no invoca `engine.reembolsar` (reversa a nivel Pedido/stock queda como integración futura).
- `enviarACocina` no registra evento `TicketEnviadoACocina` (falta el valor en enum `TipoEventoAuditoria`).
- Handler de pagos captura `ErrorPago` pero no `ErrorDominio` → error de dominio caería a 500.
- Nómina liga propinas al empleado vía `Turno.usuarioAperturaId` (quién abrió el turno de caja),
  no vía un campo "atendido por" en `Pago`/`LineaDePedido` (no existe en el modelo actual). Si
  varios cajeros comparten un mismo turno de caja, las propinas se atribuyen todas a quien lo
  abrió — ver decisión de modelado en `README-DEMO.md`. Antes de producción, agregar el vínculo
  directo pago↔empleado.
- `emparejarIntervalos` (lib/rrhh/asistencia.ts) descarta un marcaje "entrada" sin "salida"
  correspondiente dentro del período (turno abierto/olvido de marcaje): no se paga ese tiempo ni
  se alerta. Falta una regla de negocio de auto-cierre/alerta de "olvido de marcaje".
- `/api/v1/roles` y `/api/v1/ubicaciones` son endpoints nuevos, mínimos, agregados solo para
  poblar selectores en la UI de `/empleados`; no tienen dueño de dominio claro todavía (candidatos
  a `seguridad-accesos-pos` cuando exista RBAC real).
- Retención de nómina se calcula solo sobre el salario bruto, no sobre las propinas (simplificación
  DEMO explícita; en la práctica las propinas también son ingreso gravable).
- El marcaje por PIN de respaldo (`metodoVerificacion="pinRespaldo"`, chequeo de jornada etapa 2) no
  exige el código TOTP de la pantalla central, por lo que se registra con `dentroDeGeofence=false`:
  no hay prueba de presencia física en ese camino (gap aceptado como trade-off del plan B). Antes de
  producción, evaluar si el plan B necesita una prueba de presencia alternativa (ej. geofencing GPS).
- El secreto TOTP por tienda (`Ubicacion.secretoTotp`) es un valor fijo sembrado en `lib/db/store.ts`,
  igual durante toda la vida de la demo, y se usa directo como clave HMAC (sin codificación Base32).
  Antes de producción: secretos aleatorios fuertes, aprovisionados/rotados de forma segura por tienda.
- `POST /api/v1/jornada/intento-facial` no tiene límite de tasa (rate limit) ni protección contra un
  cliente que reintente indefinidamente fuera del flujo de UI normal; el bloqueo de 5 minutos mitiga
  el impacto pero no evita el spam de requests en sí.
- La pantalla `/jornada/pantalla` resuelve la ubicación tomando "la primera tienda activa" del backend
  (no hay aprovisionamiento por tablet/dispositivo); en multi-tienda real cada tablet debería tener su
  `ubicacionId` fijo de fábrica.
- Chatbot de ayuda (etapa 3): el reconocimiento de voz (`SpeechRecognition`/`webkitSpeechRecognition`)
  solo tiene soporte real en navegadores basados en Chromium (Chrome, Edge); en Firefox y Safari
  desktop el botón de micrófono queda oculto (se detecta feature-support en runtime, no hay polyfill).
  El texto-a-voz (`speechSynthesis`) tiene soporte más amplio pero la calidad/disponibilidad de voces
  `es-ES`/`en-US` depende del sistema operativo del dispositivo, no de la app.
- El historial de la conversación del chatbot vive solo en memoria del componente (se pierde al cerrar
  el panel/recargar la página); no hay persistencia ni sincronización entre pestañas/dispositivos.
  Aceptable para una demo de FAQ; si se reemplaza el motor por un LLM real convendría persistir el
  hilo de conversación (por sesión de usuario) para dar contexto a las siguientes preguntas.
- El motor de reglas del chatbot (`lib/chatbot/respuestas.ts`) hace matching por substring simple sobre
  un catálogo fijo de intenciones; no entiende sinónimos fuera de la lista, negaciones ni preguntas
  compuestas complejas. Es el trade-off esperado de un mock sin LLM real (ver README-DEMO.md).

## Notas de demo (reemplazar antes de producción)
- Persistencia en memoria (`lib/db/store.ts`), PSP mock, hardware stub, tasas de
  impuesto DEMO (FL 7% / TX 8.25%), precios/recetas DEMO, IDs UUID v4, polling en vez
  de WebSocket. Detalle en `README-DEMO.md`.
- Módulo de Empleados/Nómina: reloj checador sin integración real (marcaje manual desde la UI;
  geofencing e identidad son checkboxes simulados, modelo inspirado en XmartClock), retención
  fiscal 10% federal ficticia, regla de horas extra simplificada (>40h/semana, sin reglas
  estatales). Detalle completo en `README-DEMO.md`, sección "Módulo de Empleados y Nómina".
- Chequeo de inicio de jornada (etapa 2): verificación facial 100% SIMULADA (sin biometría real;
  nota de cumplimiento legal pendiente antes de producción). El algoritmo TOTP (RFC 6238, HMAC-SHA1
  vía `crypto.createHmac`) y el bloqueo por 3 intentos fallidos SÍ son lógica real, no simulada.
  Detalle completo en `README-DEMO.md`, sección "Chequeo de jornada (TOTP + verificación facial)".
- Chatbot de ayuda (etapa 3): el "cerebro" de las respuestas es un motor de reglas/palabras clave
  (`lib/chatbot/respuestas.ts`), NO un LLM real — se reemplazaría por una llamada real a un LLM
  (ej. Claude vía Anthropic API) antes de producción. La entrada/salida de voz (STT/TTS) SÍ son las
  Web Speech APIs reales del navegador, 100% cliente, sin backend ni claves de API de voz. Detalle
  completo en `README-DEMO.md`, sección "Chatbot de ayuda".

## Preguntas abiertas (heredadas, para versión productiva)
- S-05: store-and-forward del PSP real. S-06/S-08: tasas e impuestos oficiales.
  S-02: drivers de periféricos.
- Empleados/Nómina: qué proveedor real de reloj checador se integrará (XmartClock u otro), tasas
  de retención fiscal reales y reglas de horas extra por estado a confirmar con nómina/legal.
- Chequeo de jornada: qué SDK de reconocimiento facial real se integrará y cómo se resuelve el marco
  de cumplimiento de datos biométricos (consentimiento, retención/borrado, evaluación de impacto de
  privacidad) antes de reemplazar la simulación — a confirmar con legal/cumplimiento.
- Chatbot de ayuda: qué proveedor de LLM se usará en producción (ej. Claude vía Anthropic API) y con
  qué contexto del sistema (manual, permisos del usuario) se alimentará; si el alcance eventualmente
  crece más allá de "respuestas automáticas" (ej. escalamiento a un agente humano), a confirmar con
  producto/soporte.
