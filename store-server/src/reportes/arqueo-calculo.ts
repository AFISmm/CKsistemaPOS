/**
 * Calculo PURO del arqueo de un turno (cierre de caja) — HU-PAG-08 / F2-T3.
 *
 * UNICA fuente de la formula: `VentasService.calcularArqueo` hace el fetch de
 * Prisma (Turno + Pedidos cobrados + Pagos aprobados/reembolsados de ese
 * turno) y delega el calculo aqui; `ReportesService` (modulo de reportes)
 * NUNCA reimplementa esta formula, solo llama a
 * `VentasService.calcularArqueo` para el reporte del dia (ver
 * store-server/README.md, seccion de arqueo). Se elige este archivo como
 * duenio de la formula (en vez de dejarla inline en VentasService) para
 * poder testearla sin DB, igual que `ventas/calculo-totales.ts`.
 *
 * Formula (fondoInicial + efectivo cobrado - efectivo reembolsado):
 *  - `porMetodo`   = suma de `Pago.monto` con estado="aprobado", por metodo.
 *  - `efectivoReembolsado` = suma (valor absoluto) de `Pago.monto` con
 *    estado="reembolsado" y metodo="efectivo". Un reembolso con tarjeta va
 *    por el PSP (no sale del cajon fisico) y NO se resta aqui.
 *  - `efectivoEsperado` = fondoInicial + porMetodo.efectivo - efectivoReembolsado.
 *
 * FIX de un gap real encontrado al construir F2-T3: antes de este cambio,
 * `calcularArqueo` solo miraba Pagos con estado="aprobado" y os pagos de
 * reembolso (estado="reembolsado", ver VentasService.reembolsarPedido) se
 * ignoraban por completo — un reembolso en efectivo durante el turno NO
 * reducia el efectivo esperado, sobreestimando la caja. Este modulo lo
 * corrige sin tocar el pedido/pago original (el pago aprobado original sigue
 * contando como venta bruta; el reembolso resta el efectivo que
 * fisicamente salio del cajon).
 */
import { Decimal } from "@prisma/client/runtime/library";
import { decimal, type DineroInput } from "../common/util/dinero";

export type MetodoPagoReporte = "efectivo" | "tarjeta" | "otro";

export interface PedidoCobradoParaArqueo {
  total: DineroInput;
  descuentoTotal: DineroInput;
  impuestoTotal: DineroInput;
}

export interface PagoAprobadoParaArqueo {
  metodo: MetodoPagoReporte;
  monto: DineroInput;
  propina: DineroInput;
}

/** Pago de reembolso (estado="reembolsado"): `monto` ya viene NEGADO al crearse (ver VentasService.reembolsarPedido). */
export interface PagoReembolsadoParaArqueo {
  metodo: MetodoPagoReporte;
  monto: DineroInput;
}

export interface ArqueoCalculado {
  numeroPedidos: number;
  totalVentas: Decimal;
  totalDescuentos: Decimal;
  totalImpuestos: Decimal;
  totalPropinas: Decimal;
  porMetodo: Record<MetodoPagoReporte, Decimal>;
  fondoInicial: Decimal;
  efectivoReembolsado: Decimal;
  efectivoEsperado: Decimal;
}

export function calcularArqueoTurno(input: {
  fondoInicial: DineroInput;
  pedidosCobrados: PedidoCobradoParaArqueo[];
  pagosAprobados: PagoAprobadoParaArqueo[];
  pagosReembolsados: PagoReembolsadoParaArqueo[];
}): ArqueoCalculado {
  const porMetodo: Record<MetodoPagoReporte, Decimal> = {
    efectivo: new Decimal(0),
    tarjeta: new Decimal(0),
    otro: new Decimal(0),
  };
  let totalPropinas = new Decimal(0);
  for (const pago of input.pagosAprobados) {
    porMetodo[pago.metodo] = porMetodo[pago.metodo].plus(decimal(pago.monto));
    totalPropinas = totalPropinas.plus(decimal(pago.propina));
  }

  let efectivoReembolsado = new Decimal(0);
  for (const pago of input.pagosReembolsados) {
    if (pago.metodo !== "efectivo") continue;
    efectivoReembolsado = efectivoReembolsado.plus(decimal(pago.monto).abs());
  }

  const totalVentas = sumarCampo(input.pedidosCobrados, "total");
  const totalDescuentos = sumarCampo(input.pedidosCobrados, "descuentoTotal");
  const totalImpuestos = sumarCampo(input.pedidosCobrados, "impuestoTotal");

  const fondoInicial = decimal(input.fondoInicial);
  const efectivoEsperado = fondoInicial.plus(porMetodo.efectivo).minus(efectivoReembolsado);

  return {
    numeroPedidos: input.pedidosCobrados.length,
    totalVentas,
    totalDescuentos,
    totalImpuestos,
    totalPropinas,
    porMetodo,
    fondoInicial,
    efectivoReembolsado,
    efectivoEsperado,
  };
}

function sumarCampo(pedidos: PedidoCobradoParaArqueo[], campo: keyof PedidoCobradoParaArqueo): Decimal {
  return pedidos.reduce((acc, p) => acc.plus(decimal(p[campo])), new Decimal(0));
}

/** diferencia = efectivoContado - efectivoEsperado (positivo = sobrante, negativo = faltante). */
export function calcularDiferenciaEfectivo(efectivoEsperado: DineroInput, efectivoContado: DineroInput): Decimal {
  return decimal(efectivoContado).minus(decimal(efectivoEsperado));
}
