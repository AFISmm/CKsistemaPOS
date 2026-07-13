/**
 * Contrato de tipos compartido — DEMO POS Chicken Kitchen.
 *
 * Fuente: docs/arquitectura.md seccion 5 (modelo de datos, 19 entidades).
 * Restricciones aplicadas:
 *  - C-NOMBRES: entidades PascalCase, campos camelCase (en espanol).
 *  - C-DINERO: TODOS los montos son ENTEROS DE CENTAVOS (number). Nunca float de dolares.
 *              Ej: 1099 = $10.99. Usar formatearDinero() para mostrar.
 *  - C-SNAPSHOT: LineaDePedido y Pago congelan precios al vender.
 *  - C-TENANT: toda entidad transaccional lleva ubicacionId.
 *  - C-PCI: en Pago solo token + ultimos4, nunca PAN/CVV.
 *
 * Nota demo: los ids se generan con crypto.randomUUID (v4). El contrato de produccion
 * pide UUID v7 ordenable; se documenta como simplificacion de demo.
 */

// ---------- Enums / uniones ----------

export type EstadoUbicacion = "FL" | "TX";

export type CanalPedido =
  | "mostrador"
  | "kiosco"
  | "online"
  | "delivery"
  | "catering";

export type EstadoPedido =
  | "abierto"
  | "enviadoCocina"
  | "enPreparacion"
  | "listo"
  | "entregado"
  | "cobrado"
  | "cancelado";

/** Estado de cocina por linea/ticket (flujo KDS: recibido -> preparando -> listo). */
export type EstadoCocina = "recibido" | "preparando" | "listo";

export type MetodoPago = "efectivo" | "tarjeta" | "otro";

export type EstadoPago =
  | "aprobado"
  | "rechazado"
  | "pendiente"
  | "reembolsado"
  | "encolado"; // store-and-forward offline (demo)

export type TipoModificador = "agregar" | "sin" | "sustituir";

export type EstadoTurno = "abierto" | "cerrado";

export type TipoEventoAuditoria =
  | "descuentoAplicado"
  | "reembolso"
  | "cancelacion"
  | "ajusteInventario"
  | "aperturaCajon"
  | "producto86"
  | "cierreZ"
  | "ventaConfirmada"
  | "pagoRegistrado"
  // ---- Modulo Empleados/Nomina (rrhh-personal-pos / nomina-pos) ----
  | "altaEmpleado"
  | "bajaEmpleado"
  | "cambioRolEmpleado"
  | "alertaAsistencia"
  | "nominaGenerada";

// ---------- Empleados / turnos de trabajo / asistencia (owner: rrhh-personal-pos) ----------
// NOTA DE NOMBRES: `Turno` (arriba) es el turno DE CAJA/registradora (apertura/cierre Z).
// `HorarioTurno` es el turno DE TRABAJO programado de un Empleado. Son conceptos
// distintos y no deben confundirse ni reutilizarse entre si.

export type EstadoEmpleado = "onboarding" | "activo" | "inactivo";

export interface Empleado {
  id: string;
  ubicacionId: string;
  nombre: string;
  email: string;
  telefono: string;
  rolId: string;
  fechaContratacion: string; // ISO date (YYYY-MM-DD)
  estado: EstadoEmpleado;
  /** Tarifa por hora en CENTAVOS (C-DINERO), usada por nomina-pos. */
  tarifaHoraCentavos: number;
  /** Link opcional al Usuario de login (rol RBAC/PIN). Se crea al completar onboarding. */
  usuarioId: string | null;
  /** Motivo de baja (solo si estado === "inactivo"). */
  motivoBaja: string | null;
  /**
   * AGREGADO EN ETAPA 1 (auto-registro desde /login): SOLO los ULTIMOS 4
   * digitos del SSN (Social Security Number), NUNCA el numero completo.
   * Mismo principio que C-PCI en `Pago` (solo token + ultimos4, nunca
   * PAN/CVV) y que la verificacion facial simulada de `Marcaje` (nunca datos
   * biometricos reales): esta demo se despliega publicamente en internet
   * (Vercel) sin autenticacion real de servidor, asi que el dato sensible se
   * minimiza DESDE EL ORIGEN — el cliente nunca envia ni el servidor nunca
   * almacena el SSN completo (ver app/api/v1/auth/registrar/route.ts y
   * lib/auth/registro.ts, que rechazan cualquier valor que no sean EXACTAMENTE
   * 4 digitos). `null` = no aplica (empleados semilla existentes, o
   * empleados dados de alta manualmente por un gerente sin este dato).
   * Produccion: dato real de SSN completo requeriria cifrado en reposo,
   * control de acceso estricto (least privilege) y cumplimiento normativo
   * (ver nota de cumplimiento en README-DEMO.md).
   */
  ssnUltimos4: string | null;
  creadoEn: string;
}

