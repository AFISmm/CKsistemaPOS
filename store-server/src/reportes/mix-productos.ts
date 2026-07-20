/**
 * Mix de productos (unidades y monto) — HU-REP-01 CA2.
 *
 * Funcion PURA (sin I/O, sin Prisma): agrega LineaDePedido por productoId y
 * ordena por monto o unidades. El llamador (ReportesService) es responsable
 * de filtrar QUE lineas entran (solo de Pedidos con estado="cobrado", ver
 * ventas-desglose.ts) — esta funcion no conoce el estado del Pedido.
 */
import { Decimal } from "@prisma/client/runtime/library";
import { decimal, type DineroInput } from "../common/util/dinero";

export interface LineaParaMix {
  productoId: string;
  /** Snapshot del nombre al momento de vender (C-SNAPSHOT); se usa la primera version vista. */
  descripcion: string;
  cantidad: number;
  subtotalLinea: DineroInput;
}

export interface ItemMixProducto {
  productoId: string;
  descripcion: string;
  unidades: number;
  monto: Decimal;
}

export type OrdenMix = "monto" | "unidades";

export function calcularMixProductos(lineas: LineaParaMix[], ordenarPor: OrdenMix = "monto"): ItemMixProducto[] {
  const acumulado = new Map<string, ItemMixProducto>();

  for (const linea of lineas) {
    const actual = acumulado.get(linea.productoId) ?? {
      productoId: linea.productoId,
      descripcion: linea.descripcion,
      unidades: 0,
      monto: new Decimal(0),
    };
    actual.unidades += linea.cantidad;
    actual.monto = actual.monto.plus(decimal(linea.subtotalLinea));
    acumulado.set(linea.productoId, actual);
  }

  const items = Array.from(acumulado.values());
  items.sort((a, b) => {
    if (ordenarPor === "unidades") {
      return b.unidades - a.unidades || b.monto.comparedTo(a.monto);
    }
    return b.monto.comparedTo(a.monto) || b.unidades - a.unidades;
  });
  return items;
}
