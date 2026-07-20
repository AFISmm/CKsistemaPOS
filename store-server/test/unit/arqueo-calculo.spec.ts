/**
 * Unit tests puros del calculo de arqueo de turno — HU-PAG-08 / F2-T3.
 * Cubre el fix documentado en `src/reportes/arqueo-calculo.ts`: un reembolso
 * en efectivo debe restar del efectivo esperado; uno con tarjeta no.
 */
import { Decimal } from "@prisma/client/runtime/library";
import { calcularArqueoTurno, calcularDiferenciaEfectivo } from "../../src/reportes/arqueo-calculo";

describe("calcularArqueoTurno", () => {
  it("efectivoEsperado = fondoInicial + efectivo cobrado (sin reembolsos)", () => {
    const resultado = calcularArqueoTurno({
      fondoInicial: "100.00",
      pedidosCobrados: [{ total: "33.00", descuentoTotal: "0", impuestoTotal: "3.00" }],
      pagosAprobados: [{ metodo: "efectivo", monto: "33.00", propina: "0" }],
      pagosReembolsados: [],
    });

    expect(resultado.porMetodo.efectivo.toString()).toBe("33");
    expect(resultado.efectivoReembolsado.toString()).toBe("0");
    expect(resultado.efectivoEsperado.toString()).toBe("133");
    expect(resultado.totalVentas.toString()).toBe("33");
    expect(resultado.totalImpuestos.toString()).toBe("3");
  });

  it("un reembolso EN EFECTIVO resta del efectivo esperado (fix del gap pre-F2-T3)", () => {
    const resultado = calcularArqueoTurno({
      fondoInicial: "100.00",
      pedidosCobrados: [],
      pagosAprobados: [{ metodo: "efectivo", monto: "33.00", propina: "0" }],
      // `monto` de un reembolso ya viene negado (ver VentasService.reembolsarPedido).
      pagosReembolsados: [{ metodo: "efectivo", monto: "-33.00" }],
    });

    expect(resultado.efectivoReembolsado.toString()).toBe("33");
    // 100 + 33 - 33 = 100 (el efectivo vuelve al fondo original)
    expect(resultado.efectivoEsperado.toString()).toBe("100");
  });

  it("un reembolso CON TARJETA no afecta el efectivo esperado (va por PSP, no toca el cajon)", () => {
    const resultado = calcularArqueoTurno({
      fondoInicial: "100.00",
      pedidosCobrados: [],
      pagosAprobados: [{ metodo: "efectivo", monto: "20.00", propina: "0" }],
      pagosReembolsados: [{ metodo: "tarjeta", monto: "-50.00" }],
    });

    expect(resultado.efectivoReembolsado.toString()).toBe("0");
    expect(resultado.efectivoEsperado.toString()).toBe("120"); // 100 + 20, el reembolso de tarjeta no resta
  });

  it("suma propinas y totales por metodo de pagos aprobados", () => {
    const resultado = calcularArqueoTurno({
      fondoInicial: "0",
      pedidosCobrados: [],
      pagosAprobados: [
        { metodo: "efectivo", monto: "10.00", propina: "1.00" },
        { metodo: "tarjeta", monto: "20.00", propina: "3.00" },
        { metodo: "otro", monto: "5.00", propina: "0" },
      ],
      pagosReembolsados: [],
    });

    expect(resultado.porMetodo.efectivo.toString()).toBe("10");
    expect(resultado.porMetodo.tarjeta.toString()).toBe("20");
    expect(resultado.porMetodo.otro.toString()).toBe("5");
    expect(resultado.totalPropinas.toString()).toBe("4");
  });

  it("retorna Decimal en todos los campos numericos", () => {
    const resultado = calcularArqueoTurno({
      fondoInicial: 0,
      pedidosCobrados: [],
      pagosAprobados: [],
      pagosReembolsados: [],
    });
    expect(resultado.efectivoEsperado).toBeInstanceOf(Decimal);
    expect(resultado.fondoInicial).toBeInstanceOf(Decimal);
    expect(resultado.porMetodo.efectivo).toBeInstanceOf(Decimal);
  });
});

describe("calcularDiferenciaEfectivo", () => {
  it("positivo cuando el efectivo contado es MAYOR al esperado (sobrante)", () => {
    expect(calcularDiferenciaEfectivo("100.00", "105.00").toString()).toBe("5");
  });

  it("negativo cuando el efectivo contado es MENOR al esperado (faltante)", () => {
    expect(calcularDiferenciaEfectivo("100.00", "95.00").toString()).toBe("-5");
  });

  it("cero cuando coinciden exactamente", () => {
    expect(calcularDiferenciaEfectivo("100.00", "100.00").toString()).toBe("0");
  });
});
