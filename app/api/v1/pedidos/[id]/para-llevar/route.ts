import { marcarParaLlevar } from "@/lib/sales/engine";
import { respuestaError } from "@/lib/sales/http";

import { conPersistencia } from "@/lib/db/store";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/v1/pedidos/[id]/para-llevar — {paraLlevar: boolean}.
 *
 * Marca/desmarca el pedido como "para llevar" (Fase A, revision 2026-07-22
 * seccion 2.6-parcial): al pasar a true, `marcarParaLlevar`
 * (lib/sales/engine.ts) agrega automaticamente el cargo de empaque sin que el
 * cajero tenga que hacerlo aparte.
 */
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  return conPersistencia(async () => {
    try {
      const body = (await request.json().catch(() => ({}))) as { paraLlevar?: unknown };
      const paraLlevar = body.paraLlevar === true;
      const pedido = marcarParaLlevar(params.id, { paraLlevar });
      return Response.json({ pedido });
    } catch (e) {
      return respuestaError(e);
    }
  });
}
