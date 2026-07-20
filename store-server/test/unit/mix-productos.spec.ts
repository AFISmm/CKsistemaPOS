/**
 * Unit tests puros del mix de productos — HU-REP-01 CA2 (F2-T3).
 */
import { Decimal } from "@prisma/client/runtime/library";
import { calcularMixProductos } from "../../src/reportes/mix-productos";

describe("calcularMixProductos", () => {
  it("agrega unidades y monto por productoId a traves de varias lineas/pedidos", () => {
    const resultado = calcularMixProductos([
      { productoId: "p1", descripcion: "Bowl", cantidad: 2, subtotalLinea: "19.90" },
      { productoId: "p2", descripcion: "Wrap", cantidad: 1, subtotalLinea: "8.95" },
      { productoId: "p1", descripcion: "Bowl", cantidad: 1, subtotalLinea: "9.95" },
    ]);

    const p1 = resultado.find((r) => r.productoId === "p1")!;
    expect(p1.unidades).toBe(3);
    expect(p1.monto.toString()).toBe("29.85");

    const p2 = resultado.find((r) => r.productoId === "p2")!;
    expect(p2.unidades).toBe(1);
    expect(p2.monto.toString()).toBe("8.95");
  });

  it("ordena por monto descendente por default", () => {
    const resultado = calcularMixProductos([
      { productoId: "barato", descripcion: "Side", cantidad: 10, subtotalLinea: "35.00" },
      { productoId: "caro", descripcion: "Combo", cantidad: 1, subtotalLinea: "50.00" },
    ]);
    expect(resultado.map((r) => r.productoId)).toEqual(["caro", "barato"]);
  });

  it("ordenarPor='unidades' ordena por unidades descendente, no por monto", () => {
    const resultado = calcularMixProductos(
      [
        { productoId: "barato", descripcion: "Side", cantidad: 10, subtotalLinea: "35.00" },
        { productoId: "caro", descripcion: "Combo", cantidad: 1, subtotalLinea: "50.00" },
      ],
      "unidades",
    );
    expect(resultado.map((r) => r.productoId)).toEqual(["barato", "caro"]);
  });

  it("retorna Decimal (nunca number/float) para el monto", () => {
    const resultado = calcularMixProductos([
      { productoId: "p1", descripcion: "Bowl", cantidad: 1, subtotalLinea: "10.00" },
    ]);
    expect(resultado[0].monto).toBeInstanceOf(Decimal);
  });

  it("lista vacia retorna array vacio", () => {
    expect(calcularMixProductos([])).toEqual([]);
  });
});
