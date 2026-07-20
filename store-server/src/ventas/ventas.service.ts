import { Inject, Injectable, Logger } from "@nestjs/common";
import { Decimal } from "@prisma/client/runtime/library";
import type { EstadoPedido, Pedido, Prisma } from "@prisma/client";
import { PrismaService } from "../common/prisma/prisma.service";
import { EventosService } from "../common/eventos/eventos.service";
import { EVENTOS_DOMINIO, VentaConfirmadaPayload, VentaRevertidaPayload } from "../common/eventos/tipos-evento";
import { SeguridadService } from "../seguridad/seguridad.service";
import { ErrorDominio } from "../common/errores/error-dominio";
import { esUuid, uuidv7 } from "../common/util/uuid";
import { calcularTotales } from "./calculo-totales";
import { calcularArqueoTurno, calcularDiferenciaEfectivo } from "../reportes/arqueo-calculo";
import { IMPRESORA_ADAPTER, type ImpresoraAdapter } from "../hardware/impresora-adapter.interface";
import type {
  AgregarLineaDto,
  ActualizarLineaDto,
  AplicarDescuentoDto,
  CrearPedidoDto,
} from "./dto/ventas.dto";

const ESTADOS_PEDIDO_CERRADOS: EstadoPedido[] = ["cobrado", "cancelado"];

export interface RegistrarPagoInput {
  id?: string;
  metodo: "efectivo" | "tarjeta" | "otro";
  monto: Decimal | number;
  propina: Decimal | number;
  estado: "aprobado" | "rechazado" | "pendiente" | "reembolsado" | "encolado";
  pspTokenId?: string | null;
  pspReferencia?: string | null;
  ultimos4?: string | null;
  marca?: string | null;
  montoRecibido?: Decimal | number | null;
  cambio?: Decimal | number | null;
}

/**
 * VentasService — DUENO: backend-ventas-pos (arquitectura.md §9.2).
 * Owner exclusivo del calculo de subtotal/descuento/impuesto/propina/total y
 * del saldo pendiente. Duenio del event log/outbox (via EventosService).
 */
@Injectable()
export class VentasService {
  private readonly logger = new Logger(VentasService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventos: EventosService,
    private readonly seguridad: SeguridadService,
    @Inject(IMPRESORA_ADAPTER) private readonly impresora: ImpresoraAdapter,
  ) {}

  // ---------- Pedidos ----------

  async obtenerPedidoOrThrow(pedidoId: string) {
    const pedido = await this.prisma.pedido.findUnique({
      where: { id: pedidoId },
      include: { lineas: { include: { modificadores: true } }, pagos: true },
    });
    if (!pedido) {
      throw new ErrorDominio("pedido_no_encontrado", `Pedido ${pedidoId} no existe`, 404);
    }
    return pedido;
  }

  async listarPedidos(filtro: { turnoId?: string; estado?: EstadoPedido }) {
    return this.prisma.pedido.findMany({
      where: {
        ...(filtro.turnoId ? { turnoId: filtro.turnoId } : {}),
        ...(filtro.estado ? { estado: filtro.estado } : {}),
      },
      include: { lineas: { include: { modificadores: true } } },
      orderBy: { creadoEn: "desc" },
    });
  }

  /**
   * POST /api/v1/pedidos — idempotente por `id` (C-ID, C-API). Un reintento
   * con el mismo id NUNCA crea un segundo Pedido (gate de pruebas Fase 1):
   * se responde 409 con el Pedido ya existente en `detalles.pedido`, siguiendo
   * literalmente C-ERRORES ("409 para conflicto, p. ej. reintento
   * idempotente") — es una respuesta de "ya procesado", no un fallo real.
   */
  async crearPedido(dto: CrearPedidoDto, ubicacionPorDefecto: string): Promise<Pedido> {
    if (!esUuid(dto.id)) {
      throw new ErrorDominio("id_invalido", "id debe ser un UUID (v7) valido", 422);
    }

    const existente = await this.prisma.pedido.findUnique({ where: { id: dto.id } });
    if (existente) {
      throw new ErrorDominio(
        "pedido_ya_existe",
        `Ya existe un pedido con id ${dto.id} (creacion idempotente: no se duplico)`,
        409,
        { pedido: existente },
      );
    }

    const ubicacionId = dto.ubicacionId ?? ubicacionPorDefecto;

    try {
      return await this.prisma.$transaction(async (tx) => {
        const turno = await tx.turno.findFirst({ where: { ubicacionId, estado: "abierto" } });
        if (!turno) {
          throw new ErrorDominio(
            "turno_no_abierto",
            `No hay un turno abierto para la ubicacion ${ubicacionId}`,
            409,
          );
        }

        const turnoActualizado = await tx.turno.update({
          where: { id: turno.id },
          data: { ultimoNumeroOrden: { increment: 1 } },
        });

        return tx.pedido.create({
          data: {
            id: dto.id,
            ubicacionId,
            turnoId: turno.id,
            numeroOrden: turnoActualizado.ultimoNumeroOrden,
            nombreCliente: dto.nombreCliente ?? "",
            canal: dto.canal ?? "mostrador",
            estado: "abierto",
            subtotal: 0,
            descuentoTotal: 0,
            impuestoTotal: 0,
            propinaTotal: 0,
            total: 0,
          },
        });
      });
    } catch (err) {
      // Carrera: dos requests concurrentes con el MISMO id (reintento real en
      // paralelo). Prisma revierte toda la transaccion; el segundo intento
      // cae aqui por violacion de unicidad del id -> devolvemos el existente
      // (mismo contrato de idempotencia que arriba), nunca un duplicado.
      if (esViolacionUnicidad(err)) {
        const pedido = await this.prisma.pedido.findUnique({ where: { id: dto.id } });
        if (pedido) {
          throw new ErrorDominio(
            "pedido_ya_existe",
            `Ya existe un pedido con id ${dto.id} (creacion idempotente: no se duplico)`,
            409,
            { pedido },
          );
        }
      }
      throw err;
    }
  }

