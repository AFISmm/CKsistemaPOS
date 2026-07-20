import { Module } from "@nestjs/common";
import { InventarioModule } from "../inventario/inventario.module";
import { BajasController } from "./bajas.controller";
import { BajasService } from "./bajas.service";

/**
 * BajasModule — F3-T1 (menu-inventario-pos + seguridad-accesos-pos). Importa
 * InventarioModule para reusar InventarioService.registrarMermaAprobada (el
 * UNICO punto de escritura sobre Stock, arq. 4.5) — nunca reimplementa esa
 * logica aqui. SeguridadService no se importa explicitamente: SeguridadModule
 * es @Global() (ver seguridad.module.ts), igual que ya hace InventarioModule.
 */
@Module({
  imports: [InventarioModule],
  controllers: [BajasController],
  providers: [BajasService],
  exports: [BajasService],
})
export class BajasModule {}
