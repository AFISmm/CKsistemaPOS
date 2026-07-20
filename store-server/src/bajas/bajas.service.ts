import { Injectable } from "@nestjs/common";
import { Decimal } from "@prisma/client/runtime/library";
import { PrismaService } from "../common/prisma/prisma.service";
import { SeguridadService } from "../seguridad/seguridad.service";
import { InventarioService } from "../inventario/inventario.service";
import { ErrorDominio } from "../common/errores/error-dominio";
import { uuidv7 } from "../common/util/uuid";
import { evaluarUmbralMerma } from "./merma-umbral";
import type { CrearSolicitudBajaDto } from "./dto/bajas.dto";

/**
 * Ventana del "periodo de conteo" (S-13) usada para acumular merma. S-12
 * documenta que este MVP NO tiene modulo de compras/recepcion con un ledger
 * valorizado propio ni una entidad "conteo fisico" formal, asi que "periodo
 * de conteo" (termino de S-13) no tiene un correlato de datos exacto todavia.
 * [SUPUESTO F3-T1, igual criterio que S-04/mtls-config/hardware-config]: se
 * usa una ventana rodante de N dias terminando "ahora" (default 30, un ciclo
 * mensual tipico de conteo de inventario en QSR). Configurable via env var
 * para no bloquear la tarea en la validacion de operaciones (misma tactica
 * que REPORTES_DAYPARTS_JSON en ReportesModule).
 */
function periodoMermaDias(): number {
  const raw = process.env.INVENTARIO_PERIODO_MERMA_DIAS;
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 30;
}

