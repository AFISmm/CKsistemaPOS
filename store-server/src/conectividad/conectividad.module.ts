import { Module } from "@nestjs/common";
import { ConectividadController } from "./conectividad.controller";
import { ConectividadService } from "./conectividad.service";
import { VerificadorRed } from "./verificador-red";

/**
 * ConectividadModule (F3-T2) — monitoreo de conectividad a internet por
 * tienda con alertas tempranas (PLAN_DE_PRODUCCION.md Fase 3). Modulo HOJA:
 * no depende de VentasModule/PagosModule/CatalogoModule/etc, solo de
 * `PrismaModule`/`EventosModule` (ambos `@Global`, no hace falta
 * reimportarlos aqui, mismo criterio que `InventarioModule`). Deliberadamente
 * NO modifica `SyncModule` (`src/sync/`, F1-T5, owned/terminado por esa
 * tarea): es una senal NUEVA y paralela, de cadencia mucho mas rapida que el
 * ciclo de outbox, para alertar ANTES de que el agente de sincronizacion note
 * el problema (ver el comentario de cabecera de ConectividadService).
 */
@Module({
  controllers: [ConectividadController],
  providers: [VerificadorRed, ConectividadService],
  exports: [ConectividadService],
})
export class ConectividadModule {}
