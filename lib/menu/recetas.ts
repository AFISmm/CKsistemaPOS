/**
 * Edicion de recetas (RecetaInsumo) de un Producto — DUENO: menu-inventario-pos.
 *
 * AGREGADO Fase A (2026-07-22, hallazgo de la llamada de revision, ver
 * docs/analisis-revision-20260722-modulos-innovacion-seguridad.md: "gestion
 * de menu (editar insumos de receta...)"): hasta ahora `lib/menu/productos.ts`
 * solo permitia CREAR un producto; no habia forma de agregar/quitar/cambiar
 * la cantidad de los insumos de su receta despues de creado. Este modulo
 * agrega esa operacion (reemplazo completo de la lista de RecetaInsumo de una
 * Receta), siguiendo el mismo patron que `crearProducto` (lib/menu/productos.ts):
 * valida, muta el store en memoria via getDb(), usa uid()/ahora().
 *
 * Modelo: "reemplazo completo" (el caller manda la lista COMPLETA de items
 * deseada: {insumoId, cantidad}[]). Esto cubre agregar (item nuevo en la
 * lista), quitar (item ausente de la lista) y cambiar cantidad (mismo
 * insumoId, cantidad distinta) con una sola operacion idempotente, sin
 * necesitar tres endpoints separados. Si el producto no tenia Receta todavia
 * (comun en items importados de Recetario_Simplificado.xlsx sin desglose,
 * ver lib/data/catalog-recetario.generado.ts), se crea una nueva Receta activa.
 */

import { getDb, uid } from "../db/store";
import type { Insumo, Receta, RecetaInsumo, TipoAlergeno } from "../domain/types";
import { alergenosDeProducto } from "./alergenos";
import { calcularCostoRecetaProducto } from "./costeo";
import { ErrorMenu } from "./errores";

export interface ItemRecetaInput {
  insumoId: string;
  /** Cantidad en la unidad de medida del insumo (Insumo.unidadMedida). Debe ser > 0. */
  cantidad: number;
}

export interface RecetaInsumoConNombre extends RecetaInsumo {
  nombreInsumo: string;
  unidadMedida: string;
}

export interface RecetaDeProducto {
  productoId: string;
  /** null = el producto no tiene receta definida todavia (ok, ver Receta en lib/domain/types.ts). */
  receta: Receta | null;
  items: RecetaInsumoConNombre[];
  /**
   * AGREGADO (Fase B, 2026-07-22): costo ESTIMADO DEMO de estos insumos a
   * estas cantidades (ver lib/menu/costeo.ts para el aviso de escala — NO es
   * un costo por porcion listo para comparar contra `Producto.precioBase`).
   * `null` = sin receta, o sin ningun insumo con `costoUnitarioCentavos`
   * poblado.
   */
  costoEstimadoCentavos: number | null;
  /** true si algun insumo (propio o de un BOM anidado) no tiene costo DEMO poblado — el numero de arriba es parcial. */
  costoIncompleto: boolean;
  /**
   * AGREGADO (Fase B, 2026-07-22, ver docs/requisitos.md S-16): alergenos
   * DEMO detectados para este producto (heuristica de nombre de insumo, ver
   * lib/data/catalog-insumos-alergenos.demo.ts) — NO son datos reales
   * verificados.
   */
  alergenos: TipoAlergeno[];
}

function validarProducto(productoId: string): void {
  const existe = getDb().productos.some((p) => p.id === productoId);
  if (!existe) {
    throw new ErrorMenu("producto_no_encontrado", `Producto ${productoId} no existe`, 404);
  }
}

function conNombreInsumo(ri: RecetaInsumo, insumosPorId: Map<string, Insumo>): RecetaInsumoConNombre {
  const insumo = insumosPorId.get(ri.insumoId);
  return {
    ...ri,
    nombreInsumo: insumo?.nombre ?? "(insumo desconocido)",
    unidadMedida: insumo?.unidadMedida ?? "",
  };
}

/** Devuelve la receta activa de un producto (con nombres de insumo resueltos) o null si no tiene. */
export function obtenerRecetaProducto(productoId: string): RecetaDeProducto {
  validarProducto(productoId);
  const db = getDb();
  const insumosPorId = new Map(db.insumos.map((i) => [i.id, i]));

  const receta = db.recetas.find((r) => r.productoId === productoId && r.activo) ?? null;
  if (!receta) {
    return { productoId, receta: null, items: [], costoEstimadoCentavos: null, costoIncompleto: false, alergenos: [] };
  }

  const items = db.recetaInsumos
    .filter((ri) => ri.recetaId === receta.id)
    .map((ri) => conNombreInsumo(ri, insumosPorId));

  const costo = calcularCostoRecetaProducto(productoId);

  return {
    productoId,
    receta,
    items,
    costoEstimadoCentavos: costo?.costoCentavos ?? null,
    costoIncompleto: costo?.costoIncompleto ?? false,
    alergenos: alergenosDeProducto(productoId),
  };
}

/** Lista todos los insumos del catalogo (para el selector de ingredientes en la UI de edicion). */
export function listarInsumosCatalogo(): Insumo[] {
  return getDb().insumos;
}

/**
 * Reemplaza por completo la lista de RecetaInsumo de la receta ACTIVA de un
 * producto (crea la Receta si el producto no tenia una). Valida que cada
 * insumoId exista, que las cantidades sean numeros positivos, y que no haya
 * insumoId duplicado dentro del mismo request (ambiguo: ¿cual cantidad manda?).
 */
export function guardarRecetaProducto(productoId: string, items: ItemRecetaInput[]): RecetaDeProducto {
  validarProducto(productoId);

  if (!Array.isArray(items)) {
    throw new ErrorMenu("items_invalidos", "items debe ser un arreglo", 422);
  }

  const db = getDb();
  const insumosPorId = new Map(db.insumos.map((i) => [i.id, i]));

  const vistos = new Set<string>();
  for (const item of items) {
    if (!item || typeof item.insumoId !== "string" || !item.insumoId) {
      throw new ErrorMenu("insumo_requerido", "Cada item requiere insumoId", 422);
    }
    if (!insumosPorId.has(item.insumoId)) {
      throw new ErrorMenu("insumo_no_encontrado", `Insumo ${item.insumoId} no existe`, 422);
    }
    if (typeof item.cantidad !== "number" || !Number.isFinite(item.cantidad) || item.cantidad <= 0) {
      throw new ErrorMenu(
        "cantidad_invalida",
        `Cantidad invalida para insumo ${item.insumoId}: debe ser un numero > 0`,
        422
      );
    }
    if (vistos.has(item.insumoId)) {
      throw new ErrorMenu(
        "insumo_duplicado",
        `El insumo ${item.insumoId} aparece mas de una vez en la receta`,
        422
      );
    }
    vistos.add(item.insumoId);
  }

  let receta = db.recetas.find((r) => r.productoId === productoId && r.activo);
  if (!receta) {
    receta = { id: uid(), productoId, activo: true };
    db.recetas.push(receta);
  }

  // Reemplazo completo: se quitan todas las lineas viejas de esta receta y se
  // insertan las nuevas. Cubre agregar/quitar/cambiar cantidad en una sola
  // operacion (ver docstring del modulo).
  db.recetaInsumos = db.recetaInsumos.filter((ri) => ri.recetaId !== receta!.id);
  for (const item of items) {
    db.recetaInsumos.push({
      id: uid(),
      recetaId: receta.id,
      insumoId: item.insumoId,
      cantidad: item.cantidad,
    });
  }

  return obtenerRecetaProducto(productoId);
}
