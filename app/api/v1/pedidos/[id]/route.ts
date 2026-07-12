import { anularPedido, obtenerPedido, type AnularPedidoInput } from "@/lib/sales/engine";
import { ErrorDominio } from "@/lib/sales/errores";
import { respuestaError } from "@/lib/sales/http";

export const dynamic = "force-dynamic";

/** GET /api/v1/pedidos/[id] */
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const pedido = obtenerPedido(params.id);
    if (!pedido) {
      throw new ErrorDominio("pedido_no_encontrado", `Pedido ${params.id} no existe`, 404);
    }
    return Response.json({ pedido });
  } catch (e) {
    return respuestaError(e);
  }
}

/** DELETE /api/v1/pedidos/[id] — anula un pedido no cobrado (con trazabilidad). */
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = (await request.json().catch(() => ({}))) as AnularPedidoInput;
    const pedido = anularPedido(params.id, body);
    return Response.json({ pedido });
  } catch (e) {
    return respuestaError(e);
  }
}
