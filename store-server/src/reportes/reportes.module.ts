import { Module } from "@nestjs/common";
import { VentasModule } from "../ventas/ventas.module";
import { CosteoModule } from "../costeo/costeo.module";
import { ReportesController } from "./reportes.controller";
import { ReportesService } from "./reportes.service";

/**
 * ReportesModule (F2-T3, `reportes-analitica-pos`) — reemplaza el
 * `ReportesController`/`VentasService.reporteDia` basico de Fase 1 (ver
 * store-server/README.md, decision documentada). Importa `VentasModule`
 * solo para reusar `VentasService.calcularArqueo` (unica fuente del calculo
 * de arqueo; `PrismaService`/`SeguridadService` son globales) y
 * `CosteoModule` (F2-T1) para el margen OPCIONAL del mix de productos
 * (best-effort, ver ReportesService — el reporte nucleo nunca depende de
 * que el costeo tenga exito).
 */
@Module({
  imports: [VentasModule, CosteoModule],
  controllers: [ReportesController],
  providers: [ReportesService],
})
export class ReportesModule {}
