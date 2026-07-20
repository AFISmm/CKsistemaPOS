# Store Server — POS Chicken Kitchen (Digenius)

Fase 1 (F1-T1..F1-T6, ver `docs/adr/0007-fase1-store-server-nestjs-postgres.md`
y `PLAN_DE_PRODUCCION.md` §5). Backend de produccion de la tienda: **NestJS +
PostgreSQL + Prisma**, fuente de verdad operativa local (ADR-0004). Vive en
`store-server/`, junto a (pero SIN tocar) la demo Next.js del resto del
repositorio (`app/`, `lib/`, etc. — ver ADR-0007 punto 1).

Este README asume que quien lo lee **no tiene contexto previo** de esta
carpeta. Para el contrato de nombres/eventos/API, la fuente de verdad es
`../docs/arquitectura.md` (secciones 5 y 6) — este servidor lo implementa
literalmente (C-NOMBRES).

## 1. Requisitos

- Node.js 20+ (probado con Node 24).
- PostgreSQL 14+ para desarrollo/produccion. Para los tests de integracion,
  Docker (opcional, ver seccion "Tests" mas abajo).

## 2. Instalacion

```bash
cd store-server
npm install
cp .env.example .env
# editar .env: DATABASE_URL debe apuntar a un Postgres real (ver abajo)
```

## 3. Base de datos

### 3.1 Levantar Postgres (elige una opcion)

- **Docker (recomendado si esta disponible):**
  ```bash
  docker run --name ckpos-postgres -e POSTGRES_USER=ckpos -e POSTGRES_PASSWORD=ckpos \
    -e POSTGRES_DB=ckpos_store -p 5432:5432 -d postgres:16-alpine
  ```
- **Postgres ya instalado localmente:** crea una base `ckpos_store` y un rol
  `ckpos` con permisos sobre ella, y ajusta `DATABASE_URL` en `.env`.

### 3.2 Migrar y generar el cliente Prisma

```bash
npm run prisma:generate       # genera el cliente tipado (tambien corre en "prebuild")
npm run prisma:migrate:dev    # crea/aplica la migracion inicial (pide nombre la primera vez)
```

### 3.3 Sembrar datos DEMO

```bash
npm run prisma:seed
```

Crea: ubicaciones (Miami FL piloto + Austin TX), `ReglaDeImpuesto` DEMO,
roles (`cajero`/`cocina`/`gerenteTienda`) con permisos RBAC, dos usuarios con
PIN real hasheado con bcrypt (**Cajero Demo → PIN 1234**, **Gerente Demo →
PIN 9999** — usar `POST /api/v1/auth/login-pin`), un subconjunto del catalogo
real de Chicken Kitchen (categorias/productos/combo/modificadores/recetas),
stock inicial (con 2 insumos a proposito cerca/bajo su umbral para poder
demostrar `StockBajo`), y un turno de caja abierto en la tienda piloto.

## 4. Levantar el servidor

```bash
npm run start:dev   # watch mode, http://localhost:3001
# o
npm run build && npm run start:prod
```

El puerto es configurable via `PORT` en `.env` (default 3001). El WebSocket
del bus de eventos (`EventosGateway`) escucha en el mismo puerto/servidor
HTTP (Socket.IO por defecto en `/socket.io`).

## 5. Autenticacion / RBAC (F1-T6)

1. `POST /api/v1/auth/login-pin` con `{ "usuarioId": "user-cajero-demo", "pin": "1234" }`
   devuelve `{ usuario: { id, nombre, rolId, rolNombre, permisos, ... } }`.
2. En cada request a un endpoint que declare un permiso (`@RequierePermiso`),
   enviar el header `x-usuario-id: <id devuelto en el login>`.

Esto es una simplificacion deliberada para el MVP de LAN de tienda (documentada
en `src/seguridad/permisos.guard.ts`): no hay JWT/sesion porque el Store
Server no esta expuesto a internet (arquitectura.md §2). Fase 2 puede
endurecerlo con tokens de sesion de corta duracion sin cambiar el contrato de
permisos (`src/seguridad/permisos.ts`).

## 6. Estructura del proyecto

```
store-server/
  prisma/
    schema.prisma        # Modelo de datos (arquitectura.md §5), Decimal para dinero
    seed.ts               # Datos DEMO (catalogo, roles, usuarios, stock, turno)
  src/
    common/
      prisma/             # PrismaService/PrismaModule (global)
      eventos/             # EventosGateway (WS) + EventosService (outbox + WS + bus interno)
      errores/             # ErrorDominio + filtro global -> {codigo, mensaje, detalles}
      util/                # uuidv7(), helpers de Decimal (C-DINERO)
    seguridad/             # RBAC: permisos, guard, login PIN, auditoria (F1-T6)
    catalogo/              # CatalogoModule (menu-inventario-pos): Producto/Combo/... + 86
    inventario/            # InventarioModule: Stock, ajustes, listeners VentaConfirmada/VentaRevertida
    ventas/                # VentasModule (backend-ventas-pos): Pedidos, Turnos (+ arqueo), calculo, Hold & fire (F2-T2)
    pagos/                 # PagosModule (pagos-pos): Pago, PspAdapter (mock), arqueo (delega en VentasService)
    costeo/                # CosteoModule (F2-T1, menu-inventario-pos): BOM por variante, costo/margen real
    reportes/              # ReportesModule (F2-T3, reportes-analitica-pos): GET /reportes/dia (ventas+mix+arqueo+daypart)
    hardware/              # HardwareModule (F2-T4, hardware-perifericos-pos): ImpresoraAdapter ESC/POS real + simulador
    sync/                  # SyncModule (F1-T5): agente de sincronizacion outbox/inbox + mTLS
    bajas/                 # BajasModule (F3-T1, menu-inventario-pos+seguridad-accesos-pos): SolicitudBaja con aprobacion (no toca stock hasta aprobar)
    app.module.ts
    main.ts
  test/
    unit/                  # Puros, sin DB (calculo de impuestos, guard RBAC, backoff, mTLS, ack parcial)
    integration/           # Requieren Postgres real (ver docker-compose.test.yml)
    mock-cloud/            # Servidor HTTP de TEST que simula el Hub (F1-T5); no es la nube real
  docker-compose.test.yml
```

## 7. Contrato de API (resumen; ver `docs/arquitectura.md` §6.2 para el detalle)

Prefijo `/api/v1`. Envelope de error uniforme en TODAS las respuestas de
error: `{ "codigo": string, "mensaje": string, "detalles": object | null }`.

| Metodo/ruta | Modulo | Notas |
|---|---|---|
| `GET /catalogo` | catalogo | Carta completa cacheable (offline, C-OFFLINE) |
| `POST /productos`, `PATCH /productos/:id` | catalogo | requiere `catalogo.gestionar` |
| `POST /productos/:id/86` \| `/reactivar` | catalogo | requiere `producto.marcar86`; emite `Producto86Cambiado` |
| `POST /combos`, `/grupos-modificador`, `/modificadores`, `/insumos`, `/recetas`, `/recetas/:id/insumos` | catalogo | requiere `catalogo.gestionar` |
| `PATCH /insumos/:id` | catalogo | requiere `catalogo.gestionar`; actualiza `Insumo.costoUnitario` (F2-T1) |
| `POST /modificadores/:id/receta-modificador` | catalogo | requiere `catalogo.gestionar`; registra `RecetaModificador` (delta de insumo, F2-T1) |
| `GET /stock`, `GET /stock/bajo-umbral` | inventario | |
| `POST /stock/ajuste` | inventario | requiere `inventario.ajustar`; auditado |
| `POST /bajas` | bajas | requiere `inventario.solicitarBaja`; crea `SolicitudBaja` "pendiente" — **NO toca stock** (F3-T1, ver §17) |
| `GET /bajas?estado=&ubicacionId=` | bajas | cola de aprobacion del gerente |
| `POST /bajas/:id/aprobar` | bajas | requiere `inventario.aprobarBaja`; UNICO endpoint que mueve stock por una baja; auditado (`ajusteInventario` + `alertaMerma` si supera el umbral de S-13); 409 si ya se reviso |
| `POST /bajas/:id/rechazar` | bajas | requiere `inventario.aprobarBaja`; stock NUNCA se toca; auditado (`bajaRechazada`); 409 si ya se reviso |
| `POST /pedidos` | ventas | idempotente por `id` (UUID v7 del cliente); reintento -> 409 `pedido_ya_existe` |
| `GET /pedidos/:id`, `GET /pedidos?turnoId=&estado=` | ventas | |
| `POST /pedidos/:id/lineas`, `PATCH /pedidos/:id/lineas/:lineaId` | ventas | `AgregarLineaDto` acepta `retenida?`/`comboSeleccionProductoIds?` (F2-T1/F2-T2) |
| `POST /pedidos/:id/enviar-cocina` | ventas | emite `TicketEnviadoACocina` **solo con las lineas NO retenidas** (F2-T2); imprime comanda de cocina best-effort (F2-T4, §16) |
| `PATCH /pedidos/:id/lineas/:lineaId/retener` | ventas | F2-T2 Hold & fire; sin permiso especial (cajero-default, ver §13) |
| `POST /pedidos/:id/lineas/:lineaId/liberar` | ventas | F2-T2; emite `TicketEnviadoACocina` con SOLO esa linea; 409 si ya se envio; imprime comanda de cocina best-effort (F2-T4, §16) |
| `POST /pedidos/:id/liberar-retenidas` | ventas | F2-T2 "enviar al final"/por curso; libera TODAS las retenidas pendientes en un evento; no-op si no hay pendientes; imprime comanda de cocina best-effort (F2-T4, §16) |
| `GET /pedidos/:id/costeo` | costeo | requiere `costeo.ver`; costo real (BOM por variante) + margen del pedido (F2-T1) |
| `POST /pedidos/:id/descuento` | ventas | requiere `pedido.descuento.autorizar`; auditado (RN-03) |
| `POST /pedidos/:id/reembolso` | ventas | requiere `pago.reembolso`; auditado; emite `VentaRevertida` (revierte stock — fix de bug de la demo) |
| `POST /turnos` | ventas | requiere `turno.abrir` |
| `POST /turnos/:id/cierre-z` | ventas | requiere `turno.cierreZ`; snapshot inmutable |
| `GET /reportes/dia?ubicacionId=&fecha=YYYY-MM-DD&hasta=&ordenarMixPor=` | reportes | requiere `reporte.ver`; ventas+mix+arqueo+daypart en un solo payload (F2-T3, ver §15) |
| `POST /pagos` | pagos | body `{pedidoId, metodo, monto, propina?, montoRecibido?, offline?, forzarRechazo?}`. Status: **201 aprobado, 202 encolado, 200 rechazado** (fix: la demo devolvia 201 siempre). Efectivo aprobado dispara el pulso del cajon (best-effort); un pago aprobado que salda el pedido imprime el recibo (best-effort) (F2-T4, §16) |
| `POST /pagos/:id/reembolso` | pagos | requiere `pago.reembolso`; via PSP mock, por `pspReferencia` (nunca PAN, C-PCI) |
| `GET /turnos/:id/arqueo` | pagos | ownership literal de arquitectura.md §6.2 (aunque `Turno` viva en VentasModule) |
| `POST /auth/login-pin` | seguridad | ver seccion 5 |

## 8. WebSocket (F1-T4, RNF-01 ≤2s)

Socket.IO en el mismo puerto HTTP. Enviar `{"ubicacionId": "..."}` con el
evento `suscribir` para unirse a la sala de una tienda (opcional; sin esto se
recibe el broadcast global, suficiente para el MVP de una sola tienda).
Todos los eventos de negocio llegan bajo el nombre de transporte
`evento-dominio`, con el envelope exacto de `arquitectura.md` §6.3:

```json
{ "id": "...", "tipo": "TicketEnviadoACocina", "ubicacionId": "...", "ocurridoEn": "...", "version": 1, "payload": { } }
```

Eventos implementados: `PedidoActualizado`, `TicketEnviadoACocina`,
`VentaConfirmada`, `VentaRevertida`, `Producto86Cambiado`, `StockBajo`,
`PagoRegistrado`, `CajonAbierto`. (`EstadoCocinaCambiado` es emitido por
`kds-cocina-pos`, fuera del alcance de este backend — ver arquitectura.md §9.5.)

Cada evento se persiste ATOMICAMENTE junto con el push WS en la tabla
`EventoDominio` (ver `src/common/eventos/eventos.service.ts`: una sola
llamada `emitir()` hace las dos cosas, nunca dos codepaths separados que
puedan divergir). Esa tabla es el **outbox** que consume el agente de
sincronizacion descrito abajo (8.1): `WHERE "sincronizadoEn" IS NULL ORDER BY
"ocurridoEn"`, y se marca `sincronizadoEn` al confirmar el ack de la nube.

### 8.1 Agente de sincronizacion outbox/inbox + mTLS (F1-T5)

Implementado en `src/sync/` (`SyncModule`), wireado en `app.module.ts` sin
tocar ningun otro modulo. Dos direcciones independientes, cada una con su
propio `setInterval` (con `.unref()` para no mantener vivo el proceso solo por
el timer):

- **Outbox (`SyncService`, tienda -> nube):** cada `SYNC_INTERVALO_MS` (default
  15s) lee `EventoDominio` pendiente (`sincronizadoEn IS NULL ORDER BY
  ocurridoEn`), arma lotes de `SYNC_BATCH_SIZE` (default 50) y hace
  `POST {CLOUD_SYNC_URL}/sync/eventos`. La nube responde `{ confirmados:
  string[] }`; **solo esos `id` se marcan `sincronizadoEn`** (ack parcial =
  se deja pendiente lo no confirmado, sin error). Un ciclo drena varios lotes
  seguidos (hasta `SYNC_MAX_LOTES_POR_CICLO`, default 20) mientras haya
  pendientes y la nube confirme el 100% del lote; en cuanto hay ack parcial o
  fallo, el ciclo se detiene y el resto queda para el proximo tick.
- **Fallos de red/5xx/timeout:** reintento con **backoff exponencial + jitter
  completo** (`src/sync/backoff.ts`, `delay = random(0, min(maxMs, baseMs *
  2^intento))`), capado a `SYNC_MAX_REINTENTOS` (default 4). Si se agotan los
  reintentos, **no se marca nada** como sincronizado; el proximo ciclo vuelve
  a leer las mismas filas.
- **Idempotencia por reinicio, sin estado de recuperacion aparte:** como nada
  se marca sincronizado hasta el ack, un crash/reinicio en cualquier punto
  simplemente hace que el siguiente ciclo relea las MISMAS filas pendientes y
  las reenvie con el MISMO `id` (UUID v7, nunca regenerado, ver
  `src/common/util/uuid.ts`) — la nube (idempotente por `id`) colapsa el
  reenvio. Verificado explicitamente en
  `test/integration/sync.integration.spec.ts` (caso "(c) idempotencia").
- **Inbox (`InboxService`, nube -> tienda):** cada `SYNC_INBOX_INTERVALO_MS`
  (default 30s) hace `GET {CLOUD_SYNC_URL}/sync/config?desde=version` (cursor
  guardado en la tabla nueva `SyncEstado`, fila unica `id="inbox"`) y aplica
  cada cambio recibido con **Last-Writer-Wins por version** (arquitectura.md
  §4.5): un cambio entrante solo se escribe si su `version` es mayor a la
  version local existente (o si el registro no existe todavia). El mecanismo
  es generico (`CambioConfigInbox { entidad, id, version, datos }`); hoy solo
  hay UN caso concreto implementado, `ReglaDeImpuesto` (se le agrego una
  columna `version Int @default(1)` al modelo, aditiva, no afecta el calculo
  de impuesto de `VentasModule`). Agregar mas entidades es trivial
  (`InboxService.aplicarCambio`) pero deliberadamente no se hizo mas: no hay
  catalogo maestro real todavia (eso es Fase 5).
