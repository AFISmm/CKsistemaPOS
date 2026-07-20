/**
 * Backoff exponencial con jitter para reintentos de red (F1-T5).
 *
 * Estrategia "full jitter" (ver AWS Architecture Blog, "Exponential Backoff
 * And Jitter"): delay = random(0, min(maxMs, baseMs * 2^intento)). Evita el
 * efecto manada (varias tiendas reintentando exactamente al mismo tiempo) y
 * crece exponencialmente hasta un tope (`maxMs`) para no reintentar cada vez
 * mas lento sin limite.
 *
 * Funcion pura (sin `setTimeout`, sin I/O): `sleep()` abajo es el unico punto
 * que toca el reloj real, y no se usa en los tests unitarios de backoff.
 */
export interface OpcionesBackoff {
  /** Base del crecimiento exponencial en ms (default 500ms). */
  baseMs?: number;
  /** Tope maximo del delay en ms (default 30s). */
  maxMs?: number;
  /** Generador aleatorio inyectable (default Math.random) para tests deterministas. */
  aleatorio?: () => number;
}

/**
 * Calcula el delay (ms) antes del reintento numero `intento` (0-indexado: el
 * primer reintento tras el intento inicial fallido es `intento = 0`).
 */
export function calcularBackoffMs(intento: number, opciones: OpcionesBackoff = {}): number {
  if (intento < 0) {
    throw new Error("intento debe ser >= 0");
  }
  const baseMs = opciones.baseMs ?? 500;
  const maxMs = opciones.maxMs ?? 30_000;
  const aleatorio = opciones.aleatorio ?? Math.random;

  const techoExponencial = Math.min(maxMs, baseMs * 2 ** intento);
  return Math.round(aleatorio() * techoExponencial);
}

/** Espera real (usada solo en el ciclo productivo, nunca en tests unitarios de calcularBackoffMs). */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
