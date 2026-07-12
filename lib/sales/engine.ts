/**
 * Motor de ventas — DUENO: backend-ventas-pos.
 *
 * Implementacion del contrato de STUB colocado por el orquestador. Mantiene
 * TODAS las firmas exportadas originales (pagos-pos importa saldoPendiente,
 * registrarPagoEnPedido, obtenerPedido; frontend/kds consumen via HTTP los
 * route handlers que envuelven estas funciones).
 *
 * Responsabilidad exclusiva de este modulo (C-9.2): calcular subtotal, descuento,
 * impuesto (ReglaDeImpuesto por ubicacion, sobre gravable tras descuento; propina
 * exenta), propina, total y SALDO PENDIENTE. Nadie mas recalcula.
 * Dinero en centavos enteros (C-DINERO). Redondeo con Math.round.
 *
 * Formulas (fuente de verdad de este modulo):
 *  - subtotal          = suma(subtotalLinea)
 *  - subtotalGravable  = suma(subtotalLinea de lineas con gravable=true)
 *  - descuentoTotal    = snapshot fijado por aplicarDescuento (monto o % del
 *                        subtotal al momento de aplicarlo), acotado a [0, subtotal]
 *  - baseGravable      = subtotalGravable - (descuentoTotal * subtotalGravable/subtotal)
 *                        (el descuento se prorratea entre lineas gravables y
 *                        exentas segun su peso en el subtotal)
 *  - impuestoTotal     = round(baseGravable * tasa de la ReglaDeImpuesto vigente
 *                        de la ubicacion del pedido). La propina NO genera impuesto.
 *  - propinaTotal      = suma(propina de Pagos con estado "aprobado" del pedido)
 *  - total             = subtotal - descuentoTotal + impuestoTotal + propinaTotal
 *  - saldoPendiente    = (subtotal - descuentoTotal + impuestoTotal)
 *                        - suma(monto de Pagos con estado "aprobado")
 *                        (la propina se paga aparte, no reduce el saldo de mercancia;
 *                        los pagos "encolado" -modo offline demo- NO cuentan como
 *                        aprobados hasta que se "drenen")
 */

import {
  ahora,
  getDb,
  registrarEvento,
  turnoAbierto,
  uid,
  UBICACION_PILOTO_ID,
} from "../db/store";
import type {
  CanalPedido,
  EstadoCocina,
  EstadoPedido,
  LineaDePedido,
  LineaModificador,
  Pago,
  Pedido,
} from "../domain/types";
import { descontarStockPorVenta, revertirStockPorVenta } from "../inventory/inventario";
import { ErrorDominio } from "./errores";
import { getModoOffline } from "./offlineState";

export interface NuevoPedidoInput {
  nombreCliente?: string;
  canal?: CanalPedido;
  ubicacionId?: string;
}

export interface NuevaLineaInput {
  productoId: string;
  cantidad: number;
  modificadorIds?: string[];
  notas?: string;
}

export interface CambioLinea {
  cantidad?: number;
  eliminar?: boolean;
}

export interface DescuentoInput {
  tipo: "monto" | "porcentaje";
  valor: number; // centavos si monto; entero 0-100 si porcentaje
  motivo: string;
  usuarioId: string;
}

export interface AnularPedidoInput {
  usuarioId?: string;
  motivo?: string;
}

// ---------- Constantes internas ----------

/** Estados finales: ya no admiten lineas, descuentos ni cambios. */
const ESTADOS_PEDIDO_CERRADOS: EstadoPedido[] = ["cobrado", "cancelado"];

/** Ciclo de estado de cocina por linea: recibido -> preparando -> listo (idempotente en "listo"). */
const SIGUIENTE_ESTADO_COCINA: Record<EstadoCocina, EstadoCocina> = {
  recibido: "preparando",
  preparando: "listo",
  listo: "listo",
};

// ---------- Helpers internos ----------

function obtenerPedidoOrThrow(pedidoId: string): Pedido {
  const pedido = obtenerPedido(pedidoId);
  if (!pedido) {
    throw new ErrorDominio("pedido_no_encontrado", `Pedido ${pedidoId} no existe`, 404);
  }
  return pedido;
}

