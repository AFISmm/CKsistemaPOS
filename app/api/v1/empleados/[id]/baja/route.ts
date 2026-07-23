import { asegurarUsuarioCoincide, requerirSesionValida } from "@/lib/auth/sesionToken";
import { darDeBajaEmpleado, type BajaEmpleadoInput } from "@/lib/rrhh/empleados";
import { respuestaErrorRrhh } from "@/lib/rrhh/http";

import { conPersistencia } from "@/lib/db/store";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/empleados/[id]/baja — baja logica {motivo, usuarioId?}.
 *
 * RUTA CON VERIFICACION REAL DE SESION (Fase B/seguridad, revision
 * 2026-07-22): requiere header `Authorization: Bearer <token>` con un token
 * de sesion valido (ver lib/auth/sesionToken.ts). El `usuarioId` que queda
 * registrado como quien dio de baja es SIEMPRE el del token verificado; un
 * `usuarioId` de body que no coincida se rechaza con 403.
 */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  return conPersistencia(async () => {
    try {
      const usuarioIdVerificado = await requerirSesionValida(request);

      const body = (await request.json().catch(() => ({}))) as BajaEmpleadoInput;
      asegurarUsuarioCoincide(usuarioIdVerificado, body.usuarioId ?? null);

      const empleado = darDeBajaEmpleado(params.id, { ...body, usuarioId: usuarioIdVerificado });
      return Response.json({ empleado });
    } catch (e) {
      return respuestaErrorRrhh(e);
    }
  });
}
