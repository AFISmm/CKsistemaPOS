/**
 * SimuladorImpresoraAdapter (F2-T4): DEFAULT sin `IMPRESORA_HOST`. Debe
 * loguear una representacion legible del recibo/comanda/apertura de cajon y
 * NUNCA lanzar (ni siquiera con datos minimos/vacios) — un fallo del
 * simulador no tiene sentido de negocio (no hay hardware real detras) y
 * romper aqui bloquearia ventas en cualquier entorno de desarrollo/sandbox
 * sin impresora.
 */
import { Logger } from "@nestjs/common";
import { SimuladorImpresoraAdapter } from "../../src/hardware/simulador-impresora.adapter";
import type { DatosComandaCocina, DatosRecibo } from "../../src/hardware/impresora-adapter.interface";

describe("SimuladorImpresoraAdapter", () => {
  let logSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    logSpy = jest.spyOn(Logger.prototype, "log").mockImplementation(() => undefined);
    warnSpy = jest.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
  });

  afterEach(() => {
    logSpy.mockRestore();
    warnSpy.mockRestore();
  });

  it("loguea un warning explicito al construirse (no es hardware real)", () => {
    new SimuladorImpresoraAdapter();
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][0]).toMatch(/IMPRESORA_HOST no configurado/);
  });

  it("imprimirRecibo no lanza y loguea una representacion legible con el total", async () => {
    const adapter = new SimuladorImpresoraAdapter();
    const datos: DatosRecibo = {
      pedidoId: "pedido-1",
      numeroOrden: 7,
      ubicacionId: "ubic-1",
      lineas: [{ descripcion: "Combo Pollo", cantidad: 1, precioUnitario: "8.99", subtotalLinea: "8.99" }],
      subtotal: "8.99",
      descuentoTotal: "0.00",
      impuestoTotal: "0.63",
      propinaTotal: "0.00",
      total: "9.62",
      metodoPago: "efectivo",
      montoRecibido: "10.00",
      cambio: "0.38",
    };

    await expect(adapter.imprimirRecibo(datos)).resolves.toBeUndefined();
    const logueado = logSpy.mock.calls.map((c) => String(c[0])).join("\n");
    expect(logueado).toContain("RECIBO");
    expect(logueado).toContain("9.62");
    expect(logueado).toContain("Combo Pollo");
  });

  it("imprimirComandaCocina no lanza y loguea las lineas/modificadores/notas", async () => {
    const adapter = new SimuladorImpresoraAdapter();
    const datos: DatosComandaCocina = {
      pedidoId: "pedido-1",
      numeroOrden: 7,
      ubicacionId: "ubic-1",
      liberacionParcial: true,
      lineas: [{ descripcion: "Combo Pollo", cantidad: 1, notas: "sin sal", modificadores: ["Extra queso"] }],
    };

    await expect(adapter.imprimirComandaCocina(datos)).resolves.toBeUndefined();
    const logueado = logSpy.mock.calls.map((c) => String(c[0])).join("\n");
    expect(logueado).toContain("COMANDA");
    expect(logueado).toContain("liberacion parcial");
    expect(logueado).toContain("Extra queso");
    expect(logueado).toContain("sin sal");
  });

  it("abrirCajon no lanza y deja claro que es un pulso simulado", async () => {
    const adapter = new SimuladorImpresoraAdapter();
    await expect(adapter.abrirCajon()).resolves.toBeUndefined();
    const logueado = logSpy.mock.calls.map((c) => String(c[0])).join("\n");
    expect(logueado).toMatch(/pulso SIMULADO/i);
  });
});
