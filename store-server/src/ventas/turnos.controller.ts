import { Body, Controller, Headers, Param, Post } from "@nestjs/common";
import { RequierePermiso } from "../seguridad/permisos.decorator";
import { PERMISOS } from "../seguridad/permisos";
import { VentasService } from "./ventas.service";
import { AbrirTurnoDto, CerrarTurnoZDto } from "./dto/ventas.dto";
import { ErrorDominio } from "../common/errores/error-dominio";

// NOTA DE OWNERSHIP (C-NOMBRES): GET /api/v1/turnos/{id}/arqueo esta
// deliberadamente en PagosModule (src/pagos/arqueo.controller.ts), no aqui,
// porque arquitectura.md §6.2 lo lista bajo "Pagos (pagos-pos)" pese a que
// `Turno` es una entidad de VentasModule. Se respeta el contrato literal.

const UBICACION_PILOTO_ID = process.env.UBICACION_PILOTO_ID ?? "ubic-miami-fl";

@Controller("api/v1/turnos")
export class TurnosController {
  constructor(private readonly ventas: VentasService) {}

  @Post()
  @RequierePermiso(PERMISOS.TURNO_ABRIR)
  abrir(@Body() dto: AbrirTurnoDto, @Headers("x-usuario-id") usuarioId?: string) {
    if (!usuarioId) {
      throw new ErrorDominio("usuario_requerido", "Header x-usuario-id es requerido para abrir un turno", 422);
    }
    return this.ventas.abrirTurno({
      ubicacionId: dto.ubicacionId ?? UBICACION_PILOTO_ID,
      usuarioAperturaId: usuarioId,
      fondoInicial: dto.fondoInicial,
    });
  }

  @Post(":id/cierre-z")
  @RequierePermiso(PERMISOS.TURNO_CIERRE_Z)
  cierreZ(
    @Param("id") id: string,
    @Body() dto: CerrarTurnoZDto,
    @Headers("x-usuario-id") usuarioId?: string,
  ) {
    return this.ventas.cerrarTurnoZ(id, { efectivoContado: dto.efectivoContado, usuarioId: usuarioId ?? null });
  }
}
