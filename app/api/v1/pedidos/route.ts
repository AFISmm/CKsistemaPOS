import { getDb } from "@/lib/db/store";
import type { EstadoPedido } from "@/lib/domain/types";
import { crearPedido, type NuevoPedidoInput } from "@/lib/sales/engine";
import { respuestaError } from "@/lib/sales/http";

export const dynamic = "force-dynamic";

/** Estados agrupados que el KDS consulta con ?estado=cocina. */
const ESTADOS_COCINA: EstadoPedido[] = ["enviadoCocina", "enPreparacion"];

/** GET /api/v1/pedidos?estado=<estado|cocina>&turnoId=<id> */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const estado = searchParams.get("estado");
    const turnoId = searchParams.get("turnoId");

    let pedidos = getDb().pedidos;

    if (estado === "cocina") {
      pedidos = pedidos.filter((p) => ESTADOS_COCINA.includes(p.estado));
    } else if (estado) {
      pedidos = pedidos.filter((p) => p.estado === estado);
    }

    if (turnoId) {
      pedidos = pedidos.filter((p) => p.turnoId === turnoId);
    }

    return Response.json({ pedidos });
  } catch (e) {
    return respuestaError(e);
  }
}

/** POST /api/v1/pedidos — crea un pedido en el turno abierto de la ubicacion. */
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as NuevoPedidoInput;
    const pedido = crearPedido(body);
    return Response.json({ pedido }, { status: 201 });
  } catch (e) {
    return respuestaError(e);
  }
}
