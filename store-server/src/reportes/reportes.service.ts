import { Injectable, Logger } from "@nestjs/common";
import { Decimal } from "@prisma/client/runtime/library";
import { PrismaService } from "../common/prisma/prisma.service";
import { ErrorDominio } from "../common/errores/error-dominio";
import { VentasService } from "../ventas/ventas.service";
import { CosteoService } from "../costeo/costeo.service";
import { calcularVentasDesglose, type VentasDesglose } from "./ventas-desglose";
import { calcularMixProductos, type OrdenMix } from "./mix-productos";
import { bucketDaypart, obtenerDefinicionesDaypart, type DefinicionDaypart } from "./dayparts";

const FORMATO_FECHA = /^\d{4}-\d{2}-\d{2}$/;

export interface ReporteDiaInput {
  ubicacionId: string;
  /** YYYY-MM-DD, inclusive. */
  fecha: string;
  /** YYYY-MM-DD, inclusive. Default: igual a `fecha` (reporte de un solo dia). */
  hasta?: string;
  ordenarMixPor?: OrdenMix;
}

interface PedidoParaReporte {
  cerradoEn: Date | null;
  subtotal: Decimal;
  descuentoTotal: Decimal;
  impuestoTotal: Decimal;
  propinaTotal: Decimal;
  total: Decimal;
  lineas: Array<{ id: string; productoId: string; descripcion: string; cantidad: number; subtotalLinea: Decimal }>;
  pagos: Array<{ metodo: "efectivo" | "tarjeta" | "otro"; monto: Decimal; propina: Decimal; estado: string }>;
}

/**
 * ReportesService — duenio: `reportes-analitica-pos` (F2-T3, HU-REP-01).
 *
 * Compone en UN solo payload las 4 secciones que pide HU-REP-01 para el MVP
 * de una tienda (decision documentada en store-server/README.md: se prefirio
 * una unica llamada `GET /reportes/dia` a 4 sub-recursos porque el payload es
 * chico para un dashboard de una sola tienda/dia y evita 4 round-trips en el
 * caso de uso principal, "el gerente abre el dashboard del dia").
 *
 * NUNCA reimplementa el calculo de arqueo: reusa
 * `VentasService.calcularArqueo` (duenio del calculo, `ventas/ventas.service.ts`),
 * que a su vez delega en la funcion pura `reportes/arqueo-calculo.ts`.
 *
 * Margen en el mix de productos: EXTRA opcional (no pedido explicitamente por
 * HU-REP-01), habilitado porque `CosteoModule` (F2-T1, en curso en paralelo a
 * esta tarea) ya expone `CosteoService.calcularCostoLineaPersistida`. Se
 * calcula "best effort": si costear una linea falla por lo que sea (dato de
 * receta incompleto, etc.) simplemente esa linea/producto se reporta SIN
 * `costoEstimado`/`margenEstimado` en vez de tumbar el reporte completo — el
 * nucleo de F2-T3 (ventas/mix/arqueo/daypart) nunca depende de CosteoModule.
 */
@Injectable()
export class ReportesService {
  private readonly logger = new Logger(ReportesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ventas: VentasService,
    private readonly costeo: CosteoService,
  ) {}

