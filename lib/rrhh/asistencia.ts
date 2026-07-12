/**
 * Asistencia (reloj checador) — DUENO: rrhh-personal-pos.
 *
 * Modelo inspirado en proveedores de time-clock tipo XmartClock (marcaje
 * movil/desktop, geofencing por tienda, verificacion de identidad, alertas de
 * tardanza/fuera-de-zona) pero SIN integracion real: el marcaje se hace
 * manualmente desde la UI de esta demo, y "dentroDeGeofence"/"identidadVerificada"
 * son flags SIMULADOS con checkboxes ("simular fuera de zona" / "simular
 * fallo de verificacion"). En produccion esto se reemplazaria por un
 * webhook/pull de asistencia contra el proveedor real de reloj checador
 * (ver README-DEMO.md, seccion Modulo de Empleados y Nomina).
 *
 * Este modulo SOLO produce/lee marcajes (la "verdad cruda" de asistencia).
 * `lib/nomina/calculo.ts` (nomina-pos) es quien decide regular vs. extra y
 * calcula el pago; aqui no se calcula dinero.
 */

import { ahora, getDb, registrarEvento, uid } from "../db/store";
import type { Marcaje, TipoMarcaje } from "../domain/types";
import { obtenerEmpleado } from "./empleados";
import { ErrorRrhh } from "./errores";

/** Minutos de tolerancia antes de marcar tardanza (DEMO). */
const TOLERANCIA_TARDANZA_MIN = 10;

export interface RegistrarMarcajeInput {
  empleadoId: string;
  tipo: TipoMarcaje;
  /** Simulacion DEMO: la app/kiosco "detecta" que el empleado esta fuera de la zona de la tienda. */
  simularFueraDeZona?: boolean;
  /** Simulacion DEMO: la verificacion de identidad (ej. facial) "falla". */
  simularFalloIdentidad?: boolean;
}

function horaDelDia(iso: string): { horas: number; minutos: number } {
  const d = new Date(iso);
  return { horas: d.getHours(), minutos: d.getMinutes() };
}

/** Compara el momento del marcaje "entrada" contra el HorarioTurno del dia (si existe). */
function calcularTardanza(empleadoId: string, timestamp: string): boolean {
  const fecha = timestamp.slice(0, 10);
  const horario = getDb().horariosTurno.find(
    (h) => h.empleadoId === empleadoId && h.fecha === fecha
  );
  if (!horario) return false; // sin horario programado: no se puede evaluar tardanza (DEMO)

  const [hEsperada, mEsperada] = horario.horaInicioProgramada.split(":").map(Number);
  const { horas, minutos } = horaDelDia(timestamp);

  const minutosEsperados = hEsperada * 60 + mEsperada;
  const minutosReales = horas * 60 + minutos;
  return minutosReales - minutosEsperados > TOLERANCIA_TARDANZA_MIN;
}

/**
 * Registra un marcaje de entrada/salida. Valida que el empleado exista y
 * este "activo", y que la secuencia entrada/salida sea coherente (no se
 * puede marcar dos "entrada" seguidas sin una "salida" en medio, ni viceversa).
 */
export function registrarMarcaje(input: RegistrarMarcajeInput): Marcaje {
  if (input.tipo !== "entrada" && input.tipo !== "salida") {
    throw new ErrorRrhh("tipo_invalido", 'tipo debe ser "entrada" o "salida"', 422);
  }

  const empleado = obtenerEmpleado(input.empleadoId);
  if (!empleado) {
    throw new ErrorRrhh("empleado_no_encontrado", `Empleado ${input.empleadoId} no existe`, 404);
  }
  if (empleado.estado !== "activo") {
    throw new ErrorRrhh(
      "empleado_no_activo",
      `El empleado ${input.empleadoId} esta en estado "${empleado.estado}"; solo empleados activos pueden marcar asistencia`,
      409
    );
  }

  const marcajesEmpleado = getDb().marcajes
    .filter((m) => m.empleadoId === input.empleadoId)
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  const ultimo = marcajesEmpleado[marcajesEmpleado.length - 1];
  if (ultimo && ultimo.tipo === input.tipo) {
    throw new ErrorRrhh(
      "secuencia_invalida",
      `El ultimo marcaje ya fue "${ultimo.tipo}"; se esperaba "${
        input.tipo === "entrada" ? "salida" : "entrada"
      }"`,
      409
    );
  }

  const timestamp = ahora();
  const dentroDeGeofence = !input.simularFueraDeZona;
  const identidadVerificada = !input.simularFalloIdentidad;
  const tardanza = input.tipo === "entrada" ? calcularTardanza(input.empleadoId, timestamp) : false;

  const marcaje: Marcaje = {
    id: uid(),
    empleadoId: input.empleadoId,
    ubicacionId: empleado.ubicacionId,
    tipo: input.tipo,
    timestamp,
    dentroDeGeofence,
    identidadVerificada,
    tardanza,
  };

  getDb().marcajes.push(marcaje);

  // Solo se audita cuando hay una alerta real (tardanza / fuera de zona /
  // identidad no verificada), para no llenar el log de eventos rutinarios.
  if (tardanza || !dentroDeGeofence || !identidadVerificada) {
    registrarEvento({
      ubicacionId: empleado.ubicacionId,
      usuarioId: empleado.usuarioId,
      tipo: "alertaAsistencia",
      agregadoTipo: "Marcaje",
      agregadoId: marcaje.id,
      motivo: [
        tardanza ? "tardanza" : null,
        !dentroDeGeofence ? "fuera de geofence (simulado)" : null,
        !identidadVerificada ? "identidad no verificada (simulado)" : null,
      ]
        .filter(Boolean)
        .join(", "),
      payload: { empleadoId: empleado.id, tipo: marcaje.tipo, timestamp },
    });
  }

  return marcaje;
}

