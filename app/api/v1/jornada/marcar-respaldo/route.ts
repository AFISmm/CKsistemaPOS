import { marcarPorPinRespaldo, type MarcarPorPinInput } from "@/lib/jornada/marcaje";
import { respuestaErrorJornada } from "@/lib/jornada/http";

import { conPersistencia } from "@/lib/db/store";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/jornada/marcar-respaldo — body { empleadoId, tipo, pin }.
 *
 * Plan B tras agotar los 3 intentos de verificacion facial: valida el PIN
 * contra Usuario.pinHash del empleado (reutiliza el mismo mecanismo que el
 * login DEMO del shell) y registra el Marcaje con
 * `metodoVerificacion="pinRespaldo"`. El servidor exige que el empleado este
 * REALMENTE bloqueado (no confia en el cliente) — ver
 * lib/jornada/marcaje.ts:marcarPorPinRespaldo.
 */
export async function POST(request: Request) {
  return conPersistencia(async () => {
    try {
      const body = (await request.json().catch(() => ({}))) as Partial<MarcarPorPinInput>;
      if (!body.empleadoId || !body.tipo || !body.pin) {
        return Response.json(
          { codigo: "campos_requeridos", mensaje: "empleadoId, tipo y pin son requeridos" },
          { status: 422 }
        );
      }
      const marcaje = marcarPorPinRespaldo({
        empleadoId: body.empleadoId,
        tipo: body.tipo,
        pin: body.pin,
      });
      return Response.json({ marcaje }, { status: 201 });
    } catch (e) {
      return respuestaErrorJornada(e);
    }
  });
}
