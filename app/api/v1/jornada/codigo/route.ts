import { obtenerCodigoVigente } from "@/lib/jornada/marcaje";
import { respuestaErrorJornada } from "@/lib/jornada/http";

import { conPersistencia } from "@/lib/db/store";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/jornada/codigo?ubicacionId= — codigo TOTP vigente + segundos
 * restantes hasta que rote. UNICO endpoint autorizado a revelar el codigo;
 * pensado para ser consumido por la pantalla central de la tienda
 * (/jornada/pantalla), nunca por el celular del empleado.
 */
export async function GET(request: Request) {
  return conPersistencia(async () => {
    try {
      const { searchParams } = new URL(request.url);
      const ubicacionId = searchParams.get("ubicacionId");
      if (!ubicacionId) {
        return Response.json(
          { codigo: "ubicacionId_requerido", mensaje: "ubicacionId es requerido" },
          { status: 400 }
        );
      }
      const vigente = obtenerCodigoVigente(ubicacionId);
      return Response.json(vigente);
    } catch (e) {
      return respuestaErrorJornada(e);
    }
  });
}