  private asegurarEditable(estado: EstadoPedido, pedidoId: string): void {
    if (ESTADOS_PEDIDO_CERRADOS.includes(estado)) {
      throw new ErrorDominio(
        "pedido_cerrado",
        `El pedido ${pedidoId} esta en estado "${estado}" y no admite esta operacion`,
        409,
      );
    }
  }

  async agregarLinea(pedidoId: string, dto: AgregarLineaDto) {
    const pedido = await this.obtenerPedidoOrThrow(pedidoId);
    this.asegurarEditable(pedido.estado, pedidoId);

    const producto = await this.prisma.producto.findUnique({ where: { id: dto.productoId } });
    if (!producto || !producto.activo) {
      throw new ErrorDominio("producto_no_encontrado", `Producto ${dto.productoId} no existe`, 404);
    }
    if (!producto.disponible86) {
      throw new ErrorDominio("producto_86", `El producto "${producto.nombre}" esta marcado 86 (agotado)`, 422);
    }

    if (producto.esCombo) {
      await this.validarComboCompleto(producto.id, dto.modificadorIds ?? []);
    }

    const lineaId = dto.id && esUuid(dto.id) ? dto.id : uuidv7();
    let deltaTotal = new Decimal(0);
    const modificadoresData: Prisma.LineaModificadorCreateManyLineaDePedidoInput[] = [];

    for (const modificadorId of dto.modificadorIds ?? []) {
      const modificador = await this.prisma.modificador.findUnique({ where: { id: modificadorId } });
      if (!modificador) {
        throw new ErrorDominio("modificador_no_encontrado", `Modificador ${modificadorId} no existe`, 404);
      }
      if (!modificador.disponible86) {
        throw new ErrorDominio(
          "modificador_86",
          `El modificador "${modificador.nombre}" esta marcado 86 (agotado)`,
          422,
        );
      }
      deltaTotal = deltaTotal.plus(modificador.precioDelta);
      modificadoresData.push({
        id: uuidv7(),
        modificadorId: modificador.id,
        descripcion: modificador.nombre,
        precioDelta: modificador.precioDelta,
        tipo: modificador.tipo,
      });
    }

    const precioUnitario = new Decimal(producto.precioBase).plus(deltaTotal); // C-SNAPSHOT
    const subtotalLinea = precioUnitario.mul(dto.cantidad);

    // F2-T1 (BOM por variante): comboSeleccionProductoIds es ADITIVO, solo
    // para costeo (CosteoService); no toca precioUnitario/subtotalLinea de
    // arriba (que siguen siendo el snapshot de siempre). Se valida
    // livianamente que cada id sea un Producto real para no persistir basura,
    // sin bloquear la venta si el catalogo de combo no esta cargado (mismo
    // criterio tolerante que validarComboCompleto de arriba).
    const comboSeleccionProductoIds = dto.comboSeleccionProductoIds ?? [];
    if (comboSeleccionProductoIds.length > 0) {
      const existentes = await this.prisma.producto.count({ where: { id: { in: comboSeleccionProductoIds } } });
      if (existentes !== comboSeleccionProductoIds.length) {
        throw new ErrorDominio(
          "combo_seleccion_invalida",
          "comboSeleccionProductoIds contiene un id de Producto que no existe",
          422,
        );
      }
    }

    await this.prisma.lineaDePedido.create({
      data: {
        id: lineaId,
        pedidoId,
        productoId: producto.id,
        descripcion: producto.nombre, // C-SNAPSHOT
        cantidad: dto.cantidad,
        precioUnitario,
        subtotalLinea,
        gravable: producto.gravable, // C-SNAPSHOT
        notas: dto.notas ?? "",
        estadoCocina: "recibido",
        comboSeleccionProductoIds,
        retenida: dto.retenida ?? false,
        modificadores: { createMany: { data: modificadoresData } },
      },
    });

    await this.recalcularYPersistir(pedidoId);
    await this.emitirPedidoActualizado(pedidoId);
    return this.obtenerPedidoOrThrow(pedidoId);
  }

