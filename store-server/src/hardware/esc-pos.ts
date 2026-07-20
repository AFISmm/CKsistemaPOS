/**
 * Comandos ESC/POS de bajo nivel (F2-T4, `hardware-perifericos-pos`).
 *
 * ESC/POS es el estandar de facto de impresoras termicas de recibo/comanda
 * (Epson TM series, Star con modo compatible ESC/POS, ver ADR-0006 F0-T3 y
 * arquitectura.md §3/§9). Este archivo es PURO (sin `net`, sin NestJS, sin
 * efectos laterales): solo arma los `Buffer` de bytes exactos del comando.
 * Se mantiene separado de `esc-pos-impresora.adapter.ts` (que SI abre un
 * socket TCP real) para poder testear byte-a-byte sin red
 * (test/unit/esc-pos.spec.ts) — es la parte de esta tarea que debe ser
 * perfecta porque es codigo de protocolo real, no un mock.
 *
 * Referencia (spec publica y estable, sin cambios entre modelos Epson/Star
 * compatibles ESC/POS desde hace anios):
 *  - Epson "ESC/POS Command Reference" (todas las impresoras TM soportan este
 *    subconjunto; es el mismo subconjunto que documentan librerias de
 *    referencia como `node-thermal-printer` y `escpos` de npm, y el mismo que
 *    cita ADR-0006 F0-T3 para el comando de cajon).
 *  - Byte a byte:
 *    - `ESC @`      (0x1B 0x40)        -> Initialize printer (reset a estado
 *      por defecto: sin negrita, alineacion izquierda, tamano normal).
 *    - `ESC E n`    (0x1B 0x45 n)      -> Turn emphasized (bold) mode on/off
 *      (n=1 on, n=0 off).
 *    - `ESC a n`    (0x1B 0x61 n)      -> Select justification
 *      (n=0 izquierda, n=1 centro, n=2 derecha).
 *    - `GS !  n`    (0x1D 0x21 n)      -> Select character size. El nibble
 *      bajo controla el multiplicador de alto-1, el nibble alto el de ancho-1
 *      (ej. n=0x11 = doble alto y doble ancho).
 *    - `GS V m`     (0x1D 0x56 m)      -> Select cut mode and cut paper.
 *      m=0x00 corte total, m=0x01 corte parcial (deja un punto sin cortar).
 *    - `ESC p m t1 t2` (0x1B 0x70 m t1 t2) -> Generate pulse (apertura de
 *      cajon monedero por pulso, el comando de "drawer kick" citado
 *      literalmente en ADR-0006 F0-T3). m selecciona el conector (0 = pin 2,
 *      1 = pin 5); t1/t2 son el tiempo ON/OFF del pulso en unidades de ~2ms.
 */

const ESC = 0x1b;
const GS = 0x1d;

/** `ESC @` — Initialize printer. */
export function comandoInicializar(): Buffer {
  return Buffer.from([ESC, 0x40]);
}

/** `ESC E n` — Turn emphasized (bold) mode on/off. */
export function comandoNegrita(activar: boolean): Buffer {
  return Buffer.from([ESC, 0x45, activar ? 1 : 0]);
}

export type Alineacion = "izquierda" | "centro" | "derecha";

/** `ESC a n` — Select justification. */
export function comandoAlineacion(alineacion: Alineacion): Buffer {
  const n = alineacion === "izquierda" ? 0 : alineacion === "centro" ? 1 : 2;
  return Buffer.from([ESC, 0x61, n]);
}

/**
 * `GS ! n` — Select character size. `anchoX`/`altoX` son multiplicadores
 * 1-8 (1 = tamano normal). Clampa a ese rango para nunca emitir un byte
 * fuera de la mascara de 4 bits que espera el comando.
 */
export function comandoTamano(anchoX = 1, altoX = 1): Buffer {
  const clamp = (v: number) => Math.min(8, Math.max(1, Math.trunc(v)));
  const n = ((clamp(altoX) - 1) & 0x0f) | (((clamp(anchoX) - 1) & 0x0f) << 4);
  return Buffer.from([GS, 0x21, n]);
}

/** Texto plano (ASCII/latin1 — suficiente para el MVP de mostrador en EN/ES sin acentos extendidos raros). */
export function comandoTexto(texto: string): Buffer {
  return Buffer.from(texto, "ascii");
}

/** Salto(s) de linea (LF, 0x0A). */
export function comandoSaltoLinea(lineas = 1): Buffer {
  return Buffer.from(new Array(Math.max(0, lineas)).fill(0x0a));
}

/** `GS V m` — Select cut mode and cut paper. `parcial=false` = corte total. */
export function comandoCorte(parcial = false): Buffer {
  return Buffer.from([GS, 0x56, parcial ? 0x01 : 0x00]);
}

/**
 * `ESC p m t1 t2` — Generate pulse (drawer kick). Defaults (`pin=0`,
 * `t1=25`, `t2=250`) son los valores de referencia estandar de la industria
 * (~50ms ON / ~500ms OFF) usados por las librerias ESC/POS de referencia
 * citadas en ADR-0006 F0-T3; el modelo real final (compra pendiente) puede
 * requerir ajustar t1/t2 segun su datasheet, sin cambiar la forma del
 * comando.
 */
export function comandoAbrirCajon(pin: 0 | 1 = 0, t1 = 25, t2 = 250): Buffer {
  return Buffer.from([ESC, 0x70, pin, t1 & 0xff, t2 & 0xff]);
}

/** Concatena varios buffers de comando en un unico trabajo de impresion. */
export function concatenarComandos(...partes: Buffer[]): Buffer {
  return Buffer.concat(partes);
}
