import { obtenerSesion } from "@/lib/auth/autenticacion";
import { respuestaErrorAuth } from "@/lib/auth/http";

import { conPersistencia } from "@/lib/db/store";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/auth/sesion?usuarioId= — resuelve usuario+rol para la sesion
 * DEMO guardada por el cliente en localStorage (solo el id, ver
 * lib/shell/SesionProvider.tsx).
 */
export async function GET(request: Request) {
  return conPersistencia(async () => {
    try {
      const { searchParams } = new URL(request.url);
      const usuarioId = searchParams.get("usuarioId");
      if (!usuarioId) {
        return Response.json(
          { codigo: "usuarioId_requerido", mensaje: "Falta el parametro usuarioId." },
          { status: 400 }
        );
      }
      const { usuario, rol } = obtenerSesion(usuarioId);
      return Response.json({ usuario, rol });
    } catch (e) {
      return respuestaErrorAuth(e);
    }
  });
}
