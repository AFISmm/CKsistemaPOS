/**
 * Reporte de horas (antes "calculo de nomina") — DUENO: nomina-pos.
 *
 * DECISION DE ALCANCE (S-17, ver docs/requisitos.md y
 * docs/analisis-revision-20260722-modulos-innovacion-seguridad.md): tras la
 * llamada de revision del 2026-07-22 (dos revisores con experiencia operativa
 * real en restaurantes, Diego Cataño y Mateo Franco), se RETIRA del alcance
 * de produccion del POS el calculo real de tarifa por hora, el neto a pagar
 * y cualquier accion de "pagar". Motivo: un error o manipulacion de tarifas
 * dentro del POS puede generar pagos incorrectos sin los controles de un
 * sistema de nomina/ERP dedicado ("normalmente la nomina arranca en el ERP",
 * nunca en el POS). Este modulo es ahora SOLO un reporte de referencia.
 *
 * Consume la asistencia que produce rrhh-personal-pos (lib/rrhh/asistencia.ts:
 * `listarMarcajes` + `emparejarIntervalos`) y NO gestiona altas/bajas/roles de
 * empleado (eso es rrhh-personal-pos). Aqui:
 *  1) agrega minutos trabajados por semana ISO (lunes-domingo) dentro del
 *     periodo solicitado,
 *  2) separa horas regulares vs. extra con la regla DEMO ">40h/semana = extra"
 *     (estilo FLSA federal; NO se modelan reglas estatales de horas extra
 *     diarias ni las reglas reales de FL/TX — a validar con nomina/legal),
 *  3) suma, solo como dato de REFERENCIA, las propinas ya registradas por
 *     pagos-pos/backend-ventas-pos durante los turnos de caja que abrio el
 *     Usuario ligado al empleado,
 *  4) genera un `ReciboDePago` (reporte de horas) que NO calcula tarifa,
 *     retencion ni neto a pagar (esos campos se dejan en 0 por compatibilidad
 *     de tipo, ver lib/domain/types.ts). Este reporte esta pensado para
 *     alimentar un sistema de nomina/ERP externo, no para pagar desde aqui.
 *
 * C-DINERO: todo monto en CENTAVOS enteros. Horas en MINUTOS enteros.
 */

import { ahora, getDb, registrarEvento, uid } from "../db/store";
import type { ReciboDePago } from "../domain/types";
import { emparejarIntervalos, listarMarcajes } from "../rrhh/asistencia";
import { obtenerEmpleado } from "../rrhh/empleados";
import { ErrorNomina } from "./errores";

/** Regla DEMO (FLSA-like): mas de 40h/semana = hora extra. FL y TX no tienen regla estatal de horas extra diaria, por eso se aplica igual en ambos estados. */
export const LIMITE_HORAS_REGULARES_SEMANA_MIN = 40 * 60;

function validarFechaISO(valor: string | undefined, campo: string): string {
  if (!valor || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    throw new ErrorNomina("fecha_invalida", `${campo} debe tener formato YYYY-MM-DD`, 422);
  }
  return valor;
}

/** Lunes (YYYY-MM-DD) de la semana ISO a la que pertenece la fecha dada. */
function claveSemana(timestampIso: string): string {
  const d = new Date(timestampIso);
  const dia = d.getUTCDay(); // 0 = domingo .. 6 = sabado
  const diferenciaALunes = dia === 0 ? -6 : 1 - dia;
  const lunes = new Date(d);
  lunes.setUTCDate(d.getUTCDate() + diferenciaALunes);
  lunes.setUTCHours(0, 0, 0, 0);
  return lunes.toISOString().slice(0, 10);
}

interface DesgloseHoras {
  regularesMin: number;
  extraMin: number;
}

/** Agrupa minutos trabajados por semana ISO y separa regular/extra (>40h/semana). */
function desglosarHoras(empleadoId: string, desde: string, hasta: string): DesgloseHoras {
  const marcajes = listarMarcajes({ empleadoId, desde, hasta });
  const intervalos = emparejarIntervalos(marcajes);

  const minutosPorSemana = new Map<string, number>();
  for (const intervalo of intervalos) {
    const clave = claveSemana(intervalo.inicio);
    minutosPorSemana.set(clave, (minutosPorSemana.get(clave) ?? 0) + intervalo.minutos);
  }

  let regularesMin = 0;
  let extraMin = 0;
  for (const minutosSemana of minutosPorSemana.values()) {
    regularesMin += Math.min(minutosSemana, LIMITE_HORAS_REGULARES_SEMANA_MIN);
    extraMin += Math.max(0, minutosSemana - LIMITE_HORAS_REGULARES_SEMANA_MIN);
  }

  return { regularesMin, extraMin };
}