function asegurarPedidoEditable(pedido: Pedido): void {
  if (ESTADOS_PEDIDO_CERRADOS.includes(pedido.estado)) {
    throw new ErrorDominio(
      "pedido_cerrado",
      `El pedido ${pedido.id} esta en estado "${pedido.estado}" y no admite esta operacion`,
      409
    );
  }
}

/** Tasa decimal (ej 0.07) de la ReglaDeImpuesto vigente para la ubicacion, o 0 si no hay regla. */
function obtenerTasaImpuesto(ubicacionId: string): number {
  const hoy = ahora().slice(0, 10); // "YYYY-MM-DD"
  const reglas = getDb().reglasImpuesto.filter(
    (r) =>
      r.ubicacionId === ubicacionId &&
      r.vigenteDesde <= hoy &&
      (r.vigenteHasta === null || r.vigenteHasta >= hoy)
  );
  return reglas.length > 0 ? reglas[0].tasa : 0;
}

// ---------- API publica ----------

export function obtenerPedido(pedidoId: string): Pedido | undefined {
  return getDb().pedidos.find((p) => p.id === pedidoId);
}

export function crearPedido(input: NuevoPedidoInput = {}): Pedido {
  const ubicacionId = input.ubicacionId ?? UBICACION_PILOTO_ID;
  const turno = turnoAbierto(ubicacionId);
  if (!turno) {
    throw new ErrorDominio(
      "turno_no_abierto",
      `No hay un turno abierto para la ubicacion ${ubicacionId}`,
      409
    );
  }

  turno.ultimoNumeroOrden += 1;

  const pedido: Pedido = {
    id: uid(),
    ubicacionId,
    turnoId: turno.id,
    numeroOrden: turno.ultimoNumeroOrden,
    nombreCliente: input.nombreCliente ?? "",
    canal: input.canal ?? "mostrador",
    estado: "abierto",
    subtotal: 0,
    descuentoTotal: 0,
    impuestoTotal: 0,
    propinaTotal: 0,
    total: 0,
    lineas: [],
    creadoEn: ahora(),
    cerradoEn: null,
  };

  getDb().pedidos.push(pedido);
  return pedido;
}

export function agregarLinea(pedidoId: string, input: NuevaLineaInput): Pedido {
  const pedido = obtenerPedidoOrThrow(pedidoId);
  asegurarPedidoEditable(pedido);

  if (!Number.isInteger(input.cantidad) || input.cantidad <= 0) {
    throw new ErrorDominio("cantidad_invalida", "La cantidad debe ser un entero positivo", 422);
  }

  const producto = getDb().productos.find((p) => p.id === input.productoId);
  if (!producto) {
    throw new ErrorDominio(
      "producto_no_encontrado",
      `Producto ${input.productoId} no existe`,
      404
    );
  }
  if (producto.disponible86 === false) {
    throw new ErrorDominio(
      "producto_86",
      `El producto "${producto.nombre}" esta marcado 86 (agotado)`,
      422
    );
  }

  const lineaId = uid();
  let deltaTotal = 0;
  const modificadores: LineaModificador[] = (input.modificadorIds ?? []).map((modificadorId) => {
    const modificador = getDb().modificadores.find((m) => m.id === modificadorId);
    if (!modificador) {
      throw new ErrorDominio(
        "modificador_no_encontrado",
        `Modificador ${modificadorId} no existe`,
        404
      );
    }
    if (modificador.disponible86 === false) {
      throw new ErrorDominio(
        "modificador_86",
        `El modificador "${modificador.nombre}" esta marcado 86 (agotado)`,
        422
      );
    }
    deltaTotal += modificador.precioDelta;
    return {
      id: uid(),
      lineaDePedidoId: lineaId,
      modificadorId: modificador.id,
      descripcion: modificador.nombre,
      precioDelta: modificador.precioDelta,
      tipo: modificador.tipo,
    };
  });

  const precioUnitario = producto.precioBase + deltaTotal; // C-SNAPSHOT
  const cantidad = input.cantidad;

  const linea: LineaDePedido = {
    id: lineaId,
    pedidoId: pedido.id,
    productoId: producto.id,
    descripcion: producto.nombre, // C-SNAPSHOT
    cantidad,
    precioUnitario,
    subtotalLinea: precioUnitario * cantidad,
    gravable: producto.gravable, // C-SNAPSHOT
    notas: input.notas ?? "",
    estadoCocina: "recibido",
    modificadores,
  };

  pedido.lineas.push(linea);
  recalcularTotales(pedido);
  return pedido;
}

