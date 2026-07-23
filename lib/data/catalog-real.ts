/**
 * Catalogo REAL de Chicken Kitchen — DUENO: menu-inventario-pos (Fase A, 2026-07-22).
 *
 * Reemplaza al catalogo DEMO fabricado de `lib/data/catalog.ts` (que queda en
 * el repo solo como referencia/fallback, ya no se usa desde `lib/db/store.ts`)
 * con datos reales importados de `Recetario_Simplificado.xlsx`: 469 productos
 * vendibles en 15 categorias, 184 con receta (RecetaInsumo) real, sobre 84
 * insumos unicos deduplicados. Ver `scripts/importar-recetario.js` para el
 * proceso de import completo (reglas de parseo, exclusiones, caveats de datos)
 * y `lib/data/catalog-recetario.generado.ts` (auto-generado, no editar a mano)
 * para los datos en si.
 *
 * Combos / GrupoModificador / Modificador quedan vacios a proposito: el
 * archivo fuente es un recetario de costos, no una definicion de grupos de
 * modificadores, y no hay forma confiable de derivarlos de el (ver caveats en
 * el script de import). El modelo de dominio soporta un catalogo sin estas
 * colecciones (ver components/pos/__tests__/api.test.ts, que ya prueba
 * gruposModificador: [] como caso valido).
 */

import type { SeedCatalogo } from "../domain/types";
import {
  CATEGORIAS_RECETARIO,
  INSUMOS_RECETARIO,
  PRODUCTOS_RECETARIO,
  RECETAS_RECETARIO,
  RECETA_INSUMOS_RECETARIO,
  STOCK_INICIAL_RECETARIO,
} from "./catalog-recetario.generado";

export function getSeedCatalogo(): SeedCatalogo {
  return {
    categorias: CATEGORIAS_RECETARIO,
    productos: PRODUCTOS_RECETARIO,
    combos: [],
    gruposModificador: [],
    modificadores: [],
    insumos: INSUMOS_RECETARIO,
    recetas: RECETAS_RECETARIO,
    recetaInsumos: RECETA_INSUMOS_RECETARIO,
    stockInicial: STOCK_INICIAL_RECETARIO,
  };
}
