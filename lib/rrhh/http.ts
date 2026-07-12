/**
 * Utilidad HTTP compartida por los route handlers de empleados/asistencia
 * (DUENO: rrhh-personal-pos). Traduce ErrorRrhh -> Response.json con envelope
 * {codigo, mensaje} y el status HTTP correspondiente; cualquier otro error se
 * trata como 500 "error_interno". Mismo patron que lib/sales/http.ts.
 */

import { ErrorRrhh } from "./errores";

export function respuestaErrorRrhh(e: unknown): Response {
  if (e instanceof ErrorRrhh) {
    return Response.json({ codigo: e.codigo, mensaje: e.message }, { status: e.status });
  }
  const mensaje = e instanceof Error ? e.message : "Error interno desconocido";
  return Response.json({ codigo: "error_interno", mensaje }, { status: 500 });
}
