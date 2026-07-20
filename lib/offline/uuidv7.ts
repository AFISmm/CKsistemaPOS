/**
 * Generador de UUID v7 (RFC 9562) — DUENO: frontend-mostrador-kiosco-pos.
 *
 * Motivo (F1-T3 / regla de arquitectura C-ID, ver docs/arquitectura.md): las
 * entidades transaccionales generadas por el CLIENTE deben usar ids v7
 * (ordenables por tiempo), no v4. Hoy esta demo asigna `Pedido.id`/`Pago.id`
 * en el SERVIDOR (ver lib/db/store.ts `uid()`, todavia v4 a proposito — su
 * migracion a v7 es tarea aparte del backend, fuera de este modulo). Este
 * helper es la pieza CLIENTE de la regla C-ID y se usa hoy para:
 *   1. El id de cada entrada de `colaEscritura` (lib/offline/db.ts) — asi el
 *      orden de reproduccion de la cola puede derivarse del propio id.
 *   2. Una `idempotencyKey` v7 generada por el cliente y enviada en el body
 *      (y header `Idempotency-Key`) de las escrituras que crean entidades
 *      nuevas (crear pedido, registrar pago) — ver components/pos/api.ts.
 *      Las rutas actuales de app/api/v1/** ignoran ese campo extra (no
 *      cambia el comportamiento de hoy), pero deja el cliente listo para
 *      cuando el Store Server (tarea paralela, store-server/) empiece a
 *      aceptar/exigir ids v7 generados por el cliente para deduplicar
 *      reintentos offline.
 *
 * Sin dependencias nuevas: usa `crypto.getRandomValues` (disponible en
 * navegadores modernos y en Node >= 19 via globalThis.crypto) con fallback a
 * Math.random() si no existe (entornos de prueba muy antiguos).
 *
 * Implementa monotonicidad dentro del mismo proceso (contador de 12 bits que
 * se incrementa si dos llamadas caen en el mismo milisegundo) para que ids
 * generados en rafaga (ej. varias lineas seguidas) mantengan orden estable.
 */

let ultimoMs = -1;
let contador = 0; // 12 bits: 0..4095

function bytesAleatorios(n: number): Uint8Array {
  const arr = new Uint8Array(n);
  const c = (globalThis as unknown as { crypto?: Crypto }).crypto;
  if (c && typeof c.getRandomValues === "function") {
    c.getRandomValues(arr);
  } else {
    for (let i = 0; i < n; i++) arr[i] = Math.floor(Math.random() * 256);
  }
  return arr;
}

function aHex(bytes: Uint8Array): string {
  let hex = "";
  for (const b of bytes) hex += b.toString(16).padStart(2, "0");
  return hex;
}

/** Genera un UUID v7 nuevo (string con formato canonico con guiones). */
export function uuidv7(): string {
  let ms = Date.now();

  if (ms <= ultimoMs) {
    // Mismo milisegundo (o reloj retrocedido): mantenemos ultimoMs y
    // avanzamos el contador para preservar el orden estrictamente creciente.
    ms = ultimoMs;
    contador = (contador + 1) & 0xfff;
    if (contador === 0) {
      // Contador de 12 bits desbordado dentro del mismo ms (practicamente
      // imposible en uso real): forzamos el reloj un ms hacia adelante.
      ms += 1;
    }
  } else {
    const semilla = bytesAleatorios(2);
    contador = ((semilla[0] << 8) | semilla[1]) & 0xfff;
  }
  ultimoMs = ms;

  const bytes = new Uint8Array(16);
  const tsBig = BigInt(ms);
  bytes[0] = Number((tsBig >> 40n) & 0xffn);
  bytes[1] = Number((tsBig >> 32n) & 0xffn);
  bytes[2] = Number((tsBig >> 24n) & 0xffn);
  bytes[3] = Number((tsBig >> 16n) & 0xffn);
  bytes[4] = Number((tsBig >> 8n) & 0xffn);
  bytes[5] = Number(tsBig & 0xffn);

  // Octeto 6: version (0111) en el nibble alto + 4 bits altos del contador.
  bytes[6] = 0x70 | ((contador >> 8) & 0x0f);
  // Octeto 7: 8 bits bajos del contador.
  bytes[7] = contador & 0xff;

  const azar = bytesAleatorios(8);
  // Octeto 8: variante RFC (10xxxxxx) + 6 bits de azar.
  bytes[8] = 0x80 | (azar[0] & 0x3f);
  bytes[9] = azar[1];
  bytes[10] = azar[2];
  bytes[11] = azar[3];
  bytes[12] = azar[4];
  bytes[13] = azar[5];
  bytes[14] = azar[6];
  bytes[15] = azar[7];

  const hex = aHex(bytes);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** Extrae el timestamp (ms desde epoch) codificado en los primeros 48 bits de un UUID v7. */
export function timestampMsDeUuidv7(id: string): number {
  const hex = id.replace(/-/g, "").slice(0, 12);
  return Number(BigInt(`0x${hex}`));
}

/** Valida el formato canonico y que la version/variante correspondan a v7. */
export function esUuidv7Valido(id: string): boolean {
  const patron = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return patron.test(id);
}
