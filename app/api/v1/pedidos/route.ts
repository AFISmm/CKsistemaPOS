import { conPersistencia, getDb } from "@/lib/db/store";
import type { EstadoPedido } from "@/lib/domain/types";
import { crearPedido, type NuevoPedidoInput } from "@/lib/sales/engine";
import { respuestaError } from "@/lib/sales/http";

export const dynamic = "force-dynamic";

/**
 * Estados agrupados que el KDS consulta con ?estado=cocina. Incluye "listo"
 * a proposito (ciclo de vida extendido del pedido, Feature 3): antes, en
 * cuanto un pedido llegaba a "listo" el backend dejaba de devolverlo aqui y
 * el cliente lo desvanecia solo tras GRACIA_LISTO_MS; ahora un pedido "listo"
 * DEBE seguir visible en el KDS (con el boton "Enviar a caja") hasta que el
 * cajero/gerente lo confirme explicitamente — recien ahi pasa a "entregado"
 * (ver lib/sales/engine.ts, enviarACaja) y sale de este filtro.
 */
const ESTADOS_COCINA: EstadoPedido[] = ["enviadoCocina", "enPreparacion", "listo"];

/**
 * Estados que conforman el "Historial de pedidos" del submodulo de Terminal
 * de Cajero (app/pos/historial): pedidos que ya completaron su paso por
 * cocina ("entregado") y/o ya fueron cobrados ("cobrado"). Se agrega este
 * filtro especial `?estado=historial` (mismo patron que `?estado=cocina`)
 * para poder traer AMBOS estados en una sola llamada, en vez de que el
 * cliente tenga que hacer dos fetch y combinarlos.
 */
const ESTADOS_HISTORIAL: EstadoPedido[] = ["entregado", "cobrado"];

/** GET /api/v1/pedidos?estado=<estado|cocina|historial>&turnoId=<id> */
export async function GET(request: Request) {
  return conPersistencia(async () => {
    try {
      const { searchParams } = new URL(request.url);
      const estado = searchParams.get("estado");
      const turnoId = searchParams.get("turnoId");

      let pedidos = getDb().pedidos;

      if (estado === "cocina") {
        pedidos = pedidos.filter((p) => ESTADOS_COCINA.includes(p.estado));
      } else if (estado === "historial") {
        pedidos = pedidos.filter((p) => ESTADOS_HISTORIAL.includes(p.estado));
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
  });
}

/** POST /api/v1/pedidos — crea un pedido en el turno abierto de la ubicacion. */
export async function POST(request: Request) {
  return conPersistencia(async () => {
    try {
      const body = (await request.json().catch(() => ({}))) as NuevoPedidoInput;
      const pedido = crearPedido(body);
      return Response.json({ pedido }, { status: 201 });
    } catch (e) {
      return respuestaError(e);
    }
  });
}
