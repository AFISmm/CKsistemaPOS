# Chicken Kitchen POS — DEMO funcional (Digenius)

> **AVISO IMPORTANTE — ESTO ES UNA DEMO DE VALIDACION FUNCIONAL, NO PRODUCCION.**
> La arquitectura aprobada (ver `docs/arquitectura.md`, ADR-0001/0002) es **hibrida
> hub-and-spoke** con un **Store Server local por tienda**, PostgreSQL, offline-first
> y fuera de la ruta critica de la nube. Eso **no es compatible con Vercel**
> (serverless, sin estado persistente ni LAN). Para esta demo se autorizo una
> **simplificacion**: una **unica app Next.js** desplegable en Vercel que simula el
> flujo completo (mostrador &rarr; KDS &rarr; cobro &rarr; descuento de inventario)
> usando **estado en memoria** (singleton sobre `globalThis`). Esta desviacion es
> deliberada y temporal; el diseno de produccion sigue siendo el de los ADR.

## Que es esta demo

App unica Next.js (App Router, TypeScript, Tailwind) que corre el flujo POS completo
de Chicken Kitchen con datos reales de marca/menu y datos DEMO de precios, recetas,
impuestos, pagos y hardware.

- Marca y menu reales de https://chickenkitchen.com (categorias CHOP-CHOP BOWLS,
  WRAPITO, SALADS, GRILLED BREAST MEALS, CHEESADILLA, KIDS, SIDES, DESSERTS, DRINKS,
  13 SIGNATURE SAUCES).
- Tienda piloto: Miami, FL (15738 SW 72nd Street).

## Correr localmente

```bash
npm install
npm run build   # verificacion de compilacion
npm run dev     # http://localhost:3000
```

Rutas: `/` (inicio) · `/pos` (cajero) · `/kds` (cocina) · `/reportes` (reportes) ·
`/empleados` (personal) · `/nomina` (reporte de horas) · `/jornada/pantalla` (pantalla
central de la tienda) · `/jornada/marcar` (celular del empleado, chequeo de inicio de
jornada).

## Modulo de Empleados y Reporte de Horas (antes "Nomina")

> **DECISION DE ALCANCE (S-17, 2026-07-22)** — ver `docs/requisitos.md` S-17 y
> `docs/analisis-revision-20260722-modulos-innovacion-seguridad.md`. En la
> llamada de revision del 2026-07-22, dos revisores con experiencia operativa
> real en restaurantes (Diego Cataño y Mateo Franco) senalaron que calcular
> tarifas/pago reales y tener un boton de "pagar" dentro del POS es un riesgo
> financiero/legal real: *"si alguien cambia los valores de tarifa aqui
> podriamos terminar pagando 3-4x mas, el proyecto estaria muerto"* (cita
> directa de un revisor). Ademas, "normalmente la nomina arranca en el ERP",
> nunca en el POS. **Decision: se retira del alcance de produccion el calculo
> real de tarifa/hora, neto a pagar y cualquier boton de "pagar"**; el modulo
> se reduce a un **reporte de referencia de horas trabajadas** (regulares +
> overtime, mas propinas de referencia) pensado para alimentar un sistema de
> nomina/ERP externo. Esta demo ya refleja esa reduccion: la pantalla
> `/nomina` (label del sidebar: "Reporte de Horas" / "Hours Report") ya NO
> muestra bruto/retencion/neto ni tiene ninguna accion de pago; `ReciboDePago`
> (ver `lib/domain/types.ts`) conserva esos 3 campos en el tipo unicamente por
> compatibilidad (siempre en 0, marcados `@deprecated`) para no romper codigo
> existente bajo el plazo ajustado del proyecto.

Dos "sombreros" con responsabilidades separadas (codigo, tipos y comentarios de
cada archivo lo dejan explicito):

- **rrhh-personal-pos**: ciclo de vida del empleado (onboarding, edicion, baja
  logica), turnos/horarios programados y asistencia (reloj checador). Archivos:
  `lib/domain/types.ts` (Empleado, HorarioTurno, Marcaje), `lib/data/rrhh-seed.ts`,
  `lib/rrhh/*`, `app/api/v1/empleados/**`, `app/api/v1/asistencia/**`,
  `components/empleados/*`, `app/empleados/*`.
- **nomina-pos**: genera el reporte de horas a partir de la asistencia (horas
  regulares/extra) y suma propinas de referencia. **Ya NO calcula tarifa,
  retencion fiscal ni neto a pagar** (ver decision de alcance arriba). Archivos:
  `lib/nomina/*`, `app/api/v1/nomina/**`, `components/nomina/api.ts`,
  `app/nomina/*`.

