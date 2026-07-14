import { darDeBajaEmpleado, type BajaEmpleadoInput } from "@/lib/rrhh/empleados";
import { respuestaErrorRrhh } from "@/lib/rrhh/http";

import { conPersistencia } from "@/lib/db/store";

export const dynamic = "force-dynamic";

/** POST /api/v1/empleados/[id]/baja — baja logica {motivo, usuarioId?}. */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  return conPersistencia(async () => {
    try {
      const body = (await request.json().catch(() => ({}))) as BajaEmpleadoInput;
      const empleado = darDeBajaEmpleado(params.id, body);
      return Response.json({ empleado });
    } catch (e) {
      return respuestaErrorRrhh(e);
    }
  });
}
