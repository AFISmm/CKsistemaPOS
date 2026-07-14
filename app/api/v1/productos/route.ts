/**
 * /api/v1/productos — DUENO: menu-inventario-pos.
 *
 * GET: lista todos los productos del catalogo (para /menu).
 * POST: alta de un producto nuevo dentro de una categoria existente.
 */

import { conPersistencia } from "@/lib/db/store";
import { crearProducto, listarProductos, type NuevoProductoInput } from "@/lib/menu/productos";
import { respuestaErrorMenu } from "@/lib/menu/http";

export const dynamic = "force-dynamic";

/** GET /api/v1/productos */
export async function GET() {
  return conPersistencia(async () => {
    try {
      const productos = listarProductos();
      return Response.json({ productos });
    } catch (e) {
      return respuestaErrorMenu(e);
    }
  });
}

/** POST /api/v1/productos — crea un plato nuevo en el catalogo. */
export async function POST(request: Request) {
  return conPersistencia(async () => {
    try {
      const body = (await request.json().catch(() => ({}))) as NuevoProductoInput;
      const producto = crearProducto(body);
      return Response.json({ producto }, { status: 201 });
    } catch (e) {
      return respuestaErrorMenu(e);
    }
  });
}
