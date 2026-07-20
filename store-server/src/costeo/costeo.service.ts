import { Injectable } from "@nestjs/common";
import { Decimal } from "@prisma/client/runtime/library";
import { PrismaService } from "../common/prisma/prisma.service";
import { ErrorDominio } from "../common/errores/error-dominio";
import { calcularCostoLinea } from "./costeo.types";
import type { ComboComponenteSeleccionado, InsumoCantidad, ModificadorResuelto } from "./costeo.types";

/**
 * CosteoService — DUENO: menu-inventario-pos (F2-T1, arquitectura.md §9.3).
 *
 * Envoltorio que RESUELVE contra Prisma todo lo que la funcion pura
 * `calcularCostoLinea` necesita (receta base, RecetaModificador de cada
 * modificador aplicado, receta de cada producto elegido en un combo, costo
 * unitario vigente de cada insumo) y expone dos lecturas de mas alto nivel:
 *  - `calcularCostoLineaPersistida`: costo de UNA LineaDePedido ya vendida.
 *  - `calcularCostoPedido`: costo + margen de TODO un Pedido (para
 *    GET /api/v1/pedidos/:id/costeo).
 *
 * Puramente de LECTURA: no escribe Stock/Pedido/Pago, no emite eventos, no
 * altera el saldo/impuesto de VentasModule. Es un modulo adicional, no un
 * reemplazo de nada existente.
 */
@Injectable()
export class CosteoService {
  constructor(private readonly prisma: PrismaService) {}

  async calcularCostoLineaPersistida(lineaDePedidoId: string) {
    const linea = await this.prisma.lineaDePedido.findUnique({
      where: { id: lineaDePedidoId },
      include: { modificadores: true, producto: true },
    });
    if (!linea) {
      throw new ErrorDominio("linea_no_encontrada", `LineaDePedido ${lineaDePedidoId} no existe`, 404);
    }

    const recetaBase = await this.resolverRecetaProducto(linea.productoId);

    const modificadores: ModificadorResuelto[] = [];
    for (const lm of linea.modificadores) {
      const deltas = await this.prisma.recetaModificador.findMany({ where: { modificadorId: lm.modificadorId } });
      modificadores.push({
        modificadorId: lm.modificadorId,
        descripcion: lm.descripcion,
        tipo: lm.tipo,
        deltas: deltas.map((d) => ({ insumoId: d.insumoId, cantidad: new Decimal(d.cantidadDelta) })),
      });
    }

    let comboSeleccion: ComboComponenteSeleccionado[] | undefined;
    if (linea.producto.esCombo && linea.comboSeleccionProductoIds.length > 0) {
      comboSeleccion = [];
      for (const productoId of linea.comboSeleccionProductoIds) {
        comboSeleccion.push({ productoId, insumos: await this.resolverRecetaProducto(productoId) });
      }
    }

    const idsInsumo = new Set<string>();
    recetaBase.forEach((ri) => idsInsumo.add(ri.insumoId));
    modificadores.forEach((m) => m.deltas.forEach((d) => idsInsumo.add(d.insumoId)));
    (comboSeleccion ?? []).forEach((c) => c.insumos.forEach((ri) => idsInsumo.add(ri.insumoId)));

    const insumos = await this.prisma.insumo.findMany({ where: { id: { in: Array.from(idsInsumo) } } });
    const costosUnitarios = new Map(insumos.map((i) => [i.id, new Decimal(i.costoUnitario)]));

    const costeo = calcularCostoLinea({
      productoId: linea.productoId,
      cantidad: linea.cantidad,
      recetaBase,
      modificadores,
      comboSeleccion,
      costosUnitarios,
    });

    return {
      lineaDePedidoId: linea.id,
      descripcion: linea.descripcion,
      precioVentaLinea: linea.subtotalLinea.toString(),
      ...costeo,
      margenLinea: new Decimal(linea.subtotalLinea).minus(costeo.costoTotalLinea).toString(),
    };
  }

  /** GET /api/v1/pedidos/:id/costeo — costo real + margen de todo el pedido. */
  async calcularCostoPedido(pedidoId: string) {
    const pedido = await this.prisma.pedido.findUnique({
      where: { id: pedidoId },
      include: { lineas: true },
    });
    if (!pedido) {
      throw new ErrorDominio("pedido_no_encontrado", `Pedido ${pedidoId} no existe`, 404);
    }

    const lineas = [];
    let costoTotalPedido = new Decimal(0);
    for (const linea of pedido.lineas) {
      const costeoLinea = await this.calcularCostoLineaPersistida(linea.id);
      costoTotalPedido = costoTotalPedido.plus(costeoLinea.costoTotalLinea);
      lineas.push(costeoLinea);
    }

    // Precio de venta de referencia = subtotal (antes de descuento/impuesto):
    // el margen de costeo compara lo que se cobro por el PRODUCTO contra su
    // costo de insumos; descuento/impuesto/propina son decisiones de
    // VentasModule/pagos, no parte del costo de la mercaderia.
    const precioVentaTotal = new Decimal(pedido.subtotal);
    const margenTotal = precioVentaTotal.minus(costoTotalPedido);
    const margenPct = precioVentaTotal.isZero() ? "0" : margenTotal.div(precioVentaTotal).mul(100).toString();

    return {
      pedidoId,
      numeroOrden: pedido.numeroOrden,
      lineas,
      costoTotalPedido: costoTotalPedido.toString(),
      precioVentaTotal: precioVentaTotal.toString(),
      margenTotal: margenTotal.toString(),
      margenPct,
    };
  }

  private async resolverRecetaProducto(productoId: string): Promise<InsumoCantidad[]> {
    const receta = await this.prisma.receta.findFirst({ where: { productoId, activo: true } });
    if (!receta) return []; // producto sin receta definida: contribuye 0 al costo (igual criterio que InventarioService)
    const items = await this.prisma.recetaInsumo.findMany({ where: { recetaId: receta.id } });
    return items.map((ri) => ({ insumoId: ri.insumoId, cantidad: new Decimal(ri.cantidad) }));
  }
}
