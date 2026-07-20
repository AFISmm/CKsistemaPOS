import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { Decimal } from "@prisma/client/runtime/library";
import { PrismaService } from "../common/prisma/prisma.service";
import { EventosService } from "../common/eventos/eventos.service";
import { EVENTOS_DOMINIO, VentaConfirmadaPayload, VentaRevertidaPayload } from "../common/eventos/tipos-evento";
import { SeguridadService } from "../seguridad/seguridad.service";
import { ErrorDominio } from "../common/errores/error-dominio";
import { uuidv7 } from "../common/util/uuid";
import { AjustarStockDto, ProducirInsumoElaboradoDto } from "./dto/inventario.dto";

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

  /**
   * FIX (revision adversarial post-Fase 3, C-TENANT): `ubicacionId` era
   * opcional y, si se omitia, devolvia el stock de TODAS las tiendas en una
   * sola respuesta (la semilla tiene Miami FL + Austin TX reales) — misma
   * fuga de datos entre tiendas que `reportes.service.ts` ya evita
   * explicitamente exigiendo el parametro. Se alinea al mismo criterio.
   */
  async listarStock(ubicacionId?: string) {
    if (!ubicacionId) {
      throw new ErrorDominio("ubicacion_requerida", "ubicacionId es requerido", 422);
    }
    return this.prisma.stock.findMany({
      where: { ubicacionId },
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

  /**
   * S-14 (BOM multinivel — productos elaborados/intermedios, ver
   * docs/analisis-reunion-diego-arches-20260717.md §3.1 y docs/requisitos.md
   * S-14). POST /api/v1/stock/produccion — "produce" `cantidadProducida`
   * unidades de un Insumo elaborado (ej. Salsa BBQ) a partir de su propia
   * Receta/RecetaInsumo de insumos base: analogo a
   * `registrarMermaAprobada` (F3-T1) pero para produccion interna en vez de
   * merma — CONSUME insumos base y GENERA stock del insumo elaborado, en vez
   * de solo restar.
   *
   * Requisito NUCLEO (igual espiritu que "la baja no impacta stock hasta ser
   * aprobada" de F3-T1): si CUALQUIER insumo base no alcanza para cubrir
   * `cantidadProducida`, la operacion COMPLETA se rechaza (422) ANTES de
   * mutar nada — nunca se consume una parte de los insumos y se corta a
   * medio camino. Por eso esta funcion primero LEE y valida el stock de
   * TODOS los insumos base (un solo `findMany`) y solo si TODOS alcanzan
   * procede a aplicar los movimientos, reusando el UNICO punto de escritura
   * sobre Stock (`aplicarMovimiento`, mismo patron atomico `{increment:
   * delta}` que ya usan `ajustarManual`/`registrarMermaAprobada`/
   * `handleVentaConfirmada` — no se duplica esa logica aqui). La aplicacion
   * secuencial de movimientos (uno por insumo base + uno para el elaborado)
   * sigue el MISMO patron no-transaccional que `moverStockPorPedido` ya
   * usa para una venta multi-insumo (ningun llamador de `aplicarMovimiento`
   * en este servicio envuelve sus multiples llamadas en una
   * `prisma.$transaction`); la validacion PREVIA de stock (antes de mutar)
   * es lo que garantiza que un rechazo por stock insuficiente nunca deja
   * consumo parcial, no una transaccion de DB que abarque escritura +
   * auditoria (`SeguridadService.registrarAuditoria` es un modulo que esta
   * fuera del alcance de esta tarea, ver README S-14).
   */
  async producirInsumoElaborado(dto: ProducirInsumoElaboradoDto): Promise<unknown> {
    const cantidadProducida = new Decimal(dto.cantidadProducida);
    if (cantidadProducida.lessThanOrEqualTo(0)) {
      throw new ErrorDominio("cantidad_invalida", "cantidadProducida debe ser mayor a 0", 422);
    }

    const ubicacion = await this.prisma.ubicacion.findUnique({ where: { id: dto.ubicacionId } });
    if (!ubicacion) {
      throw new ErrorDominio("ubicacion_no_encontrada", `Ubicacion ${dto.ubicacionId} no existe`, 404);
    }

    const insumoElaborado = await this.prisma.insumo.findUnique({ where: { id: dto.insumoElaboradoId } });
    if (!insumoElaborado) {
      throw new ErrorDominio("insumo_no_encontrado", `Insumo ${dto.insumoElaboradoId} no existe`, 422);
    }
    if (!insumoElaborado.esElaborado) {
      throw new ErrorDominio(
        "insumo_no_elaborado",
        `Insumo ${dto.insumoElaboradoId} no esta marcado como elaborado (Insumo.esElaborado=false)`,
        422,
      );
    }

    const receta = await this.prisma.receta.findFirst({
      where: { insumoElaboradoId: dto.insumoElaboradoId, activo: true },
    });
    if (!receta) {
      throw new ErrorDominio(
        "receta_no_definida",
        `El insumo elaborado ${dto.insumoElaboradoId} no tiene una receta activa definida (ver POST /api/v1/insumos/:id/receta)`,
        422,
      );
    }
    const recetaInsumos = await this.prisma.recetaInsumo.findMany({ where: { recetaId: receta.id } });
    if (recetaInsumos.length === 0) {
      throw new ErrorDominio(
        "receta_vacia",
        `La receta del insumo elaborado ${dto.insumoElaboradoId} no tiene insumos base`,
        422,
      );
    }

    // Cantidad de CADA insumo base que hace falta, escalada por cantidadProducida.
    const consumos = recetaInsumos.map((ri) => ({
      insumoId: ri.insumoId,
      cantidad: new Decimal(ri.cantidad).mul(cantidadProducida),
    }));

    // Validacion PREVIA (antes de mutar nada): lee el stock actual de TODOS
    // los insumos base de una vez y rechaza la operacion COMPLETA si alguno
    // no alcanza.
    const stocksBase = await this.prisma.stock.findMany({
      where: { ubicacionId: dto.ubicacionId, insumoId: { in: consumos.map((c) => c.insumoId) } },
    });
    const disponiblePorInsumo = new Map(stocksBase.map((s) => [s.insumoId, new Decimal(s.cantidadActual)]));
    const faltantes = consumos
      .map((c) => ({ insumoId: c.insumoId, disponible: disponiblePorInsumo.get(c.insumoId) ?? new Decimal(0), requerido: c.cantidad }))
      .filter((c) => c.disponible.lessThan(c.requerido))
      .map((c) => ({ insumoId: c.insumoId, disponible: c.disponible.toString(), requerido: c.requerido.toString() }));

    if (faltantes.length > 0) {
      throw new ErrorDominio(
        "stock_insuficiente",
        `Stock insuficiente de insumo(s) base para producir ${cantidadProducida.toString()} unidad(es) de ${insumoElaborado.nombre}`,
        422,
        { faltantes },
      );
    }

    // Todo validado: consume cada insumo base...
    for (const consumo of consumos) {
      await this.aplicarMovimiento({
        ubicacionId: dto.ubicacionId,
        insumoId: consumo.insumoId,
        delta: consumo.cantidad.neg(),
        tipoMovimiento: "produccion",
        motivo: `Consumo para producir ${cantidadProducida.toString()} ${insumoElaborado.unidadMedida} de ${insumoElaborado.nombre}`,
        usuarioId: dto.usuarioId ?? null,
        contexto: { insumoElaboradoId: dto.insumoElaboradoId, recetaId: receta.id },
      });
    }
    // ...y genera stock del insumo elaborado.
    await this.aplicarMovimiento({
      ubicacionId: dto.ubicacionId,
      insumoId: dto.insumoElaboradoId,
      delta: cantidadProducida,
      tipoMovimiento: "produccion",
      motivo: `Produccion de ${cantidadProducida.toString()} ${insumoElaborado.unidadMedida} de ${insumoElaborado.nombre}`,
      usuarioId: dto.usuarioId ?? null,
      contexto: { recetaId: receta.id },
    });

    // Resumen auditable de TODA la produccion (que se consumio + que se
    // genero), ADEMAS de los "ajusteInventario" que aplicarMovimiento ya
    // escribio por cada movimiento individual arriba.
    await this.seguridad.registrarAuditoria({
      ubicacionId: dto.ubicacionId,
      usuarioId: dto.usuarioId ?? null,
      tipo: "produccionInsumoElaborado",
      agregadoTipo: "Insumo",
      agregadoId: dto.insumoElaboradoId,
      motivo: `Produccion de insumo elaborado: ${insumoElaborado.nombre}`,
      payload: {
        recetaId: receta.id,
        insumoElaboradoId: dto.insumoElaboradoId,
        cantidadProducida: cantidadProducida.toString(),
        consumos: consumos.map((c) => ({ insumoId: c.insumoId, cantidad: c.cantidad.toString() })),
      },
    });

    return {
      insumoElaboradoId: dto.insumoElaboradoId,
      cantidadProducida: cantidadProducida.toString(),
      consumos: consumos.map((c) => ({ insumoId: c.insumoId, cantidad: c.cantidad.toString() })),
    };
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
    tipoMovimiento: "venta" | "reversa" | "merma" | "recepcion" | "ajuste" | "produccion";
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

  /**
   * Lista de insumos por debajo (o igual) de su umbral de stock bajo.
   * Mismo fix C-TENANT que `listarStock` (ver comentario ahi).
   */
  async insumosBajoUmbral(ubicacionId?: string) {
    if (!ubicacionId) {
      throw new ErrorDominio("ubicacion_requerida", "ubicacionId es requerido", 422);
    }
    const stockRelevante = await this.prisma.stock.findMany({
      where: { ubicacionId },
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
