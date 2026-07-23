/**
 * Pruebas unitarias del ciclo de vida del pedido (DUENO: backend-ventas-pos):
 * cocina (enviar/avanzar), cobro completo -> "cobrado" + descuento de stock,
 * reembolso (con trazabilidad y pago compensatorio), anulacion pre-cobro,
 * modo offline (pagos con tarjeta -> "encolado") y errores de dominio.
 *
 * Ver nota de ejecucion de runner en __tests__/totales.test.ts.
 */

import assert from "node:assert/strict";
import { test } from "node:test";

import { ahora, getDb, resetDb, uid, UBICACION_PILOTO_ID } from "../../db/store";
import type { Pago, Producto } from "../../domain/types";
import {
  actualizarLinea,
  agregarLinea,
  anularPedido,
  aplicarDescuento,
  avanzarEstadoCocina,
  crearPedido,
  enviarACaja,
  enviarACocina,
  marcarParaLlevar,
  obtenerPedido,
  reembolsar,
  registrarPagoEnPedido,
  saldoPendiente,
} from "../engine";
import { ErrorDominio } from "../errores";
import { getModoOffline, setModoOffline } from "../offlineState";
import { abrirTurno } from "../turnos";

const UBICACION_MESA_DEMO_ID = "ubic-austin-tx";

function productoDemo(overrides: Partial<Producto> = {}): Producto {
  return {
    id: "prod-test-" + uid(),
    categoriaId: "cat-test",
    nombre: "Producto Test",
    descripcion: "Producto de prueba",
    precioBase: 1000,
    gravable: true,
    esCombo: false,
    disponible86: true,
    activo: true,
    ...overrides,
  };
}

function pagoBase(pedidoId: string, turnoId: string, overrides: Partial<Pago> = {}): Pago {
  return {
    id: uid(),
    pedidoId,
    turnoId,
    metodo: "efectivo",
    monto: 0,
    propina: 0,
    estado: "aprobado",
    pspTokenId: null,
    pspReferencia: null,
    ultimos4: null,
    marca: null,
    montoRecibido: null,
    cambio: null,
    creadoEn: ahora(),
    ...overrides,
  };
}

test("cocina: enviarACocina inicializa lineas en 'recibido' y avanzarEstadoCocina deriva el estado del pedido", () => {
  resetDb();
  const producto = productoDemo();
  getDb().productos.push(producto);

  const pedido = crearPedido({ ubicacionId: UBICACION_PILOTO_ID });
  agregarLinea(pedido.id, { productoId: producto.id, cantidad: 1 });
  agregarLinea(pedido.id, { productoId: producto.id, cantidad: 2 });

  enviarACocina(pedido.id);
  assert.equal(pedido.estado, "enviadoCocina");
  assert.ok(pedido.lineas.every((l) => l.estadoCocina === "recibido"));

  avanzarEstadoCocina(pedido.id); // recibido -> preparando (todas)
  assert.ok(pedido.lineas.every((l) => l.estadoCocina === "preparando"));
  assert.equal(pedido.estado, "enPreparacion");

  avanzarEstadoCocina(pedido.id); // preparando -> listo (todas)
  assert.ok(pedido.lineas.every((l) => l.estadoCocina === "listo"));
  assert.equal(pedido.estado, "listo");
});

test("cobro: al saldar el pedido pasa a 'cobrado', fija cerradoEn y descuenta stock (VentaConfirmada)", () => {
  resetDb();
  const producto = productoDemo();
  getDb().productos.push(producto);

  const pedido = crearPedido({ ubicacionId: UBICACION_PILOTO_ID });
  agregarLinea(pedido.id, { productoId: producto.id, cantidad: 1 }); // subtotal 1000, impuesto 70
  const saldo = saldoPendiente(pedido.id);
  assert.equal(saldo, 1070);

  const pago = pagoBase(pedido.id, pedido.turnoId, { monto: saldo });
  registrarPagoEnPedido(pedido.id, pago);

  assert.equal(pedido.estado, "cobrado");
  assert.ok(pedido.cerradoEn !== null);
  assert.equal(saldoPendiente(pedido.id), 0);

  const eventos = getDb().eventos.filter((e) => e.agregadoId === pedido.id);
  assert.ok(eventos.some((e) => e.tipo === "ventaConfirmada"));
});

