import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import type { Response } from "express";
import { ErrorDominio } from "./error-dominio";

/**
 * Filtro global de excepciones — traduce CUALQUIER error lanzado (ErrorDominio,
 * HttpException de Nest, class-validator BadRequestException, o error
 * inesperado) al envelope estandar {codigo, mensaje, detalles} con el status
 * HTTP correcto (C-API/C-ERRORES). Cubre explicitamente la deuda tecnica de
 * la demo: "el handler de pagos captura ErrorPago pero no ErrorDominio -> un
 * error de dominio caeria a 500" (PLAN_DE_PRODUCCION.md §6) — aqui NINGUN
 * error de dominio cae a 500 salvo que realmente sea inesperado.
 *
 * IMPORTANTE (C-PCI): nunca se incluyen datos de tarjeta en `detalles`; los
 * servicios de pagos ya se cuidan de no ponerlos en el mensaje/payload.
 */
@Catch()
export class DominioExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger("ExceptionFilter");

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();

    if (exception instanceof ErrorDominio) {
      res.status(exception.status).json({
        codigo: exception.codigo,
        mensaje: exception.message,
        detalles: exception.detalles ?? null,
      });
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      const mensaje =
        typeof body === "string"
          ? body
          : (body as { message?: string | string[] })?.message ?? exception.message;
      res.status(status).json({
        codigo: httpStatusACodigo(status),
        mensaje: Array.isArray(mensaje) ? mensaje.join("; ") : mensaje,
        detalles: typeof body === "object" ? body : null,
      });
      return;
    }

    // Error inesperado: no exponemos el stack ni detalles internos al cliente.
    this.logger.error(
      exception instanceof Error ? exception.stack ?? exception.message : String(exception),
    );
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      codigo: "error_interno",
      mensaje: "Error interno del servidor",
      detalles: null,
    });
  }
}

function httpStatusACodigo(status: number): string {
  switch (status) {
    case 400:
      return "solicitud_invalida";
    case 401:
      return "no_autenticado";
    case 403:
      return "permiso_insuficiente";
    case 404:
      return "no_encontrado";
    case 409:
      return "conflicto";
    case 422:
      return "regla_de_negocio";
    default:
      return "error";
  }
}