  private async validarComboCompleto(productoId: string, seleccionIds: string[]): Promise<void> {
    const combo = await this.prisma.combo.findUnique({ where: { productoId } });
    if (!combo) return; // sin definicion de combo cargada: no bloquea (dato faltante, no regla violada)

    const componentes = combo.componentes as unknown as Array<{
      grupoSeleccion: string;
      obligatorio: boolean;
      opciones: string[];
    }>;

    for (const slot of componentes) {
      if (!slot.obligatorio) continue;
      const seleccionValida = seleccionIds.some((id) => slot.opciones.includes(id));
      if (!seleccionValida) {
        throw new ErrorDominio(
          "combo_incompleto",
          `Falta seleccionar una opcion obligatoria del grupo "${slot.grupoSeleccion}"`,
          422,
        );
      }
    }
  }

  async actualizarLinea(pedidoId: string, lineaId: string, dto: ActualizarLineaDto) {
    const pedido = await this.obtenerPedidoOrThrow(pedidoId);
    this.asegurarEditable(pedido.estado, pedidoId);

    const linea = pedido.lineas.find((l) => l.id === lineaId);
    if (!linea) {
      throw new ErrorDominio("linea_no_encontrada", `Linea ${lineaId} no existe en el pedido ${pedidoId}`, 404);
    }

    if (dto.eliminar) {
      await this.prisma.lineaDePedido.delete({ where: { id: lineaId } });
    } else if (dto.cantidad !== undefined) {
      const subtotalLinea = new Decimal(linea.precioUnitario).mul(dto.cantidad);
      await this.prisma.lineaDePedido.update({
        where: { id: lineaId },
        data: { cantidad: dto.cantidad, subtotalLinea },
      });
    }

    await this.recalcularYPersistir(pedidoId);
    await this.emitirPedidoActualizado(pedidoId);
    return this.obtenerPedidoOrThrow(pedidoId);
  }

  /** Tasa acumulada (ej. estatal + local) de ReglaDeImpuesto vigente para la ubicacion. */
  private async obtenerTasaImpuesto(ubicacionId: string): Promise<Decimal> {
    const hoy = new Date();
    const reglas = await this.prisma.reglaDeImpuesto.findMany({
      where: {
        ubicacionId,
        vigenteDesde: { lte: hoy },
        OR: [{ vigenteHasta: null }, { vigenteHasta: { gte: hoy } }],
      },
    });
    return reglas.reduce((acc, r) => acc.plus(new Decimal(r.tasa)), new Decimal(0));
  }

  /** Recalcula y persiste subtotal/descuento/impuesto/propina/total (unica fuente de verdad). */
  private async recalcularYPersistir(pedidoId: string): Promise<void> {
    const pedido = await this.prisma.pedido.findUniqueOrThrow({
      where: { id: pedidoId },
      include: { lineas: true, pagos: true },
    });

    const tasa = await this.obtenerTasaImpuesto(pedido.ubicacionId);
    const propinaTotal = pedido.pagos
      .filter((p) => p.estado === "aprobado")
      .reduce((acc, p) => acc.plus(new Decimal(p.propina)), new Decimal(0));

    const totales = calcularTotales({
      lineas: pedido.lineas.map((l) => ({ subtotalLinea: l.subtotalLinea, gravable: l.gravable })),
      descuentoTotal: pedido.descuentoTotal,
      tasaImpuesto: tasa,
      propinaTotal,
    });

    await this.prisma.pedido.update({
      where: { id: pedidoId },
      data: {
        subtotal: totales.subtotal,
        descuentoTotal: totales.descuentoTotal,
        impuestoTotal: totales.impuestoTotal,
        propinaTotal: totales.propinaTotal,
        total: totales.total,
      },
    });
  }

