/**
 * Utilidad HTTP compartida por los route handlers de nomina (DUENO: nomina-pos).
 * Traduce ErrorNomina -> Response.json con envelope {codigo, mensaje} y el
 * status HTTP correspondiente; cualquier otro error se trata como 500.
 */

import { ErrorNomina } from "./errores";

export function respuestaErrorNomina(e: unknown): Response {
  if (e instanceof ErrorNomina) {
    return Response.json({ codigo: e.codigo, mensaje: e.message }, { status: e.status });
  }
  const mensaje = e instanceof Error ? e.message : "Error interno desconocido";
  return Response.json({ codigo: "error_interno", mensaje }, { status: 500 });
}
