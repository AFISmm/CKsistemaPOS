import { Inject, Injectable, Logger } from "@nestjs/common";
import { Decimal } from "@prisma/client/runtime/library";
import type { EstadoPago, Pago } from "@prisma/client";
import { PrismaService } from "../common/prisma/prisma.service";
import { EventosService } from "../common/eventos/eventos.service";
import { EVENTOS_DOMINIO } from "../common/eventos/tipos-evento";
import { SeguridadService } from "../seguridad/seguridad.service";
import { ErrorDominio } from "../common/errores/error-dominio";
import { uuidv7 } from "../common/util/uuid";
import { VentasService } from "../ventas/ventas.service";
import { PSP_ADAPTER, type PspAdapter } from "./psp/psp-adapter.interface";
import { IMPRESORA_ADAPTER, type ImpresoraAdapter } from "../hardware/impresora-adapter.interface";
import type { RegistrarPagoDto, ReembolsoPagoDto } from "./dto/pagos.dto";

/**
 * Resultado semantico del cobro, para que el controller elija el status HTTP
 * correcto (fix de deuda tecnica: la demo devolvia 201 tambien para
 * rechazado/encolado).
 */
export type ResultadoCobro = "aprobado" | "encolado" | "rechazado";

export interface ProcesarPagoResultado {
  pago: Pago;
  resultado: ResultadoCobro;
  saldoPendiente: string;
}

/**
 * PagosService — DUENO: pagos-pos (arquitectura.md §9.4).
 *
 * NUNCA recalcula subtotal/impuesto/total/saldo: SIEMPRE pregunta a
 * VentasService (backend-ventas-pos, unica fuente de verdad del calculo) y
 * solo registra montos contra ese saldo (evita doble fuente de verdad,
 * arquitectura.md §6.2).
 */
@Injectable()
export class PagosService {
  private readonly logger = new Logger(PagosService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventos: EventosService,
    private readonly seguridad: SeguridadService,
    private readonly ventas: VentasService,
    @Inject(PSP_ADAPTER) private readonly psp: PspAdapter,
    @Inject(IMPRESORA_ADAPTER) private readonly impresora: ImpresoraAdapter,
  ) {}

