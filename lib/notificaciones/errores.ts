/**
 * Errores del modulo de notificaciones del shell — DUENO: shell de UI (etapa 1).
 * Mismo patron que lib/rrhh/errores.ts / lib/auth/errores.ts.
 */

export class ErrorNotificaciones extends Error {
  codigo: string;
  status: number;

  constructor(codigo: string, mensaje: string, status: number = 400) {
    super(mensaje);
    this.name = "ErrorNotificaciones";
    this.codigo = codigo;
    this.status = status;
  }
}
