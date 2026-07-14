import { cerrarTurnoZ, type CerrarTurnoInput } from "@/lib/sales/turnos";
import { respuestaError } from "@/lib/sales/http";

import { conPersistencia } from "@/lib/db/store";

export const dynamic = "force-dynamic";

/** POST /api/v1/turnos/[id]/cierre-z — {efectivoContado?, usuarioId?}. Genera reporteZ inmutable. */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  return conPersistencia(async () => {
    try {
      const body = (await request.json().catch(() => ({}))) as CerrarTurnoInput;
      const turno = cerrarTurnoZ(params.id, body);
      return Response.json({ turno });
    } catch (e) {
      return respuestaError(e);
    }
  });
}
