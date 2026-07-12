/**
 * Errores de la sesion DEMO por PIN — DUENO: shell de UI (etapa 1).
 *
 * Mismo patron que lib/rrhh/errores.ts / lib/sales/errores.ts: envelope
 * uniforme {codigo, mensaje} + status HTTP, para que los route handlers de
 * app/api/v1/auth/** lo traduzcan directo a Response.json.
 */

export class ErrorAuth extends Error {
  codigo: string;
  status: number;

  constructor(codigo: string, mensaje: string, status: number = 400) {
    super(mensaje);
    this.name = "ErrorAuth";
    this.codigo = codigo;
    this.status = status;
  }
}
