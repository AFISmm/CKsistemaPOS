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
  agregarLinea,
  anularPedido,
  aplicarDescuento,
  avanzarEstadoCocina,
  crearPedido,
  enviarACocina,
  obtenerPedido,
  reembolsar,
  registrarPagoEnPedido,
  saldoPendiente,
} from "../engine";
import { ErrorDominio } from "../errores";
import { getModoOffline, setModoOffline } from "../offlineState";

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
