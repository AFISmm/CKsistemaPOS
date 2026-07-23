/**
 * /api/v1/productos/[id]/receta — DUENO: menu-inventario-pos.
 *
 * GET: devuelve la receta activa del producto (con nombres/unidad de insumo
 *      resueltos) o { receta: null, items: [] } si no tiene una todavia.
 * PUT: reemplaza por completo la lista de ingredientes (RecetaInsumo) de la
 *      receta activa del producto — crea la Receta si no existia. Body:
 *      { items: { insumoId: string, cantidad: number }[] }.
 *
 * AGREGADO Fase A (2026-07-22): antes de esto, un producto solo se podia dar
 * de alta sin poder editar despues los insumos de su receta (ver
 * lib/menu/recetas.ts para el detalle de la operacion de reemplazo).
 */

import { conPersistencia } from "@/lib/db/store";
import { guardarRecetaProducto, obtenerRecetaProducto, type ItemRecetaInput } from "@/lib/menu/recetas";
import { respuestaErrorMenu } from "@/lib/menu/http";

export const dynamic = "force-dynamic";

/** GET /api/v1/productos/[id]/receta */
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
): Promise<Response> {
  return conPersistencia(async () => {
    const { id } = await context.params;
    try {
      const receta = obtenerRecetaProducto(id);
      return Response.json(receta);
    } catch (e) {
      return respuestaErrorMenu(e);
    }
  });
}

interface BodyReceta {
  items?: ItemRecetaInput[];
}

/** PUT /api/v1/productos/[id]/receta */
export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
): Promise<Response> {
  return conPersistencia(async () => {
    const { id } = await context.params;
    try {
      const body = (await request.json().catch(() => ({}))) as BodyReceta;
      const receta = guardarRecetaProducto(id, body.items ?? []);
      return Response.json(receta);
    } catch (e) {
      return respuestaErrorMenu(e);
    }
  });
}
