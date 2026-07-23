/**
 * GET /api/v1/insumos — DUENO: menu-inventario-pos.
 *
 * Lista todos los insumos del catalogo (id, nombre, unidadMedida,
 * umbralStockBajo). AGREGADO Fase A (2026-07-22) para alimentar el selector
 * de ingredientes de la UI de edicion de receta (ver components/menu/EditarRecetaModal.tsx).
 */

import { conPersistencia } from "@/lib/db/store";
import { listarInsumosCatalogo } from "@/lib/menu/recetas";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  return conPersistencia(async () => {
    const insumos = listarInsumosCatalogo();
    return Response.json({ insumos });
  });
}
