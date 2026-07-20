import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { Decimal } from "@prisma/client/runtime/library";
import { PrismaService } from "../common/prisma/prisma.service";
import { EventosService } from "../common/eventos/eventos.service";
import { EVENTOS_DOMINIO, VentaConfirmadaPayload, VentaRevertidaPayload } from "../common/eventos/tipos-evento";
import { SeguridadService } from "../seguridad/seguridad.service";
import { ErrorDominio } from "../common/errores/error-dominio";
import { uuidv7 } from "../common/util/uuid";
import { AjustarStockDto } from "./dto/inventario.dto";

/**
 * InventarioService — DUENO: menu-inventario-pos (arquitectura.md §9.3).
 *
 * Regla vinculante: el stock se mueve SIEMPRE por eventos/deltas (venta,
 * merma, recepcion, reversa), nunca por sobrescritura directa de
 * `cantidadActual` (arquitectura.md §4.5). `aplicarMovimiento` usa
 * `{ increment: delta }` de Prisma, atomico a nivel de fila.
 *
 * Suscriptor de VentaConfirmada/VentaRevertida (@OnEvent): backend-ventas-pos
 * NUNCA llama directamente a este servicio para descontar stock (C-EVENTOS);
 * publica el evento via EventosService y este listener reacciona. Esto
 * corrige la deuda tecnica de la demo ("el reembolso no revierte stock").
 */
@Injectable()
export class InventarioService {
  private readonly logger = new Logger(InventarioService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventos: EventosService,
    private readonly seguridad: SeguridadService,
  ) {}

  async listarStock(ubicacionId?: string) {
    return this.prisma.stock.findMany({
      where: ubicacionId ? { ubicacionId } : undefined,
      include: { insumo: true },
      orderBy: { actualizadoEn: "desc" },
    });
  }

  /** POST /api/v1/stock/ajuste — auditado (HU-INV-03 CA4, C-AUDIT). */
  async ajustarManual(dto: AjustarStockDto) {
    if (dto.cantidad === 0) {
      throw new ErrorDominio("ajuste_invalido", "cantidad no puede ser 0", 422);
    }
    return this.aplicarMovimiento({
      ubicacionId: dto.ubicacionId,
      insumoId: dto.insumoId,
      delta: new Decimal(dto.cantidad),
      tipoMovimiento: dto.tipoMovimiento,
      motivo: dto.motivo,
      usuarioId: dto.usuarioId ?? null,
      contexto: {},
    });
  }

  /**
   * F3-T1 (Bajas con aprobacion de calidad) — UNICO llamador esperado:
   * BajasService.aprobarBaja. Aplica la merma YA APROBADA reusando
   * `aplicarMovimiento` (el unico punto de escritura sobre Stock, arq. 4.5) en
   * vez de duplicar la logica de upsert/auditoria/StockBajo aqui. `cantidad`
   * siempre llega POSITIVA (la cantidad solicitada/aprobada); este metodo es
   * responsable de convertirla en el delta negativo (una merma siempre resta
   * stock, nunca lo suma).
   */
  async registrarMermaAprobada(input: {
    ubicacionId: string;
    insumoId: string;
    cantidad: Decimal;
    motivo: string;
    usuarioId: string | null;
    contexto: Record<string, unknown>;
  }): Promise<void> {
    await this.aplicarMovimiento({
      ubicacionId: input.ubicacionId,
      insumoId: input.insumoId,
      delta: input.cantidad.neg(),
      tipoMovimiento: "merma",
      motivo: input.motivo,
      usuarioId: input.usuarioId,
      contexto: input.contexto,
    });
  }

  @OnEvent(EVENTOS_DOMINIO.VENTA_CONFIRMADA)
  async handleVentaConfirmada(envelope: { payload: VentaConfirmadaPayload }): Promise<void> {
    await this.moverStockPorPedido(envelope.payload, -1, "venta", "Venta confirmada: descuento de insumos por receta");
  }

  @OnEvent(EVENTOS_DOMINIO.VENTA_REVERTIDA)
  async handleVentaRevertida(envelope: { payload: VentaRevertidaPayload }): Promise<void> {
    await this.moverStockPorPedido(
      envelope.payload,
      1,
      "reversa",
      `Venta revertida (${envelope.payload.motivo}): reintegro de insumos por receta`,
    );
  }