/** Turno de trabajo PROGRAMADO de un empleado (no confundir con `Turno` de caja). */
export interface HorarioTurno {
  id: string;
  empleadoId: string;
  ubicacionId: string;
  fecha: string; // ISO date (YYYY-MM-DD)
  horaInicioProgramada: string; // "HH:MM" 24h, hora local de la tienda (demo)
  horaFinProgramada: string; // "HH:MM" 24h
}

export type TipoMarcaje = "entrada" | "salida";

/**
 * AGREGADO EN ETAPA 2 (chequeo de inicio de jornada — ver lib/jornada/*):
 * metodo por el que se verifico la identidad de ESE marcaje especifico.
 *  - "facial": verificacion facial SIMULADA (exitosa) + codigo TOTP de la
 *    pantalla central de la tienda (prueba de presencia fisica).
 *  - "pinRespaldo": plan B tras agotar 3 intentos faciales fallidos; PIN de
 *    respaldo contra Usuario.pinHash (no prueba presencia fisica).
 */
export type MetodoVerificacionMarcaje = "facial" | "pinRespaldo";

/**
 * Evento de reloj checador (marcaje). Modelo inspirado en proveedores tipo
 * XmartClock (marcaje movil/desktop, geofencing, verificacion de identidad),
 * pero es 100% DEMO: `dentroDeGeofence` e `identidadVerificada` son flags
 * SIMULADOS desde la UI (checkboxes "simular fuera de zona" / "simular fallo
 * de verificacion"), no hay GPS ni reconocimiento facial real. Ver README-DEMO.md.
 *
 * Desde etapa 2, este mismo registro tambien es la salida del flujo de
 * "chequeo de inicio de jornada" (TOTP + verificacion facial simulada desde
 * el celular del empleado, ver lib/jornada/*): ese flujo llama a
 * `registrarMarcaje` (lib/rrhh/asistencia.ts) con overrides explicitos de
 * `dentroDeGeofence`/`identidadVerificada` (no los checkboxes de simulacion)
 * y ademas puebla `metodoVerificacion`.
 */
export interface Marcaje {
  id: string;
  empleadoId: string;
  ubicacionId: string;
  tipo: TipoMarcaje;
  timestamp: string; // ISO datetime
  /** Simulado (o, desde etapa 2, "true" real cuando el codigo TOTP probo presencia): dentro del geofence de la tienda. */
  dentroDeGeofence: boolean;
  /** Simulado (o, desde etapa 2, "true" real cuando paso verificacion facial simulada / PIN de respaldo): identidad verificada. */
  identidadVerificada: boolean;
  /** Calculado contra HorarioTurno del dia (si existe) al momento del marcaje "entrada". */
  tardanza: boolean;
  /** AGREGADO EN ETAPA 2: metodo de verificacion. `null` = marcaje legado/semilla o del flujo manual /empleados/[id] (no distinguen metodo). */
  metodoVerificacion: MetodoVerificacionMarcaje | null;
}

/**
 * AGREGADO EN ETAPA 2 (chequeo de inicio de jornada): estado de intentos de
 * verificacion facial por empleado. Vive en el store en memoria
 * (Db.bloqueosVerificacionFacial, ver lib/db/store.ts) igual que el resto del
 * estado DEMO. NO es un evento auditable (EventoDeAuditoria): es estado
 * transitorio de seguridad para el bloqueo temporal de 5 minutos tras 3
 * fallos consecutivos (ver lib/jornada/bloqueo.ts).
 */
export interface EstadoVerificacionFacial {
  empleadoId: string;
  intentosFallidosConsecutivos: number;
  /** ISO datetime hasta el cual el metodo facial esta bloqueado para este empleado; null = no bloqueado. */
  bloqueadoHasta: string | null;
}

/**
 * Recibo de pago (paystub) — owner: nomina-pos.
 * Dinero en CENTAVOS enteros (C-DINERO); horas en MINUTOS enteros (mismo
 * principio: nunca floats para cantidades que se suman/reportan).
 */
