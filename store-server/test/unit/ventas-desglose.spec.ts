/**
 * Unit tests puros del desglose de ventas del dia por metodo de pago —
 * HU-REP-01 CA1 (F2-T3).
 */
import { calcularVentasDesglose } from "../../src/reportes/ventas-desglose";

describe("calcularVentasDesglose", () => {
  it("suma subtotal/descuento/impuesto/propina/total de todos los pedidos", () => {
    const resultado = calcularVentasDesglose([
      {
        subtotal: "10.00",
        descuentoTotal: "0",
        impuestoTotal: "0.70",
        propinaTotal: "2.00",
        total: "12.70",
        pagos: [{ metodo: "efectivo", monto: "10.70", propina: "2.00", estado: "aprobado" }],
      },
      {
        subtotal: "20.00",
        descuentoTotal: "1.00",
        impuestoTotal: "1.33",
        propinaTotal: "0",
        total: "20.33",
        pagos: [{ metodo: "tarjeta", monto: "20.33", propina: "0", estado: "aprobado" }],
      },
    ]);

    expect(resultado.numeroPedidos).toBe(2);
    expect(resultado.subtotal.toString()).toBe("30");
    expect(resultado.descuentoTotal.toString()).toBe("1");
    expect(resultado.impuestoTotal.toString()).toBe("2.03");
    expect(resultado.propinaTotal.toString()).toBe("2");
    expect(resultado.total.toString()).toBe("33.03");
    expect(resultado.porMetodoPago.efectivo.toString()).toBe("10.7");
    expect(resultado.porMetodoPago.tarjeta.toString()).toBe("20.33");
    expect(resultado.porMetodoPago.otro.toString()).toBe("0");
  });

  it("solo cuenta pagos con estado='aprobado' en el desglose por metodo (nunca rechazado/encolado/reembolsado)", () => {
    const resultado = calcularVentasDesglose([
      {
        subtotal: "10.00",
        descuentoTotal: "0",
        impuestoTotal: "0",
        propinaTotal: "0",
        total: "10.00",
        pagos: [
          { metodo: "efectivo", monto: "10.00", propina: "0", estado: "aprobado" },
          { metodo: "tarjeta", monto: "999", propina: "0", estado: "rechazado" },
          { metodo: "tarjeta", monto: "999", propina: "0", estado: "encolado" },
        ],
      },
    ]);

    expect(resultado.porMetodoPago.efectivo.toString()).toBe("10");
    expect(resultado.porMetodoPago.tarjeta.toString()).toBe("0");
  });

  it("un pedido cancelado/reembolsado NUNCA debe pasarse a esta funcion (RN-04): si no se incluye, no infla nada", () => {
    // Simula el filtro que hace ReportesService (estado="cobrado" only): un
    // pedido reembolsado (estado="cancelado") simplemente no esta en la lista.
    const soloElCobrado = calcularVentasDesglose([
      {
        subtotal: "10.00",
        descuentoTotal: "0",
        impuestoTotal: "0",
        propinaTotal: "0",
        total: "10.00",
        pagos: [{ metodo: "efectivo", monto: "10.00", propina: "0", estado: "aprobado" }],
      },
    ]);
    expect(soloElCobrado.numeroPedidos).toBe(1);
    expect(soloElCobrado.total.toString()).toBe("10");
  });

  it("lista vacia retorna todos los totales en cero", () => {
    const resultado = calcularVentasDesglose([]);
    expect(resultado.numeroPedidos).toBe(0);
    expect(resultado.total.toString()).toBe("0");
    expect(resultado.porMetodoPago.efectivo.toString()).toBe("0");
  });

  it("propinaPorMetodoPago suma la propina de cada pago aprobado por su propio metodo", () => {
    const resultado = calcularVentasDesglose([
      {
        subtotal: "10.00",
        descuentoTotal: "0",
        impuestoTotal: "0",
        propinaTotal: "3.00",
        total: "13.00",
        pagos: [{ metodo: "efectivo", monto: "10.00", propina: "3.00", estado: "aprobado" }],
      },
    ]);
    expect(resultado.propinaPorMetodoPago.efectivo.toString()).toBe("3");
    expect(resultado.propinaPorMetodoPago.tarjeta.toString()).toBe("0");
  });
});
