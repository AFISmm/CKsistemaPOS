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
 *  - empaqueTotal      = cargo plano fijado por `marcarParaLlevar` (0 si el pedido
 *                        no es "para llevar"; ver Pedido.empaqueTotal en types.ts).
 *                        NO gravable en este MVP (simplificacion de demo documentada
 *                        en el tipo).
 *  - total             = subtotal - descuentoTotal + impuestoTotal + propinaTotal + empaqueTotal
 *  - saldoPendiente    = (subtotal - descuentoTotal + impuestoTotal)
 *                        - suma(monto de Pagos con estado "aprobado")
 *                        (la propina se paga aparte, no reduce el saldo de mercancia;
 *                        los pagos "encolado" -modo offline demo- NO cuentan como
 *                        aprobados hasta que se "drenen"; el cargo de empaque SI
 *                        forma parte del saldo de mercancia, se cobra junto al resto)
 *
 * FLUJO COBRAR-VS-COCINA CONFIGURABLE (Fase A, revision 2026-07-22 seccion 2.1):
 * ver `ModoOperacionUbicacion` en lib/domain/types.ts. Este modulo soporta AMBOS
 * modelos con la MISMA maquina de estados de `Pedido.estado`, sin bifurcar el
 * codigo en dos motores distintos:
 *  - "mostrador" (default piloto): `registrarPagoEnPedido` puede saldar el
 *    pedido mientras sigue "abierto" (antes de cocina) — al saldarlo pasa
 *    directo a "cobrado" (estado YA terminal de dinero). Desde ahi,
 *    `enviarACocina`/`avanzarEstadoCocina`/`enviarACaja` seguiran operando
 *    para el ciclo de vida de PREPARACION en cocina, pero a proposito NO
 *    tocan `pedido.estado` (que se queda en "cobrado"): solo actualizan
 *    `enviadoACocinaEn`/`LineaDePedido.estadoCocina`/`entregadoEn`. El KDS
 *    (lib/kitchen/kds.ts, componentes/kds/OrderCard.tsx) ya deriva su UI
 *    exclusivamente del estado de cocina POR LINEA (`estadoCocinaAgregado`),
 *    nunca de `pedido.estado`, asi que esto no le rompe ningun contrato.
 *  - "mesa" (flujo clasico ya existente): `registrarPagoEnPedido` EXIGE que
 *    el pedido ya este "entregado" (ciclo completo de cocina) antes de poder
 *    cobrarlo — mismo comportamiento que la pantalla /pos (cajero) siempre
 *    tuvo. No se borra ni se reemplaza este camino.
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
  ModoOperacionUbicacion,
  Pago,
  Pedido,
} from "../domain/types";
import { descontarStockPorVenta, revertirStockPorVenta } from "../inventory/inventario";
import { ErrorDominio } from "./errores";
import { getModoOffline } from "./offlineState";

/**
 * Cargo plano de empaque ("para llevar"), en CENTAVOS (C-DINERO). Ver
 * decision de diseno completa en el doc-comment de `Pedido.empaqueTotal`
 * (lib/domain/types.ts): monto fijo simplificado de DEMO, no gravable.
 */
const CARGO_EMPAQUE_PARA_LLEVAR_CENTAVOS = 150; // $1.50

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

/**
 * Modo de operacion (mostrador/mesa) de la ubicacion del pedido. `"mostrador"`
 * por defecto si la ubicacion no existe o no tiene el campo (datos legados),
 * porque es el modelo mas simple/permisivo (cobrar en cualquier momento antes
 * de "cobrado"/"cancelado") y es el default real de la tienda piloto.
 */
