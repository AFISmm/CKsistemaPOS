import { Logger } from "@nestjs/common";
import type {
  DatosComandaCocina,
  DatosRecibo,
  ImpresoraAdapter,
} from "./impresora-adapter.interface";

/**
 * SimuladorImpresoraAdapter — implementacion de CONSOLA del ImpresoraAdapter
 * (F2-T4), DEFAULT cuando `IMPRESORA_HOST` no esta configurado. Mismo patron
 * que el stub `abrirCajon` de `lib/payments/pagos.ts` en la demo (console.log
 * + nada de hardware real) y el mismo espiritu honesto de
 * `SyncHttpClient`/`mtls-config.ts` (F1-T5): loguea explicitamente que esto
 * NO es hardware real, para que nunca se confunda con una integracion
 * probada en campo.
 *
 * No lanza NUNCA (ver README §"Hardware"): un fallo de impresion (fisica)
 * jamas deberia bloquear una venta (RNF-06, arquitectura.md §2.2), y el
 * simulador por definicion no puede fallar por hardware — solo loguea.
 */
export class SimuladorImpresoraAdapter implements ImpresoraAdapter {
  private readonly logger = new Logger(SimuladorImpresoraAdapter.name);

  constructor() {
    this.logger.warn(
      "IMPRESORA_HOST no configurado: usando SimuladorImpresoraAdapter (impresion por consola). " +
        "NO hay impresora/cajon fisico conectado. Configurar IMPRESORA_HOST (+ opcional " +
        "IMPRESORA_PUERTO, default 9100) para usar EscPosImpresoraAdapter contra hardware real.",
    );
  }

  async imprimirRecibo(datos: DatosRecibo): Promise<void> {
    const lineas = [
      "=".repeat(32),
      `RECIBO — Pedido #${datos.numeroOrden} (${datos.pedidoId})`,
      "-".repeat(32),
      ...datos.lineas.map((l) => `${l.cantidad}x ${l.descripcion} — ${l.precioUnitario} c/u -> ${l.subtotalLinea}`),
      "-".repeat(32),
      `Subtotal:  ${datos.subtotal}`,
      `Descuento: ${datos.descuentoTotal}`,
      `Impuesto:  ${datos.impuestoTotal}`,
      `Propina:   ${datos.propinaTotal}`,
      `TOTAL:     ${datos.total}`,
      `Metodo:    ${datos.metodoPago}`,
      ...(datos.montoRecibido != null ? [`Recibido:  ${datos.montoRecibido}`, `Cambio:    ${datos.cambio}`] : []),
      "=".repeat(32),
    ];
    this.logger.log(`[SIMULADOR IMPRESORA] Recibo:\n${lineas.join("\n")}`);
  }

  async imprimirComandaCocina(datos: DatosComandaCocina): Promise<void> {
    const lineas = [
      "=".repeat(32),
      `${datos.liberacionParcial ? "COMANDA (liberacion parcial)" : "COMANDA"} — Pedido #${datos.numeroOrden}`,
      "-".repeat(32),
      ...datos.lineas.flatMap((l) => [
        `${l.cantidad}x ${l.descripcion}`,
        ...l.modificadores.map((m) => `   - ${m}`),
        ...(l.notas ? [`   * ${l.notas}`] : []),
      ]),
      "=".repeat(32),
    ];
    this.logger.log(`[SIMULADOR IMPRESORA] Comanda de cocina:\n${lineas.join("\n")}`);
  }

  async abrirCajon(): Promise<void> {
    this.logger.log("[SIMULADOR IMPRESORA] Apertura de cajon monedero (pulso SIMULADO, sin hardware fisico).");
  }
}
