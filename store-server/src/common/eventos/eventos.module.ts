import { Global, Module } from "@nestjs/common";
import { EventosGateway } from "./eventos.gateway";
import { EventosService } from "./eventos.service";

/**
 * Global: cualquier modulo (Ventas, Inventario, Pagos, Seguridad) inyecta
 * EventosService para emitir eventos sin reimportar el modulo.
 */
@Global()
@Module({
  providers: [EventosGateway, EventosService],
  exports: [EventosService, EventosGateway],
})
export class EventosModule {}