export function actualizarLinea(
  pedidoId: string,
  lineaId: string,
  cambios: CambioLinea
): Pedido {
  const pedido = obtenerPedidoOrThrow(pedidoId);
  asegurarPedidoEditable(pedido);

  const idx = pedido.lineas.findIndex((l) => l.id === lineaId);
  if (idx === -1) {
    throw new ErrorDominio(
      "linea_no_encontrada",
      `Linea ${lineaId} no existe en el pedido ${pedidoId}`,
      404
    );
  }

  if (cambios.eliminar) {
    pedido.lineas.splice(idx, 1);
  } else if (cambios.cantidad !== undefined) {
    if (!Number.isInteger(cambios.cantidad) || cambios.cantidad <= 0) {
      throw new ErrorDominio("cantidad_invalida", "La cantidad debe ser un entero positivo", 422);
    }
    const linea = pedido.lineas[idx];
    linea.cantidad = cambios.cantidad;
    linea.subtotalLinea = linea.precioUnitario * linea.cantidad;
  }

  recalcularTotales(pedido);
  return pedido;
}

/** Recalcula subtotal, descuento, impuesto, propina y total; persiste en el Pedido. */
export function recalcularTotales(pedido: Pedido): void {
  const subtotal = pedido.lineas.reduce((acc, l) => acc + l.subtotalLinea, 0);
  const subtotalGravable = pedido.lineas
    .filter((l) => l.gravable)
    .reduce((acc, l) => acc + l.subtotalLinea, 0);

  // El descuento es un snapshot en centavos (fijado por aplicarDescuento); se
  // acota aqui a [0, subtotal] por si el subtotal bajo tras editar lineas.
  const descuentoTotal = Math.min(Math.max(pedido.descuentoTotal || 0, 0), subtotal);

  const proporcionGravable = subtotal > 0 ? subtotalGravable / subtotal : 0;
  const descuentoSobreGravable = Math.round(descuentoTotal * proporcionGravable);
  const baseGravable = Math.max(subtotalGravable - descuentoSobreGravable, 0);

  const tasa = obtenerTasaImpuesto(pedido.ubicacionId);
  const impuestoTotal = Math.round(baseGravable * tasa);

  const propinaTotal = getDb()
    .pagos.filter((p) => p.pedidoId === pedido.id && p.estado === "aprobado")
    .reduce((acc, p) => acc + p.propina, 0);

  const total = subtotal - descuentoTotal + impuestoTotal + propinaTotal;

  pedido.subtotal = subtotal;
  pedido.descuentoTotal = descuentoTotal;
  pedido.impuestoTotal = impuestoTotal;
  pedido.propinaTotal = propinaTotal;
  pedido.total = total;
}

export function aplicarDescuento(pedidoId: string, input: DescuentoInput): Pedido {
  const pedido = obtenerPedidoOrThrow(pedidoId);
  asegurarPedidoEditable(pedido);

  if (input.tipo === "monto") {
    if (!Number.isInteger(input.valor) || input.valor < 0) {
      throw new ErrorDominio(
        "descuento_invalido",
        "El monto del descuento debe ser un entero de centavos >= 0",
        422
      );
    }
    pedido.descuentoTotal = input.valor;
  } else if (input.tipo === "porcentaje") {
    if (!Number.isInteger(input.valor) || input.valor < 0 || input.valor > 100) {
      throw new ErrorDominio(
        "descuento_invalido",
        "El porcentaje de descuento debe ser un entero entre 0 y 100",
        422
      );
    }
    pedido.descuentoTotal = Math.round((pedido.subtotal * input.valor) / 100);
  } else {
    throw new ErrorDominio("descuento_invalido", "tipo debe ser \"monto\" o \"porcentaje\"", 422);
  }

  recalcularTotales(pedido);

  registrarEvento({
    ubicacionId: pedido.ubicacionId,
    usuarioId: input.usuarioId,
    tipo: "descuentoAplicado",
    agregadoTipo: "Pedido",
    agregadoId: pedido.id,
    motivo: input.motivo,
    payload: { tipo: input.tipo, valor: input.valor, descuentoTotalResultante: pedido.descuentoTotal },
  });

  return pedido;
}