  async reporteDia(input: ReporteDiaInput) {
    if (!input.ubicacionId) {
      // C-TENANT: nunca agregar sin acotar a una ubicacion (evita fuga cruzada de numeros de otra tienda).
      throw new ErrorDominio("ubicacion_requerida", "ubicacionId es requerido", 422);
    }
    const fechaDesde = validarFormatoFecha(input.fecha, "fecha");
    const fechaHasta = validarFormatoFecha(input.hasta ?? input.fecha, "hasta");
    if (fechaHasta < fechaDesde) {
      throw new ErrorDominio("rango_invalido", "hasta no puede ser anterior a fecha", 422);
    }

    const ubicacion = await this.prisma.ubicacion.findUnique({ where: { id: input.ubicacionId } });
    if (!ubicacion) {
      throw new ErrorDominio("ubicacion_no_encontrada", `Ubicacion ${input.ubicacionId} no existe`, 404);
    }

    const inicio = new Date(`${fechaDesde}T00:00:00.000Z`);
    const fin = new Date(`${fechaHasta}T23:59:59.999Z`);

    // Unica fuente de ingreso real (RN-04/HU-REP-01 CA1): SOLO pedidos
    // cobrados de ESTA ubicacion (C-TENANT). Un pedido reembolsado pasa a
    // estado "cancelado" (VentasService.reembolsarPedido) y por lo tanto
    // jamas aparece aqui: no puede inflar ni ventas ni mix ni dayparts.
    const pedidos: PedidoParaReporte[] = await this.prisma.pedido.findMany({
      where: { estado: "cobrado", ubicacionId: input.ubicacionId, cerradoEn: { gte: inicio, lte: fin } },
      include: { lineas: true, pagos: true },
    });

    const ventas = calcularVentasDesglose(
      pedidos.map((p) => ({
        subtotal: p.subtotal,
        descuentoTotal: p.descuentoTotal,
        impuestoTotal: p.impuestoTotal,
        propinaTotal: p.propinaTotal,
        total: p.total,
        pagos: p.pagos.map((pg) => ({ metodo: pg.metodo, monto: pg.monto, propina: pg.propina, estado: pg.estado })),
      })),
    );

    const ordenarMixPor: OrdenMix = input.ordenarMixPor === "unidades" ? "unidades" : "monto";
    const mix = calcularMixProductos(
      pedidos.flatMap((p) =>
        p.lineas.map((l) => ({
          productoId: l.productoId,
          descripcion: l.descripcion,
          cantidad: l.cantidad,
          subtotalLinea: l.subtotalLinea,
        })),
      ),
      ordenarMixPor,
    );
    const costoPorProducto = await this.intentarCostearMix(pedidos);

    const definicionesDaypart = obtenerDefinicionesDaypart();
    const dayparts = this.agruparPorDaypart(pedidos, ubicacion.zonaHoraria, definicionesDaypart);

    // Arqueo: turnos que tocan el rango (abiertos o cerrados dentro de el).
    const turnos = await this.prisma.turno.findMany({
      where: {
        ubicacionId: input.ubicacionId,
        OR: [{ abiertoEn: { gte: inicio, lte: fin } }, { cerradoEn: { gte: inicio, lte: fin } }],
      },
      orderBy: { abiertoEn: "asc" },
    });
    const arqueoTurnos = await Promise.all(
      turnos.map(async (turno) => {
        // Reuso deliberado (no duplicar la formula, ver reportes/arqueo-calculo.ts).
        const arqueo = await this.ventas.calcularArqueo(turno.id);
        return {
          ...arqueo,
          efectivoContado: turno.efectivoContado?.toString() ?? null,
          diferencia: turno.diferencia?.toString() ?? null,
        };
      }),
    );

    return {
      ubicacionId: input.ubicacionId,
      fecha: fechaDesde,
      hasta: fechaHasta,
      ventas: serializarVentas(ventas),
      mixProductos: {
        ordenarPor: ordenarMixPor,
        items: mix.map((m) => {
          const costo = costoPorProducto.get(m.productoId);
          return {
            productoId: m.productoId,
            descripcion: m.descripcion,
            unidades: m.unidades,
            monto: m.monto.toString(),
            // Opcional (ver comentario de clase): ausente si CosteoService no
            // pudo costear alguna linea de este producto en el periodo.
            ...(costo
              ? { costoEstimado: costo.toString(), margenEstimado: m.monto.minus(costo).toString() }
              : {}),
          };
        }),
      },
      dayparts: {
        definiciones: definicionesDaypart,
        items: dayparts,
      },
      arqueo: {
        turnos: arqueoTurnos,
      },
    };
  }

