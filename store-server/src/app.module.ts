import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { PrismaModule } from "./common/prisma/prisma.module";
import { EventosModule } from "./common/eventos/eventos.module";
import { SeguridadModule } from "./seguridad/seguridad.module";
import { CatalogoModule } from "./catalogo/catalogo.module";
import { InventarioModule } from "./inventario/inventario.module";
import { VentasModule } from "./ventas/ventas.module";
import { PagosModule } from "./pagos/pagos.module";
import { CosteoModule } from "./costeo/costeo.module";
import { SyncModule } from "./sync/sync.module";
import { ReportesModule } from "./reportes/reportes.module";
import { BajasModule } from "./bajas/bajas.module";
import { ConectividadModule } from "./conectividad/conectividad.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Bus de eventos interno de proceso (VentaConfirmada/VentaRevertida ->
    // InventarioModule via @OnEvent). Complementa (no reemplaza) el bus WS
    // de EventosGateway: ambos se disparan desde la MISMA llamada a
    // EventosService.emitir() (ver common/eventos/eventos.service.ts).
    EventEmitterModule.forRoot(),
    PrismaModule,
    EventosModule,
    SeguridadModule,
    CatalogoModule,
    InventarioModule,
    VentasModule,
    PagosModule,
    CosteoModule,
    SyncModule,
    ReportesModule,
    BajasModule,
    // F3-T2: monitoreo de conectividad por tienda (src/conectividad/), no
    // toca ningun modulo existente (ver ConectividadModule para detalle).
    ConectividadModule,
  ],
})
export class AppModule {}
