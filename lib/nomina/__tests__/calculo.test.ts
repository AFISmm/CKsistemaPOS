/**
 * Pruebas unitarias del Reporte de Horas (nomina-pos) — DUENO: nomina-pos.
 * Runner: Vitest (mismo patron que components/pos/__tests__/api.test.ts).
 *
 * Cubren la reduccion de alcance S-17 (ver docs/requisitos.md y
 * docs/analisis-revision-20260722-modulos-innovacion-seguridad.md):
 * `correrNomina` ya NO calcula tarifa/hora, retencion ni neto a pagar — esos
 * campos deben quedar SIEMPRE en 0 — y el reporte se limita a horas
 * regulares/extra (regla DEMO >40h/semana) mas propinas de referencia.
 */

import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "@/lib/db/store";
import { correrNomina, listarRecibos } from "../calculo";

function fechaISOHaceDias(dias: number): string {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  return d.toISOString().slice(0, 10);
}

describe("lib/nomina/calculo.ts — correrNomina (Reporte de Horas, S-17)", () => {
  beforeEach(() => {
    resetDb();
  });

  it("nunca calcula bruto/retencion/neto: quedan siempre en 0 (decision de alcance S-17)", () => {
    const recibos = correrNomina({
      periodoInicio: fechaISOHaceDias(15),
      periodoFin: fechaISOHaceDias(0),
    });

    expect(recibos.length).toBeGreaterThan(0);
    for (const r of recibos) {
      expect(r.brutoCentavos).toBe(0);
      expect(r.retencionCentavos).toBe(0);
      expect(r.netoCentavos).toBe(0);
    }
  });

  it("reporta horas regulares y extra (>40h/semana) a partir de los marcajes sembrados de emp-jose-cajero-tx (trabaja L-S, 48h/semana)", () => {
    const recibos = correrNomina({
      periodoInicio: fechaISOHaceDias(15),
      periodoFin: fechaISOHaceDias(0),
      empleadoId: "emp-jose-cajero-tx",
    });

    expect(recibos).toHaveLength(1);
    const [recibo] = recibos;
    expect(recibo.empleadoId).toBe("emp-jose-cajero-tx");
    expect(recibo.horasRegularesMin).toBeGreaterThan(0);
    // Jose trabaja L-S (48h/semana) en la semana en curso del seed => debe
    // superar el limite DEMO de 40h/semana y generar horas extra.
    expect(recibo.horasExtraMin).toBeGreaterThan(0);
    // Campos de pago retirados de alcance (S-17): siempre 0, nunca derivados
    // de horasExtraMin/horasRegularesMin ni de tarifaHoraCentavos.
    expect(recibo.brutoCentavos).toBe(0);
    expect(recibo.retencionCentavos).toBe(0);
    expect(recibo.netoCentavos).toBe(0);
  });

  it("propinasCentavos sigue siendo un dato de referencia (no afecta bruto/retencion/neto, que quedan en 0)", () => {
    const recibos = correrNomina({
      periodoInicio: fechaISOHaceDias(15),
      periodoFin: fechaISOHaceDias(0),
    });

    for (const r of recibos) {
      expect(typeof r.propinasCentavos).toBe("number");
      expect(r.propinasCentavos).toBeGreaterThanOrEqual(0);
      expect(r.netoCentavos).toBe(0); // no se suma propina a un "neto" real: ya no existe ese calculo
    }
  });

  it("listarRecibos devuelve los recibos generados, mas recientes primero", () => {
    correrNomina({ periodoInicio: fechaISOHaceDias(15), periodoFin: fechaISOHaceDias(0) });
    const recibos = listarRecibos();

    expect(recibos.length).toBeGreaterThan(0);
    for (let i = 1; i < recibos.length; i++) {
      expect(recibos[i - 1].generadoEn >= recibos[i].generadoEn).toBe(true);
    }
  });

  it("rechaza un rango de fechas invertido (periodoInicio posterior a periodoFin)", () => {
    expect(() =>
      correrNomina({ periodoInicio: fechaISOHaceDias(0), periodoFin: fechaISOHaceDias(5) })
    ).toThrow();
  });
});
