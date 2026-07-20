import { Body, Controller, Get, Headers, HttpCode, Param, Patch, Post, Query } from "@nestjs/common";
import type { EstadoPedido } from "@prisma/client";
import { RequierePermiso } from "../seguridad/permisos.decorator";
import { PERMISOS } from "../seguridad/permisos";
import { VentasService } from "./ventas.service";
import {
  ActualizarLineaDto,
  AgregarLineaDto,
  AplicarDescuentoDto,
  CrearPedidoDto,
  ReembolsoPedidoDto,
} from "./dto/ventas.dto";

const UBICACION_PILOTO_ID = process.env.UBICACION_PILOTO_ID ?? "ubic-miami-fl";

@Controller("api/v1/pedidos")
export class PedidosController {
  constructor(private readonly ventas: VentasService) {}

  @Post()
  @HttpCode(201)
  crear(@Body() dto: CrearPedidoDto) {
    return this.ventas.crearPedido(dto, UBICACION_PILOTO_ID);
  }

  @Get()
  listar(@Query("turnoId") turnoId?: string, @Query("estado") estado?: EstadoPedido) {
    return this.ventas.listarPedidos({ turnoId, estado });
  }

  @Get(":id")
  obtener(@Param("id") id: string) {
    return this.ventas.obtenerPedidoOrThrow(id);
  }

  @Post(":id/lineas")
  agregarLinea(@Param("id") id: string, @Body() dto: AgregarLineaDto) {
    return this.ventas.agregarLinea(id, dto);
  }

  @Patch(":id/lineas/:lineaId")
  actualizarLinea(
    @Param("id") id: string,
    @Param("lineaId") lineaId: string,
    @Body() dto: ActualizarLineaDto,
  ) {
    return this.ventas.actualizarLinea(id, lineaId, dto);
  }

  @Post(":id/enviar-cocina")
  enviarACocina(@Param("id") id: string) {
    return this.ventas.enviarACocina(id);
  }

  /**
   * F2-T2 (Hold & fire). Sin @RequierePermiso: retener/liberar una linea es
   * una accion de toma de pedido igual de rutinaria que agregar/editar una
   * linea (no esta en la lista de acciones sensibles RNF-07 de
   * arquitectura.md §7.5 — descuento/reembolso/86/cierreZ/ajusteInventario),
   * por eso es cajero-default. Ver README.md para el detalle de esta decision.
   */
  @Patch(":id/lineas/:lineaId/retener")
  retenerLinea(@Param("id") id: string, @Param("lineaId") lineaId: string) {
    return this.ventas.retenerLinea(id, lineaId);
  }

  @Post(":id/lineas/:lineaId/liberar")
  liberarLinea(@Param("id") id: string, @Param("lineaId") lineaId: string) {
    return this.ventas.liberarLinea(id, lineaId);
  }

  @Post(":id/liberar-retenidas")
  liberarLineasRetenidas(@Param("id") id: string) {
    return this.ventas.liberarLineasRetenidas(id);
  }

  @Post(":id/descuento")
  @RequierePermiso(PERMISOS.PEDIDO_DESCUENTO_AUTORIZAR)
  aplicarDescuento(
    @Param("id") id: string,
    @Body() dto: AplicarDescuentoDto,
    @Headers("x-usuario-id") usuarioId?: string,
  ) {
    return this.ventas.aplicarDescuento(id, dto, usuarioId ?? null);
  }

  @Post(":id/reembolso")
  @RequierePermiso(PERMISOS.PAGO_REEMBOLSO)
  reembolsar(
    @Param("id") id: string,
    @Body() dto: ReembolsoPedidoDto,
    @Headers("x-usuario-id") usuarioId?: string,
  ) {
    return this.ventas.reembolsarPedido(id, usuarioId ?? null, dto.motivo);
  }
}
