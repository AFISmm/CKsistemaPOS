/**
 * Errores de dominio de reparto de propinas — DUENO: nomina-pos (Fase B,
 * revision 2026-07-22 seccion "reparto de propinas por rol/puntos").
 *
 * Mismo patron que lib/nomina/errores.ts / lib/sales/errores.ts / lib/rrhh/errores.ts:
 * envelope uniforme {codigo, mensaje} + status HTTP para app/api/v1/propinas/**
 * y app/api/v1/roles (PATCH de porcentaje).
 */

export class ErrorPropinas extends Error {
  codigo: string;
  status: number;

  constructor(codigo: string, mensaje: string, status: number = 400) {
    super(mensaje);
    this.name = "ErrorPropinas";
    this.codigo = codigo;
    this.status = status;
  }
}