  /**
   * Best-effort: suma `costoTotalLinea` (CosteoService) por productoId, sobre
   * TODAS las lineas del periodo. Nunca lanza — cualquier error de costeo
   * (por linea o global) se loguea y esa linea/producto queda sin costo (el
   * item de mix simplemente no lleva `costoEstimado`/`margenEstimado`).
   */
  private async intentarCostearMix(pedidos: PedidoParaReporte[]): Promise<Map<string, Decimal>> {
    const costoPorProducto = new Map<string, Decimal>();
    const productosConError = new Set<string>();

    const todasLasLineas = pedidos.flatMap((p) => p.lineas);
    const resultados = await Promise.allSettled(
      todasLasLineas.map((l) => this.costeo.calcularCostoLineaPersistida(l.id)),
    );

    resultados.forEach((resultado, idx) => {
      const linea = todasLasLineas[idx];
      if (resultado.status === "rejected") {
        productosConError.add(linea.productoId);
        this.logger.warn(
          `Costeo omitido para linea ${linea.id} (producto ${linea.productoId}) en mixProductos: ${String(resultado.reason)}`,
        );
        return;
      }
      const actual = costoPorProducto.get(linea.productoId) ?? new Decimal(0);
      costoPorProducto.set(linea.productoId, actual.plus(resultado.value.costoTotalLinea));
    });

    // Si UNA linea de un producto no pudo costearse, no se reporta un margen
    // parcial/enganoso para ese producto: se omite el producto completo.
    for (const productoId of productosConError) {
      costoPorProducto.delete(productoId);
    }

    return costoPorProducto;
  }

  private agruparPorDaypart(pedidos: PedidoParaReporte[], zonaHoraria: string, definiciones: DefinicionDaypart[]) {
    const acumulado = new Map<
      string,
      { nombre: string; numeroPedidos: number; subtotal: Decimal; impuestoTotal: Decimal; total: Decimal }
    >();
    for (const definicion of definiciones) {
      acumulado.set(definicion.nombre, {
        nombre: definicion.nombre,
        numeroPedidos: 0,
        subtotal: new Decimal(0),
        impuestoTotal: new Decimal(0),
        total: new Decimal(0),
      });
    }

    for (const pedido of pedidos) {
      if (!pedido.cerradoEn) continue; // no deberia pasar para estado="cobrado", pero defensivo
      const nombre = bucketDaypart(pedido.cerradoEn, zonaHoraria, definiciones);
      const actual = acumulado.get(nombre) ?? {
        nombre,
        numeroPedidos: 0,
        subtotal: new Decimal(0),
        impuestoTotal: new Decimal(0),
        total: new Decimal(0),
      };
      actual.numeroPedidos += 1;
      actual.subtotal = actual.subtotal.plus(pedido.subtotal);
      actual.impuestoTotal = actual.impuestoTotal.plus(pedido.impuestoTotal);
      actual.total = actual.total.plus(pedido.total);
      acumulado.set(nombre, actual);
    }

    // Se conserva el orden cronologico de `definiciones`, no el de aparicion.
    return definiciones.map((definicion) => {
      const item = acumulado.get(definicion.nombre)!;
      return {
        nombre: item.nombre,
        numeroPedidos: item.numeroPedidos,
        subtotal: item.subtotal.toString(),
        impuestoTotal: item.impuestoTotal.toString(),
        total: item.total.toString(),
      };
    });
  }
}

function validarFormatoFecha(valor: string, campo: string): string {
  if (!FORMATO_FECHA.test(valor)) {
    throw new ErrorDominio("fecha_invalida", `${campo} debe tener formato YYYY-MM-DD`, 422);
  }
  return valor;
}

/** Serializa Decimal -> string (C-DINERO: el JSON de la API nunca lleva float, ver README.md). */
function serializarVentas(v: VentasDesglose) {
  return {
    numeroPedidos: v.numeroPedidos,
    subtotal: v.subtotal.toString(),
    descuentoTotal: v.descuentoTotal.toString(),
    impuestoTotal: v.impuestoTotal.toString(),
    propinaTotal: v.propinaTotal.toString(),
    total: v.total.toString(),
    porMetodoPago: {
      efectivo: v.porMetodoPago.efectivo.toString(),
      tarjeta: v.porMetodoPago.tarjeta.toString(),
      otro: v.porMetodoPago.otro.toString(),
    },
    propinaPorMetodoPago: {
      efectivo: v.propinaPorMetodoPago.efectivo.toString(),
      tarjeta: v.propinaPorMetodoPago.tarjeta.toString(),
      otro: v.propinaPorMetodoPago.otro.toString(),
    },
  };
}
