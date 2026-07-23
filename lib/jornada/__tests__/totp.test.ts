/**
 * Pruebas de lib/jornada/totp.ts, en particular que parametrizar
 * `periodoSeg`/`ventanasAtras` (agregado para reusar el algoritmo en
 * lib/jornada/codigoGerencial.ts) NO cambio el comportamiento por defecto ya
 * usado por el chequeo de jornada (periodo 10s, 1 ventana de tolerancia
 * hacia atras).
 *
 * Runner: Vitest (ver vitest.config.ts / package.json "test").
 */

import { describe, expect, it } from "vitest";

import { generarCodigoVigente, validarCodigo } from "../totp";

const SECRETO = "secreto-de-prueba-totp";
const T0 = Date.UTC(2026, 6, 22, 12, 0, 0); // instante base, alineado a un multiplo de 10s

describe("totp", () => {
  it("generarCodigoVigente: por defecto usa el periodo de jornada (10s), sin cambios de comportamiento", () => {
    const a = generarCodigoVigente(SECRETO, T0);
    const b = generarCodigoVigente(SECRETO, T0 + 5000); // 5s despues, misma ventana de 10s
    expect(a.codigo).toBe(b.codigo);

    const c = generarCodigoVigente(SECRETO, T0 + 10_000); // siguiente ventana de 10s
    expect(a.codigo).not.toBe(c.codigo);
  });

  it("validarCodigo: por defecto tolera 1 ventana hacia atras (comportamiento historico de jornada)", () => {
    const { codigo } = generarCodigoVigente(SECRETO, T0);

    expect(validarCodigo(SECRETO, codigo, T0)).toBe(true);
    expect(validarCodigo(SECRETO, codigo, T0 + 10_000)).toBe(true); // 1 ventana despues: tolerado
    expect(validarCodigo(SECRETO, codigo, T0 + 20_000)).toBe(false); // 2 ventanas despues: ya no
  });

  it("validarCodigo: ventanasAtras:0 elimina la tolerancia retroactiva (usado por el codigo gerencial)", () => {
    const { codigo } = generarCodigoVigente(SECRETO, T0);

    expect(validarCodigo(SECRETO, codigo, T0, { ventanasAtras: 0 })).toBe(true);
    expect(validarCodigo(SECRETO, codigo, T0 + 10_000, { ventanasAtras: 0 })).toBe(false);
  });

  it("generarCodigoVigente/validarCodigo: periodoSeg largo (1 dia) rota una vez al dia", () => {
    const UN_DIA_MS = 86_400_000;
    const { codigo: hoy } = generarCodigoVigente(SECRETO, T0, 86_400);
    const { codigo: masTardeHoy } = generarCodigoVigente(SECRETO, T0 + 3600_000, 86_400);
    const { codigo: manana } = generarCodigoVigente(SECRETO, T0 + UN_DIA_MS, 86_400);

    expect(hoy).toBe(masTardeHoy);
    expect(hoy).not.toBe(manana);
    expect(validarCodigo(SECRETO, hoy, T0 + 3600_000, { periodoSeg: 86_400, ventanasAtras: 0 })).toBe(true);
    expect(validarCodigo(SECRETO, hoy, T0 + UN_DIA_MS, { periodoSeg: 86_400, ventanasAtras: 0 })).toBe(false);
  });
});
