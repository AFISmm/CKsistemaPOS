/**
 * Pruebas unitarias de la logica pura del KDS (`lib/kitchen/kds.ts`).
 *
 * Usan el test runner INTEGRADO de Node (`node:test` + `node:assert/strict`),
 * sin agregar dependencias npm nuevas (no hay jest/vitest instalado en esta
 * demo — ver package.json). Cubren exactamente los 4 escenarios pedidos:
 * multiples canales, cambios de estado, superacion de SLA, y resiliencia
 * offline/errores de red (parseo tolerante de la respuesta del backend).
 *
 * Como ejecutarlas (una vez el proyecto tenga un runner TS, p.ej. `tsx` o
 * `ts-node`, agregado por devops-despliegue-pos / qa-pruebas-pos):
 *   npx tsx --test lib/kitchen/kds.test.ts
 * o, si se agrega vitest en una fase posterior, este mismo archivo es
 * compatible con `describe`/`test` de vitest cambiando solo el import.
 *
 * NOTA: no se ejecutan en esta tarea (no se corre npm install/build), se
 * entregan como codigo listo para que QA los integre al pipeline.
 */

import assert from "node:assert/strict";
import { test } from "node:test";
import type { CanalPedido, LineaDePedido, Pedido } from "../domain/types";
import {
  avanzarLocalOptimista,
  estadoCocinaAgregado,
  etiquetaCanal,
  excedeSla,
  formatearCronometro,
  normalizarRespuestaPedidos,
  ordenarFifo,
  SLA_MS,
} from "./kds";

// ---------- Fixtures ----------

function linea(
  overrides: Partial<LineaDePedido> = {}
): LineaDePedido {
  return {
    id: overrides.id ?? "linea-1",
    pedidoId: "pedido-1",
    productoId: "prod-1",
    descripcion: "Chop-Chop Bowl",
    cantidad: 1,
    precioUnitario: 1099,
    subtotalLinea: 1099,
    gravable: true,
    notas: "",
    estadoCocina: "recibido",
    modificadores: [],
    ...overrides,
  };
}

function pedido(overrides: Partial<Pedido> = {}): Pedido {
  return {
    id: overrides.id ?? "pedido-1",
    ubicacionId: "ubic-miami-fl",
    turnoId: "turno-demo-piloto",
    numeroOrden: overrides.numeroOrden ?? 1,
    nombreCliente: overrides.nombreCliente ?? "Cliente Demo",
    canal: overrides.canal ?? "mostrador",
    estado: "enviadoCocina",
    subtotal: 1099,
    descuentoTotal: 0,
    impuestoTotal: 77,
    propinaTotal: 0,
    total: 1176,
    lineas: overrides.lineas ?? [linea()],
    creadoEn: overrides.creadoEn ?? new Date().toISOString(),
    cerradoEn: null,
    ...overrides,
  };
}

// ---------- 1) Multiples canales ----------

test("etiquetaCanal cubre los 5 canales del contrato (mostrador, kiosco, online, delivery, catering)", () => {
  const canales: CanalPedido[] = [
    "mostrador",
    "kiosco",
    "online",
    "delivery",
    "catering",
  ];
  const etiquetas = canales.map(etiquetaCanal);
  assert.deepEqual(etiquetas, [
    "Mostrador",
    "Kiosco",
    "Online",
    "Delivery",
    "Catering",
  ]);
  // Todas distintas: no se pisan canales entre si.
  assert.equal(new Set(etiquetas).size, 5);
});

test("la cola unifica pedidos de distintos canales y respeta el orden FIFO por creadoEn", () => {
  const base = Date.now();
  const pedidos = [
    pedido({ id: "p-online", canal: "online", numeroOrden: 3, creadoEn: new Date(base + 2000).toISOString() }),
    pedido({ id: "p-mostrador", canal: "mostrador", numeroOrden: 1, creadoEn: new Date(base).toISOString() }),
    pedido({ id: "p-delivery", canal: "delivery", numeroOrden: 2, creadoEn: new Date(base + 1000).toISOString() }),
  ];
  const ordenados = ordenarFifo(pedidos);
  assert.deepEqual(
    ordenados.map((p) => p.id),
    ["p-mostrador", "p-delivery", "p-online"]
  );
});

