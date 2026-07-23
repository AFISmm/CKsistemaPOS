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
import { agregarCantidades, explotarAInsumosBase, indexarRecetaInsumosPorReceta } from "./bom";

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
 *
 * AGREGADO (Fase B, 2026-07-22, ver docs/analisis-revision-20260722-modulos-innovacion-seguridad.md
 * Anexo A.3 / S-14): antes de mover stock, cada `RecetaInsumo.insumoId` se
 * EXPLOTA recursivamente via `explotarAInsumosBase` (lib/inventory/bom.ts). Si
 * el insumo es "plano" (comportamiento actual de los 84 insumos reales, sin
 * `recetaBaseId`), la explosion es un no-op (devuelve el mismo insumoId/cantidad
 * de siempre). Si el insumo es un PRODUCTO ELABORADO (`recetaBaseId` poblado —
 * hoy solo 1 ejemplo demo, ver lib/data/catalog-real.ts), el movimiento de
 * stock se aplica a SUS insumos base en cascada, en vez de al insumo elaborado
 * (que no lleva Stock propio: es un nodo virtual/calculado del BOM, no algo
 * que se compre y cuente en inventario). Esto es lo que hace que vender un
 * plato que use ese insumo elaborado descuente CORRECTAMENTE 2 niveles.
 */
function moverStockPorPedido(
  pedido: Pedido,
  signo: 1 | -1,
  tipoAuditoria: "ajusteInventario",
  motivo: string
): void {
  const db = getDb();
  const insumosPorId = new Map(db.insumos.map((i) => [i.id, i]));
  const recetaInsumosPorRecetaId = indexarRecetaInsumosPorReceta(db.recetaInsumos);

  for (const linea of pedido.lineas) {
    const receta = db.recetas.find(
      (r) => r.productoId === linea.productoId && r.activo
    );
    if (!receta) continue; // producto sin receta definida (DEMO): no descuenta insumos

    const insumosReceta = recetaInsumosPorRecetaId.get(receta.id) ?? [];

    const explotados = insumosReceta.flatMap((ri) =>
      explotarAInsumosBase(ri.insumoId, ri.cantidad, insumosPorId, recetaInsumosPorRecetaId)
    );
    const insumosBaseAMover = agregarCantidades(explotados);

    for (const item of insumosBaseAMover) {
      const delta = signo * item.cantidad * linea.cantidad;
      if (delta === 0) continue;

      let stock = db.stock.find(
        (s) => s.ubicacionId === pedido.ubicacionId && s.insumoId === item.insumoId
      );
      if (!stock) {
        // No deberia ocurrir si el insumo fue sembrado para la ubicacion; se crea
        // en 0 para no perder el movimiento (DEMO: robustez ante datos faltantes).
        stock = {
          id: `stock-${item.insumoId}-${pedido.ubicacionId}`,
          ubicacionId: pedido.ubicacionId,
          insumoId: item.insumoId,
          cantidadActual: 0,
          actualizadoEn: ahora(),
        };
        db.stock.push(stock);
      }

      const anterior = stock.cantidadActual;
      // FIX (Fase A, 2026-07-22, encontrado al construir auto-86 — ver reporte
      // de la tarea): esta linea decia `anterior - delta`, lo que en realidad
      // INVERTIA el movimiento (una venta con signo=-1 produce delta negativo,
      // asi que "anterior - delta" SUMABA en vez de restar — una venta subia
      // el stock y un reembolso lo bajaba). `delta` ya incluye el signo
      // correcto (ver arriba), asi que sumarlo directo es lo que hace falta.
      stock.cantidadActual = anterior + delta;
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
          insumoId: item.insumoId,
          cantidadAnterior: anterior,
          cantidadNueva: stock.cantidadActual,
          movimiento: delta,
        },
      });

      // Auto-86 (Fase A, 2026-07-22 — idea de innovacion de la llamada de
      // revision): si este movimiento dejo el insumo en cero (o menos), 86
      // automaticamente cualquier producto cuya receta dependa de el.
      //
      // LIMITACION CONOCIDA (Fase B): esto solo 86 productos cuya Receta
      // referencia DIRECTAMENTE `item.insumoId` (el insumo HOJA tras
      // explotar). Un producto que dependa de el SOLO de forma indirecta via
      // un insumo elaborado intermedio (ej. "ORIGINAL CHOP-CHOP" via la salsa
      // demo, ver Anexo A.3) no se 86 automaticamente si se agota un insumo
      // base de esa salsa — el auto-86 no atraviesa el BOM multi-nivel en
      // este alcance. Documentado como seguimiento futuro, no bloqueante para
      // el alcance de esta tarea (costeo + descuento de stock, no auto-86).
      verificarAuto86PorInsumo(item.insumoId, pedido.ubicacionId);
    }
  }
}

/**
 * Si el stock ACTUAL de `insumoId` en `ubicacionId` esta en cero (o menos),
 * marca 86 (agotado, `disponible86 = false`) todo Producto cuya Receta ACTIVA
 * dependa de ese insumo — sin esperar a que un gerente lo haga a mano (ver
 * docs/analisis-revision-20260722-modulos-innovacion-seguridad.md, idea de
 * innovacion "auto-86 al llegar a stock cero"). No hace nada si el stock sigue
 * por encima de cero, o si el producto ya estaba 86.
 *
 * Se exporta ademas de usarse desde `moverStockPorPedido` (venta/reembolso)
 * para que cualquier futuro punto de ajuste manual de inventario (permiso
 * "inventario.ajustar", hoy sin endpoint propio) pueda invocar la misma
 * verificacion tras mutar `Stock.cantidadActual`.
 *
 * Nota de alcance: `Modificador` no tiene receta/insumos propios en el modelo
 * de dominio (solo `Producto` -> `Receta` -> `RecetaInsumo`), asi que esta
 * funcion solo puede auto-86 productos, no modificadores individuales. No hay
 * auto-reactivacion al reponer stock en este alcance: la llamada de revision
 * pidio especificamente el 86 automatico a stock cero; reactivar se deja como
 * decision gerencial manual (marcar86) para no revertir por accidente un 86
 * que un gerente haya puesto por otro motivo (ej. producto descontinuado).
 */
export function verificarAuto86PorInsumo(insumoId: string, ubicacionId: string): void {
  const db = getDb();

  const stock = db.stock.find((s) => s.ubicacionId === ubicacionId && s.insumoId === insumoId);
  if (!stock || stock.cantidadActual > 0) return;

  const recetaIdsConEsteInsumo = new Set(
    db.recetaInsumos.filter((ri) => ri.insumoId === insumoId).map((ri) => ri.recetaId)
  );
  if (recetaIdsConEsteInsumo.size === 0) return;

  const recetasAfectadas = db.recetas.filter((r) => r.activo && recetaIdsConEsteInsumo.has(r.id));

  for (const receta of recetasAfectadas) {
    const producto = db.productos.find((p) => p.id === receta.productoId);
    if (!producto || !producto.disponible86) continue; // no existe o ya esta 86

    producto.disponible86 = false;

    registrarEvento({
      ubicacionId,
      usuarioId: null,
      tipo: "producto86",
      agregadoTipo: "Producto",
      agregadoId: producto.id,
      motivo: "Producto marcado 86 automaticamente: insumo agotado (stock <= 0)",
      payload: {
        productoId: producto.id,
        insumoId,
        cantidadActualInsumo: stock.cantidadActual,
        disponibleAnterior: true,
        disponibleNuevo: false,
        automatico: true,
      },
    });
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
