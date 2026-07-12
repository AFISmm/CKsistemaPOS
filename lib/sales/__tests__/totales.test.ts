/**
 * Pruebas unitarias del motor de ventas (DUENO: backend-ventas-pos):
 * impuesto, descuento (monto y porcentaje, con prorrateo gravable/exento),
 * propina (exenta de impuesto) y total/saldoPendiente.
 *
 * Runner: node:test + node:assert (sin dependencias nuevas, per regla del
 * proyecto). NOTA de ejecucion: el package.json de la demo aun no define un
 * script de test ni "type":"module"/resolucion de extensiones para el runner
 * nativo de Node en modulos ESM con imports sin extension (convencion del
 * resto del repo, moduleResolution:"bundler"). Estas pruebas corren tal cual
 * bajo cualquier runner que transpile TS con resolucion "bundler"/Node
 * clasica (Vitest, Jest+ts-jest, o `next build`); ese cableado de tooling de
 * pruebas es infra transversal, fuera del alcance de este modulo.
 *
 * Ejecucion sugerida una vez haya tooling: `npx vitest run lib/sales/__tests__`.
 */

import assert from "node:assert/strict";
import { test } from "node:test";

import { ahora, getDb, resetDb, uid, UBICACION_PILOTO_ID } from "../../db/store";
import type { Modificador, Pago, Producto } from "../../domain/types";
import {
  agregarLinea,
  aplicarDescuento,
  crearPedido,
  registrarPagoEnPedido,
  saldoPendiente,
} from "../engine";

/** Producto gravable de prueba: $10.00, gravable=true. */
function productoGravableDemo(): Producto {
  return {
    id: "prod-test-gravable-" + uid(),
    categoriaId: "cat-test",
    nombre: "Combo Test Gravable",
    descripcion: "Producto de prueba gravable",
    precioBase: 1000, // $10.00
    gravable: true,
    esCombo: false,
    disponible86: true,
    activo: true,
  };
}

/** Producto exento de prueba: $2.00, gravable=false. */
function productoExentoDemo(): Producto {
  return {
    id: "prod-test-exento-" + uid(),
    categoriaId: "cat-test",
    nombre: "Agua Test Exenta",
    descripcion: "Producto de prueba exento",
    precioBase: 200, // $2.00
    gravable: false,
    esCombo: false,
    disponible86: true,
    activo: true,
  };
}

/** Modificador "agregar" de prueba: +$1.50. */
function modificadorDemo(): Modificador {
  return {
    id: "mod-test-extra-" + uid(),
    grupoModificadorId: "grupo-test",
    nombre: "Extra salsa",
    precioDelta: 150, // $1.50
    disponible86: true,
    tipo: "agregar",
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

test("impuesto: se calcula sobre el subtotal gravable (FL demo 7%) redondeando al centavo", () => {
  resetDb();
  const producto = productoGravableDemo();
  getDb().productos.push(producto);

  const pedido = crearPedido({ ubicacionId: UBICACION_PILOTO_ID });
  agregarLinea(pedido.id, { productoId: producto.id, cantidad: 2 }); // 2 x $10.00 = $20.00

  assert.equal(pedido.subtotal, 2000);
  assert.equal(pedido.descuentoTotal, 0);
  assert.equal(pedido.impuestoTotal, 140); // round(2000 * 0.07)
  assert.equal(pedido.propinaTotal, 0);
  assert.equal(pedido.total, 2000 + 140);
});

test("C-SNAPSHOT: precioUnitario congela precioBase + deltas de modificadores elegidos", () => {
  resetDb();
  const producto = productoGravableDemo();
  const modificador = modificadorDemo();
  getDb().productos.push(producto);
  getDb().modificadores.push(modificador);

  const pedido = crearPedido({ ubicacionId: UBICACION_PILOTO_ID });
  agregarLinea(pedido.id, {
    productoId: producto.id,
    cantidad: 1,
    modificadorIds: [modificador.id],
  });

  const [linea] = pedido.lineas;
  assert.equal(linea.precioUnitario, 1000 + 150);
  assert.equal(linea.subtotalLinea, 1150);
  assert.equal(linea.gravable, true);
  assert.equal(linea.modificadores[0].precioDelta, 150);

  // Cambiar el precioDelta del catalogo despues NO debe afectar la linea ya congelada.
  modificador.precioDelta = 999;
  assert.equal(linea.precioUnitario, 1150, "la linea ya creada debe permanecer congelada");
});

test("descuento por monto: se prorratea entre lineas gravables y exentas antes de calcular impuesto", () => {
  resetDb();
  const gravable = productoGravableDemo();
  const exento = productoExentoDemo();
  const modificador = modificadorDemo();
  getDb().productos.push(gravable, exento);
  getDb().modificadores.push(modificador);

  const pedido = crearPedido({ ubicacionId: UBICACION_PILOTO_ID });
  agregarLinea(pedido.id, { productoId: gravable.id, cantidad: 1, modificadorIds: [modificador.id] }); // 1150, gravable
  agregarLinea(pedido.id, { productoId: exento.id, cantidad: 1 }); // 200, exento

  assert.equal(pedido.subtotal, 1350);

  aplicarDescuento(pedido.id, {
    tipo: "monto",
    valor: 135,
    motivo: "Cupón de prueba",
    usuarioId: "user-gerente-demo",
  });

  // subtotalGravable=1150 de 1350 -> proporcion 1150/1350; descuento prorrateado = 115
  // baseGravable = 1150 - 115 = 1035; impuesto = round(1035 * 0.07) = 72
  assert.equal(pedido.descuentoTotal, 135);
  assert.equal(pedido.impuestoTotal, 72);
  assert.equal(pedido.total, 1350 - 135 + 72);
});

test("descuento por porcentaje: se calcula sobre el subtotal y se acota a un entero de centavos", () => {
  resetDb();
  const gravable = productoGravableDemo();
  getDb().productos.push(gravable);

  const pedido = crearPedido({ ubicacionId: UBICACION_PILOTO_ID });
  agregarLinea(pedido.id, { productoId: gravable.id, cantidad: 1 }); // 1000

  aplicarDescuento(pedido.id, {
    tipo: "porcentaje",
    valor: 20,
    motivo: "Promo 20%",
    usuarioId: "user-gerente-demo",
  });

  assert.equal(pedido.descuentoTotal, 200); // round(1000 * 0.20)
  assert.equal(pedido.impuestoTotal, 56); // round((1000-200) * 0.07)
  assert.equal(pedido.total, 1000 - 200 + 56);
});

test("propina: no genera impuesto y se suma solo de pagos aprobados al total", () => {
  resetDb();
  const gravable = productoGravableDemo();
  getDb().productos.push(gravable);

  const pedido = crearPedido({ ubicacionId: UBICACION_PILOTO_ID });
  agregarLinea(pedido.id, { productoId: gravable.id, cantidad: 1 }); // subtotal 1000, impuesto 70

  const saldoAntes = saldoPendiente(pedido.id);
  assert.equal(saldoAntes, 1070); // 1000 - 0 + 70

  const pago = pagoBase(pedido.id, pedido.turnoId, { monto: 1070, propina: 200 });
  registrarPagoEnPedido(pedido.id, pago);

  assert.equal(pedido.propinaTotal, 200);
  assert.equal(pedido.impuestoTotal, 70, "la propina no debe alterar el impuesto");
  assert.equal(pedido.total, 1000 - 0 + 70 + 200);
  assert.equal(pedido.estado, "cobrado", "el pago aprobado salda el pedido");
  assert.equal(saldoPendiente(pedido.id), 0);
});