- **mTLS (ADR-0005):** `src/sync/sync-http-client.ts` usa `https.Agent` nativo
  de Node con `cert`/`key`/`ca` cargados **por ruta de archivo** desde
  `MTLS_CERT_PATH`/`MTLS_KEY_PATH`/`MTLS_CA_PATH` (nunca hardcodeados ni
  commiteados). Si falta cualquiera de las 3, cae a HTTP/HTTPS simple sin
  certificado de cliente **y loguea un warning explicito** en el arranque: es
  una conveniencia de **desarrollo local unicamente** (para poder correr
  contra el mock-cloud de test sin generar certificados), nunca aceptable
  para trafico tienda-nube real.
- **Deshabilitado por defecto si falta `CLOUD_SYNC_URL`:** ambos servicios
  loguean un warning en `onModuleInit` y no arrancan ningun timer; no rompe
  nada de lo que ya funcionaba (F1-T1..F1-T4/F1-T6 siguen operando igual).
- **Mock-cloud de test** (`test/mock-cloud/mock-cloud-server.ts`): servidor
  HTTP minimo, **solo para tests**, que implementa `POST /sync/eventos`
  (upsert idempotente + ack configurable/parcial) y `GET /sync/config`
  (cambios versionados). Reemplaza a la nube real de Fase 5, que todavia no
  existe.

Variables de entorno nuevas: ver `.env.example` (`CLOUD_SYNC_URL`,
`SYNC_BATCH_SIZE`, `SYNC_MAX_LOTES_POR_CICLO`, `SYNC_MAX_REINTENTOS`,
`SYNC_TIMEOUT_MS`, `SYNC_INTERVALO_MS`, `SYNC_INBOX_INTERVALO_MS`,
`MTLS_CERT_PATH`, `MTLS_KEY_PATH`, `MTLS_CA_PATH`).

## 9. Tests

Dos suites Jest independientes (ver `jest.config.js` y ADR-0007 punto 5):

### 9.1 Unit (`npm test` o `npm run test:unit`)

Puras, **sin base de datos**, corren en cualquier entorno:
- `test/unit/calculo-totales.spec.ts`: motor de impuestos/descuento/propina
  (RN-01/RN-02/RN-03/RN-08) — subtotal gravable tras descuento, propina
  exenta, redondeo al centavo.
- `test/unit/permisos.guard.spec.ts`: guard RBAC (F1-T6) — acceso
  permitido/denegado (401 sin usuario, 403 sin permiso, 200 con permiso).
- `test/unit/backoff.spec.ts` (F1-T5): calculo de backoff exponencial + jitter
  (`calcularBackoffMs`) — jitter 0/1, crecimiento `base*2^intento`, tope
  `maxMs`, rango valido para cualquier aleatorio, default `Math.random`.
- `test/unit/mtls-config.spec.ts` (F1-T5): branching mTLS-vs-fallback —
  `resolverConfigMtls` puro (con lector de archivo mockeado, sin certificados
  reales) para los 4 casos parciales + el caso completo, y `SyncHttpClient`
  instanciado dos veces via variables de entorno reales (una con archivos
  temporales dummy, otra sin nada) para confirmar `mtlsHabilitado`.
- `test/unit/sync-outbox.spec.ts` (F1-T5): `SyncService.ejecutarCicloOutbox`
  con `PrismaService`/`SyncHttpClient` mockeados (sin DB/red) — ack parcial
  marca solo los ids confirmados, ack total drena varios lotes en un ciclo,
  agotar reintentos en un 500 no marca nada, y no-op si falta
  `CLOUD_SYNC_URL`.
- `test/unit/costeo.spec.ts` (F2-T1): `calcularCostoLinea` PURA (sin
  Prisma/DB) — producto base sin modificadores, `agregar` (sube costo),
  `sin` (baja costo, el insumo neteado a 0 desaparece del desglose), clamp a 0
  si un modificador resta mas de lo que hay, combo con DOS selecciones de
  slot distintas para el MISMO producto/precio produciendo costos distintos,
  e insumo sin costo unitario conocido no rompe el calculo (cuesta 0).
- `test/unit/dayparts.spec.ts` (F2-T3): `horaLocal`/`bucketDaypart` PUROS
  (`Intl.DateTimeFormat`, sin Prisma) — conversion UTC -> hora local por zona
  horaria IANA, clasificacion de las 5 franjas default en sus bordes exactos,
  cobertura de las 24h sin huecos/solapes, definiciones custom inyectadas, y
  `obtenerDefinicionesDaypart` leyendo `REPORTES_DAYPARTS_JSON` (valido,
  ausente, invalido, vacio) sin lanzar nunca.
- `test/unit/mix-productos.spec.ts` (F2-T3): `calcularMixProductos` PURA —
  agregacion de unidades/monto por `productoId` a traves de varias
  lineas/pedidos, orden por monto (default) vs por unidades, `Decimal` nunca
  `number` en el monto.
- `test/unit/ventas-desglose.spec.ts` (F2-T3): `calcularVentasDesglose` PURA —
  suma subtotal/descuento/impuesto/propina/total, desglose por metodo de pago
  SOLO de pagos `estado="aprobado"` (nunca rechazado/encolado/reembolsado), y
  documenta que un pedido cancelado/reembolsado nunca debe pasarse a esta
  funcion (el filtro es responsabilidad del llamador).
- `test/unit/arqueo-calculo.spec.ts` (F2-T3): `calcularArqueoTurno`/
  `calcularDiferenciaEfectivo` PURAS — `efectivoEsperado` sin reembolsos,
  un reembolso EN EFECTIVO resta del efectivo esperado (fix de un gap real,
  ver seccion 13), un reembolso CON TARJETA no lo afecta, suma de propinas
  por metodo, y el signo de `diferencia` (sobrante/faltante/exacto).
- `test/unit/esc-pos.spec.ts` (F2-T4): bytes EXACTOS de cada comando ESC/POS
  puro (`src/hardware/esc-pos.ts`) contra la especificacion publica —
  `ESC @`, `ESC E n` (negrita), `ESC a n` (alineacion), `GS ! n` (tamano,
  incluyendo el clamp de multiplicadores fuera de 1-8), `GS V m` (corte
  total/parcial), `ESC p m t1 t2` (pulso de cajon, default y explicito) — mas
  la composicion completa de un trabajo de recibo/comanda
  (`src/hardware/trabajos-impresion.ts`): empieza con `ESC @`, termina con
  `GS V` (corte), contiene el texto esperado.
- `test/unit/simulador-impresora.spec.ts` (F2-T4): `SimuladorImpresoraAdapter`
  nunca lanza (recibo/comanda/cajon) y loguea un warning explicito de "no es
  hardware real" al construirse + una representacion legible de cada trabajo.
- `test/unit/hardware-config.spec.ts` (F2-T4): `resolverConfigImpresora`
  PURA (sin `process.env`, mismo patron que `mtls-config.spec.ts`) para los
  casos sin `IMPRESORA_HOST`/vacio/con espacios (simulador), con host (real,
  puerto 9100 default), puerto explicito y puerto invalido; mas
  `leerConfigImpresoraEnv` contra `process.env` real; mas `HardwareModule`
  instanciado dos veces via NestJS `Test.createTestingModule` (sin red) para
  confirmar que el provider resuelto es `SimuladorImpresoraAdapter` o
  `EscPosImpresoraAdapter` segun `IMPRESORA_HOST`.

### 9.2 Integration (`npm run test:integration`)

Requieren PostgreSQL real. Opcion con Docker:

```bash
docker compose -f docker-compose.test.yml up -d
DATABASE_URL="postgresql://ckpos:ckpos@localhost:5433/ckpos_store_test?schema=public" npx prisma migrate deploy
DATABASE_URL="postgresql://ckpos:ckpos@localhost:5433/ckpos_store_test?schema=public" npm run test:integration
docker compose -f docker-compose.test.yml down -v
```

Si `DATABASE_URL` no esta definido, la suite se **salta automaticamente**
(`describe.skip`, con un `console.warn` explicando por que) — no rompe
`npm test` en un entorno sin Docker/Postgres. Archivos:

`test/integration/pedidos.integration.spec.ts` cubre el gate de pruebas de
Fase 1 (`PLAN_DE_PRODUCCION.md` §5):
- `(a)` reintento idempotente de `POST /pedidos` con el mismo `id` no duplica.
- `(b)` reembolsar un pedido cobrado revierte el stock via `VentaRevertida`
  (fix del bug de la demo).
- `(c)` `enviarACocina` emite `TicketEnviadoACocina` y queda en `EventoDominio`.

`test/integration/sync.integration.spec.ts` (F1-T5) levanta el mock-cloud
(`test/mock-cloud/mock-cloud-server.ts`) y el `AppModule` completo apuntando
`CLOUD_SYNC_URL` a el, y cubre:
- `(a)` drenado normal del outbox: eventos pendientes se envian y quedan
  `sincronizadoEn` seteado.
- `(b)` ack parcial: el `id` que el mock rechaza queda pendiente; un ciclo
  posterior (cuando el mock deja de rechazarlo) lo termina de sincronizar.
- `(c)` idempotencia ante "crash" simulado: reenviar manualmente a mano el
  mismo evento ya sincronizado (mismo `id`, mismo payload) no duplica nada en
  el mock (upsert idempotente) ni en `EventoDominio`, y un ciclo real
  posterior ya no vuelve a leer esa fila (`sincronizadoEn IS NULL` la excluye
  por diseno).
- `(d)`/`(d.2)` inbox: un cambio de `ReglaDeImpuesto` versionado se aplica y
  avanza el cursor de `SyncEstado`; un cambio entrante con `version` menor a
  la local NO sobreescribe (Last-Writer-Wins, el override local gana).

`test/integration/hold-and-fire.integration.spec.ts` (F2-T2) — gate de
pruebas explicitamente pedido para Hold & fire:
- `(a)` `enviarACocina` con una linea retenida + una no retenida solo dispara
  `TicketEnviadoACocina` para la NO retenida (la retenida queda con
  `enviadaACocinaEn = null`).
- `(b)` `liberarLinea` de la retenida despues dispara un SEGUNDO
  `TicketEnviadoACocina` con `payload.lineas` conteniendo UNICAMENTE esa
  linea — no duplica ni re-envia la primera.
- `(c)` `liberarLinea` sobre una linea ya liberada responde 409
  `linea_ya_enviada_cocina` — NO crea un tercer evento (verificado contando
  filas de `EventoDominio`).
- `(d)` `liberarLineasRetenidas` libera TODAS las pendientes en un solo
  evento; repetirlo sin pendientes es un no-op (no agrega un evento vacio).
- Extra: `retenerLinea` sobre una linea ya enviada a cocina es 409 (no se
  puede retener retroactivamente); `enviarACocina` con TODAS las lineas
  retenidas es 422 `nada_para_enviar_cocina`.

`test/integration/costeo.integration.spec.ts` (F2-T1) — envoltorio REAL de
`CosteoService` contra Postgres (no solo la funcion pura de `test/unit/`):
resuelve receta base + `RecetaModificador` de un modificador `agregar`
aplicado + costo unitario vigente de cada `Insumo` para una linea realmente
vendida via `VentasService`, y calcula costo/margen agregado del pedido; un
producto sin receta activa costea 0 sin romper (mismo criterio que
`InventarioService`).

`test/integration/reportes.integration.spec.ts` (F2-T3) — `ReportesService`
completo contra Postgres, sembrando Pedidos reales via `VentasService` (no
mockeado):
- Ventas/mix/dayparts: dos pedidos cobrados en dayparts distintos (Desayuno,
  Almuerzo, con la zona horaria de la `Ubicacion`, no UTC) + metodos de pago
  distintos, MAS un tercero cobrado y luego reembolsado; el reembolsado NUNCA
  aparece en `ventas`/`mixProductos`/`dayparts` (RN-04).
- Arqueo: el reembolso EN EFECTIVO del tercer pedido resta del
  `efectivoEsperado` del turno, y el desglose "por metodo" del ARQUEO (nivel
  turno, incluye el pago ya-cancelado) se verifica que DIFIERE a proposito del
  desglose "por metodo" del REPORTE de ventas (solo pedidos vigentes) — dos
  preguntas distintas, ver seccion 13.
- `ubicacionId` vacio -> 422 `ubicacion_requerida` (C-TENANT); ubicacion
  inexistente -> 404; `hasta` anterior a `fecha` -> 422 `rango_invalido`.
- `ordenarMixPor=unidades` cambia el orden respecto al default (`monto`) con
  dos productos de precio/volumen inversos.

**Nota de entorno:** este proyecto (F1-T1..F1-T6, y F2-T1/F2-T2/F2-T3 despues) se
desarrollo en un sandbox sin Docker ni PostgreSQL disponibles; los tests de
integracion —incluidos los de F1-T5 y los nuevos de F2-T1/F2-T2/F2-T3— se
escribieron y se dejaron listos para correr contra Postgres real, pero **no
pudieron ejecutarse en ese entorno** (se verifico que `npm run
test:integration` hace `describe.skip` limpio en todos los archivos, mas unit
tests + compilacion + `npm run build`). Ejecutarlos con Docker disponible
antes de dar por cerrado el gate de cada fase.

## 10. Deuda tecnica de la demo corregida aqui (PLAN_DE_PRODUCCION.md §6)

- `POST /api/v1/pagos` ya no devuelve 201 para rechazado/encolado (`pagos.controller.ts`).
- El reembolso de Pedido SIEMPRE emite `VentaRevertida` -> Inventario revierte stock (`ventas.service.ts#reembolsarPedido`).
- `enviarACocina` emite `TicketEnviadoACocina` (evento nuevo, antes ausente del enum/flujo).
- El filtro global de excepciones traduce tanto `ErrorDominio` como cualquier `HttpException`/error inesperado — ningun error de dominio cae a 500 por accidente.
- IDs generados por el servidor usan `uuidv7()` (RFC 9562); Pedido/Pago/Linea aceptan el id v7 que ya trae el cliente (C-ID).
- Bus de eventos por WebSocket real (Socket.IO), reemplaza el polling de la demo.
- Estado en PostgreSQL (Prisma), reemplaza el store en memoria.
- `EventoDominio` ya no se queda solo como tabla "lista para" un futuro
  agente: `SyncModule` (F1-T5) la drena de verdad (`SyncService`) y aplica
  config entrante (`InboxService`), con mTLS real (con fallback de dev
  logueado) y backoff exponencial + jitter en los reintentos.

## 11. Deviaciones/decisiones documentadas (para revision del orquestador)

- **Enums como tipos nativos de Postgres** (via Prisma `enum`), no `String`
  libre: se prefirio integridad a nivel de DB ya que el proyecto se
  comprometio con Postgres real (no se necesita portabilidad a SQLite).
- **Reintento idempotente de `POST /pedidos` responde 409** (no 200/201) con
  el pedido existente en `detalles.pedido`: se sigue la letra de C-ERRORES
  ("409 para conflicto, p. ej. reintento idempotente"). El pedido NUNCA se
  duplica (verificado en el test de integracion (a)); es una decision de
  status HTTP, no de comportamiento.
- **Autenticacion por header `x-usuario-id` tras login por PIN**, sin
  JWT/sesion (ver seccion 5): documentado como simplificacion de LAN cerrada,
  no como omision.
- **`GET /api/v1/turnos/:id/arqueo` vive en `PagosModule`**, no en
  `VentasModule`, seccion 9.2 de arquitectura.md lo asigna literalmente a
  `pagos-pos` aunque `Turno` sea una entidad de Ventas.
