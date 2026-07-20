/**
 * Pruebas de lib/offline/uuidv7.ts — F1-T3 (DUENO: frontend-mostrador-kiosco-pos).
 * Runner: Vitest (ver package.json "test" / vitest.config.ts).
 */

import { describe, expect, it } from "vitest";
import { esUuidv7Valido, timestampMsDeUuidv7, uuidv7 } from "../uuidv7";

describe("uuidv7()", () => {
  it("produce ids con formato canonico y version/variante v7 validas", () => {
    for (let i = 0; i < 50; i++) {
      const id = uuidv7();
      expect(id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
      expect(esUuidv7Valido(id)).toBe(true);
    }
  });

  it("produce ids unicos incluso generados en rafaga (mismo tick)", () => {
    const ids = Array.from({ length: 500 }, () => uuidv7());
    const unicos = new Set(ids);
    expect(unicos.size).toBe(ids.length);
  });

  it("es ordenable por tiempo: generado antes ordena antes lexicograficamente", () => {
    const primero = uuidv7();
    const segundo = uuidv7();
    const tercero = uuidv7();
    expect(primero < segundo).toBe(true);
    expect(segundo < tercero).toBe(true);

    // El mismo orden se preserva ordenando el arreglo como strings.
    const ordenados = [tercero, primero, segundo].sort();
    expect(ordenados).toEqual([primero, segundo, tercero]);
  });

  it("codifica un timestamp (ms) coherente con Date.now() al momento de generarlo", () => {
    const antes = Date.now();
    const id = uuidv7();
    const despues = Date.now();
    const ts = timestampMsDeUuidv7(id);
    expect(ts).toBeGreaterThanOrEqual(antes);
    expect(ts).toBeLessThanOrEqual(despues);
  });

  it("no reconoce como v7 validos ids con otra version (ej. v4)", () => {
    const idV4 = "3f29b6b0-1e2a-4b8c-9c3d-6b0a1f2e3d4c";
    expect(esUuidv7Valido(idV4)).toBe(false);
  });
});
