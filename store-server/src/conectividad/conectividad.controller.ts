import { Controller, Get } from "@nestjs/common";
import { PrismaService } from "../common/prisma/prisma.service";
import { EVENTOS_DOMINIO } from "../common/eventos/tipos-evento";
import type { ConectividadCambiadaPayload } from "../common/eventos/tipos-evento";
import { ConectividadService } from "./conectividad.service";

/**
 * `GET /api/v1/conectividad/estado` (F3-T2) — pensado para una futura
 * pantalla/banner de terminal o de gerente ("sin conexion desde hace 12
 * min"), no para operar el POS: por eso NO exige `@RequierePermiso`, igual
 * criterio que `GET /catalogo` o `GET /stock` (informacion de solo lectura
 * que cualquier terminal de la tienda debe poder mostrar, no un dato sensible
 * como costeo/reportes gerenciales).
 */
@Controller("api/v1/conectividad")
export class ConectividadController {
  constructor(
    private readonly conectividad: ConectividadService,
    private readonly prisma: PrismaService,
  ) {}

  @Get("estado")
  async estado(): Promise<{
    estado: string;
    desde: string;
    ultimaVerificacion: string | null;
    historialReciente: ConectividadCambiadaPayload[];
  }> {
    const actual = this.conectividad.obtenerEstadoActual();

    const eventos = await this.prisma.eventoDominio.findMany({
      where: {
        tipo: EVENTOS_DOMINIO.CONECTIVIDAD_CAMBIADA,
        ubicacionId: this.conectividad.ubicacionIdConfigurada,
      },
      orderBy: { ocurridoEn: "desc" },
      take: this.conectividad.historialMaxConfigurado,
    });

    return {
      estado: actual.estado,
      desde: actual.desde,
      ultimaVerificacion: actual.ultimaVerificacion,
      historialReciente: eventos.map((e) => e.payload as unknown as ConectividadCambiadaPayload),
    };
  }
}
