import { editarEmpleado, obtenerEmpleado, type EditarEmpleadoInput } from "@/lib/rrhh/empleados";
import { ErrorRrhh } from "@/lib/rrhh/errores";
import { respuestaErrorRrhh } from "@/lib/rrhh/http";

import { conPersistencia } from "@/lib/db/store";

export const dynamic = "force-dynamic";

/** GET /api/v1/empleados/[id] */
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  return conPersistencia(async () => {
    try {
      const empleado = obtenerEmpleado(params.id);
      if (!empleado) {
        throw new ErrorRrhh("empleado_no_encontrado", `Empleado ${params.id} no existe`, 404);
      }
      return Response.json({ empleado });
    } catch (e) {
      return respuestaErrorRrhh(e);
    }
  });
}

/** PATCH /api/v1/empleados/[id] — edita datos/rol/tienda/tarifa del empleado. */
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  return conPersistencia(async () => {
    try {
      const body = (await request.json().catch(() => ({}))) as EditarEmpleadoInput;
      const empleado = editarEmpleado(params.id, body);
      return Response.json({ empleado });
    } catch (e) {
      return respuestaErrorRrhh(e);
    }
  });
}
