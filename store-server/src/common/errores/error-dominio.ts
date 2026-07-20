/**
 * Error de dominio transversal — envelope uniforme {codigo, mensaje, detalles}
 * (C-API/C-ERRORES). Todos los modulos (ventas, inventario, pagos, seguridad)
 * lanzan ErrorDominio con el status HTTP correcto; el
 * DominioExceptionFilter global lo traduce a la respuesta JSON.
 *
 * Status coherentes con el contrato:
 *  - 400 entrada malformada generica
 *  - 401 no autenticado
 *  - 403 permiso insuficiente (C-ERRORES)
 *  - 404 entidad no encontrada
 *  - 409 conflicto / reintento idempotente con payload distinto / estado invalido
 *  - 422 regla de negocio violada (ej. combo incompleto, 86, saldo excedido)
 *  - 500 error inesperado (no deberia lanzarse deliberadamente salvo bug)
 */
export class ErrorDominio extends Error {
  readonly codigo: string;
  readonly status: number;
  readonly detalles?: Record<string, unknown>;

  constructor(
    codigo: string,
    mensaje: string,
    status: number = 400,
    detalles?: Record<string, unknown>,
  ) {
    super(mensaje);
    this.name = "ErrorDominio";
    this.codigo = codigo;
    this.status = status;
    this.detalles = detalles;
  }
}
