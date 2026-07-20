/**
 * Resolucion de configuracion del monitoreo de conectividad (F3-T2). Mismo
 * patron que `src/hardware/hardware-config.ts` / `src/sync/mtls-config.ts`:
 * funciones PURAS que no leen `process.env` directamente, para poder testear
 * el parseo/branching sin variables de entorno reales
 * (test/unit/conectividad-config.spec.ts), mas un punto de entrada separado
 * (`leerConfigConectividadEnv`) que si lee `process.env`.
 */

export interface ConfigConectividadEnvRaw {
  hosts?: string;
  intervaloMs?: string;
  timeoutMs?: string;
  minFallosParaDegradado?: string;
  confirmacionesRequeridas?: string;
  ubicacionId?: string;
  historialMax?: string;
}

export interface ConfigConectividad {
  /** Lista de URLs a verificar cada ciclo. Nunca un solo host (ver default). */
  hosts: string[];
  /** Cadencia del ciclo de verificacion, en ms. Debe ser mucho mas rapida que
   *  SYNC_INTERVALO_MS (F1-T5, default 15s) para alertar ANTES de que el
   *  outbox note el problema (pedido explicito de la tarea). */
  intervaloMs: number;
  /** Timeout por host verificado, en ms. */
  timeoutMs: number;
  minFallosParaDegradado: number;
  confirmacionesRequeridas: number;
  /** Ubicacion de la tienda piloto (mismo default que pedidos.controller.ts/turnos.controller.ts). */
  ubicacionId: string;
  /** Cuantas transiciones recientes devuelve GET /api/v1/conectividad/estado. */
  historialMax: number;
}

/**
 * Lista default de hosts publicos, confiables, de proveedores DISTINTOS
 * (Google/Cloudflare/Microsoft) para no depender de un unico punto de falla
 * al medir "hay internet" (pedido explicito de la tarea: "no hardcodear un
 * unico punto de fallo"). `generate_204` es el endpoint que Android/ChromeOS
 * usan de forma real para deteccion de portal cautivo: responde 204 sin
 * cuerpo, muy liviano.
 */
export const HOSTS_CONECTIVIDAD_DEFAULT: readonly string[] = [
  "https://www.google.com/generate_204",
  "https://www.cloudflare.com",
  "https://www.microsoft.com",
];

const DEFAULTS = {
  intervaloMs: 20_000,
  timeoutMs: 5_000,
  minFallosParaDegradado: 1,
  confirmacionesRequeridas: 2,
  ubicacionId: "ubic-miami-fl",
  historialMax: 20,
} as const;

function leerEnteroPositivo(valor: string | undefined, porDefecto: number): number {
  if (valor === undefined || valor.trim() === "") return porDefecto;
  const n = Number(valor);
  return Number.isFinite(n) && n > 0 ? n : porDefecto;
}

/** Parsea `CONECTIVIDAD_HOSTS` (coma-separado) a una lista no vacia de URLs. Pura. */
export function resolverHostsConectividad(valor: string | undefined): string[] {
  if (!valor || !valor.trim()) return [...HOSTS_CONECTIVIDAD_DEFAULT];
  const hosts = valor
    .split(",")
    .map((h) => h.trim())
    .filter((h) => h.length > 0);
  return hosts.length > 0 ? hosts : [...HOSTS_CONECTIVIDAD_DEFAULT];
}

export function resolverConfigConectividad(env: ConfigConectividadEnvRaw): ConfigConectividad {
  return {
    hosts: resolverHostsConectividad(env.hosts),
    intervaloMs: leerEnteroPositivo(env.intervaloMs, DEFAULTS.intervaloMs),
    timeoutMs: leerEnteroPositivo(env.timeoutMs, DEFAULTS.timeoutMs),
    minFallosParaDegradado: leerEnteroPositivo(env.minFallosParaDegradado, DEFAULTS.minFallosParaDegradado),
    confirmacionesRequeridas: leerEnteroPositivo(env.confirmacionesRequeridas, DEFAULTS.confirmacionesRequeridas),
    ubicacionId: env.ubicacionId?.trim() || DEFAULTS.ubicacionId,
    historialMax: leerEnteroPositivo(env.historialMax, DEFAULTS.historialMax),
  };
}

/** Punto de entrada real via `process.env` (incluye `UBICACION_PILOTO_ID`, ya existente desde F1-T1). */
export function leerConfigConectividadEnv(): ConfigConectividadEnvRaw {
  return {
    hosts: process.env.CONECTIVIDAD_HOSTS,
    intervaloMs: process.env.CONECTIVIDAD_INTERVALO_MS,
    timeoutMs: process.env.CONECTIVIDAD_TIMEOUT_MS,
    minFallosParaDegradado: process.env.CONECTIVIDAD_MIN_FALLOS_DEGRADADO,
    confirmacionesRequeridas: process.env.CONECTIVIDAD_CONFIRMACIONES_REQUERIDAS,
    ubicacionId: process.env.UBICACION_PILOTO_ID,
    historialMax: process.env.CONECTIVIDAD_HISTORIAL_MAX,
  };
}
