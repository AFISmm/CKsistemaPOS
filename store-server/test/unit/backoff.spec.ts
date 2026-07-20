/**
 * Unit test puro (sin DB, sin red, sin timers reales) del calculo de backoff
 * exponencial + jitter usado por el agente de sincronizacion (F1-T5, ver
 * src/sync/backoff.ts). `aleatorio` es inyectable justamente para poder
 * afirmar valores exactos sin depender de Math.random.
 */
import { calcularBackoffMs } from "../../src/sync/backoff";

describe("calcularBackoffMs", () => {
  it("con jitter=0 el delay es 0 sin importar el intento", () => {
    expect(calcularBackoffMs(0, { aleatorio: () => 0 })).toBe(0);
    expect(calcularBackoffMs(5, { aleatorio: () => 0 })).toBe(0);
  });

  it("con jitter=1 (full jitter al maximo) crece exponencialmente: base * 2^intento", () => {
    const opciones = { baseMs: 100, maxMs: 100_000, aleatorio: () => 1 };
    expect(calcularBackoffMs(0, opciones)).toBe(100);
    expect(calcularBackoffMs(1, opciones)).toBe(200);
    expect(calcularBackoffMs(2, opciones)).toBe(400);
    expect(calcularBackoffMs(3, opciones)).toBe(800);
  });

  it("respeta el tope maxMs aunque el intento sea grande", () => {
    const delay = calcularBackoffMs(20, { baseMs: 500, maxMs: 30_000, aleatorio: () => 1 });
    expect(delay).toBe(30_000);
  });

  it("el delay siempre cae dentro de [0, techoExponencial] para cualquier aleatorio en [0,1)", () => {
    const base = 500;
    const max = 30_000;
    for (const intento of [0, 1, 2, 3, 4, 10]) {
      const techo = Math.min(max, base * 2 ** intento);
      for (const r of [0, 0.25, 0.5, 0.75, 0.999]) {
        const delay = calcularBackoffMs(intento, { baseMs: base, maxMs: max, aleatorio: () => r });
        expect(delay).toBeGreaterThanOrEqual(0);
        expect(delay).toBeLessThanOrEqual(techo);
      }
    }
  });

  it("usa Math.random por defecto cuando no se inyecta `aleatorio`", () => {
    const spy = jest.spyOn(Math, "random").mockReturnValue(0.5);
    try {
      expect(calcularBackoffMs(1, { baseMs: 100, maxMs: 10_000 })).toBe(100); // 0.5 * (100*2^1=200) = 100
    } finally {
      spy.mockRestore();
    }
  });

  it("rechaza un numero de intento negativo", () => {
    expect(() => calcularBackoffMs(-1)).toThrow();
  });
});