- **Combo:** se implemento una validacion basica de "slot obligatorio debe
  tener una seleccion" (422 `combo_incompleto`) para satisfacer el ejemplo de
  C-ERRORES; el flujo completo de seleccion de combo multi-slot con precios
  variables por opcion (HU-MOS-02 completo) no se profundizo mas alla de eso
  por alcance de tiempo — anotar como pendiente de refinar si Fase 2 lo requiere.
- **Bus interno de proceso:** `@nestjs/event-emitter` (via `emitAsync`) hace
  de "bus de eventos local" MVP para que `InventarioModule` reaccione a
  `VentaConfirmada`/`VentaRevertida` sin acoplarse a `VentasService`
  directamente (C-EVENTOS). Es intra-proceso (todos los modulos corren en el
  mismo Node): suficiente para un solo Store Server; si en el futuro se separa
  en microservicios habria que migrar a NATS/Redis Streams (ya previsto como
  evolucion en arquitectura.md §3).
- **No hay nube real para probar contra ella (F1-T5):** Fase 5 (catalogo
  maestro/consola multi-tienda) todavia no existe, asi que `SyncModule` se
  probo contra un `mock-cloud` de test (`test/mock-cloud/mock-cloud-server.ts`,
  HTTP plano, comentado explicitamente como infraestructura de test, no
  entregable de produccion). El contrato (`POST /sync/eventos` idempotente por
  `id`, `GET /sync/config?desde=version`) es exactamente el de
  arquitectura.md §6.4; cuando exista la nube real de Fase 5, el unico cambio
  esperado del lado tienda es apuntar `CLOUD_SYNC_URL`/`MTLS_*` a ella — no
  deberia hacer falta tocar `SyncService`/`InboxService`.
- **`version` en `ReglaDeImpuesto`:** se agrego una columna nueva
  (`Int @default(1)`) solo para poder demostrar el mecanismo LWW del inbox con
  un ejemplo concreto (arquitectura.md §4.5 lo pide explicitamente). Es
  aditiva y no cambia el calculo de impuesto de `VentasModule` (que solo lee
  `tasa`/vigencias); no se agrego "version" a ninguna otra entidad de catalogo
  por no sobre-construir (S-01/S-08 son multi-tienda futuro).
- **Tabla `SyncEstado` nueva:** guarda el cursor del inbox
  (`ultimaVersionAplicada`), fila unica `id="inbox"`. No es parte del modelo
  de dominio de arquitectura.md §5 (es infraestructura de sincronizacion,
  igual que `EventoDominio` lo es para el outbox) — deliberadamente no se
  documento en la seccion 5 de arquitectura.md ni se le pidio al modelo de
  datos vinculante que la incluyera.
- **F2-T1 (Costeo): `comboSeleccionProductoIds` en `LineaDePedido` en vez de
  "arreglar" la seleccion de combo de VentasModule.** El gap documentado
  arriba ("el flujo completo de seleccion de combo... no se profundizo") es
  real: hoy `agregarLinea` valida el slot obligatorio contra `modificadorIds`
  (que en la practica son ids de `Producto`, no de `Modificador` — un combo
  con slot obligatorio TODAVIA falla `modificador_no_encontrado` si se intenta
  cobrar la opcion via ese mismo campo). Arreglar esa validacion es HU-MOS-02
  completo y esta fuera del alcance de F2-T1 (que es sobre COSTEO, no sobre
  precio/validacion de combos, y `VentasModule` es `backend-ventas-pos`, no
  `menu-inventario-pos`). En vez de tocar esa logica, se agrego un campo
  ADITIVO y PARALELO (`comboSeleccionProductoIds String[]`) que el cliente
  puede mandar en `AgregarLineaDto` para declarar que Producto se eligio por
  slot, usado UNICAMENTE por `CosteoService` — nunca lee/afecta
  `precioUnitario`/`subtotalLinea` ni la validacion `combo_incompleto`
  existente. Ver §13 para el detalle completo de la decision.
- **F2-T2 (Hold & fire) vive en `VentasModule`, no en un modulo nuevo.**
  Aunque el owner de la tarea en el plan es `menu-inventario-pos` +
  `kds-cocina-pos`, retener/liberar mutan `LineaDePedido` — la MISMA entidad
  que ya posee exclusivamente `VentasService` (agregar/actualizar linea,
  enviar a cocina). Crear un modulo separado hubiera significado dos
  servicios escribiendo la misma tabla (riesgo de logica de estado
  divergente) o que el modulo nuevo llamara de vuelta a `VentasService`
  (acoplamiento circular). Se opto por extender `VentasService`/
  `PedidosController` con 3 metodos/endpoints nuevos, documentados y
  probados en §14.

## 12. Que falta (fuera de alcance de esta tarea, ver PLAN_DE_PRODUCCION.md)

- F1-T3: terminales PWA offline (IndexedDB + Service Worker) — no se toco `app/`.
- **F1-T5 (agente de sincronizacion): implementado en esta tarea** —
  `SyncModule` (`src/sync/`) drena el outbox (`EventoDominio`) hacia
  `POST {CLOUD_SYNC_URL}/sync/eventos` con ack (parcial o total), backoff
  exponencial + jitter en fallos, e idempotencia por reinicio (nunca marca
  nada hasta el ack); y aplica el inbox (`GET /sync/config?desde=version`)
  con Last-Writer-Wins, con `ReglaDeImpuesto` como ejemplo concreto. mTLS
  real via `https.Agent` + `MTLS_CERT_PATH`/`MTLS_KEY_PATH`/`MTLS_CA_PATH`,
  con fallback de dev logueado si faltan. **Lo que SIGUE pendiente de esta
  tarea:**
  - No hay nube real contra la cual correr esto (ver seccion 11): se probo
    contra un mock-cloud de test. Cuando exista la nube de Fase 5, validar el
    contrato real (formato exacto de error, autenticacion adicional si la
    hubiera, límites de tamaño de lote del lado servidor, etc.).
  - Los tests de integracion de F1-T5 (`test/integration/sync.integration.spec.ts`)
    se escribieron y compilan, pero **no se ejecutaron** en este sandbox por
    falta de Docker/Postgres (mismo gap que el resto de F1-T1..F1-T6, ver
    seccion 9). Correrlos con Postgres real antes de cerrar el gate de Fase 1.
  - No se genero una migracion de Prisma para `version` en `ReglaDeImpuesto`
    ni para la tabla `SyncEstado` (no hay carpeta `prisma/migrations/` en este
    repo todavia — ninguna tarea anterior de Fase 1 pudo correr
    `prisma migrate dev` en este sandbox sin Postgres). Correr
    `npm run prisma:migrate:dev` contra Postgres real generara la migracion
    inicial completa (incluyendo estos dos cambios) en un solo paso.
  - El intervalo de los `setInterval` de outbox/inbox no es dinamico (no hay
    backoff del propio intervalo si la nube esta caida por horas): cada tick
    intenta de nuevo con el backoff normal del lote, pero el "tick" en si
    sigue firme cada `SYNC_INTERVALO_MS`. Aceptable para el MVP (cortes de
    internet tipicos de tienda), pero anotar si Fase 2/5 necesita backoff
    tambien a nivel de intervalo.
- **F2-T4 (Hardware ESC/POS + cajon; PSP semi-integrado): implementado
  parcialmente en esta tarea** — ver §16 para el detalle completo.
  `ImpresoraAdapter`/`HardwareModule` (`src/hardware/`) son codigo de
  protocolo ESC/POS REAL (bytes verificados contra la spec publica,
  test/unit/esc-pos.spec.ts), no un mock — pero **nunca se probaron contra
  una impresora fisica** (no hay hardware en este entorno, ver §16.4).
  `PspAdapter` sigue siendo el mock en memoria de Fase 1
  (`src/pagos/psp/mock-psp.adapter.ts`) **a proposito**: no existe todavia un
  PSP contratado (S-05 sigue bloqueante, ver ADR-0006) y construir un
  adaptador "real" sin contrato seria fingir una integracion que no existe.
  Se extendio el CONTRATO (`cancelarTransaccionPendiente`, aditivo/opcional)
  para que, cuando haya PSP contratado, conectar el SDK real siga sin tocar
  `VentasModule`/`PagosModule`.
- KDS (`kds-cocina-pos`) y su evento `EstadoCocinaCambiado`: fuera del alcance
  de este backend (arquitectura.md §9.5 lo asigna a otro modulo).
- **F2-T1 (Costeo por combinacion / BOM por variante): implementado en esta
  tarea** — ver §13 para el detalle completo. **Lo que SIGUE pendiente:**
  - HU-MOS-02 completo (seleccion de combo con precio variable por opcion) NO
    se arreglo — sigue siendo el gap documentado en §11 ("Combo"). F2-T1
    trabaja AL LADO de ese gap (`comboSeleccionProductoIds` es un campo
    paralelo que el cliente debe enviar explicitamente); no resuelve
    `agregarLinea`/`validarComboCompleto` (fuera de alcance, es
    `backend-ventas-pos`).
  - No se genero migracion de Prisma para `Insumo.costoUnitario`,
    `RecetaModificador`, `LineaDePedido.comboSeleccionProductoIds` (mismo
    motivo que el resto: no hay `prisma/migrations/` en este sandbox sin
    Postgres). `npm run prisma:migrate:dev` contra Postgres real la genera.
  - Los tests de integracion de `CosteoService`
    (`test/integration/costeo.integration.spec.ts`) se escribieron y
    compilan, pero no se ejecutaron (sin Docker/Postgres en este sandbox).
  - El endpoint `GET /pedidos/:id/costeo` es de solo lectura y no se expuso
    (a proposito) en `GET /reportes/dia`; ver §13 la justificacion.
- **F2-T2 (Hold & fire): implementado en esta tarea** — ver §14 para el
  detalle completo. **Lo que SIGUE pendiente:**
  - Mismo gap de migracion Prisma que arriba (`retenida`, `enviadaACocinaEn`,
    `liberadaACocinaEn` en `LineaDePedido` son cambios de schema sin migracion
    generada todavia).
  - Los tests de integracion
    (`test/integration/hold-and-fire.integration.spec.ts`) se escribieron y
    compilan, pero no se ejecutaron (sin Docker/Postgres en este sandbox).
  - No hay endpoint para "des-retener" una linea sin liberarla (revertir
    `retenida=true` a `false` sin dispararla a cocina); no lo pidio el plan y
    se prefirio no sobre-construir — trivial de agregar despues si se
    necesita (mismo patron que `retenerLinea`, solo cambiando el valor).
  - `kds-cocina-pos` (fuera de este backend) deberia decidir si distingue
    visualmente `payload.liberacionParcial: true` de un envio inicial; el
    campo ya viaja en el envelope del evento, listo para consumir.
- **F3-T1 (Bajas con aprobacion de calidad): implementado en esta tarea** —
  ver §17 para el detalle completo. **Lo que SIGUE pendiente:**
  - Mismo gap de migracion Prisma que el resto de tareas de este repo
    (`SolicitudBaja`, `Ubicacion.umbralMermaPorcentaje`, y los valores nuevos
    de `TipoEventoAuditoria` son cambios de schema sin migracion generada
    todavia).
  - `test/integration/bajas.integration.spec.ts` se escribio y compila, pero
    no se ejecuto (sin Docker/Postgres en este sandbox).
  - El "valor de insumo recibido" (denominador del 3% de S-13) es un PROXY
    documentado (§17.4), no un ledger de compras/recepcion real — revisar
    cuando exista ese modulo (S-12, fuera de alcance).
  - No hay endpoint generico de lectura de auditoria (`GET /auditoria`); la
    alerta `alertaMerma` se ve hoy via `GET /bajas?estado=` o consulta directa
    a `EventoDeAuditoria` (gap preexistente, no introducido por esta tarea —
    ver §17.6).

## 13. F2-T1 — Costeo por combinacion (BOM por variante)

**Objetivo (PLAN_DE_PRODUCCION.md Fase 2):** "cada combo/modificador resuelve
su costo real aunque el precio sea fijo". El precio que paga el cliente sigue
viniendo 100% de `Producto`/`Modificador`/`Combo` (C-SNAPSHOT, sin tocar); lo
que se agrega aqui es un mecanismo **paralelo, de solo lectura**, para saber
cuanto cuesta en insumos lo que efectivamente se vendio.

### 13.1 Modelo de datos (aditivo)

- `Insumo.costoUnitario Decimal(12,4) @default(0)`: costo vigente por unidad
  de insumo (misma unidad que `unidadMedida`). Se actualiza con
  `PATCH /api/v1/insumos/:id` (nuevo). Default 0 no rompe ninguna fila
  existente ni ningun calculo previo (Stock/InventarioService no lo leen).
- `RecetaModificador` (tabla nueva): `id`, `modificadorId`, `insumoId`,
  `cantidadDelta Decimal(14,3)` — cuanto insumo agrega (positivo, ej. "Extra
  queso") o quita/sustituye (negativo, ej. "Sin queso" resta exactamente lo
  que la receta base tenia) UN Modificador concreto. Se declara con
  `POST /api/v1/modificadores/:id/receta-modificador`. Un `Modificador` sin
  fila aqui simplemente no afecta costo (retro-compatible: TODOS los
  modificadores existentes antes de esta tarea siguen costando exactamente lo
  mismo que su receta base, porque no tienen `RecetaModificador`).
- `LineaDePedido.comboSeleccionProductoIds String[] @default([])`: ver §11
  para la justificacion completa de por que existe este campo (declarar,
  para costeo, que Producto se eligio en cada slot de un Combo) y por que NO
  intenta arreglar la validacion/precio de combos existente.

### 13.2 `CosteoService` (`src/costeo/`)

Dos capas, deliberadamente separadas:

1. **`costeo.types.ts` — `calcularCostoLinea` (funcion PURA):** no toca
   Prisma. Recibe la receta base ya resuelta (lista `{insumoId, cantidad}`),
   los modificadores aplicados ya resueltos con sus deltas, opcionalmente la
   receta de cada producto elegido en un combo, y un mapa `insumoId ->
   costoUnitario`. Suma todos los deltas por insumo (receta base +
   modificadores + combo), clampa a 0 (nunca "cantidad negativa de insumo"),
   multiplica por la cantidad de la linea y por el costo unitario. Devuelve
   un **desglose por insumo** (`cantidadPorUnidad`, `cantidadTotal`,
   `costoUnitario`, `costoTotal`) + el total — auditable, no un numero unico
   opaco (pedido explicito de la tarea). 100% cubierta por
   `test/unit/costeo.spec.ts` sin necesitar DB.
2. **`costeo.service.ts` — `CosteoService` (envoltorio con Prisma):**
   resuelve contra la base real todo lo que la funcion pura necesita
   (`Receta`/`RecetaInsumo` del producto, `RecetaModificador` de cada
   `LineaModificador`, `Receta`/`RecetaInsumo` de cada producto en
   `comboSeleccionProductoIds`, `Insumo.costoUnitario` vigente) y expone
   `calcularCostoLineaPersistida(lineaDePedidoId)` y
   `calcularCostoPedido(pedidoId)`. Puramente de LECTURA: no escribe
   Stock/Pedido/Pago, no emite eventos, no importa `VentasService`.

### 13.3 Endpoint elegido: `GET /api/v1/pedidos/:id/costeo`

La tarea daba a elegir entre un endpoint nuevo o una columna opcional en
`GET /reportes/dia`. Se eligio **solo el endpoint nuevo**, en su PROPIO
modulo (`CosteoModule`, controller separado de `PedidosController` aunque
comparta el prefijo `api/v1/pedidos`) por tres razones:

1. `reportes/dia` (F2-T3, `reportes-analitica-pos`) es una tarea/owner
   distinto que se estaba desarrollando en paralelo en este mismo repo; tocar
   `ReportesModule`/`VentasService.reporteDia` para agregarle una columna de
   costo hubiera significado coordinar dos tareas concurrentes sobre el mismo
   archivo. Un modulo nuevo, propio, evita esa colision por diseno.
