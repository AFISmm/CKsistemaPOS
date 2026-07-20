/**
 * Unit tests de `detectarCicloReceta` (S-14, BOM multinivel — productos
 * elaborados/intermedios). PUROS: no tocan Prisma/DB, ver
 * src/catalogo/receta-ciclo.ts.
 */
import { detectarCicloReceta } from "../../src/catalogo/receta-ciclo";

describe("detectarCicloReceta (S-14)", () => {
  it("un insumo elaborado que se referencia a SI MISMO como ingrediente base es un ciclo directo", () => {
    const grafoVigente = new Map<string, string[]>();
    expect(detectarCicloReceta("salsa-bbq", ["salsa-bbq"], grafoVigente)).toBe(true);
  });

  it("un ciclo TRANSITIVO (A usa B, B ya usa A) se detecta", () => {
    // B (vigente) ya usa A como ingrediente base.
    const grafoVigente = new Map<string, string[]>([["insumo-b", ["insumo-a"]]]);
    // Se propone que A use B: A -> B -> A, ciclo.
    expect(detectarCicloReceta("insumo-a", ["insumo-b"], grafoVigente)).toBe(true);
  });

  it("un ciclo transitivo de 3 niveles (A->B->C->A) tambien se detecta", () => {
    const grafoVigente = new Map<string, string[]>([
      ["insumo-b", ["insumo-c"]],
      ["insumo-c", ["insumo-a"]],
    ]);
    expect(detectarCicloReceta("insumo-a", ["insumo-b"], grafoVigente)).toBe(true);
  });

  it("una receta normal (sin ciclo) no se marca como ciclo", () => {
    // Salsa BBQ usa tomate y especias (insumos base "hoja", sin receta propia).
    const grafoVigente = new Map<string, string[]>();
    expect(detectarCicloReceta("salsa-bbq", ["tomate", "especias"], grafoVigente)).toBe(false);
  });

  it("dos insumos elaborados INDEPENDIENTES que comparten un mismo ingrediente base no se confunden con un ciclo", () => {
    // Vinagreta y Salsa BBQ ya vigentes, ambas usan aceite; no hay relacion entre ellas.
    const grafoVigente = new Map<string, string[]>([
      ["vinagreta", ["aceite", "vinagre"]],
      ["salsa-bbq", ["tomate", "especias"]],
    ]);
    // Se define una TERCERA salsa que usa vinagreta como ingrediente (BOM multinivel legitimo).
    expect(detectarCicloReceta("salsa-especial", ["vinagreta", "sal"], grafoVigente)).toBe(false);
  });

  it("una receta vacia (sin ingredientes propuestos) nunca es un ciclo", () => {
    const grafoVigente = new Map<string, string[]>();
    expect(detectarCicloReceta("insumo-x", [], grafoVigente)).toBe(false);
  });

  it("reemplazar la receta VIGENTE de un insumo (no la de otro) usa la version PROPUESTA, no la vieja, para decidir", () => {
    // Vigente: A usa B. Se REDEFINE A para que ya NO use B sino C (sin ciclo).
    const grafoVigente = new Map<string, string[]>([["insumo-a", ["insumo-b"]]]);
    expect(detectarCicloReceta("insumo-a", ["insumo-c"], grafoVigente)).toBe(false);
  });
});