@Injectable()
export class BajasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventario: InventarioService,
    private readonly seguridad: SeguridadService,
  ) {}

  /**
   * POST /api/v1/bajas — crea la SolicitudBaja en "pendiente". Requisito
   * NUCLEO de F3-T1: esto NUNCA toca Stock (a diferencia de
   * POST /api/v1/stock/ajuste, que aplica el movimiento de inmediato). Solo
   * `aprobarBaja` mueve stock.
   */
  async solicitarBaja(dto: CrearSolicitudBajaDto, usuarioId: string): Promise<unknown> {
    const insumo = await this.prisma.insumo.findUnique({ where: { id: dto.insumoId } });
    if (!insumo) {
      throw new ErrorDominio("insumo_no_encontrado", `Insumo ${dto.insumoId} no existe`, 422);
    }
    const ubicacion = await this.prisma.ubicacion.findUnique({ where: { id: dto.ubicacionId } });
    if (!ubicacion) {
      throw new ErrorDominio("ubicacion_no_encontrada", `Ubicacion ${dto.ubicacionId} no existe`, 404);
    }

    return this.prisma.solicitudBaja.create({
      data: {
        id: uuidv7(),
        ubicacionId: dto.ubicacionId,
        insumoId: dto.insumoId,
        cantidad: dto.cantidad,
        motivo: dto.motivo,
        etiqueta: dto.etiqueta ?? "",
        solicitadoPorId: usuarioId,
        estado: "pendiente",
      },
    });
  }

  /** GET /api/v1/bajas?estado=&ubicacionId= — cola de aprobacion del gerente. */
  async listarSolicitudes(filtros: { estado?: string; ubicacionId?: string }): Promise<unknown> {
    return this.prisma.solicitudBaja.findMany({
      where: {
        estado: filtros.estado as never,
        ubicacionId: filtros.ubicacionId,
      },
      include: { insumo: true },
      orderBy: { solicitadoEn: "desc" },
    });
  }

  /**
   * POST /api/v1/bajas/:id/aprobar — UNICO punto que mueve stock por una
   * baja. Orden de operaciones (todas necesarias, ninguna opcional):
   *   1) Congela el valor en dolares de la merma (cantidad * costoUnitario
   *      VIGENTE, snapshot — ver SolicitudBaja.valorEstimado en schema.prisma).
   *   2) Mueve stock via InventarioService.registrarMermaAprobada (el UNICO
   *      punto de escritura sobre Stock, arq. 4.5); ESO ya audita
   *      "ajusteInventario" por si solo (InventarioService.aplicarMovimiento).
   *   3) Marca la solicitud "aprobada".
   *   4) Evalua el umbral de S-13 y, si corresponde, emite una alerta de
   *      auditoria ADICIONAL ("alertaMerma"), separada del ajusteInventario
   *      de (2).
   * 409 si la solicitud ya no esta "pendiente" (nunca un no-op silencioso).
   */
  async aprobarBaja(id: string, gerenteId: string): Promise<unknown> {
    const solicitud = await this.prisma.solicitudBaja.findUnique({ where: { id } });
    if (!solicitud) {
      throw new ErrorDominio("solicitud_baja_no_encontrada", `SolicitudBaja ${id} no existe`, 404);
    }
    if (solicitud.estado !== "pendiente") {
      throw new ErrorDominio(
        "solicitud_baja_ya_revisada",
        `La solicitud ${id} ya fue revisada (estado actual: ${solicitud.estado})`,
        409,
        { estado: solicitud.estado },
      );
    }

    const insumo = await this.prisma.insumo.findUnique({ where: { id: solicitud.insumoId } });
    if (!insumo) {
      throw new ErrorDominio("insumo_no_encontrado", `Insumo ${solicitud.insumoId} no existe`, 422);
    }
    const stockAntes = await this.prisma.stock.findUnique({
      where: { ubicacionId_insumoId: { ubicacionId: solicitud.ubicacionId, insumoId: solicitud.insumoId } },
    });

    const cantidad = new Decimal(solicitud.cantidad);
    const costoUnitario = new Decimal(insumo.costoUnitario);
    const valorEstaAprobacion = cantidad.mul(costoUnitario);
    // Ver README.md §17.3: sin modulo de compras/recepcion (S-12), se usa el
    // valor de Stock ANTES de esta merma (cantidadActual * costoUnitario)
    // como proxy honesto de "valor de insumo recibido" (S-13).
    const valorBaseRecibido = new Decimal(stockAntes?.cantidadActual ?? 0).mul(costoUnitario);

    await this.inventario.registrarMermaAprobada({
      ubicacionId: solicitud.ubicacionId,
      insumoId: solicitud.insumoId,
      cantidad,
      motivo: `Baja aprobada (${solicitud.motivo}${solicitud.etiqueta ? `, "${solicitud.etiqueta}"` : ""})`,
      usuarioId: gerenteId,
      contexto: {
        solicitudBajaId: solicitud.id,
        motivoBaja: solicitud.motivo,
        etiqueta: solicitud.etiqueta,
        solicitadoPorId: solicitud.solicitadoPorId,
      },
    });

    const actualizada = await this.prisma.solicitudBaja.update({
      where: { id },
      data: {
        estado: "aprobada",
        revisadoPorId: gerenteId,
        revisadoEn: new Date(),
        valorEstimado: valorEstaAprobacion,
      },
    });

    await this.evaluarUmbralYAuditar({
      ubicacionId: solicitud.ubicacionId,
      insumoId: solicitud.insumoId,
      solicitudId: solicitud.id,
      valorEstaAprobacion,
      valorBaseRecibido,
      usuarioId: gerenteId,
    });

    return actualizada;
  }

  /**
   * POST /api/v1/bajas/:id/rechazar — NUNCA toca Stock (a diferencia de
   * aprobarBaja). 409 si ya no esta "pendiente". Se audita igual que la
   * aprobacion (RNF-07): una decision de negocio sobre perdida de inventario
   * queda trazada tanto si se aprueba como si se rechaza.
   */
  async rechazarBaja(id: string, gerenteId: string, motivoRechazo?: string): Promise<unknown> {
    const solicitud = await this.prisma.solicitudBaja.findUnique({ where: { id } });
    if (!solicitud) {
      throw new ErrorDominio("solicitud_baja_no_encontrada", `SolicitudBaja ${id} no existe`, 404);
    }
    if (solicitud.estado !== "pendiente") {
      throw new ErrorDominio(
        "solicitud_baja_ya_revisada",
        `La solicitud ${id} ya fue revisada (estado actual: ${solicitud.estado})`,
        409,
        { estado: solicitud.estado },
      );
    }

    const actualizada = await this.prisma.solicitudBaja.update({
      where: { id },
      data: {
        estado: "rechazada",
        revisadoPorId: gerenteId,
        revisadoEn: new Date(),
        motivoRechazo: motivoRechazo ?? null,
      },
    });

    await this.seguridad.registrarAuditoria({
      ubicacionId: solicitud.ubicacionId,
      usuarioId: gerenteId,
      tipo: "bajaRechazada",
      agregadoTipo: "SolicitudBaja",
      agregadoId: solicitud.id,
      motivo: motivoRechazo || "Solicitud de baja rechazada sin motivo adicional",
      payload: {
        insumoId: solicitud.insumoId,
        cantidad: solicitud.cantidad.toString(),
        motivoBaja: solicitud.motivo,
        solicitadoPorId: solicitud.solicitadoPorId,
      },
    });

    return actualizada;
  }

  /**
   * S-13: acumula la merma APROBADA del insumo/ubicacion en la ventana del
   * "periodo de conteo" (ver periodoMermaDias arriba) y evalua si, contando
   * esta aprobacion, se supera Ubicacion.umbralMermaPorcentaje. Si se supera,
   * emite un EventoDeAuditoria "alertaMerma" SEPARADO del "ajusteInventario"
   * que ya escribio InventarioService.registrarMermaAprobada — dos eventos
   * con dos propositos (uno es "que se movio", el otro es "esto ya es
   * demasiado", visible al gerente de tienda).
   */
  private async evaluarUmbralYAuditar(input: {
    ubicacionId: string;
    insumoId: string;
    solicitudId: string;
    valorEstaAprobacion: Decimal;
    valorBaseRecibido: Decimal;
    usuarioId: string | null;
  }): Promise<void> {
    const ubicacion = await this.prisma.ubicacion.findUnique({ where: { id: input.ubicacionId } });
    const umbralPorcentaje = new Decimal(ubicacion?.umbralMermaPorcentaje ?? 3);

    const dias = periodoMermaDias();
    const desde = new Date(Date.now() - dias * 24 * 60 * 60 * 1000);

    const previas = await this.prisma.solicitudBaja.findMany({
      where: {
        ubicacionId: input.ubicacionId,
        insumoId: input.insumoId,
        estado: "aprobada",
        revisadoEn: { gte: desde },
        NOT: { id: input.solicitudId },
      },
    });
    const valorMermaPrevia = previas.reduce(
      (acc, s) => acc.plus(new Decimal(s.valorEstimado ?? 0)),
      new Decimal(0),
    );

    const resultado = evaluarUmbralMerma({
      valorMermaPrevia,
      valorMermaNueva: input.valorEstaAprobacion,
      valorBaseRecibido: input.valorBaseRecibido,
      umbralPorcentaje,
    });

    if (!resultado.superaUmbralAhora) return;

    await this.seguridad.registrarAuditoria({
      ubicacionId: input.ubicacionId,
      usuarioId: input.usuarioId,
      tipo: "alertaMerma",
      agregadoTipo: "SolicitudBaja",
      agregadoId: input.solicitudId,
      motivo: `Merma acumulada del insumo ${input.insumoId} en los ultimos ${dias} dias supera el umbral configurado (${umbralPorcentaje.toString()}%)`,
      payload: {
        insumoId: input.insumoId,
        periodoDias: dias,
        umbralPorcentaje: umbralPorcentaje.toString(),
        porcentajeMermaAcumulada: resultado.porcentajeMermaAcumulada,
        valorMermaAcumulada: resultado.valorMermaAcumulada,
        valorBaseRecibido: input.valorBaseRecibido.toString(),
        cruzoUmbralEnEstaAprobacion: resultado.cruzoUmbralEnEstaAprobacion,
      },
    });
  }
}
