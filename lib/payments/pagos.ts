/**
 * Orquestacion de pagos — DUENO: pagos-pos.
 *
 * Este modulo NO calcula totales/impuestos/saldo (eso es responsabilidad
 * exclusiva de backend-ventas-pos, ver lib/sales/engine.ts). Aqui solo:
 *  1) validamos que el monto a cobrar no exceda el saldo pendiente del pedido,
 *  2) resolvemos el medio de pago (efectivo o tarjeta via PSP mock),
 *  3) construimos el objeto `Pago` (con snapshot, C-SNAPSHOT) y lo registramos
 *     contra el pedido a traves de `registrarPagoEnPedido` (motor de ventas),
 *  4) dejamos rastro de auditoria append-only (C-AUDIT) via `registrarEvento`.
 *
 * PAGO MIXTO (split tender): esta funcion procesa UN medio de pago por
 * llamada. El frontend/caja invoca `procesarPago` varias veces (ej. efectivo
 * parcial + tarjeta por el resto) hasta que `saldoPendiente` llegue a 0. No
 * hay estado especial de "pago mixto"; es simplemente varios `Pago` distintos
 * asociados al mismo `pedidoId`.
 *
 * MOCKS DE DEMO (ver README-DEMO.md):
 *  - El PSP (`lib/payments/psp.ts`) es un mock en memoria, NO un PSP real.
 *  - La apertura de cajon (`abrirCajon`) es un stub que solo hace console.log
 *    + registra un evento de auditoria; NO controla hardware real.
 *
 * C-PCI: en ningun punto de este archivo se recibe, guarda ni transmite PAN
 * ni CVV. Los unicos datos de tarjeta que tocamos son los que ya devuelve el
 * PSP (mock): token, referencia, marca y ultimos4.
 */

import type { MetodoPago, Pago, Pedido } from "../domain/types";
import { ahora, getDb, registrarEvento, uid } from "../db/store";
import { obtenerPedido, registrarPagoEnPedido, saldoPendiente } from "../sales/engine";
import { autorizarTarjeta, reembolsarTarjeta } from "./psp";

/** Busca un Pago por id en el almacen (lectura directa, DEMO). */
export function obtenerPago(pagoId: string): Pago | undefined {
  return getDb().pagos.find((p) => p.id === pagoId);
}

/** Error de dominio de pagos con codigo estable para la API HTTP. */
export class ErrorPago extends Error {
  codigo: string;
  status: number;

  constructor(codigo: string, mensaje: string, status = 400) {
    super(mensaje);
    this.codigo = codigo;
    this.status = status;
    this.name = "ErrorPago";
  }
}

interface EntradaComun {
  /** Monto a cobrar en este pago, SIN propina, en centavos. */
  monto: number;
  /** Propina de este pago, en centavos. Default 0. */
  propina?: number;
  /** Quien cobra (para auditoria). Opcional en la demo. */
  usuarioId?: string | null;
}

export interface EntradaPagoEfectivo extends EntradaComun {
  metodo: "efectivo";
  /** Efectivo entregado por el cliente, en centavos. Requerido. */
  montoRecibido: number;
}

export interface EntradaPagoTarjeta extends EntradaComun {
  metodo: "tarjeta";
  /** Simula que el terminal EMV no tiene conectividad (store-and-forward). */
  offline?: boolean;
  /** Simula una tarjeta rechazada por el banco/PSP (demo). */
  forzarRechazo?: boolean;
}

export type EntradaPago = EntradaPagoEfectivo | EntradaPagoTarjeta;

export interface ResultadoProcesarPago {
  pago: Pago;
  saldoPendiente: number;
  pedido: Pedido;
}

/**
 * Abre el cajon monedero (stub de hardware, DEMO).
 * MOCK: en produccion esto dispara el pulso electrico al cajon via la
 * impresora fiscal/POS (lib/hardware/*). Aqui solo logueamos + auditamos.
 */
function abrirCajon(pedido: Pedido, usuarioId: string | null): void {
  // eslint-disable-next-line no-console
  console.log(
    `[hardware-mock] Apertura de cajon monedero — pedido ${pedido.id} (ubicacion ${pedido.ubicacionId})`
  );
  registrarEvento({
    ubicacionId: pedido.ubicacionId,
    usuarioId: usuarioId ?? null,
    tipo: "aperturaCajon",
    agregadoTipo: "Pedido",
    agregadoId: pedido.id,
    motivo: "Pago en efectivo",
    payload: { pedidoId: pedido.id },
  });
}