test("reembolso: solo aplica a pedidos cobrados, crea pago compensatorio negativo y cancela el pedido", () => {
  resetDb();
  const producto = productoDemo();
  getDb().productos.push(producto);

  const pedido = crearPedido({ ubicacionId: UBICACION_PILOTO_ID });
  agregarLinea(pedido.id, { productoId: producto.id, cantidad: 1 });
  const saldo = saldoPendiente(pedido.id); // 1070
  registrarPagoEnPedido(
    pedido.id,
    pagoBase(pedido.id, pedido.turnoId, { monto: saldo, propina: 200 })
  );
  assert.equal(pedido.estado, "cobrado");

  const pedidoReembolsado = reembolsar(pedido.id, {
    usuarioId: "user-gerente-demo",
    motivo: "Cliente insatisfecho",
  });

  assert.equal(pedidoReembolsado.estado, "cancelado");

  const pagos = getDb().pagos.filter((p) => p.pedidoId === pedido.id);
  const compensatorio = pagos.find((p) => p.estado === "reembolsado");
  assert.ok(compensatorio, "debe existir un pago compensatorio 'reembolsado'");
  assert.equal(compensatorio!.monto, -saldo);
  assert.equal(compensatorio!.propina, -200);

  const eventos = getDb().eventos.filter((e) => e.agregadoId === pedido.id && e.tipo === "reembolso");
  assert.equal(eventos.length, 1);

  // No se puede reembolsar dos veces.
  assert.throws(
    () => reembolsar(pedido.id, { usuarioId: "user-gerente-demo", motivo: "otra vez" }),
    (err: unknown) => err instanceof ErrorDominio && err.status === 409
  );
});

test("anulacion: un pedido no cobrado puede anularse (DELETE); uno cobrado debe usar reembolso", () => {
  resetDb();
  const producto = productoDemo();
  getDb().productos.push(producto);

  const pedidoAbierto = crearPedido({ ubicacionId: UBICACION_PILOTO_ID });
  agregarLinea(pedidoAbierto.id, { productoId: producto.id, cantidad: 1 });
  anularPedido(pedidoAbierto.id, { usuarioId: "user-cajero-demo", motivo: "Error de captura" });
  assert.equal(pedidoAbierto.estado, "cancelado");

  // No se puede agregar lineas a un pedido cancelado.
  assert.throws(
    () => agregarLinea(pedidoAbierto.id, { productoId: producto.id, cantidad: 1 }),
    (err: unknown) => err instanceof ErrorDominio && err.status === 409
  );

  const pedidoCobrado = crearPedido({ ubicacionId: UBICACION_PILOTO_ID });
  agregarLinea(pedidoCobrado.id, { productoId: producto.id, cantidad: 1 });
  const saldo = saldoPendiente(pedidoCobrado.id);
  registrarPagoEnPedido(pedidoCobrado.id, pagoBase(pedidoCobrado.id, pedidoCobrado.turnoId, { monto: saldo }));

  assert.throws(
    () => anularPedido(pedidoCobrado.id),
    (err: unknown) => err instanceof ErrorDominio && err.codigo === "pedido_cobrado"
  );
});

test("DEMO cola offline: con el flag activo, un pago con tarjeta 'aprobado' se registra como 'encolado' y no salda el pedido", () => {
  resetDb();
  setModoOffline(false); // aislar de otras pruebas
  try {
    const producto = productoDemo();
    getDb().productos.push(producto);

    const pedido = crearPedido({ ubicacionId: UBICACION_PILOTO_ID });
    agregarLinea(pedido.id, { productoId: producto.id, cantidad: 1 });
    const saldo = saldoPendiente(pedido.id);

    setModoOffline(true);
    assert.equal(getModoOffline(), true);

    const pago = pagoBase(pedido.id, pedido.turnoId, {
      metodo: "tarjeta",
      estado: "aprobado", // el PSP mock lo marca aprobado, pero offline debe encolarlo
      monto: saldo,
    });
    registrarPagoEnPedido(pedido.id, pago);

    assert.equal(pago.estado, "encolado", "el motor debe forzar 'encolado' en modo offline");
    assert.equal(pedido.estado, "abierto", "el pedido no debe quedar 'cobrado' con un pago encolado");
    assert.equal(saldoPendiente(pedido.id), saldo, "el pago encolado no reduce el saldo pendiente");
  } finally {
    setModoOffline(false);
  }
});

