/**
 * Utilidad HTTP compartida por los route handlers de empleados/asistencia
 * (DUENO: rrhh-personal-pos). Traduce ErrorRrhh -> Response.json con envelope
 * {codigo, mensaje} y el status HTTP correspondiente; cualquier otro error se
 * trata como 500 "error_interno". Mismo patron que lib/sales/http.ts.
 *
 * AGREGADO (Fase B/seguridad, tokens de sesion firmados, revision 2026-07-22):
 * tambien traduce `ErrorAuth` (lanzado por `requerirSesionValida`/
 * `asegurarUsuarioCoincide` de lib/auth/sesionToken.ts cuando un route
 * handler de este dominio exige sesion valida) a su status real (401/403) en
 * vez de caer al 500 generico.
 */

import { ErrorAuth } from "../auth/errores";
import { ErrorRrhh } from "./errores";

export function respuestaErrorRrhh(e: unknown): Response {
  if (e instanceof ErrorRrhh || e instanceof ErrorAuth) {
    return Response.json({ codigo: e.codigo, mensaje: e.message }, { status: e.status });
  }
  const mensaje = e instanceof Error ? e.message : "Error interno desconocido";
  return Response.json({ codigo: "error_interno", mensaje }, { status: 500 });
}
