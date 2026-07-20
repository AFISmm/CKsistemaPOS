import { Controller, Get, Param } from "@nestjs/common";
import { PagosService } from "./pagos.service";

/**
 * GET /api/v1/turnos/{id}/arqueo — ownership literal de pagos-pos
 * (arquitectura.md §6.2), aunque `Turno` viva en el esquema de VentasModule.
 */
@Controller("api/v1/turnos")
export class ArqueoController {
  constructor(private readonly pagos: PagosService) {}

  @Get(":id/arqueo")
  arqueo(@Param("id") id: string) {
    return this.pagos.arqueoTurno(id);
  }
}
