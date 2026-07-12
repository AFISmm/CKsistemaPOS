/**
 * Errores de dominio del chequeo de inicio de jornada — DUENO:
 * rrhh-personal-pos (etapa 2). Mismo patron que lib/rrhh/errores.ts: envelope
 * uniforme {codigo, mensaje} + status HTTP, para que app/api/v1/jornada/**
 * lo traduzca directo.
 */

export class ErrorJornada extends Error {
  codigo: string;
  status: number;

  constructor(codigo: string, mensaje: string, status: number = 400) {
    super(mensaje);
    this.name = "ErrorJornada";
    this.codigo = codigo;
    this.status = status;
  }
}
