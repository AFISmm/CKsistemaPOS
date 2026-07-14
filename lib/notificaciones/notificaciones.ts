/**
 * Notificaciones del panel de campana de la barra superior — DUENO: shell de
 * UI (etapa 1). DEMO: lectura + marcar-como-leida sobre la semilla estatica de
 * lib/db/store.ts, y AHORA TAMBIEN creacion (`crearNotificacion`), agregada
 * para el ciclo de vida extendido del pedido: el KDS (app/kds/page.tsx) la usa
 * para avisar al gerente cuando un pedido lleva 18+ min sin salir de cocina
 * (ver lib/kitchen/kds.ts, nivelAlertaTiempo).
 */

import { ahora, getDb, uid } from "@/lib/db/store";
import type { Notificacion, TipoNotificacion } from "@/lib/domain/types";
import { ErrorNotificaciones } from "./errores";

/** Lista notificaciones, mas recientes primero. Filtra por ubicacion si se indica. */
export function listarNotificaciones(ubicacionId?: string): Notificacion[] {
  const db = getDb();
  const lista = ubicacionId
    ? db.notificaciones.filter((n) => n.ubicacionId === ubicacionId)
    : db.notificaciones;
  return [...lista].sort((a, b) => b.creadaEn.localeCompare(a.creadaEn));
}

export interface NuevaNotificacionInput {
  ubicacionId: string;
  tipo: TipoNotificacion;
  titulo: string;
  mensaje: string;
  /** Ruta interna a la que navegar al hacer click (null/omitido = sin destino). */
  entidadRelacionadaHref?: string | null;
}

/**
 * Crea una notificacion nueva.
 *
 * ESTRATEGIA DE DEDUPLICACION (documentada aqui a proposito): si
 * `entidadRelacionadaHref` viene con valor (no null/undefined), se asume que
 * identifica de forma unica al evento/entidad que origina la notificacion. Si
 * YA existe una notificacion (leida o no) con exactamente el mismo
 * `entidadRelacionadaHref`, se considera que es el MISMO evento y se devuelve
 * la notificacion existente en vez de crear un duplicado.
 *
 * Caso de uso concreto (alerta de demora de cocina, Feature 2 del ciclo de
 * vida extendido del pedido): el KDS hace polling cada ~2.5s y, mientras un
 * pedido se mantenga en nivel de alerta "rojo" (18+ min), volveria a intentar
 * crear la misma notificacion en cada poll si no se deduplicara. Para eso se
 * codifica el pedido en el href como `/kds?pedidoId=<id>` (unico por pedido),
 * de forma que la segunda y siguientes llamadas para el mismo pedido sean
 * no-ops idempotentes. No se necesito agregar un campo `pedidoId` nuevo a
 * `Notificacion` porque el href ya alcanza para identificar el evento y
 * ademas sirve como destino de navegacion real.
 */
export function crearNotificacion(input: NuevaNotificacionInput): Notificacion {
  const db = getDb();

  if (!input.ubicacionId || !input.tipo || !input.titulo || !input.mensaje) {
    throw new ErrorNotificaciones(
      "notificacion_invalida",
      "ubicacionId, tipo, titulo y mensaje son requeridos.",
      422
    );
  }

  const href = input.entidadRelacionadaHref ?? null;
  if (href) {
    const existente = db.notificaciones.find((n) => n.entidadRelacionadaHref === href);
    if (existente) return existente;
  }

  const notificacion: Notificacion = {
    id: uid(),
    ubicacionId: input.ubicacionId,
    tipo: input.tipo,
    titulo: input.titulo,
    mensaje: input.mensaje,
    leida: false,
    entidadRelacionadaHref: href,
    creadaEn: ahora(),
  };
  db.notificaciones.push(notificacion);
  return notificacion;
}

/** Marca una notificacion como leida (idempotente) y la devuelve. */
export function marcarNotificacionLeida(id: string): Notificacion {
  const notificacion = getDb().notificaciones.find((n) => n.id === id);
  if (!notificacion) {
    throw new ErrorNotificaciones("notificacion_no_encontrada", "Notificacion no encontrada.", 404);
  }
  notificacion.leida = true;
  return notificacion;
}
