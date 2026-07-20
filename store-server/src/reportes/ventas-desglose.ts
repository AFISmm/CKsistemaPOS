/**
 * Ventas del dia con desglose por metodo de pago — HU-REP-01 CA1.
 *
 * Funcion PURA (sin I/O, sin Prisma). RN-04 / "no doble conteo": el llamador
 * (ReportesService.reporteDia) SOLO debe pasar Pedidos con estado="cobrado"
 * (un pedido reembolsado pasa a estado="cancelado" en
 * VentasService.reembolsarPedido y por lo tanto queda excluido ANTES de
 * llegar aqui — nunca infla el ingreso). Dentro de cada pedido incluido,
 * ademas se filtra `pago.estado === "aprobado"` (nunca contar un pago
 * rechazado/encolado/reembolsado como ingreso real de caja).
 */
import { Decimal } from "@prisma/client/runtime/library";
import { decimal, type DineroInput } from "../common/util/dinero";

export type MetodoPagoReporte = "efectivo" | "tarjeta" | "otro";

export interface PagoParaVentas {
  metodo: MetodoPagoReporte;
  monto: DineroInput;
  propina: DineroInput;
  estado: string;
}

export interface PedidoParaVentas {
  subtotal: DineroInput;
  descuentoTotal: DineroInput;
  impuestoTotal: DineroInput;
  propinaTotal: DineroInput;
  total: DineroInput;
  pagos: PagoParaVentas[];
}

export interface VentasDesglose {
  numeroPedidos: number;
  subtotal: Decimal;
  descuentoTotal: Decimal;
  impuestoTotal: Decimal;
  propinaTotal: Decimal;
  total: Decimal;
  porMetodoPago: Record<MetodoPagoReporte, Decimal>;
  propinaPorMetodoPago: Record<MetodoPagoReporte, Decimal>;
}

function metodosEnCero(): Record<MetodoPagoReporte, Decimal> {
  return { efectivo: new Decimal(0), tarjeta: new Decimal(0), otro: new Decimal(0) };
}

export function calcularVentasDesglose(pedidos: PedidoParaVentas[]): VentasDesglose {
  const porMetodoPago = metodosEnCero();
  const propinaPorMetodoPago = metodosEnCero();

  let subtotal = new Decimal(0);
  let descuentoTotal = new Decimal(0);
  let impuestoTotal = new Decimal(0);
  let propinaTotal = new Decimal(0);
  let total = new Decimal(0);

  for (const pedido of pedidos) {
    subtotal = subtotal.plus(decimal(pedido.subtotal));
    descuentoTotal = descuentoTotal.plus(decimal(pedido.descuentoTotal));
    impuestoTotal = impuestoTotal.plus(decimal(pedido.impuestoTotal));
    propinaTotal = propinaTotal.plus(decimal(pedido.propinaTotal));
    total = total.plus(decimal(pedido.total));

    for (const pago of pedido.pagos) {
      if (pago.estado !== "aprobado") continue;
      porMetodoPago[pago.metodo] = porMetodoPago[pago.metodo].plus(decimal(pago.monto));
      propinaPorMetodoPago[pago.metodo] = propinaPorMetodoPago[pago.metodo].plus(decimal(pago.propina));
    }
  }

  return {
    numeroPedidos: pedidos.length,
    subtotal,
    descuentoTotal,
    impuestoTotal,
    propinaTotal,
    total,
    porMetodoPago,
    propinaPorMetodoPago,
  };
}
