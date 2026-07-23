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
 * AGREGADO Fase B (2026-07-22, ver docs/analisis-revision-20260722-modulos-innovacion-seguridad.md
 * Anexo y docs/requisitos.md S-14/S-16): `enriquecerCatalogoFaseB` (lib/data/catalog-demo-fase-b.ts)
 * es un paso de POST-PROCESAMIENTO sobre la salida cruda del import (NO toca
 * catalog-recetario.generado.ts) que agrega, con DEMO claramente documentado:
 *  - Costo/alergenos estimados por insumo (los 84 reales).
 *  - UN insumo compuesto demo (BOM multi-nivel, Anexo A.3).
 *  - Un catalogo curado de GrupoModificador/Modificador (Sauces/Dressings/
 *    Toppings/Modifiers reales) para 6 platos ancla, con `Modificador.categoria`
 *    poblado por la heuristica de hoja/categoria de origen documentada en
 *    lib/domain/types.ts (`CategoriaModificador`).
 * `Combo` sigue vacio a proposito: el archivo fuente no trae informacion para
 * derivarlo de forma confiable (ver caveats en el script de import).
 */

import type { SeedCatalogo } from "../domain/types";
import { enriquecerCatalogoFaseB } from "./catalog-demo-fase-b";
import {
  CATEGORIAS_RECETARIO,
  INSUMOS_RECETARIO,
  PRODUCTOS_RECETARIO,
  RECETAS_RECETARIO,
  RECETA_INSUMOS_RECETARIO,
  STOCK_INICIAL_RECETARIO,
} from "./catalog-recetario.generado";

export function getSeedCatalogo(): SeedCatalogo {
  const crudo: SeedCatalogo = {
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
  return enriquecerCatalogoFaseB(crudo);
}
