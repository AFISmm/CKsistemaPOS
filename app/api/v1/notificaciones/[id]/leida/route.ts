import { marcarNotificacionLeida } from "@/lib/notificaciones/notificaciones";
import { respuestaErrorNotificaciones } from "@/lib/notificaciones/http";

export const dynamic = "force-dynamic";

/** POST /api/v1/notificaciones/[id]/leida — marca una notificacion como leida. */
export async function POST(_request: Request, { params }: { params: { id: string } }) {
  try {
    const notificacion = marcarNotificacionLeida(params.id);
    return Response.json({ notificacion });
  } catch (e) {
    return respuestaErrorNotificaciones(e);
  }
}
