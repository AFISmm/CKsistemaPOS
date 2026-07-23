import { asegurarUsuarioCoincide, requerirSesionValida } from "@/lib/auth/sesionToken";
import { cerrarTurnoZ, type CerrarTurnoInput } from "@/lib/sales/turnos";
import { respuestaError } from "@/lib/sales/http";

import { conPersistencia } from "@/lib/db/store";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/turnos/[id]/cierre-z — {efectivoContado?, usuarioId?}. Genera reporteZ inmutable.
 *
 * RUTA CON VERIFICACION REAL DE SESION (Fase B/seguridad, revision
 * 2026-07-22): requiere header `Authorization: Bearer <token>` con un token
 * de sesion valido (ver lib/auth/sesionToken.ts). El `usuarioId` que queda
 * en el reporte Z (inmutable) es SIEMPRE el del token verificado; un
 * `usuarioId` de body que no coincida se rechaza con 403.
 */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  return conPersistencia(async () => {
    try {
      const usuarioIdVerificado = await requerirSesionValida(request);

      const body = (await request.json().catch(() => ({}))) as CerrarTurnoInput;
      asegurarUsuarioCoincide(usuarioIdVerificado, body.usuarioId ?? null);

      const turno = cerrarTurnoZ(params.id, { ...body, usuarioId: usuarioIdVerificado });
      return Response.json({ turno });
    } catch (e) {
      return respuestaError(e);
    }
  });
}