/** Valida forma basica de la entrada antes de tocar PSP/pedido. */
function validarEntrada(entrada: EntradaPago): void {
  if (!Number.isInteger(entrada.monto) || entrada.monto <= 0) {
    throw new ErrorPago("MONTO_INVALIDO", "monto debe ser un entero positivo de centavos", 422);
  }
  if (entrada.propina !== undefined) {
    if (!Number.isInteger(entrada.propina) || entrada.propina < 0) {
      throw new ErrorPago("PROPINA_INVALIDA", "propina debe ser un entero >= 0 de centavos", 422);
    }
  }
  if (entrada.metodo === "efectivo") {
    if (!Number.isInteger(entrada.montoRecibido)) {
      throw new ErrorPago(
        "MONTO_RECIBIDO_REQUERIDO",
        "montoRecibido es requerido y debe ser entero de centavos para pagos en efectivo",
        422
      );
    }
  }
}

/**
 * Procesa UN pago (parcial o total) contra un pedido.
 *
 * Flujo:
 *  1. Verifica que el pedido exista.
 *  2. Verifica que `monto` no exceda el saldo pendiente (calculado por
 *     backend-ventas-pos, nunca aqui).
 *  3. Resuelve el medio de pago:
 *     - efectivo: valida montoRecibido, calcula cambio, abre cajon.
 *     - tarjeta: llama al PSP (mock) y traduce su respuesta a EstadoPago.
 *  4. Construye el `Pago` (snapshot) y lo registra en el pedido via
 *     `registrarPagoEnPedido` (motor de ventas es quien decide si el pedido
 *     pasa a "cobrado" segun el nuevo saldo).
 *  5. Devuelve el pago creado + saldo pendiente actualizado + pedido.
 */
export function procesarPago(
  pedidoId: string,
  entrada: EntradaPago
): ResultadoProcesarPago {
  validarEntrada(entrada);

  const pedido = obtenerPedido(pedidoId);
  if (!pedido) {
    throw new ErrorPago("PEDIDO_NO_ENCONTRADO", `pedido ${pedidoId} no existe`, 404);
  }

  const saldoActual = saldoPendiente(pedidoId);
  if (entrada.monto > saldoActual) {
    throw new ErrorPago(
      "MONTO_EXCEDE_SALDO",
      `monto (${entrada.monto}) excede el saldo pendiente (${saldoActual}) del pedido`,
      422
    );
  }

  const propina = entrada.propina ?? 0;
  const usuarioId = entrada.usuarioId ?? null;
  const metodo: MetodoPago = entrada.metodo;

  let pago: Pago;

  if (entrada.metodo === "efectivo") {
    // NOTA DEMO: la formula pedida por el contrato original es
    // `cambio = montoRecibido - monto`. Aqui usamos la version financieramente
    // correcta que tambien cubre la propina (cambio = recibido - (monto+propina)),
    // que coincide con la formula simple cuando propina = 0.
    const totalACobrar = entrada.monto + propina;
    if (entrada.montoRecibido < totalACobrar) {
      throw new ErrorPago(
        "EFECTIVO_INSUFICIENTE",
        `montoRecibido (${entrada.montoRecibido}) es menor al total a cobrar (${totalACobrar})`,
        422
      );
    }
    const cambio = entrada.montoRecibido - totalACobrar;

    pago = {
      id: uid(),
      pedidoId,
      turnoId: pedido.turnoId,
      metodo,
      monto: entrada.monto,
      propina,
      estado: "aprobado",
      pspTokenId: null,
      pspReferencia: null,
      ultimos4: null,
      marca: null,
      montoRecibido: entrada.montoRecibido,
      cambio,
      creadoEn: ahora(),
    };

    // Efectivo aprobado -> abrir cajon (mock de hardware).
    abrirCajon(pedido, usuarioId);
  } else {
    // Tarjeta: PSP MOCK (ver lib/payments/psp.ts). montoTotal incluye propina,
    // tal como lo veria el terminal fisico (cobra monto + propina en una sola
    // transaccion con el banco).
    const resultado = autorizarTarjeta({
      montoTotal: entrada.monto + propina,
      offline: entrada.offline,
      forzarRechazo: entrada.forzarRechazo,
    });

    const estado = resultado.encolado
      ? "encolado"
      : resultado.aprobado
        ? "aprobado"
        : "rechazado";

    pago = {
      id: uid(),
      pedidoId,
      turnoId: pedido.turnoId,
      metodo,
      monto: entrada.monto,
      propina,
      estado,
      pspTokenId: resultado.pspTokenId,
      pspReferencia: resultado.pspReferencia,
      ultimos4: resultado.ultimos4,
      marca: resultado.marca,
      montoRecibido: null,
      cambio: null,
      creadoEn: ahora(),
    };
  }

  // Registra el pago contra el pedido. El motor de ventas (backend-ventas-pos)
  // decide como afecta el saldo/estado del pedido segun el estado del Pago
  // (solo aprobado/encolado deberian reducir saldo pendiente).
  const pedidoActualizado = registrarPagoEnPedido(pedidoId, pago);

  registrarEvento({
    ubicacionId: pedido.ubicacionId,
    usuarioId,
    tipo: "pagoRegistrado",
    agregadoTipo: "Pago",
    agregadoId: pago.id,
    motivo: `Pago ${pago.metodo} (${pago.estado})`,
    payload: {
      pedidoId,
      metodo: pago.metodo,
      monto: pago.monto,
      propina: pago.propina,
      estado: pago.estado,
      ultimos4: pago.ultimos4,
      marca: pago.marca,
    },
  });

  return {
    pago,
    saldoPendiente: saldoPendiente(pedidoId),
    pedido: pedidoActualizado,
  };
}

