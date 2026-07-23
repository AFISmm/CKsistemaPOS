/**
 * Costeo de receta (COGS estimado) — DUENO: menu-inventario-pos (Fase B, 2026-07-22).
 *
 * Suma `RecetaInsumo.cantidad * Insumo.costoUnitarioCentavos` de un producto,
 * atravesando el BOM multi-nivel (lib/inventory/bom.ts) para que un insumo
 * elaborado (`Insumo.recetaBaseId`, ver Anexo A.3) sume el costo de SUS
 * insumos base en vez de quedarse sin costo propio.
 *
 * AVISO IMPORTANTE DE ESCALA (leer antes de interpretar el numero mostrado):
 * las cantidades de `RecetaInsumo.cantidad` en el catalogo real importado
 * (ver scripts/importar-recetario.js) parecen corresponder a la escala de LOTE
 * de produccion del archivo fuente (ej. "ORIGINAL CHOP-CHOP" consume 26.6667
 * LB de pollo segun esa receta), no a una porcion individual — el mismo
 * caveat aplica al descuento de stock existente (lib/inventory/inventario.ts),
 * que ya multiplica esa cantidad "tal cual" por unidad vendida. Por lo tanto
 * el costo que devuelve este modulo hereda esa misma escala: es un ESTIMADO
 * DEMO util para comparar receta contra receta (mas insumos/cantidades =
 * mayor costo relativo), NO un costo por plato listo para calcular margen
 * real contra `Producto.precioBase`. Por eso la UI (EditarRecetaModal) lo
 * muestra como "costo estimado de estos insumos a estas cantidades", sin
 * calcular ni mostrar un porcentaje de margen contra el precio de venta.
 */

import { getDb } from "../db/store";
import type { Insumo, RecetaInsumo } from "../domain/types";
import { agregarCantidades, explotarAInsumosBase, indexarRecetaInsumosPorReceta } from "../inventory/bom";

export interface CostoReceta {
  /** Costo total estimado en CENTAVOS (ver aviso de escala arriba). */
  costoCentavos: number;
  /** true si al menos un insumo (propio o de un BOM anidado) no tiene costoUnitarioCentavos poblado. */
  costoIncompleto: boolean;
}

/** Version pura (testeable sin getDb()) — recibe los insumos/recetaInsumos ya resueltos. */
export function calcularCostoRecetaPura(
  items: RecetaInsumo[],
  insumosPorId: Map<string, Insumo>,
  recetaInsumosPorRecetaId: Map<string, RecetaInsumo[]>
): CostoReceta {
  let costoCentavos = 0;
  let costoIncompleto = false;

  const explotados = items.flatMap((item) =>
    explotarAInsumosBase(item.insumoId, item.cantidad, insumosPorId, recetaInsumosPorRecetaId)
  );
  const agregados = agregarCantidades(explotados);

  for (const hoja of agregados) {
    const insumo = insumosPorId.get(hoja.insumoId);
    if (!insumo || insumo.costoUnitarioCentavos == null) {
      costoIncompleto = true;
      continue;
    }
    costoCentavos += hoja.cantidad * insumo.costoUnitarioCentavos;
  }

  return { costoCentavos: Math.round(costoCentavos), costoIncompleto };
}

/** Calcula el costo de la receta ACTIVA de un producto. `null` si no tiene receta o no tiene insumos. */
export function calcularCostoRecetaProducto(productoId: string): CostoReceta | null {
  const db = getDb();
  const receta = db.recetas.find((r) => r.productoId === productoId && r.activo);
  if (!receta) return null;

  const items = db.recetaInsumos.filter((ri) => ri.recetaId === receta.id);
  if (items.length === 0) return null;

  const insumosPorId = new Map(db.insumos.map((i) => [i.id, i]));
  const recetaInsumosPorRecetaId = indexarRecetaInsumosPorReceta(db.recetaInsumos);

  return calcularCostoRecetaPura(items, insumosPorId, recetaInsumosPorRecetaId);
}