### Que se construyo

- **Empleado**: alta en estado `onboarding` (sin acceso de login todavia) ->
  `completarOnboarding` crea el `Usuario` (PIN + rol + tienda) y pasa a
  `activo` -> `darDeBaja` es una **baja logica** (`inactivo` + motivo; nunca se
  borra el registro, porque nomina/auditoria dependen de el; tambien desactiva
  el `Usuario` de login).
- **HorarioTurno**: turno de trabajo PROGRAMADO de un empleado. Es un concepto
  **distinto** del `Turno` de caja/registradora ya existente (apertura/cierre
  Z): no se reutilizan entre si, para evitar confundir "turno de trabajo" con
  "turno de caja".
- **Marcaje (reloj checador)**: entrada/salida con timestamp, ubicacion,
  `dentroDeGeofence` e `identidadVerificada` (ambos **simulados** desde la UI
  con checkboxes "simular fuera de zona" / "simular fallo de verificacion") y
  `tardanza` (calculada contra el `HorarioTurno` del dia, si existe, con 10 min
  de tolerancia DEMO). Se audita una alerta (`alertaAsistencia`) solo cuando
  hay tardanza, fuera de geofence o identidad no verificada.
- **Reporte de Horas (antes "Nomina")**: `lib/nomina/calculo.ts` empareja
  marcajes entrada/salida (`lib/rrhh/asistencia.ts:emparejarIntervalos`),
  agrupa minutos por semana ISO (lunes-domingo) dentro del periodo pedido,
  separa horas regulares vs. extra (regla DEMO: >40h/semana, estilo FLSA
  federal, igual para FL y TX) y suma propinas del periodo **como dato de
  referencia**. **Ya NO calcula tarifa, retencion ni neto a pagar** (decision
  de alcance S-17, ver arriba). Genera un `ReciboDePago` (reporte de horas)
  por empleado, auditado con el mismo evento historico `nominaGenerada` (se
  conserva el nombre del evento y su valor de auditoria — "se genero un
  reporte de horas, por quien, cuando" — aunque el modulo ya no calcule pago).

### Decision de modelado: como se ligan propinas a un empleado

El `Pedido`/`Pago` existentes **no tienen** un campo "atendido por" a nivel de
linea o pago individual; la unica asociacion disponible en el modelo actual es
`Pago.turnoId -> Turno.usuarioAperturaId` (el cajero que abrio el turno de
caja). Por eso `nomina-pos` calcula propinas como: para el `Usuario` ligado al
`Empleado` (`Empleado.usuarioId`), busca los `Turno` que ese usuario abrio, y
suma `Pago.propina` (estado `aprobado`) de los pagos de esos turnos dentro del
periodo. **Simplificacion DEMO documentada**: en produccion cada `Pago`/linea
deberia registrar directamente que cajero/empleado atendio la venta (no
inferirlo por quien abrio el turno), sobre todo si varios cajeros comparten un
mismo turno de caja.

Dos empleados semilla (`emp-ana-cajero`, `emp-carlos-gerente`) reutilizan a
proposito los `Usuario` demo ya sembrados (`user-cajero-demo`,
`user-gerente-demo`) para que los pagos que genera la demo normal de `/pos`
(que abre turno con esos usuarios) se puedan liquidar de inmediato en
`/nomina` sin pasos adicionales.

### Que es MOCK / DEMO (reemplazar antes de produccion)

| Area | Que es demo | Reemplazar por |
|------|-------------|----------------|
| **Reloj checador** | Marcaje manual desde la UI de `/empleados/[id]`; `dentroDeGeofence`/`identidadVerificada` son checkboxes que SIMULAN el resultado. | Integracion real con el proveedor de time-clock (ej. **XmartClock** u otro): webhook o pull periodico de eventos de marcaje, con geofencing GPS real y verificacion de identidad (ej. reconocimiento facial) del lado del proveedor. Este modulo modela el mismo contrato de datos (empleado, timestamp, ubicacion, flags de alerta) para que el reemplazo sea principalmente de "fuente de los Marcaje", no de modelo. |
| **Calculo de pago (retirado del alcance)** | Esta demo YA NO calcula tarifa/hora, retencion fiscal ni neto a pagar (decision de alcance S-17, ver arriba); `ReciboDePago.brutoCentavos/retencionCentavos/netoCentavos` se mantienen en el tipo pero siempre en 0. | No aplica — esta parte se retira deliberadamente del alcance de produccion del POS. El calculo real de pago (tarifa, retencion W-4/FICA/Medicare, neto) debe hacerse en un sistema de nomina/ERP dedicado, que consuma este reporte de horas como insumo. |
| **Horas extra** | Regla unica ">40h/semana = 1.5x" (estilo FLSA federal), igual para FL y TX. Sigue siendo deuda tecnica de la DEMO como *dato de referencia*, aunque ya no alimente un calculo de pago propio. | Validar reglas estatales/locales aplicables y politica interna de horas extra (ej. doble tiempo en feriados, reglas de descanso) — relevante para el sistema de nomina/ERP externo que reciba este reporte. |
| **Emparejamiento de marcajes** | Se asume que los marcajes de un empleado alternan correctamente entrada/salida (lo valida `registrarMarcaje`); un turno sin marcaje de salida dentro del periodo se descarta del calculo. | Deteccion/alerta de "olvido de marcaje" con reglas de negocio (ej. auto-cierre a las N horas) y correccion manual auditada. |
| **Propinas -> empleado** | Se infiere via `Turno.usuarioAperturaId` (ver decision de modelado arriba). | Registrar el cajero/empleado directamente en `Pago` o `LineaDePedido`. |
| **PIN / auth del empleado** | Mismo hash de demo que el resto del sistema (`demo:<pin>`). | bcrypt/argon2 (S-10, ya documentado). |

## Chequeo de jornada (TOTP + verificacion facial) — etapa 2

Segunda etapa de este proyecto (la primera construyo el shell: sesion demo por PIN,
i18n, modo oscuro, sidebar, notificaciones). Reutiliza el `Marcaje` ya existente de
`rrhh-personal-pos` (le agrega `metodoVerificacion: "facial" | "pinRespaldo" | null`)
y su logica de registro (`lib/rrhh/asistencia.ts:registrarMarcaje`) — no crea una
entidad de marcaje paralela.

**Decision de negocio (ya tomada con el dueno de producto, ver prompt de la etapa)**:
el empleado marca su jornada desde su CELULAR con (1) verificacion facial —
REFORZADA con biometria REAL del dispositivo (Face ID/Touch ID/Windows Hello via
WebAuthn) cuando el navegador la soporta, con los dos botones "Simular
exitosa/fallida" como plan B explicito (dispositivos sin autenticador de
plataforma, o pruebas por curl/testing) —, (2) un codigo TOTP de 6 digitos que se
muestra en una PANTALLA CENTRAL FIJA de la tienda (no en el celular del empleado) —
eso es lo que prueba presencia fisica en la tienda, a diferencia de mostrar el
codigo en el mismo celular.

