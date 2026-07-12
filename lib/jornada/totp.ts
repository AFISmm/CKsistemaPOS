/**
 * TOTP (Time-based One-Time Password) — RFC 6238 simplificado — DUENO:
 * rrhh-personal-pos (etapa 2, chequeo de inicio de jornada).
 *
 * Implementacion REAL del algoritmo (HMAC-SHA1 sobre un contador de tiempo,
 * el mismo principio que usan apps tipo Google Authenticator / RFC 6238),
 * usando el modulo `crypto` de Node (`createHmac`) — no es un generador
 * aleatorio ni un algoritmo inventado.
 *
 * Dos simplificaciones DEMO documentadas frente al estandar (no afectan la
 * solidez del algoritmo en si, solo la interoperabilidad con terceros):
 *  1. El "secreto" (Ubicacion.secretoTotp) es un string UTF-8 arbitrario
 *     usado directo como clave HMAC, en vez de un secreto binario codificado
 *     en Base32 (RFC 4648) como exige el estandar para poder cargarse en
 *     apps autenticadoras externas (Google Authenticator, etc). Aqui no hace
 *     falta esa interoperabilidad: el codigo se genera Y se valida en el
 *     mismo servidor (nunca sale de la pantalla central de la tienda).
 *  2. El periodo es de 10 SEGUNDOS (requisito de negocio de esta demo, para
 *     que el codigo "rote rapido" y sea dificil de reutilizar) en vez de los
 *     30s tipicos de TOTP para apps autenticadoras. El algoritmo (HMAC,
 *     truncamiento dinamico, modulo 10^6) es exactamente el que define el RFC.
 *
 * Uso en el flujo de jornada:
 *  - El secreto NUNCA se expone al celular del empleado.
 *  - Solo se usa server-side para (a) calcular el codigo que se muestra en
 *    la pantalla central de la tienda (GET /api/v1/jornada/codigo) y
 *    (b) validar el codigo que el empleado escribe en su celular
 *    (POST /api/v1/jornada/marcar).
 */

import { createHmac } from "crypto";

/** Periodo de rotacion del codigo, en segundos (decision de negocio: 10s). */
export const PERIODO_TOTP_SEG = 10;
const DIGITOS_TOTP = 6;

/** HOTP (RFC 4226): HMAC-SHA1 sobre un contador de 8 bytes big-endian, truncamiento dinamico a 6 digitos. */
function hotp(secreto: string, contador: number): string {
  const buffer = Buffer.alloc(8);
  // El contador de 10s-en-10s cabe holgadamente en 32 bits durante la vida
  // de esta demo; se escribe en los 4 bytes bajos del buffer de 8 bytes que
  // exige HOTP.
  buffer.writeUInt32BE(0, 0);
  buffer.writeUInt32BE(contador >>> 0, 4);

  const hmac = createHmac("sha1", secreto).update(buffer).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binario =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  const codigo = binario % 10 ** DIGITOS_TOTP;
  return codigo.toString().padStart(DIGITOS_TOTP, "0");
}

function contadorDeInstante(epochMs: number): number {
  return Math.floor(epochMs / 1000 / PERIODO_TOTP_SEG);
}

export interface CodigoTotpVigente {
  codigo: string;
  /** Segundos restantes hasta que el codigo rote (para el anillo/contador visual de la pantalla central). */
  segundosRestantes: number;
}

/** Codigo TOTP vigente ahora mismo para el secreto de una ubicacion, + segundos hasta que rote. */
export function generarCodigoVigente(
  secreto: string,
  ahoraMs: number = Date.now()
): CodigoTotpVigente {
  const contador = contadorDeInstante(ahoraMs);
  const codigo = hotp(secreto, contador);
  const segundosDentroDeVentana = Math.floor(ahoraMs / 1000) % PERIODO_TOTP_SEG;
  const segundosRestantes = PERIODO_TOTP_SEG - segundosDentroDeVentana;
  return { codigo, segundosRestantes };
}

/**
 * Valida un codigo TOTP tolerando 1 ventana de desfase hacia atras (el
 * contador actual y el inmediatamente anterior), para no ser demasiado
 * estricto con la latencia entre "el empleado lee el codigo de la pantalla
 * central" y "lo envia desde su celular" (red movil, escritura manual, etc).
 */
export function validarCodigo(secreto: string, codigo: string, ahoraMs: number = Date.now()): boolean {
  const codigoLimpio = (codigo ?? "").trim();
  if (!/^\d{6}$/.test(codigoLimpio)) return false;

  const contadorActual = contadorDeInstante(ahoraMs);
  return [contadorActual, contadorActual - 1].some((c) => hotp(secreto, c) === codigoLimpio);
}
