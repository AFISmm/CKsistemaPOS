/**
 * Unit tests de `calcularCostoLinea` (F2-T1, "Costeo por combinacion / BOM
 * por variante"). PUROS: no tocan Prisma/DB, todos los insumos ya vienen
 * resueltos por el llamador (ver src/costeo/costeo.service.ts para el
 * envoltorio que SI consulta la base real).
 */
import { Decimal } from "@prisma/client/runtime/library";
import { calcularCostoLinea } from "../../src/costeo/costeo.types";
import type { ComboComponenteSeleccionado, ModificadorResuelto } from "../../src/costeo/costeo.types";

describe("CosteoService — calcularCostoLinea (F2-T1)", () => {
  it("producto base sin modificadores: costo = receta base * costo unitario * cantidad", () => {
    const costosUnitarios = new Map([
      ["insu-chicken", new Decimal(5)], // $5/lb
      ["insu-rice", new Decimal(1)], // $1/lb
    ]);

    const resultado = calcularCostoLinea({
      productoId: "prod-bowl-classic",
      cantidad: 3,
      recetaBase: [
        { insumoId: "insu-chicken", cantidad: new Decimal(0.35) },
        { insumoId: "insu-rice", cantidad: new Decimal(0.4) },
      ],
      modificadores: [],
      costosUnitarios,
    });

    // Por unidad: 0.35*5 + 0.4*1 = 1.75 + 0.4 = 2.15 ; * 3 unidades = 6.45
    expect(resultado.costoTotalLinea).toBe("6.45");
    expect(resultado.costoUnitarioLinea).toBe("2.15");
    expect(resultado.desglose).toHaveLength(2);
    const chicken = resultado.desglose.find((d) => d.insumoId === "insu-chicken");
    expect(chicken?.cantidadTotal).toBe("1.05"); // 0.35 * 3
    expect(chicken?.costoTotal).toBe("5.25"); // 1.05 * 5
  });

  it('producto + modificador "agregar" (extra queso): el costo sube respecto de la base', () => {
    const costosUnitarios = new Map([
      ["insu-chicken", new Decimal(5)],
      ["insu-cheese", new Decimal(4)],
    ]);

    const base = calcularCostoLinea({
      productoId: "prod-cheesadilla-chicken",
      cantidad: 1,
      recetaBase: [
        { insumoId: "insu-chicken", cantidad: new Decimal(0.3) },
        { insumoId: "insu-cheese", cantidad: new Decimal(0.2) },
      ],
      modificadores: [],
      costosUnitarios,
    });

    const modificadorExtraQueso: ModificadorResuelto = {
      modificadorId: "mod-extra-queso",
      descripcion: "Extra Cheese",
      tipo: "agregar",
      deltas: [{ insumoId: "insu-cheese", cantidad: new Decimal(0.1) }],
    };

    const conAgregar = calcularCostoLinea({
      productoId: "prod-cheesadilla-chicken",
      cantidad: 1,
      recetaBase: [
        { insumoId: "insu-chicken", cantidad: new Decimal(0.3) },
        { insumoId: "insu-cheese", cantidad: new Decimal(0.2) },
      ],
      modificadores: [modificadorExtraQueso],
      costosUnitarios,
    });

    expect(new Decimal(conAgregar.costoTotalLinea).greaterThan(new Decimal(base.costoTotalLinea))).toBe(true);
    // Base: 0.3*5 + 0.2*4 = 1.5+0.8 = 2.30 ; con +0.1 queso: 0.3*5 + 0.3*4 = 1.5+1.2 = 2.70
    expect(base.costoTotalLinea).toBe("2.3");
    expect(conAgregar.costoTotalLinea).toBe("2.7");
  });

  it('producto + modificador "sin" (sin queso): el costo baja respecto de la base', () => {
    const costosUnitarios = new Map([
      ["insu-chicken", new Decimal(5)],
      ["insu-cheese", new Decimal(4)],
    ]);

    const recetaBase = [
      { insumoId: "insu-chicken", cantidad: new Decimal(0.3) },
      { insumoId: "insu-cheese", cantidad: new Decimal(0.2) },
    ];

    const base = calcularCostoLinea({
      productoId: "prod-cheesadilla-chicken",
      cantidad: 1,
      recetaBase,
      modificadores: [],
      costosUnitarios,
    });

    const modificadorSinQueso: ModificadorResuelto = {
      modificadorId: "mod-sin-queso",
      descripcion: "Sin Queso",
      tipo: "sin",
      deltas: [{ insumoId: "insu-cheese", cantidad: new Decimal(-0.2) }], // resta TODO el queso de la receta base
    };

    const sinQueso = calcularCostoLinea({
      productoId: "prod-cheesadilla-chicken",
      cantidad: 1,
      recetaBase,
      modificadores: [modificadorSinQueso],
      costosUnitarios,
    });

    expect(new Decimal(sinQueso.costoTotalLinea).lessThan(new Decimal(base.costoTotalLinea))).toBe(true);
    // Base 2.30 ; sin queso: solo pollo 0.3*5 = 1.50
    expect(base.costoTotalLinea).toBe("2.3");
    expect(sinQueso.costoTotalLinea).toBe("1.5");
    // El insumo "insu-cheese" neteado a 0 no debe aparecer en el desglose (queda fuera, no en 0 explicito)
    expect(sinQueso.desglose.find((d) => d.insumoId === "insu-cheese")).toBeUndefined();
  });

  it("un modificador que resta MAS de lo que la receta base tiene nunca produce cantidad/costo negativo (clamp a 0)", () => {
    const costosUnitarios = new Map([["insu-cheese", new Decimal(4)]]);
    const resultado = calcularCostoLinea({
      productoId: "prod-x",
      cantidad: 1,
      recetaBase: [{ insumoId: "insu-cheese", cantidad: new Decimal(0.2) }],
      modificadores: [
        {
          modificadorId: "mod-sin-queso-exagerado",
          tipo: "sin",
          deltas: [{ insumoId: "insu-cheese", cantidad: new Decimal(-0.5) }],
        },
      ],
      costosUnitarios,
    });
    expect(resultado.costoTotalLinea).toBe("0");
    expect(resultado.desglose).toHaveLength(0);
  });

  it("combo: dos selecciones de slot distintas para el MISMO combo (mismo precio) producen costos DIFERENTES", () => {
    const costosUnitarios = new Map([
      ["insu-chicken", new Decimal(5)],
      ["insu-tortilla", new Decimal(0.5)],
      ["insu-cheese", new Decimal(4)],
      ["insu-corn", new Decimal(2)], // side A: Corn Mix, mas barato
      ["insu-guacamole", new Decimal(8)], // side B: Guacamole, mas caro
    ]);

    // Receta base del combo "envoltorio" (el sandwich en si, sin el lado).
    const recetaBaseCombo = [
      { insumoId: "insu-chicken", cantidad: new Decimal(0.3) },
      { insumoId: "insu-tortilla", cantidad: new Decimal(1) },
      { insumoId: "insu-cheese", cantidad: new Decimal(0.2) },
    ];

    const conCornMix: ComboComponenteSeleccionado = {
      productoId: "prod-side-corn-mix",
      insumos: [{ insumoId: "insu-corn", cantidad: new Decimal(0.25) }],
    };
    const conGuacamole: ComboComponenteSeleccionado = {
      productoId: "prod-side-guacamole",
      insumos: [{ insumoId: "insu-guacamole", cantidad: new Decimal(0.2) }],
    };

    const costoConCornMix = calcularCostoLinea({
      productoId: "prod-cheesadilla-combo",
      cantidad: 1,
      recetaBase: recetaBaseCombo,
      modificadores: [],
      comboSeleccion: [conCornMix],
      costosUnitarios,
    });

    const costoConGuacamole = calcularCostoLinea({
      productoId: "prod-cheesadilla-combo",
      cantidad: 1,
      recetaBase: recetaBaseCombo,
      modificadores: [],
      comboSeleccion: [conGuacamole],
      costosUnitarios,
    });

    // Mismo producto/precio de venta (fijo, HU-MOS-02), pero costo real distinto.
    expect(costoConCornMix.costoTotalLinea).not.toBe(costoConGuacamole.costoTotalLinea);
    // Base (pollo+tortilla+queso) = 1.5 + 0.5 + 0.8 = 2.80
    // + Corn Mix (0.25*2=0.5) = 3.30 ; + Guacamole (0.2*8=1.6) = 4.40
    expect(costoConCornMix.costoTotalLinea).toBe("3.3");
    expect(costoConGuacamole.costoTotalLinea).toBe("4.4");
    expect(new Decimal(costoConGuacamole.costoTotalLinea).greaterThan(new Decimal(costoConCornMix.costoTotalLinea))).toBe(
      true,
    );
  });

  it("un insumo sin costo unitario conocido (fuera del mapa) cuesta 0, no rompe el calculo", () => {
    const resultado = calcularCostoLinea({
      productoId: "prod-x",
      cantidad: 2,
      recetaBase: [{ insumoId: "insu-desconocido", cantidad: new Decimal(1) }],
      modificadores: [],
      costosUnitarios: new Map(),
    });
    expect(resultado.costoTotalLinea).toBe("0");
    expect(resultado.desglose[0].costoUnitario).toBe("0");
  });
});
