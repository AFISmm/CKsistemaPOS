import { crearEmpleado, listarEmpleados, type NuevoEmpleadoInput } from "@/lib/rrhh/empleados";
import { respuestaErrorRrhh } from "@/lib/rrhh/http";
import type { EstadoEmpleado } from "@/lib/domain/types";

export const dynamic = "force-dynamic";

/** GET /api/v1/empleados?ubicacionId=&estado= */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const ubicacionId = searchParams.get("ubicacionId") ?? undefined;
    const estado = (searchParams.get("estado") as EstadoEmpleado | null) ?? undefined;
    const empleados = listarEmpleados({ ubicacionId, estado });
    return Response.json({ empleados });
  } catch (e) {
    return respuestaErrorRrhh(e);
  }
}

/** POST /api/v1/empleados — alta de empleado (onboarding). */
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as NuevoEmpleadoInput;
    const empleado = crearEmpleado(body);
    return Response.json({ empleado }, { status: 201 });
  } catch (e) {
    return respuestaErrorRrhh(e);
  }
}
