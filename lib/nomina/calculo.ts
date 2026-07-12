/**
 * Calculo de nomina — DUENO: nomina-pos.
 *
 * Consume la asistencia que produce rrhh-personal-pos (lib/rrhh/asistencia.ts:
 * `listarMarcajes` + `emparejarIntervalos`) y NO gestiona altas/bajas/roles de
 * empleado (eso es rrhh-personal-pos). Aqui:
 *  1) agrega minutos trabajados por semana ISO (lunes-domingo) dentro del
 *     periodo solicitado,
 *  2) separa horas regulares vs. extra con la regla DEMO ">40h/semana = extra"
 *     (estilo FLSA federal; NO se modelan reglas estatales de horas extra
 *     diarias ni las reglas reales de FL/TX — a validar con nomina/legal),
 *  3) suma las propinas ya registradas por pagos-pos/backend-ventas-pos
 *     durante los turnos de caja que abrio el Usuario ligado al empleado,
 *  4) aplica una retencion DEMO FICTICIA y genera el ReciboDePago (paystub).
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

/** Multiplicador DEMO de hora extra (tiempo y medio). */
export const FACTOR_HORA_EXTRA = 1.5;

/**
 * Retencion federal DEMO/FICTICIA (no es una tasa real del IRS ni de ningun
 * estado). FL y TX NO tienen impuesto estatal sobre ingreso personal, por eso
 * la retencion aqui simula UNICAMENTE una porcion federal generica. Confirmar
 * con nomina/legal real antes de usar en produccion.
 */
export const TASA_RETENCION_FEDERAL_DEMO = 0.1;

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

/** Genera (y persiste) un ReciboDePago por empleado para el periodo dado. */
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
    const propinasCentavos = propinasDelPeriodo(empleado.usuarioId, desde, hasta);

    const pagoRegular = Math.round((regularesMin / 60) * empleado.tarifaHoraCentavos);
    const pagoExtra = Math.round(
      (extraMin / 60) * empleado.tarifaHoraCentavos * FACTOR_HORA_EXTRA
    );
    const brutoCentavos = pagoRegular + pagoExtra;
    const retencionCentavos = Math.round(brutoCentavos * TASA_RETENCION_FEDERAL_DEMO);
    const netoCentavos = brutoCentavos - retencionCentavos + propinasCentavos;

    const recibo: ReciboDePago = {
      id: uid(),
      empleadoId: empleado.id,
      periodoInicio,
      periodoFin,
      horasRegularesMin: regularesMin,
      horasExtraMin: extraMin,
      propinasCentavos,
      brutoCentavos,
      retencionCentavos,
      netoCentavos,
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
      motivo: `Nomina ${periodoInicio} a ${periodoFin} (DEMO)`,
      payload: {
        empleadoId: empleado.id,
        horasRegularesMin: regularesMin,
        horasExtraMin: extraMin,
        propinasCentavos,
        brutoCentavos,
        retencionCentavos,
        netoCentavos,
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
