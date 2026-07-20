import { Controller, Get, Param } from "@nestjs/common";
import { RequierePermiso } from "../seguridad/permisos.decorator";
import { PERMISOS } from "../seguridad/permisos";
import { CosteoService } from "./costeo.service";

/**
 * Vive bajo el mismo prefijo `api/v1/pedidos` que PedidosController
 * (VentasModule), pero en su PROPIO modulo/controller: CosteoModule solo LEE
 * Pedido/LineaDePedido via Prisma (no importa VentasService), manteniendo el
 * costeo desacoplado del calculo de precio/impuesto (que sigue siendo 100%
 * responsabilidad de VentasModule, arquitectura.md §9.2). Ver README.md
 * seccion de costeo para la justificacion de esta decision de diseno.
 */
@Controller("api/v1/pedidos")
export class CosteoController {
  constructor(private readonly costeo: CosteoService) {}

  @Get(":id/costeo")
  @RequierePermiso(PERMISOS.COSTEO_VER)
  obtenerCosteo(@Param("id") id: string) {
    return this.costeo.calcularCostoPedido(id);
  }
}