- **Rutas**: `/jornada/pantalla` (pantalla central/kiosko de la tienda) y
  `/jornada/marcar` (celular del empleado). Ambas estan EXENTAS del guard de sesion
  del shell (`components/shell/AppShell.tsx`, `RUTAS_SIN_GUARD`): la pantalla es
  compartida por toda la tienda (no hay un "usuario" al que pedirle PIN) y el celular
  del empleado normalmente no tiene la sesion PIN de la tienda — la identidad/presencia
  se prueban con el propio flujo facial+TOTP, no con el login del shell. Ninguna se
  agrego al sidebar (`lib/navigation/modulos.ts`): no dependen de sesion/rol.
- **Endpoints**: `GET /api/v1/jornada/codigo?ubicacionId=` (unico autorizado a revelar
  el codigo vigente + segundos restantes), `POST /api/v1/jornada/intento-facial`
  (reporta el resultado de cada intento facial — real via WebAuthn o simulado; fuente
  de verdad del contador de fallos), `GET /api/v1/jornada/bloqueo?empleadoId=`,
  `POST /api/v1/jornada/marcar` (facial + codigo TOTP), `POST /api/v1/jornada/marcar-respaldo`
  (PIN de respaldo), `POST /api/v1/jornada/webauthn/opciones-registro`,
  `POST /api/v1/jornada/webauthn/registrar` y `POST /api/v1/jornada/webauthn/opciones-login`
  (registro/uso de Face ID/Touch ID/Windows Hello real, ver seccion siguiente).
  Codigo: `lib/jornada/*`, `app/api/v1/jornada/**`.

### Que es REAL (algoritmo genuino, no un mock)

- **TOTP (RFC 6238 simplificado)** — `lib/jornada/totp.ts`: HMAC-SHA1 real sobre un
  contador de tiempo (via `crypto.createHmac` de Node, RFC 4226/6238), truncamiento
  dinamico a 6 digitos, periodo de **10 segundos** (requisito de negocio de esta
  demo) y tolerancia de **1 ventana de desfase** (contador actual + el anterior) para
  no ser estricto con la latencia de red. Simplificaciones documentadas frente al
  estandar: el secreto (`Ubicacion.secretoTotp`) es un string UTF-8 usado directo
  como clave HMAC (no Base32/RFC 4648, porque no hace falta interoperar con apps
  autenticadoras externas: se genera y valida en el mismo servidor).
