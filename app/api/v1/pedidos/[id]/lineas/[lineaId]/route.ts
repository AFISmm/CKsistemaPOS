import { actualizarLinea, type CambioLinea } from "@/lib/sales/engine";
import { respuestaError } from "@/lib/sales/http";

export const dynamic = "force-dynamic";

/** PATCH /api/v1/pedidos/[id]/lineas/[lineaId] — cambia cantidad o elimina la linea. */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string; lineaId: string } }
) {
  try {
    const body = (await request.json().catch(() => ({}))) as CambioLinea;
    const pedido = actualizarLinea(params.id, params.lineaId, body);
    return Response.json({ pedido });
  } catch (e) {
    return respuestaError(e);
  }
}
