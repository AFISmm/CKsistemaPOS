/**
 * Utilidad HTTP compartida por los route handlers de app/api/v1/notificaciones/**.
 * Traduce ErrorNotificaciones -> Response.json {codigo, mensaje} + status HTTP.
 */

import { ErrorNotificaciones } from "./errores";

export function respuestaErrorNotificaciones(e: unknown): Response {
  if (e instanceof ErrorNotificaciones) {
    return Response.json({ codigo: e.codigo, mensaje: e.message }, { status: e.status });
  }
  const mensaje = e instanceof Error ? e.message : "Error interno desconocido";
  return Response.json({ codigo: "error_interno", mensaje }, { status: 500 });
}
