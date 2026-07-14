/**
 * POST /api/v1/productos/[id]/86 — DUENO: menu-inventario-pos.
 *
 * Marca/desmarca 86 (agotado) un producto. Body: { disponible: boolean, usuarioId?: string }.
 */

import { conPersistencia, getDb } from "@/lib/db/store";
import { marcar86 } from "@/lib/inventory/inventario";

export const dynamic = "force-dynamic";

interface Body86 {
  disponible?: boolean;
  usuarioId?: string;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
): Promise<Response> {
  return conPersistencia(async () => {
    const { id } = await context.params;

    let body: Body86;
    try {
      body = (await request.json()) as Body86;
    } catch {
      return Response.json(
        { error: "Body invalido: se espera JSON { disponible: boolean, usuarioId?: string }" },
        { status: 400 }
      );
    }

    if (typeof body.disponible !== "boolean") {
      return Response.json(
        { error: "Campo 'disponible' (boolean) es requerido" },
        { status: 400 }
      );
    }

    try {
      marcar86(id, body.disponible, body.usuarioId ?? "sistema");
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : "Error desconocido";
      return Response.json({ error: mensaje }, { status: 404 });
    }

    const producto = getDb().productos.find((p) => p.id === id);
    return Response.json({ producto });
  });
}