function modoOperacionDePedido(pedido: Pedido): ModoOperacionUbicacion {
  const ubicacion = getDb().ubicaciones.find((u) => u.id === pedido.ubicacionId);
  return ubicacion?.modoOperacion ?? "mostrador";
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
    enviadoACocinaEn: null,
    entregadoEn: null,
    cerradoEn: null,
    paraLlevar: false,
    empaqueTotal: 0,
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

  // BLOQUEO POST-DESCUENTO (Fase A, revision 2026-07-22 seccion 2.1 "fijar
  // linea tras descuento"): una vez que el pedido tiene un descuento activo
  // (descuentoTotal > 0, fijado por `aplicarDescuento`), el cajero YA NO
  // puede cambiar cantidades ni quitar lineas sin volver a pasar por
  // autorizacion de descuento. DECISION DE DISENO: el descuento de esta demo
  // es a nivel de PEDIDO completo (no hay descuento por linea individual en
  // el contrato de tipos), asi que el bloqueo tambien es a nivel de pedido
  // completo (todas sus lineas), no de una linea puntual. Para volver a
  // editar lineas, un gerente debe llamar `aplicarDescuento` de nuevo (mismo
  // modal/autorizacion) y llevar el descuento a 0 (`tipo: "monto", valor: 0`
  // o `tipo: "porcentaje", valor: 0`), lo que limpia `descuentoTotal` y
  // desbloquea — "sin volver a pasar por autorizacion" es exactamente lo que
  // NO se permite: la UNICA forma de desbloquear es pasar de nuevo por ahi.
  // No se agrega una bandera nueva en el tipo: `descuentoTotal > 0` ya es, en
  // si mismo, la senal de "hay un descuento activo".
  if (pedido.descuentoTotal > 0) {
    throw new ErrorDominio(
      "linea_bloqueada_por_descuento",
      `El pedido ${pedidoId} tiene un descuento aplicado; las lineas quedan bloqueadas ` +
        `(no se puede cambiar cantidad ni quitar) hasta que se remueva el descuento ` +
        `(aplicarDescuento con valor 0) o se aplique uno nuevo`,
      409
    );
  }

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

  // Cargo de empaque ("para llevar"), fijado por `marcarParaLlevar`. Campo
  // OPCIONAL en el tipo (ver Pedido.empaqueTotal); `|| 0` cubre pedidos
  // legados/fixtures de otras tareas que no lo declaran.
  const empaqueTotal = Math.max(pedido.empaqueTotal || 0, 0);

  const total = subtotal - descuentoTotal + impuestoTotal + propinaTotal + empaqueTotal;

  pedido.subtotal = subtotal;
  pedido.descuentoTotal = descuentoTotal;
  pedido.impuestoTotal = impuestoTotal;
  pedido.propinaTotal = propinaTotal;
  pedido.empaqueTotal = empaqueTotal;
  pedido.total = total;
}

/**
 * Marca (o desmarca) un pedido como "para llevar" (fulfillment del cliente,
 * independiente de `canal`/origen). Al pasar de false->true agrega
 * AUTOMATICAMENTE el cargo de empaque (ver `CARGO_EMPAQUE_PARA_LLEVAR_CENTAVOS`
 * y el doc-comment de `Pedido.empaqueTotal` en types.ts), sin que el cajero
 * tenga que acordarse de agregarlo aparte (Fase A, revision 2026-07-22
 * seccion 2.6-parcial). Idempotente: si ya estaba en el valor pedido, no hace
 * nada (evita duplicar/perder el cargo si se llama dos veces seguidas).
 */
