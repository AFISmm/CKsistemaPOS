/**
 * Nombres canonicos de eventos del bus local (arquitectura.md §6.3, C-EVENTOS).
 * PascalCase, tiempo pasado. NO renombrar: kds-cocina-pos y el futuro
 * frontend PWA (F1-T3) se suscriben por estos nombres exactos.
 */
export const EVENTOS_DOMINIO = {
  PEDIDO_ACTUALIZADO: "PedidoActualizado",
  TICKET_ENVIADO_A_COCINA: "TicketEnviadoACocina",
  ESTADO_COCINA_CAMBIADO: "EstadoCocinaCambiado",
  VENTA_CONFIRMADA: "VentaConfirmada",
  VENTA_REVERTIDA: "VentaRevertida",
  PRODUCTO_86_CAMBIADO: "Producto86Cambiado",
  STOCK_BAJO: "StockBajo",
  PAGO_REGISTRADO: "PagoRegistrado",
  CAJON_ABIERTO: "CajonAbierto",
  /// F3-T2 (monitoreo de conectividad, PLAN_DE_PRODUCCION.md Fase 3): cambio
  /// de estado de conectividad a internet detectado por ConectividadService
  /// (en_linea/degradado/sin_conexion). Evento NUEVO y aditivo (C-EVENTOS):
  /// reutiliza el outbox EventoDominio existente (se sincroniza a la nube con
  /// el MISMO mecanismo de F1-T5, sin codigo nuevo de sync) y el bus WS
  /// (EventosGateway) para que un terminal/pantalla de gerente muestre un
  /// banner en vivo ("sin conexion desde hace 12 min"). Ver src/conectividad/.
  CONECTIVIDAD_CAMBIADA: "ConectividadCambiada",
} as const;

export type TipoEventoDominio = (typeof EVENTOS_DOMINIO)[keyof typeof EVENTOS_DOMINIO];

/** Envelope obligatorio de todo evento del bus (arquitectura.md §6.3, fin). */
export interface EnvelopeEvento<TPayload = unknown> {
  id: string;
  tipo: TipoEventoDominio | string;
  ubicacionId: string;
  ocurridoEn: string; // ISO datetime
  version: number;
  payload: TPayload;
}

export interface EmitirEventoInput<TPayload = unknown> {
  tipo: TipoEventoDominio | string;
  ubicacionId: string;
  agregadoTipo: string;
  agregadoId: string;
  payload: TPayload;
  version?: number;
}

/**
 * Payloads compartidos entre VentasModule (emisor) e InventarioModule
 * (suscriptor via @OnEvent) para VentaConfirmada/VentaRevertida
 * (arquitectura.md §6.3, "Contrato interno de descuento de stock"). Viven en
 * common/ (no en ventas/ ni inventario/) para que ningun modulo tenga que
 * importar al otro: ambos dependen solo de este contrato de tipos.
 */
export interface LineaVendidaPayload {
  lineaDePedidoId: string;
  productoId: string;
  cantidad: number;
}

export interface VentaConfirmadaPayload {
  pedidoId: string;
  ubicacionId: string;
  turnoId: string;
  lineas: LineaVendidaPayload[];
}

export interface VentaRevertidaPayload extends VentaConfirmadaPayload {
  motivo: string;
}

/**
 * Payload de `ConectividadCambiada` (F3-T2). `estadoAnterior`/`estadoNuevo`
 * son los mismos 3 valores de `EstadoConectividad` (src/conectividad/
 * estado-conectividad.ts) repetidos aqui como `string` para no crear una
 * dependencia circular entre common/eventos (usado por TODO el backend) y un
 * modulo de dominio especifico — mismo criterio que el resto de payloads de
 * este archivo (LineaVendidaPayload, etc.), que tampoco importan tipos de
 * VentasModule/InventarioModule.
 */
export interface ConectividadCambiadaPayload {
  estadoAnterior: string;
  estadoNuevo: string;
  /** ISO datetime: inicio del estado ANTERIOR (para calcular cuanto duro). */
  desde: string;
  /** ISO datetime: momento de la transicion (= inicio del estado nuevo). */
  hasta: string;
  /** Duracion del estado anterior en milisegundos (hasta - desde). */
  duracionMs: number;
}
