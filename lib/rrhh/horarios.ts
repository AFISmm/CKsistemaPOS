/**
 * Horarios de trabajo PROGRAMADOS (HorarioTurno) — DUENO: rrhh-personal-pos.
 *
 * NO confundir con `Turno` de caja (apertura/cierre Z) ni con `Marcaje`
 * (asistencia real, lib/rrhh/asistencia.ts). Este modulo administra el
 * calendario/planificacion: "a que hora debe entrar y salir cada empleado".
 *
 * CRITERIO DE SEMANA (para el aviso de horas extra >40h/semana del boton
 * "Agregar horario"): semana ISO lunes-domingo, MISMO CRITERIO que ya usa
 * `lib/nomina/calculo.ts` (`claveSemana`) para separar horas regulares vs.
 * extra a partir de asistencia real. Aqui se replica el mismo algoritmo (no
 * se importa de nomina-pos porque ese modulo opera sobre timestamps de
 * marcajes reales, no sobre HorarioTurno.fecha) para que el criterio de
 * "semana" sea consistente en toda la demo.
 *
 * IMPORTANTE: este calculo es sobre horas PROGRAMADAS (planificacion), no
 * sobre horas trabajadas reales. nomina-pos sigue siendo quien decide
 * regular/extra para el PAGO, a partir de asistencia real. El aviso de
 * "esto generara horas extra" en /empleados es solo informativo para quien
 * programa el horario (gerente), para que autorice el exceso a sabiendas.
 */

import { getDb, uid } from "../db/store";
import type { HorarioTurno } from "../domain/types";
import { obtenerEmpleado } from "./empleados";
import { ErrorRrhh } from "./errores";

/** Limite DEMO de horas regulares por semana antes de contar como overtime (mismo valor que nomina-pos). */
export const LIMITE_HORAS_REGULARES_SEMANA_MIN = 40 * 60;

const RE_FECHA = /^\d{4}-\d{2}-\d{2}$/;
const RE_HORA = /^([01]\d|2[0-3]):([0-5]\d)$/;

function minutosDesdeHHMM(hhmm: string): number {
  const [horas, minutos] = hhmm.split(":").map(Number);
  return horas * 60 + minutos;
}

/** Duracion en minutos de un horario (fin - inicio). Asume mismo dia (DEMO: no soporta turnos que cruzan medianoche). */
export function minutosHorario(h: { horaInicioProgramada: string; horaFinProgramada: string }): number {
  return minutosDesdeHHMM(h.horaFinProgramada) - minutosDesdeHHMM(h.horaInicioProgramada);
}

/**
 * Lunes (YYYY-MM-DD) de la semana ISO (lunes-domingo) a la que pertenece la
 * fecha dada. Mismo algoritmo que `claveSemana` en lib/nomina/calculo.ts,
 * adaptado a fechas sin hora (HorarioTurno.fecha).
 */
export function claveSemanaDeFecha(fechaIso: string): string {
  const d = new Date(`${fechaIso}T00:00:00.000Z`);
  const dia = d.getUTCDay(); // 0 = domingo .. 6 = sabado
  const diferenciaALunes = dia === 0 ? -6 : 1 - dia;
  const lunes = new Date(d);
  lunes.setUTCDate(d.getUTCDate() + diferenciaALunes);
  return lunes.toISOString().slice(0, 10);
}

