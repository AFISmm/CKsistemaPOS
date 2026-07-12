/**
 * Notificaciones del panel de campana de la barra superior — DUENO: shell de
 * UI (etapa 1). DEMO: solo lectura + marcar-como-leida sobre la semilla
 * estatica de lib/db/store.ts; no hay generacion en tiempo real todavia (ver
 * comentario de Notificacion en lib/domain/types.ts).
 */

import { getDb } from "@/lib/db/store";
import type { Notificacion } from "@/lib/domain/types";
import { ErrorNotificaciones } from "./errores";

/** Lista notificaciones, mas recientes primero. Filtra por ubicacion si se indica. */
export function listarNotificaciones(ubicacionId?: string): Notificacion[] {
  const db = getDb();
  const lista = ubicacionId
    ? db.notificaciones.filter((n) => n.ubicacionId === ubicacionId)
    : db.notificaciones;
  return [...lista].sort((a, b) => b.creadaEn.localeCompare(a.creadaEn));
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
