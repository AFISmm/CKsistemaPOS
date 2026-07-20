import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { RequierePermiso } from "../seguridad/permisos.decorator";
import { PERMISOS } from "../seguridad/permisos";
import { InventarioService } from "./inventario.service";
import { AjustarStockDto, ProducirInsumoElaboradoDto } from "./dto/inventario.dto";

@Controller("api/v1/stock")
export class InventarioController {
  constructor(private readonly inventario: InventarioService) {}

  @Get()
  listar(@Query("ubicacionId") ubicacionId?: string) {
    return this.inventario.listarStock(ubicacionId);
  }

  @Get("bajo-umbral")
  bajoUmbral(@Query("ubicacionId") ubicacionId?: string) {
    return this.inventario.insumosBajoUmbral(ubicacionId);
  }

  @Post("ajuste")
  @RequierePermiso(PERMISOS.INVENTARIO_AJUSTAR)
  ajustar(@Body() dto: AjustarStockDto) {
    return this.inventario.ajustarManual(dto);
  }

  /**
   * S-14 (BOM multinivel — productos elaborados/intermedios). Reusa
   * `inventario.ajustar` (no se agrega un permiso nuevo): producir un insumo
   * elaborado es, igual que un ajuste manual de stock, una operacion
   * gerencial de mover inventario (ver README S-14 para el detalle de por
   * que no ameritaba un permiso granular propio).
   */
  @Post("produccion")
  @RequierePermiso(PERMISOS.INVENTARIO_AJUSTAR)
  producir(@Body() dto: ProducirInsumoElaboradoDto) {
    return this.inventario.producirInsumoElaborado(dto);
  }
}
