import { Body, Controller, Get, Headers, Param, Post, Query } from "@nestjs/common";
import { RequierePermiso } from "../seguridad/permisos.decorator";
import { PERMISOS } from "../seguridad/permisos";
import { ErrorDominio } from "../common/errores/error-dominio";
import { BajasService } from "./bajas.service";
import { CrearSolicitudBajaDto, ListarSolicitudesBajaQueryDto, RechazarSolicitudBajaDto } from "./dto/bajas.dto";

/**
 * BajasController — F3-T1 (PLAN_DE_PRODUCCION.md Fase 3): "Bajas con
 * aprobacion de calidad". Mismo patron de autenticacion que el resto del
 * Store Server (header x-usuario-id tras login por PIN, ver README.md §5):
 * PermisosGuard ya valida el permiso/header ANTES de llegar aqui, pero se
 * revalida presencia explicitamente (mismo criterio que
 * TurnosController.abrir) porque `solicitadoPorId`/`revisadoPorId` son FKs NO
 * nulas en SolicitudBaja.
 */
@Controller("api/v1/bajas")
export class BajasController {
  constructor(private readonly bajas: BajasService) {}

  @Get()
  listar(@Query() query: ListarSolicitudesBajaQueryDto) {
    return this.bajas.listarSolicitudes({ estado: query.estado, ubicacionId: query.ubicacionId });
  }

  @Post()
  @RequierePermiso(PERMISOS.INVENTARIO_SOLICITAR_BAJA)
  solicitar(@Body() dto: CrearSolicitudBajaDto, @Headers("x-usuario-id") usuarioId?: string) {
    if (!usuarioId) {
      throw new ErrorDominio("usuario_requerido", "Header x-usuario-id es requerido para solicitar una baja", 422);
    }
    return this.bajas.solicitarBaja(dto, usuarioId);
  }

  @Post(":id/aprobar")
  @RequierePermiso(PERMISOS.INVENTARIO_APROBAR_BAJA)
  aprobar(@Param("id") id: string, @Headers("x-usuario-id") usuarioId?: string) {
    if (!usuarioId) {
      throw new ErrorDominio("usuario_requerido", "Header x-usuario-id es requerido para aprobar una baja", 422);
    }
    return this.bajas.aprobarBaja(id, usuarioId);
  }

  @Post(":id/rechazar")
  @RequierePermiso(PERMISOS.INVENTARIO_APROBAR_BAJA)
  rechazar(
    @Param("id") id: string,
    @Body() dto: RechazarSolicitudBajaDto,
    @Headers("x-usuario-id") usuarioId?: string,
  ) {
    if (!usuarioId) {
      throw new ErrorDominio("usuario_requerido", "Header x-usuario-id es requerido para rechazar una baja", 422);
    }
    return this.bajas.rechazarBaja(id, usuarioId, dto?.motivoRechazo);
  }
}