export function enviarACocina(pedidoId: string): Pedido {
  const pedido = obtenerPedidoOrThrow(pedidoId);

  if (pedido.lineas.length === 0) {
    throw new ErrorDominio("pedido_vacio", "El pedido no tiene lineas para enviar a cocina", 422);
  }
  if (pedido.estado !== "abierto") {
    throw new ErrorDominio(
      "estado_invalido",
      `El pedido ${pedidoId} esta en estado "${pedido.estado}"; solo se puede enviar a cocina desde "abierto"`,
      409
    );
  }

  pedido.estado = "enviadoCocina";
  for (const linea of pedido.lineas) {
    linea.estadoCocina = "recibido";
  }

  // NOTA (supuesto documentado): TipoEventoAuditoria (lib/domain/types.ts, fuera
  // del scope editable de este modulo) no define un tipo de evento equivalente a
  // "TicketEnviadoACocina"; por eso no se llama registrarEvento aqui para no
  // introducir un valor de enum no contemplado en el contrato de tipos.

  return pedido;
}

export function avanzarEstadoCocina(pedidoId: string, lineaId?: string): Pedido {
  const pedido = obtenerPedidoOrThrow(pedidoId);

  if (lineaId) {
    const linea = pedido.lineas.find((l) => l.id === lineaId);
    if (!linea) {
      throw new ErrorDominio(
        "linea_no_encontrada",
        `Linea ${lineaId} no existe en el pedido ${pedidoId}`,
        404
      );
    }
    linea.estadoCocina = SIGUIENTE_ESTADO_COCINA[linea.estadoCocina];
  } else {
    for (const linea of pedido.lineas) {
      linea.estadoCocina = SIGUIENTE_ESTADO_COCINA[linea.estadoCocina];
    }
  }

  if (pedido.lineas.length > 0 && pedido.lineas.every((l) => l.estadoCocina === "listo")) {
    pedido.estado = "listo";
  } else if (pedido.lineas.some((l) => l.estadoCocina === "preparando")) {
    pedido.estado = "enPreparacion";
  }

  return pedido;
}

/** Saldo pendiente en centavos = (subtotal - descuento + impuesto) - pagos aprobados. */
export function saldoPendiente(pedidoId: string): number {
  const pedido = obtenerPedidoOrThrow(pedidoId);
  const montoAprobado = getDb()
    .pagos.filter((p) => p.pedidoId === pedidoId && p.estado === "aprobado")
    .reduce((acc, p) => acc + p.monto, 0);
  const baseSinPropina = pedido.subtotal - pedido.descuentoTotal + pedido.impuestoTotal;
  return baseSinPropina - montoAprobado;
}

export function registrarPagoEnPedido(pedidoId: string, pago: Pago): Pedido {
  const pedido = obtenerPedidoOrThrow(pedidoId);

  if (pedido.estado === "cancelado") {
    throw new ErrorDominio("pedido_cancelado", `El pedido ${pedidoId} esta cancelado`, 409);
  }
  if (pedido.estado === "cobrado") {
    throw new ErrorDominio("pedido_ya_cobrado", `El pedido ${pedidoId} ya fue cobrado`, 409);
  }

  // DEMO cola offline: si el modo offline esta activo, un pago con tarjeta
  // nunca queda "aprobado" aqui (se fuerza a "encolado" -store-and-forward-)
  // sin importar lo que haya resuelto el PSP mock de pagos-pos.
  if (pago.metodo === "tarjeta" && getModoOffline() && pago.estado === "aprobado") {
    pago.estado = "encolado";
  }

  getDb().pagos.push(pago);
  recalcularTotales(pedido);

  if (pago.estado === "aprobado" && saldoPendiente(pedidoId) <= 0) {
    pedido.estado = "cobrado";
    pedido.cerradoEn = ahora();

    descontarStockPorVenta(pedido); // VentaConfirmada

    registrarEvento({
      ubicacionId: pedido.ubicacionId,
      usuarioId: null,
      tipo: "ventaConfirmada",
      agregadoTipo: "Pedido",
      agregadoId: pedido.id,
      motivo: "Pago aprobado que salda el pedido",
      payload: { total: pedido.total, pagoId: pago.id },
    });
    registrarEvento({
      ubicacionId: pedido.ubicacionId,
      usuarioId: null,
      tipo: "pagoRegistrado",
      agregadoTipo: "Pago",
      agregadoId: pago.id,
      motivo: "Pago registrado",
      payload: { metodo: pago.metodo, monto: pago.monto, propina: pago.propina },
    });
  }

  return pedido;
}