  async procesarPago(dto: RegistrarPagoDto, usuarioId: string | null): Promise<ProcesarPagoResultado> {
    const pedido = await this.ventas.obtenerPedidoOrThrow(dto.pedidoId);
    const saldoActual = await this.ventas.saldoPendiente(dto.pedidoId);
    const monto = new Decimal(dto.monto);
    const propina = new Decimal(dto.propina ?? 0);

    if (monto.greaterThan(saldoActual)) {
      throw new ErrorDominio(
        "monto_excede_saldo",
        `monto (${monto.toString()}) excede el saldo pendiente (${saldoActual.toString()}) del pedido`,
        422,
      );
    }

    const pagoId = uuidv7();
    let estado: EstadoPago;
    let montoRecibido: Decimal | null = null;
    let cambio: Decimal | null = null;
    let pspTokenId: string | null = null;
    let pspReferencia: string | null = null;
    let ultimos4: string | null = null;
    let marca: string | null = null;

    if (dto.metodo === "efectivo") {
      if (dto.montoRecibido === undefined) {
        throw new ErrorDominio(
          "monto_recibido_requerido",
          "montoRecibido es requerido para pagos en efectivo",
          422,
        );
      }
      const totalACobrar = monto.plus(propina);
      montoRecibido = new Decimal(dto.montoRecibido);
      if (montoRecibido.lessThan(totalACobrar)) {
        throw new ErrorDominio(
          "efectivo_insuficiente",
          `montoRecibido (${montoRecibido.toString()}) es menor al total a cobrar (${totalACobrar.toString()})`,
          422,
        );
      }
      cambio = montoRecibido.minus(totalACobrar);
      estado = "aprobado";
    } else if (dto.metodo === "tarjeta") {
      const resultado = await this.psp.autorizar({
        montoTotal: monto.plus(propina).toString(),
        offline: dto.offline,
        forzarRechazo: dto.forzarRechazo,
      });
      estado = resultado.encolado ? "encolado" : resultado.aprobado ? "aprobado" : "rechazado";
      pspTokenId = resultado.pspTokenId;
      pspReferencia = resultado.pspReferencia;
      ultimos4 = resultado.ultimos4;
      marca = resultado.marca;
    } else {
      estado = "aprobado";
    }

    if (dto.metodo === "efectivo" && estado === "aprobado") {
      // Efectivo aprobado -> pulso fisico del cajon (ADR-0006 F0-T3: por la
      // impresora, ESC/POS). Solo el EFECTO de hardware vive aqui: el evento
      // de dominio `CajonAbierto` y la auditoria de abajo son el UNICO punto
      // de emision (no se duplican si el adaptador tambien emitiera algo -
      // ImpresoraAdapter.abrirCajon() NUNCA emite eventos/auditoria, ver
      // src/hardware/impresora-adapter.interface.ts). Tarjeta NUNCA abre
      // cajon (RN de negocio: nunca se maneja efectivo en un pago con tarjeta).
      try {
        await this.impresora.abrirCajon();
      } catch (err) {
        this.logger.warn(
          `No se pudo disparar el pulso del cajon para el pedido ${pedido.id} (continua sin bloquear el cobro): ${(err as Error).message}`,
        );
      }

      await this.eventos.emitir({
        tipo: EVENTOS_DOMINIO.CAJON_ABIERTO,
        ubicacionId: pedido.ubicacionId,
        agregadoTipo: "Pedido",
        agregadoId: pedido.id,
        payload: { pedidoId: pedido.id, pagoId, usuarioId },
      });
      await this.seguridad.registrarAuditoria({
        ubicacionId: pedido.ubicacionId,
        usuarioId,
        tipo: "aperturaCajon",
        agregadoTipo: "Pedido",
        agregadoId: pedido.id,
        motivo: "Pago en efectivo",
        payload: { pedidoId: pedido.id, pagoId },
      });
    }

    await this.ventas.registrarPagoEnPedido(dto.pedidoId, {
      id: pagoId,
      metodo: dto.metodo,
      monto,
      propina,
      estado,
      pspTokenId,
      pspReferencia,
      ultimos4,
      marca,
      montoRecibido,
      cambio,
    });

    await this.eventos.emitir({
      tipo: EVENTOS_DOMINIO.PAGO_REGISTRADO,
      ubicacionId: pedido.ubicacionId,
      agregadoTipo: "Pago",
      agregadoId: pagoId,
      payload: {
        pedidoId: dto.pedidoId,
        metodo: dto.metodo,
        monto: monto.toString(),
        propina: propina.toString(),
        estado,
        ultimos4,
        marca,
      },
    });

    await this.seguridad.registrarAuditoria({
      ubicacionId: pedido.ubicacionId,
      usuarioId,
      tipo: "pagoRegistrado",
      agregadoTipo: "Pago",
      agregadoId: pagoId,
      motivo: `Pago ${dto.metodo} (${estado})`,
      payload: { pedidoId: dto.pedidoId, metodo: dto.metodo, monto: monto.toString(), estado },
    });

    const pago = await this.prisma.pago.findUniqueOrThrow({ where: { id: pagoId } });
    const saldoNuevo = await this.ventas.saldoPendiente(dto.pedidoId);

    const resultado: ResultadoCobro = estado === "aprobado" ? "aprobado" : estado === "encolado" ? "encolado" : "rechazado";

    // Recibo de cliente: solo cuando ESTE pago aprobado deja el pedido
    // saldado (saldo <= 0). En un pago mixto/split-tender (RN-05) esto evita
    // imprimir un recibo parcial por cada abono; se imprime UNA vez, cuando
    // el pedido efectivamente se salda. Best-effort (no bloquea el cobro ya
    // registrado si la impresora falla, RNF-06).
    if (resultado === "aprobado" && saldoNuevo.lessThanOrEqualTo(0)) {
      try {
        await this.impresora.imprimirRecibo({
          pedidoId: pedido.id,
          numeroOrden: pedido.numeroOrden,
          ubicacionId: pedido.ubicacionId,
          lineas: pedido.lineas.map((l) => ({
            descripcion: l.descripcion,
            cantidad: l.cantidad,
            precioUnitario: new Decimal(l.precioUnitario).toString(),
            subtotalLinea: new Decimal(l.subtotalLinea).toString(),
          })),
          subtotal: new Decimal(pedido.subtotal).toString(),
          descuentoTotal: new Decimal(pedido.descuentoTotal).toString(),
          impuestoTotal: new Decimal(pedido.impuestoTotal).toString(),
          propinaTotal: new Decimal(pedido.propinaTotal).toString(),
          total: new Decimal(pedido.total).toString(),
          metodoPago: dto.metodo,
          montoRecibido: montoRecibido?.toString() ?? null,
          cambio: cambio?.toString() ?? null,
        });
      } catch (err) {
        this.logger.warn(
          `No se pudo imprimir el recibo del pedido ${pedido.id} (el cobro ya quedo registrado, no se bloquea): ${(err as Error).message}`,
        );
      }
    }

    return { pago, resultado, saldoPendiente: saldoNuevo.toString() };
  }