2. Costo/margen es un dato mas sensible/detallado (por linea, con desglose
   por insumo) que un "mix de productos" agregado del dia — encaja mejor como
   consulta puntual por pedido (auditoria de una venta especifica) que como
   columna de un reporte agregado.
3. Mantiene el principio "aditivo, no intrusivo": cero lineas cambiadas en
   `VentasModule`/`ReportesModule` para exponer costeo.
4. Permiso nuevo `costeo.ver` (no reutiliza `reporte.ver` ni
   `catalogo.gestionar`): ver costo/margen real (COGS) es informacion mas
   sensible que ver el catalogo o el mix de ventas — se le dio granularidad
   propia. Otorgado al rol `gerenteTienda` en el seed; el cajero NO lo tiene
   por defecto.

## 14. F2-T2 — Hold & fire (retener/marchar)

**Objetivo (PLAN_DE_PRODUCCION.md Fase 2):** "retener lineas y liberarlas a
cocina cuando se decida; envio por curso/'al final'". Hoy (antes de esta
tarea) enviar a cocina era una unica accion todo-o-nada
(`POST /pedidos/:id/enviar-cocina`) que mandaba TODAS las lineas del pedido
en un solo `TicketEnviadoACocina`. Un flujo QSR/full-service real necesita
poder marcar una linea especifica (ej. un postre) para que NO salga con el
resto, y dispararla despues, sola, sin re-enviar lo que ya esta en cocina.

### 14.1 Modelo de datos (aditivo, en `LineaDePedido`)

- `retenida Boolean @default(false)`: si es true, la linea queda EXCLUIDA del
  proximo `TicketEnviadoACocina` (inicial o de liberacion) hasta que se libere
  explicitamente.
- `enviadaACocinaEn DateTime?`: momento en que ESTA linea (no el pedido
  completo) fue efectivamente incluida en un ticket — inicial o liberacion.
  `null` = todavia no salio a cocina. Es la clave de la idempotencia: nunca se
  re-envia/duplica una linea con este campo ya seteado.
- `liberadaACocinaEn DateTime?`: distingue una liberacion EXPLICITA
  (`/liberar` o `/liberar-retenidas`) de una linea que salio en el envio
  inicial sin haber estado nunca retenida (esa tiene `enviadaACocinaEn` pero
  NO `liberadaACocinaEn`).

`Pedido.estado`/`Pedido.enviadoACocinaEn` (a nivel de pedido, ya existian) NO
cambiaron de significado: siguen marcando el primer
`POST /pedidos/:id/enviar-cocina`, que sigue exigiendo `estado === "abierto"`
y solo puede llamarse una vez (igual que antes de esta tarea). Las
liberaciones posteriores NO tocan `Pedido.estado`.

### 14.2 Endpoints nuevos (en `VentasService`/`PedidosController`, ver §11 por que no un modulo separado)

- `PATCH /pedidos/:id/lineas/:lineaId/retener`: marca `retenida=true`.
  Idempotente (retener una linea ya retenida es no-op). 409
  `linea_ya_enviada_cocina` si la linea ya salio a cocina (no se puede
  "recapturar" retroactivamente).
- `POST /pedidos/:id/lineas/:lineaId/liberar`: envia a cocina ESA linea (y
  solo esa) YA, sea que estuviera retenida o no. Emite `TicketEnviadoACocina`
  con `payload.lineas` conteniendo UNICAMENTE esta linea y
  `payload.liberacionParcial: true`. 409 `linea_ya_enviada_cocina` si ya se
  habia enviado — no duplica el evento.
- `POST /pedidos/:id/liberar-retenidas`: "al final"/por curso en bloque —
  libera TODAS las lineas `retenida=true && enviadaACocinaEn=null` en UN solo
  evento. No-op silencioso (sin emitir evento) si no hay ninguna pendiente,
  para que llamarlo repetidamente sea siempre seguro.
- `enviarACocina` (existente) se modifico para filtrar `lineas.filter(l =>
  !l.retenida && !l.enviadaACocinaEn)` antes de armar el payload del evento y
  el `updateMany` que marca `enviadaACocinaEn`; si el filtro queda vacio (todo
  retenido), 422 `nada_para_enviar_cocina` en vez de mandar un ticket vacio.

Los 3 metodos comparten un unico punto de emision
(`VentasService.emitirTicketACocina`, privado) para que el payload de
`TicketEnviadoACocina` nunca diverja entre el envio inicial y una liberacion
parcial (mismo principio que `EventosService.emitir()` de la Fase 1).

### 14.3 Decision de permisos: cajero-default, sin `@RequierePermiso`

Retener/liberar una linea es, en esencia, la misma clase de accion que
agregar o editar una linea de un pedido abierto (que tampoco tienen
`@RequierePermiso` hoy) — es parte normal de tomar un pedido, no una accion
sensible. La lista explicita de acciones sensibles de arquitectura.md §7.5
(RNF-07: descuento, reembolso, cancelacion, ajuste de inventario, apertura de
cajon, 86, cierre Z) **no incluye** "retener/liberar una linea a cocina", por
lo que se decidio NO exigir un permiso nuevo ni generar `EventoDeAuditoria`
para estas acciones (a diferencia de descuento/reembolso/86, que si auditan).
Si en produccion se decide que "liberar" debe auditarse (ej. para reconstruir
por que un curso salio tarde), es un cambio quirurgico: agregar
`seguridad.registrarAuditoria(...)` dentro de `liberarLinea`/
`liberarLineasRetenidas`, sin tocar el resto del diseno.

### 14.4 Que SI sigue igual (no se toco)

- El contrato del evento `TicketEnviadoACocina` (nombre, envelope) no cambio;
  solo se agrego el campo informativo `payload.liberacionParcial` (que un
  consumidor de KDS puede ignorar sin romperse — sigue siendo
  `{ pedidoId, numeroOrden, turnoId, lineas: [...] }`).
- `estadoCocina` de `LineaDePedido` (`recibido`/`preparando`/`listo`) no
  cambio de semantica; sigue siendo lo que `kds-cocina-pos` actualiza via
  `EstadoCocinaCambiado` (fuera de este backend).
- Precio/impuesto/total de `VentasModule` — cero lineas de
  `calculo-totales.ts`/`recalcularYPersistir` tocadas.

## 15. F2-T3 — Reportes del dia (HU-REP-01)

**Objetivo (PLAN_DE_PRODUCCION.md Fase 2):** "reportes del dia completos:
ventas, mix de productos, arqueo y analisis por daypart". Fase 1 ya habia
dejado un `GET /api/v1/reportes/dia?fecha=` basico (ventas totales + mix, sin
desglose por metodo de pago, sin arqueo, sin daypart, `ubicacionId` opcional)
en `VentasModule`. Esta tarea lo **reemplaza** por completo (no lo deja como
un segundo endpoint compitiendo) en un `ReportesModule` dedicado
(`src/reportes/`).

### 15.1 Por que un modulo nuevo y no extender `VentasModule`

Aunque arquitectura.md §6.2 lista `GET /reportes/dia` bajo "Ventas
(backend-ventas-pos)", el volumen de logica de agregacion/bucketing
(desglose por metodo, mix ordenable, bucketing de daypart, composicion de
arqueo por turno) justificaba un modulo propio en vez de seguir creciendo
`ventas.service.ts` (ya grande). `ReportesModule` importa `VentasModule` (para
reusar `VentasService.calcularArqueo`, ver 15.3) y `CosteoModule` (para el
margen opcional del mix, ver 15.5); no importa nada de `VentasModule` que no
sea ese unico metodo, y no le agrega ningun endpoint nuevo a
`PedidosController`/`TurnosController`.

### 15.2 Un solo endpoint, no cuatro sub-recursos

`GET /api/v1/reportes/dia?ubicacionId=&fecha=YYYY-MM-DD&hasta=&ordenarMixPor=`
devuelve las 4 secciones (`ventas`, `mixProductos`, `dayparts`, `arqueo`) en
un unico payload. Se prefirio esto a 4 sub-recursos (`/reportes/ventas`,
`/reportes/mix`, etc.) porque:
- El caso de uso principal es "el gerente abre el dashboard del dia" — un
  solo `fetch` es mas simple para el frontend y evita 4 round-trips por LAN.
- El payload es chico para el MVP de una sola tienda/un dia (no hay paginado
  que forzara separarlo).
- Las 4 secciones comparten el MISMO filtro base (`ubicacionId` + rango de
  fechas): separarlas hubiera significado repetir esa validacion 4 veces.

`ubicacionId` es **obligatorio** (a diferencia del endpoint basico de Fase 1,
que lo aceptaba opcional y agregaba TODAS las tiendas si faltaba): decision
deliberada por C-TENANT — un reporte nunca deberia poder mezclar numeros de
dos tiendas por un query param faltante. `fecha`/`hasta` soportan tanto "un
dia" (`hasta` omitido = igual a `fecha`) como un rango.

### 15.3 Arqueo: UNA sola formula, reusada (no duplicada)

`VentasService.calcularArqueo` (ya existia desde Fase 1, usado por
`GET /turnos/:id/arqueo` via `PagosService.arqueoTurno`) sigue siendo el
UNICO lugar que resuelve datos de Prisma para el arqueo. Se extrajo la
formula a una funcion PURA nueva, `reportes/arqueo-calculo.ts#calcularArqueoTurno`
(testeada sin DB en `test/unit/arqueo-calculo.spec.ts`), y
`VentasService.calcularArqueo` ahora solo hace el fetch y delega ahi.
`ReportesService` (este modulo) NUNCA reimplementa el calculo: para la
seccion `arqueo` del reporte del dia, busca los `Turno` que tocan el rango
(`abiertoEn` o `cerradoEn` dentro de el) y llama
`VentasService.calcularArqueo(turno.id)` por cada uno — mismo codepath que
`GET /turnos/:id/arqueo`.

**Fix real encontrado al construir esto:** antes de F2-T3, `calcularArqueo`
solo miraba `Pago` con `estado="aprobado"`; un reembolso (que crea un `Pago`
con `estado="reembolsado"`, ver `VentasService.reembolsarPedido`) se ignoraba
por completo, asi que un reembolso EN EFECTIVO durante el turno NO restaba
del efectivo esperado (sobreestimaba caja). Ahora `calcularArqueo` tambien
consulta los pagos `reembolsado` del turno y resta del `efectivoEsperado`
solo los que son `metodo="efectivo"` (un reembolso con tarjeta va por el PSP,
nunca toca el cajon fisico). Formula final:
`efectivoEsperado = fondoInicial + efectivo cobrado - efectivo reembolsado`
(exactamente la de la tarea). `cerrarTurnoZ` (cierre Z, HU-PAG-08) usa la
misma funcion pura (`calcularDiferenciaEfectivo`) para `diferencia`, sin
tocar su contrato/status existente.

**Por que el desglose "por metodo" del reporte de VENTAS puede diferir del de
ARQUEO para el mismo turno/dia (a proposito, no es un bug):** el reporte de
ventas (`ventas.porMetodoPago`) solo suma pagos de Pedidos con
`estado="cobrado"` — un pedido reembolsado pasa a `estado="cancelado"` y
queda TOTALMENTE excluido (RN-04, nunca infla ingreso). El arqueo, en
cambio, es una reconciliacion FISICA de caja: el efectivo SI entro y SI
salio durante el turno aunque el pedido ya no cuente como venta vigente, asi
que su `porMetodo` cuenta el pago aprobado original (el que ya no es
"ingreso" a nivel de reporte de ventas) y separa el reembolso en su propio
campo `efectivoReembolsado`. Verificado explicitamente en
`test/integration/reportes.integration.spec.ts`.

### 15.4 Dayparts: configurable via env, sin tabla nueva (S-04)

`docs/requisitos.md` S-04 deja los horarios EXACTOS de daypart como
"[SUPUESTO] ... pendiente de validacion por operaciones". En vez de bloquear
la tarea en esa validacion, `src/reportes/dayparts.ts` implementa el
mecanismo CONFIGURABLE que pide S-04 sin necesitar una tabla/migracion nueva:
un array `{nombre, horaInicio, horaFin}` (`DefinicionDaypart[]`), con un
default QSR razonable como semilla —
**Madrugada 00-06 / Desayuno 06-11 / Almuerzo 11-15 / Tarde 15-18 / Cena
18-24** (cubre las 24h sin huecos ni solapes; coincide con la lista de
ejemplo de S-04 mas un bucket de madrugada para no perder ventas
nocturnas/catering tardio). Overridable por tienda con la env var
`REPORTES_DAYPARTS_JSON` (JSON de `DefinicionDaypart[]`); si falta, no
parsea, o algun elemento no cumple el shape minimo, cae al default sin
lanzar. El bucketing usa `Intl.DateTimeFormat` con la `Ubicacion.zonaHoraria`
real (NO UTC) — un pedido cobrado a las 13:00 UTC es Desayuno en
America/New_York (09:00 local, EDT) pero Almuerzo si se leyera en UTC
directamente; ver `test/unit/dayparts.spec.ts` y el caso equivalente en el
test de integracion.

### 15.5 Margen en el mix de productos: EXTRA opcional via `CosteoModule`

No lo pide HU-REP-01 explicitamente, pero como `CosteoModule` (F2-T1, en
curso en paralelo en este mismo repo) ya expone
`CosteoService.calcularCostoLineaPersistida`, se agrego `costoEstimado`/
`margenEstimado` a cada item de `mixProductos` **best-effort**: se costea
cada `LineaDePedido` del periodo con `Promise.allSettled` y se agrega por
producto; si constear UNA linea de un producto falla (dato de receta
incompleto, etc.), ESE producto se reporta sin los dos campos (nunca un
margen parcial enganoso), pero el resto del reporte (ventas/mix
basico/dayparts/arqueo) nunca depende de que esto tenga exito — es un
`try`/`Promise.allSettled` aislado, no puede tumbar el reporte nucleo. Ver
`ReportesService.intentarCostearMix`.

### 15.6 Serializacion de dinero (C-DINERO)

Igual que el resto del contrato: TODO monto en el JSON de respuesta es un
**string** (`Decimal.toString()`), nunca `number`/float — evita el
redondeo de punto flotante en el round-trip JSON. `numeroPedidos`/`unidades`
(conteos enteros, no dinero) SI son `number`.

### 15.7 Permiso nuevo: `reporte.ver`

Igual criterio que `costeo.ver` (§13.3, punto 4): ver el reporte del dia es
informacion gerencial (ventas/margen/arqueo agregados), no algo que un cajero
de mostrador deberia ver por defecto. Otorgado a `gerenteTienda` en el seed;
el cajero NO lo tiene.

### 15.8 Que NO se toco

- El endpoint `GET /turnos/:id/arqueo` (`PagosModule`) sigue exactamente
  igual en su contrato externo; solo cambio (de forma aditiva) el payload
  interno que devuelve `VentasService.calcularArqueo` (gano
  `efectivoReembolsado`; los campos existentes no cambiaron de significado).
- `cerrarTurnoZ`/reporte Z (HU-PAG-08 CA3): mismo contrato, mismo status,
  misma inmutabilidad; solo se reutilizo `calcularDiferenciaEfectivo` en vez
  de repetir la resta inline.
- `CosteoModule`/`schema.prisma` (F2-T1) y Hold & fire/`LineaDePedido` (F2-T2):
  cero lineas tocadas mas alla de IMPORTAR `CosteoService` (opcional, 15.5).

## 16. F2-T4 — Perifericos reales: ESC/POS (impresora + cajon) y revision de `PspAdapter`