export function reembolsar(
  pedidoId: string,
  input: { usuarioId: string; motivo: string }
): Pedido {
  const pedido = obtenerPedidoOrThrow(pedidoId);

  if (pedido.estado !== "cobrado") {
    throw new ErrorDominio(
      "pedido_no_cobrado",
      `Solo se pueden reembolsar pedidos cobrados (estado actual: "${pedido.estado}")`,
      409
    );
  }

  const pagosAprobados = getDb().pagos.filter(
    (p) => p.pedidoId === pedidoId && p.estado === "aprobado"
  );
  const montoOriginal = pagosAprobados.reduce((acc, p) => acc + p.monto, 0);
  const propinaOriginal = pagosAprobados.reduce((acc, p) => acc + p.propina, 0);
  const metodo = pagosAprobados.length === 1 ? pagosAprobados[0].metodo : "otro";

  const pagoReembolso: Pago = {
    id: uid(),
    pedidoId: pedido.id,
    turnoId: pedido.turnoId,
    metodo,
    monto: -montoOriginal,
    propina: -propinaOriginal,
    estado: "reembolsado",
    pspTokenId: null,
    pspReferencia: null,
    ultimos4: null,
    marca: null,
    montoRecibido: null,
    cambio: null,
    creadoEn: ahora(),
  };
  getDb().pagos.push(pagoReembolso);

  pedido.estado = "cancelado";
  pedido.cerradoEn = ahora();

  revertirStockPorVenta(pedido); // VentaRevertida

  registrarEvento({
    ubicacionId: pedido.ubicacionId,
    usuarioId: input.usuarioId,
    tipo: "reembolso",
    agregadoTipo: "Pedido",
    agregadoId: pedido.id,
    motivo: input.motivo,
    payload: {
      montoReembolsado: montoOriginal,
      propinaReembolsada: propinaOriginal,
      pagoReembolsoId: pagoReembolso.id,
    },
  });

  recalcularTotales(pedido);
  return pedido;
}

/**
 * Anula (cancela) un pedido que aun no ha sido cobrado. Complementa a
 * `reembolsar` (que exige estado "cobrado"): esta funcion cubre la anulacion
 * previa al cobro (mostrador/kiosco) con trazabilidad (evento "cancelacion").
 * Usada por el route handler DELETE /api/v1/pedidos/[id].
 */
export function anularPedido(pedidoId: string, input: AnularPedidoInput = {}): Pedido {
  const pedido = obtenerPedidoOrThrow(pedidoId);

  if (pedido.estado === "cobrado") {
    throw new ErrorDominio(
      "pedido_cobrado",
      "Un pedido cobrado no se puede anular; use el endpoint de reembolso",
      409
    );
  }
  if (pedido.estado === "cancelado") {
    throw new ErrorDominio("pedido_ya_cancelado", `El pedido ${pedidoId} ya esta cancelado`, 409);
  }

  pedido.estado = "cancelado";
  pedido.cerradoEn = ahora();

  registrarEvento({
    ubicacionId: pedido.ubicacionId,
    usuarioId: input.usuarioId ?? null,
    tipo: "cancelacion",
    agregadoTipo: "Pedido",
    agregadoId: pedido.id,
    motivo: input.motivo ?? "Anulacion de pedido",
    payload: { numeroOrden: pedido.numeroOrden },
  });

  return pedido;
}
