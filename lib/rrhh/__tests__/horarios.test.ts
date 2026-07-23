/**
 * Pruebas unitarias de lib/rrhh/horarios.ts — Fase A (revision 2026-07-22
 * seccion 2.2): cubre `crearHorario` (regresion basica) y, sobre todo,
 * `editarHorario` (funcion NUEVA que llena el hueco "se puede crear un
 * horario pero nunca editarlo"). Runner: Vitest (mismo patron que
 * lib/offline/__tests__ y components/pos/__tests__).
 */

import { beforeEach, describe, expect, it } from "vitest";
import { getDb, resetDb, UBICACION_PILOTO_ID } from "../../db/store";
import { crearEmpleado } from "../empleados";
import { crearHorario, editarHorario, obtenerHorario } from "../horarios";
import { ErrorRrhh } from "../errores";

function empleadoDePrueba() {
  return crearEmpleado({
    ubicacionId: UBICACION_PILOTO_ID,
    nombre: "Empleado Test Horarios",
    email: `horarios-test-${Date.now()}@example.com`,
    telefono: "555-0000",
    rolId: getDb().roles[0].id,
    tarifaHoraCentavos: 1500,
  });
}

beforeEach(() => {
  resetDb();
});

describe("crearHorario", () => {
  it("crea un HorarioTurno valido para un empleado existente", () => {
    const empleado = empleadoDePrueba();
    const { horario } = crearHorario({
      empleadoId: empleado.id,
      fecha: "2026-08-03", // lunes
      horaInicioProgramada: "09:00",
      horaFinProgramada: "17:00",
    });
    expect(horario.empleadoId).toBe(empleado.id);
    expect(horario.horaInicioProgramada).toBe("09:00");
    expect(horario.horaFinProgramada).toBe("17:00");
  });

  it("rechaza horaFinProgramada <= horaInicioProgramada", () => {
    const empleado = empleadoDePrueba();
    expect(() =>
      crearHorario({
        empleadoId: empleado.id,
        fecha: "2026-08-03",
        horaInicioProgramada: "17:00",
        horaFinProgramada: "09:00",
      })
    ).toThrow(ErrorRrhh);
  });
});

describe("editarHorario", () => {
  it("edita las horas de un horario ya asignado y el cambio persiste", () => {
    const empleado = empleadoDePrueba();
    const { horario } = crearHorario({
      empleadoId: empleado.id,
      fecha: "2026-08-03",
      horaInicioProgramada: "09:00",
      horaFinProgramada: "17:00",
    });

    const { horario: editado } = editarHorario(horario.id, {
      horaInicioProgramada: "10:00",
      horaFinProgramada: "18:00",
    });

    expect(editado.horaInicioProgramada).toBe("10:00");
    expect(editado.horaFinProgramada).toBe("18:00");

    // Persiste: una nueva lectura del store refleja el cambio.
    const releido = obtenerHorario(horario.id);
    expect(releido?.horaInicioProgramada).toBe("10:00");
    expect(releido?.horaFinProgramada).toBe("18:00");
  });

  it("tambien permite editar la fecha", () => {
    const empleado = empleadoDePrueba();
    const { horario } = crearHorario({
      empleadoId: empleado.id,
      fecha: "2026-08-03",
      horaInicioProgramada: "09:00",
      horaFinProgramada: "17:00",
    });

    const { horario: editado } = editarHorario(horario.id, { fecha: "2026-08-04" });
    expect(editado.fecha).toBe("2026-08-04");
  });

  it("rechaza un rango de horas invalido al editar (fin <= inicio)", () => {
    const empleado = empleadoDePrueba();
    const { horario } = crearHorario({
      empleadoId: empleado.id,
      fecha: "2026-08-03",
      horaInicioProgramada: "09:00",
      horaFinProgramada: "17:00",
    });

    expect(() => editarHorario(horario.id, { horaInicioProgramada: "18:00" })).toThrow(ErrorRrhh);

    // El horario original no debe haber quedado mutado a medias.
    const releido = obtenerHorario(horario.id);
    expect(releido?.horaInicioProgramada).toBe("09:00");
  });

  it("lanza horario_no_encontrado (404) para un id inexistente", () => {
    expect(() => editarHorario("id-que-no-existe", { horaInicioProgramada: "10:00" })).toThrow(
      ErrorRrhh
    );
    try {
      editarHorario("id-que-no-existe", { horaInicioProgramada: "10:00" });
    } catch (e) {
      expect(e).toBeInstanceOf(ErrorRrhh);
      expect((e as ErrorRrhh).codigo).toBe("horario_no_encontrado");
      expect((e as ErrorRrhh).status).toBe(404);
    }
  });

  it("registra un evento de auditoria 'cambioHorarioEmpleado' cuando SI hay cambios", () => {
    const empleado = empleadoDePrueba();
    const { horario } = crearHorario({
      empleadoId: empleado.id,
      fecha: "2026-08-03",
      horaInicioProgramada: "09:00",
      horaFinProgramada: "17:00",
    });

    const eventosAntes = getDb().eventos.length;
    editarHorario(horario.id, { horaInicioProgramada: "10:00" });
    const eventosDespues = getDb().eventos;

    expect(eventosDespues.length).toBe(eventosAntes + 1);
    const evento = eventosDespues[eventosDespues.length - 1];
    expect(evento.tipo).toBe("cambioHorarioEmpleado");
    expect(evento.agregadoTipo).toBe("HorarioTurno");
    expect(evento.agregadoId).toBe(horario.id);
  });

  it("NO registra evento de auditoria si no hay cambios reales (mismos valores)", () => {
    const empleado = empleadoDePrueba();
    const { horario } = crearHorario({
      empleadoId: empleado.id,
      fecha: "2026-08-03",
      horaInicioProgramada: "09:00",
      horaFinProgramada: "17:00",
    });

    const eventosAntes = getDb().eventos.length;
    editarHorario(horario.id, {
      horaInicioProgramada: "09:00",
      horaFinProgramada: "17:00",
    });
    expect(getDb().eventos.length).toBe(eventosAntes);
  });
});