export function marcarParaLlevar(pedidoId: string, input: { paraLlevar: boolean }): Pedido {
  const pedido = obtenerPedidoOrThrow(pedidoId);
  asegurarPedidoEditable(pedido);

  const yaEstaba = pedido.paraLlevar ?? false;
  if (yaEstaba === input.paraLlevar) {
    return pedido;
  }

  pedido.paraLlevar = input.paraLlevar;
  pedido.empaqueTotal = input.paraLlevar ? CARGO_EMPAQUE_PARA_LLEVAR_CENTAVOS : 0;
  recalcularTotales(pedido);
  return pedido;
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

/**
 * Envia el pedido a cocina. Soporta AMBOS flujos (ver nota de cabecera del
 * archivo, "FLUJO COBRAR-VS-COCINA CONFIGURABLE"):
 *  - Flujo "mesa" (clasico): desde "abierto" -> pasa a "enviadoCocina".
 *  - Flujo "mostrador" (pay-first): el pedido puede llegar aqui YA "cobrado"
 *    (el cajero cobro antes de enviar, ver `registrarPagoEnPedido`). En ese
 *    caso NO se toca `pedido.estado` (sigue "cobrado", terminal de dinero):
 *    solo se fija `enviadoACocinaEn` y se inicializan las lineas en
 *    "recibido", que es lo unico que el KDS realmente consume (ver
 *    `estadoCocinaAgregado` en lib/kitchen/kds.ts, que deriva su estado de
 *    `LineaDePedido.estadoCocina`, nunca de `pedido.estado`).
 */
export function enviarACocina(pedidoId: string): Pedido {
  const pedido = obtenerPedidoOrThrow(pedidoId);

  if (pedido.lineas.length === 0) {
    throw new ErrorDominio("pedido_vacio", "El pedido no tiene lineas para enviar a cocina", 422);
  }

  const yaPagado = pedido.estado === "cobrado";

  if (yaPagado) {
    if (pedido.enviadoACocinaEn !== null) {
      throw new ErrorDominio(
        "pedido_ya_enviado_a_cocina",
        `El pedido ${pedidoId} (ya cobrado) ya fue enviado a cocina anteriormente`,
        409
      );
    }
  } else if (pedido.estado !== "abierto") {
    throw new ErrorDominio(
      "estado_invalido",
      `El pedido ${pedidoId} esta en estado "${pedido.estado}"; solo se puede enviar a cocina desde "abierto" (o "cobrado" en flujo mostrador)`,
      409
    );
  }

  if (!yaPagado) {
    pedido.estado = "enviadoCocina";
  }
  pedido.enviadoACocinaEn = ahora();
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

  // Flujo mostrador (pay-first): el pedido ya esta "cobrado" (terminal de
  // dinero); NO lo degradamos/reescribimos a "enPreparacion"/"listo" — esos
  // valores de `estado` son del flujo "mesa" clasico. El progreso real de
  // cocina para el flujo mostrador vive solo en `LineaDePedido.estadoCocina`
  // (ver `estadoCocinaAgregado`, lib/kitchen/kds.ts).
  if (pedido.estado === "cobrado") {
    return pedido;
  }

  if (pedido.lineas.length > 0 && pedido.lineas.every((l) => l.estadoCocina === "listo")) {
    pedido.estado = "listo";
  } else if (pedido.lineas.some((l) => l.estadoCocina === "preparando")) {
    pedido.estado = "enPreparacion";
  }

  return pedido;
}

/**
 * Envia el pedido de cocina (KDS) a caja: transicion "listo" -> "entregado".
 * "entregado" es un valor de EstadoPedido que ya existia en el contrato de
 * tipos pero no se usaba hasta ahora; este es exactamente su proposito: marca
 * que el pedido termino su paso por cocina y esta listo para que el cajero lo
 * cobre. A partir de aqui el pedido deja de aparecer en `?estado=cocina`
 * (ver app/api/v1/pedidos/route.ts) y pasa a ser visible en el submodulo de
 * Historial de pedidos (app/pos/historial) junto con los ya "cobrado".
 *
 * Flujo mostrador (pay-first): si el pedido ya esta "cobrado" (pago ocurrio
 * antes de cocina), esta funcion exige que TODAS las lineas esten "listo"
 * (equivalente al chequeo de `estado === "listo"` del flujo clasico, pero
 * mirando el estado de cocina por linea ya que `pedido.estado` no se movio de
 * "cobrado") y NO reescribe `pedido.estado` a "entregado" (ya es terminal de
 * dinero) — solo fija `entregadoEn`, que es lo que usan tanto el filtro
 * `?estado=cocina` (para sacarlo de la cola) como Historial de pedidos.
 */
export function enviarACaja(pedidoId: string): Pedido {
  const pedido = obtenerPedidoOrThrow(pedidoId);

  const yaPagado = pedido.estado === "cobrado";

  if (yaPagado) {
    const todasListas =
      pedido.lineas.length > 0 && pedido.lineas.every((l) => l.estadoCocina === "listo");
    if (!todasListas) {
      throw new ErrorDominio(
        "estado_invalido",
        `El pedido ${pedidoId} (ya cobrado, flujo mostrador) aun no tiene todas sus lineas "listo"`,
        409
      );
    }
    if (pedido.entregadoEn !== null) {
      throw new ErrorDominio(
        "pedido_ya_entregado",
        `El pedido ${pedidoId} ya fue entregado a caja`,
        409
      );
    }
  } else if (pedido.estado !== "listo") {
    throw new ErrorDominio(
      "estado_invalido",
      `El pedido ${pedidoId} esta en estado "${pedido.estado}"; solo se puede enviar a caja desde "listo"`,
      409
    );
  } else {
    pedido.estado = "entregado";
  }

  pedido.entregadoEn = ahora();

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

  // FLUJO CONFIGURABLE (ver ModoOperacionUbicacion, nota de cabecera del
  // archivo): en ubicaciones "mesa" (servicio a la mesa, con meseros) el
  // cobro SOLO se permite una vez que cocina entrego el pedido a caja
  // (estado "entregado") — mismo contrato que la pantalla /pos (cajero)
  // siempre exigio. En "mostrador" (default piloto) no hay esta restriccion:
  // se puede cobrar en cuanto el pedido tiene lineas, incluso "abierto"
  // (antes de cocina) — es precisamente el flujo pay-first pedido por los
  // revisores para Chicken Kitchen.
  if (modoOperacionDePedido(pedido) === "mesa" && pedido.estado !== "entregado") {
    throw new ErrorDominio(
      "cobro_prematuro",
      `El pedido ${pedidoId} es de una ubicacion en modo "mesa" (servicio a la mesa): ` +
        `solo se puede cobrar despues de que cocina lo entregue a caja (estado "entregado"); ` +
        `estado actual "${pedido.estado}"`,
      409
    );
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
