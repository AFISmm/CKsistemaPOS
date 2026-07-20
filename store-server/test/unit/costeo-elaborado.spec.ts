/**
 * Unit tests de `resolverCostoUnitarioInsumo` (S-14, BOM multinivel —
 * productos elaborados/intermedios, ver
 * docs/analisis-reunion-diego-arches-20260717.md §3.1 y docs/requisitos.md
 * S-14). PUROS: no tocan Prisma/DB — el grafo de recetas y los costos base
 * ya vienen resueltos por el llamador (ver src/costeo/costeo.service.ts para
 * el envoltorio que SI consulta la base real, `construirGrafoCostoInsumos`).
 */
import { Decimal } from "@prisma/client/runtime/library";
import { calcularCostoLinea, resolverCostoUnitarioInsumo } from "../../src/costeo/costeo.types";

describe("resolverCostoUnitarioInsumo (S-14)", () => {
  it("un insumo NO elaborado (sin entrada en recetasElaboradas) usa directamente el costoUnitario cacheado", () => {
    const costosBase = new Map([["tomate", new Decimal(2)]]);
    const recetasElaboradas = new Map<string, { insumoId: string; cantidad: Decimal }[]>();
    expect(resolverCostoUnitarioInsumo("tomate", costosBase, recetasElaboradas).toString()).toBe("2");
  });

  it("un insumo AUSENTE de ambos mapas cuesta 0 (no rompe el calculo)", () => {
    expect(resolverCostoUnitarioInsumo("desconocido", new Map(), new Map()).toString()).toBe("0");
  });

  it("un insumo elaborado (Salsa BBQ) resuelve su costo RECURSIVAMENTE via su receta, no via su costoUnitario cacheado", () => {
    const costosBase = new Map([
      ["tomate", new Decimal(2)],
      ["especias", new Decimal(10)],
      // costoUnitario cacheado/manual de la salsa (STALE a proposito): la
      // receta debe ganarle a este valor, no usarlo.
      ["salsa-bbq", new Decimal(999)],
    ]);
    const recetasElaboradas = new Map([
      [
        "salsa-bbq",
        [
          { insumoId: "tomate", cantidad: new Decimal(0.5) },
          { insumoId: "especias", cantidad: new Decimal(0.1) },
        ],
      ],
    ]);

    // 0.5*2 + 0.1*10 = 1 + 1 = 2 (NO 999: la receta vigente manda sobre el
    // costoUnitario cacheado, ver documentacion en costeo.types.ts).
    const costo = resolverCostoUnitarioInsumo("salsa-bbq", costosBase, recetasElaboradas);
    expect(costo.toString()).toBe("2");
  });

  it("caso base del enunciado: un plato que usa una salsa preparada cambia de costo si el costo de un ingrediente BASE de la salsa cambia", () => {
    const recetasElaboradas = new Map([
      [
        "salsa-bbq",
        [
          { insumoId: "tomate", cantidad: new Decimal(0.5) },
          { insumoId: "especias", cantidad: new Decimal(0.1) },
        ],
      ],
    ]);

    const costosBaseAntes = new Map([
      ["tomate", new Decimal(2)],
      ["especias", new Decimal(10)],
      ["pollo", new Decimal(5)],
    ]);
    const costoSalsaAntes = resolverCostoUnitarioInsumo("salsa-bbq", costosBaseAntes, recetasElaboradas);

    // Costo del PLATO (1 unidad de pollo + 2oz de salsa BBQ) usando el costo
    // recursivo de la salsa como costoUnitario resuelto de ese insumo.
    const costeoPlatoAntes = calcularCostoLinea({
      productoId: "prod-chop-chop-bowl",
      cantidad: 1,
      recetaBase: [
        { insumoId: "pollo", cantidad: new Decimal(1) },
        { insumoId: "salsa-bbq", cantidad: new Decimal(2) },
      ],
      modificadores: [],
      costosUnitarios: new Map([
        ["pollo", costosBaseAntes.get("pollo")!],
        ["salsa-bbq", costoSalsaAntes],
      ]),
    });
    // pollo 1*5=5 ; salsa 2*2=4 => 9
    expect(costeoPlatoAntes.costoTotalLinea).toBe("9");

    // Sube el costo del tomate (ingrediente BASE de la salsa, no del plato
    // directamente): el costo de la salsa Y del plato deben subir en cascada.
    const costosBaseDespues = new Map(costosBaseAntes);
    costosBaseDespues.set("tomate", new Decimal(4)); // de 2 a 4
    const costoSalsaDespues = resolverCostoUnitarioInsumo("salsa-bbq", costosBaseDespues, recetasElaboradas);
    expect(costoSalsaDespues.greaterThan(costoSalsaAntes)).toBe(true);
    // 0.5*4 + 0.1*10 = 2+1 = 3 (antes era 2)
    expect(costoSalsaDespues.toString()).toBe("3");

    const costeoPlatoDespues = calcularCostoLinea({
      productoId: "prod-chop-chop-bowl",
      cantidad: 1,
      recetaBase: [
        { insumoId: "pollo", cantidad: new Decimal(1) },
        { insumoId: "salsa-bbq", cantidad: new Decimal(2) },
      ],
      modificadores: [],
      costosUnitarios: new Map([
        ["pollo", costosBaseDespues.get("pollo")!],
        ["salsa-bbq", costoSalsaDespues],
      ]),
    });
    // pollo 1*5=5 ; salsa 2*3=6 => 11 (subio de 9 a 11)
    expect(costeoPlatoDespues.costoTotalLinea).toBe("11");
    expect(new Decimal(costeoPlatoDespues.costoTotalLinea).greaterThan(new Decimal(costeoPlatoAntes.costoTotalLinea))).toBe(
      true,
    );
  });

  it("BOM de MAS de un nivel: una salsa elaborada que a su vez usa OTRO insumo elaborado como base", () => {
    // Mayonesa base (elaborada) usa huevo y aceite.
    // Salsa especial (elaborada) usa mayonesa + un poco de chile.
    const recetasElaboradas = new Map([
      [
        "mayonesa",
        [
          { insumoId: "huevo", cantidad: new Decimal(0.2) },
          { insumoId: "aceite", cantidad: new Decimal(0.3) },
        ],
      ],
      [
        "salsa-especial",
        [
          { insumoId: "mayonesa", cantidad: new Decimal(1) },
          { insumoId: "chile", cantidad: new Decimal(0.05) },
        ],
      ],
    ]);
    const costosBase = new Map([
      ["huevo", new Decimal(3)],
      ["aceite", new Decimal(4)],
      ["chile", new Decimal(8)],
    ]);

    // mayonesa: 0.2*3 + 0.3*4 = 0.6+1.2 = 1.8
    const costoMayonesa = resolverCostoUnitarioInsumo("mayonesa", costosBase, recetasElaboradas);
    expect(costoMayonesa.toString()).toBe("1.8");

    // salsa especial: 1*1.8 + 0.05*8 = 1.8+0.4 = 2.2
    const costoSalsaEspecial = resolverCostoUnitarioInsumo("salsa-especial", costosBase, recetasElaboradas);
    expect(costoSalsaEspecial.toString()).toBe("2.2");
  });

  it("un ciclo (defensa en profundidad, ya deberia haber sido rechazado en escritura) no recursa infinito: cae al costoUnitario cacheado del nodo repetido", () => {
    // A usa B, B usa A (dato corrupto que NUNCA deberia poder persistirse via
    // CatalogoService.definirRecetaInsumoElaborado + detectarCicloReceta,
    // pero esta funcion de LECTURA debe sobrevivirlo de todos modos).
    const recetasElaboradas = new Map([
      ["insumo-a", [{ insumoId: "insumo-b", cantidad: new Decimal(1) }]],
      ["insumo-b", [{ insumoId: "insumo-a", cantidad: new Decimal(1) }]],
    ]);
    const costosBase = new Map([
      ["insumo-a", new Decimal(7)], // fallback si se detecta el ciclo sobre "insumo-a"
    ]);

    const resultado = resolverCostoUnitarioInsumo("insumo-a", costosBase, recetasElaboradas);
    // No lanza, no cuelga, y devuelve un numero finito determinista.
    expect(resultado.isFinite()).toBe(true);
    expect(resultado.toString()).toBe("7"); // 1 * costoBase("insumo-b") -> ciclo detectado en "insumo-a" -> fallback 7
  });
});
