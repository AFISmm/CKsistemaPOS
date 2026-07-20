/**
 * UUID v7 (RFC 9562) — DUENO: arquitecto-pos / backend-ventas-pos (C-ID).
 *
 * Todas las entidades generadas por el Store Server usan uuidv7() (ordenable
 * por tiempo, evita fragmentacion de indice vs UUID v4). Las entidades
 * transaccionales (Pedido, Pago, LineaDePedido, LineaModificador) aceptan el
 * id que ya trae el cliente/tienda (offline-first, ADR-0002 4.2): en ese caso
 * NO se genera un id nuevo, solo se valida el formato con esUuidV7().
 *
 * Layout (128 bits):
 *   48 bits  unix_ts_ms (big-endian)
 *    4 bits  version (0111)
 *   12 bits  rand_a
 *    2 bits  variant (10)
 *   62 bits  rand_b
 */
import { randomBytes } from "crypto";

export function uuidv7(): string {
  const unixTsMs = BigInt(Date.now());
  const rand = randomBytes(10); // 10 bytes = 80 bits de aleatoriedad (rand_a + rand_b)

  const bytes = Buffer.alloc(16);

  // 48 bits de timestamp -> primeros 6 bytes.
  bytes[0] = Number((unixTsMs >> 40n) & 0xffn);
  bytes[1] = Number((unixTsMs >> 32n) & 0xffn);
  bytes[2] = Number((unixTsMs >> 24n) & 0xffn);
  bytes[3] = Number((unixTsMs >> 16n) & 0xffn);
  bytes[4] = Number((unixTsMs >> 8n) & 0xffn);
  bytes[5] = Number(unixTsMs & 0xffn);

  // rand_a (12 bits) en bytes[6..7], con los 4 bits altos de bytes[6] = version 0111.
  bytes[6] = 0x70 | (rand[0] & 0x0f);
  bytes[7] = rand[1];

  // variant (10) en los 2 bits altos de bytes[8], resto rand_b.
  bytes[8] = 0x80 | (rand[2] & 0x3f);
  bytes[9] = rand[3];
  bytes[10] = rand[4];
  bytes[11] = rand[5];
  bytes[12] = rand[6];
  bytes[13] = rand[7];
  bytes[14] = rand[8];
  bytes[15] = rand[9];

  const hex = bytes.toString("hex");
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join("-");
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Formato general de UUID (cualquier version). Util para validaciones laxas. */
export function esUuid(valor: unknown): valor is string {
  return typeof valor === "string" && UUID_RE.test(valor);
}

/**
 * Valida que el string sea un UUID con el nibble de version = 7. Usado para
 * aceptar (sin regenerar) los ids que el cliente/tienda ya genero como v7
 * (C-ID): "assume el cliente ya envia v7", pero igual se valida el formato
 * para no persistir basura si un cliente viejo todavia manda v4.
 */
export function esUuidV7(valor: unknown): valor is string {
  if (!esUuid(valor)) return false;
  const version = (valor as string).charAt(14).toLowerCase();
  return version === "7";
}
