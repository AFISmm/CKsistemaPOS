/**
 * Turnos (apertura, arqueo, cierre Z) — DUENO: backend-ventas-pos.
 *
 * Utilidad del motor de ventas (lib/sales/*) que respalda los route handlers
 * de app/api/v1/turnos/**. Dinero en centavos enteros (C-DINERO).
 */

import { ahora, getDb, registrarEvento, turnoAbierto, uid, UBICACION_PILOTO_ID } from "../db/store";
import type { MetodoPago, Turno } from "../domain/types";
import { ErrorDominio } from "./errores";

export interface AbrirTurnoInput {
  ubicacionId?: string;
  usuarioAperturaId: string;
  fondoInicial?: number; // centavos
}

/** Abre un turno nuevo para la ubicacion (default: tienda piloto). Solo uno abierto a la vez. */
export function abrirTurno(input: AbrirTurnoInput): Turno {
  const ubicacionId = input.ubicacionId ?? UBICACION_PILOTO_ID;

  if (!input.usuarioAperturaId || typeof input.usuarioAperturaId !== "string") {
    throw new ErrorDominio(
      "usuario_requerido",
      "usuarioAperturaId es requerido para abrir un turno",
      422
    );
  }

  const existente = turnoAbierto(ubicacionId);
  if (existente) {
    throw new ErrorDominio(
      "turno_ya_abierto",
      `Ya existe un turno abierto (${existente.id}) para la ubicacion ${ubicacionId}`,
      409
    );
  }

  const fondoInicial = input.fondoInicial ?? 0;
  if (!Number.isInteger(fondoInicial) || fondoInicial < 0) {
    throw new ErrorDominio(
      "fondo_invalido",
      "fondoInicial debe ser un entero de centavos >= 0",
      422
    );
  }

  const turno: Turno = {
    id: uid(),
    ubicacionId,
    usuarioAperturaId: input.usuarioAperturaId,
    abiertoEn: ahora(),
    cerradoEn: null,
    fondoInicial,
    efectivoContado: null,
    diferencia: null,
    estado: "abierto",
    reporteZ: null,
    ultimoNumeroOrden: 0,
  };

  getDb().turnos.push(turno);
  return turno;
}

export function obtenerTurno(turnoId: string): Turno | undefined {
  return getDb().turnos.find((t) => t.id === turnoId);
}

function obtenerTurnoOrThrow(turnoId: string): Turno {
  const turno = obtenerTurno(turnoId);
  if (!turno) {
    throw new ErrorDominio("turno_no_encontrado", `Turno ${turnoId} no existe`, 404);
  }
  return turno;
}

export interface ArqueoPorMetodo {
  efectivo: number;
  tarjeta: number;
  otro: number;
}

export interface Arqueo {
  turnoId: string;
  estado: Turno["estado"];
  numeroPedidos: number;
  totalVentas: number;
  totalDescuentos: number;
  totalImpuestos: number;
  totalPropinas: number;
  porMetodo: ArqueoPorMetodo;
  fondoInicial: number;
  efectivoEsperado: number;
}

function claveMetodo(metodo: MetodoPago): keyof ArqueoPorMetodo {
  if (metodo === "efectivo") return "efectivo";
  if (metodo === "tarjeta") return "tarjeta";
  return "otro";
}

/**
 * Calcula el arqueo del turno (por metodo de pago) a partir de pedidos
 * cobrados y pagos aprobados. Puede llamarse con el turno abierto o cerrado.
 */
export function calcularArqueo(turnoId: string): Arqueo {
  const turno = obtenerTurnoOrThrow(turnoId);
  const db = getDb();

  const pedidosCobrados = db.pedidos.filter(
    (p) => p.turnoId === turnoId && p.estado === "cobrado"
  );
  const pagosAprobados = db.pagos.filter((pg) => pg.turnoId === turnoId && pg.estado === "aprobado");

  const porMetodo: ArqueoPorMetodo = { efectivo: 0, tarjeta: 0, otro: 0 };
  let totalPropinas = 0;
  for (const pago of pagosAprobados) {
    porMetodo[claveMetodo(pago.metodo)] += pago.monto;
    totalPropinas += pago.propina;
  }

  const totalVentas = pedidosCobrados.reduce((acc, p) => acc + p.total, 0);
  const totalDescuentos = pedidosCobrados.reduce((acc, p) => acc + p.descuentoTotal, 0);
  const totalImpuestos = pedidosCobrados.reduce((acc, p) => acc + p.impuestoTotal, 0);

  return {
    turnoId,
    estado: turno.estado,
    numeroPedidos: pedidosCobrados.length,
    totalVentas,
    totalDescuentos,
    totalImpuestos,
    totalPropinas,
    porMetodo,
    fondoInicial: turno.fondoInicial,
    efectivoEsperado: turno.fondoInicial + porMetodo.efectivo,
  };
}

export interface CerrarTurnoInput {
  efectivoContado?: number; // centavos
  usuarioId?: string;
}

/** Genera el cierre Z (reporte inmutable): cierra el turno y congela los totales. */
export function cerrarTurnoZ(turnoId: string, input: CerrarTurnoInput = {}): Turno {
  const turno = obtenerTurnoOrThrow(turnoId);
  if (turno.estado === "cerrado") {
    throw new ErrorDominio(
      "turno_ya_cerrado",
      `El turno ${turnoId} ya fue cerrado; el reporte Z es inmutable`,
      409
    );
  }

  const arqueo = calcularArqueo(turnoId);

  if (input.efectivoContado !== undefined) {
    if (!Number.isInteger(input.efectivoContado) || input.efectivoContado < 0) {
      throw new ErrorDominio(
        "efectivo_invalido",
        "efectivoContado debe ser un entero de centavos >= 0",
        422
      );
    }
    turno.efectivoContado = input.efectivoContado;
    turno.diferencia = input.efectivoContado - arqueo.efectivoEsperado;
  }

  turno.reporteZ = {
    generadoEn: ahora(),
    totalVentas: arqueo.totalVentas,
    totalEfectivo: arqueo.porMetodo.efectivo,
    totalTarjeta: arqueo.porMetodo.tarjeta,
    totalPropinas: arqueo.totalPropinas,
    totalImpuestos: arqueo.totalImpuestos,
    totalDescuentos: arqueo.totalDescuentos,
    numeroPedidos: arqueo.numeroPedidos,
  };
  turno.estado = "cerrado";
  turno.cerradoEn = ahora();

  registrarEvento({
    ubicacionId: turno.ubicacionId,
    usuarioId: input.usuarioId ?? null,
    tipo: "cierreZ",
    agregadoTipo: "Turno",
    agregadoId: turno.id,
    motivo: "Cierre de turno (reporte Z)",
    payload: { ...turno.reporteZ },
  });

  return turno;
}
