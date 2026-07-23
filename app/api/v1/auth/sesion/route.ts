import { obtenerSesion } from "@/lib/auth/autenticacion";
import { respuestaErrorAuth } from "@/lib/auth/http";
import { requerirSesionValida } from "@/lib/auth/sesionToken";

import { conPersistencia } from "@/lib/db/store";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/auth/sesion — resuelve usuario+rol para la sesion guardada por
 * el cliente (el TOKEN firmado en localStorage, ver
 * lib/shell/SesionProvider.tsx / lib/auth/sesionToken.ts).
 *
 * AGREGADO (Fase B/seguridad, revision 2026-07-22): ya NO recibe `usuarioId`
 * por query string (cualquiera podia pedir `?usuarioId=<el-que-sea>` y
 * recibir esos datos). Ahora requiere header `Authorization: Bearer <token>`;
 * el `usuarioId` se extrae del token YA VERIFICADO (firma + expiracion), no
 * de nada que el cliente pueda inventar.
 */
export async function GET(request: Request) {
  return conPersistencia(async () => {
    try {
      const usuarioId = await requerirSesionValida(request);
      const { usuario, rol } = obtenerSesion(usuarioId);
      return Response.json({ usuario, rol });
    } catch (e) {
      return respuestaErrorAuth(e);
    }
  });
}
