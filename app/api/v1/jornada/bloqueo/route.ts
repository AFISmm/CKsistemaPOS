import { consultarBloqueo } from "@/lib/jornada/marcaje";
import { respuestaErrorJornada } from "@/lib/jornada/http";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/jornada/bloqueo?empleadoId= — estado de bloqueo de
 * verificacion facial vigente (o null). Util para que /jornada/marcar
 * recupere el estado real del servidor al cargar/recargar la pagina, en vez
 * de depender solo del conteo en memoria del cliente.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const empleadoId = searchParams.get("empleadoId");
    if (!empleadoId) {
      return Response.json(
        { codigo: "empleadoId_requerido", mensaje: "empleadoId es requerido" },
        { status: 400 }
      );
    }
    return Response.json(consultarBloqueo(empleadoId));
  } catch (e) {
    return respuestaErrorJornada(e);
  }
}
