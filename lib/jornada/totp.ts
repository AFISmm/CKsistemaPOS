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
 *
 * AGREGADO (Fase A, revision 2026-07-22 — "autorizacion remota" / codigo
 * gerencial diario): `generarCodigoVigente`/`validarCodigo` ahora aceptan un
 * `periodoSeg` opcional (por defecto `PERIODO_TOTP_SEG`, 10s, EXACTAMENTE el
 * mismo comportamiento que antes para todo el codigo existente de jornada que
 * no pasa ese argumento). Esto permite que lib/jornada/codigoGerencial.ts
 * REUSE este mismo algoritmo HOTP con un periodo de 86400s (1 dia) para un
 * codigo de autorizacion gerencial, en vez de escribir una segunda
 * implementacion de TOTP. Ver ese archivo para el detalle.
 */

import { createHmac } from "crypto";

/** Periodo de rotacion del codigo, en segundos (decision de negocio: 10s). */
export const PERIODO_TOTP_SEG = 10;
const DIGITOS_TOTP = 6;

/** HOTP (RFC 4226): HMAC-SHA1 sobre un contador de 8 bytes big-endian, truncamiento dinamico a 6 digitos. */
function hotp(secreto: string, contador: number): string {
  const buffer = Buffer.alloc(8);
  // El contador (ya sea de 10s-en-10s para jornada, o de 1-dia-en-1-dia para
  // el codigo gerencial, ver lib/jornada/codigoGerencial.ts) cabe holgadamente
  // en 32 bits durante la vida de esta demo; se escribe en los 4 bytes bajos
  // del buffer de 8 bytes que exige HOTP.
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

function contadorDeInstante(epochMs: number, periodoSeg: number): number {
  return Math.floor(epochMs / 1000 / periodoSeg);
}

export interface CodigoTotpVigente {
  codigo: string;
  /** Segundos restantes hasta que el codigo rote (para el anillo/contador visual de la pantalla central). */
  segundosRestantes: number;
}

/**
 * Codigo TOTP vigente ahora mismo para un secreto dado, + segundos hasta que
 * rote. `periodoSeg` por defecto es el de jornada (10s); el codigo gerencial
 * diario (lib/jornada/codigoGerencial.ts) le pasa 86400.
 */
export function generarCodigoVigente(
  secreto: string,
  ahoraMs: number = Date.now(),
  periodoSeg: number = PERIODO_TOTP_SEG
): CodigoTotpVigente {
  const contador = contadorDeInstante(ahoraMs, periodoSeg);
  const codigo = hotp(secreto, contador);
  const segundosDentroDeVentana = Math.floor(ahoraMs / 1000) % periodoSeg;
  const segundosRestantes = periodoSeg - segundosDentroDeVentana;
  return { codigo, segundosRestantes };
}

export interface OpcionesValidarCodigo {
  /** Igual que en generarCodigoVigente: por defecto el de jornada (10s). */
  periodoSeg?: number;
  /**
   * Cuantas ventanas HACIA ATRAS se toleran ademas de la actual (por defecto
   * 1, el comportamiento historico de jornada: contador actual + el
   * inmediatamente anterior, para no ser estricto con la latencia entre leer
   * el codigo en la pantalla central y enviarlo desde el celular). El codigo
   * gerencial diario pasa 0 (sin tolerancia retroactiva: solo el codigo de
   * HOY es valido, no el de ayer) porque ahi no hay excusa de latencia de red
   * de unos segundos — es un codigo que un gerente dicta/lee una vez al dia.
   */
  ventanasAtras?: number;
}

/**
 * Valida un codigo TOTP tolerando `ventanasAtras` ventanas de desfase hacia
 * atras (por defecto 1, ver OpcionesValidarCodigo), para no ser demasiado
 * estricto con la latencia entre "el empleado lee el codigo de la pantalla
 * central" y "lo envia desde su celular" (red movil, escritura manual, etc).
 */
export function validarCodigo(
  secreto: string,
  codigo: string,
  ahoraMs: number = Date.now(),
  opciones: OpcionesValidarCodigo = {}
): boolean {
  const codigoLimpio = (codigo ?? "").trim();
  if (!/^\d{6}$/.test(codigoLimpio)) return false;

  const periodoSeg = opciones.periodoSeg ?? PERIODO_TOTP_SEG;
  const ventanasAtras = opciones.ventanasAtras ?? 1;
  const contadorActual = contadorDeInstante(ahoraMs, periodoSeg);
  for (let i = 0; i <= ventanasAtras; i++) {
    if (hotp(secreto, contadorActual - i) === codigoLimpio) return true;
  }
  return false;
}
