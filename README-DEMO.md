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
`/empleados` (personal) · `/nomina` (nomina).

## Modulo de Empleados y Nomina

Dos "sombreros" con responsabilidades separadas (codigo, tipos y comentarios de
cada archivo lo dejan explicito):

- **rrhh-personal-pos**: ciclo de vida del empleado (onboarding, edicion, baja
  logica), turnos/horarios programados y asistencia (reloj checador). Archivos:
  `lib/domain/types.ts` (Empleado, HorarioTurno, Marcaje), `lib/data/rrhh-seed.ts`,
  `lib/rrhh/*`, `app/api/v1/empleados/**`, `app/api/v1/asistencia/**`,
  `components/empleados/*`, `app/empleados/*`.
- **nomina-pos**: calculo de nomina a partir de la asistencia (horas
  regulares/extra), propinas, retencion fiscal DEMO y recibos de pago.
  Archivos: `lib/nomina/*`, `app/api/v1/nomina/**`, `components/nomina/api.ts`,
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
- **Nomina**: `lib/nomina/calculo.ts` empareja marcajes entrada/salida
  (`lib/rrhh/asistencia.ts:emparejarIntervalos`), agrupa minutos por semana
  ISO (lunes-domingo) dentro del periodo pedido, separa horas regulares vs.
  extra (regla DEMO: >40h/semana, estilo FLSA federal, igual para FL y TX),
  suma propinas del periodo y aplica una retencion DEMO. Genera un
  `ReciboDePago` por empleado (auditado con evento `nominaGenerada`).

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
| **Retencion fiscal** | 10% "federal" fijo y ficticio sobre el bruto (propinas no se retienen en esta demo). FL/TX sin impuesto estatal a ingreso personal (eso si es real). | Tabla de retencion federal real (W-4, brackets), reglas de FICA/Medicare, y confirmacion legal/contable de como se retienen propinas reportadas. |
| **Horas extra** | Regla unica ">40h/semana = 1.5x" (estilo FLSA federal), igual para FL y TX. | Validar reglas estatales/locales aplicables y politica interna de horas extra (ej. doble tiempo en feriados, reglas de descanso). |
| **Emparejamiento de marcajes** | Se asume que los marcajes de un empleado alternan correctamente entrada/salida (lo valida `registrarMarcaje`); un turno sin marcaje de salida dentro del periodo se descarta del calculo. | Deteccion/alerta de "olvido de marcaje" con reglas de negocio (ej. auto-cierre a las N horas) y correccion manual auditada. |
| **Propinas -> empleado** | Se infiere via `Turno.usuarioAperturaId` (ver decision de modelado arriba). | Registrar el cajero/empleado directamente en `Pago` o `LineaDePedido`. |
| **PIN / auth del empleado** | Mismo hash de demo que el resto del sistema (`demo:<pin>`). | bcrypt/argon2 (S-10, ya documentado). |

## Mocks y datos DEMO — REEMPLAZAR ANTES DE PRODUCCION

| Area | Que es demo | Reemplazar por |
|------|-------------|----------------|
| **Persistencia** | Estado en memoria (`lib/db/store.ts`, globalThis). Se reinicia en cold starts de Vercel. | Store Server local + PostgreSQL (ADR-0002/0004). |
| **PSP / tarjeta** | PSP mock en memoria (`lib/payments/`) que simula autorizacion EMV y modo offline store-and-forward. | Integracion semi-integrada/P2PE con PSP real (ADR-0005). |
| **Hardware** | Impresora, cajon, lector EMV, escaner = stubs que loguean a consola (`lib/hardware/`). | Drivers ESC/POS reales, SDK EMV, etc. |
| **Impuestos** | Tasas DEMO: FL 7% (Miami-Dade), TX 8.25%. | Tasas confirmadas por finanzas (S-06/S-08). |
| **Precios y recetas** | DEMO razonables tipo fast-casual (el sitio no publica precios/recetas). | Precios y recetas oficiales de Chicken Kitchen. |
| **IDs** | UUID v4 (`crypto.randomUUID`). | UUID v7 ordenable (C-ID). |
| **Eventos en vivo** | Polling HTTP (KDS/CFD). | Bus WebSocket/NATS en LAN (ADR-0003). |
| **PIN / auth** | Hash de demo (`demo:1234`). | bcrypt/argon2 (S-10). |

## Disposicion de archivos (contrato de integracion)

```
/app                      rutas Next (UI + API)
  /pos                    UI cajero              [frontend-mostrador-kiosco-pos]
  /kds                    UI cocina              [kds-cocina-pos]
  /reportes               UI reportes            [reportes-analitica-pos, fase 3]
  /empleados              UI personal/asistencia [rrhh-personal-pos]
  /nomina                 UI nomina              [nomina-pos]
  /api/v1/...             route handlers REST    (ver dueno por recurso)
/lib
  /domain/types.ts        contrato de tipos      [orquestador]  (no editar firmas)
  /db/store.ts            almacen en memoria     [orquestador]  (no redefinir colecciones)
  /data/catalog.ts        semilla de catalogo    [menu-inventario-pos]
  /data/rrhh-seed.ts      semilla de personal    [rrhh-personal-pos]
  /inventory/*            logica de inventario   [menu-inventario-pos]
  /sales/*                motor de ticket/total  [backend-ventas-pos]
  /payments/*             PSP mock + pagos       [pagos-pos]
  /kitchen/*              estado de cocina       [kds-cocina-pos]
  /rrhh/*                 empleados + asistencia [rrhh-personal-pos]
  /nomina/*               calculo de nomina      [nomina-pos]
  /hardware/*             stubs de perifericos   [hardware-perifericos-pos, fase 3]
/public/cropped-Logo.webp logo real de marca
```

Reglas: dinero en **centavos enteros**; nombres del modelo en espanol (C-NOMBRES);
`backend-ventas` es el **unico** que calcula total/impuesto/saldo; `nomina-pos` es el
**unico** que calcula pago/retencion de personal.