  async aplicarDescuento(pedidoId: string, dto: AplicarDescuentoDto, usuarioId: string | null) {
    const pedido = await this.obtenerPedidoOrThrow(pedidoId);
    this.asegurarEditable(pedido.estado, pedidoId);

    let descuentoTotal: Decimal;
    if (dto.tipo === "monto") {
      descuentoTotal = new Decimal(dto.valor);
    } else {
      if (dto.valor > 100) {
        throw new ErrorDominio("descuento_invalido", "El porcentaje debe ser <= 100", 422);
      }
      descuentoTotal = new Decimal(pedido.subtotal).mul(dto.valor).div(100);
    }

    await this.prisma.pedido.update({ where: { id: pedidoId }, data: { descuentoTotal } });
    await this.recalcularYPersistir(pedidoId);

    const actualizado = await this.obtenerPedidoOrThrow(pedidoId);

    await this.seguridad.registrarAuditoria({
      ubicacionId: pedido.ubicacionId,
      usuarioId,
      tipo: "descuentoAplicado",
      agregadoTipo: "Pedido",
      agregadoId: pedido.id,
      motivo: dto.motivo,
      payload: { tipo: dto.tipo, valor: dto.valor, descuentoTotalResultante: actualizado.descuentoTotal.toString() },
    });

    await this.emitirPedidoActualizado(pedidoId);
    return actualizado;
  }

  /**
   * POST /api/v1/pedidos/:id/enviar-cocina — emite TicketEnviadoACocina.
   * Este evento estaba AUSENTE en la demo (deuda tecnica, PLAN_DE_PRODUCCION.md
   * §6); aqui es el unico camino para pasar a "enviadoCocina" y SIEMPRE emite
   * el evento (KDS lo refleja en <=2s, RNF-01).
   *
   * F2-T2 (Hold & fire): las lineas con `retenida=true` quedan EXCLUIDAS de
   * este envio inicial (no aparecen en el payload del evento ni se les marca
   * `enviadaACocinaEn`) — esperan a que el cajero llame explicitamente a
   * `/liberar` o `/liberar-retenidas`. El Pedido SIGUE pasando a
   * "enviadoCocina" una sola vez aqui (no hay un segundo "enviar inicial");
   * los envios posteriores de lineas retenidas son SIEMPRE liberaciones
   * parciales via `liberarLinea`/`liberarLineasRetenidas`, nunca un segundo
   * llamado a este metodo (que sigue exigiendo estado "abierto").
   */
  async enviarACocina(pedidoId: string) {
    const pedido = await this.obtenerPedidoOrThrow(pedidoId);
    if (pedido.lineas.length === 0) {
      throw new ErrorDominio("pedido_vacio", "El pedido no tiene lineas para enviar a cocina", 422);
    }
    if (pedido.estado !== "abierto") {
      throw new ErrorDominio(
        "estado_invalido",
        `El pedido ${pedidoId} esta en estado "${pedido.estado}"; solo se puede enviar a cocina desde "abierto"`,
        409,
      );
    }

    const lineasAEnviar = pedido.lineas.filter((l) => !l.retenida && !l.enviadaACocinaEn);
    if (lineasAEnviar.length === 0) {
      throw new ErrorDominio(
        "nada_para_enviar_cocina",
        "Todas las lineas del pedido estan retenidas; libera al menos una con /liberar o /liberar-retenidas",
        422,
      );
    }

    const ahora = new Date();
    await this.prisma.$transaction([
      this.prisma.pedido.update({
        where: { id: pedidoId },
        data: { estado: "enviadoCocina", enviadoACocinaEn: ahora },
      }),
      this.prisma.lineaDePedido.updateMany({
        where: { id: { in: lineasAEnviar.map((l) => l.id) } },
        data: { estadoCocina: "recibido", enviadaACocinaEn: ahora },
      }),
    ]);

    await this.emitirTicketACocina(pedido, lineasAEnviar, false);

    return this.obtenerPedidoOrThrow(pedidoId);
  }

  /**
   * PATCH /api/v1/pedidos/:id/lineas/:lineaId/retener — F2-T2 (Hold & fire).
   * Marca una linea para que quede excluida del proximo TicketEnviadoACocina
   * hasta que se libere explicitamente. Idempotente: retener una linea ya
   * retenida es un no-op (no error). Cajero-default: ver README.md (sin
   * @RequierePermiso, misma categoria que agregar/editar una linea).
   */
  async retenerLinea(pedidoId: string, lineaId: string) {
    const pedido = await this.obtenerPedidoOrThrow(pedidoId);
    this.asegurarEditable(pedido.estado, pedidoId);

    const linea = pedido.lineas.find((l) => l.id === lineaId);
    if (!linea) {
      throw new ErrorDominio("linea_no_encontrada", `Linea ${lineaId} no existe en el pedido ${pedidoId}`, 404);
    }
    if (linea.enviadaACocinaEn) {
      throw new ErrorDominio(
        "linea_ya_enviada_cocina",
        `La linea ${lineaId} ya fue enviada a cocina; no se puede retener retroactivamente`,
        409,
      );
    }
    if (!linea.retenida) {
      await this.prisma.lineaDePedido.update({ where: { id: lineaId }, data: { retenida: true } });
      await this.emitirPedidoActualizado(pedidoId);
    }
    return this.obtenerPedidoOrThrow(pedidoId);
  }

