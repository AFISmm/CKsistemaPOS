/**
 * Almacen en memoria (DEMO) — simula el "Store Server" de la tienda piloto.
 *
 * ADVERTENCIA DE DESVIACION DE ARQUITECTURA (autorizada solo para esta demo):
 * La arquitectura aprobada (ADR-0001/0002) usa un Store Server local por tienda con
 * PostgreSQL y offline-first fuera de la ruta critica de nube. Vercel es serverless y
 * sin estado persistente, por lo que esta demo usa un SINGLETON EN MEMORIA sobre
 * globalThis. Es una simulacion de validacion funcional, NO la arquitectura de
 * produccion. El estado puede reiniciarse entre invocaciones frias de Vercel.
 *
 * Dueno de este archivo (infra de integracion): orquestador-pos.
 * Los modulos de dominio NO deben redefinir colecciones aqui; solo leer/escribir via getDb().
 */

import type {
  Categoria,
  Combo,
  Empleado,
  EstadoBloqueoPin,
  EstadoVerificacionFacial,
  EventoDeAuditoria,
  GrupoModificador,
  HorarioTurno,
  Insumo,
  LineaDePedido,
  LineaModificador,
  Marcaje,
  Modificador,
  Notificacion,
  Pago,
  Pedido,
  Producto,
  Receta,
  ReciboDePago,
  RecetaInsumo,
  ReglaDeImpuesto,
  Rol,
  Stock,
  Turno,
  Ubicacion,
  Usuario,
} from "../domain/types";
// Catalogo real (Fase A, 2026-07-22): reemplaza al catalogo DEMO fabricado de
// lib/data/catalog.ts (que queda en el repo solo como referencia/fallback, ya
// no se usa aqui) por datos reales importados de Recetario_Simplificado.xlsx.
// Ver lib/data/catalog-real.ts y scripts/importar-recetario.js.
import { getSeedCatalogo } from "../data/catalog-real";
import { getSeedRrhh, usuariosAdicionalesRrhh } from "../data/rrhh-seed";
import { Redis } from "@upstash/redis";

export interface Db {
  ubicaciones: Ubicacion[];
  reglasImpuesto: ReglaDeImpuesto[];
  categorias: Categoria[];
  productos: Producto[];
  combos: Combo[];
  gruposModificador: GrupoModificador[];
  modificadores: Modificador[];
  insumos: Insumo[];
  recetas: Receta[];
  recetaInsumos: RecetaInsumo[];
  stock: Stock[];
  pedidos: Pedido[];
  pagos: Pago[];
  turnos: Turno[];
  usuarios: Usuario[];
  roles: Rol[];
  eventos: EventoDeAuditoria[];
  // ---- Modulo Empleados/Nomina (owner: rrhh-personal-pos / nomina-pos) ----
  empleados: Empleado[];
  horariosTurno: HorarioTurno[];
  marcajes: Marcaje[];
  recibosPago: ReciboDePago[];
  // ---- Chequeo de inicio de jornada: TOTP + verificacion facial (owner: rrhh-personal-pos, etapa 2) ----
  bloqueosVerificacionFacial: EstadoVerificacionFacial[];
  // ---- Seguridad de acceso (Fase A, revision 2026-07-22): bloqueo por intentos fallidos de PIN, ver lib/auth/bloqueoPin.ts ----
  bloqueosPin: EstadoBloqueoPin[];
  // ---- Shell de UI (owner: etapa 1 de este proyecto) ----
  notificaciones: Notificacion[];
  seeded: boolean;
}

// ----- Utilidades -----

export function uid(): string {
  // DEMO: UUID v4. Produccion pide v7 ordenable (C-ID).
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return "id-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function ahora(): string {
  return new Date().toISOString();
}

/** ID canonico de la tienda piloto demo (Miami, FL). */
export const UBICACION_PILOTO_ID = "ubic-miami-fl";

/**
 * ID canonico del rol "developer" (cuentas @digeniusai.com, acceso total —
 * ver PERMISOS_GERENCIALES/sembrar() abajo y lib/auth/registro.ts). Se
 * exporta como constante para que ningun consumidor (server-side) tenga que
 * repetir el string literal "rol-developer" sin contexto. Usado, entre otros,
 * por GET /api/v1/empleados (excluirDevelopers=true) para que las cuentas de
 * administracion del sistema no aparezcan en las listas operativas de la
 * tienda (/empleados, /nomina, /perfiles).
 */
