import { resumenHoras } from "@/lib/rrhh/asistencia";
import { ErrorRrhh } from "@/lib/rrhh/errores";
import { respuestaErrorRrhh } from "@/lib/rrhh/http";

export const dynamic = "force-dynamic";

/** GET /api/v1/asistencia/resumen?empleadoId=&desde=&hasta= — minutos trabajados (sin separar regular/extra; eso lo hace nomina-pos). */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const empleadoId = searchParams.get("empleadoId");
    const desde = searchParams.get("desde");
    const hasta = searchParams.get("hasta");
    if (!empleadoId || !desde || !hasta) {
      throw new ErrorRrhh(
        "parametros_requeridos",
        "empleadoId, desde y hasta son requeridos",
        422
      );
    }
    const resumen = resumenHoras(empleadoId, desde, hasta);
    return Response.json({ resumen });
  } catch (e) {
    return respuestaErrorRrhh(e);
  }
}
