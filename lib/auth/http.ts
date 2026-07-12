/**
 * Utilidad HTTP compartida por los route handlers de app/api/v1/auth/**.
 * Traduce ErrorAuth -> Response.json {codigo, mensaje} + status HTTP;
 * cualquier otro error se trata como 500 "error_interno". Mismo patron que
 * lib/rrhh/http.ts.
 */

import { ErrorAuth } from "./errores";

export function respuestaErrorAuth(e: unknown): Response {
  if (e instanceof ErrorAuth) {
    return Response.json({ codigo: e.codigo, mensaje: e.message }, { status: e.status });
  }
  const mensaje = e instanceof Error ? e.message : "Error interno desconocido";
  return Response.json({ codigo: "error_interno", mensaje }, { status: 500 });
}
