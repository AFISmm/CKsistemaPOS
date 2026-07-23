/**
 * Pruebas unitarias de la logica pura del reporte de tiempos operativos
 * (lib/reportes/tiempos.ts). Usa Vitest (ver vitest.config.ts) — mismo runner
 * que el resto de las pruebas nuevas del repo.
 */

import { describe, expect, test } from "vitest";
import {
  agruparPorHoraDelDia,
  calcularDuraciones,
  pedidoEnRangoFecha,
  type FilaTiempoPedido,
} from "./tiempos";

function fila(overrides: Partial<FilaTiempoPedido> = {}): FilaTiempoPedido {
  return {
    id: overrides.id ?? "pedido-1",
    numeroOrden: overrides.numeroOrden ?? 1,
    nombreCliente: "Cliente Demo",
    canal: "mostrador",
    estado: "cobrado",
    creadoEn: overrides.creadoEn ?? "2026-07-20T12:00:00.000Z",
    enviadoACocinaEn: overrides.enviadoACocinaEn ?? "2026-07-20T12:02:00.000Z",
    entregadoEn: overrides.entregadoEn ?? "2026-07-20T12:10:00.000Z",
    cerradoEn: overrides.cerradoEn ?? "2026-07-20T12:12:00.000Z",
    creadoPorNombre: overrides.creadoPorNombre ?? "Cajero Demo",
    cajeroTurnoNombre: overrides.cajeroTurnoNombre ?? "Cajero Demo",
    ...overrides,
  };
}

describe("calcularDuraciones", () => {
  test("calcula las 3 duraciones cuando todos los timestamps estan presentes", () => {
    const d = calcularDuraciones(fila());
    expect(d.msArmadoMostrador).toBe(2 * 60 * 1000); // 12:00 -> 12:02
    expect(d.msEnCocina).toBe(8 * 60 * 1000); // 12:02 -> 12:10
    expect(d.msTotal).toBe(10 * 60 * 1000); // 12:00 -> 12:10 (usa entregadoEn, no cerradoEn)
  });

  test("usa cerradoEn como fallback de msTotal cuando no hay entregadoEn (pedido legado)", () => {
    const d = calcularDuraciones(fila({ entregadoEn: null }));
    expect(d.msEnCocina).toBeNull();
    expect(d.msTotal).toBe(12 * 60 * 1000); // 12:00 -> 12:12 (cerradoEn)
  });

  test("devuelve null (no lanza) si falta enviadoACocinaEn (pedido todavia abierto en mostrador)", () => {
    const d = calcularDuraciones(fila({ enviadoACocinaEn: null, entregadoEn: null, cerradoEn: null }));
    expect(d.msArmadoMostrador).toBeNull();
    expect(d.msEnCocina).toBeNull();
    expect(d.msTotal).toBeNull();
  });

  test("devuelve null ante un rango invalido (fin anterior al inicio: dato inconsistente)", () => {
    const d = calcularDuraciones(
      fila({ creadoEn: "2026-07-20T12:10:00.000Z", enviadoACocinaEn: "2026-07-20T12:00:00.000Z" })
    );
    expect(d.msArmadoMostrador).toBeNull();
  });
});

describe("pedidoEnRangoFecha", () => {
  test("incluye el limite inferior y superior (inclusive)", () => {
    expect(pedidoEnRangoFecha("2026-07-20T00:00:00.000Z", "2026-07-20", "2026-07-22")).toBe(true);
    expect(pedidoEnRangoFecha("2026-07-22T23:59:59.000Z", "2026-07-20", "2026-07-22")).toBe(true);
  });

  test("excluye fechas fuera del rango", () => {
    expect(pedidoEnRangoFecha("2026-07-19T23:59:59.000Z", "2026-07-20", "2026-07-22")).toBe(false);
    expect(pedidoEnRangoFecha("2026-07-23T00:00:00.000Z", "2026-07-20", "2026-07-22")).toBe(false);
  });
});

// `agruparPorHoraDelDia` agrupa por HORA LOCAL (Date.getHours()). Estos
// helpers construyen los timestamps con el constructor local de Date (en vez
// de strings ISO "...Z" en UTC) para que la hora resultante sea la misma sin
// importar la zona horaria de la maquina que corre la prueba (el roundtrip
// local -> toISOString() -> getHours() siempre vuelve a la hora local
// original en la MISMA maquina).
function isoLocal(hora: number, minuto: number): string {
  return new Date(2026, 6, 20, hora, minuto, 0).toISOString();
}

describe("agruparPorHoraDelDia", () => {
  test("agrupa por hora local y promedia solo los pedidos que tienen el dato de esa duracion", () => {
    const filas = [
      calcularDuraciones(
        fila({ id: "a", creadoEn: isoLocal(12, 0), enviadoACocinaEn: isoLocal(12, 1), entregadoEn: isoLocal(12, 5) })
      ),
      calcularDuraciones(
        fila({ id: "b", creadoEn: isoLocal(12, 30), enviadoACocinaEn: isoLocal(12, 31), entregadoEn: isoLocal(12, 41) })
      ),
      // Un pedido sin enviadoACocinaEn/entregadoEn (todavia abierto): cuenta para numeroPedidos, no para el promedio.
      calcularDuraciones(
        fila({ id: "c", creadoEn: isoLocal(12, 45), enviadoACocinaEn: null, entregadoEn: null, cerradoEn: null })
      ),
    ];
    const cubetas = agruparPorHoraDelDia(filas);
    expect(cubetas).toHaveLength(1);
    const [cubeta] = cubetas;
    expect(cubeta.hora).toBe(12);
    expect(cubeta.numeroPedidos).toBe(3);
    // msEnCocina: a=4min, b=10min -> promedio 7min (el pedido "c" sin dato no cuenta)
    expect(cubeta.promedioMsCocina).toBe(7 * 60 * 1000);
  });

  test("devuelve una cubeta por cada hora distinta, ordenadas ascendente", () => {
    const filas = [
      calcularDuraciones(fila({ id: "tarde", creadoEn: isoLocal(18, 0) })),
      calcularDuraciones(fila({ id: "manana", creadoEn: isoLocal(9, 0) })),
    ];
    const cubetas = agruparPorHoraDelDia(filas);
    expect(cubetas.map((c) => c.hora)).toEqual([9, 18]);
  });

  test("lista vacia devuelve [] (nunca lanza)", () => {
    expect(agruparPorHoraDelDia([])).toEqual([]);
  });
});
