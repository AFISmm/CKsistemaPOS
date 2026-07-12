import { agregarLinea, type NuevaLineaInput } from "@/lib/sales/engine";
import { ErrorDominio } from "@/lib/sales/errores";
import { respuestaError } from "@/lib/sales/http";

export const dynamic = "force-dynamic";

/** POST /api/v1/pedidos/[id]/lineas — agrega una linea (producto + modificadores). */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = (await request.json().catch(() => null)) as NuevaLineaInput | null;
    if (!body || typeof body.productoId !== "string" || typeof body.cantidad !== "number") {
      throw new ErrorDominio(
        "cuerpo_invalido",
        "Se requiere productoId (string) y cantidad (number)",
        422
      );
    }
    const pedido = agregarLinea(params.id, body);
    return Response.json({ pedido }, { status: 201 });
  } catch (e) {
    return respuestaError(e);
  }
}