- **Bloqueo por intentos** — `lib/jornada/bloqueo.ts`: 3 fallos faciales consecutivos
  bloquean el metodo facial 5 minutos para ESE empleado (estado en memoria,
  `Db.bloqueosVerificacionFacial`); el PIN de respaldo sigue disponible durante el
  bloqueo. El servidor es la unica fuente de verdad (el conteo del celular es solo
  UX); `POST /api/v1/jornada/marcar-respaldo` verifica que el empleado este
  REALMENTE bloqueado antes de aceptar el PIN, para que no sea un atajo.
- **Gesto biometrico real (WebAuthn)** — `lib/jornada/webauthn.ts`,
  `app/jornada/marcar/page.tsx`: en dispositivos con autenticador de plataforma
  (`PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()`), el boton
  "Usar Face ID / Touch ID de este dispositivo" llama a
  `navigator.credentials.create()`/`.get()` con `authenticatorAttachment: "platform"`
  y `userVerification: "required"`. Eso hace que el SISTEMA OPERATIVO exija el gesto
  biometrico real (Face ID/Touch ID/Windows Hello) antes de que el navegador devuelva
  cualquier credencial — es soporte de plataforma nativo del navegador, no requiere
  SDK ni backend FIDO2 completo. Ademas, el servidor NUNCA recibe ni procesa datos
  biometricos crudos (imagen facial, huella, etc.): el emparejamiento biometrico
  ocurre enteramente en el dispositivo del empleado; el navegador solo le entrega al
  servidor un identificador de credencial opaco.

### Que es MOCK / DEMO (reemplazar antes de produccion)

| Area | Que es demo | Reemplazar por |
|------|-------------|----------------|
| **Verificacion facial** | REFORZADA con biometria real via WebAuthn (ver arriba) cuando el dispositivo lo soporta, pero el SERVIDOR no verifica la firma criptografica de la asercion WebAuthn (`attestationObject`/`authenticatorData`/`clientDataJSON`) ni lleva contador anti-replay: solo confirma que existe una credencial registrada y confia en que el navegador ya exigio el gesto biometrico. Los botones "Simular exitosa/fallida" siguen disponibles como plan B (sin soporte de plataforma, o pruebas por curl/testing). | Libreria de servidor WebAuthn completa (ej. `@simplewebauthn/server`) para verificar la firma contra la clave publica registrada, atestacion y contador anti-replay; permitir multiples credenciales por empleado (multi-dispositivo). |
| **Secreto TOTP** | Fijo, sembrado en `lib/db/store.ts` (`Ubicacion.secretoTotp`), igual para toda la vida de la demo. | Secreto aleatorio fuerte por tienda, aprovisionado/rotado de forma segura (ej. al dar de alta la tablet de la tienda). |
| **Prueba de presencia del PIN de respaldo** | El marcaje por PIN de respaldo (`metodoVerificacion="pinRespaldo"`) NO exige el codigo TOTP, por lo tanto se registra con `dentroDeGeofence=false`: es un gap de presencia fisica conocido y aceptado como trade-off del plan B. | Definir una prueba de presencia alternativa para el plan B (ej. geofencing GPS real) si se necesita mantener la garantia de presencia incluso en el flujo de respaldo. |

> **NOTA DE CUMPLIMIENTO LEGAL (a resolver antes de produccion)**: el reconocimiento
> facial tradicional (SDK que procesa imagenes/plantillas faciales en el servidor)
> implica procesar datos biometricos, que en muchas jurisdicciones (ej. BIPA en
> Illinois, GDPR en la UE, leyes de privacidad de FL/TX en evolucion) exige
> consentimiento explicito, politica de retencion/borrado de datos biometricos y, en
> algunos casos, evaluacion de impacto de privacidad. El refuerzo con WebAuthn de
> esta etapa reduce ese riesgo (el servidor nunca recibe ni almacena datos
> biometricos crudos, solo un identificador de credencial opaco), pero NO lo elimina
> por completo ni sustituye el analisis legal: sigue habiendo temas a resolver antes
> de produccion (ej. si el emparejamiento biometrico "cuenta" como procesamiento de
> datos biometricos bajo BIPA/GDPR aunque ocurra solo en el dispositivo, consentimiento
> informado, que pasa si el empleado no tiene o no quiere usar biometria de
> plataforma). Antes de depender de esto en produccion hay que resolver ese marco
> legal con el equipo de cumplimiento/legal, igual que se documento para el PSP
> (ADR-0005) y el hardware.

