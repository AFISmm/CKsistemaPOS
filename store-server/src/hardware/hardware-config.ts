/**
 * Resolucion de configuracion del adaptador de impresora (F2-T4). Mismo
 * patron que `src/sync/mtls-config.ts` (F1-T5): funcion PURA, sin leer
 * `process.env` directamente, para poder testear el branching real-vs-
 * simulador sin variables de entorno de verdad (test/unit/hardware-config.spec.ts).
 *
 * Regla: si `IMPRESORA_HOST` no esta definida (o es string vacio), se cae al
 * `SimuladorImpresoraAdapter` (consola) — es el DEFAULT deliberado para
 * desarrollo/sandbox sin hardware fisico. Solo con `IMPRESORA_HOST` presente
 * se activa el adaptador ESC/POS real (TCP puerto 9100 por defecto, RFC de
 * facto de impresion ESC/POS en red, arquitectura.md §3).
 */
export interface ConfigImpresoraEnv {
  host?: string;
  puerto?: string;
}

export type ConfigImpresora = { modo: "real"; host: string; puerto: number } | { modo: "simulador" };

const PUERTO_ESC_POS_DEFAULT = 9100;

export function resolverConfigImpresora(env: ConfigImpresoraEnv): ConfigImpresora {
  const host = env.host?.trim();
  if (!host) {
    return { modo: "simulador" };
  }

  const puertoParseado = env.puerto ? Number(env.puerto) : PUERTO_ESC_POS_DEFAULT;
  const puerto = Number.isFinite(puertoParseado) && puertoParseado > 0 ? puertoParseado : PUERTO_ESC_POS_DEFAULT;

  return { modo: "real", host, puerto };
}

/** Lee las env vars reales (`IMPRESORA_HOST`/`IMPRESORA_PUERTO`) — punto de entrada real. */
export function leerConfigImpresoraEnv(): ConfigImpresoraEnv {
  return { host: process.env.IMPRESORA_HOST, puerto: process.env.IMPRESORA_PUERTO };
}
