import { conPersistencia, getDb } from "@/lib/db/store";
import type { EstadoPedido, Pedido } from "@/lib/domain/types";
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

/**
 * Fase A (revision 2026-07-22 seccion 2.1, flujo mostrador pay-first): en
 * ubicaciones "mostrador" un pedido puede llegar a estado "cobrado" ANTES de
 * terminar su paso por cocina (ver lib/sales/engine.ts `enviarACocina` /
 * `avanzarEstadoCocina`, que a proposito NO reescriben `Pedido.estado` una vez
 * que ya es "cobrado"). Ese pedido sigue "en cocina" mientras
 * `enviadoACocinaEn` este fijado y `entregadoEn` siga `null`; una vez
 * `entregadoEn` se fija (todas las lineas "listo" + `enviarACaja`), ya
 * terminado su paso por cocina y corresponde a Historial, no a la cola de
 * cocina.
 */
function siguePendienteDeCocinaPagado(p: Pedido): boolean {
  return p.estado === "cobrado" && p.enviadoACocinaEn !== null && p.entregadoEn === null;
}

/** GET /api/v1/pedidos?estado=<estado|cocina|historial>&turnoId=<id> */
export async function GET(request: Request) {
  return conPersistencia(async () => {
    try {
      const { searchParams } = new URL(request.url);
      const estado = searchParams.get("estado");
      const turnoId = searchParams.get("turnoId");

      let pedidos = getDb().pedidos;

      if (estado === "cocina") {
        pedidos = pedidos.filter(
          (p) => ESTADOS_COCINA.includes(p.estado) || siguePendienteDeCocinaPagado(p)
        );
      } else if (estado === "historial") {
        pedidos = pedidos.filter(
          (p) => ESTADOS_HISTORIAL.includes(p.estado) && !siguePendienteDeCocinaPagado(p)
        );
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

/**
 * Body de POST /api/v1/pedidos: `NuevoPedidoInput` (contrato de
 * lib/sales/engine.ts, sin cambios) mas un `usuarioId` opcional, NUEVO en esta
 * ruta, para trazabilidad de "quien tomo el pedido" (ver
 * `Pedido.creadoPorUsuarioId` en lib/domain/types.ts para la decision de
 * diseno completa: por que se estampa aqui y no dentro de `crearPedido`).
 */
interface NuevoPedidoInputConCreador extends NuevoPedidoInput {
  usuarioId?: string;
}

/** POST /api/v1/pedidos — crea un pedido en el turno abierto de la ubicacion. */
export async function POST(request: Request) {
  return conPersistencia(async () => {
    try {
      const body = (await request.json().catch(() => ({}))) as NuevoPedidoInputConCreador;
      const pedido = crearPedido(body);
      // Estampa el creador DESPUES de crearPedido, mutando la misma referencia
      // en memoria que esa funcion ya empujo a getDb().pedidos (no duplica el
      // pedido ni requiere tocar lib/sales/engine.ts). `usuarioId` es opcional
      // porque el cliente actual de POS (components/pos/api.ts) todavia no lo
      // envia (fuera del alcance editable de esta tarea) — `null` documenta
      // ese gap explicitamente en vez de dejar el campo `undefined`.
      pedido.creadoPorUsuarioId = body.usuarioId ?? null;
      return Response.json({ pedido }, { status: 201 });
    } catch (e) {
      return respuestaError(e);
    }
  });
}
