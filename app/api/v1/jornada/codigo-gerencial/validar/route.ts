import { validarCodigoGerencial } from "@/lib/jornada/codigoGerencial";
import { respuestaErrorJornada } from "@/lib/jornada/http";

import { conPersistencia } from "@/lib/db/store";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/jornada/codigo-gerencial/validar — body { ubicacionId, codigo }.
 *
 * Valida un codigo de autorizacion gerencial (ver
 * lib/jornada/codigoGerencial.ts) SIN revelar el codigo vigente: responde
 * solo { valido: boolean }. Pensado para que un checkpoint de autorizacion
 * (ej. anular/descontar en el POS) confirme que el codigo que el cajero
 * recibio de un gerente por telefono/chat es el correcto para HOY, sin que
 * ese checkpoint necesite conocer el algoritmo ni el secreto.
 */
export async function POST(request: Request) {
  return conPersistencia(async () => {
    try {
      const body = (await request.json().catch(() => ({}))) as {
        ubicacionId?: string;
        codigo?: string;
      };
      if (!body.ubicacionId || !body.codigo) {
        return Response.json(
          { codigo: "campos_requeridos", mensaje: "ubicacionId y codigo son requeridos" },
          { status: 422 }
        );
      }
      const valido = validarCodigoGerencial(body.ubicacionId, body.codigo);
      return Response.json({ valido });
    } catch (e) {
      return respuestaErrorJornada(e);
    }
  });
}