  private async moverStockPorPedido(
    payload: VentaConfirmadaPayload,
    signo: 1 | -1,
    tipoMovimiento: "venta" | "reversa",
    motivo: string,
  ): Promise<void> {
    for (const linea of payload.lineas) {
      const receta = await this.prisma.receta.findFirst({
        where: { productoId: linea.productoId, activo: true },
      });
      if (!receta) continue; // producto sin receta definida: no descuenta insumos

      const recetaInsumos = await this.prisma.recetaInsumo.findMany({ where: { recetaId: receta.id } });
      for (const ri of recetaInsumos) {
        const delta = new Decimal(ri.cantidad).mul(linea.cantidad).mul(signo);
        if (delta.isZero()) continue;

        await this.aplicarMovimiento({
          ubicacionId: payload.ubicacionId,
          insumoId: ri.insumoId,
          delta,
          tipoMovimiento,
          motivo,
          usuarioId: null,
          contexto: { pedidoId: payload.pedidoId, lineaDePedidoId: linea.lineaDePedidoId, productoId: linea.productoId },
        });
      }
    }
  }

  /**
   * Unico punto de escritura sobre Stock. Aplica un delta atomico, registra
   * auditoria (ajusteInventario) y emite StockBajo si el nuevo saldo cae por
   * debajo del umbral del Insumo (HU-INV-03).
   */
  private async aplicarMovimiento(input: {
    ubicacionId: string;
    insumoId: string;
    delta: Decimal;
    tipoMovimiento: "venta" | "reversa" | "merma" | "recepcion" | "ajuste";
    motivo: string;
    usuarioId: string | null;
    contexto: Record<string, unknown>;
  }): Promise<void> {
    const insumo = await this.prisma.insumo.findUnique({ where: { id: input.insumoId } });
    if (!insumo) {
      throw new ErrorDominio("insumo_no_encontrado", `Insumo ${input.insumoId} no existe`, 422);
    }

    const stock = await this.prisma.stock.upsert({
      where: { ubicacionId_insumoId: { ubicacionId: input.ubicacionId, insumoId: input.insumoId } },
      create: {
        id: uuidv7(),
        ubicacionId: input.ubicacionId,
        insumoId: input.insumoId,
        cantidadActual: input.delta,
      },
      update: {
        cantidadActual: { increment: input.delta },
      },
    });

    const nuevo = new Decimal(stock.cantidadActual);
    const anterior = nuevo.minus(input.delta);

    await this.seguridad.registrarAuditoria({
      ubicacionId: input.ubicacionId,
      usuarioId: input.usuarioId,
      tipo: "ajusteInventario",
      agregadoTipo: "Stock",
      agregadoId: stock.id,
      motivo: input.motivo,
      payload: {
        ...input.contexto,
        insumoId: input.insumoId,
        tipoMovimiento: input.tipoMovimiento,
        cantidadAnterior: anterior.toString(),
        cantidadNueva: nuevo.toString(),
        movimiento: input.delta.toString(),
      },
    });

    if (nuevo.lessThanOrEqualTo(new Decimal(insumo.umbralStockBajo))) {
      await this.eventos.emitir({
        tipo: EVENTOS_DOMINIO.STOCK_BAJO,
        ubicacionId: input.ubicacionId,
        agregadoTipo: "Stock",
        agregadoId: stock.id,
        payload: {
          insumoId: insumo.id,
          nombre: insumo.nombre,
          cantidadActual: nuevo.toString(),
          umbral: insumo.umbralStockBajo.toString(),
        },
      });
    }
  }

  /** Lista de insumos por debajo (o igual) de su umbral de stock bajo. */
  async insumosBajoUmbral(ubicacionId?: string) {
    const stockRelevante = await this.prisma.stock.findMany({
      where: ubicacionId ? { ubicacionId } : undefined,
      include: { insumo: true },
    });
    return stockRelevante
      .filter((s) => new Decimal(s.cantidadActual).lessThanOrEqualTo(new Decimal(s.insumo.umbralStockBajo)))
      .map((s) => ({
        insumoId: s.insumo.id,
        nombre: s.insumo.nombre,
        cantidadActual: s.cantidadActual.toString(),
        umbral: s.insumo.umbralStockBajo.toString(),
      }));
  }
}
