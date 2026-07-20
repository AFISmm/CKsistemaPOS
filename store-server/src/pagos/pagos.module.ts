import { Module } from "@nestjs/common";
import { VentasModule } from "../ventas/ventas.module";
import { PspModule } from "./psp/psp.module";
import { HardwareModule } from "../hardware/hardware.module";
import { PagosController } from "./pagos.controller";
import { ArqueoController } from "./arqueo.controller";
import { PagosService } from "./pagos.service";

@Module({
  imports: [VentasModule, PspModule, HardwareModule],
  controllers: [PagosController, ArqueoController],
  providers: [PagosService],
  exports: [PagosService],
})
export class PagosModule {}