  /**
   * POST /api/v1/pagos/:id/reembolso — reembolsa un Pago puntual via PSP
   * (C-PCI: por pspReferencia, nunca por PAN). No recalcula el Pedido (eso es
   * responsabilidad de backend-ventas-pos via POST /pedidos/:id/reembolso);
   * este endpoint es el usado cuando se necesita revertir specificamente un
   * metodo de pago (ej. tarjeta) de un pago mixto.
   */
  async reembolsarPago(pagoId: string, dto: ReembolsoPagoDto, usuarioId: string | null) {
    const pago = await this.prisma.pago.findUnique({ where: { id: pagoId } });
    if (!pago) {
      throw new ErrorDominio("pago_no_encontrado", `Pago ${pagoId} no existe`, 404);
    }
    if (pago.metodo !== "tarjeta") {
      throw new ErrorDominio(
        "metodo_no_reembolsable",
        "Solo los pagos con tarjeta se reembolsan via PSP (el efectivo se reembolsa en caja)",
        422,
      );
    }
    if (pago.estado !== "aprobado") {
      throw new ErrorDominio(
        "pago_no_reembolsable",
        `El pago esta en estado "${pago.estado}"; solo se reembolsan pagos "aprobado"`,
        422,
      );
    }
    if (!pago.pspReferencia) {
      throw new ErrorDominio("pago_sin_referencia_psp", "El pago no tiene referencia de PSP", 500);
    }

    const totalPago = new Decimal(pago.monto).plus(pago.propina);
    const monto = dto.monto !== undefined ? new Decimal(dto.monto) : totalPago;
    if (monto.lessThanOrEqualTo(0) || monto.greaterThan(totalPago)) {
      throw new ErrorDominio(
        "monto_reembolso_invalido",
        `monto de reembolso invalido (0 < monto <= ${totalPago.toString()})`,
        422,
      );
    }

    const resultado = await this.psp.reembolsar(pago.pspReferencia, monto.toString());
    if (!resultado.aprobado) {
      throw new ErrorDominio("reembolso_rechazado", resultado.mensaje, 502);
    }

    const actualizado = await this.prisma.pago.update({
      where: { id: pagoId },
      data: { estado: "reembolsado", pspReferencia: resultado.pspReferencia },
    });

    await this.seguridad.registrarAuditoria({
      ubicacionId: (await this.prisma.pedido.findUnique({ where: { id: pago.pedidoId } }))?.ubicacionId ?? "desconocida",
      usuarioId,
      tipo: "reembolso",
      agregadoTipo: "Pago",
      agregadoId: pagoId,
      motivo: dto.motivo ?? "Reembolso de pago con tarjeta",
      payload: { pedidoId: pago.pedidoId, monto: monto.toString(), pspReferencia: actualizado.pspReferencia },
    });

    return { pago: actualizado };
  }

  async arqueoTurno(turnoId: string) {
    return this.ventas.calcularArqueo(turnoId);
  }
}