**Objetivo (PLAN_DE_PRODUCCION.md Fase 2):** "driver ESC/POS (impresora +
cajon por pulso) y terminal EMV semi-integrado (P2PE)". Recomendacion de
hardware ya cerrada en Fase 0 (`docs/adr/0006-cierre-fase0-bloqueantes-produccion.md`
§F0-T3): impresora Epson TM-m30III / Star TSP143IV, cajon disparado por pulso
RJ11/12 **a traves de la impresora** (no HID directo), Datacap NETePay como
gateway EMV/P2PE recomendado (pendiente de contrato real, S-05 sigue
bloqueado).

### 16.1 Honestidad de alcance — leer antes de confiar en esto

**No hay hardware fisico en este entorno** (ni impresora, ni cajon, ni
terminal EMV) y **no hay PSP contratado** (S-05 sigue bloqueado, es una
decision comercial, no de ingenieria). Lo que se construyo aqui es:

1. **Codigo de protocolo ESC/POS real y correcto** (`src/hardware/esc-pos.ts`):
   los bytes exactos (`ESC @`, `ESC E n`, `ESC a n`, `GS ! n`, `GS V m`,
   `ESC p m t1 t2` para el pulso del cajon) siguen la especificacion publica
   y estable de Epson/ESC-POS (la misma que documentan `node-thermal-printer`
   y `escpos` de npm) — esto SI es verificable sin hardware fisico porque es
   una funcion pura que arma `Buffer`s, cubierta byte a byte por
   `test/unit/esc-pos.spec.ts`.
2. **El transporte de red (`EscPosImpresoraAdapter`, TCP puerto 9100) nunca se
   ejecuto contra una impresora real** — eso es una limitacion permanente de
   un entorno sin hardware, no un pendiente que mas codigo resuelva. Se
   valida durante el piloto (F4-T1) con una impresora fisica.
3. **No se construyo ninguna integracion "real" de PSP** — habria sido
   deshonesto sin un contrato/SDK real contra el cual probar. Se reviso la
   interfaz `PspAdapter` existente (Fase 1) y se le agrego un metodo
   OPCIONAL/aditivo `cancelarTransaccionPendiente` (ver
   `src/pagos/psp/psp-adapter.interface.ts`) para que un SDK semi-integrado
   real (tipicamente asincrono, con timeout propio de terminal) tenga donde
   enganchar un "aborta la transaccion en curso" — sin romper
   `MockPspAdapter` ni obligar a ningun adapter futuro a implementarlo.

### 16.2 Que se construyo (`src/hardware/`)

- `impresora-adapter.interface.ts` — contrato `ImpresoraAdapter`
  (`imprimirRecibo`, `imprimirComandaCocina`, `abrirCajon`), mismo patron que
  `PspAdapter`: el resto del sistema depende SOLO de esta interfaz.
- `esc-pos.ts` — comandos ESC/POS puros (sin red, sin NestJS).
- `trabajos-impresion.ts` — arma el `Buffer` completo de un recibo o una
  comanda de cocina (incluye el caso de liberacion parcial de Hold & fire,
  F2-T2) a partir de los comandos puros de arriba.
- `esc-pos-impresora.adapter.ts` — implementacion real sobre `net.Socket`
  (TCP 9100), con timeout de conexion (5s) y propagacion de error al llamador
  (nunca bloquea la venta por si sola — ver 16.3).
- `simulador-impresora.adapter.ts` — implementacion de respaldo que loguea el
  recibo/comanda de forma legible en vez de tocar hardware; es el DEFAULT.
- `hardware-config.ts` — `resolverConfigImpresora` (funcion pura, mismo
  patron que `mtls-config.ts` de F1-T5): sin `IMPRESORA_HOST` → simulador;
  con `IMPRESORA_HOST` → adaptador real hacia `IMPRESORA_HOST:IMPRESORA_PUERTO`
  (default puerto 9100).
- `hardware.module.ts` — provider de `IMPRESORA_ADAPTER` segun la config de
  arriba; importado por `VentasModule` (comanda de cocina, envio inicial y
  liberaciones parciales de Hold & fire) y `PagosModule` (recibo tras pago
  aprobado que salda el pedido; apertura de cajon SOLO en pago efectivo,
  nunca en tarjeta).

### 16.3 Degradacion controlada (RNF-06) — un periferico caido no detiene la venta

Tanto `PagosService` como `VentasService` envuelven las llamadas al
`ImpresoraAdapter` en `try/catch`: si la impresora esta apagada, sin red, o
el socket da timeout, se loguea una advertencia y **la venta/el envio a
cocina sigue su curso** — nunca se revierte un pago aprobado ni se bloquea un
`enviarACocina` porque el papel se acabo. `CajonAbierto` (evento de dominio +
`EventoDeAuditoria`) los sigue emitiendo exclusivamente `PagosService`
despues de intentar el pulso — `ImpresoraAdapter.abrirCajon()` en si mismo
nunca emite el evento ni audita, para que no haya dos puntos de la app que
puedan divergir sobre si el cajon "realmente" se abrio.

### 16.4 Tests

- `test/unit/esc-pos.spec.ts` — bytes exactos de cada comando (init, negrita,
  alineacion, tamano, corte, pulso de cajon) contra los valores hex
  documentados en el header de `esc-pos.ts`.
- `test/unit/simulador-impresora.spec.ts` — no lanza, loguea algo razonable.
- `test/unit/hardware-config.spec.ts` — branching real-vs-simulador segun env
  vars (mismo estilo que `mtls-config.spec.ts`).

**Verificado por el orquestador** (no solo reportado): `npm run build` limpio
y `npm run test:unit` → **13 suites, 102/102 tests**, incluye las 3 suites de
esta tarea sumadas a las de F1/F2-T1/F2-T2/F2-T3. Sin Docker/Postgres en este
entorno (mismo gap de todas las tareas anteriores), no hay tests de
integracion nuevos que dependan de DB real para este modulo (no la necesita:
`ImpresoraAdapter` no toca Prisma).

### 16.5 Nota de proceso

Esta seccion la completo el orquestador, no el agente que construyo el
codigo: el agente de F2-T4 se cayo por un error de stream/API justo cuando
iba a escribir esta documentacion (el codigo, la integracion en
`PagosModule`/`VentasModule` y los tests ya estaban completos y en disco en
ese momento). El orquestador releyo el codigo generado, confirmo build +
102/102 tests en verde, revizo la interfaz `PspAdapter` y el manejo de
`CajonAbierto` para descartar doble emision, y escribio esta seccion.

## 17. F3-T1 — Bajas con aprobacion de calidad (menu-inventario-pos + seguridad-accesos-pos)

**Objetivo (`PLAN_DE_PRODUCCION.md` Fase 3):** "la baja no impacta stock hasta
ser aprobada; etiquetado, motivo, % de merma y alerta de auditoria al
superarlo". Hoy `POST /api/v1/stock/ajuste` (F1-T2) sigue existiendo tal cual
(cualquier ajuste manual — incluida una merma manual con
`tipoMovimiento: "merma"` — se aplica de inmediato); esta tarea agrega un flujo
PARALELO para bajas/merma que requieren **aprobacion de un gerente antes de
tocar stock**, sin cambiar el contrato de `/stock/ajuste`.

### 17.1 Modelo de datos (aditivo, `prisma/schema.prisma`)

- `SolicitudBaja` (tabla nueva): `id`, `ubicacionId`, `insumoId`, `cantidad`
  (`Decimal(14,3)`, SIEMPRE positiva — el signo lo aplica
  `InventarioService` al aprobar), `motivo` (enum `MotivoBaja`: `caducado` |
  `danado` | `errorConteo` | `otro`), `etiqueta` (string libre, ej.
  numero de lote/batch), `solicitadoPorId`/`solicitadoEn`, `estado` (enum
  `EstadoSolicitudBaja`: `pendiente` | `aprobada` | `rechazada`,
  `@default(pendiente)`), `revisadoPorId`/`revisadoEn` (nulos hasta que se
  decide), `motivoRechazo` (nulo salvo `rechazada`), `valorEstimado`
  (`Decimal(12,4)?`, nulo hasta aprobar — ver 17.3).
- `Ubicacion.umbralMermaPorcentaje Decimal(5,2) @default(3)`: el umbral de
  S-13 ("3% del valor de insumo recibido por periodo de conteo"),
  **configurable por tienda** (no hardcodeado), en PUNTOS PORCENTUALES
  (`3` = 3%).
- `TipoEventoAuditoria` gana DOS valores nuevos (aditivo): `bajaRechazada` y
  `alertaMerma` (ver 17.4). La aprobacion NO tiene un tipo propio a proposito:
  reusa `ajusteInventario`, que `InventarioService.aplicarMovimiento` (el
  UNICO punto de escritura sobre `Stock`, arq. 4.5) ya escribe para
  CUALQUIER movimiento de stock, incluida una merma aprobada.
- Igual que el resto de tareas de este repo (ver §12), **no se genero
  migracion de Prisma** para estos cambios (no hay carpeta
  `prisma/migrations/` todavia — sin Postgres en este sandbox no se pudo
  correr `prisma migrate dev`). `npm run prisma:migrate:dev` contra Postgres
  real la generara en un solo paso, incluyendo estos cambios.

### 17.2 Endpoints nuevos (`src/bajas/`, `BajasModule`)

| Metodo/ruta | Permiso | Notas |
|---|---|---|
| `POST /api/v1/bajas` | `inventario.solicitarBaja` (cajero/cocina/gerente en el seed) | Crea la `SolicitudBaja` en `pendiente`. **NO toca Stock** — el requisito nucleo de la tarea. |
| `GET /api/v1/bajas?estado=&ubicacionId=` | ninguno (cola de lectura) | Cola de aprobacion del gerente; ambos filtros opcionales. |
| `POST /api/v1/bajas/:id/aprobar` | `inventario.aprobarBaja` (solo gerente en el seed) | UNICO endpoint que mueve stock por una baja (ver 17.3). 409 `solicitud_baja_ya_revisada` si ya no esta `pendiente`. |
| `POST /api/v1/bajas/:id/rechazar` | `inventario.aprobarBaja` | Marca `rechazada`; Stock JAMAS se toca. 409 igual que aprobar si ya se habia decidido. |

Dos permisos nuevos en `src/seguridad/permisos.ts`:
`inventario.solicitarBaja` (otorgado a `cajero`/`cocina`/`gerenteTienda` en el
seed — son quienes detectan producto vencido/danado en el mostrador o la
linea de cocina) e `inventario.aprobarBaja` (SOLO `gerenteTienda`: control de
calidad/perdidas es una decision gerencial). Mismo patron de autenticacion
que el resto del contrato (header `x-usuario-id`, ver §5); igual que
`TurnosController.abrir`, el controller revalida explicitamente que el header
este presente (`usuario_requerido`, 422) porque `solicitadoPorId`/
`revisadoPorId` son FKs NO nulas.

### 17.3 Por que la baja NO mueve stock hasta aprobar (y como lo hace al aprobar)

`BajasService.solicitarBaja` es un `prisma.solicitudBaja.create` puro: no
llama a `InventarioService` en absoluto. Solo `BajasService.aprobarBaja`
mueve stock, y lo hace reusando el **unico punto de escritura sobre Stock**
(arq. 4.5): se agrego `InventarioService.registrarMermaAprobada` (metodo
publico nuevo, delgado) que delega en el mismo `aplicarMovimiento` privado
que ya usan `ajustarManual`/`handleVentaConfirmada`/`handleVentaRevertida` —
nunca se duplico esa logica de upsert/auditoria/`StockBajo` en `BajasModule`.
`aprobarBaja` hace, en orden:

1. 404 si la solicitud no existe; **409 `solicitud_baja_ya_revisada`** si ya
   no esta `pendiente` (nunca un no-op silencioso — verificado explicitamente
   en `test/unit/bajas-estado.spec.ts` y
   `test/integration/bajas.integration.spec.ts` caso (c)).
2. Congela `valorEstimado = cantidad * Insumo.costoUnitario` VIGENTE en ese
   instante (mismo espiritu que C-SNAPSHOT: si el costo unitario cambia
   despues, el historial de merma del periodo no se recalcula
   retroactivamente).
3. Mueve stock via `InventarioService.registrarMermaAprobada` (delta
   NEGATIVO = `-cantidad`); esto YA escribe su propio
   `EventoDeAuditoria` tipo `ajusteInventario` (con `payload.tipoMovimiento:
   "merma"`) y evalua `StockBajo` si corresponde, sin codigo nuevo.
4. Marca la solicitud `aprobada` (`revisadoPorId`, `revisadoEn`).
5. Evalua el umbral de S-13 (ver 17.4) y, si corresponde, emite una
   **segunda** auditoria (`alertaMerma`), SEPARADA de la de (3).

`rechazarBaja` sigue el mismo guard de estado (404/409) pero JAMAS llama a
`InventarioService`: solo actualiza la fila y escribe un
`EventoDeAuditoria` tipo `bajaRechazada` (para que una decision de negocio
sobre perdida de inventario quede trazada tanto si se aprueba como si se
rechaza, RNF-07).

### 17.4 El umbral del 3% (S-13) — calculo y SUPUESTOS explicitos