## Chatbot de ayuda — etapa 3

Tercera y ultima etapa de este proyecto (la 1 construyo el shell, la 2 el
chequeo de jornada TOTP + verificacion facial). Widget flotante de chat
disponible en toda la app, con entrada/salida por texto o por voz.

- **Montaje**: `components/shell/ChatbotWidget.tsx`, montado desde
  `components/shell/AppShell.tsx` como hermano del contenedor
  Sidebar+Topbar+`<main>` (justo antes del cierre del componente), NO dentro
  de `<main>`. Por vivir en la rama de "sesion activa" de `AppShell`, queda
  **excluido automaticamente** de `/login`, `/jornada/pantalla` (pantalla
  kiosko de la tienda, sin distracciones a proposito) y `/jornada/marcar`
  (flujo enfocado de un solo paso desde el celular del empleado) — esas tres
  rutas retornan antes de llegar al punto de montaje del widget, asi que no
  hace falta mantener una lista de exclusion aparte.
- **Motor de respuestas**: `lib/chatbot/respuestas.ts`, funcion
  `responder(mensajeUsuario, idioma)`. Es un motor de **REGLAS/PALABRAS
  CLAVE** (matching de substrings normalizados sin acentos/mayusculas), NO un
  LLM real. Cubre: reembolso, marcar producto agotado (86), abrir/cerrar
  turno de caja, registrar jornada (entrada/salida), alta de empleado,
  generar nomina, cambiar idioma, cambiar modo oscuro, y reportes (extra). Si
  no reconoce la pregunta, responde con un mensaje generico sugiriendo otra
  palabra clave o consultar el manual. El matching de palabras clave es
  bilingue (ES/EN mezclado en cada intencion): el usuario puede escribir en
  cualquiera de los dos idiomas, pero la respuesta siempre sale en el idioma
  activo de la app (`useI18n().idioma`), como pide el requisito de negocio.
- **Voz — 100% del navegador (`lib/chatbot/voz.ts`), SIN backend ni claves de
  API de voz**:
  - **Entrada (STT)**: `SpeechRecognition` / `webkitSpeechRecognition`
    (soportado en Chrome/Edge). El boton de microfono transcribe en vivo
    (resultados intermedios en el input) y, al confirmarse la transcripcion
    final, la envia directo al motor de respuestas (no hace falta presionar
    "Enviar" aparte). Si el navegador no soporta STT, el boton de microfono
    simplemente no se muestra y aparece un aviso claro debajo del input
    (`chatbot.sttNoSoportado`) — la app no se rompe.
  - **Salida (TTS)**: `window.speechSynthesis` + `SpeechSynthesisUtterance`,
    con `utterance.lang` seteado segun el idioma activo (`es-ES`/`en-US`). El
    bot lee su respuesta en voz alta solo cuando el modo de respuesta activo
    es "Audio" (toggle Texto/Audio en la cabecera del panel). Si el navegador
    no soporta TTS, el toggle de modo "Audio" se deshabilita (con tooltip
    explicando por que) y el chat sigue funcionando en modo texto.
  - `SpeechRecognition` no esta en el `lib.dom.d.ts` estandar de TypeScript
    (a diferencia de `SpeechSynthesisUtterance`, que si lo esta), por eso
    `lib/chatbot/voz.ts` declara tipos minimos propios (`declare global`) en
    vez de agregar una dependencia de tipos de terceros solo para esta demo.
- **"Pensando"**: la demora antes de la respuesta es un `setTimeout` corto
  (450-800ms) simulado en el cliente; no hay ninguna llamada de red detras.
- **Sin backend propio**: toda la logica (reglas + voz) corre en el cliente;
  no se creo ningun endpoint `/api/v1/chatbot` porque no hace falta estado
  compartido entre pestañas/dispositivos para una demo de FAQ con motor de
  reglas. Si en el futuro el "cerebro" pasa a ser un LLM real, ahi si haria
  falta un endpoint de servidor (para no exponer la API key del proveedor en
  el cliente).

### Que es REAL vs. MOCK en el chatbot

