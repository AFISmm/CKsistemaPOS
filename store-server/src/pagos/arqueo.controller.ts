import { Controller, Get, Param } from "@nestjs/common";
import { RequierePermiso } from "../seguridad/permisos.decorator";
import { PERMISOS } from "../seguridad/permisos";
import { PagosService } from "./pagos.service";

/**
 * GET /api/v1/turnos/{id}/arqueo — ownership literal de pagos-pos
 * (arquitectura.md §6.2), aunque `Turno` viva en el esquema de VentasModule.
 *
 * FIX (revision adversarial post-Fase 3): este endpoint no tenia NINGUN
 * permiso ni requeria `x-usuario-id`, a diferencia de `GET /reportes/dia` y
 * `GET /pedidos/:id/costeo` que exponen la misma clase de dato gerencial
 * (totales por metodo, propinas, efectivo esperado). Se reutiliza
 * `REPORTE_VER` (mismo permiso, mismo criterio "dato gerencial, no lo ve un
 * cajero por defecto") en vez de crear una clave nueva para una sola pantalla.
 */
@Controller("api/v1/turnos")
export class ArqueoController {
  constructor(private readonly pagos: PagosService) {}

  @Get(":id/arqueo")
  @RequierePermiso(PERMISOS.REPORTE_VER)
  arqueo(@Param("id") id: string) {
    return this.pagos.arqueoTurno(id);
  }
}