export const ROL_DEVELOPER_ID = "rol-developer";

function crearDbVacia(): Db {
  return {
    ubicaciones: [],
    reglasImpuesto: [],
    categorias: [],
    productos: [],
    combos: [],
    gruposModificador: [],
    modificadores: [],
    insumos: [],
    recetas: [],
    recetaInsumos: [],
    stock: [],
    pedidos: [],
    pagos: [],
    turnos: [],
    usuarios: [],
    roles: [],
    eventos: [],
    empleados: [],
    horariosTurno: [],
    marcajes: [],
    recibosPago: [],
    bloqueosVerificacionFacial: [],
    bloqueosPin: [],
    notificaciones: [],
    seeded: false,
  };
}

/**
 * Semilla base cross-cutting: ubicaciones (FL + TX), reglas de impuesto DEMO,
 * roles, usuarios y un turno abierto en la tienda piloto. El catalogo (productos,
 * recetas, stock) proviene de lib/data/catalog.ts (owner: menu-inventario-pos).
 */
function sembrar(db: Db): void {
  // Ubicaciones
  db.ubicaciones.push(
    {
      id: UBICACION_PILOTO_ID,
      codigo: "MIA-72",
      nombre: "Chicken Kitchen — Miami (SW 72nd St)",
      estado: "FL",
      zonaHoraria: "America/New_York",
      direccion: "15738 SW 72nd Street, Miami, FL",
      moneda: "USD",
      activo: true,
      // DEMO: secreto TOTP fijo (etapa 2, ver lib/jornada/totp.ts). Produccion:
      // secreto aleatorio fuerte, aprovisionado/rotado de forma segura por tienda.
      secretoTotp: "demo-totp-secret-mia-72nd-st-v1",
      // Fase A (revision 2026-07-22 seccion 2.1): tienda piloto = mostrador
      // (contador, sin meseros) -> cobrar ANTES de enviar a cocina, ver
      // lib/sales/engine.ts.
      modoOperacion: "mostrador",
    },
    {
      id: "ubic-austin-tx",
      codigo: "AUS-01",
      nombre: "Chicken Kitchen — Austin (demo)",
      estado: "TX",
      zonaHoraria: "America/Chicago",
      direccion: "Demo location, Austin, TX",
      moneda: "USD",
      activo: true,
      secretoTotp: "demo-totp-secret-austin-v1",
      // Ubicacion demo sembrada en "mesa" A PROPOSITO: demuestra que el flujo
      // clasico (cobrar despues de cocina) sigue siendo un camino real y
      // funcional, no solo codigo muerto (ver lib/sales/engine.ts).
      modoOperacion: "mesa",
    }
  );

  // Reglas de impuesto DEMO (confirmar con finanzas — S-06/S-08)
  db.reglasImpuesto.push(
    {
      id: "tax-fl-miamidade",
      ubicacionId: UBICACION_PILOTO_ID,
      jurisdiccion: "FL / Miami-Dade",
      nombre: "Sales Tax FL (demo)",
      tasa: 0.07,
      vigenteDesde: "2026-01-01",
      vigenteHasta: null,
      aplicaAExentos: false,
    },
    {
      id: "tax-tx-austin",
      ubicacionId: "ubic-austin-tx",
      jurisdiccion: "TX",
      nombre: "Sales Tax TX (demo)",
      tasa: 0.0825,
      vigenteDesde: "2026-01-01",
      vigenteHasta: null,
      aplicaAExentos: false,
    }
  );

  // Roles (RBAC MVP)
  // Lista completa de permisos otorgados a gerente de tienda Y a developer
  // (ver rol-developer abajo): se centraliza en una constante para que ambos
  // roles queden sincronizados sin duplicar el array literal.
  const PERMISOS_GERENCIALES = [
    "pedido.crear",
    "pedido.cobrar",
    "pedido.descuento.autorizar",
    "pago.reembolso",
    "inventario.ajustar",
    "turno.cierreZ",
    "producto.marcar86",
    // ---- Permisos agregados por el shell de UI (etapa 1) ----
    // No existia un permiso RBAC natural para "ver reportes", "gestionar
    // personal" o "ver nomina" en el MVP de backend-ventas/rrhh-personal;
    // se agregan aqui, otorgados a gerente de tienda y developer, porque esas
    // pantallas son informacion/operacion gerencial (ver decision
    // documentada en lib/navigation/modulos.ts).
    "reportes.ver",
    "empleados.gestionar",
    "nomina.ver",
    // El gerente de tienda (y developer) tambien deben poder ver la pantalla
    // de cocina (supervisan todo el local): sin este permiso, el sidebar no
    // mostraba "Pantalla de Cocina" (unico permiso sembrado para /kds es
    // "cocina.actualizarEstado", ver rol-cocina arriba).
    "cocina.actualizarEstado",
    // Permiso para el boton "Gestionar perfiles" del sidebar (shell de UI):
    // lista de Usuario + cambio de PIN. No existia un permiso RBAC natural
    // para "administrar cuentas de acceso"; se otorga a gerente de tienda y
    // developer porque cambiar el PIN de otro usuario es una operacion de
    // seguridad/gerencial, no de mostrador ni cocina. Ver
    // components/shell/Sidebar.tsx y components/shell/GestionarPerfilesModal.tsx.
    "usuarios.gestionar",
    // Permiso para el modulo "Gestion de Menu" del sidebar (/menu, owner:
    // menu-inventario-pos). El dueno de producto pidio explicitamente que el
    // perfil de desarrollador (y por extension gerente de tienda, via esta
    // misma constante) pueda agregar platos nuevos al catalogo. No existia un
    // permiso RBAC natural para "administrar el catalogo/menu" en el MVP; se
    // agrega aqui con el mismo criterio que reportes.ver/empleados.gestionar/
    // nomina.ver: es una operacion gerencial, no de mostrador ni cocina.
    "menu.gestionar",
  ];

  // % DEMO de reparto de propinas por rol (Fase B, revision 2026-07-22
  // seccion "reparto de propinas por rol/puntos" — ver Rol.porcentajePropinaDemo
  // en lib/domain/types.ts y lib/propinas/reparto.ts): `[SUPUESTO]`, valores
  // de arranque PENDIENTES de confirmacion real de negocio, editables por un
  // gerente en /propinas. Suman 100 entre los roles que SI participan:
  //  - cajero (60%): rol de mostrador, contacto directo con el cliente que
  //    cobra y suele recibir la propina en efectivo primero.
  //  - cocina (40%): la propina de mostrador se considera un pozo comun del
  //    turno (no "propina de mesa" de un mesero especifico), asi que cocina
  //    participa igual que en un reparto por puntos clasico de QSR.
  //  - gerenteTienda/developer (0%): en EE.UU. las reglas de "tip pooling"
  //    de la FLSA (Fair Labor Standards Act) tipicamente EXCLUYEN a gerentes/
  //    supervisores de los fondos de propina de sus empleados; se modela ese
  //    supuesto por defecto (0%) aunque sigue siendo editable en la UI si la
  //    tienda decide lo contrario.
  const PORCENTAJE_PROPINA_DEMO_CAJERO = 60;
  const PORCENTAJE_PROPINA_DEMO_COCINA = 40;
  const PORCENTAJE_PROPINA_DEMO_GERENCIAL = 0;

  db.roles.push(
    {
      id: "rol-cajero",
      nombre: "cajero",
      permisos: ["pedido.crear", "pedido.cobrar", "producto.marcar86"],
      porcentajePropinaDemo: PORCENTAJE_PROPINA_DEMO_CAJERO,
    },
    {
      id: "rol-cocina",
      nombre: "cocina",
      permisos: ["cocina.actualizarEstado"],
      porcentajePropinaDemo: PORCENTAJE_PROPINA_DEMO_COCINA,
    },
    {
      id: "rol-gerente",
      nombre: "gerenteTienda",
      permisos: PERMISOS_GERENCIALES,
      porcentajePropinaDemo: PORCENTAJE_PROPINA_DEMO_GERENCIAL,
    },
    {
      // Cuenta de desarrolladores/staff de Digenius (correos @digeniusai.com,
      // ver DOMINIO_DEVELOPERS en lib/auth/registro.ts). A pedido del dueno
      // de producto: estos correos no pasan por aprobacion de un gerente
      // (se auto-activan al registrarse, ver registrarEmpleado) y tienen
      // acceso TOTAL al portal — son quienes otorgan permisos a los demas
      // empleados (via Gestionar Perfiles/Completar onboarding) y cargan la
      // informacion operativa. Mismos permisos que gerente de tienda hoy
      // (es el techo de acceso ya modelado en este MVP); si se agregan
      // permisos nuevos en el futuro, deberian otorgarse aqui tambien.
      id: ROL_DEVELOPER_ID,
      nombre: "developer",
      permisos: PERMISOS_GERENCIALES,
      // Cuenta de administracion del sistema, no personal de tienda: no
      // participa en el reparto de propinas (mismo criterio que gerencial).
      porcentajePropinaDemo: PORCENTAJE_PROPINA_DEMO_GERENCIAL,
    }
  );

  // Usuarios demo (PIN en claro NO se guarda; hash simple de demo)
  db.usuarios.push(
    {
      id: "user-cajero-demo",
      ubicacionId: UBICACION_PILOTO_ID,
      nombre: "Cajero Demo",
      pinHash: "demo:1234",
      rolId: "rol-cajero",
      activo: true,
    },
    {
      id: "user-gerente-demo",
      ubicacionId: UBICACION_PILOTO_ID,
      nombre: "Gerente Demo",
      pinHash: "demo:9999",
      rolId: "rol-gerente",
      activo: true,
    }
  );

  // Catalogo (owner: menu-inventario-pos)
  //
  // FIX (Fase A, 2026-07-22, encontrado al escribir pruebas de auto-86 — ver
  // reporte de la tarea): `getSeedCatalogo()` devuelve arrays de objetos
  // literales definidos UNA sola vez a nivel de modulo (ver
  // lib/data/catalog-recetario.generado.ts / lib/data/catalog.ts), asi que
  // sin clonar, cada llamada a `sembrar()` empujaba las MISMAS instancias de
  // objeto a `db.*`. Como `Producto.disponible86` (entre otros campos) se
  // MUTA en sitio (ver marcar86 / verificarAuto86PorInsumo en
  // lib/inventory/inventario.ts), esas mutaciones quedaban "pegadas" al
  // objeto semilla compartido: `resetDb()` NO devolvia de verdad el producto
  // a su estado sembrado original entre resets (ej. un producto marcado 86
  // seguia 86 despues de "reiniciar la demo"). `structuredClone` asegura que
  // cada `sembrar()` parta de instancias nuevas e independientes.
  const cat = getSeedCatalogo();
  db.categorias.push(...structuredClone(cat.categorias));
  db.productos.push(...structuredClone(cat.productos));
  db.combos.push(...structuredClone(cat.combos));
  db.gruposModificador.push(...structuredClone(cat.gruposModificador));
  db.modificadores.push(...structuredClone(cat.modificadores));
  db.insumos.push(...structuredClone(cat.insumos));
  db.recetas.push(...structuredClone(cat.recetas));
  db.recetaInsumos.push(...structuredClone(cat.recetaInsumos));
  for (const s of cat.stockInicial) {
    db.stock.push({
      id: uid(),
      ubicacionId: UBICACION_PILOTO_ID,
      insumoId: s.insumoId,
      cantidadActual: s.cantidadActual,
      actualizadoEn: ahora(),
    });
  }

  // Personal DEMO (owner: rrhh-personal-pos): empleados, horarios y marcajes
  // historicos. Dos empleados reutilizan los Usuario de login ya sembrados
  // arriba (cajero/gerente demo) para que las propinas de la demo de POS se
  // puedan liquidar de inmediato en /nomina; el resto trae su propio Usuario.
  db.usuarios.push(...usuariosAdicionalesRrhh);
  const rrhh = getSeedRrhh();
  db.empleados.push(...rrhh.empleados);
  db.horariosTurno.push(...rrhh.horariosTurno);
  db.marcajes.push(...rrhh.marcajesIniciales);

  // Notificaciones DEMO del shell de UI (panel de campana). Estaticas por
  // ahora: produccion las emitiria cada modulo de dominio al ocurrir el
  // evento real (producto86, alertaAsistencia, nominaGenerada, etc.).
  const haceMinutos = (min: number) => new Date(Date.now() - min * 60_000).toISOString();
  db.notificaciones.push(
    {
      id: uid(),
      ubicacionId: UBICACION_PILOTO_ID,
      tipo: "inventario",
      titulo: "Producto agotado: revisa inventario",
      mensaje: "Un insumo cayo por debajo del umbral de stock bajo en Miami, FL.",
      leida: false,
      entidadRelacionadaHref: "/reportes",
      creadaEn: haceMinutos(12),
    },
    {
      id: uid(),
      ubicacionId: UBICACION_PILOTO_ID,
      tipo: "personal",
      titulo: "Nuevo empleado en onboarding",
      mensaje: "Hay un empleado recien dado de alta pendiente de completar su onboarding.",
      leida: false,
      entidadRelacionadaHref: "/empleados",
      creadaEn: haceMinutos(45),
    },
    {
      id: uid(),
      ubicacionId: UBICACION_PILOTO_ID,
      tipo: "nomina",
      titulo: "Nomina lista para revision",
      mensaje: "El calculo de nomina del periodo actual esta listo para que un gerente lo revise.",
      leida: false,
      entidadRelacionadaHref: "/nomina",
      creadaEn: haceMinutos(90),
    },
    {
      id: uid(),
      ubicacionId: UBICACION_PILOTO_ID,
      tipo: "pedido",
      titulo: "Comandas activas en cocina",
      mensaje: "Hay pedidos esperando en la pantalla de cocina (KDS).",
      leida: true,
      entidadRelacionadaHref: "/kds",
      creadaEn: haceMinutos(150),
    },
    {
      id: uid(),
      ubicacionId: UBICACION_PILOTO_ID,
      tipo: "sistema",
      titulo: "Bienvenido al nuevo panel",
      mensaje: "Ahora puedes cambiar de idioma y modo oscuro desde la barra superior.",
      leida: false,
      entidadRelacionadaHref: null,
      creadaEn: haceMinutos(200),
    }
  );

  // Turno abierto en la tienda piloto (para poder vender desde el arranque)
  db.turnos.push({
    id: "turno-demo-piloto",
    ubicacionId: UBICACION_PILOTO_ID,
    usuarioAperturaId: "user-cajero-demo",
    abiertoEn: ahora(),
    cerradoEn: null,
    fondoInicial: 20000, // $200.00
    efectivoContado: null,
    diferencia: null,
    estado: "abierto",
    reporteZ: null,
    ultimoNumeroOrden: 0,
  });

  db.seeded = true;
}

