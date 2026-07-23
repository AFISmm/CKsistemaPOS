import { editarHorario, type EditarHorarioInput } from "@/lib/rrhh/horarios";
import { respuestaErrorRrhh } from "@/lib/rrhh/http";

import { conPersistencia } from "@/lib/db/store";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/v1/horarios/[id] — edita un HorarioTurno ya asignado
 * (fecha/horaInicioProgramada/horaFinProgramada). Ver lib/rrhh/horarios.ts
 * `editarHorario` para validaciones y evento de auditoria ("cambioHorarioEmpleado").
 */
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  return conPersistencia(async () => {
    try {
      const body = (await request.json().catch(() => ({}))) as EditarHorarioInput;
      const { horario, minutosTotalesSemana } = editarHorario(params.id, body);
      return Response.json({ horario, minutosTotalesSemana });
    } catch (e) {
      return respuestaErrorRrhh(e);
    }
  });
}
