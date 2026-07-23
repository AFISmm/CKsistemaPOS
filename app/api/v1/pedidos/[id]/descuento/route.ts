import { asegurarUsuarioCoincide, requerirSesionValida } from "@/lib/auth/sesionToken";
import { aplicarDescuento, type DescuentoInput } from "@/lib/sales/engine";
import { ErrorDominio } from "@/lib/sales/errores";
import { respuestaError } from "@/lib/sales/http";

import { conPersistencia } from "@/lib/db/store";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/pedidos/[id]/descuento — {tipo:"monto"|"porcentaje", valor, motivo, usuarioId?}
 *
 * RUTA CON VERIFICACION REAL DE SESION (Fase B/seguridad, revision
 * 2026-07-22): requiere header `Authorization: Bearer <token>` con un token
 * de sesion valido (ver lib/auth/sesionToken.ts). El `usuarioId` que queda
 * registrado en el evento de auditoria (`descuentoAplicado`) es SIEMPRE el
 * del token verificado, nunca el que el body diga — si el body manda un
 * `usuarioId` que no coincide con el del token, se rechaza con 403 en vez de
 * confiar en ninguno de los dos en silencio.
 */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  return conPersistencia(async () => {
    try {
      const usuarioIdVerificado = await requerirSesionValida(request);

      const body = (await request.json().catch(() => null)) as
        | (Omit<DescuentoInput, "usuarioId"> & { usuarioId?: string })
        | null;
      if (
        !body ||
        (body.tipo !== "monto" && body.tipo !== "porcentaje") ||
        typeof body.valor !== "number" ||
        typeof body.motivo !== "string"
      ) {
        throw new ErrorDominio(
          "cuerpo_invalido",
          "Se requiere tipo ('monto'|'porcentaje'), valor (number) y motivo (string)",
          422
        );
      }
      asegurarUsuarioCoincide(usuarioIdVerificado, body.usuarioId ?? null);

      const pedido = aplicarDescuento(params.id, { ...body, usuarioId: usuarioIdVerificado });
      return Response.json({ pedido });
    } catch (e) {
      return respuestaError(e);
    }
  });
}
