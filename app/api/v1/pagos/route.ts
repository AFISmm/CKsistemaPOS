/**
 * POST /api/v1/pagos — DUENO: pagos-pos.
 *
 * Registra UN pago (parcial o total) contra un pedido. Soporta efectivo,
 * tarjeta (PSP mock), offline/store-and-forward y rechazo forzado (demo).
 * Para pago mixto (split tender) el cliente/frontend llama este endpoint
 * varias veces con montos parciales hasta que `saldoPendiente` sea 0.
 *
 * Body esperado:
 * {
 *   "pedidoId": string,
 *   "metodo": "efectivo" | "tarjeta",
 *   "monto": number,          // centavos, SIN propina
 *   "propina"?: number,       // centavos, default 0
 *   "montoRecibido"?: number, // requerido si metodo = "efectivo"
 *   "offline"?: boolean,      // solo tarjeta: simula terminal sin conectividad
 *   "forzarRechazo"?: boolean,// solo tarjeta: simula rechazo del banco/PSP
 *   "usuarioId"?: string
 * }
 *
 * MOCKS DE DEMO: el PSP y la apertura de cajon son simulaciones en memoria
 * (ver lib/payments/psp.ts y lib/payments/pagos.ts). Este handler NO calcula
 * totales/saldo: eso lo hace backend-ventas-pos (lib/sales/engine.ts).
 */

import { ErrorPago, procesarPago } from "@/lib/payments/pagos";
import type { EntradaPago } from "@/lib/payments/pagos";
import type { MetodoPago } from "@/lib/domain/types";

export const dynamic = "force-dynamic";

interface CuerpoPagoRequest {
  pedidoId?: unknown;
  metodo?: unknown;
  monto?: unknown;
  propina?: unknown;
  montoRecibido?: unknown;
  offline?: unknown;
  forzarRechazo?: unknown;
  usuarioId?: unknown;
}

function errorJson(codigo: string, mensaje: string, status: number) {
  return Response.json({ codigo, mensaje }, { status });
}

export async function POST(request: Request): Promise<Response> {
  let cuerpo: CuerpoPagoRequest;
  try {
    cuerpo = (await request.json()) as CuerpoPagoRequest;
  } catch {
    return errorJson("CUERPO_INVALIDO", "el body debe ser JSON valido", 400);
  }

  const { pedidoId, metodo, monto, propina, montoRecibido, offline, forzarRechazo, usuarioId } =
    cuerpo;

  if (typeof pedidoId !== "string" || pedidoId.length === 0) {
    return errorJson("PEDIDO_ID_REQUERIDO", "pedidoId es requerido", 422);
  }
  if (metodo !== "efectivo" && metodo !== "tarjeta") {
    return errorJson(
      "METODO_INVALIDO",
      'metodo debe ser "efectivo" o "tarjeta" (este endpoint no procesa "otro")',
      422
    );
  }
  if (typeof monto !== "number") {
    return errorJson("MONTO_REQUERIDO", "monto (centavos, entero) es requerido", 422);
  }

  const metodoPago = metodo as Extract<MetodoPago, "efectivo" | "tarjeta">;

  let entrada: EntradaPago;
  if (metodoPago === "efectivo") {
    if (typeof montoRecibido !== "number") {
      return errorJson(
        "MONTO_RECIBIDO_REQUERIDO",
        "montoRecibido (centavos, entero) es requerido para pagos en efectivo",
        422
      );
    }
    entrada = {
      metodo: "efectivo",
      monto,
      propina: typeof propina === "number" ? propina : undefined,
      montoRecibido,
      usuarioId: typeof usuarioId === "string" ? usuarioId : null,
    };
  } else {
    entrada = {
      metodo: "tarjeta",
      monto,
      propina: typeof propina === "number" ? propina : undefined,
      offline: typeof offline === "boolean" ? offline : undefined,
      forzarRechazo: typeof forzarRechazo === "boolean" ? forzarRechazo : undefined,
      usuarioId: typeof usuarioId === "string" ? usuarioId : null,
    };
  }

  try {
    const resultado = procesarPago(pedidoId, entrada);
    return Response.json(resultado, { status: 201 });
  } catch (err) {
    if (err instanceof ErrorPago) {
      return errorJson(err.codigo, err.message, err.status);
    }
    const mensaje = err instanceof Error ? err.message : "error desconocido";
    return errorJson("ERROR_INTERNO", mensaje, 500);
  }
}