| Area | Que es real | Que es mock/DEMO | Reemplazar por |
|------|-------------|-------------------|-----------------|
| Entrada de voz (STT) | SI — Web Speech API real del navegador (`SpeechRecognition`), corre 100% local | — | Nada que reemplazar; seguiria siendo client-side. Opcionalmente evaluar un STT de servidor si se necesita soporte en navegadores que no implementan la API (ej. Firefox). |
| Salida de voz (TTS) | SI — Web Speech API real del navegador (`speechSynthesis`) | — | Igual que STT: seguiria siendo client-side; opcionalmente voces mas naturales via un servicio de TTS si la calidad de la voz del sistema operativo no es suficiente. |
| "Cerebro" de las respuestas | NO | Motor de reglas/palabras clave (`lib/chatbot/respuestas.ts`), catalogo fijo de intenciones, sin comprension de lenguaje natural real | Llamada real a un LLM (ej. **Claude via Anthropic API**) con contexto del sistema POS (manual, permisos del usuario, historial de conversacion), servida desde un endpoint de backend para no exponer la API key en el cliente. |
| Demora de "pensando" | NO | `setTimeout` fijo simulado, sin llamada de red | Latencia real de la llamada al LLM. |
| Escalamiento a humano | NO (fuera de alcance de esta demo) | — | Flujo de handoff a un agente humano si el motor de reglas/LLM no puede resolver la consulta. |

## Mocks y datos DEMO — REEMPLAZAR ANTES DE PRODUCCION

| Area | Que es demo | Reemplazar por |
|------|-------------|----------------|
| **Persistencia** | Estado en memoria (`lib/db/store.ts`, globalThis). Se reinicia en cold starts de Vercel. | Store Server local + PostgreSQL (ADR-0002/0004). |
| **PSP / tarjeta** | PSP mock en memoria (`lib/payments/`) que simula autorizacion EMV y modo offline store-and-forward. | Integracion semi-integrada/P2PE con PSP real (ADR-0005). |
| **Hardware** | Impresora, cajon, lector EMV, escaner = stubs que loguean a consola (`lib/hardware/`). | Drivers ESC/POS reales, SDK EMV, etc. |
| **Impuestos** | Tasas DEMO: FL 7% (Miami-Dade), TX 8.25%. | Tasas confirmadas por finanzas (S-06/S-08). |
| **Precios y recetas** | DEMO razonables tipo fast-casual (el sitio no publica precios/recetas). | Precios y recetas oficiales de Chicken Kitchen. |
| **IDs** | `Pedido.id`/`Pago.id`/etc. los sigue asignando el SERVIDOR en UUID v4 (`lib/db/store.ts` `uid()`; su migracion a v7 es F1-T5, tarea de `devops-despliegue-pos`/`backend-ventas-pos`). El CLIENTE (F1-T3) ya genera UUID v7 (`lib/offline/uuidv7.ts`) para el id de cada entrada de la cola offline y para una `idempotencyKey` que viaja (ignorada hoy) en el body/header `Idempotency-Key` de "crear pedido" y "registrar pago" — preparacion adelantada para cuando el Store Server empiece a exigirla. | UUID v7 ordenable end-to-end (C-ID), servidor incluido. |
| **Eventos en vivo** | Polling HTTP (KDS/CFD). | Bus WebSocket/NATS en LAN (ADR-0003). |
| **Offline del terminal de cajero (F1-T3)** | Service Worker (`public/sw.js`, cache-primero + revalidacion del app shell) + IndexedDB (`lib/offline/db.ts`: `catalogoCache` y `colaEscritura`) + drenado automatico al reconectar (`lib/offline/autoDrenado.ts`, `queue.ts`). Cubre: catalogo disponible sin red (fallback a cache), y escrituras del cajero (agregar linea, descuento, enviar a cocina, cobrar) que se encolan y reproducen en orden si la red falla a mitad de turno. NO cubre: iniciar un pedido totalmente nuevo con cero red desde el primer instante (el backend DEMO asigna `Pedido.id`/numero de orden en el servidor; no hay reconciliacion de un id temporal todavia — ver limitacion documentada abajo). | Store Server local (ADR-0002) con outbox/inbox real, ids v7 aceptados end-to-end y reconciliacion de pedidos creados 100% offline (F1-T5). |
| **PIN / auth** | Hash de demo (`demo:1234`). | bcrypt/argon2 (S-10). |
| **SSN (auto-registro de empleado en /login)** | Mismo principio C-PCI que `Pago` (solo token + ultimos4, nunca PAN/CVV) y que la verificacion facial (nunca biometria real): el formulario de auto-registro SOLO captura/envia/almacena `Empleado.ssnUltimos4` (ultimos 4 digitos), enmascarado ya en el cliente y revalidado server-side (`lib/auth/registro.ts`) para rechazar cualquier valor que no sean EXACTAMENTE 4 digitos. El SSN completo NUNCA viaja al servidor ni se guarda en ningun lado — necesario porque esta demo se despliega publicamente en internet (Vercel) sin autenticacion real de servidor. | Un dato real de SSN completo en produccion requeriria cifrado en reposo, control de acceso estricto (least privilege) y cumplimiento normativo (ej. cifrado a nivel de campo, tokenizacion via un proveedor especializado, auditoria de acceso); aqui se opta por minimizar el dato desde el origen en vez de resolver ese cumplimiento en la demo. |

