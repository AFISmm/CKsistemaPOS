import { Controller, Get, Query } from "@nestjs/common";
import { RequierePermiso } from "../seguridad/permisos.decorator";
import { PERMISOS } from "../seguridad/permisos";
import { ReportesService } from "./reportes.service";
import { ReporteDiaQueryDto } from "./dto/reportes.dto";

/**
 * GET /api/v1/reportes/dia — HU-REP-01 (F2-T3). Ownership literal de
 * arquitectura.md §6.2 (listado bajo "Ventas (backend-ventas-pos)"), pero
 * implementado en un ReportesModule dedicado (no en VentasModule) porque el
 * volumen de logica de agregacion/bucketing lo justifica — ver decision
 * documentada en store-server/README.md.
 */
@Controller("api/v1/reportes")
export class ReportesController {
  constructor(private readonly reportes: ReportesService) {}

  @Get("dia")
  @RequierePermiso(PERMISOS.REPORTE_VER)
  reporteDia(@Query() query: ReporteDiaQueryDto) {
    return this.reportes.reporteDia({
      ubicacionId: query.ubicacionId,
      fecha: query.fecha,
      hasta: query.hasta,
      ordenarMixPor: query.ordenarMixPor,
    });
  }
}
