/**
 * Utilidad HTTP compartida por los route handlers de pedidos/turnos
 * (DUENO: backend-ventas-pos). Traduce ErrorDominio -> Response.json con
 * envelope {codigo, mensaje} y el status HTTP correspondiente; cualquier
 * otro error se trata como 500 "error_interno".
 */

import { ErrorDominio } from "./errores";

export function respuestaError(e: unknown): Response {
  if (e instanceof ErrorDominio) {
    return Response.json({ codigo: e.codigo, mensaje: e.message }, { status: e.status });
  }
  const mensaje = e instanceof Error ? e.message : "Error interno desconocido";
  return Response.json({ codigo: "error_interno", mensaje }, { status: 500 });
}
