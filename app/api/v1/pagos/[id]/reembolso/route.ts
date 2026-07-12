/**
 * POST /api/v1/pagos/[id]/reembolso — DUENO: pagos-pos.
 *
 * Reembolsa un pago con tarjeta previamente aprobado, via el PSP (mock, ver
 * lib/payments/psp.ts). Los pagos en efectivo NO se reembolsan por este
 * endpoint (el reembolso en efectivo se hace en caja/cajon, fuera de alcance
 * de PSP).
 *
 * Body opcional:
 * {
 *   "monto"?: number,     // centavos; default = monto+propina del pago completo
 *   "motivo"?: string,
 *   "usuarioId"?: string
 * }
 */

import { ErrorPago, obtenerPago, reembolsarPago } from "@/lib/payments/pagos";
import { obtenerPedido, saldoPendiente } from "@/lib/sales/engine";

export const dynamic = "force-dynamic";

interface CuerpoReembolsoRequest {
  monto?: unknown;
  motivo?: unknown;
  usuarioId?: unknown;
}

function errorJson(codigo: string, mensaje: string, status: number) {
  return Response.json({ codigo, mensaje }, { status });
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
): Promise<Response> {
  const pagoId = params.id;

  let cuerpo: CuerpoReembolsoRequest = {};
  try {
    const texto = await request.text();
    cuerpo = texto ? (JSON.parse(texto) as CuerpoReembolsoRequest) : {};
  } catch {
    return errorJson("CUERPO_INVALIDO", "el body debe ser JSON valido", 400);
  }

  const pago = obtenerPago(pagoId);
  if (!pago) {
    return errorJson("PAGO_NO_ENCONTRADO", `pago ${pagoId} no existe`, 404);
  }

  const { monto, motivo, usuarioId } = cuerpo;

  try {
    const { pago: pagoReembolsado } = reembolsarPago(pago, {
      monto: typeof monto === "number" ? monto : undefined,
      motivo: typeof motivo === "string" ? motivo : undefined,
      usuarioId: typeof usuarioId === "string" ? usuarioId : null,
    });

    // Best-effort: informamos saldo/pedido actual (no recalculado por este
    // reembolso; ese recalculo es responsabilidad de backend-ventas-pos si
    // decide reflejarlo en el Pedido, ver nota en lib/payments/pagos.ts).
    let saldo: number | null = null;
    let pedido = null;
    try {
      pedido = obtenerPedido(pagoReembolsado.pedidoId) ?? null;
      saldo = saldoPendiente(pagoReembolsado.pedidoId);
    } catch {
      // backend-ventas-pos aun no implementado; no bloquea el reembolso.
    }

    return Response.json({ pago: pagoReembolsado, saldoPendiente: saldo, pedido });
  } catch (err) {
    if (err instanceof ErrorPago) {
      return errorJson(err.codigo, err.message, err.status);
    }
    const mensaje = err instanceof Error ? err.message : "error desconocido";
    return errorJson("ERROR_INTERNO", mensaje, 500);
  }
}
