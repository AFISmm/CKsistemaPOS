import { avanzarEstadoCocina } from "@/lib/sales/engine";
import { respuestaError } from "@/lib/sales/http";

export const dynamic = "force-dynamic";

/** POST /api/v1/pedidos/[id]/cocina — {lineaId?}. Avanza recibido->preparando->listo. */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = (await request.json().catch(() => ({}))) as { lineaId?: string };
    const pedido = avanzarEstadoCocina(params.id, body.lineaId);
    return Response.json({ pedido });
  } catch (e) {
    return respuestaError(e);
  }
}