test("errores de dominio: producto 86 (422), pedido inexistente (404) y descuento en pedido cerrado (409)", () => {
  resetDb();
  const producto86 = productoDemo({ disponible86: false });
  const producto = productoDemo();
  getDb().productos.push(producto86, producto);

  const pedido = crearPedido({ ubicacionId: UBICACION_PILOTO_ID });

  assert.throws(
    () => agregarLinea(pedido.id, { productoId: producto86.id, cantidad: 1 }),
    (err: unknown) => err instanceof ErrorDominio && err.codigo === "producto_86" && err.status === 422
  );

  assert.equal(obtenerPedido("pedido-no-existe"), undefined);
  assert.throws(
    () => agregarLinea("pedido-no-existe", { productoId: producto.id, cantidad: 1 }),
    (err: unknown) => err instanceof ErrorDominio && err.codigo === "pedido_no_encontrado" && err.status === 404
  );

  agregarLinea(pedido.id, { productoId: producto.id, cantidad: 1 });
  const saldo = saldoPendiente(pedido.id);
  registrarPagoEnPedido(pedido.id, pagoBase(pedido.id, pedido.turnoId, { monto: saldo }));
  assert.equal(pedido.estado, "cobrado");

  assert.throws(
    () =>
      aplicarDescuento(pedido.id, {
        tipo: "monto",
        valor: 1,
        motivo: "no deberia aplicar",
        usuarioId: "user-cajero-demo",
      }),
    (err: unknown) => err instanceof ErrorDominio && err.status === 409
  );
});

// ---------- Fase A (revision 2026-07-22): flujo cobrar-vs-cocina configurable ----------

test("flujo mostrador (pay-first, default piloto): cobra ANTES de cocina; enviarACocina/avanzarEstadoCocina/enviarACaja no degradan el estado 'cobrado'; un segundo cobro se rechaza", () => {
  resetDb();
  const producto = productoDemo();
  getDb().productos.push(producto);

  const pedido = crearPedido({ ubicacionId: UBICACION_PILOTO_ID });
  agregarLinea(pedido.id, { productoId: producto.id, cantidad: 1 });
  assert.equal(pedido.estado, "abierto");

  // Cobra completo MIENTRAS el pedido sigue "abierto" (nunca paso por cocina).
  const saldo = saldoPendiente(pedido.id);
  registrarPagoEnPedido(pedido.id, pagoBase(pedido.id, pedido.turnoId, { monto: saldo }));
  assert.equal(pedido.estado, "cobrado", "el pago completo debe saldar el pedido directo desde 'abierto'");
  assert.equal(pedido.enviadoACocinaEn, null, "todavia no se ha enviado a cocina");

  // Enviar a cocina DESPUES de cobrado: no debe tocar pedido.estado.
  enviarACocina(pedido.id);
  assert.equal(pedido.estado, "cobrado", "enviarACocina no debe degradar un pedido ya cobrado");
  assert.ok(pedido.enviadoACocinaEn !== null);
  assert.ok(pedido.lineas.every((l) => l.estadoCocina === "recibido"));

  // Enviar a cocina una segunda vez debe rechazarse (ya se envio).
  assert.throws(
    () => enviarACocina(pedido.id),
    (err: unknown) => err instanceof ErrorDominio && err.codigo === "pedido_ya_enviado_a_cocina"
  );

  avanzarEstadoCocina(pedido.id); // recibido -> preparando
  assert.equal(pedido.estado, "cobrado", "avanzarEstadoCocina no debe degradar un pedido ya cobrado");
  avanzarEstadoCocina(pedido.id); // preparando -> listo

  enviarACaja(pedido.id);
  assert.equal(pedido.estado, "cobrado", "enviarACaja no debe degradar un pedido ya cobrado");
  assert.ok(pedido.entregadoEn !== null);

  // Un segundo intento de cobro sobre un pedido ya cobrado se rechaza (contrato ya existente).
  assert.throws(
    () => registrarPagoEnPedido(pedido.id, pagoBase(pedido.id, pedido.turnoId, { monto: 1 })),
    (err: unknown) => err instanceof ErrorDominio && err.codigo === "pedido_ya_cobrado"
  );
});

