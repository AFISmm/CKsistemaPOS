import { Module } from "@nestjs/common";
import { MockPspAdapter } from "./mock-psp.adapter";
import { PSP_ADAPTER } from "./psp-adapter.interface";

/**
 * Modulo hoja (sin dependencias de Ventas/Pagos) para que ambos lo puedan
 * importar sin crear un ciclo. Fase 2 solo cambia el `useClass` (o pasa a
 * `useFactory` con configuracion del PSP real) sin tocar VentasModule ni
 * PagosModule.
 */
@Module({
  providers: [{ provide: PSP_ADAPTER, useClass: MockPspAdapter }],
  exports: [PSP_ADAPTER],
})
export class PspModule {}