const g = globalThis as unknown as { __ckPosDb?: Db };

/** Devuelve el almacen singleton, sembrandolo la primera vez. */
export function getDb(): Db {
  if (!g.__ckPosDb) {
    g.__ckPosDb = crearDbVacia();
    sembrar(g.__ckPosDb);
  }
  return g.__ckPosDb;
}

/** Reinicia el almacen a su estado sembrado (util para la demo / pruebas). */
export function resetDb(): Db {
  g.__ckPosDb = crearDbVacia();
  sembrar(g.__ckPosDb);
  // Tambien limpiamos la copia persistida en Redis (fire-and-forget: no
  // convertimos resetDb() en async para no romper los llamadores sincronos
  // existentes -- rutas API y pruebas unitarias en lib/sales/__tests__ que
  // invocan resetDb() de forma sincrona). Si Redis no esta configurado o
  // falla, no pasa nada: el proximo cold start igual arranca con el estado
  // sembrado por defecto (misma funcion sembrar() de arriba), asi que el
  // resultado observable es identico.
  void borrarDbEnRedis();
  return g.__ckPosDb;
}

// ----- Persistencia en Redis (Upstash) -----
//
// PROBLEMA QUE RESUELVE ESTA SECCION: en Vercel (serverless) cada invocacion
// puede caer en una instancia nueva del proceso, que pierde por completo
// `globalThis.__ckPosDb`. Antes de tener esto, un pedido creado hace unos
// minutos podia "desaparecer" (ej. error real de usuario: "Pedido X no
// existe" al tocar un plato) simplemente porque la siguiente invocacion cayo
// en una instancia distinta sin ese estado en memoria.
//
// SOLUCION (demo): ademas del singleton en memoria de arriba, cada request de
// la API hidrata ese singleton desde Redis al empezar y lo vuelve a persistir
// a Redis al terminar (ver conPersistencia() abajo). Redis (Upstash, cliente
// REST/fetch, sin conexiones TCP persistentes) actua como la "fuente de
// verdad" que sobrevive al reciclaje de instancias; la memoria sigue siendo
// solo una copia de trabajo rapida para el resto del request.
//
// NOTA DE ESCALA (simplificacion de demo, igual que las demas notas de este
// archivo): serializamos el objeto Db COMPLETO como un unico blob JSON en
// cada request. Para esta demo (pocos empleados/pedidos) son unos pocos KB y
// no vale la pena optimizar mas. Con carga real (muchas ubicaciones, miles de
// pedidos/eventos de auditoria) esto NO escalaria: habria que granularizar
// por coleccion (ej. una clave de Redis por pedido/turno/empleado, o un hash)
// para no leer/escribir todo el estado en cada llamada.

