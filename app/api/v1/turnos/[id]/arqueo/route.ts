import { calcularArqueo } from "@/lib/sales/turnos";
import { respuestaError } from "@/lib/sales/http";

import { conPersistencia } from "@/lib/db/store";

export const dynamic = "force-dynamic";

/** GET /api/v1/turnos/[id]/arqueo — totales por metodo de pago (efectivo/tarjeta/otro). */
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  return conPersistencia(async () => {
    try {
      const arqueo = calcularArqueo(params.id);
      return Response.json({ arqueo });
    } catch (e) {
      return respuestaError(e);
    }
  });
}
