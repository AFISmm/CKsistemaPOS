/**
 * Inventario — DUENO: menu-inventario-pos.
 *
 * Implementacion sobre el almacen en memoria (lib/db/store.ts). backend-ventas-pos
 * invoca estas funciones al confirmar/revertir una venta — equivale a los eventos
 * VentaConfirmada / VentaRevertida. El descuento de stock es POR MOVIMIENTOS
 * (resta/suma sobre cantidadActual), no por sobrescritura ciega (arq. 4.5).
 */

import type { Pedido } from "../domain/types";
import { UBICACION_PILOTO_ID, ahora, getDb, registrarEvento } from "../db/store";

export interface InsumoBajoUmbral {
  insumoId: string;
  nombre: string;
  cantidadActual: number;
  umbral: number;
}

/**
 * Aplica un delta (positivo o negativo) de insumos a la ubicacion del pedido segun
 * la receta activa de cada producto vendido. signo = -1 para descontar (venta),
 * +1 para revertir (reembolso/anulacion).
 */
function moverStockPorPedido(
  pedido: Pedido,
  signo: 1 | -1,
  tipoAuditoria: "ajusteInventario",
  motivo: string
): void {
  const db = getDb();

  for (const linea of pedido.lineas) {
    const receta = db.recetas.find(
      (r) => r.productoId === linea.productoId && r.activo
    );
    if (!receta) continue; // producto sin receta definida (DEMO): no descuenta insumos

    const insumosReceta = db.recetaInsumos.filter(
      (ri) => ri.recetaId === receta.id
    );

    for (const ri of insumosReceta) {
      const delta = signo * ri.cantidad * linea.cantidad;
      if (delta === 0) continue;

      let stock = db.stock.find(
        (s) => s.ubicacionId === pedido.ubicacionId && s.insumoId === ri.insumoId
      );
      if (!stock) {
        // No deberia ocurrir si el insumo fue sembrado para la ubicacion; se crea
        // en 0 para no perder el movimiento (DEMO: robustez ante datos faltantes).
        stock = {
          id: `stock-${ri.insumoId}-${pedido.ubicacionId}`,
          ubicacionId: pedido.ubicacionId,
          insumoId: ri.insumoId,
          cantidadActual: 0,
          actualizadoEn: ahora(),
        };
        db.stock.push(stock);
      }

      const anterior = stock.cantidadActual;
      stock.cantidadActual = anterior - delta; // signo ya incluido en delta
      stock.actualizadoEn = ahora();

      registrarEvento({
        ubicacionId: pedido.ubicacionId,
        usuarioId: null,
        tipo: tipoAuditoria,
        agregadoTipo: "Stock",
        agregadoId: stock.id,
        motivo,
        payload: {
          pedidoId: pedido.id,
          lineaDePedidoId: linea.id,
          productoId: linea.productoId,
          insumoId: ri.insumoId,
          cantidadAnterior: anterior,
          cantidadNueva: stock.cantidadActual,
          movimiento: -delta,
        },
      });
    }
  }
}

/** Descuenta insumos segun receta por cada linea del pedido (VentaConfirmada). */
export function descontarStockPorVenta(pedido: Pedido): void {
  moverStockPorPedido(pedido, -1, "ajusteInventario", "Venta confirmada: descuento de insumos por receta");
}

/** Revierte insumos de un pedido reembolsado/anulado (VentaRevertida). */
export function revertirStockPorVenta(pedido: Pedido): void {
  moverStockPorPedido(pedido, 1, "ajusteInventario", "Venta revertida: reintegro de insumos por receta");
}

/** Marca/desmarca 86 (agotado) un producto. */
export function marcar86(
  productoId: string,
  disponible: boolean,
  usuarioId: string
): void {
  const db = getDb();
  const producto = db.productos.find((p) => p.id === productoId);
  if (!producto) {
    throw new Error(`marcar86: producto no encontrado (${productoId})`);
  }

  const anterior = producto.disponible86;
  producto.disponible86 = disponible;

  registrarEvento({
    ubicacionId: UBICACION_PILOTO_ID,
    usuarioId: usuarioId || null,
    tipo: "producto86",
    agregadoTipo: "Producto",
    agregadoId: productoId,
    motivo: disponible ? "Producto reactivado (86 quitado)" : "Producto marcado 86 (agotado)",
    payload: { productoId, disponibleAnterior: anterior, disponibleNuevo: disponible },
  });
}

/** Lista de insumos por debajo (o igual) de su umbral de stock bajo. */
export function insumosBajoUmbral(ubicacionId?: string): InsumoBajoUmbral[] {
  const db = getDb();
  const stockRelevante = ubicacionId
    ? db.stock.filter((s) => s.ubicacionId === ubicacionId)
    : db.stock;

  const resultado: InsumoBajoUmbral[] = [];
  for (const stock of stockRelevante) {
    const insumo = db.insumos.find((i) => i.id === stock.insumoId);
    if (!insumo) continue;
    if (stock.cantidadActual <= insumo.umbralStockBajo) {
      resultado.push({
        insumoId: insumo.id,
        nombre: insumo.nombre,
        cantidadActual: stock.cantidadActual,
        umbral: insumo.umbralStockBajo,
      });
    }
  }
  return resultado;
}