export interface FiltroMarcajes {
  empleadoId?: string;
  ubicacionId?: string;
  desde?: string; // ISO datetime o date
  hasta?: string; // ISO datetime o date
}

export function listarMarcajes(filtro: FiltroMarcajes = {}): Marcaje[] {
  let marcajes = getDb().marcajes;
  if (filtro.empleadoId) {
    marcajes = marcajes.filter((m) => m.empleadoId === filtro.empleadoId);
  }
  if (filtro.ubicacionId) {
    marcajes = marcajes.filter((m) => m.ubicacionId === filtro.ubicacionId);
  }
  if (filtro.desde) {
    marcajes = marcajes.filter((m) => m.timestamp >= filtro.desde!);
  }
  if (filtro.hasta) {
    // `hasta` puede venir como fecha (YYYY-MM-DD): la tratamos inclusiva de todo ese dia.
    const hasta = filtro.hasta.length === 10 ? `${filtro.hasta}T23:59:59.999Z` : filtro.hasta;
    marcajes = marcajes.filter((m) => m.timestamp <= hasta);
  }
  return [...marcajes].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

export interface IntervaloTrabajado {
  empleadoId: string;
  inicio: string; // ISO datetime (marcaje "entrada")
  fin: string; // ISO datetime (marcaje "salida")
  minutos: number;
}

/**
 * Empareja marcajes entrada->salida (en orden cronologico) en intervalos de
 * trabajo. Un "entrada" sin "salida" correspondiente dentro del rango (turno
 * abierto) se descarta del calculo (DEMO: no se paga tiempo sin marcaje de
 * salida). Asume que los marcajes de un mismo empleado alternan correctamente
 * (invariante que ya garantiza `registrarMarcaje`).
 */
export function emparejarIntervalos(marcajes: Marcaje[]): IntervaloTrabajado[] {
  const porEmpleado = new Map<string, Marcaje[]>();
  for (const m of marcajes) {
    const lista = porEmpleado.get(m.empleadoId) ?? [];
    lista.push(m);
    porEmpleado.set(m.empleadoId, lista);
  }

  const intervalos: IntervaloTrabajado[] = [];
  for (const [empleadoId, lista] of porEmpleado) {
    const ordenados = [...lista].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    let entradaAbierta: Marcaje | null = null;
    for (const m of ordenados) {
      if (m.tipo === "entrada") {
        entradaAbierta = m;
      } else if (m.tipo === "salida" && entradaAbierta) {
        const minutos = Math.round(
          (new Date(m.timestamp).getTime() - new Date(entradaAbierta.timestamp).getTime()) / 60000
        );
        if (minutos > 0) {
          intervalos.push({ empleadoId, inicio: entradaAbierta.timestamp, fin: m.timestamp, minutos });
        }
        entradaAbierta = null;
      }
    }
  }
  return intervalos;
}

export interface ResumenHoras {
  empleadoId: string;
  desde: string;
  hasta: string;
  minutosTrabajados: number;
  intervalos: IntervaloTrabajado[];
}

/** Resumen simple de minutos trabajados en un rango (para la UI de detalle del empleado). No separa regular/extra: eso es nomina-pos. */
export function resumenHoras(empleadoId: string, desde: string, hasta: string): ResumenHoras {
  const marcajes = listarMarcajes({ empleadoId, desde, hasta });
  const intervalos = emparejarIntervalos(marcajes);
  const minutosTrabajados = intervalos.reduce((acc, i) => acc + i.minutos, 0);
  return { empleadoId, desde, hasta, minutosTrabajados, intervalos };
}
