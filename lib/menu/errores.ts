/**
 * Errores de dominio de Menu/Catalogo — DUENO: menu-inventario-pos.
 *
 * Mismo patron que lib/rrhh/errores.ts (rrhh-personal-pos) y lib/sales/errores.ts
 * (backend-ventas-pos): envelope uniforme {codigo, mensaje} + status HTTP, para
 * que los route handlers de app/api/v1/productos/** lo traduzcan directo.
 */

export class ErrorMenu extends Error {
  codigo: string;
  status: number;

  constructor(codigo: string, mensaje: string, status: number = 400) {
    super(mensaje);
    this.name = "ErrorMenu";
    this.codigo = codigo;
    this.status = status;
  }
}
