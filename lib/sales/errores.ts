/**
 * Errores de dominio del motor de ventas — DUENO: backend-ventas-pos.
 *
 * Envelope uniforme {codigo, mensaje} + status HTTP coherente (404/409/422/403)
 * para que los route handlers de app/api/v1/pedidos/** y app/api/v1/turnos/**
 * lo traduzcan directamente a Response.json.
 */

export class ErrorDominio extends Error {
  codigo: string;
  status: number;

  constructor(codigo: string, mensaje: string, status: number = 400) {
    super(mensaje);
    this.name = "ErrorDominio";
    this.codigo = codigo;
    this.status = status;
  }
}
