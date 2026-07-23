import { obtenerCodigoGerencialVigente } from "@/lib/jornada/codigoGerencial";
import { respuestaErrorJornada } from "@/lib/jornada/http";

import { conPersistencia } from "@/lib/db/store";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/jornada/codigo-gerencial?ubicacionId= — codigo de autorizacion
 * gerencial vigente HOY (rota 1 vez al dia, ver lib/jornada/codigoGerencial.ts)
 * + segundos hasta que rote. Pensado para una pantalla/panel gerencial a
 * demanda (no un kiosko fijo compartido como /jornada/pantalla).
 *
 * NOTA DE SEGURIDAD HONESTA: igual que el resto de esta demo, este endpoint
 * NO verifica un token de sesion server-side todavia (ver la nota completa en
 * lib/jornada/codigoGerencial.ts) — el gate de "solo gerentes" hoy vive en el
 * cliente (app/jornada/codigo-gerencial/page.tsx).
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
      const vigente = obtenerCodigoGerencialVigente(ubicacionId);
      return Response.json(vigente);
    } catch (e) {
      return respuestaErrorJornada(e);
    }
  });
}
