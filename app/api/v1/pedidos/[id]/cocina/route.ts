import { avanzarEstadoCocina } from "@/lib/sales/engine";
import { respuestaError } from "@/lib/sales/http";

import { conPersistencia } from "@/lib/db/store";

export const dynamic = "force-dynamic";

/** POST /api/v1/pedidos/[id]/cocina — {lineaId?}. Avanza recibido->preparando->listo. */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  return conPersistencia(async () => {
    try {
      const body = (await request.json().catch(() => ({}))) as { lineaId?: string };
      const pedido = avanzarEstadoCocina(params.id, body.lineaId);
      return Response.json({ pedido });
    } catch (e) {
      return respuestaError(e);
    }
  });
}