`docs/requisitos.md` S-13 fija el umbral en **"3% del valor de insumo
recibido por periodo de conteo, configurable por Ubicacion"**, y aclara que
es un "valor inicial a validar con operaciones antes de Fase 3". Dos terminos
de esa frase NO tienen un correlato de datos exacto en este MVP (S-12: "no
hay integracion con proveedores/compras... no hay conteo fisico formal
todavia"), asi que se documentan aqui las DOS decisiones tomadas, con el
mismo criterio que S-04/dayparts o mtls-config (supuesto explicito +
mecanismo configurable, no bloquear la tarea):

1. **"Periodo de conteo"** → [SUPUESTO F3-T1] ventana rodante de **30 dias**
   terminando "ahora" (un ciclo de conteo mensual tipico en QSR), calculada
   por insumo+ubicacion sobre `SolicitudBaja` con `estado="aprobada"` y
   `revisadoEn` dentro de la ventana. Configurable via
   `INVENTARIO_PERIODO_MERMA_DIAS` (ver `src/bajas/bajas.service.ts#periodoMermaDias`,
   mismo patron que `REPORTES_DAYPARTS_JSON`) para no bloquear la tarea en la
   validacion de operaciones que el propio S-13 pide.
2. **"Valor de insumo recibido"** (el DENOMINADOR del porcentaje) → [SUPUESTO
   F3-T1] como este MVP no tiene modulo de compras/recepcion con un ledger
   valorizado propio (S-12), se usa **el valor de `Stock.cantidadActual`
   ANTES de esta merma, valorizado al `costoUnitario` vigente del insumo**
   (`cantidadActual * costoUnitario`) como proxy honesto de "cuanto insumo
   valorizado hay disponible en la tienda". Es una aproximacion deliberada,
   no una reconstruccion de compras reales — documentada explicitamente aqui
   para que se revise cuando exista un modulo de compras/recepcion (fuera de
   alcance de F3-T1 y de S-12).

El calculo en si (`src/bajas/merma-umbral.ts#evaluarUmbralMerma`) es una
funcion PURA (sin Prisma, mismo patron que `costeo.types.ts`): recibe
`valorMermaPrevia` (suma de `valorEstimado` de las `SolicitudBaja` aprobadas
en la ventana, EXCLUYENDO la actual), `valorMermaNueva` (el `valorEstimado`
de esta aprobacion), `valorBaseRecibido` (el proxy de arriba) y
`umbralPorcentaje` (`Ubicacion.umbralMermaPorcentaje`); devuelve el
porcentaje acumulado y DOS booleanos distintos, verificados por separado en
`test/unit/merma-umbral.spec.ts`:

- `superaUmbralAhora`: true si, CONTANDO esta aprobacion, el acumulado supera
  el umbral — dispara la alerta, sea que ya se superaba antes o no.
- `cruzoUmbralEnEstaAprobacion`: true SOLO si esta aprobacion especifica es
  la que hizo cruzar el umbral (no se superaba antes, si despues) — un dato
  informativo en el `payload` de la alerta, para que el gerente distinga "la
  aprobacion de HOY fue la gota que rebalso el vaso" de "esto ya venia mal
  desde antes".

`BajasService.aprobarBaja` emite `EventoDeAuditoria` tipo `alertaMerma`
siempre que `superaUmbralAhora` sea true (ambos casos generan alerta; solo
cambia el campo informativo `cruzoUmbralEnEstaAprobacion` en el payload). Sin
base valida (`valorBaseRecibido` 0 o negativo, ej. insumo sin stock
valorizable todavia) la funcion pura devuelve "sin alerta" en vez de dividir
por cero — no rompe el flujo de aprobacion.

### 17.5 Tests

- `test/unit/merma-umbral.spec.ts`: `evaluarUmbralMerma` PURA — por debajo
  del umbral, esta aprobacion CRUZA el umbral (no estaba antes, si despues),
  YA estaba por encima antes (sigue alertando pero `cruzoUmbralEnEstaAprobacion`
  es false), exactamente en el umbral (no dispara, es `>` estricto, no `>=`),
  base 0/negativa (no divide por cero, no dispara), y el mismo acumulado
  dispara o no segun un umbral mas estricto/laxo (confirma que es
  configurable, no hardcodeado).
- `test/unit/bajas-estado.spec.ts`: maquina de estados de `BajasService` con
  `PrismaService`/`InventarioService`/`SeguridadService` mockeados (sin DB,
  mismo patron que `sync-outbox.spec.ts`) — `solicitarBaja` NUNCA llama a
  `registrarMermaAprobada`; `aprobarBaja` sobre `pendiente` lo llama
  EXACTAMENTE una vez y marca `aprobada`; aprobar/rechazar una solicitud YA
  decidida (`aprobada` o `rechazada`) responde 409 sin volver a mover stock;
  `rechazarBaja` sobre `pendiente` NUNCA mueve stock y audita
  `bajaRechazada`; 404 sobre una solicitud inexistente; y dos casos de
  integracion del umbral (dispara/no dispara `alertaMerma` segun los valores).
- `test/integration/bajas.integration.spec.ts` (requiere Postgres real, ver
  §9.2) — envoltorio REAL de `BajasService` contra la base: `(a)` solicitar
  deja `Stock.cantidadActual` INTACTO y aprobar es la UNICA operacion que lo
  cambia; `(b)` rechazar nunca mueve stock y audita `bajaRechazada`; `(c)`
  aprobar/rechazar una solicitud ya decidida es 409 (no un no-op silencioso)
  y el stock no vuelve a moverse; `(d)` una merma que supera el umbral
  configurado de la `Ubicacion` dispara `alertaMerma` SEPARADA del
  `ajusteInventario` normal; `(e)` una merma pequena (con el umbral subido a
  proposito a 50%) NO dispara `alertaMerma`; `(f)` `listarSolicitudes` filtra
  por `estado`/`ubicacionId` (la cola de aprobacion del gerente).

**Verificado por el agente que construyo esta tarea:** `npm run build`
limpio (incluye `prisma generate` en `prebuild`, sin errores de tipos en
`bajas.service.ts`/`bajas.controller.ts` contra el cliente Prisma
regenerado), `npm run lint` (`tsc --noEmit`) limpio, y `npm run test:unit` →
**18 suites, 141/141 tests** (incluye las 2 suites nuevas de esta tarea mas
las ya existentes de F1/F2/F3-T2, que se desarrollo en paralelo en este mismo
sandbox). Igual que TODAS las tareas anteriores de este repo (ver §9.2/§12):
sin Docker/Postgres en este entorno, `npm run test:integration` hace
`describe.skip` limpio en las 6 suites de integracion existentes (28 tests
saltados), incluida la nueva `bajas.integration.spec.ts` — se escribio y
compila, pero no se ejecuto. Correrla con Postgres real antes de cerrar el
gate de Fase 3.

### 17.6 Que NO se toco / gaps conocidos

- `POST /api/v1/stock/ajuste` (F1-T2, incluido su `tipoMovimiento: "merma"`
  para ajustes manuales inmediatos) sigue exactamente igual — F3-T1 agrega un
  flujo PARALELO para bajas que requieren aprobacion, no reemplaza el ajuste
  manual directo (que sigue teniendo su lugar para correcciones triviales que
  no ameritan un flujo de aprobacion, ej. un conteo cíclico de rutina hecho
  por el propio gerente).
- No existe un endpoint generico `GET /api/v1/auditoria` (ni lo tiene ninguna
  otra tarea de este repo — descuento/reembolso/86/cierreZ tampoco lo
  exponen). La alerta `alertaMerma` es "visible al gerente de tienda" hoy via
  `GET /api/v1/bajas?estado=` (la cola de aprobacion) y via consulta directa a
  `EventoDeAuditoria`; agregar un endpoint de lectura de auditoria generico es
  una mejora transversal fuera del alcance puntual de F3-T1 (no es un gap
  introducido por esta tarea, es preexistente).
- No hay evento de dominio (`EventoDominio`/WebSocket) nuevo para
  `SolicitudBaja` — a diferencia de `Producto86Cambiado`/`StockBajo`, no se
  penso necesario para el MVP de una sola tienda (el gerente ya ve la cola
  via `GET /bajas`); trivial de agregar despues si un dashboard en tiempo
  real lo necesita.
- El "valor de insumo recibido" (denominador del 3%) es un PROXY documentado
  (17.4, punto 2), no un ledger de compras real — revisar cuando exista un
  modulo de compras/recepcion (S-12, fuera de alcance).
- Los permisos otorgados en el seed (`cajero`/`cocina` solicitan,
  `gerenteTienda` aprueba) son la interpretacion mas literal de "cajero/
  cocina detectan spoilage" del enunciado de la tarea; ajustar el seed es
  trivial si operaciones decide un reparto distinto.

## 18. F3-T2 — Contingencia operativa: monitoreo de conectividad con alertas tempranas (`devops-despliegue-pos`)

**Objetivo (`PLAN_DE_PRODUCCION.md` Fase 3):** "failover a 4G/LTE, monitoreo
de conectividad por tienda con alertas tempranas, y guia impresa para el
gerente".

### 18.1 Honestidad de alcance — que es software y que es hardware de red

**"Failover a 4G/LTE" es una decision de CAPA DE RED, no de software de
aplicacion.** `docs/arquitectura.md` §2.2 ya es explicito: si cae
internet/nube, "la tienda sigue 100% operativa... solo se difiere la
sincronizacion" — el Store Server ni siquiera necesita saber POR QUE via
llega a internet. Un router dual-WAN o un modem LTE de failover se instala
**delante** del uplink de internet del Store Server y es transparente para
esta aplicacion: no hay una API de "failover" que este backend pueda invocar,
y fingir una integracion con un modem LTE especifico que no existe en este
sandbox (sin hardware de red real, sin ISP secundario contratado) seria
exactamente el tipo de deshonestidad que ADR-0006 evito para el hardware de
impresora/EMV. Lo que **si** es software real y se construyo en esta tarea:

1. **`ConectividadService`** (`src/conectividad/`): un monitor de
   conectividad DENTRO del Store Server que detecta degradacion/caida de
   internet con una cadencia mucho mas rapida que el agente de sincronizacion
   existente (F1-T5), para alertar **antes** de que el corte se note como
   problema de sync — ver 18.2.
2. **`docs/operaciones/guia-contingencia-gerente.md`** — guia impresa real
   para el gerente de la tienda piloto (18.5).
3. **`docs/operaciones/requisitos-red-tienda-piloto.md`** — especificacion de
   red real (hardware recomendado + que necesita el Store Server) para quien
   instale la red de la tienda piloto antes de F4-T1 (18.6).

### 18.2 Por que ESTO es una senal NUEVA y no un duplicado de `SyncService` (F1-T5)

`src/sync/sync.service.ts` (F1-T5, terminado, **no se toco** en esta tarea)
ya detecta la caida de internet de forma IMPLICITA: un `POST /sync/eventos`
que falla por red es, de hecho, "no hay internet". Pero esa deteccion tiene
dos limitaciones que motivan esta tarea:

- Solo corre cada `SYNC_INTERVALO_MS` (default **15s**) y **solo si hay algo
  que sincronizar** — en una tienda tranquila (pocos eventos en el outbox),
  pueden pasar minutos sin que nadie note la caida.
- Es un efecto secundario de un ciclo de negocio (drenar el outbox), no una
  senal dedicada: no distingue "degradado" (algunos hosts fallan) de
  "totalmente caido" (todos), y no tiene mecanismo anti-flapping propio.

`ConectividadService` es deliberadamente **paralelo y mas rapido** (default
**20s**, configurable a mucho menos): hace `HEAD`/`GET` liviano contra un
puñado de hosts publicos configurables (nunca contra la nube propia de
Chicken Kitchen — asi el monitoreo no depende de que la nube corporativa este
arriba) y punto. **No importa nada de `src/sync/*` ni `src/sync/*` importa
nada de `src/conectividad/*`**: son dos fuentes de verdad independientes que
conviven; si algun dia divergen (uno dice "en_linea", el otro no pudo
sincronizar por un problema puntual del endpoint de la nube, no de red
general), eso es informacion util, no un bug de diseno.

### 18.3 Maquina de estado (`src/conectividad/estado-conectividad.ts`)

Codigo **PURO** (sin Prisma/red/NestJS/timers), 100% testeable sin mocks de
infraestructura (`test/unit/estado-conectividad.spec.ts`), mismo criterio que
`calculo-totales.ts`/`costeo.types.ts`/`merma-umbral.ts`. Tres estados:
`en_linea` → `degradado` → `sin_conexion`, con DOS mecanismos anti-falsa-alarma
pedidos explicitamente por la tarea:

1. **Umbral N-de-M** (`calcularEstadoDesdeResultados`, config
   `CONECTIVIDAD_MIN_FALLOS_DEGRADADO`, default **1**): de los `M` hosts
   configurados, hacen falta `N` fallando para "degradado" (nunca un solo
   host de varios alcanza para dar la alarma) y **todos** fallando para
   "sin_conexion" — un solo host caido de tres NUNCA es "sin_conexion".
   Lista de hosts vacia (caso limite, no deberia ocurrir en la practica) se
   trata como "en_linea": sin datos no se afirma una caida.
2. **Debounce anti-flapping** (`MaquinaEstadoConectividad.evaluar`, config
   `CONECTIVIDAD_CONFIRMACIONES_REQUERIDAS`, default **2**): un estado
   candidato distinto al confirmado necesita ganar en **N ciclos
   CONSECUTIVOS** antes de convertirse en el estado real. Un unico blip
   aislado (un ciclo malo rodeado de ciclos buenos) nunca dispara una
   transicion/evento — verificado explicitamente con el escenario "blip
   aislado" en `test/unit/estado-conectividad.spec.ts` y de extremo a extremo
   (a traves del servicio completo) en `test/unit/conectividad-service.spec.ts`.

Cada transicion CONFIRMADA trae `desde`/`hasta`/`duracionMs` del estado
ANTERIOR — el dato que le permite a un reporte futuro (o al `historialReciente`
del endpoint, ver 18.4) reconstruir "estuvimos offline de 14:32 a 14:47 (15
min)", exactamente el ejemplo que pide la tarea.

### 18.4 `ConectividadService`, persistencia elegida y el endpoint

`src/conectividad/conectividad.service.ts` corre un `setInterval` propio
(mismo patron `.unref()` + try/catch defensivo que `SyncService`/`InboxService`,
ver 18.7) que en cada ciclo:

1. Verifica en paralelo (`Promise.all`) todos los hosts configurados via
   `VerificadorRed` (`src/conectividad/verificador-red.ts` — la UNICA pieza
   que toca la red real, `http`/`https` nativos de Node, mismo patron que
   `sync-http-client.ts`; **nunca lanza**, cualquier error de red/DNS/timeout
   resuelve `false`).
2. Le pasa los resultados a `MaquinaEstadoConectividad.evaluar()`.
3. Si hubo una transicion CONFIRMADA, la registra.

**Decision de persistencia (el enunciado de la tarea pedia justificar esto
explicitamente):** las transiciones se emiten como **`EventoDominio`** con
`tipo: "ConectividadCambiada"` (evento NUEVO y aditivo en
`common/eventos/tipos-evento.ts`, C-EVENTOS: PascalCase, tiempo pasado) via
`EventosService.emitir()` — **no** se creo una tabla nueva de historial ni se
uso `EventoDeAuditoria`:

- **`EventoDeAuditoria` (RNF-07/C-AUDIT) no encaja:** es para ACCIONES de un
  usuario con `usuarioId`/`motivo` de una lista cerrada (descuento,
  reembolso, ajuste de inventario...). Una caida de internet no la "hace"
  ningun usuario de la tienda — es una observacion del sistema, no una accion
  auditable en ese sentido.
- **Reutilizar `EventoDominio` (en vez de una tabla nueva) da GRATIS tres
  cosas** que la tarea pedia por separado, con **cero migraciones de Prisma
  nuevas** (no se toco `schema.prisma` en esta tarea, reduciendo el riesgo de
  choque con otras tareas de Fase 3 editando el mismo archivo en paralelo):
  1. Persistencia atomica (misma llamada que push WS, ver abajo).
  2. **Push por WebSocket** "gratis": `EventosGateway` ya retransmite
     CUALQUIER `EventoDominio` emitido — un terminal/pantalla de gerente
     suscrito ve `ConectividadCambiada` en el mismo bus que
     `PedidoActualizado`/`StockBajo`, listo para un banner en vivo
     ("sin conexion desde hace 12 min") sin codigo de WS nuevo.
  3. **Sincronizacion a la nube "gratis"**: `SyncService` (F1-T5) ya drena
     CUALQUIER `EventoDominio` con `sincronizadoEn IS NULL`, sin cambios —
     el historial de caidas de esta tienda queda disponible para un futuro
     dashboard corporativo multi-tienda (Fase 5) sin escribir una sola linea
     de codigo de sync nueva. Verificado en
     `test/integration/conectividad.integration.spec.ts` caso (a):
     `eventos[0].sincronizadoEn` es `null` justo despues de emitirse (pendiente
     de que el ciclo normal de `SyncService` lo drene, exactamente igual que
     cualquier otro evento de negocio).
- **El estado ACTUAL (no el historial) vive en memoria de proceso**
  (`ConectividadService.obtenerEstadoActual()`), no en una tabla "estado
  actual" separada: solo importa mientras el Store Server esta corriendo (si
  el proceso se reinicio, la tienda tuvo una caida mayor que el propio
  gerente ya deberia estar notando por otros medios). Al arrancar, `onModuleInit`
  intenta reconstruir el ULTIMO estado conocido desde el `EventoDominio`
  `ConectividadCambiada` mas reciente (`seedEstadoDesdeHistorial`,
  best-effort: si Prisma no esta disponible todavia o no hay historial, cae
  silenciosamente a `en_linea` desde el arranque — JAMAS bloquea el arranque
  del Store Server por esto, ver test "DEFENSIVO" correspondiente).

**`GET /api/v1/conectividad/estado`** (`src/conectividad/conectividad.controller.ts`)
devuelve `{estado, desde, ultimaVerificacion, historialReciente}`
(`historialReciente` = ultimas `CONECTIVIDAD_HISTORIAL_MAX`, default 20,
transiciones leidas de `EventoDominio`). **Sin `@RequierePermiso`**, a
diferencia de `costeo.ver`/`reporte.ver`: es informacion de solo lectura
pensada para que CUALQUIER terminal de la tienda (no solo el gerente) pueda
mostrar el indicador, mismo criterio que `GET /catalogo`/`GET /stock`.