export interface ReciboDePago {
  id: string;
  empleadoId: string;
  periodoInicio: string; // ISO date (YYYY-MM-DD), inclusive
  periodoFin: string; // ISO date (YYYY-MM-DD), inclusive
  horasRegularesMin: number; // minutos enteros
  horasExtraMin: number; // minutos enteros
  propinasCentavos: number;
  brutoCentavos: number; // salario (regular + extra), sin propinas
  retencionCentavos: number; // retencion DEMO (ver lib/nomina/calculo.ts)
  netoCentavos: number; // bruto - retencion + propinas
  generadoEn: string; // ISO datetime
}

/** Semilla demo de personal (owner: rrhh-personal-pos), analoga a SeedCatalogo. */
export interface SeedRrhh {
  empleados: Empleado[];
  horariosTurno: HorarioTurno[];
  /** Marcajes historicos (ultimas ~2 semanas) para poder correr nomina de demo sin marcar manualmente. */
  marcajesIniciales: Marcaje[];
}

// ---------- Entidades ----------

export interface Ubicacion {
  id: string;
  codigo: string;
  nombre: string;
  estado: EstadoUbicacion;
  zonaHoraria: string;
  direccion: string;
  moneda: "USD";
  activo: boolean;
  /**
   * AGREGADO EN ETAPA 2 (chequeo de inicio de jornada): secreto TOTP (RFC 6238
   * simplificado, ver lib/jornada/totp.ts) usado para generar/validar el
   * codigo de 6 digitos que rota cada 10s en la pantalla central de la
   * tienda (/jornada/pantalla). NUNCA se expone al celular del empleado ni se
   * devuelve en ningun endpoint publico; solo se lee server-side. DEMO:
   * valor fijo sembrado en lib/db/store.ts (produccion: secreto aleatorio
   * fuerte por tienda, con aprovisionamiento/rotacion seguros).
   */
  secretoTotp: string;
}

export interface ReglaDeImpuesto {
  id: string;
  ubicacionId: string;
  jurisdiccion: string;
  nombre: string;
  /** Tasa decimal, ej 0.07 = 7%. DEMO: confirmar con finanzas (S-06/S-08). */
  tasa: number;
  vigenteDesde: string;
  vigenteHasta: string | null;
  aplicaAExentos: boolean;
}

export interface Categoria {
  id: string;
  nombre: string;
  orden: number;
  activo: boolean;
}

export interface Producto {
  id: string;
  categoriaId: string;
  nombre: string;
  descripcion: string;
  /** Precio base en CENTAVOS. */
  precioBase: number;
  gravable: boolean;
  esCombo: boolean;
  disponible86: boolean; // true = disponible; false = agotado (86)
  activo: boolean;
}

export interface ComboComponente {
  grupoSeleccion: string;
  obligatorio: boolean;
  /** ids de Producto elegibles para este slot. */
  opciones: string[];
}

export interface Combo {
  id: string;
  productoId: string;
  componentes: ComboComponente[];
}

export interface GrupoModificador {
  id: string;
  productoId: string;
  nombre: string;
  minSelecciones: number;
  maxSelecciones: number;
  obligatorio: boolean;
}

export interface Modificador {
  id: string;
  grupoModificadorId: string;
  nombre: string;
  /** Delta de precio en CENTAVOS (0 si "sin X"). */
  precioDelta: number;
  disponible86: boolean;
  tipo: TipoModificador;
}

export interface Insumo {
  id: string;
  nombre: string;
  unidadMedida: string;
  umbralStockBajo: number;
}

export interface Receta {
  id: string;
  productoId: string;
  activo: boolean;
}

export interface RecetaInsumo {
  id: string;
  recetaId: string;
  insumoId: string;
  cantidad: number;
}

export interface Stock {
  id: string;
  ubicacionId: string;
  insumoId: string;
  cantidadActual: number;
  actualizadoEn: string;
}

export interface LineaModificador {
  id: string;
  lineaDePedidoId: string;
  modificadorId: string;
  descripcion: string; // snapshot
  precioDelta: number; // snapshot, centavos
  tipo: TipoModificador;
}

export interface LineaDePedido {
  id: string;
  pedidoId: string;
  productoId: string;
  descripcion: string; // snapshot del nombre
  cantidad: number;
  precioUnitario: number; // snapshot, centavos (incluye deltas de modificadores)
  subtotalLinea: number; // centavos = precioUnitario * cantidad
  gravable: boolean; // snapshot
  notas: string;
  estadoCocina: EstadoCocina;
  modificadores: LineaModificador[];
}