## Disposicion de archivos (contrato de integracion)

```
/app                      rutas Next (UI + API)
  /pos                    UI cajero              [frontend-mostrador-kiosco-pos]
  /kds                    UI cocina              [kds-cocina-pos]
  /reportes               UI reportes            [reportes-analitica-pos, fase 3]
  /empleados              UI personal/asistencia [rrhh-personal-pos]
  /nomina                 UI nomina              [nomina-pos]
  /jornada/pantalla       UI pantalla central    [rrhh-personal-pos, etapa 2]
  /jornada/marcar         UI celular empleado    [rrhh-personal-pos, etapa 2]
  /api/v1/...             route handlers REST    (ver dueno por recurso)
/lib
  /domain/types.ts        contrato de tipos      [orquestador]  (no editar firmas)
  /db/store.ts            almacen en memoria     [orquestador]  (no redefinir colecciones)
  /data/catalog-real.ts   semilla de catalogo REAL (usada por store.ts), importada
                          de Recetario_Simplificado.xlsx via scripts/importar-
                          recetario.js — ver ese script para el detalle    [menu-inventario-pos]
  /data/catalog.ts        semilla DEMO original (fabricada) — ya NO se usa desde
                          store.ts, queda solo como referencia/fallback   [menu-inventario-pos]
  /data/rrhh-seed.ts      semilla de personal    [rrhh-personal-pos]
  /inventory/*            logica de inventario   [menu-inventario-pos]
  /sales/*                motor de ticket/total  [backend-ventas-pos]
  /payments/*             PSP mock + pagos       [pagos-pos]
  /kitchen/*              estado de cocina       [kds-cocina-pos]
  /rrhh/*                 empleados + asistencia [rrhh-personal-pos]
  /nomina/*               calculo de nomina      [nomina-pos]
  /jornada/*              TOTP + bloqueo facial  [rrhh-personal-pos, etapa 2]
  /chatbot/*              reglas + voz del chat  [shell de UI, etapa 3]
  /hardware/*             stubs de perifericos   [hardware-perifericos-pos, fase 3]
  /offline/*              F1-T3: IndexedDB (catalogoCache/colaEscritura), cola de
                          escritura + drenado, uuidv7(), hook de estado de sync
                          para la UI                [frontend-mostrador-kiosco-pos]
/components/shell/ChatbotWidget.tsx  widget flotante de chat [shell de UI, etapa 3]
/public/cropped-Logo.webp logo real de marca
/public/sw.js             F1-T3: Service Worker (cache del app shell del terminal
                          de cajero; NO cachea /api/**, ver comentario de cabecera)
                                                     [frontend-mostrador-kiosco-pos]
```

Reglas: dinero en **centavos enteros**; nombres del modelo en espanol (C-NOMBRES);
`backend-ventas` es el **unico** que calcula total/impuesto/saldo; `nomina-pos` es el
**unico** que calcula pago/retencion de personal.

### F1-T3 — Terminal de cajero offline-first (Service Worker + IndexedDB)

Resiliencia agregada de forma incremental sobre el terminal existente
(`app/pos/*`, `components/pos/*`), sin rediseño visual:

- **Service Worker** (`public/sw.js`, registrado desde `lib/offline/registrarServiceWorker.ts`,
  llamado por el hook `lib/offline/useEstadoSync.ts` que ya montan `app/pos/page.tsx` y
  `app/pos/nuevo/page.tsx`): cachea el app shell (paginas, bundles JS/CSS con hash,
  imagenes) con estrategia cache-primero + revalidacion en segundo plano.
  Deliberadamente **NO** intercepta `/api/**` (incluido el catalogo): esa cache vive en
  IndexedDB con mas control (ver siguiente punto) — una sola fuente de verdad para el
  catalogo offline, en vez de dos caches independientes que podrian desincronizarse.
- **IndexedDB** (`lib/offline/db.ts`, API nativa, sin dependencias nuevas — cae a un
  almacen en memoria fuera del navegador, lo que ademas hace testeable la logica sin un
  shim de IndexedDB): almacen `catalogoCache` (ultimo `/api/v1/catalogo` bueno + timestamp,
  usado como fallback por `components/pos/api.ts` `obtenerCatalogo()` cuando la red
  falla) y almacen `colaEscritura` (`{ id uuid v7, metodo, url, cuerpo, creadoEn, intentos }`).
