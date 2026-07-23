/**
 * Pruebas unitarias de lib/rrhh/empleados.ts enfocadas en el flujo de Fase A
 * (revision 2026-07-22 seccion 2.2): edicion de `tarifaHoraCentavos`
 * independiente del rol, y su evento de auditoria dedicado. Runner: Vitest.
 */

import { beforeEach, describe, expect, it } from "vitest";
import { getDb, resetDb, UBICACION_PILOTO_ID } from "../../db/store";
import { crearEmpleado, editarEmpleado } from "../empleados";
import { ErrorRrhh } from "../errores";

beforeEach(() => {
  resetDb();
});

function empleadoDePrueba(tarifaHoraCentavos = 1500) {
  return crearEmpleado({
    ubicacionId: UBICACION_PILOTO_ID,
    nombre: "Empleado Test Tarifa",
    email: `tarifa-test-${Date.now()}@example.com`,
    telefono: "555-0001",
    rolId: getDb().roles[0].id,
    tarifaHoraCentavos,
  });
}

describe("editarEmpleado - tarifaHoraCentavos", () => {
  it("actualiza la tarifa de UN empleado sin afectar su rol", () => {
    const empleado = empleadoDePrueba(1500);
    const actualizado = editarEmpleado(empleado.id, { tarifaHoraCentavos: 2200 });
    expect(actualizado.tarifaHoraCentavos).toBe(2200);
    expect(actualizado.rolId).toBe(empleado.rolId);
  });

  it("permite que dos empleados del MISMO rol terminen con tarifas distintas", () => {
    const rolId = getDb().roles[0].id;
    const empleadoA = crearEmpleado({
      ubicacionId: UBICACION_PILOTO_ID,
      nombre: "Empleado A",
      email: `empleado-a-${Date.now()}@example.com`,
      telefono: "555-0002",
      rolId,
      tarifaHoraCentavos: 1500,
    });
    const empleadoB = crearEmpleado({
      ubicacionId: UBICACION_PILOTO_ID,
      nombre: "Empleado B",
      email: `empleado-b-${Date.now()}@example.com`,
      telefono: "555-0003",
      rolId,
      tarifaHoraCentavos: 1500,
    });

    editarEmpleado(empleadoB.id, { tarifaHoraCentavos: 1900 });

    expect(empleadoA.rolId).toBe(empleadoB.rolId);
    expect(editarEmpleado(empleadoA.id, {}).tarifaHoraCentavos).toBe(1500);
    expect(editarEmpleado(empleadoB.id, {}).tarifaHoraCentavos).toBe(1900);
  });

  it("rechaza una tarifa invalida (<= 0)", () => {
    const empleado = empleadoDePrueba();
    expect(() => editarEmpleado(empleado.id, { tarifaHoraCentavos: 0 })).toThrow(ErrorRrhh);
  });

  it("registra un evento de auditoria 'cambioTarifaEmpleado' cuando la tarifa SI cambia", () => {
    const empleado = empleadoDePrueba(1500);
    const eventosAntes = getDb().eventos.length;

    editarEmpleado(empleado.id, { tarifaHoraCentavos: 1800 });

    const eventos = getDb().eventos;
    expect(eventos.length).toBe(eventosAntes + 1);
    const evento = eventos[eventos.length - 1];
    expect(evento.tipo).toBe("cambioTarifaEmpleado");
    expect(evento.agregadoTipo).toBe("Empleado");
    expect(evento.agregadoId).toBe(empleado.id);
    expect(evento.payload).toMatchObject({
      tarifaAnteriorCentavos: 1500,
      tarifaNuevaCentavos: 1800,
    });
  });

  it("NO registra evento de auditoria si la tarifa se 'edita' al mismo valor", () => {
    const empleado = empleadoDePrueba(1500);
    const eventosAntes = getDb().eventos.length;
    editarEmpleado(empleado.id, { tarifaHoraCentavos: 1500 });
    expect(getDb().eventos.length).toBe(eventosAntes);
  });
});
