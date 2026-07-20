import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { RequierePermiso } from "../seguridad/permisos.decorator";
import { PERMISOS } from "../seguridad/permisos";
import { InventarioService } from "./inventario.service";
import { AjustarStockDto } from "./dto/inventario.dto";

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
}
