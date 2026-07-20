/**
 * Unit tests del motor de calculo de totales (backend-ventas-pos, §9.2).
 * Puros: sin Prisma, sin Nest, sin red — deben correr en cualquier entorno
 * (ver ADR-0007 punto 5 y store-server/README.md).
 */
import { Decimal } from "@prisma/client/runtime/library";
import { calcularTotales } from "../../src/ventas/calculo-totales";

describe("calcularTotales", () => {
  it("calcula subtotal e impuesto sobre lineas 100% gravables sin descuento", () => {
    const resultado = calcularTotales({
      lineas: [
        { subtotalLinea: "10.00", gravable: true },
        { subtotalLinea: "5.00", gravable: true },
      ],
      descuentoTotal: 0,
      tasaImpuesto: "0.07",
      propinaTotal: 0,
    });

    expect(resultado.subtotal.toString()).toBe("15");
    expect(resultado.baseGravable.toString()).toBe("15");
    // 15 * 0.07 = 1.05
    expect(resultado.impuestoTotal.toString()).toBe("1.05");
    expect(resultado.total.toString()).toBe("16.05");
  });

  it("RN-02: la propina NUNCA genera impuesto", () => {
    const conPropina = calcularTotales({
      lineas: [{ subtotalLinea: "10.00", gravable: true }],
      descuentoTotal: 0,
      tasaImpuesto: "0.08",
      propinaTotal: "5.00",
    });
    const sinPropina = calcularTotales({
      lineas: [{ subtotalLinea: "10.00", gravable: true }],
      descuentoTotal: 0,
      tasaImpuesto: "0.08",
      propinaTotal: 0,
    });

    // El impuesto es identico con o sin propina: la propina no altera la base gravable.
    expect(conPropina.impuestoTotal.toString()).toBe(sinPropina.impuestoTotal.toString());
    expect(conPropina.total.toString()).toBe("15.8"); // 10 + 0.80 impuesto + 5 propina, sin impuesto sobre la propina
  });

  it("productos exentos (gravable=false) no aportan a la base gravable", () => {
    const resultado = calcularTotales({
      lineas: [
        { subtotalLinea: "10.00", gravable: true },
        { subtotalLinea: "2.50", gravable: false }, // ej. bebida exenta
      ],
      descuentoTotal: 0,
      tasaImpuesto: "0.10",
      propinaTotal: 0,
    });

    expect(resultado.subtotal.toString()).toBe("12.5");
    expect(resultado.subtotalGravable.toString()).toBe("10");
    expect(resultado.impuestoTotal.toString()).toBe("1"); // 10 * 0.10
  });

  it("RN-01/RN-03: el impuesto se calcula sobre el subtotal gravable TRAS descuento (prorrateado)", () => {
    // 80% gravable, 20% exento. Descuento de $10 se prorratea 8/2.
    const resultado = calcularTotales({
      lineas: [
        { subtotalLinea: "40.00", gravable: true },
        { subtotalLinea: "10.00", gravable: false },
      ],
      descuentoTotal: "10.00",
      tasaImpuesto: "0.10",
      propinaTotal: 0,
    });

    // subtotal = 50, proporcionGravable = 0.8, descuentoSobreGravable = 8
    // baseGravable = 40 - 8 = 32; impuesto = 32 * 0.10 = 3.20
    expect(resultado.baseGravable.toString()).toBe("32");
    expect(resultado.impuestoTotal.toString()).toBe("3.2");
    expect(resultado.total.toString()).toBe("43.2"); // 50 - 10 + 3.2
  });

  it("acota el descuento a [0, subtotal] (nunca deja el pedido en negativo)", () => {
    const resultado = calcularTotales({
      lineas: [{ subtotalLinea: "10.00", gravable: true }],
      descuentoTotal: "999.00", // descuento mayor al subtotal
      tasaImpuesto: "0.07",
      propinaTotal: 0,
    });

    expect(resultado.descuentoTotal.toString()).toBe("10");
    expect(resultado.baseGravable.toString()).toBe("0");
    expect(resultado.impuestoTotal.toString()).toBe("0");
    expect(resultado.total.toString()).toBe("0");
  });

  it("redondea el impuesto al centavo (RN-08) con HALF_UP", () => {
    // baseGravable = 10, tasa = 0.0825 => 0.825 -> redondea a 0.83
    const resultado = calcularTotales({
      lineas: [{ subtotalLinea: "10.00", gravable: true }],
      descuentoTotal: 0,
      tasaImpuesto: "0.0825",
      propinaTotal: 0,
    });
    expect(resultado.impuestoTotal.toString()).toBe("0.83");
  });

  it("retorna Decimal (nunca number/float) en todos los campos", () => {
    const resultado = calcularTotales({
      lineas: [{ subtotalLinea: "1.00", gravable: true }],
      descuentoTotal: 0,
      tasaImpuesto: "0.07",
      propinaTotal: 0,
    });
    for (const valor of Object.values(resultado)) {
      expect(valor).toBeInstanceOf(Decimal);
    }
  });
});
