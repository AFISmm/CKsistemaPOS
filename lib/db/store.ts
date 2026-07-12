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
import { getSeedCatalogo } from "../data/catalog";
import { getSeedRrhh, usuariosAdicionalesRrhh } from "../data/rrhh-seed";

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
  db.roles.push(
    {
      id: "rol-cajero",
      nombre: "cajero",
      permisos: ["pedido.crear", "pedido.cobrar", "producto.marcar86"],
    },
    {
      id: "rol-cocina",
      nombre: "cocina",
      permisos: ["cocina.actualizarEstado"],
    },
    {
      id: "rol-gerente",
      nombre: "gerenteTienda",
      permisos: [
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
        // se agregan aqui, otorgados SOLO a gerente de tienda, porque esas
        // pantallas son informacion/operacion gerencial (ver decision
        // documentada en lib/navigation/modulos.ts).
        "reportes.ver",
        "empleados.gestionar",
        "nomina.ver",
      ],
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
  const cat = getSeedCatalogo();
  db.categorias.push(...cat.categorias);
  db.productos.push(...cat.productos);
  db.combos.push(...cat.combos);
  db.gruposModificador.push(...cat.gruposModificador);
  db.modificadores.push(...cat.modificadores);
  db.insumos.push(...cat.insumos);
  db.recetas.push(...cat.recetas);
  db.recetaInsumos.push(...cat.recetaInsumos);
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
  return g.__ckPosDb;
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