  /**
   * POST /api/v1/pedidos/:id/lineas/:lineaId/liberar — F2-T2 (Hold & fire).
   * Envia a cocina ESTA linea (y solo esta), sin re-enviar el resto del
   * pedido. Emite TicketEnviadoACocina con `payload.lineas` conteniendo
   * UNICAMENTE esta linea (evento "liberacionParcial: true" para que KDS
   * pueda distinguirlo de un envio inicial si asi lo desea, aunque el
   * contrato de nombre/forma del evento es el mismo, C-EVENTOS). Idempotente
   * por diseno: liberar una linea que YA fue enviada a cocina (por el envio
   * inicial o por una liberacion previa) responde 409 en vez de duplicar el
   * evento.
   */
  async liberarLinea(pedidoId: string, lineaId: string) {
    const pedido = await this.obtenerPedidoOrThrow(pedidoId);
    this.asegurarEditable(pedido.estado, pedidoId);

    const linea = pedido.lineas.find((l) => l.id === lineaId);
    if (!linea) {
      throw new ErrorDominio("linea_no_encontrada", `Linea ${lineaId} no existe en el pedido ${pedidoId}`, 404);
    }
    if (linea.enviadaACocinaEn) {
      throw new ErrorDominio(
        "linea_ya_enviada_cocina",
        `La linea ${lineaId} ya fue enviada a cocina; liberar de nuevo duplicaria el ticket`,
        409,
      );
    }

    const ahora = new Date();
    await this.prisma.lineaDePedido.update({
      where: { id: lineaId },
      data: { retenida: false, enviadaACocinaEn: ahora, liberadaACocinaEn: ahora, estadoCocina: "recibido" },
    });

    await this.emitirTicketACocina(pedido, [linea], true);

    return this.obtenerPedidoOrThrow(pedidoId);
  }

  /**
   * POST /api/v1/pedidos/:id/liberar-retenidas — F2-T2 (Hold & fire): "enviar
   * al final"/"por curso" en bloque. Libera TODAS las lineas actualmente
   * retenidas-y-no-enviadas en UN solo TicketEnviadoACocina (no uno por
   * linea). Si no hay ninguna pendiente es un no-op silencioso (no emite
   * evento vacio, no es un error: llamar dos veces seguidas es seguro).
   */
  async liberarLineasRetenidas(pedidoId: string) {
    const pedido = await this.obtenerPedidoOrThrow(pedidoId);
    this.asegurarEditable(pedido.estado, pedidoId);

    const pendientes = pedido.lineas.filter((l) => l.retenida && !l.enviadaACocinaEn);
    if (pendientes.length === 0) {
      return this.obtenerPedidoOrThrow(pedidoId);
    }

    const ahora = new Date();
    await this.prisma.lineaDePedido.updateMany({
      where: { id: { in: pendientes.map((l) => l.id) } },
      data: { retenida: false, enviadaACocinaEn: ahora, liberadaACocinaEn: ahora, estadoCocina: "recibido" },
    });

    await this.emitirTicketACocina(pedido, pendientes, true);

    return this.obtenerPedidoOrThrow(pedidoId);
  }

  /** Unico punto de emision de TicketEnviadoACocina (envio inicial o liberacion parcial), evita divergencia de payload entre los 3 metodos de arriba. */
  private async emitirTicketACocina(
    pedido: { id: string; ubicacionId: string; numeroOrden: number; turnoId: string },
    lineas: Array<{
      id: string;
      productoId: string;
      descripcion: string;
      cantidad: number;
      notas: string;
      modificadores: Array<{ descripcion: string }>;
    }>,
    liberacionParcial: boolean,
  ): Promise<void> {
    await this.eventos.emitir({
      tipo: EVENTOS_DOMINIO.TICKET_ENVIADO_A_COCINA,
      ubicacionId: pedido.ubicacionId,
      agregadoTipo: "Pedido",
      agregadoId: pedido.id,
      payload: {
        pedidoId: pedido.id,
        numeroOrden: pedido.numeroOrden,
        turnoId: pedido.turnoId,
        liberacionParcial,
        lineas: lineas.map((l) => ({
          lineaDePedidoId: l.id,
          productoId: l.productoId,
          descripcion: l.descripcion,
          cantidad: l.cantidad,
          notas: l.notas,
          modificadores: l.modificadores.map((m) => m.descripcion),
        })),
      },
    });

    // Comanda de cocina de respaldo en papel (ADR-0006 F0-T3, arquitectura.md
    // §4.3 "Enviar a KDS ... degradado: impresion de comanda de respaldo").
    // Best-effort a proposito: un fallo de la impresora (apagada, red caida)
    // NUNCA debe impedir que el ticket llegue al KDS por WS ni bloquear la
    // venta (RNF-06, degradacion controlada, arquitectura.md §2.2) — solo se
    // loguea, no se relanza.
    try {
      await this.impresora.imprimirComandaCocina({
        pedidoId: pedido.id,
        numeroOrden: pedido.numeroOrden,
        ubicacionId: pedido.ubicacionId,
        liberacionParcial,
        lineas: lineas.map((l) => ({
          descripcion: l.descripcion,
          cantidad: l.cantidad,
          notas: l.notas,
          modificadores: l.modificadores.map((m) => m.descripcion),
        })),
      });
    } catch (err) {
      this.logger.warn(
        `No se pudo imprimir la comanda de cocina del pedido ${pedido.id} (continua sin bloquear la venta): ${(err as Error).message}`,
      );
    }
  }

