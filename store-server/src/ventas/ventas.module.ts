import { Module } from "@nestjs/common";
import { PedidosController } from "./pedidos.controller";
import { TurnosController } from "./turnos.controller";
import { VentasService } from "./ventas.service";
import { HardwareModule } from "../hardware/hardware.module";

// NOTA (F2-T3): el `ReportesController` de Fase 1 (GET /api/v1/reportes/dia
// basico) se retiro de aqui y quedo reemplazado por `ReportesModule`
// (src/reportes/), que cubre HU-REP-01 completo (ventas+mix+arqueo+daypart).
// Se evita asi tener dos endpoints compitiendo por la misma ruta — ver
// store-server/README.md.

@Module({
  imports: [HardwareModule],
  controllers: [PedidosController, TurnosController],
  providers: [VentasService],
  exports: [VentasService],
})
export class VentasModule {}
