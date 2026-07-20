import { Global, Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { AuthController } from "./auth.controller";
import { PermisosGuard } from "./permisos.guard";
import { SeguridadService } from "./seguridad.service";

/**
 * SeguridadModule (F1-T6) — RBAC + auditoria. Global: exporta SeguridadService
 * para que Ventas/Inventario/Pagos escriban EventoDeAuditoria sin reimportar
 * el modulo, y registra PermisosGuard como guard GLOBAL de la app (aplica a
 * todos los controllers; solo actua si el endpoint tiene @RequierePermiso).
 */
@Global()
@Module({
  controllers: [AuthController],
  providers: [
    SeguridadService,
    {
      provide: APP_GUARD,
      useClass: PermisosGuard,
    },
  ],
  exports: [SeguridadService],
})
export class SeguridadModule {}