  /** Saldo pendiente = (subtotal - descuento + impuesto) - pagos aprobados. La propina se paga aparte. */
  async saldoPendiente(pedidoId: string): Promise<Decimal> {
    const pedido = await this.obtenerPedidoOrThrow(pedidoId);
    const montoAprobado = pedido.pagos
      .filter((p) => p.estado === "aprobado")
      .reduce((acc, p) => acc.plus(new Decimal(p.monto)), new Decimal(0));
    const baseSinPropina = new Decimal(pedido.subtotal).minus(pedido.descuentoTotal).plus(pedido.impuestoTotal);
    return baseSinPropina.minus(montoAprobado);
  }

  /**
   * Registra un Pago ya resuelto (efectivo/tarjeta) contra el Pedido.
   * Invocado por PagosModule (consume backend-ventas, arquitectura.md §6.1);
   * VentasService sigue siendo el UNICO que decide si el pedido pasa a
   * "cobrado" segun el saldo. Si el pedido queda saldado, emite
   * VentaConfirmada (consumida por InventarioModule para descontar stock).
   */
  async registrarPagoEnPedido(pedidoId: string, pago: RegistrarPagoInput) {
    const pedido = await this.obtenerPedidoOrThrow(pedidoId);

    if (pedido.estado === "cancelado") {
      throw new ErrorDominio("pedido_cancelado", `El pedido ${pedidoId} esta cancelado`, 409);
    }
    if (pedido.estado === "cobrado") {
      throw new ErrorDominio("pedido_ya_cobrado", `El pedido ${pedidoId} ya fue cobrado`, 409);
    }

    const pagoId = pago.id && esUuid(pago.id) ? pago.id : uuidv7();
    await this.prisma.pago.create({
      data: {
        id: pagoId,
        pedidoId,
        turnoId: pedido.turnoId,
        metodo: pago.metodo,
        monto: pago.monto,
        propina: pago.propina,
        estado: pago.estado,
        pspTokenId: pago.pspTokenId ?? null,
        pspReferencia: pago.pspReferencia ?? null,
        ultimos4: pago.ultimos4 ?? null,
        marca: pago.marca ?? null,
        montoRecibido: pago.montoRecibido ?? null,
        cambio: pago.cambio ?? null,
      },
    });

    await this.recalcularYPersistir(pedidoId);
    const saldo = await this.saldoPendiente(pedidoId);

    if (pago.estado === "aprobado" && saldo.lessThanOrEqualTo(0)) {
      const actualizado = await this.prisma.pedido.update({
        where: { id: pedidoId },
        data: { estado: "cobrado", cerradoEn: new Date() },
        include: { lineas: true },
      });

      const payload: VentaConfirmadaPayload = {
        pedidoId: actualizado.id,
        ubicacionId: actualizado.ubicacionId,
        turnoId: actualizado.turnoId,
        lineas: actualizado.lineas.map((l) => ({
          lineaDePedidoId: l.id,
          productoId: l.productoId,
          cantidad: l.cantidad,
        })),
      };

      await this.eventos.emitir({
        tipo: EVENTOS_DOMINIO.VENTA_CONFIRMADA,
        ubicacionId: actualizado.ubicacionId,
        agregadoTipo: "Pedido",
        agregadoId: actualizado.id,
        payload,
      });

      await this.seguridad.registrarAuditoria({
        ubicacionId: actualizado.ubicacionId,
        usuarioId: null,
        tipo: "ventaConfirmada",
        agregadoTipo: "Pedido",
        agregadoId: actualizado.id,
        motivo: "Pago aprobado que salda el pedido",
        payload: { total: actualizado.total.toString(), pagoId },
      });
    }

    await this.emitirPedidoActualizado(pedidoId);
    return this.obtenerPedidoOrThrow(pedidoId);
  }

