/**
 * Utilidad HTTP compartida por los route handlers de pedidos/turnos
 * (DUENO: backend-ventas-pos). Traduce ErrorDominio -> Response.json con
 * envelope {codigo, mensaje} y el status HTTP correspondiente; cualquier
 * otro error se trata como 500 "error_interno".
 *
 * AGREGADO (Fase B/seguridad, tokens de sesion firmados, revision 2026-07-22):
 * tambien traduce `ErrorAuth` (lanzado por `requerirSesionValida`/
 * `asegurarUsuarioCoincide` de lib/auth/sesionToken.ts cuando un route
 * handler de este dominio exige sesion valida) a su status real (401/403) en
 * vez de caer al 500 generico — mismo patron cross-cutting que ya usaba
 * lib/auth/http.ts para `ErrorRrhh`.
 */

import { ErrorAuth } from "../auth/errores";
import { ErrorDominio } from "./errores";

export function respuestaError(e: unknown): Response {
  if (e instanceof ErrorDominio || e instanceof ErrorAuth) {
    return Response.json({ codigo: e.codigo, mensaje: e.message }, { status: e.status });
  }
  const mensaje = e instanceof Error ? e.message : "Error interno desconocido";
  return Response.json({ codigo: "error_interno", mensaje }, { status: 500 });
}