export interface Pedido {
  id: string;
  ubicacionId: string;
  turnoId: string;
  numeroOrden: number; // secuencial por turno (RN-06)
  nombreCliente: string;
  canal: CanalPedido;
  estado: EstadoPedido;
  subtotal: number; // centavos
  descuentoTotal: number; // centavos
  impuestoTotal: number; // centavos
  propinaTotal: number; // centavos
  total: number; // centavos
  lineas: LineaDePedido[];
  creadoEn: string;
  cerradoEn: string | null;
}

export interface Pago {
  id: string;
  pedidoId: string;
  turnoId: string;
  metodo: MetodoPago;
  monto: number; // centavos (sin propina)
  propina: number; // centavos
  estado: EstadoPago;
  pspTokenId: string | null; // token del PSP, NUNCA PAN (C-PCI)
  pspReferencia: string | null;
  ultimos4: string | null;
  marca: string | null;
  montoRecibido: number | null; // efectivo entregado, centavos
  cambio: number | null; // centavos
  creadoEn: string;
}

export interface Turno {
  id: string;
  ubicacionId: string;
  usuarioAperturaId: string;
  abiertoEn: string;
  cerradoEn: string | null;
  fondoInicial: number; // centavos
  efectivoContado: number | null;
  diferencia: number | null;
  estado: EstadoTurno;
  reporteZ: ReporteZ | null;
  ultimoNumeroOrden: number; // para asignar numeroOrden secuencial
}

export interface ReporteZ {
  generadoEn: string;
  totalVentas: number;
  totalEfectivo: number;
  totalTarjeta: number;
  totalPropinas: number;
  totalImpuestos: number;
  totalDescuentos: number;
  numeroPedidos: number;
}

export interface Rol {
  id: string;
  nombre: string;
  permisos: string[];
}

export interface Usuario {
  id: string;
  ubicacionId: string;
  nombre: string;
  pinHash: string; // DEMO: hash simple; produccion bcrypt/argon2 (S-10)
  rolId: string;
  activo: boolean;
}

export interface EventoDeAuditoria {
  id: string;
  ubicacionId: string;
  usuarioId: string | null;
  tipo: TipoEventoAuditoria;
  agregadoTipo: string;
  agregadoId: string;
  motivo: string;
  payload: Record<string, unknown>;
  ocurridoEn: string;
}

// ---------- Notificaciones (owner: shell de UI, etapa 1) ----------

export type TipoNotificacion =
  | "inventario"
  | "personal"
  | "nomina"
  | "pedido"
  | "sistema";

/**
 * Notificacion mostrada en el panel de campana de la barra superior.
 * DEMO: se siembran unas pocas notificaciones estaticas en lib/db/store.ts;
 * no hay generacion automatica en tiempo real todavia (produccion las
 * emitiria desde los modulos de dominio correspondientes al ocurrir el
 * evento, ej. producto86, alertaAsistencia, nominaGenerada).
 */
export interface Notificacion {
  id: string;
  ubicacionId: string;
  tipo: TipoNotificacion;
  titulo: string;
  mensaje: string;
  leida: boolean;
  /** Ruta interna a la que navegar al hacer click (null = sin destino). */
  entidadRelacionadaHref: string | null;
  creadaEn: string;
}

// ---------- Semilla de catalogo (owner: menu-inventario-pos) ----------

export interface SeedCatalogo {
  categorias: Categoria[];
  productos: Producto[];
  combos: Combo[];
  gruposModificador: GrupoModificador[];
  modificadores: Modificador[];
  insumos: Insumo[];
  recetas: Receta[];
  recetaInsumos: RecetaInsumo[];
  /** Nivel de stock inicial por insumo (para la ubicacion piloto). */
  stockInicial: { insumoId: string; cantidadActual: number }[];
}

// ---------- Utilidades de dinero (C-DINERO) ----------

/** Formatea centavos a string USD. Ej: 1099 -> "$10.99". */
export function formatearDinero(centavos: number): string {
  return `$${(centavos / 100).toFixed(2)}`;
}

/** Convierte dolares (float) a centavos (int) de forma segura. Ej: 10.99 -> 1099. */
export function aCentavos(dolares: number): number {
  return Math.round(dolares * 100);
}