  /**
   * POST /api/v1/pedidos/:id/reembolso — reembolso a nivel de Pedido (RN-04).
   * FIX de deuda tecnica: la demo NO invocaba la reversa de stock desde el
   * reembolso; aqui el reembolso SIEMPRE emite VentaRevertida (consumida por
   * InventarioModule), cerrando el ciclo receta -> stock -> reversa.
   */
  async reembolsarPedido(pedidoId: string, usuarioId: string | null, motivo: string) {
    const pedido = await this.obtenerPedidoOrThrow(pedidoId);

    if (pedido.estado !== "cobrado") {
      throw new ErrorDominio(
        "pedido_no_cobrado",
        `Solo se pueden reembolsar pedidos cobrados (estado actual: "${pedido.estado}")`,
        409,
      );
    }

    const pagosAprobados = pedido.pagos.filter((p) => p.estado === "aprobado");
    const montoOriginal = pagosAprobados.reduce((acc, p) => acc.plus(new Decimal(p.monto)), new Decimal(0));
    const propinaOriginal = pagosAprobados.reduce((acc, p) => acc.plus(new Decimal(p.propina)), new Decimal(0));
    const metodo = pagosAprobados.length === 1 ? pagosAprobados[0].metodo : "otro";

    const pagoReembolsoId = uuidv7();
    await this.prisma.pago.create({
      data: {
        id: pagoReembolsoId,
        pedidoId: pedido.id,
        turnoId: pedido.turnoId,
        metodo,
        monto: montoOriginal.negated(),
        propina: propinaOriginal.negated(),
        estado: "reembolsado",
      },
    });

    await this.prisma.pedido.update({
      where: { id: pedidoId },
      data: { estado: "cancelado", cerradoEn: new Date() },
    });

    const payload: VentaRevertidaPayload = {
      pedidoId: pedido.id,
      ubicacionId: pedido.ubicacionId,
      turnoId: pedido.turnoId,
      motivo,
      lineas: pedido.lineas.map((l) => ({
        lineaDePedidoId: l.id,
        productoId: l.productoId,
        cantidad: l.cantidad,
      })),
    };

    await this.eventos.emitir({
      tipo: EVENTOS_DOMINIO.VENTA_REVERTIDA,
      ubicacionId: pedido.ubicacionId,
      agregadoTipo: "Pedido",
      agregadoId: pedido.id,
      payload,
    });

    await this.seguridad.registrarAuditoria({
      ubicacionId: pedido.ubicacionId,
      usuarioId,
      tipo: "reembolso",
      agregadoTipo: "Pedido",
      agregadoId: pedido.id,
      motivo,
      payload: {
        montoReembolsado: montoOriginal.toString(),
        propinaReembolsada: propinaOriginal.toString(),
        pagoReembolsoId,
      },
    });

    await this.recalcularYPersistir(pedidoId);
    await this.emitirPedidoActualizado(pedidoId);
    return this.obtenerPedidoOrThrow(pedidoId);
  }

  private async emitirPedidoActualizado(pedidoId: string): Promise<void> {
    const pedido = await this.prisma.pedido.findUnique({ where: { id: pedidoId } });
    if (!pedido) return;
    await this.eventos.emitir({
      tipo: EVENTOS_DOMINIO.PEDIDO_ACTUALIZADO,
      ubicacionId: pedido.ubicacionId,
      agregadoTipo: "Pedido",
      agregadoId: pedido.id,
      payload: {
        pedidoId: pedido.id,
        estado: pedido.estado,
        subtotal: pedido.subtotal.toString(),
        descuentoTotal: pedido.descuentoTotal.toString(),
        impuestoTotal: pedido.impuestoTotal.toString(),
        propinaTotal: pedido.propinaTotal.toString(),
        total: pedido.total.toString(),
      },
    });
  }

  // ---------- Turnos ----------

  async abrirTurno(input: { ubicacionId: string; usuarioAperturaId: string; fondoInicial?: number }) {
    const existente = await this.prisma.turno.findFirst({
      where: { ubicacionId: input.ubicacionId, estado: "abierto" },
    });
    if (existente) {
      throw new ErrorDominio(
        "turno_ya_abierto",
        `Ya existe un turno abierto (${existente.id}) para la ubicacion ${input.ubicacionId}`,
        409,
      );
    }

    const turno = await this.prisma.turno.create({
      data: {
        id: uuidv7(),
        ubicacionId: input.ubicacionId,
        usuarioAperturaId: input.usuarioAperturaId,
        fondoInicial: input.fondoInicial ?? 0,
        estado: "abierto",
      },
    });

    await this.seguridad.registrarAuditoria({
      ubicacionId: input.ubicacionId,
      usuarioId: input.usuarioAperturaId,
      tipo: "aperturaTurno",
      agregadoTipo: "Turno",
      agregadoId: turno.id,
      motivo: "Apertura de turno",
      payload: { fondoInicial: turno.fondoInicial.toString() },
    });

    return turno;
  }

