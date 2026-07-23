import { ErrorPropinas } from "./errores";

/** Traduce ErrorPropinas -> Response.json (mismo patron que lib/nomina/http.ts). */
export function respuestaErrorPropinas(e: unknown): Response {
  if (e instanceof ErrorPropinas) {
    return Response.json({ codigo: e.codigo, mensaje: e.message }, { status: e.status });
  }
  const mensaje = e instanceof Error ? e.message : "Error interno desconocido";
  return Response.json({ codigo: "error_interno", mensaje }, { status: 500 });
}
