/**
 * ImpresoraAdapter — contrato de integracion con la impresora ESC/POS +
 * cajon monedero (F2-T4, `hardware-perifericos-pos`; ADR-0006 F0-T3,
 * arquitectura.md §2.1/§3/§9). El resto del sistema (VentasModule/
 * PagosModule) depende SIEMPRE de esta interfaz, nunca de una implementacion
 * concreta (mismo patron que `PspAdapter`, ver
 * `src/pagos/psp/psp-adapter.interface.ts`): cambiar el `provider` de
 * `IMPRESORA_ADAPTER` (simulador <-> ESC/POS real via TCP 9100) no toca
 * logica de negocio.
 */
export const IMPRESORA_ADAPTER = Symbol("IMPRESORA_ADAPTER");

export interface LineaReciboItem {
  descripcion: string;
  cantidad: number;
  precioUnitario: string;
  subtotalLinea: string;
}

/** Datos ya calculados/snapshot (C-SNAPSHOT) que necesita un recibo de cliente. */
export interface DatosRecibo {
  pedidoId: string;
  numeroOrden: number;
  ubicacionId: string;
  lineas: LineaReciboItem[];
  subtotal: string;
  descuentoTotal: string;
  impuestoTotal: string;
  propinaTotal: string;
  total: string;
  metodoPago: string;
  /** Solo efectivo. */
  montoRecibido?: string | null;
  /** Solo efectivo. */
  cambio?: string | null;
}

export interface LineaComandaCocinaItem {
  descripcion: string;
  cantidad: number;
  notas?: string | null;
  modificadores: string[];
}

/** Datos de una comanda de cocina (envio inicial o liberacion parcial, F2-T2). */
export interface DatosComandaCocina {
  pedidoId: string;
  numeroOrden: number;
  ubicacionId: string;
  lineas: LineaComandaCocinaItem[];
  /** true si esto viene de /liberar o /liberar-retenidas (Hold & fire), no del envio inicial. */
  liberacionParcial?: boolean;
}

export interface ImpresoraAdapter {
  imprimirRecibo(datos: DatosRecibo): Promise<void>;
  imprimirComandaCocina(datos: DatosComandaCocina): Promise<void>;
  /**
   * Dispara el pulso del cajon monedero (via la impresora, ADR-0006 F0-T3:
   * "disparo por pulso RJ11/12 a traves de la impresora", nunca HID directo).
   * NO emite `CajonAbierto` ni registra auditoria: eso ya lo hace
   * `PagosService` (arquitectura.md §7.5); este metodo es SOLO el efecto de
   * hardware, para no duplicar el evento/la auditoria.
   */
  abrirCajon(): Promise<void>;
}
