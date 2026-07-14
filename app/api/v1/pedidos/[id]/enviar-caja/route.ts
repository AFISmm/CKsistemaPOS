import { enviarACaja } from "@/lib/sales/engine";
import { respuestaError } from "@/lib/sales/http";

import { conPersistencia } from "@/lib/db/store";

export const dynamic = "force-dynamic";

/** POST /api/v1/pedidos/[id]/enviar-caja — transicion "listo" -> "entregado" (boton "Enviar a caja" del KDS). */
export async function POST(_request: Request, { params }: { params: { id: string } }) {
  return conPersistencia(async () => {
    try {
      const pedido = enviarACaja(params.id);
      return Response.json({ pedido });
    } catch (e) {
      return respuestaError(e);
    }
  });
}
