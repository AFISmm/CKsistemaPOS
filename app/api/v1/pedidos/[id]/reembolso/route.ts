import { reembolsar } from "@/lib/sales/engine";
import { ErrorDominio } from "@/lib/sales/errores";
import { respuestaError } from "@/lib/sales/http";

import { conPersistencia } from "@/lib/db/store";

export const dynamic = "force-dynamic";

/** POST /api/v1/pedidos/[id]/reembolso — {usuarioId, motivo}. Solo pedidos cobrados. */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  return conPersistencia(async () => {
    try {
      const body = (await request.json().catch(() => null)) as
        | { usuarioId?: string; motivo?: string }
        | null;
      if (!body || typeof body.usuarioId !== "string" || typeof body.motivo !== "string") {
        throw new ErrorDominio("cuerpo_invalido", "Se requiere usuarioId (string) y motivo (string)", 422);
      }
      const pedido = reembolsar(params.id, { usuarioId: body.usuarioId, motivo: body.motivo });
      return Response.json({ pedido });
    } catch (e) {
      return respuestaError(e);
    }
  });
}
