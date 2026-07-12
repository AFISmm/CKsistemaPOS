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

## Fase 1 — Arquitectura
| Tarea | Dueño | Entregable | Estado |
|-------|-------|------------|--------|
| Arquitectura técnica + ADRs iniciales | arquitecto-pos | docs/arquitectura.md, docs/adr/0001-0005.md | LISTO |

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
