/**
 * Test de bytes EXACTOS de los comandos ESC/POS (F2-T4, `hardware-perifericos-pos`).
 * Puro, sin red y sin NestJS: valida que `src/hardware/esc-pos.ts` emite
 * literalmente los bytes documentados en la especificacion publica ESC/POS
 * (Epson "ESC/POS Command Reference", el mismo subconjunto que soportan las
 * impresoras recomendadas en ADR-0006 F0-T3 — Epson TM-m30III / Star
 * TSP143IV en modo compatible ESC/POS):
 *
 *   - `ESC @`         = 0x1B 0x40             (Initialize printer)
 *   - `ESC E n`       = 0x1B 0x45 n           (Bold on/off)
 *   - `ESC a n`       = 0x1B 0x61 n           (Justification: 0/1/2)
 *   - `GS !  n`       = 0x1D 0x21 n           (Character size, nibble alto=ancho-1, nibble bajo=alto-1)
 *   - `GS V m`        = 0x1D 0x56 m           (Cut paper: 0x00 total, 0x01 parcial)
 *   - `ESC p m t1 t2` = 0x1B 0x70 m t1 t2     (Generate pulse / drawer kick)
 *
 * Esta es la parte de F2-T4 que debe ser byte-perfecta: es codigo de
 * protocolo real (no un mock), aunque nunca se haya probado contra hardware
 * fisico en este entorno (ver store-server/README.md seccion "Hardware").
 */
import {
  comandoAbrirCajon,
  comandoAlineacion,
  comandoCorte,
  comandoInicializar,
  comandoNegrita,
  comandoSaltoLinea,
  comandoTamano,
  comandoTexto,
  concatenarComandos,
} from "../../src/hardware/esc-pos";

describe("esc-pos.ts — bytes exactos por comando", () => {
  it("comandoInicializar() = ESC @ (0x1B 0x40)", () => {
    expect(comandoInicializar()).toEqual(Buffer.from([0x1b, 0x40]));
  });

  it("comandoNegrita(true) = ESC E 1 (0x1B 0x45 0x01)", () => {
    expect(comandoNegrita(true)).toEqual(Buffer.from([0x1b, 0x45, 0x01]));
  });

  it("comandoNegrita(false) = ESC E 0 (0x1B 0x45 0x00)", () => {
    expect(comandoNegrita(false)).toEqual(Buffer.from([0x1b, 0x45, 0x00]));
  });

  it("comandoAlineacion — izquierda/centro/derecha = ESC a 0/1/2", () => {
    expect(comandoAlineacion("izquierda")).toEqual(Buffer.from([0x1b, 0x61, 0x00]));
    expect(comandoAlineacion("centro")).toEqual(Buffer.from([0x1b, 0x61, 0x01]));
    expect(comandoAlineacion("derecha")).toEqual(Buffer.from([0x1b, 0x61, 0x02]));
  });

  it("comandoTamano(1,1) = GS ! 0x00 (tamano normal)", () => {
    expect(comandoTamano(1, 1)).toEqual(Buffer.from([0x1d, 0x21, 0x00]));
  });

  it("comandoTamano(2,2) = GS ! 0x11 (doble ancho y doble alto)", () => {
    expect(comandoTamano(2, 2)).toEqual(Buffer.from([0x1d, 0x21, 0x11]));
  });

  it("comandoTamano clampa multiplicadores fuera de 1-8 sin desbordar el nibble", () => {
    // ancho=0 clampa a 1 (nibble alto = 1-1 = 0), alto=20 clampa a 8 (nibble bajo = 8-1 = 7) -> n = 0x07
    expect(comandoTamano(0, 20)).toEqual(Buffer.from([0x1d, 0x21, 0x07]));
  });

  it("comandoCorte(false) = GS V 0x00 (corte total)", () => {
    expect(comandoCorte(false)).toEqual(Buffer.from([0x1d, 0x56, 0x00]));
  });

  it("comandoCorte(true) = GS V 0x01 (corte parcial)", () => {
    expect(comandoCorte(true)).toEqual(Buffer.from([0x1d, 0x56, 0x01]));
  });

  it("comandoAbrirCajon() default = ESC p 0 25 250 (pulso pin 2, ~50ms ON / ~500ms OFF)", () => {
    expect(comandoAbrirCajon()).toEqual(Buffer.from([0x1b, 0x70, 0x00, 25, 250]));
  });

  it("comandoAbrirCajon(1, 10, 100) respeta pin/t1/t2 explicitos", () => {
    expect(comandoAbrirCajon(1, 10, 100)).toEqual(Buffer.from([0x1b, 0x70, 0x01, 10, 100]));
  });

  it("comandoTexto() codifica ASCII 1:1", () => {
    expect(comandoTexto("AB")).toEqual(Buffer.from([0x41, 0x42]));
  });

  it("comandoSaltoLinea(n) emite n bytes 0x0A (LF)", () => {
    expect(comandoSaltoLinea(1)).toEqual(Buffer.from([0x0a]));
    expect(comandoSaltoLinea(3)).toEqual(Buffer.from([0x0a, 0x0a, 0x0a]));
    expect(comandoSaltoLinea(0)).toEqual(Buffer.from([]));
  });

  it("concatenarComandos concatena en orden sin alterar bytes", () => {
    const resultado = concatenarComandos(comandoInicializar(), comandoNegrita(true), comandoTexto("X"));
    expect(resultado).toEqual(Buffer.from([0x1b, 0x40, 0x1b, 0x45, 0x01, 0x58]));
  });
});

