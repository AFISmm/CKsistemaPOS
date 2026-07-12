import { aplicarDescuento, type DescuentoInput } from "@/lib/sales/engine";
import { ErrorDominio } from "@/lib/sales/errores";
import { respuestaError } from "@/lib/sales/http";

export const dynamic = "force-dynamic";

/** POST /api/v1/pedidos/[id]/descuento — {tipo:"monto"|"porcentaje", valor, motivo, usuarioId} */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = (await request.json().catch(() => null)) as DescuentoInput | null;
    if (
      !body ||
      (body.tipo !== "monto" && body.tipo !== "porcentaje") ||
      typeof body.valor !== "number" ||
      typeof body.motivo !== "string" ||
      typeof body.usuarioId !== "string"
    ) {
      throw new ErrorDominio(
        "cuerpo_invalido",
        "Se requiere tipo ('monto'|'porcentaje'), valor (number), motivo (string) y usuarioId (string)",
        422
      );
    }
    const pedido = aplicarDescuento(params.id, body);
    return Response.json({ pedido });
  } catch (e) {
    return respuestaError(e);
  }
}
