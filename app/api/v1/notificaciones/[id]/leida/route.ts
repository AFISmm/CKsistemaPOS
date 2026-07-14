import { marcarNotificacionLeida } from "@/lib/notificaciones/notificaciones";
import { respuestaErrorNotificaciones } from "@/lib/notificaciones/http";

import { conPersistencia } from "@/lib/db/store";

export const dynamic = "force-dynamic";

/** POST /api/v1/notificaciones/[id]/leida — marca una notificacion como leida. */
export async function POST(_request: Request, { params }: { params: { id: string } }) {
  return conPersistencia(async () => {
    try {
      const notificacion = marcarNotificacionLeida(params.id);
      return Response.json({ notificacion });
    } catch (e) {
      return respuestaErrorNotificaciones(e);
    }
  });
}