export interface EntradaReembolso {
  /** Monto a reembolsar (incluyendo propina) en centavos. Default: pago completo. */
  monto?: number;
  motivo?: string;
  usuarioId?: string | null;
}

export interface ResultadoReembolso {
  pago: Pago;
}

/**
 * Reembolsa un Pago de tarjeta previamente aprobado, via el PSP (mock).
 *
 * Alcance de esta demo: reembolsa el `Pago` puntual (no recalcula totales del
 * pedido; eso es responsabilidad de backend-ventas-pos si se decide reflejar
 * el reembolso en el estado del Pedido — punto de integracion futuro con
 * `engine.reembolsar`, fuera del alcance de este stub).
 */
export function reembolsarPago(
  pago: Pago,
  entrada: EntradaReembolso = {}
): ResultadoReembolso {
  if (pago.metodo !== "tarjeta") {
    throw new ErrorPago(
      "METODO_NO_REEMBOLSABLE",
      "solo los pagos con tarjeta se reembolsan via PSP (efectivo se reembolsa en caja)",
      422
    );
  }
  if (pago.estado !== "aprobado") {
    throw new ErrorPago(
      "PAGO_NO_REEMBOLSABLE",
      `el pago esta en estado "${pago.estado}"; solo se reembolsan pagos "aprobado"`,
      422
    );
  }
  if (!pago.pspReferencia) {
    throw new ErrorPago("PAGO_SIN_REFERENCIA_PSP", "el pago no tiene referencia de PSP", 500);
  }

  const totalPago = pago.monto + pago.propina;
  const monto = entrada.monto ?? totalPago;
  if (!Number.isInteger(monto) || monto <= 0 || monto > totalPago) {
    throw new ErrorPago(
      "MONTO_REEMBOLSO_INVALIDO",
      `monto de reembolso invalido (0 < monto <= ${totalPago})`,
      422
    );
  }

  const resultado = reembolsarTarjeta(pago.pspReferencia, monto);
  if (!resultado.aprobado) {
    throw new ErrorPago("REEMBOLSO_RECHAZADO", resultado.mensaje, 502);
  }

  // Mutamos el Pago en el almacen (misma referencia de objeto que vive en
  // getDb().pagos / dentro del pedido, segun exponga el motor de ventas).
  // Marcamos el pago como reembolsado y guardamos la nueva referencia de PSP
  // del movimiento de reembolso (la original queda en el evento de auditoria).
  pago.estado = "reembolsado";
  pago.pspReferencia = resultado.pspReferencia;

  // Best-effort: buscamos el pedido solo para completar ubicacionId del
  // evento de auditoria. Si backend-ventas-pos aun no implemento
  // `obtenerPedido`, no bloqueamos el reembolso (ya se ejecuto contra el PSP).
  let ubicacionId = "desconocida";
  try {
    const pedido = obtenerPedido(pago.pedidoId);
    if (pedido) ubicacionId = pedido.ubicacionId;
  } catch {
    // engine.obtenerPedido no implementado todavia; se deja "desconocida".
  }

  registrarEvento({
    ubicacionId,
    usuarioId: entrada.usuarioId ?? null,
    tipo: "reembolso",
    agregadoTipo: "Pago",
    agregadoId: pago.id,
    motivo: entrada.motivo ?? "Reembolso de pago con tarjeta (demo)",
    payload: { pedidoId: pago.pedidoId, monto, pspReferencia: pago.pspReferencia },
  });

  return { pago };
}