// ---------- 2) Cambios de estado ----------

test("estadoCocinaAgregado: 'recibido' si alguna linea no ha empezado", () => {
  const p = pedido({
    lineas: [linea({ id: "l1", estadoCocina: "preparando" }), linea({ id: "l2", estadoCocina: "recibido" })],
  });
  assert.equal(estadoCocinaAgregado(p), "recibido");
});

test("estadoCocinaAgregado: 'preparando' si ninguna esta recibido pero alguna preparando", () => {
  const p = pedido({
    lineas: [linea({ id: "l1", estadoCocina: "preparando" }), linea({ id: "l2", estadoCocina: "listo" })],
  });
  assert.equal(estadoCocinaAgregado(p), "preparando");
});

test("estadoCocinaAgregado: 'listo' solo si TODAS las lineas estan listas", () => {
  const p = pedido({
    lineas: [linea({ id: "l1", estadoCocina: "listo" }), linea({ id: "l2", estadoCocina: "listo" })],
  });
  assert.equal(estadoCocinaAgregado(p), "listo");
});

test("avanzarLocalOptimista: 'Empezar' pasa todas las lineas recibido -> preparando", () => {
  const p = pedido({
    lineas: [linea({ id: "l1", estadoCocina: "recibido" }), linea({ id: "l2", estadoCocina: "recibido" })],
  });
  const siguiente = avanzarLocalOptimista(p);
  assert.ok(siguiente.lineas.every((l) => l.estadoCocina === "preparando"));
  assert.equal(estadoCocinaAgregado(siguiente), "preparando");
});

test("avanzarLocalOptimista: 'Listo' pasa las lineas preparando -> listo (flujo completo recibido->preparando->listo)", () => {
  let p = pedido({
    lineas: [linea({ id: "l1", estadoCocina: "recibido" }), linea({ id: "l2", estadoCocina: "recibido" })],
  });
  p = avanzarLocalOptimista(p); // -> preparando
  assert.equal(estadoCocinaAgregado(p), "preparando");
  p = avanzarLocalOptimista(p); // -> listo
  assert.equal(estadoCocinaAgregado(p), "listo");
  assert.ok(p.lineas.every((l) => l.estadoCocina === "listo"));
});

// ---------- 3) Superacion de SLA ----------

test("excedeSla es false justo antes del limite y true justo despues (5 min)", () => {
  const ahora = Date.now();
  const dentroDeSla = new Date(ahora - (SLA_MS - 1000)).toISOString();
  const fueraDeSla = new Date(ahora - (SLA_MS + 1000)).toISOString();
  assert.equal(excedeSla(dentroDeSla, ahora), false);
  assert.equal(excedeSla(fueraDeSla, ahora), true);
});

test("formatearCronometro da formato mm:ss (325s -> 05:25)", () => {
  assert.equal(formatearCronometro(325_000), "05:25");
  assert.equal(formatearCronometro(0), "00:00");
  assert.equal(formatearCronometro(59_000), "00:59");
});

// ---------- 4) Offline / errores de red ----------

test("normalizarRespuestaPedidos acepta un arreglo plano de pedidos", () => {
  const pedidos = [pedido({ id: "a" }), pedido({ id: "b" })];
  assert.deepEqual(
    normalizarRespuestaPedidos(pedidos).map((p) => p.id),
    ["a", "b"]
  );
});

test("normalizarRespuestaPedidos acepta la forma { pedidos: [...] }", () => {
  const pedidos = [pedido({ id: "a" })];
  assert.deepEqual(
    normalizarRespuestaPedidos({ pedidos }).map((p) => p.id),
    ["a"]
  );
});

test("normalizarRespuestaPedidos nunca lanza ante JSON inesperado (offline/backend caido): devuelve []", () => {
  assert.deepEqual(normalizarRespuestaPedidos(null), []);
  assert.deepEqual(normalizarRespuestaPedidos(undefined), []);
  assert.deepEqual(normalizarRespuestaPedidos({}), []);
  assert.deepEqual(normalizarRespuestaPedidos("error de servidor"), []);
  assert.deepEqual(normalizarRespuestaPedidos({ pedidos: "no-es-array" }), []);
});
