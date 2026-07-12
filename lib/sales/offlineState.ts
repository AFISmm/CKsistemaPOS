/**
 * Flag de modo offline — DEMO simplificada de la cola offline por tienda.
 *
 * NO es la estrategia real de store-and-forward del arquitecto-pos (eso vive
 * fuera de esta app: Store Server local + sincronizacion, ver ADR-0002/0003).
 * Aqui solo simulamos el interruptor: cuando esta activo, el motor de ventas
 * trata los pagos con tarjeta como "encolado" (no aprobados) hasta que se
 * desactive ("drenar" la cola es responsabilidad futura de pagos-pos).
 *
 * Persistido en globalThis por la misma razon que lib/db/store.ts: Vercel es
 * serverless y no tiene estado persistente entre invocaciones frias.
 */

const g = globalThis as unknown as { __ckPosOffline?: boolean };

export function getModoOffline(): boolean {
  return g.__ckPosOffline ?? false;
}

export function setModoOffline(activo: boolean): void {
  g.__ckPosOffline = activo;
}