- **Cola de escritura** (`lib/offline/queue.ts`): `components/pos/api.ts` encola
  automaticamente cualquier escritura (POST/PATCH/DELETE — agregar linea, actualizar
  linea, descuento, enviar a cocina, registrar pago) que falle por error de red, en vez
  de perderla; el cajero ve un error distinguible ("ENCOLADO_SIN_CONEXION" /
  `api.encoladoSinConexion`) y un indicador sutil "sin conexion, N pendientes de
  sincronizar" (mismo badge dorado que ya existia para `pos.sinConexion`, ahora
  alimentado por `useEstadoSync()`), pero puede seguir operando otros pedidos: la
  escritura no se pierde.
- **Drenado automatico** (`lib/offline/autoDrenado.ts`): al evento `online` (con un
  temporizador periodico de respaldo, ya que `online` no es 100% confiable) reproduce la
  cola **en el orden original** (el propio id uuid v7 es ordenable por tiempo) contra la
  API real; cada entrada se retira SOLO tras una respuesta 2xx real; un **409** se trata
  como "ya aplicado" (se retira sin reintentar y sin duplicar); cualquier otro fallo
  DETIENE el drenado en esa entrada (no se salta la siguiente, para no romper el orden
  causal, ej. una linea depende de que el pedido ya exista) y se reintenta en el proximo
  ciclo.
- **UUID v7 del lado cliente** (`lib/offline/uuidv7.ts`, RFC 9562, monotonic dentro del
  proceso, sin dependencias nuevas): usado hoy para (a) el id de cada entrada de
  `colaEscritura`, y (b) una `idempotencyKey` que `crearPedido()`/`registrarPago()` en
  `components/pos/api.ts` ya envian (body + header `Idempotency-Key`) en cada creacion de
  pedido/pago.

**Limitacion conocida (deviacion documentada):** `Pedido.id`/`Pago.id` los sigue
asignando el SERVIDOR (`lib/db/store.ts` `uid()`, todavia v4) — las rutas actuales de
`app/api/v1/pedidos` y `/pagos` no leen ningun id que mande el cliente, solo la
`idempotencyKey` nueva (que hoy se ignora). Por eso la cola offline resuelve muy bien el
caso de mayor valor (un corte de LAN A MITAD de un turno, con el pedido ya creado en el
servidor mientras habia red: agregar lineas, descuento, enviar a cocina y cobrar siguen
funcionando y se sincronizan solos), pero **no** cubre iniciar un pedido enteramente
nuevo con cero conectividad desde el primer instante (no hay todavia un mecanismo de
reconciliacion de un id temporal de pedido generado en el cliente contra el id real que
asigne el servidor al reconectar). Cerrar ese caso requiere que el Store Server (F1-T1,
tarea paralela en `store-server/`) acepte/honre ids v7 generados por el cliente de forma
idempotente (F1-T5) — fuera del alcance de F1-T3 tal como esta delimitado en
`PLAN_DE_PRODUCCION.md`.

**Pruebas** (`npm test`, Vitest — ver "Runner de pruebas" mas abajo):
`lib/offline/__tests__/uuidv7.test.ts` (formato/version/variante v7, unicidad en rafaga,
orden por tiempo) y `lib/offline/__tests__/queue.test.ts` (encolar tras fetch fallido,
drenado en orden, un fallo detiene el drenado sin saltar escrituras, 409 tratado como
ya-aplicado sin duplicar), mas `components/pos/__tests__/api.test.ts` (integracion real
contra `components/pos/api.ts`: agregarLinea/registrarPago encolan al fallar la red,
lecturas GET nunca se encolan, y `obtenerCatalogo()` cae al cache de IndexedDB sin red).

### Runner de pruebas (nuevo)

El repo no tenia un test runner configurado. Se agrego **Vitest** (`npm test` /
`npm run test:watch`, config en `vitest.config.ts`) por integrar con Next.js 14 +
TypeScript sin configuracion adicional. `lib/sales/__tests__/**` y
`lib/kitchen/kds.test.ts` (de otros duenos: `backend-ventas-pos` / `kds-cocina-pos`) usan
`node:test`, no Vitest, y quedan excluidos del `include` de Vitest a proposito: mezclarlos
hace que Vitest reporte un falso "No test suite found" en esos archivos aunque sus
aserciones si corran (confirmado corriendo `npx vitest run` antes de excluirlos). Si esos
modulos migran a Vitest en su propia tarea, la exclusion se puede quitar sin tocar nada de
F1-T3.
