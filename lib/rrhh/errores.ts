/**
 * Errores de dominio de RRHH/personal — DUENO: rrhh-personal-pos.
 *
 * Mismo patron que lib/sales/errores.ts (backend-ventas-pos): envelope
 * uniforme {codigo, mensaje} + status HTTP, para que los route handlers de
 * app/api/v1/empleados/** y app/api/v1/asistencia/** lo traduzcan directo.
 */

export class ErrorRrhh extends Error {
  codigo: string;
  status: number;

  constructor(codigo: string, mensaje: string, status: number = 400) {
    super(mensaje);
    this.name = "ErrorRrhh";
    this.codigo = codigo;
    this.status = status;
  }
}
