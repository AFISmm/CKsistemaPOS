/**
 * Logica PURA del reporte de anulaciones/reembolsos por empleado — Fase A
 * (revision 2026-07-22, seccion "autorizacion de anulacion: mecanismo +
 * registro de patrones por empleado"): un gerente necesita ver, por
 * empleado, cuantas anulaciones (`EventoDeAuditoria.tipo === "cancelacion"`)
 * y reembolsos (`tipo === "reembolso"`) hizo en un periodo, y que PRODUCTOS
 * involucraban esos pedidos — la senal clasica de abuso/fraude por
 * mostrador ("empleado siempre anula el mismo combo caro y se lo regala a un
 * amigo", etc.).
 *
 * Consumido por `GET /api/v1/reportes/anulaciones` (join server-side con
 * Usuario/Pedido/LineaDePedido) y por `app/reportes/anulaciones/page.tsx`.
 * Sin efectos secundarios ni imports de `lib/db`/`lib/sales` (mismo criterio
 * que lib/kitchen/kds.ts y lib/reportes/tiempos.ts: helpers puros reusables
 * desde cliente o servidor).
 */

import type { TipoEventoAuditoria } from "../domain/types";

/** Tipos de EventoDeAuditoria que este reporte considera "anulacion" (voids/reembolsos). */
export const TIPOS_EVENTO_ANULACION: TipoEventoAuditoria[] = ["cancelacion", "reembolso"];

/** Producto involucrado en un evento de anulacion, ya resuelto por nombre (snapshot de LineaDePedido.descripcion). */
export interface ProductoAnulado {
  descripcion: string;
  cantidad: number;
}

/** Un evento de anulacion/reembolso individual, ya resuelto (fila cruda antes de agrupar por empleado). */
export interface EventoAnulacion {
  id: string;
  tipo: Extract<TipoEventoAuditoria, "cancelacion" | "reembolso">;
  usuarioId: string | null;
  nombreUsuario: string;
  ocurridoEn: string;
  motivo: string;
  pedidoId: string;
  numeroOrden: number | null;
  totalPedido: number | null;
  productos: ProductoAnulado[];
}

/** Fila agregada por empleado, ordenable por total de eventos (para detectar patrones). */
export interface FilaAnulacionPorEmpleado {
  usuarioId: string | null;
  nombreUsuario: string;
  cancelaciones: number;
  reembolsos: number;
  total: number;
  /** Suma de `totalPedido` de los pedidos involucrados (impacto en dinero, no solo en conteo). */
  montoTotalInvolucrado: number;
  /** Top productos (por cantidad descendente) involucrados en las anulaciones/reembolsos de este empleado. */
  productos: ProductoAnulado[];
  eventos: EventoAnulacion[];
}

/**
 * true si `ocurridoEn` (ISO datetime) cae dentro de [desde, hasta] (fechas
 * YYYY-MM-DD, inclusive), mismo criterio que `pedidoEnRangoFecha` de
 * lib/reportes/tiempos.ts.
 */
export function eventoEnRangoFecha(ocurridoEn: string, desde: string, hasta: string): boolean {
  const fecha = ocurridoEn.slice(0, 10);
  return fecha >= desde && fecha <= hasta;
}

/** Combina cantidades de productos con el mismo `descripcion` (case-sensitive, es un snapshot ya congelado). */
function combinarProductos(listas: ProductoAnulado[][]): ProductoAnulado[] {
  const acumulado = new Map<string, number>();
  for (const lista of listas) {
    for (const p of lista) {
      acumulado.set(p.descripcion, (acumulado.get(p.descripcion) ?? 0) + p.cantidad);
    }
  }
  return [...acumulado.entries()]
    .map(([descripcion, cantidad]) => ({ descripcion, cantidad }))
    .sort((a, b) => b.cantidad - a.cantidad);
}

/**
 * Agrupa eventos de anulacion/reembolso YA resueltos por `usuarioId` (o
 * "sin_usuario" si viene `null`, ej. eventos legados/sistema), ordenado por
 * `total` descendente (el patron mas visible primero, util para un gerente
 * que escanea la lista buscando outliers).
 */
export function agruparAnulacionesPorEmpleado(
  eventos: EventoAnulacion[]
): FilaAnulacionPorEmpleado[] {
  const acumulado = new Map<string, FilaAnulacionPorEmpleado>();

  for (const evento of eventos) {
    const clave = evento.usuarioId ?? "sin_usuario";
    const actual = acumulado.get(clave) ?? {
      usuarioId: evento.usuarioId,
      nombreUsuario: evento.nombreUsuario,
      cancelaciones: 0,
      reembolsos: 0,
      total: 0,
      montoTotalInvolucrado: 0,
      productos: [],
      eventos: [],
    };

    if (evento.tipo === "cancelacion") actual.cancelaciones += 1;
    else actual.reembolsos += 1;
    actual.total += 1;
    actual.montoTotalInvolucrado += evento.totalPedido ?? 0;
    actual.eventos.push(evento);

    acumulado.set(clave, actual);
  }

  const filas = [...acumulado.values()].map((fila) => ({
    ...fila,
    productos: combinarProductos(fila.eventos.map((e) => e.productos)),
  }));

  return filas.sort((a, b) => b.total - a.total);
}
