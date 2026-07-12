/**
 * Errores de dominio de nomina — DUENO: nomina-pos.
 *
 * Mismo patron que lib/sales/errores.ts y lib/rrhh/errores.ts: envelope
 * uniforme {codigo, mensaje} + status HTTP para app/api/v1/nomina/**.
 */

export class ErrorNomina extends Error {
  codigo: string;
  status: number;

  constructor(codigo: string, mensaje: string, status: number = 400) {
    super(mensaje);
    this.name = "ErrorNomina";
    this.codigo = codigo;
    this.status = status;
  }
}
