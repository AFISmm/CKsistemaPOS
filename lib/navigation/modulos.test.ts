/**
 * Pruebas unitarias de la logica de conteo de modulos "reales" del sidebar
 * (Fase A, revision 2026-07-22 seccion 2.5 — ver comentario largo en
 * modulos.ts sobre la regla de conteo de "/" Inicio). Vitest (ver
 * vitest.config.ts).
 */

import { describe, expect, test } from "vitest";
import type { Rol } from "../domain/types";
import {
  modulosRealesVisiblesParaRol,
  modulosVisiblesParaRol,
  moduloUnicoVisibleParaRol,
} from "./modulos";

function rol(permisos: string[]): Rol {
  return { id: "rol-test", nombre: "test", permisos };
}

describe("modulosRealesVisiblesParaRol", () => {
  test("excluye siempre '/' (Inicio), incluso cuando es el unico modulo visible", () => {
    const reales = modulosRealesVisiblesParaRol(rol([]));
    expect(reales.some((m) => m.href === "/")).toBe(false);
    expect(reales).toHaveLength(0);
  });

  test("rol-cajero (solo pedido.crear) tiene EXACTAMENTE 1 modulo real, aunque modulosVisiblesParaRol incluya Inicio + /pos (2)", () => {
    const rolCajero = rol(["pedido.crear", "producto.marcar86"]);
    expect(modulosVisiblesParaRol(rolCajero)).toHaveLength(2); // "/" + "/pos"
    expect(modulosRealesVisiblesParaRol(rolCajero)).toHaveLength(1);
    expect(modulosRealesVisiblesParaRol(rolCajero)[0].href).toBe("/pos");
  });

  test("rol-cocina (solo cocina.actualizarEstado) tiene EXACTAMENTE 1 modulo real: /kds", () => {
    const rolCocina = rol(["cocina.actualizarEstado"]);
    expect(modulosRealesVisiblesParaRol(rolCocina).map((m) => m.href)).toEqual(["/kds"]);
  });

  test("rol-gerente (multiples permisos gerenciales) tiene 2+ modulos reales", () => {
    const rolGerente = rol([
      "pedido.crear",
      "empleados.gestionar",
      "nomina.ver",
      "menu.gestionar",
      "cocina.actualizarEstado",
      "reportes.ver",
    ]);
    expect(modulosRealesVisiblesParaRol(rolGerente).length).toBeGreaterThanOrEqual(2);
  });

  test("un rol con SOLO 'nomina.ver' (sin empleados.gestionar) igual cuenta el modulo padre 'Personal' como 1 modulo real", () => {
    const rolSoloNomina = rol(["nomina.ver"]);
    expect(modulosRealesVisiblesParaRol(rolSoloNomina).map((m) => m.href)).toEqual(["/empleados"]);
  });
});

describe("moduloUnicoVisibleParaRol", () => {
  test("devuelve el modulo cuando hay exactamente 1 modulo real", () => {
    const rolCajero = rol(["pedido.crear"]);
    expect(moduloUnicoVisibleParaRol(rolCajero)?.href).toBe("/pos");
  });

  test("devuelve null cuando hay 2+ modulos reales (rol-gerente)", () => {
    const rolGerente = rol(["pedido.crear", "empleados.gestionar", "menu.gestionar"]);
    expect(moduloUnicoVisibleParaRol(rolGerente)).toBeNull();
  });

  test("devuelve null cuando hay 0 modulos reales (rol sin permisos)", () => {
    expect(moduloUnicoVisibleParaRol(rol([]))).toBeNull();
  });

  test("devuelve null cuando no hay rol (sesion no resuelta / sin login)", () => {
    expect(moduloUnicoVisibleParaRol(null)).toBeNull();
    expect(moduloUnicoVisibleParaRol(undefined)).toBeNull();
  });
});
