import { Body, Controller, Headers, HttpCode, Param, Post, Res } from "@nestjs/common";
import type { Response } from "express";
import { RequierePermiso } from "../seguridad/permisos.decorator";
import { PERMISOS } from "../seguridad/permisos";
import { PagosService } from "./pagos.service";
import { RegistrarPagoDto, ReembolsoPagoDto } from "./dto/pagos.dto";

/**
 * PagosController — DUENO: pagos-pos.
 *
 * FIX de deuda tecnica (PLAN_DE_PRODUCCION.md §6): la demo devolvia 201 para
 * CUALQUIER resultado, incluyendo rechazado/encolado. Aqui el status HTTP
 * refleja el resultado real del cobro:
 *  - aprobado -> 201 Created (el Pago quedo registrado y, si salda el pedido,
 *    la venta se confirma).
 *  - encolado -> 202 Accepted (store-and-forward offline, S-05: se acepto la
 *    solicitud pero el resultado final esta pendiente).
 *  - rechazado -> 200 OK con el Pago en el cuerpo (la operacion HTTP se
 *    completo correctamente; el rechazo es un dato de negocio, no un error
 *    de la API — evita que un cliente confunda "rechazo de banco" con
 *    "solicitud invalida").
 */
@Controller("api/v1/pagos")
export class PagosController {
  constructor(private readonly pagos: PagosService) {}

  @Post()
  async registrar(
    @Body() dto: RegistrarPagoDto,
    @Res({ passthrough: true }) res: Response,
    @Headers("x-usuario-id") usuarioId?: string,
  ) {
    const { pago, resultado, saldoPendiente } = await this.pagos.procesarPago(dto, usuarioId ?? null);

    const status = resultado === "aprobado" ? 201 : resultado === "encolado" ? 202 : 200;
    res.status(status);

    return { pago, resultado, saldoPendiente };
  }

  @Post(":id/reembolso")
  @HttpCode(200)
  @RequierePermiso(PERMISOS.PAGO_REEMBOLSO)
  reembolsar(
    @Param("id") id: string,
    @Body() dto: ReembolsoPagoDto,
    @Headers("x-usuario-id") usuarioId?: string,
  ) {
    return this.pagos.reembolsarPago(id, dto, usuarioId ?? null);
  }
}