const CLAVE_REDIS = "ck-pos:db:v1";

/**
 * Cliente de Redis (Upstash) si las variables de entorno estan configuradas,
 * o null si no (por ejemplo en pruebas unitarias locales sin .env.local
 * completo). Nunca lanza: si falta configuracion, simplemente seguimos
 * funcionando solo en memoria (mejor que romper la demo).
 */
function obtenerClienteRedis(): Redis | null {
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) return null;
  try {
    return Redis.fromEnv();
  } catch {
    return null;
  }
}

/**
 * Hidrata el singleton en memoria con el ultimo estado guardado en Redis (si
 * existe), MUTANDO el mismo objeto (no reasignando la referencia `g.__ckPosDb`)
 * para que cualquier variable que ya haya capturado `getDb()` en este mismo
 * request siga apuntando al objeto correcto. Si Redis no esta configurado o
 * falla, seguimos con lo que haya en memoria: nunca debe romper la request.
 */
export async function hidratarDb(): Promise<Db> {
  const db = getDb();
  const redis = obtenerClienteRedis();
  if (!redis) return db;
  try {
    const datos = await redis.get<Db>(CLAVE_REDIS);
    if (datos && typeof datos === "object") {
      for (const clave of Object.keys(datos) as (keyof Db)[]) {
        (db as any)[clave] = (datos as any)[clave];
      }
    }
  } catch {
    // Redis no disponible: seguimos con el estado en memoria que haya.
  }
  return db;
}

