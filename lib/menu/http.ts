/**
 * Utilidad HTTP compartida por los route handlers de menu/catalogo (DUENO:
 * menu-inventario-pos). Traduce ErrorMenu -> Response.json con envelope
 * {codigo, mensaje} y el status HTTP correspondiente; cualquier otro error se
 * trata como 500 "error_interno". Mismo patron que lib/rrhh/http.ts.
 */

import { ErrorMenu } from "./errores";

export function respuestaErrorMenu(e: unknown): Response {
  if (e instanceof ErrorMenu) {
    return Response.json({ codigo: e.codigo, mensaje: e.message }, { status: e.status });
  }
  const mensaje = e instanceof Error ? e.message : "Error interno desconocido";
  return Response.json({ codigo: "error_interno", mensaje }, { status: 500 });
}
