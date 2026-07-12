import { listarMarcajes, registrarMarcaje, type RegistrarMarcajeInput } from "@/lib/rrhh/asistencia";
import { respuestaErrorRrhh } from "@/lib/rrhh/http";

export const dynamic = "force-dynamic";

/** GET /api/v1/asistencia?empleadoId=&ubicacionId=&desde=&hasta= — lista marcajes. */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const marcajes = listarMarcajes({
      empleadoId: searchParams.get("empleadoId") ?? undefined,
      ubicacionId: searchParams.get("ubicacionId") ?? undefined,
      desde: searchParams.get("desde") ?? undefined,
      hasta: searchParams.get("hasta") ?? undefined,
    });
    return Response.json({ marcajes });
  } catch (e) {
    return respuestaErrorRrhh(e);
  }
}

/**
 * POST /api/v1/asistencia — registra un marcaje de entrada/salida.
 * DEMO: no hay integracion real con proveedor de reloj checador (ej.
 * XmartClock); el marcaje se dispara manualmente desde /empleados/[id],
 * con checkboxes que simulan geofence/identidad.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as RegistrarMarcajeInput;
    const marcaje = registrarMarcaje(body);
    return Response.json({ marcaje }, { status: 201 });
  } catch (e) {
    return respuestaErrorRrhh(e);
  }
}
