import { enviarACocina } from "@/lib/sales/engine";
import { respuestaError } from "@/lib/sales/http";

export const dynamic = "force-dynamic";

/** POST /api/v1/pedidos/[id]/enviar-cocina */
export async function POST(_request: Request, { params }: { params: { id: string } }) {
  try {
    const pedido = enviarACocina(params.id);
    return Response.json({ pedido });
  } catch (e) {
    return respuestaError(e);
  }
}
