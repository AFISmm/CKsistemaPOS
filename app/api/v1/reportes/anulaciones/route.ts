import { conPersistencia, getDb } from "@/lib/db/store";
import { respuestaError } from "@/lib/sales/http";
import {
  eventoEnRangoFecha,
  TIPOS_EVENTO_ANULACION,
  type EventoAnulacion,
  type ProductoAnulado,
} from "@/lib/reportes/anulaciones";

export const dynamic = "force-dynamic";

/** YYYY-MM-DD de hoy y de "hace N dias" (misma convencion que app/api/v1/reportes/tiempos/route.ts). */
function fechaISO(diasAtras: number): string {
  const d = new Date();
  d.setDate(d.getDate() - diasAtras);
  return d.toISOString().slice(0, 10);
}

/**
 * GET /api/v1/reportes/anulaciones?desde=YYYY-MM-DD&hasta=YYYY-MM-DD&ubicacionId=
 *
 * Reporte de fraude/abuso por empleado (Fase A, revision 2026-07-22): junta
 * `EventoDeAuditoria` de tipo "cancelacion"/"reembolso" (ya trazados por
 * `anularPedido`/`reembolsar`, ver lib/sales/engine.ts) con el `Usuario` que
 * los hizo (`evento.usuarioId`) y el `Pedido`/`LineaDePedido` involucrados
 * (`evento.agregadoId` cuando `agregadoTipo === "Pedido"`), para que
 * `lib/reportes/anulaciones.ts` los agrupe por empleado en el cliente.
 *
 * Por defecto ultimos 30 dias (mas amplio que el reporte de tiempos: los
 * patrones de fraude se detectan mejor con una ventana mas larga, no solo la
 * semana actual).
 */
export async function GET(request: Request) {
  return conPersistencia(async () => {
    try {
      const { searchParams } = new URL(request.url);
      const desde = searchParams.get("desde") || fechaISO(29);
      const hasta = searchParams.get("hasta") || fechaISO(0);
      const ubicacionId = searchParams.get("ubicacionId");

      const db = getDb();

      let eventos = db.eventos.filter(
        (e) =>
          TIPOS_EVENTO_ANULACION.includes(e.tipo) && eventoEnRangoFecha(e.ocurridoEn, desde, hasta)
      );
      if (ubicacionId) {
        eventos = eventos.filter((e) => e.ubicacionId === ubicacionId);
      }

      const filas: EventoAnulacion[] = eventos.map((evento) => {
        const usuario = evento.usuarioId
          ? db.usuarios.find((u) => u.id === evento.usuarioId)
          : undefined;

        // El pedido involucrado: `anularPedido`/`reembolsar` siempre auditan
        // con `agregadoTipo: "Pedido"` y `agregadoId: pedido.id` (ver
        // lib/sales/engine.ts). El pedido SIGUE existiendo en el store tras
        // anularse/reembolsarse (solo cambia su `estado`, nunca se borra), asi
        // que sus `lineas` originales siguen disponibles para saber que
        // PRODUCTOS se anularon/reembolsaron.
        const pedido =
          evento.agregadoTipo === "Pedido"
            ? db.pedidos.find((p) => p.id === evento.agregadoId)
            : undefined;

        const productos: ProductoAnulado[] = (pedido?.lineas ?? []).map((l) => ({
          descripcion: l.descripcion,
          cantidad: l.cantidad,
        }));

        return {
          id: evento.id,
          tipo: evento.tipo as EventoAnulacion["tipo"],
          usuarioId: evento.usuarioId,
          nombreUsuario: usuario?.nombre ?? "(usuario no registrado)",
          ocurridoEn: evento.ocurridoEn,
          motivo: evento.motivo,
          pedidoId: evento.agregadoId,
          numeroOrden: pedido?.numeroOrden ?? null,
          totalPedido: pedido?.total ?? null,
          productos,
        };
      });

      return Response.json({ eventos: filas, desde, hasta });
    } catch (e) {
      return respuestaError(e);
    }
  });
}