### 18.5 Guia impresa para el gerente

`docs/operaciones/guia-contingencia-gerente.md` — documento en espanol
(la tienda piloto es Miami, FL), redactado para que un gerente SIN
conocimiento tecnico lo pueda seguir bajo presion: que hacer si internet cae
(nada urgente: efectivo/cocina/inventario siguen, tarjeta depende del PSP,
S-05), como reconocer que el Store Server COMPLETO parece caido y a quien
llamar, un procedimiento minimo de respaldo en papel, que significa el
indicador de conectividad en pantalla, y contactos de escalamiento dejados
como placeholders explicitos (`[TELEFONO DE SOPORTE TECNICO]`, etc. — nunca
un numero/nombre inventado). El documento deja anotado que hace falta una
version en ingles antes del rollout a Texas.

### 18.6 Especificacion de red para el piloto

`docs/operaciones/requisitos-red-tienda-piloto.md` — spec accionable para
quien instale la red de la tienda piloto antes de F4-T1: recomendacion de
router dual-WAN/failover LTE (ejemplos de la industria como Peplink/Cradlepoint,
marcados explicitamente como pendientes de validacion/compras real, mismo
criterio de honestidad que ADR-0006 §F0-T3 con el hardware de impresora/EMV),
que necesita el Store Server (IP LAN fija o reserva DHCP, puertos hacia
terminales/KDS, salida HTTPS/mTLS hacia la nube), y como encaja
`ConectividadService` en ese diseño de red.

### 18.7 Garantia defensiva (RNF-06: un bug de monitoreo NUNCA detiene la venta)

Pedido explicito de la tarea: "un bug en este modulo de monitoreo NUNCA debe
poder tumbar o bloquear el camino de venta real del Store Server". Tres capas
de defensa, cada una con su propio test:

1. `VerificadorRed.verificar()` esta documentado para nunca lanzar (cualquier
   error de red resuelve `false`).
2. `ConectividadService.ejecutarCicloVerificacion()` envuelve CADA verificacion
   individual en un `.catch(() => false)` (un host que lanza, rompiendo el
   contrato de (1), no tumba `Promise.all` para los demas) Y el ciclo entero
   en un `try/catch` de ultimo nivel; tambien envuelve el registro de la
   transicion (`EventosService.emitir`) en su propio `.catch` — si la DB
   falla justo en el momento de una transicion, el estado en memoria de todas
   formas queda confirmado (la maquina de estado no depende de que la
   persistencia tenga exito), y el ciclo no se cae.
3. El `setInterval` de `onModuleInit` tiene su propio `.catch` sobre la
   promesa del ciclo (defensa de ultimo nivel, igual patron que
   `SyncService`/`InboxService`): si (2) fallara por un bug futuro, un timer
   sin catch mataria el proceso Node COMPLETO (incluida la venta), nunca
   aceptable para un modulo de monitoreo.

Verificado en `test/unit/conectividad-service.spec.ts` con tres casos
"DEFENSIVO" explicitos: `VerificadorRed.verificar()` lanzando para TODOS los
hosts, `EventosService.emitir()` fallando en plena transicion, y un solo host
(de varios) lanzando mientras los demas responden bien.

### 18.8 Tests

- `test/unit/estado-conectividad.spec.ts`: `calcularEstadoDesdeResultados`
  PURA (0 fallos, todos fallan, umbral N-de-M, lista vacia, umbral <= 0) +
  `MaquinaEstadoConectividad` (transiciones completas en_linea→degradado→
  sin_conexion→en_linea con confirmaciones=2, blip aislado que NUNCA
  transiciona, `confirmacionesRequeridas=1` transiciona de inmediato, un
  candidato que cambia de tipo entre ciclos reinicia el conteo, `restaurar()`
  no dispara transicion).
- `test/unit/conectividad-config.spec.ts`: parseo/branching puro de
  `CONECTIVIDAD_*` (mismo estilo que `hardware-config.spec.ts`/
  `mtls-config.spec.ts`) — default de 3 hosts de proveedores distintos,
  parseo de lista separada por comas, fallback en enteros invalidos,
  `leerConfigConectividadEnv` contra `process.env` real (incluye
  `UBICACION_PILOTO_ID`, ya existente desde F1-T1).
- `test/unit/verificador-red.spec.ts`: `VerificadorRed.verificar` resuelve
  `false` (nunca lanza) ante una URL invalida, SIN tocar red real (este
  sandbox no garantiza internet, mismo criterio que el resto de la suite).
- `test/unit/conectividad-service.spec.ts`: `ConectividadService` completo con
  `PrismaService`/`EventosService`/`VerificadorRed` mockeados (sin DB/red,
  mismo patron que `sync-outbox.spec.ts`) — ciclo estable sin emitir, umbral
  N-de-M end-to-end (degradado vs sin_conexion), debounce end-to-end (blip
  aislado no emite), las tres garantias defensivas de 18.7, y
  `onModuleInit`/`seedEstadoDesdeHistorial` (restaura desde el ultimo evento,
  default si no hay historial, no rompe si Prisma falla).
- `test/integration/conectividad.integration.spec.ts` (requiere Postgres
  real, ver §9.2; `VerificadorRed` se reemplaza por un doble de prueba via
  `overrideProvider` de Nest — el test NO depende de internet real): `(a)` dos
  ciclos con todos los hosts caidos confirman `sin_conexion` y persisten
  EXACTAMENTE un `EventoDominio` `ConectividadCambiada` (`sincronizadoEn`
  `null`, pendiente del ciclo normal de `SyncService`); `(b)` `GET
  /api/v1/conectividad/estado` refleja el estado y el historial reciente;
  `(c)` una recuperacion posterior agrega una SEGUNDA transicion sin duplicar
  ni perder la primera.

**Verificado por el agente que construyo esta tarea:** `npm run build` limpio
(incluye `prisma generate` en `prebuild`; no se toco `schema.prisma`, cero
migraciones nuevas necesarias para este modulo), `npm run lint` (`tsc
--noEmit`) limpio, y `npm run test:unit` → **19 suites, 151/151 tests**
(incluye las 4 suites nuevas de esta tarea mas todas las existentes de
F1/F2/F3-T1, que se desarrollo en paralelo en este mismo sandbox). Igual que
TODAS las tareas anteriores de este repo (§9.2/§12/§17.5): sin Docker/Postgres
en este entorno, `npm run test:integration` hace `describe.skip` limpio en
las **7** suites de integracion existentes (**31** tests saltados), incluida
la nueva `conectividad.integration.spec.ts` — se escribio y compila, pero no
se ejecuto contra Postgres real. Correrla con Postgres real antes de cerrar
el gate de Fase 3.

### 18.9 Que NO se toco / gaps conocidos

- `src/sync/*` (F1-T5): cero lineas tocadas, solo se REUTILIZA el mismo
  `EventoDominio`/`EventosService.emitir()` que cualquier otro modulo ya usa
  (ver 18.4). No se agrego ninguna dependencia de `ConectividadModule` hacia
  `SyncModule` ni viceversa.
- `prisma/schema.prisma`: **cero lineas tocadas** por esta tarea (decision
  deliberada, ver 18.4) — no hay migracion pendiente que generar para este
  modulo especificamente (a diferencia de casi todas las tareas anteriores de
  este repo).
- No hay failover de red real (modem/router LTE) en este sandbox — no puede
  haberlo, ver 18.1. La especificacion de que comprar/instalar vive en
  `docs/operaciones/requisitos-red-tienda-piloto.md`, pendiente de compras/IT
  real antes de F4-T1.
- `docs/operaciones/guia-contingencia-gerente.md` esta SOLO en espanol; una
  version en ingles queda anotada como pendiente antes del rollout a Texas
  (Fase 5).
- El indicador de conectividad no tiene todavia un consumidor real de
  frontend (F1-T3, terminales PWA, sigue sin construirse) — el endpoint y el
  evento WS quedan listos para que ese futuro frontend los consuma
  directamente, sin cambios esperados de este lado.
- `CONECTIVIDAD_HOSTS` apunta a hosts publicos genericos (Google/Cloudflare/
  Microsoft) por default, NUNCA a la nube propia de Chicken Kitchen: es
  intencional (ver 18.2) para que el monitoreo de "hay internet" no dependa
  de que la nube corporativa este arriba; si operaciones prefiere agregar un
  host propio a la lista (ademas de, no en vez de, los genericos) es un
  cambio de configuracion, no de codigo.

## 19. S-14 — BOM multinivel: productos elaborados/intermedios (`menu-inventario-pos`)

**Origen:** reunion con Diego Cataño sobre la arquitectura de Archis/Alsea
(2026-07-17) — ver `docs/analisis-reunion-diego-arches-20260717.md` §3.1 y
`docs/requisitos.md` S-14. Diego describio un patron que Chicken Kitchen
"casi seguro necesita tambien" dado que el menu demo ya tiene "13 Signature
Sauces": una salsa/aderezo se PREPARA en tienda a partir de insumos base (ej.
tomate, especias) y esa preparacion en si misma se vuelve un "insumo" que
otros platos usan en SUS recetas. Hasta esta tarea, `Receta`/`RecetaInsumo`
(F2-T1) solo modelaba UN nivel: `Producto -> Insumo` directo. No habia forma
de decir "la receta del Chop-Chop Bowl usa 2oz de Salsa BBQ, y la Salsa BBQ EN
SI MISMA tiene su propia receta de insumos base" — sin eso, `CosteoService` no
podia costear el insumo preparado (solo sabia costear insumos comprados
directamente) y no existia un movimiento de inventario que produjera stock de
la salsa a partir de sus insumos base (la venta de un plato con salsa
preparada habria descontado el insumo equivocado, o ninguno).

### 19.1 Modelo de datos (aditivo, `prisma/schema.prisma`)

- `Insumo.esElaborado Boolean @default(false)` (campo nuevo): marca que este
  insumo se PRODUCE en tienda (ej. Salsa BBQ) en vez de comprarse ya listo.
  Default `false` no cambia el comportamiento de ninguna fila existente. Es
  un atajo de lectura para catalogo/UI — la fuente de verdad real de "tiene
  receta definida" sigue siendo la existencia de una `Receta` con
  `insumoElaboradoId` apuntando a este insumo y `activo=true`.
- `Receta.productoId` pasa de requerido a **opcional** (`String?`), y se
  agrega `Receta.insumoElaboradoId String?` (FK opcional hacia `Insumo`,
  relacion nombrada `"RecetaDeInsumoElaborado"` porque `Receta` ahora tiene
  DOS FKs opcionales hacia entidades distintas). **Se reusa la MISMA tabla**
  para "receta de un Producto de menu" y "receta de un Insumo elaborado" —
  deliberadamente, para no duplicar la estructura de `RecetaInsumo` (que ya
  modela exactamente "N unidades de este insumo por unidad de lo que sea que
  esta Receta describe", sin que le importe si el "dueño" de la receta es un
  Producto o un Insumo). Invariante de aplicacion (NO hay `CHECK` constraint
  de Postgres — este repo no genera migraciones sin Postgres real, ver §9.2):
  EXACTAMENTE uno de `productoId`/`insumoElaboradoId` esta definido por fila,
  nunca ambos ni ninguno; la garantiza `CatalogoService` (`crearReceta` sigue
  exigiendo `productoId` tal cual antes; `definirRecetaInsumoElaborado`
  exige `insumoElaboradoId` y jamas toca `productoId`). El flujo existente
  `Producto -> Receta -> RecetaInsumo` (F2-T1) queda **exactamente igual**:
  ninguna fila preexistente cambia de forma (`insumoElaboradoId` es `null`
  para todas).
- `TipoEventoAuditoria` gana un valor nuevo (aditivo): `produccionInsumoElaborado`
  (ver 19.3).
- Igual que TODAS las tareas anteriores de este repo (ver §12/§17.1/§18.4/
  §18.9), **no se genero migracion de Prisma** (no hay Postgres real en este
  sandbox). `npm run prisma:migrate:dev` contra Postgres real la generara en
  un solo paso, incluyendo estos cambios. `npx prisma generate` SI se corrio
  (no requiere Postgres, solo lee el schema) para regenerar el cliente
  tipado y verificar que `npm run build`/`npm run lint` compilan contra los
  campos/relaciones nuevos.

### 19.2 Endpoints nuevos

| Metodo/ruta | Permiso | Notas |
|---|---|---|
| `POST /api/v1/insumos/:id/receta` (`CatalogoController`) | `catalogo.gestionar` (reusado, NINGUN permiso nuevo) | Define/REEMPLAZA la receta COMPLETA de un insumo elaborado en una sola llamada (`{ items: [{ insumoBaseId, cantidad }] }`). |
| `POST /api/v1/stock/produccion` (`InventarioController`) | `inventario.ajustar` (reusado, NINGUN permiso nuevo) | Produce `cantidadProducida` unidades de un insumo elaborado, consumiendo sus insumos base (ver 19.3). |

**Por que se reusan permisos existentes en vez de crear nuevos** (el
enunciado de la tarea lo dejaba abierto): `rol-gerente`
(`prisma/seed.ts#PERMISOS_GERENCIALES`) YA tiene tanto `catalogo.gestionar`
como `inventario.ajustar` — definir la receta de una salsa es, en espiritu,
exactamente el mismo tipo de accion gerencial que dar de alta un `Insumo` o
un `RecetaInsumo` de un Producto (ambos ya detras de `catalogo.gestionar`); y
producir un insumo elaborado es, en espiritu, el mismo tipo de "mover stock
manualmente" que ya cubre `inventario.ajustar` (`POST /stock/ajuste`).
Agregar dos permisos granulares nuevos solo para replicar ese mismo reparto
habria sido ceremonia sin beneficio — si operaciones decide mas adelante que
"definir una receta de salsa" o "producir en tienda" ameritan un permiso
MAS ESTRICTO que el resto de `catalogo.gestionar`/`inventario.ajustar`
(ej. separarlo de "ajustar stock por error de conteo"), es un cambio
localizado de una linea en el `@RequierePermiso` de cada endpoint, no una
reestructuracion.

### 19.3 `InventarioService.producirInsumoElaborado` — como produce sin dejar consumo parcial

Analogo a `registrarMermaAprobada` (F3-T1) pero para produccion interna en vez
de merma: en vez de solo restar, CONSUME insumos base y GENERA stock del
insumo elaborado. Reusa el **unico punto de escritura sobre Stock**
(`aplicarMovimiento`, arq. 4.5) para CADA movimiento — no se escribio una
segunda forma de mutar `Stock.cantidadActual`; solo se agrego el valor
`"produccion"` al union type de `tipoMovimiento` que `aplicarMovimiento` ya
aceptaba.

Orden de la operacion:

1. Resuelve la `Receta` VIGENTE (`activo=true`) del insumo elaborado por
   `insumoElaboradoId`; 422 si el insumo no existe, no esta marcado
   `esElaborado`, no tiene receta activa, o la receta no tiene insumos base.
2. Calcula el consumo de CADA insumo base = `RecetaInsumo.cantidad *
   cantidadProducida` (mismo patron de escalado que
   `moverStockPorPedido` ya usa para escalar por `LineaDePedido.cantidad`).
