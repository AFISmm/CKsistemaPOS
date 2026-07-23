/**
 * Explosion de BOM (Bill of Materials) multi-nivel de Insumo — DUENO: menu-inventario-pos
 * (Fase B, 2026-07-22, ver docs/analisis-revision-20260722-modulos-innovacion-seguridad.md
 * Anexo A.3 y docs/requisitos.md S-14).
 *
 * CONTEXTO: el modelo de dominio (lib/domain/types.ts) es plano por defecto:
 * Producto -> Receta -> RecetaInsumo -> Insumo. La verificacion rigurosa del
 * import real (scripts/importar-recetario.js) NO encontro evidencia de
 * insumos multi-nivel reales en Recetario_Simplificado.xlsx (ninguna "salsa"
 * del archivo se prepara, segun esos datos, a partir de otros insumos del
 * mismo archivo). S-14 sigue abierto (pendiente confirmar con operaciones que
 * salsas se preparan en tienda vs. se compran ya hechas).
 *
 * Para no dejar la capacidad de BOM multi-nivel sin ningun ejemplo funcional,
 * `Insumo.recetaBaseId` (agregado en Fase B) permite que un Insumo sea el
 * mismo un "producto elaborado": si lo tiene poblado, apunta al `Receta.id`
 * que define de que OTROS insumos esta hecho. Este modulo explota esa cadena
 * recursivamente (a la profundidad que exista — hoy solo 1 nivel realmente
 * poblado, ver lib/data/catalog-real.ts) para que el descuento de stock
 * (lib/inventory/inventario.ts) y el costeo (lib/menu/costeo.ts) SIEMPRE
 * trabajen sobre insumos HOJA (los que en verdad se compran/tienen stock/costo).
 */

import type { Insumo, RecetaInsumo } from "../domain/types";

export interface ItemInsumoCantidad {
  insumoId: string;
  cantidad: number;
}

/**
 * Explota recursivamente `insumoId` (con `cantidad` unidades) a su lista de
 * insumos HOJA (sin `recetaBaseId`, o cuyo `recetaBaseId` no resuelve a
 * ninguna linea). Si el insumo no es elaborado (`recetaBaseId` null/undefined
 * o sin RecetaInsumo asociadas), devuelve `[{ insumoId, cantidad }]` sin
 * cambios — comportamiento identico al modelo plano de siempre para los 84
 * insumos reales que NO son productos elaborados.
 *
 * `visitados` protege contra un ciclo mal configurado (A hecho de B, B hecho
 * de A): DEMO, simplemente corta la recursion en vez de lanzar, para no
 * tumbar una venta por un dato de catalogo mal cargado.
 */
export function explotarAInsumosBase(
  insumoId: string,
  cantidad: number,
  insumosPorId: Map<string, Insumo>,
  recetaInsumosPorRecetaId: Map<string, RecetaInsumo[]>,
  visitados: Set<string> = new Set()
): ItemInsumoCantidad[] {
  if (visitados.has(insumoId)) return [];

  const insumo = insumosPorId.get(insumoId);
  const itemsBase = insumo?.recetaBaseId ? recetaInsumosPorRecetaId.get(insumo.recetaBaseId) : undefined;

  if (!insumo || !insumo.recetaBaseId || !itemsBase || itemsBase.length === 0) {
    return [{ insumoId, cantidad }];
  }

  const nuevosVisitados = new Set(visitados);
  nuevosVisitados.add(insumoId);

  const resultado: ItemInsumoCantidad[] = [];
  for (const item of itemsBase) {
    resultado.push(
      ...explotarAInsumosBase(item.insumoId, item.cantidad * cantidad, insumosPorId, recetaInsumosPorRecetaId, nuevosVisitados)
    );
  }
  return resultado;
}

/** Suma cantidades repetidas del mismo insumoId (puede aparecer mas de una vez tras explotar). */
export function agregarCantidades(items: ItemInsumoCantidad[]): ItemInsumoCantidad[] {
  const acumulado = new Map<string, number>();
  for (const item of items) {
    acumulado.set(item.insumoId, (acumulado.get(item.insumoId) ?? 0) + item.cantidad);
  }
  return Array.from(acumulado.entries()).map(([insumoId, cantidad]) => ({ insumoId, cantidad }));
}

/** Construye el indice `recetaId -> RecetaInsumo[]` una sola vez (reutilizable entre varias explosiones). */
export function indexarRecetaInsumosPorReceta(recetaInsumos: RecetaInsumo[]): Map<string, RecetaInsumo[]> {
  const indice = new Map<string, RecetaInsumo[]>();
  for (const ri of recetaInsumos) {
    const lista = indice.get(ri.recetaId) ?? [];
    lista.push(ri);
    indice.set(ri.recetaId, lista);
  }
  return indice;
}