  async obtenerTurnoOrThrow(turnoId: string) {
    const turno = await this.prisma.turno.findUnique({ where: { id: turnoId } });
    if (!turno) {
      throw new ErrorDominio("turno_no_encontrado", `Turno ${turnoId} no existe`, 404);
    }
    return turno;
  }

  /**
   * Calcula el arqueo (cierre de caja) de un turno. UNICA fuente del calculo:
   * delega en la funcion PURA `calcularArqueoTurno` (`reportes/arqueo-calculo.ts`,
   * testeada sin DB en `test/unit/arqueo-calculo.spec.ts`) — este metodo SOLO
   * resuelve los datos de Prisma. Reusado por `ArqueoController`
   * (PagosModule, via PagosService.arqueoTurno) y por `ReportesService`
   * (F2-T3, reporte del dia): ninguno de los dos reimplementa la formula.
   */
  async calcularArqueo(turnoId: string) {
    const turno = await this.obtenerTurnoOrThrow(turnoId);
    const pedidosCobrados = await this.prisma.pedido.findMany({ where: { turnoId, estado: "cobrado" } });
    const pagosAprobados = await this.prisma.pago.findMany({ where: { turnoId, estado: "aprobado" } });
    // F2-T3 fix: un reembolso en efectivo durante el turno DEBE restar del
    // efectivo esperado (sale fisicamente del cajon); antes solo se miraban
    // los pagos "aprobado" y este movimiento se ignoraba por completo.
    const pagosReembolsados = await this.prisma.pago.findMany({ where: { turnoId, estado: "reembolsado" } });

    const resultado = calcularArqueoTurno({
      fondoInicial: turno.fondoInicial,
      pedidosCobrados,
      pagosAprobados,
      pagosReembolsados,
    });

    return {
      turnoId,
      estado: turno.estado,
      numeroPedidos: resultado.numeroPedidos,
      totalVentas: resultado.totalVentas.toString(),
      totalDescuentos: resultado.totalDescuentos.toString(),
      totalImpuestos: resultado.totalImpuestos.toString(),
      totalPropinas: resultado.totalPropinas.toString(),
      porMetodo: {
        efectivo: resultado.porMetodo.efectivo.toString(),
        tarjeta: resultado.porMetodo.tarjeta.toString(),
        otro: resultado.porMetodo.otro.toString(),
      },
      fondoInicial: resultado.fondoInicial.toString(),
      efectivoReembolsado: resultado.efectivoReembolsado.toString(),
      efectivoEsperado: resultado.efectivoEsperado.toString(),
    };
  }

  /** POST /api/v1/turnos/:id/cierre-z — inmutable (HU-PAG-08 CA3). */
  async cerrarTurnoZ(turnoId: string, input: { efectivoContado?: number; usuarioId?: string | null }) {
    const turno = await this.obtenerTurnoOrThrow(turnoId);
    if (turno.estado === "cerrado") {
      throw new ErrorDominio("turno_ya_cerrado", `El turno ${turnoId} ya fue cerrado; el reporte Z es inmutable`, 409);
    }

    const arqueo = await this.calcularArqueo(turnoId);

    let efectivoContado: Decimal | undefined;
    let diferencia: Decimal | undefined;
    if (input.efectivoContado !== undefined) {
      efectivoContado = new Decimal(input.efectivoContado);
      diferencia = calcularDiferenciaEfectivo(arqueo.efectivoEsperado, efectivoContado);
    }

    const reporteZ = {
      generadoEn: new Date().toISOString(),
      ...arqueo,
    };

    const actualizado = await this.prisma.turno.update({
      where: { id: turnoId },
      data: {
        estado: "cerrado",
        cerradoEn: new Date(),
        ...(efectivoContado !== undefined ? { efectivoContado, diferencia } : {}),
        reporteZ,
      },
    });

    await this.seguridad.registrarAuditoria({
      ubicacionId: turno.ubicacionId,
      usuarioId: input.usuarioId ?? null,
      tipo: "cierreZ",
      agregadoTipo: "Turno",
      agregadoId: turno.id,
      motivo: "Cierre de turno (reporte Z)",
      payload: reporteZ,
    });

    return actualizado;
  }
}

function esViolacionUnicidad(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: string }).code === "P2002"
  );
}
