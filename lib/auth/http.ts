/**
 * Utilidad HTTP compartida por los route handlers de app/api/v1/auth/**.
 * Traduce ErrorAuth -> Response.json {codigo, mensaje} + status HTTP;
 * cualquier otro error se trata como 500 "error_interno". Mismo patron que
 * lib/rrhh/http.ts.
 *
 * lib/auth/registro.ts (auto-registro desde /login) llama internamente a
 * `crearEmpleado` de lib/rrhh/empleados.ts, que en casos extremos podria
 * lanzar ErrorRrhh (no ErrorAuth); se traduce aqui tambien para no degradar
 * ese caso a un 500 generico.
 */

import { ErrorAuth } from "./errores";
import { ErrorRrhh } from "../rrhh/errores";

export function respuestaErrorAuth(e: unknown): Response {
  if (e instanceof ErrorAuth || e instanceof ErrorRrhh) {
    return Response.json({ codigo: e.codigo, mensaje: e.message }, { status: e.status });
  }
  const mensaje = e instanceof Error ? e.message : "Error interno desconocido";
  return Response.json({ codigo: "error_interno", mensaje }, { status: 500 });
}
