/**
 * Catalogo de claves de permiso granulares (RNF-08, arquitectura.md §7.1).
 * Usar SIEMPRE estas constantes (no strings sueltos) para evitar typos entre
 * el decorador @RequierePermiso y la semilla de Rol.permisos.
 */
export const PERMISOS = {
  PEDIDO_CREAR: "pedido.crear",
  PEDIDO_COBRAR: "pedido.cobrar",
  PEDIDO_DESCUENTO_AUTORIZAR: "pedido.descuento.autorizar",
  PAGO_REEMBOLSO: "pago.reembolso",
  INVENTARIO_AJUSTAR: "inventario.ajustar",
  TURNO_CIERRE_Z: "turno.cierreZ",
  TURNO_ABRIR: "turno.abrir",
  PRODUCTO_MARCAR_86: "producto.marcar86",
  CATALOGO_GESTIONAR: "catalogo.gestionar",
  CAJON_ABRIR: "cajon.abrir",
  /// F2-T1: ver costo/margen real de un pedido (dato sensible de COGS, no es
  /// lo que ve un cajero de mostrador por defecto).
  COSTEO_VER: "costeo.ver",
  /// F2-T3: ver el reporte del dia (ventas/mix/arqueo/daypart, HU-REP-01) —
  /// dato gerencial, no lo ve un cajero de mostrador por defecto.
  REPORTE_VER: "reporte.ver",
  /// F3-T1: crear una SolicitudBaja (NO mueve stock). Otorgado a cajero/cocina
  /// tambien: son quienes detectan producto vencido/danado en el mostrador o
  /// la linea de cocina, no solo el gerente.
  INVENTARIO_SOLICITAR_BAJA: "inventario.solicitarBaja",
  /// F3-T1: aprobar/rechazar una SolicitudBaja — SOLO aprobar mueve stock
  /// (via InventarioService, mismo permiso protege ambos endpoints). Acción
  /// gerencial (control de calidad/perdidas), no otorgada a cajero/cocina.
  INVENTARIO_APROBAR_BAJA: "inventario.aprobarBaja",
  /// Gap de la matriz de requerimientos de Alsea (ver
  /// docs/analisis-reunion-diego-arches-20260717.md §7.2 #1): modificar o
  /// eliminar una línea que YA fue enviada a cocina requiere este permiso;
  /// editar una línea que TODAVÍA no se envió sigue sin requerir permiso
  /// (acción rutinaria de toma de pedido, igual que hold & fire F2-T2).
  PEDIDO_MODIFICAR_ENVIADO: "pedido.modificarEnviado",
} as const;

export type ClavePermiso = (typeof PERMISOS)[keyof typeof PERMISOS];

/** Pura, sin dependencias de framework/DB: testeable en aislamiento. */
export function tienePermiso(permisosUsuario: string[], permisoRequerido: string): boolean {
  return permisosUsuario.includes(permisoRequerido);
}
