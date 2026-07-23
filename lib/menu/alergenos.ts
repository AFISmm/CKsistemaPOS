/**
 * Alergenos de un producto (DEMO) — DUENO: menu-inventario-pos (Fase B, 2026-07-22).
 *
 * Ver docs/requisitos.md S-16 y lib/data/catalog-insumos-alergenos.demo.ts
 * para el caveat completo: `Insumo.alergenos` es una HEURISTICA de palabras
 * clave sobre el nombre del insumo, NO datos reales verificados de Chicken
 * Kitchen. Este modulo solo hace la UNION de esos alergenos DEMO sobre los
 * insumos de la receta de un producto (atravesando el BOM multi-nivel via
 * lib/inventory/bom.ts, para que un insumo elaborado como la salsa demo del
 * Anexo A.3 aporte los alergenos de SUS insumos base).
 */

import { getDb } from "../db/store";
import type { Insumo, RecetaInsumo, TipoAlergeno } from "../domain/types";
import { explotarAInsumosBase, indexarRecetaInsumosPorReceta } from "../inventory/bom";

/** Union de alergenos de un conjunto de insumos HOJA (ya explotados). */
function unionAlergenos(insumoIds: string[], insumosPorId: Map<string, Insumo>): TipoAlergeno[] {
  const encontrados = new Set<TipoAlergeno>();
  for (const insumoId of insumoIds) {
    const insumo = insumosPorId.get(insumoId);
    for (const alergeno of insumo?.alergenos ?? []) {
      encontrados.add(alergeno);
    }
  }
  return Array.from(encontrados);
}

/**
 * Alergenos DEMO de la receta ACTIVA de un producto (union sobre todos sus
 * insumos, atravesando BOM multi-nivel). `[]` si no tiene receta o ningun
 * insumo detecto alergeno.
 */
export function alergenosDeProducto(productoId: string): TipoAlergeno[] {
  const db = getDb();
  const receta = db.recetas.find((r) => r.productoId === productoId && r.activo);
  if (!receta) return [];

  const items = db.recetaInsumos.filter((ri) => ri.recetaId === receta.id);
  if (items.length === 0) return [];

  const insumosPorId = new Map(db.insumos.map((i) => [i.id, i]));
  const recetaInsumosPorRecetaId = indexarRecetaInsumosPorReceta(db.recetaInsumos);

  const hojas = items.flatMap((item) =>
    explotarAInsumosBase(item.insumoId, item.cantidad, insumosPorId, recetaInsumosPorRecetaId)
  );
  return unionAlergenos(
    hojas.map((h) => h.insumoId),
    insumosPorId
  );
}

/**
 * Alergenos EFECTIVOS de un producto si el cliente QUITA (modificador "sin X")
 * uno o mas insumos de nivel superior de su receta (ej. "sin Garlic Cilantro
 * Sauce (demo)" quita ese insumo compuesto Y, en cascada, los alergenos que
 * aportaban SUS insumos base). Recalcula desde cero con los insumos
 * removidos excluidos de la explosion — asi un alergeno solo desaparece si
 * NINGUN insumo restante lo sigue aportando (ej. si dos insumos distintos
 * aportan "lacteos" y solo se quita uno, "lacteos" se sigue mostrando).
 *
 * Este es el calculo que demuestra la idea de S-16 ("omitirlo automaticamente
 * en la comanda cuando el cliente pide sin X"); ver Modificador.insumoAfectadoId
 * (lib/domain/types.ts) para como un modificador real apunta al insumo que
 * remueve. La integracion EN VIVO dentro del modal de modificadores de
 * mostrador (components/pos/ModificadorModal.tsx / app/pos/nuevo) queda como
 * seguimiento (ver reporte de la tarea): esta funcion se usa hoy desde la
 * vista de gestion de receta (components/menu/EditarRecetaModal.tsx, de forma
 * simplificada e in-line, ver ese archivo) y esta cubierta por pruebas
 * unitarias (lib/menu/__tests__/alergenos.test.ts).
 */
export function alergenosDeProductoTrasQuitar(productoId: string, insumoIdsQuitados: string[]): TipoAlergeno[] {
  const db = getDb();
  const receta = db.recetas.find((r) => r.productoId === productoId && r.activo);
  if (!receta) return [];

  const quitados = new Set(insumoIdsQuitados);
  const items = db.recetaInsumos.filter((ri) => ri.recetaId === receta.id && !quitados.has(ri.insumoId));
  if (items.length === 0) return [];

  const insumosPorId = new Map(db.insumos.map((i) => [i.id, i]));
  const recetaInsumosPorRecetaId = indexarRecetaInsumosPorReceta(db.recetaInsumos);

  const hojas = items.flatMap((item) =>
    explotarAInsumosBase(item.insumoId, item.cantidad, insumosPorId, recetaInsumosPorRecetaId)
  );
  return unionAlergenos(
    hojas.map((h) => h.insumoId),
    insumosPorId
  );
}

/** Version pura (testeable sin getDb()) del calculo base, usada por las pruebas unitarias. */
export function alergenosDeItemsPura(
  items: RecetaInsumo[],
  insumosPorId: Map<string, Insumo>,
  recetaInsumosPorRecetaId: Map<string, RecetaInsumo[]>,
  insumoIdsQuitados: string[] = []
): TipoAlergeno[] {
  const quitados = new Set(insumoIdsQuitados);
  const itemsRestantes = items.filter((item) => !quitados.has(item.insumoId));
  const hojas = itemsRestantes.flatMap((item) =>
    explotarAInsumosBase(item.insumoId, item.cantidad, insumosPorId, recetaInsumosPorRecetaId)
  );
  return unionAlergenos(
    hojas.map((h) => h.insumoId),
    insumosPorId
  );
}
