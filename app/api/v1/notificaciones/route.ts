import { listarNotificaciones } from "@/lib/notificaciones/notificaciones";
import { respuestaErrorNotificaciones } from "@/lib/notificaciones/http";

export const dynamic = "force-dynamic";

/** GET /api/v1/notificaciones?ubicacionId= */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const ubicacionId = searchParams.get("ubicacionId") ?? undefined;
    const notificaciones = listarNotificaciones(ubicacionId);
    return Response.json({ notificaciones });
  } catch (e) {
    return respuestaErrorNotificaciones(e);
  }
}
