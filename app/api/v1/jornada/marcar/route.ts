import { marcarPorFacial, type MarcarPorFacialInput } from "@/lib/jornada/marcaje";
import { respuestaErrorJornada } from "@/lib/jornada/http";

import { conPersistencia } from "@/lib/db/store";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/jornada/marcar — body { empleadoId, tipo, codigo }.
 *
 * Se llama DESPUES de que el celular del empleado ya "paso" la verificacion
 * facial simulada (mock). Valida el codigo TOTP de 6 digitos contra la
 * ubicacion del empleado (tolerando 1 ventana de desfase) y, si es valido,
 * registra el Marcaje con `identidadVerificada=true` y
 * `metodoVerificacion="facial"` (ver lib/jornada/marcaje.ts).
 */
export async function POST(request: Request) {
  return conPersistencia(async () => {
    try {
      const body = (await request.json().catch(() => ({}))) as Partial<MarcarPorFacialInput>;
      if (!body.empleadoId || !body.tipo || !body.codigo) {
        return Response.json(
          { codigo: "campos_requeridos", mensaje: "empleadoId, tipo y codigo son requeridos" },
          { status: 422 }
        );
      }
      const marcaje = marcarPorFacial({
        empleadoId: body.empleadoId,
        tipo: body.tipo,
        codigo: body.codigo,
      });
      return Response.json({ marcaje }, { status: 201 });
    } catch (e) {
      return respuestaErrorJornada(e);
    }
  });
}
