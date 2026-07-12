import { calcularArqueo } from "@/lib/sales/turnos";
import { respuestaError } from "@/lib/sales/http";

export const dynamic = "force-dynamic";

/** GET /api/v1/turnos/[id]/arqueo — totales por metodo de pago (efectivo/tarjeta/otro). */
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const arqueo = calcularArqueo(params.id);
    return Response.json({ arqueo });
  } catch (e) {
    return respuestaError(e);
  }
}
