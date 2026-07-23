/**
 * Pruebas del codigo de autorizacion gerencial diario
 * (lib/jornada/codigoGerencial.ts): reusa el algoritmo TOTP de
 * lib/jornada/totp.ts con periodo de 1 dia (86400s) en vez de 10s.
 *
 * El reloj se "mockea" pasando `ahoraMs` explicito a las funciones (ambas lo
 * aceptan) -- no se espera un dia real ni se usan fake timers.
 *
 * Runner: Vitest (ver vitest.config.ts / package.json "test").
 */

import { describe, expect, it } from "vitest";

import { getDb, resetDb, UBICACION_PILOTO_ID } from "../../db/store";
import { obtenerCodigoGerencialVigente, validarCodigoGerencial } from "../codigoGerencial";
import { generarCodigoVigente } from "../totp";

// Dos instantes DENTRO del mismo dia UTC (mismo "contador" de 86400s).
const HOY_09AM = Date.UTC(2026, 6, 22, 9, 0, 0); // 2026-07-22 09:00 UTC
const HOY_21PM = Date.UTC(2026, 6, 22, 21, 0, 0); // 2026-07-22 21:00 UTC
// Un instante en el dia SIGUIENTE.
const MANANA_09AM = Date.UTC(2026, 6, 23, 9, 0, 0); // 2026-07-23 09:00 UTC

describe("codigoGerencial", () => {
  it("obtenerCodigoGerencialVigente: el codigo es identico dos veces el MISMO dia", () => {
    resetDb();
    const a = obtenerCodigoGerencialVigente(UBICACION_PILOTO_ID, HOY_09AM);
    const b = obtenerCodigoGerencialVigente(UBICACION_PILOTO_ID, HOY_21PM);
    expect(a.codigo).toBe(b.codigo);
    expect(a.codigo).toMatch(/^\d{6}$/);
  });

  it("obtenerCodigoGerencialVigente: el codigo CAMBIA al dia siguiente", () => {
    resetDb();
    const hoy = obtenerCodigoGerencialVigente(UBICACION_PILOTO_ID, HOY_09AM);
    const manana = obtenerCodigoGerencialVigente(UBICACION_PILOTO_ID, MANANA_09AM);
    expect(hoy.codigo).not.toBe(manana.codigo);
  });

  it("validarCodigoGerencial: el codigo de hoy es valido en cualquier momento de hoy", () => {
    resetDb();
    const { codigo } = obtenerCodigoGerencialVigente(UBICACION_PILOTO_ID, HOY_09AM);
    expect(validarCodigoGerencial(UBICACION_PILOTO_ID, codigo, HOY_09AM)).toBe(true);
    expect(validarCodigoGerencial(UBICACION_PILOTO_ID, codigo, HOY_21PM)).toBe(true);
  });

  it("validarCodigoGerencial: el codigo de HOY deja de ser valido MANANA (sin tolerancia retroactiva)", () => {
    resetDb();
    const { codigo } = obtenerCodigoGerencialVigente(UBICACION_PILOTO_ID, HOY_09AM);
    expect(validarCodigoGerencial(UBICACION_PILOTO_ID, codigo, MANANA_09AM)).toBe(false);
  });

  it("validarCodigoGerencial: un codigo incorrecto o mal formado siempre es invalido", () => {
    resetDb();
    expect(validarCodigoGerencial(UBICACION_PILOTO_ID, "000000", HOY_09AM)).toBe(false);
    expect(validarCodigoGerencial(UBICACION_PILOTO_ID, "abc", HOY_09AM)).toBe(false);
    expect(validarCodigoGerencial(UBICACION_PILOTO_ID, "", HOY_09AM)).toBe(false);
  });

  it("usa un secreto EFECTIVO distinto al secreto TOTP crudo de la ubicacion (separacion de dominio)", () => {
    resetDb();
    const ubicacion = getDb().ubicaciones.find((u) => u.id === UBICACION_PILOTO_ID)!;

    // Codigo gerencial real (con el sufijo de dominio, ver codigoGerencial.ts).
    const gerencial = obtenerCodigoGerencialVigente(UBICACION_PILOTO_ID, HOY_09AM).codigo;
    // Mismo periodo (86400s) y mismo instante, pero usando el secreto CRUDO de
    // la ubicacion (sin el sufijo de separacion de dominio) -- si esto diera
    // el MISMO codigo, el codigo gerencial seria trivialmente el mismo
    // "espacio de codigos" que cualquier otro uso futuro del secreto crudo
    // con periodo 1 dia. Deben diferir: confirma que el sufijo SI cambia el HMAC.
    const sinSeparacionDeDominio = generarCodigoVigente(ubicacion.secretoTotp, HOY_09AM, 86400).codigo;

    expect(gerencial).not.toBe(sinSeparacionDeDominio);
  });
});