/** Domingo (YYYY-MM-DD) de la semana ISO que empieza en el lunes dado. */
export function claveFinDeSemana(lunesIso: string): string {
  const d = new Date(`${lunesIso}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + 6);
  return d.toISOString().slice(0, 10);
}

function validarFecha(valor: string | undefined, campo: string): string {
  if (!valor || !RE_FECHA.test(valor)) {
    throw new ErrorRrhh("fecha_invalida", `${campo} debe tener formato YYYY-MM-DD`, 422);
  }
  return valor;
}

function validarHora(valor: string | undefined, campo: string): string {
  if (!valor || !RE_HORA.test(valor)) {
    throw new ErrorRrhh("hora_invalida", `${campo} debe tener formato HH:MM (24h)`, 422);
  }
  return valor;
}

export interface FiltroHorarios {
  empleadoId?: string;
  ubicacionId?: string;
  desde?: string; // YYYY-MM-DD inclusive
  hasta?: string; // YYYY-MM-DD inclusive
}

/** Lista horarios programados, ordenados por fecha/hora de inicio ascendente. */
export function listarHorarios(filtro: FiltroHorarios = {}): HorarioTurno[] {
  let horarios = getDb().horariosTurno;
  if (filtro.empleadoId) {
    horarios = horarios.filter((h) => h.empleadoId === filtro.empleadoId);
  }
  if (filtro.ubicacionId) {
    horarios = horarios.filter((h) => h.ubicacionId === filtro.ubicacionId);
  }
  if (filtro.desde) {
    horarios = horarios.filter((h) => h.fecha >= filtro.desde!);
  }
  if (filtro.hasta) {
    horarios = horarios.filter((h) => h.fecha <= filtro.hasta!);
  }
  return [...horarios].sort(
    (a, b) => a.fecha.localeCompare(b.fecha) || a.horaInicioProgramada.localeCompare(b.horaInicioProgramada)
  );
}

/** Suma minutos YA programados para un empleado en la semana ISO de `fecha` (sin contar el horario nuevo). */
export function minutosProgramadosSemana(empleadoId: string, fecha: string): number {
  const clave = claveSemanaDeFecha(fecha);
  return getDb()
    .horariosTurno.filter((h) => h.empleadoId === empleadoId && claveSemanaDeFecha(h.fecha) === clave)
    .reduce((acc, h) => acc + minutosHorario(h), 0);
}

export interface NuevoHorarioInput {
  empleadoId: string;
  ubicacionId?: string;
  fecha: string; // YYYY-MM-DD
  horaInicioProgramada: string; // HH:MM 24h
  horaFinProgramada: string; // HH:MM 24h
}

export interface HorarioCreado {
  horario: HorarioTurno;
  /** Minutos totales programados para ESA semana (lunes-domingo) incluyendo el horario recien creado. Informativo para el aviso de overtime en la UI. */
  minutosTotalesSemana: number;
}

/**
 * Crea un HorarioTurno. NO bloquea si supera 40h/semana programadas (la
 * decision de autorizar el exceso es de UI/gerente, ver
 * components/empleados/AgregarHorarioModal.tsx); solo devuelve el total
 * calculado para que la UI (o quien pruebe el endpoint directo) pueda
 * verificarlo.
 */
export function crearHorario(input: NuevoHorarioInput): HorarioCreado {
  const empleado = obtenerEmpleado(input.empleadoId);
  if (!empleado) {
    throw new ErrorRrhh("empleado_no_encontrado", `Empleado ${input.empleadoId} no existe`, 404);
  }

  const fecha = validarFecha(input.fecha, "fecha");
  const horaInicioProgramada = validarHora(input.horaInicioProgramada, "horaInicioProgramada");
  const horaFinProgramada = validarHora(input.horaFinProgramada, "horaFinProgramada");

  const ubicacionId = input.ubicacionId ?? empleado.ubicacionId;
  const ubicacionExiste = getDb().ubicaciones.some((u) => u.id === ubicacionId);
  if (!ubicacionExiste) {
    throw new ErrorRrhh("ubicacion_no_encontrada", `Ubicacion ${ubicacionId} no existe`, 422);
  }

  const duracionMin = minutosHorario({ horaInicioProgramada, horaFinProgramada });
  if (duracionMin <= 0) {
    throw new ErrorRrhh(
      "rango_horas_invalido",
      "horaFinProgramada debe ser posterior a horaInicioProgramada (mismo dia)",
      422
    );
  }

  const horario: HorarioTurno = {
    id: uid(),
    empleadoId: input.empleadoId,
    ubicacionId,
    fecha,
    horaInicioProgramada,
    horaFinProgramada,
  };
  getDb().horariosTurno.push(horario);

  const minutosTotalesSemana = minutosProgramadosSemana(input.empleadoId, fecha);

  return { horario, minutosTotalesSemana };
}
