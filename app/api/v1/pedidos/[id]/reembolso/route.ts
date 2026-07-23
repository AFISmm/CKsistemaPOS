import { asegurarUsuarioCoincide, requerirSesionValida } from "@/lib/auth/sesionToken";
import { reembolsar } from "@/lib/sales/engine";
import { ErrorDominio } from "@/lib/sales/errores";
import { respuestaError } from "@/lib/sales/http";

import { conPersistencia } from "@/lib/db/store";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/pedidos/[id]/reembolso — {usuarioId?, motivo}. Solo pedidos cobrados.
 *
 * RUTA CON VERIFICACION REAL DE SESION (Fase B/seguridad, revision
 * 2026-07-22): requiere header `Authorization: Bearer <token>` con un token
 * de sesion valido (ver lib/auth/sesionToken.ts). El `usuarioId` que queda
 * registrado como autor del reembolso es SIEMPRE el del token verificado; un
 * `usuarioId` de body que no coincida se rechaza con 403.
 */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  return conPersistencia(async () => {
    try {
      const usuarioIdVerificado = await requerirSesionValida(request);

      const body = (await request.json().catch(() => null)) as
        | { usuarioId?: string; motivo?: string }
        | null;
      if (!body || typeof body.motivo !== "string") {
        throw new ErrorDominio("cuerpo_invalido", "Se requiere motivo (string)", 422);
      }
      asegurarUsuarioCoincide(usuarioIdVerificado, body.usuarioId ?? null);

      const pedido = reembolsar(params.id, { usuarioId: usuarioIdVerificado, motivo: body.motivo });
      return Response.json({ pedido });
    } catch (e) {
      return respuestaError(e);
    }
  });
}