/** Persiste el estado actual del singleton a Redis. Nunca lanza. */
export async function persistirDb(): Promise<void> {
  const redis = obtenerClienteRedis();
  if (!redis) return;
  try {
    await redis.set(CLAVE_REDIS, getDb());
  } catch {
    // No bloqueamos la respuesta de la API si Redis falla al guardar.
  }
}

/** Borra la copia persistida en Redis (usado por resetDb()). Nunca lanza. */
async function borrarDbEnRedis(): Promise<void> {
  const redis = obtenerClienteRedis();
  if (!redis) return;
  try {
    await redis.del(CLAVE_REDIS);
  } catch {
    // Ignoramos: el proximo cold start arranca igual con el estado sembrado.
  }
}

/**
 * Envuelve el cuerpo de un handler de ruta API: hidrata el singleton desde
 * Redis antes de ejecutar el handler (logica de negocio SINCRONA existente,
 * sin cambios) y persiste el resultado a Redis despues, incluso si el handler
 * lanza (para no perder escrituras parciales intencionales; si el handler
 * lanza antes de mutar nada, persistir de todas formas es una operacion
 * idempotente y no causa dano).
 */
export async function conPersistencia<T>(fn: () => Promise<T> | T): Promise<T> {
  await hidratarDb();
  try {
    return await fn();
  } finally {
    await persistirDb();
  }
}

/** Devuelve el turno abierto de una ubicacion (o el primero abierto). */
export function turnoAbierto(ubicacionId: string = UBICACION_PILOTO_ID): Turno | undefined {
  return getDb().turnos.find(
    (t) => t.ubicacionId === ubicacionId && t.estado === "abierto"
  );
}

/** Registra un evento de auditoria append-only (C-AUDIT). */
export function registrarEvento(
  evento: Omit<EventoDeAuditoria, "id" | "ocurridoEn">
): EventoDeAuditoria {
  const e: EventoDeAuditoria = { id: uid(), ocurridoEn: ahora(), ...evento };
  getDb().eventos.push(e);
  return e;
}

// Re-export para conveniencia de los modulos.
export type { LineaDePedido, LineaModificador };