describe("trabajos-impresion.ts — composicion de trabajos completos", () => {
  // Importado aqui (no arriba) para dejar claro que esta seccion prueba la
  // COMPOSICION (orden/presencia de comandos), no bytes sueltos.
  const { construirTrabajoRecibo, construirTrabajoComandaCocina, construirTrabajoAbrirCajon } =
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require("../../src/hardware/trabajos-impresion");

  it("construirTrabajoRecibo empieza con ESC @ y termina con GS V (corte)", () => {
    const buffer: Buffer = construirTrabajoRecibo({
      pedidoId: "p1",
      numeroOrden: 42,
      ubicacionId: "u1",
      lineas: [{ descripcion: "Combo Pollo", cantidad: 2, precioUnitario: "8.99", subtotalLinea: "17.98" }],
      subtotal: "17.98",
      descuentoTotal: "0.00",
      impuestoTotal: "1.26",
      propinaTotal: "0.00",
      total: "19.24",
      metodoPago: "efectivo",
      montoRecibido: "20.00",
      cambio: "0.76",
    });

    expect(buffer.subarray(0, 2)).toEqual(Buffer.from([0x1b, 0x40]));
    expect(buffer.subarray(-3)).toEqual(Buffer.from([0x1d, 0x56, 0x00]));
    expect(buffer.includes(Buffer.from("Combo Pollo", "ascii"))).toBe(true);
    expect(buffer.includes(Buffer.from("19.24", "ascii"))).toBe(true);
  });

  it("construirTrabajoComandaCocina empieza con ESC @ y termina con GS V (corte)", () => {
    const buffer: Buffer = construirTrabajoComandaCocina({
      pedidoId: "p1",
      numeroOrden: 42,
      ubicacionId: "u1",
      liberacionParcial: false,
      lineas: [{ descripcion: "Combo Pollo", cantidad: 1, notas: "sin sal", modificadores: ["Extra queso"] }],
    });

    expect(buffer.subarray(0, 2)).toEqual(Buffer.from([0x1b, 0x40]));
    expect(buffer.subarray(-3)).toEqual(Buffer.from([0x1d, 0x56, 0x00]));
    expect(buffer.includes(Buffer.from("Extra queso", "ascii"))).toBe(true);
    expect(buffer.includes(Buffer.from("sin sal", "ascii"))).toBe(true);
  });

  it("construirTrabajoAbrirCajon() = exactamente el comando de pulso (sin nada mas)", () => {
    expect(construirTrabajoAbrirCajon()).toEqual(Buffer.from([0x1b, 0x70, 0x00, 25, 250]));
  });
});
