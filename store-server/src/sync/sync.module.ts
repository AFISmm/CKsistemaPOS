import { Module } from "@nestjs/common";
import { PrismaModule } from "../common/prisma/prisma.module";
import { SyncHttpClient } from "./sync-http-client";
import { SyncService } from "./sync.service";
import { InboxService } from "./inbox.service";

/**
 * SyncModule (F1-T5) — agente de sincronizacion outbox/inbox tienda<->nube
 * (arquitectura.md §4.4/§4.5/§6.4). No expone controladores HTTP propios: es
 * un proceso en background dentro del Store Server (dos `setInterval`, uno
 * por direccion), habilitado solo si `CLOUD_SYNC_URL` esta definido.
 *
 * No modifica CatalogoModule/VentasModule/InventarioModule/PagosModule ni
 * SeguridadModule: solo LEE `EventoDominio` (outbox) y escribe/actualiza
 * `ReglaDeImpuesto`/`SyncEstado` (inbox) via Prisma, igual que cualquier otro
 * consumidor de esas tablas.
 */
@Module({
  imports: [PrismaModule],
  providers: [SyncHttpClient, SyncService, InboxService],
  exports: [SyncService, InboxService],
})
export class SyncModule {}
