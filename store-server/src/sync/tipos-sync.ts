/**
 * Tipos compartidos del agente de sincronizacion (F1-T5, arquitectura.md §4.4,
 * §6.4). Modela el contrato de outbox (tienda -> nube) y de inbox
 * (nube -> tienda) sin acoplarse a Prisma ni a un framework HTTP concreto.
 */

/** Un evento del outbox tal como se envia en el body de POST /sync/eventos. */
export interface EventoOutboxDto {
  id: string;
  tipo: string;
  agregadoTipo: string;
  agregadoId: string;
  ubicacionId: string;
  ocurridoEn: string; // ISO datetime
  version: number;
  payload: unknown;
}

export interface RespuestaSyncEventos {
  /** Ids (UUID v7) que la nube confirma como aplicados (idempotente). Puede
   * ser un subconjunto del lote enviado (ack parcial): solo esos se marcan
   * `sincronizadoEn` localmente. */
  confirmados: string[];
}

/**
 * Un cambio de configuracion versionado que la nube devuelve por el inbox
 * (GET /sync/config?desde=version). Generico a proposito: hoy solo existe un
 * `entidad` concreto implementado (`ReglaDeImpuesto`, ver inbox.service.ts),
 * pero el sobre no asume mas que "algo identificable por id, con una version
 * monotona, y datos a upsertear" (arquitectura.md §4.5, Last-Writer-Wins).
 */
export interface CambioConfigInbox {
  entidad: string;
  id: string;
  version: number;
  datos: Record<string, unknown>;
}

export interface RespuestaSyncConfig {
  /** Version mas alta incluida en esta respuesta (nuevo cursor local). */
  version: number;
  cambios: CambioConfigInbox[];
}