test("flujo mesa (clasico, ej. ubicacion demo Austin): NO se puede cobrar antes de 'entregado'; el camino completo sigue funcionando", () => {
  resetDb();
  const producto = productoDemo();
  getDb().productos.push(producto);
  // La ubicacion demo de Austin no trae un Turno sembrado (solo la piloto lo
  // tiene, ver lib/db/store.ts); se abre uno aqui para poder crear pedidos.
  abrirTurno({ ubicacionId: UBICACION_MESA_DEMO_ID, usuarioAperturaId: "user-gerente-demo" });

  const pedido = crearPedido({ ubicacionId: UBICACION_MESA_DEMO_ID });
  agregarLinea(pedido.id, { productoId: producto.id, cantidad: 1 });

  // Intentar cobrar mientras sigue "abierto" (antes de pasar por cocina) se rechaza.
  const saldo = saldoPendiente(pedido.id);
  assert.throws(
    () => registrarPagoEnPedido(pedido.id, pagoBase(pedido.id, pedido.turnoId, { monto: saldo })),
    (err: unknown) => err instanceof ErrorDominio && err.codigo === "cobro_prematuro" && err.status === 409
  );

  enviarACocina(pedido.id);
  assert.equal(pedido.estado, "enviadoCocina");
  avanzarEstadoCocina(pedido.id); // -> enPreparacion
  avanzarEstadoCocina(pedido.id); // -> listo
  assert.equal(pedido.estado, "listo");
  enviarACaja(pedido.id);
  assert.equal(pedido.estado, "entregado");

  // Ahora SI se puede cobrar (flujo clasico).
  registrarPagoEnPedido(pedido.id, pagoBase(pedido.id, pedido.turnoId, { monto: saldo }));
  assert.equal(pedido.estado, "cobrado");
});

test("bloqueo post-descuento: actualizarLinea se rechaza mientras el descuento este activo; se desbloquea al llevarlo a 0", () => {
  resetDb();
  const producto = productoDemo();
  getDb().productos.push(producto);

  const pedido = crearPedido({ ubicacionId: UBICACION_PILOTO_ID });
  agregarLinea(pedido.id, { productoId: producto.id, cantidad: 2 });
  const [linea] = pedido.lineas;

  aplicarDescuento(pedido.id, {
    tipo: "monto",
    valor: 100,
    motivo: "Cortesia gerencial",
    usuarioId: "user-gerente-demo",
  });
  assert.ok(pedido.descuentoTotal > 0);

  assert.throws(
    () => actualizarLinea(pedido.id, linea.id, { cantidad: 3 }),
    (err: unknown) => err instanceof ErrorDominio && err.codigo === "linea_bloqueada_por_descuento" && err.status === 409
  );
  assert.throws(
    () => actualizarLinea(pedido.id, linea.id, { eliminar: true }),
    (err: unknown) => err instanceof ErrorDominio && err.codigo === "linea_bloqueada_por_descuento"
  );

  // agregarLinea SI sigue permitido (decision de diseno documentada en engine.ts).
  agregarLinea(pedido.id, { productoId: producto.id, cantidad: 1 });
  assert.equal(pedido.lineas.length, 2);

  // Remover el descuento (volver a pasar por la misma autorizacion) desbloquea.
  aplicarDescuento(pedido.id, {
    tipo: "monto",
    valor: 0,
    motivo: "Remocion para editar",
    usuarioId: "user-gerente-demo",
  });
  assert.equal(pedido.descuentoTotal, 0);
  actualizarLinea(pedido.id, linea.id, { cantidad: 5 });
  assert.equal(linea.cantidad, 5);
});

test("para llevar: marcarParaLlevar agrega/quita el cargo de empaque automaticamente y es idempotente", () => {
  resetDb();
  const producto = productoDemo();
  getDb().productos.push(producto);

  const pedido = crearPedido({ ubicacionId: UBICACION_PILOTO_ID });
  agregarLinea(pedido.id, { productoId: producto.id, cantidad: 1 });
  const totalAntes = pedido.total;
  assert.equal(pedido.empaqueTotal, 0);

  marcarParaLlevar(pedido.id, { paraLlevar: true });
  assert.equal(pedido.paraLlevar, true);
  assert.ok(pedido.empaqueTotal! > 0);
  assert.equal(pedido.total, totalAntes + pedido.empaqueTotal!);

  const empaqueTrasPrimeraLlamada = pedido.empaqueTotal;
  marcarParaLlevar(pedido.id, { paraLlevar: true }); // idempotente: no duplica el cargo
  assert.equal(pedido.empaqueTotal, empaqueTrasPrimeraLlamada);

  marcarParaLlevar(pedido.id, { paraLlevar: false });
  assert.equal(pedido.paraLlevar, false);
  assert.equal(pedido.empaqueTotal, 0);
  assert.equal(pedido.total, totalAntes);
});

test("cajon de caja: no se puede crear un pedido sin un turno abierto para la ubicacion (bloqueo duro ya existente)", () => {
  resetDb();
  assert.throws(
    () => crearPedido({ ubicacionId: "ubic-sin-turno-abierto-demo" }),
    (err: unknown) => err instanceof ErrorDominio && err.codigo === "turno_no_abierto" && err.status === 409
  );
});