/**
 * Propinas del periodo: suma `Pago.propina` (estado "aprobado") de los pagos
 * cuyo Turno de caja fue abierto por el Usuario ligado al empleado
 * (`Turno.usuarioAperturaId === empleado.usuarioId`). Decision de modelado:
 * el Pedido/Pago existentes no tienen un campo "atendidoPor" propio; la unica
 * asociacion pedido/pago -> empleado disponible en el modelo actual es via el
 * Turno de caja que abrio el cajero (simplificacion DEMO — en produccion cada
 * Pago debiera registrar el cajero que lo cobro, no solo quien abrio el turno).
 */
function propinasDelPeriodo(usuarioId: string | null, desde: string, hasta: string): number {
  if (!usuarioId) return 0;
  const db = getDb();
  const turnosDelUsuario = new Set(
    db.turnos.filter((t) => t.usuarioAperturaId === usuarioId).map((t) => t.id)
  );
  if (turnosDelUsuario.size === 0) return 0;

  return db.pagos
    .filter(
      (p) =>
        p.estado === "aprobado" &&
        turnosDelUsuario.has(p.turnoId) &&
        p.creadoEn >= desde &&
        p.creadoEn <= hasta
    )
    .reduce((acc, p) => acc + p.propina, 0);
}

export interface CorrerNominaInput {
  periodoInicio: string; // YYYY-MM-DD, inclusive
  periodoFin: string; // YYYY-MM-DD, inclusive
  /** Si se omite, corre para todos los empleados con estado distinto de "onboarding". */
  empleadoId?: string;
}

/**
 * Genera (y persiste) un ReciboDePago (reporte de horas) por empleado para
 * el periodo dado. NO calcula tarifa/hora ni neto a pagar (decision de
 * alcance S-17): solo horas regulares/extra y propinas de referencia.
 */
export function correrNomina(input: CorrerNominaInput): ReciboDePago[] {
  const periodoInicio = validarFechaISO(input.periodoInicio, "periodoInicio");
  const periodoFin = validarFechaISO(input.periodoFin, "periodoFin");
  if (periodoInicio > periodoFin) {
    throw new ErrorNomina(
      "rango_invalido",
      "periodoInicio no puede ser posterior a periodoFin",
      422
    );
  }

  const db = getDb();
  const empleadosObjetivo = input.empleadoId
    ? (() => {
        const empleado = obtenerEmpleado(input.empleadoId!);
        if (!empleado) {
          throw new ErrorNomina(
            "empleado_no_encontrado",
            `Empleado ${input.empleadoId} no existe`,
            404
          );
        }
        return [empleado];
      })()
    : db.empleados.filter((e) => e.estado !== "onboarding");

  const desde = `${periodoInicio}T00:00:00.000Z`;
  const hasta = `${periodoFin}T23:59:59.999Z`;

  const recibos: ReciboDePago[] = [];

  for (const empleado of empleadosObjetivo) {
    const { regularesMin, extraMin } = desglosarHoras(empleado.id, desde, hasta);
    // Propinas: dato de REFERENCIA para el ERP externo (ver README-DEMO.md
    // "Decision de modelado: como se ligan propinas a un empleado"), NO un
    // pago calculado/emitido por este modulo.
    const propinasCentavos = propinasDelPeriodo(empleado.usuarioId, desde, hasta);

    // NO se calcula tarifa/hora, bruto, retencion ni neto (decision de
    // alcance S-17): esos campos se dejan en 0 unicamente por compatibilidad
    // de tipo (ver lib/domain/types.ts). `empleado.tarifaHoraCentavos` sigue
    // existiendo para rrhh-personal-pos (edicion de tarifa por persona) pero
    // este modulo deliberadamente no la usa para calcular un pago.
    const recibo: ReciboDePago = {
      id: uid(),
      empleadoId: empleado.id,
      periodoInicio,
      periodoFin,
      horasRegularesMin: regularesMin,
      horasExtraMin: extraMin,
      propinasCentavos,
      brutoCentavos: 0,
      retencionCentavos: 0,
      netoCentavos: 0,
      generadoEn: ahora(),
    };

    db.recibosPago.push(recibo);
    recibos.push(recibo);

    registrarEvento({
      ubicacionId: empleado.ubicacionId,
      usuarioId: empleado.usuarioId,
      tipo: "nominaGenerada",
      agregadoTipo: "ReciboDePago",
      agregadoId: recibo.id,
      motivo: `Reporte de horas ${periodoInicio} a ${periodoFin} (DEMO, sin calculo de pago — S-17)`,
      payload: {
        empleadoId: empleado.id,
        horasRegularesMin: regularesMin,
        horasExtraMin: extraMin,
        propinasCentavos,
      },
    });
  }

  return recibos;
}

export interface FiltroRecibos {
  empleadoId?: string;
}

export function listarRecibos(filtro: FiltroRecibos = {}): ReciboDePago[] {
  let recibos = getDb().recibosPago;
  if (filtro.empleadoId) {
    recibos = recibos.filter((r) => r.empleadoId === filtro.empleadoId);
  }
  return [...recibos].sort((a, b) => b.generadoEn.localeCompare(a.generadoEn));
}
