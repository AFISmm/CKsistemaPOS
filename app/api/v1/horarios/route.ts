import { crearHorario, listarHorarios, type NuevoHorarioInput } from "@/lib/rrhh/horarios";
import { respuestaErrorRrhh } from "@/lib/rrhh/http";

import { conPersistencia } from "@/lib/db/store";

export const dynamic = "force-dynamic";

/** GET /api/v1/horarios?empleadoId=&ubicacionId=&desde=&hasta= — lista horarios programados (HorarioTurno). */
export async function GET(request: Request) {
  return conPersistencia(async () => {
    try {
      const { searchParams } = new URL(request.url);
      const horarios = listarHorarios({
        empleadoId: searchParams.get("empleadoId") ?? undefined,
        ubicacionId: searchParams.get("ubicacionId") ?? undefined,
        desde: searchParams.get("desde") ?? undefined,
        hasta: searchParams.get("hasta") ?? undefined,
      });
      return Response.json({ horarios });
    } catch (e) {
      return respuestaErrorRrhh(e);
    }
  });
}

/**
 * POST /api/v1/horarios — crea un horario de trabajo programado.
 * Devuelve `minutosTotalesSemana` (lunes-domingo, incluyendo el horario
 * recien creado) para que la UI muestre el aviso de horas extra (>40h/semana)
 * ANTES de que el usuario decida guardar; este endpoint no bloquea el
 * guardado si se supera el limite (ver lib/rrhh/horarios.ts).
 */
export async function POST(request: Request) {
  return conPersistencia(async () => {
    try {
      const body = (await request.json().catch(() => ({}))) as NuevoHorarioInput;
      const { horario, minutosTotalesSemana } = crearHorario(body);
      return Response.json({ horario, minutosTotalesSemana }, { status: 201 });
    } catch (e) {
      return respuestaErrorRrhh(e);
    }
  });
}
