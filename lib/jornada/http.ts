/**
 * Utilidad HTTP compartida por los route handlers de app/api/v1/jornada/**
 * (DUENO: rrhh-personal-pos, etapa 2). Traduce ErrorJornada -> Response.json
 * con envelope {codigo, mensaje} y el status HTTP correspondiente; cualquier
 * otro error se trata como 500 "error_interno". Mismo patron que
 * lib/rrhh/http.ts.
 */

import { ErrorJornada } from "./errores";

export function respuestaErrorJornada(e: unknown): Response {
  if (e instanceof ErrorJornada) {
    return Response.json({ codigo: e.codigo, mensaje: e.message }, { status: e.status });
  }
  const mensaje = e instanceof Error ? e.message : "Error interno desconocido";
  return Response.json({ codigo: "error_interno", mensaje }, { status: 500 });
}
