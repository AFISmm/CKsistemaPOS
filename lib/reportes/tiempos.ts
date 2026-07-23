/**
 * Logica PURA del reporte de tiempos operativos — Fase A (revision
 * 2026-07-22, seccion 6.1): trazabilidad de "quien tomo el pedido y cuando",
 * "cuando entro a cocina", "cuando salio hacia caja" y los tiempos derivados,
 * para que un gerente pueda resolver disputas de "quien causo la demora" y
 * detectar patrones de cuello de botella por hora del dia. Consumido por
 * `GET /api/v1/reportes/tiempos` (app/api/v1/reportes/tiempos/route.ts, que
 * hace el join con Turno/Usuario y aplica el filtro de rango de fechas) y por
 * la pagina `app/reportes/tiempos/page.tsx` (que calcula duraciones y agrupa
 * por hora en el cliente a partir de las filas ya resueltas).
 *
 * Sin efectos secundarios ni imports de `lib/db`/`lib/sales`: mismo criterio
 * que `lib/kitchen/kds.ts` (helpers puros reusables desde cliente o servidor).
 *
 * GAP DOCUMENTADO (ver tambien Pedido.creadoPorUsuarioId en
 * lib/domain/types.ts): el modelo de datos actual NO tiene un timestamp de
 * "listo" (cocina termino) DISTINTO de `entregadoEn` (cuando salio del KDS
 * hacia caja, ver `enviarACaja` en lib/sales/engine.ts) — solo existe el
 * estado agregado `estadoCocina` por linea (recibido/preparando/listo, SIN
 * timestamp de transicion). Es decir, el tiempo que un pedido pasa "listo"
 * pero todavia sin retirar de la pantalla de cocina queda MEZCLADO dentro de
 * `msEnCocina` (no se puede separar "tiempo cocinando" de "tiempo esperando
 * que lo retiren"). Agregar un log de transiciones con timestamp por linea
 * requeriria tocar `avanzarEstadoCocina` en lib/sales/engine.ts (owner
 * backend-ventas-pos), fuera del alcance editable de esta tarea — se deja
 * como recomendacion de seguimiento (ver reporte de la tarea).
 */

import type { CanalPedido, EstadoPedido } from "../domain/types";

/** Fila de entrada minima que este modulo necesita (ya resuelta con nombres por el route handler). */
export interface FilaTiempoPedido {
  id: string;
  numeroOrden: number;
  nombreCliente: string;
  canal: CanalPedido;
  estado: EstadoPedido;
  creadoEn: string;
  enviadoACocinaEn: string | null;
  entregadoEn: string | null;
  cerradoEn: string | null;
  /** Nombre del Usuario que abrio el pedido (Pedido.creadoPorUsuarioId resuelto), o null si no se registro (ver gap documentado ahi). */
  creadoPorNombre: string | null;
  /** Nombre del Usuario que abrio el TURNO de caja al que pertenece el pedido — proxy de respaldo, ver nota de diseño en el route handler. */
  cajeroTurnoNombre: string | null;
}

export interface FilaTiempoPedidoConDuraciones extends FilaTiempoPedido {
  /** ms entre creadoEn y enviadoACocinaEn: cuanto tardo el cajero armando el ticket antes de enviarlo. null si falta algun extremo o el rango es invalido. */
  msArmadoMostrador: number | null;
  /** ms entre enviadoACocinaEn y entregadoEn: tiempo total en cocina (incluye el gap documentado arriba). null si falta algun extremo o el rango es invalido. */
  msEnCocina: number | null;
  /** ms entre creadoEn y (entregadoEn ?? cerradoEn): tiempo total de punta a punta disponible. null si no hay ningun extremo de cierre todavia. */
  msTotal: number | null;
}

/** Diferencia en ms entre dos ISO datetime, o null si falta alguno, no son fechas validas, o el fin es anterior al inicio (dato inconsistente). */
function diffMs(inicioIso: string | null, finIso: string | null): number | null {
  if (!inicioIso || !finIso) return null;
  const inicio = new Date(inicioIso).getTime();
  const fin = new Date(finIso).getTime();
  if (Number.isNaN(inicio) || Number.isNaN(fin) || fin < inicio) return null;
  return fin - inicio;
}

/** Calcula las 3 duraciones derivadas (ver interfaz) para una fila. Pura, no lanza. */
export function calcularDuraciones(fila: FilaTiempoPedido): FilaTiempoPedidoConDuraciones {
  const finParaTotal = fila.entregadoEn ?? fila.cerradoEn;
  return {
    ...fila,
    msArmadoMostrador: diffMs(fila.creadoEn, fila.enviadoACocinaEn),
    msEnCocina: diffMs(fila.enviadoACocinaEn, fila.entregadoEn),
    msTotal: diffMs(fila.creadoEn, finParaTotal),
  };
}

/**
 * true si la fecha (YYYY-MM-DD, derivada de `creadoEn`) cae dentro de
 * [desde, hasta] inclusive, comparando strings ISO (funciona porque
 * "YYYY-MM-DD" ordena lexicograficamente igual que cronologicamente).
 */
export function pedidoEnRangoFecha(creadoEn: string, desde: string, hasta: string): boolean {
  const fecha = creadoEn.slice(0, 10);
  return fecha >= desde && fecha <= hasta;
}

export interface CubetaHoraDelDia {
  /** Hora local 0-23 (Date.getHours() de creadoEn). */
  hora: number;
  numeroPedidos: number;
  /** Promedio de msEnCocina de los pedidos de esta hora que SI tienen ese dato. null si ninguno lo tiene. */
  promedioMsCocina: number | null;
  /** Promedio de msTotal de los pedidos de esta hora que SI tienen ese dato. null si ninguno lo tiene. */
  promedioMsTotal: number | null;
}

/**
 * Agrupa filas (ya con duraciones calculadas) por hora local de `creadoEn`,
 * para detectar patrones de cuello de botella por hora del dia (ej. "la hora
 * pico del almuerzo tarda sistematicamente mas en cocina"). Solo incluye
 * horas con al menos un pedido; ordenado 0->23.
 */
export function agruparPorHoraDelDia(
  filas: FilaTiempoPedidoConDuraciones[]
): CubetaHoraDelDia[] {
  const acumulado = new Map<
    number,
    { n: number; sumaCocina: number; cuentaCocina: number; sumaTotal: number; cuentaTotal: number }
  >();

  for (const fila of filas) {
    const hora = new Date(fila.creadoEn).getHours();
    if (Number.isNaN(hora)) continue;
    const actual = acumulado.get(hora) ?? {
      n: 0,
      sumaCocina: 0,
      cuentaCocina: 0,
      sumaTotal: 0,
      cuentaTotal: 0,
    };
    actual.n += 1;
    if (fila.msEnCocina !== null) {
      actual.sumaCocina += fila.msEnCocina;
      actual.cuentaCocina += 1;
    }
    if (fila.msTotal !== null) {
      actual.sumaTotal += fila.msTotal;
      actual.cuentaTotal += 1;
    }
    acumulado.set(hora, actual);
  }

  return [...acumulado.entries()]
    .sort(([horaA], [horaB]) => horaA - horaB)
    .map(([hora, v]) => ({
      hora,
      numeroPedidos: v.n,
      promedioMsCocina: v.cuentaCocina > 0 ? Math.round(v.sumaCocina / v.cuentaCocina) : null,
      promedioMsTotal: v.cuentaTotal > 0 ? Math.round(v.sumaTotal / v.cuentaTotal) : null,
    }));
}