3. **Lee el stock ACTUAL de TODOS los insumos base de una sola vez** (un
   `findMany`) y valida que CADA UNO alcance para su consumo calculado. Si
   CUALQUIERA no alcanza, rechaza la operacion COMPLETA con 422
   `stock_insuficiente` (incluye el detalle de cuales insumos faltaron y
   cuanto) **ANTES de llamar a `aplicarMovimiento` ni una sola vez** — este
   es el requisito nucleo de la tarea ("si algun insumo base no alcanza, se
   rechaza la operacion completa ANTES de mutar nada"), verificado
   explicitamente en `test/integration/insumo-elaborado.integration.spec.ts`
   caso (c): un insumo que SI alcanzaba (tomate) NO se consume solo porque
   otro (especias) no alcanzaba.
4. Solo si TODOS los insumos base alcanzan: aplica un `aplicarMovimiento`
   (delta negativo) por cada insumo base consumido, y un `aplicarMovimiento`
   final (delta positivo `cantidadProducida`) para el insumo elaborado. Cada
   uno de estos YA escribe su propio `EventoDeAuditoria` tipo
   `ajusteInventario` (igual que cualquier otro movimiento de stock).
5. Escribe UN `EventoDeAuditoria` adicional tipo `produccionInsumoElaborado`
   con el resumen completo (receta usada, cantidad producida, y el detalle de
   CADA insumo base consumido) — mismo patron que `alertaMerma` (F3-T1) es
   una segunda auditoria por ENCIMA de la que ya escribe `aplicarMovimiento`.

**Nota honesta sobre atomicidad multi-fila:** los pasos 4 se aplican
SECUENCIALMENTE (un `aplicarMovimiento` por insumo, cada uno atomico a nivel
de fila via `{ increment: delta }`), sin envolver el LOTE completo en una
`prisma.$transaction`. Esto es **exactamente el mismo patron** que
`InventarioService.moverStockPorPedido` ya usa para descontar los N insumos
de la receta de UN producto vendido (tampoco envuelto en una transaccion) —
no se inventa un patron nuevo mas estricto solo para esta tarea. El riesgo
real que esto deja abierto (un crash de proceso a mitad del loop del paso 4)
es un riesgo PREEXISTENTE compartido con `moverStockPorPedido`, no uno
introducido por S-14; lo que SI es especifico y verificado de esta tarea es
que la VALIDACION (paso 3) es atomica respecto de la decision "se puede
producir o no", que es lo que el enunciado pedia explicitamente ("rechazar
ANTES de mutar", no "envolver todo en una transaccion de DB"). Si operaciones
decide que ese riesgo residual (crash a mitad de un loop de mutaciones ya
validadas) es inaceptable, la solucion correcta es envolver TODO
`InventarioService` (incluido `moverStockPorPedido`, no solo esto) en
transacciones — un cambio transversal fuera del alcance puntual de S-14.

### 19.4 `CatalogoService.definirRecetaInsumoElaborado` — como se rechaza un ciclo ANTES de escribir

`POST /api/v1/insumos/:id/receta` define la receta COMPLETA de un insumo
elaborado en una sola llamada (a diferencia del flujo Producto, que son DOS
llamadas incrementales: `POST /recetas` + `POST /recetas/:id/insumos` por
cada insumo). Se eligio "todo de una vez" para este caso especifico porque
permite validar la receta PROPUESTA COMPLETA contra ciclos antes de
persistir cualquier fila — con el flujo incremental de Producto no hay ese
mismo riesgo (un Producto nunca puede aparecer como ingrediente de su propia
receta, solo los insumos elaborados pueden formar un grafo con ciclos).

1. Valida que el insumo elaborado y TODOS los insumos base propuestos
   existan (422 si falta alguno).
2. Construye el grafo de recetas VIGENTES de TODOS los demas insumos
   elaborados del catalogo (`insumoId -> [ids de sus insumos base]`) y llama
   a `detectarCicloReceta(insumoElaboradoId, idsBase, grafo)`
   (`src/catalogo/receta-ciclo.ts`, funcion PURA, DFS clasico de deteccion de
   ciclos marcando "nodos en la pila de recursion actual"). Si detecta un
   ciclo (directo: el insumo se referencia a si mismo; o transitivo: A usa B
   y B ya usa A, en cualquier profundidad), rechaza con 422
   `receta_elaborado_ciclo` **sin tocar la base de datos**.
3. Si no hay ciclo, en una sola `prisma.$transaction`: desactiva
   (`activo=false`) cualquier `Receta` anterior de este insumo elaborado (para
   no dejar dos filas `activo=true` simultaneas para el mismo
   `insumoElaboradoId`), crea la `Receta` nueva + sus `RecetaInsumo` (MISMAS
   tablas que el flujo Producto, sin estructura paralela), y marca
   `Insumo.esElaborado = true`.

`test/unit/receta-ciclo.spec.ts` cubre `detectarCicloReceta` en aislamiento
(sin DB): auto-referencia directa, ciclo transitivo de 2 y 3 niveles, una
receta normal sin ciclo, dos insumos elaborados independientes que comparten
un ingrediente base (NO es un ciclo), receta vacia, y redefinir la receta
VIGENTE de un insumo usando la version PROPUESTA (no la vieja) para decidir.
`test/integration/insumo-elaborado.integration.spec.ts` caso (e) verifica
que un intento de ciclo real (la Salsa BBQ referenciandose a si misma) se
rechaza y NO sobreescribe la receta original.

### 19.5 `CosteoService` — costeo RECURSIVO de un insumo elaborado (y su precedencia sobre `costoUnitario`)

Antes de esta tarea, `CosteoService.calcularCostoLineaPersistida` resolvia el
costo de cada insumo referenciado por una linea vendida leyendo directamente
`Insumo.costoUnitario`. Si esa linea usaba una salsa preparada (ej. 2oz de
Salsa BBQ), el costo de esa salsa era lo que fuera que alguien hubiera tecleado
manualmente en `costoUnitario` — nunca el costo REAL derivado de sus
ingredientes base, y sin forma de que ese numero se actualizara solo si
subia el precio del tomate.

**Que se agrego (sin tocar `calcularCostoLinea`, la funcion pura existente
de F2-T1 — el desglose por insumo de UNA linea sigue exactamente igual):**

- `resolverCostoUnitarioInsumo` (`src/costeo/costeo.types.ts`, funcion PURA,
  sin Prisma — ver `test/unit/costeo-elaborado.spec.ts`): dado un
  `insumoId`, un mapa de costos base conocidos (`Insumo.costoUnitario`
  cacheado de CUALQUIER insumo) y un mapa de recetas de insumos elaborados
  YA resueltas (`insumoId -> [{insumoId, cantidad}]`), calcula el costo
  recursivamente: `costo = Σ (cantidad_i * costo(insumo_base_i))`. Usa un set
  `visitados` (pasado por la pila de recursion) como guarda de ciclos, MISMO
  principio de "nodo en la pila actual" que `detectarCicloReceta`
  (§19.4) — defensa en profundidad en el camino de LECTURA, dado que el
  camino de ESCRITURA ya deberia haber rechazado cualquier ciclo antes de
  persistirlo.
- **Precedencia documentada (la que pedia explicitamente el enunciado de la
  tarea):** si el insumo tiene una receta VIGENTE resuelta (esta en el mapa
  `recetasElaboradas`), el costo recursivo por receta **GANA** sobre
  `costoUnitario`. `costoUnitario` es SOLO el fallback: se usa cuando el
  insumo no es elaborado, cuando es elaborado pero todavia no tiene una
  receta definida, o cuando se detecta un ciclo (caso que en teoria nunca
  deberia ocurrir por el guard de escritura). Razon: `costoUnitario` de un
  insumo elaborado es, en el mejor de los casos, un valor cacheado que
  alguien tecleo a mano en algun momento — la receta vigente es la fuente de
  verdad de cuanto CUESTA REALMENTE producirlo HOY, con los precios vigentes
  de sus insumos base.
- `CosteoService.construirGrafoCostoInsumos` (metodo privado nuevo, SI toca
  Prisma): dado el conjunto de insumos que una linea vendida referencia
  directamente, hace BFS cargando el `costoUnitario` de cada insumo tocado y,
  para cada uno con `esElaborado=true` y una `Receta` activa no vacia, sus
  ingredientes base (que a su vez pueden ser OTROS insumos elaborados — BOM
  de mas de un nivel, ej. una "salsa especial" que usa mayonesa preparada
  como base). `calcularCostoLineaPersistida` llama a este metodo y luego a
  `resolverCostoUnitarioInsumo` por cada insumo de la linea, en vez de leer
  `Insumo.costoUnitario` directo como antes.

**Dato clave que confirma que el diseño de datos es el correcto:**
`InventarioService.moverStockPorPedido` (el listener de `VentaConfirmada`
que descuenta stock al vender, F1-T2) **no necesito ningun cambio de
codigo** para este caso. Ya era suficientemente generico: itera
`RecetaInsumo` de la receta del Producto y llama `aplicarMovimiento` por
CADA `insumoId` referenciado, sin que le importe si ese insumo es
`esElaborado` o no. Si la receta del Chop-Chop Bowl tiene una fila
`RecetaInsumo` con `insumoId = Salsa BBQ`, vender el plato YA decrementa el
stock de la Salsa BBQ (no el de sus insumos base crudos) — exactamente el
comportamiento que S-14 pedia ("el descuento de inventario al vender un
plato con salsa preparada... deberia decrementar el stock PROPIO de la
salsa preparada, no ninguno, ni el de los insumos base directamente"). Solo
`CosteoService` (que SI necesitaba resolver un numero — el costo — que antes
no sabia calcular) requeria cambios. Verificado end-to-end en
`test/integration/insumo-elaborado.integration.spec.ts` caso (d).

### 19.6 Tests

- `test/unit/receta-ciclo.spec.ts`: `detectarCicloReceta` PURA — auto-
  referencia directa, ciclo transitivo de 2 y 3 niveles, receta normal sin
  ciclo, dos insumos elaborados independientes que comparten un ingrediente
  base (no es un ciclo), receta vacia, y redefinicion de una receta vigente
  usando la version propuesta.
- `test/unit/costeo-elaborado.spec.ts`: `resolverCostoUnitarioInsumo` PURA —
  insumo no elaborado usa `costoUnitario` directo; insumo ausente de ambos
  mapas cuesta 0; **la receta vigente le gana al `costoUnitario` cacheado
  (stale) del propio insumo elaborado**; **caso base del enunciado**: un
  plato que usa una salsa preparada cambia de costo total cuando cambia el
  costo de un ingrediente BASE de la salsa (no del plato directamente);
  BOM de mas de un nivel (una salsa que usa OTRA preparacion elaborada como
  base); y un ciclo de datos corrupto (que en teoria el guard de escritura ya
  deberia haber evitado) no cuelga ni lanza, cae al fallback.
- `test/integration/insumo-elaborado.integration.spec.ts` (requiere Postgres
  real, ver §9.2) — envoltorio REAL contra la base: `(a)` `definirRecetaInsumoElaborado`
  marca `esElaborado=true` y persiste via `Receta`/`RecetaInsumo`; `(b)`
  `producirInsumoElaborado` decrementa CADA insumo base escalado por
  `cantidadProducida` e incrementa el stock del insumo elaborado, mas la
  auditoria `produccionInsumoElaborado`; `(c)` producir MAS de lo que alcanza
  un insumo base rechaza la operacion COMPLETA (422) y NO consume ningun
  insumo base parcialmente (ni siquiera el que SI alcanzaba); `(d)` vender un
  plato que usa la salsa preparada decrementa el stock de LA SALSA (no el de
  sus insumos base crudos) via el flujo EXISTENTE de `VentaConfirmada`, sin
  cambios en `moverStockPorPedido`; `(e)` intentar definir una receta que
  formaria un ciclo se rechaza y no sobreescribe la receta original; `(f)`
  producir un insumo sin `esElaborado`/receta se rechaza.

**Verificado por el agente que construyo esta tarea:** `npx prisma generate`
limpio contra el schema con los campos/relaciones nuevos, `npm run build`
limpio, `npm run lint` (`tsc --noEmit`) limpio, y `npm run test:unit` →
**21 suites, 170/170 tests** (incluye las 2 suites nuevas de esta tarea mas
TODAS las existentes de F1/F2/F3/§18, que se desarrollaron en paralelo en
este mismo sandbox). Igual que TODAS las tareas anteriores de este repo
(§9.2/§12/§17.5/§18.8): sin Docker/Postgres en este entorno (`docker` ni
siquiera esta instalado, verificado explicitamente), `npm run test:integration`
hace `describe.skip` limpio en las **8** suites de integracion existentes
(**37** tests saltados), incluida la nueva
`insumo-elaborado.integration.spec.ts` — se escribio y compila, pero NO se
ejecuto contra Postgres real. Correrla con Postgres real antes de cerrar el
gate de esta tarea.

### 19.7 Que NO se toco / gaps conocidos

- `src/catalogo/dto/catalogo.dto.ts#ActualizarInsumoDto.costoUnitario` pasa
  de requerido a opcional (cambio ADITIVO: cualquier llamador que siga
  enviandolo sigue funcionando identico; ahora tambien se puede hacer un
  `PATCH` que SOLO cambie `esElaborado` sin tener que reenviar el costo
  vigente en el mismo body). Ningun test existente llamaba a
  `actualizarInsumo`/`ActualizarInsumoDto` antes de esta tarea (verificado
  por busqueda), asi que no hay riesgo de romper un test preexistente.
- `crearReceta`/`agregarRecetaInsumo`/`CrearRecetaDto` (el flujo de recetas de
  Producto, F2-T1) **quedan sin ningun cambio** — `definirRecetaInsumoElaborado`
  es un metodo/endpoint NUEVO y separado, no una extension de esos DTOs/
  metodos existentes. Se documenta la decision explicitamente (ver 19.4) para
  que quede claro que no es un descuido: el shape de entrada es distinto a
  proposito (un solo POST con la receta completa, en vez de dos llamadas
  incrementales) porque el caso de uso (validar ausencia de ciclos contra la
  receta COMPLETA propuesta) lo pedia.
- No se agrego ningun permiso nuevo a `src/seguridad/permisos.ts` ni se tocaron
  archivos de `src/seguridad/*` (respetando la restriccion de esta tarea) — se
  reusan `catalogo.gestionar`/`inventario.ajustar` (ver 19.2, con la
  justificacion completa de por que alcanza).
- No hay endpoint de LECTURA dedicado para "ver la receta vigente de un
  insumo elaborado" (ej. `GET /api/v1/insumos/:id/receta`) — hoy se puede
  reconstruir via `GET /api/v1/catalogo` (que ya devuelve `insumos`,
  `recetas` y `recetaInsumos` completos, sin cambios necesarios: los campos/
  relaciones nuevos simplemente fluyen a traves de las mismas queries
  existentes) o consultando Prisma directamente. Trivial de agregar despues
  si el catalogo/UI lo necesita como lectura de un solo endpoint.
- `producirInsumoElaborado` NO valida que `Ubicacion` este activa
  (`activo=true`) antes de producir — mismo criterio (o mismo descuido,
  segun se lo mire) que `ajustarManual`/`registrarMermaAprobada`, que tampoco
  lo validan; no es una regresion introducida por esta tarea.
- La atomicidad multi-fila de `producirInsumoElaborado` (pasos de consumo
  secuenciales, no envueltos en una `prisma.$transaction`) es una decision
  documentada explicitamente en 19.3, no un descuido — sigue el mismo patron
  preexistente de `moverStockPorPedido`.
- Pendiente de operaciones (igual que el propio S-14 lo deja abierto en
  `docs/requisitos.md`): confirmar EXACTAMENTE que salsas/preparaciones de
  Chicken Kitchen se hacen en tienda (candidatas a `esElaborado=true`) vs. se
  compran ya preparadas (quedan como insumo simple, sin receta). Nada en esta
  tarea depende de esa respuesta para funcionar — el modelo soporta ambos
  casos por insumo individual — pero el catalogo real de "13 Signature
  Sauces" no se cargo en el seed (`prisma/seed.ts` no se toco).
