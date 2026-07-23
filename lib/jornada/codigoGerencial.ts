/**
 * Codigo de autorizacion gerencial DIARIO — DUENO: rrhh-personal-pos / seguridad
 * de acceso (Fase A, idea de innovacion de la llamada de revision 2026-07-22:
 * "autorizacion remota por notificacion push al gerente" — un push real es
 * Fase C/fuera de alcance de este plazo; esto es la alternativa simple
 * propuesta para esta fase: un codigo que un gerente puede leer/dictar de
 * memoria una vez al dia, sin necesitar estar fisicamente presente para
 * teclear su PIN en cada anulacion/descuento).
 *
 * REUSA el MISMO algoritmo TOTP real de lib/jornada/totp.ts (HMAC-SHA1 sobre
 * un contador de tiempo, RFC 6238/4226) que ya se usa para el codigo de 10s
 * de /jornada/pantalla — NO es una segunda implementacion de TOTP. La unica
 * diferencia es el periodo de rotacion: 86400 segundos (1 dia) en vez de 10s,
 * y sin tolerancia retroactiva (el codigo de HOY unicamente, ver
 * `OpcionesValidarCodigo.ventanasAtras` en totp.ts) — un codigo dictado una
 * vez al dia no tiene la misma excusa de "latencia de red de unos segundos"
 * que si tiene el codigo de jornada.
 *
 * SEPARACION DE DOMINIO: en vez de usar `Ubicacion.secretoTotp` tal cual
 * (mismo secreto que ya usa el chequeo de jornada), se le concatena un sufijo
 * fijo antes de pasarlo al HMAC. Con esto, el codigo gerencial y el codigo de
 * jornada de la MISMA tienda son valores HMAC completamente distintos (nunca
 * coinciden, ni siquiera por casualidad en el mismo instante) aunque
 * compartan el secreto de base — evita reutilizar literalmente el mismo
 * "espacio de codigos" para dos propositos de autorizacion distintos, sin
 * necesitar aprovisionar/rotar un segundo secreto por tienda en esta demo.
 * Produccion: secreto propio, independiente y rotable para este proposito.
 *
 * ALCANCE DE ESTA PASADA (explicito, ver tarea): esto construye el MECANISMO
 * (generar + validar) y UN punto de uso de ejemplo (ver
 * app/jornada/codigo-gerencial/page.tsx, panel "Verificar codigo"). NO se
 * conecta a los checkpoints de autorizacion existentes en lib/sales/engine.ts
 * (descuentos/anulaciones) — eso pertenece a quien sea dueno de ese archivo;
 * `validarCodigoGerencial` esta lista para que ese modulo la llame cuando
 * corresponda (recibe ubicacionId + el codigo que el cajero recibio del
 * gerente, y devuelve un boolean).
 *
 * NOTA DE SEGURIDAD HONESTA: al igual que el resto de los endpoints de esta
 * demo (ver docs/analisis-revision-20260722-modulos-innovacion-seguridad.md
 * seccion de seguridad para produccion), NINGUN endpoint de esta app valida
 * todavia un token de sesion firmado server-side — el permiso de "ver el
 * codigo gerencial" hoy es SOLO un gate de UI (ver la pagina que lo consume),
 * no una proteccion real de backend. Igual que el resto del sistema, eso
 * requeriria sesiones firmadas + verificacion server-side (fuera de alcance
 * de esta pasada puntual).
 */

import { getDb } from "../db/store";
import type { Ubicacion } from "../domain/types";
import { ErrorJornada } from "./errores";
import { generarCodigoVigente, validarCodigo, type CodigoTotpVigente } from "./totp";

/** Periodo de rotacion del codigo gerencial: 1 dia (86400s), decision de negocio de esta idea de innovacion. */
export const PERIODO_CODIGO_GERENCIAL_SEG = 86400;

/** Sufijo de separacion de dominio frente al secreto TOTP de jornada (ver nota de arriba). */
const SUFIJO_DOMINIO_GERENCIAL = "::codigo-gerencial-v1";

function secretoGerencial(ubicacion: Ubicacion): string {
  return `${ubicacion.secretoTotp}${SUFIJO_DOMINIO_GERENCIAL}`;
}

function obtenerUbicacionOrThrow(ubicacionId: string): Ubicacion {
  const ubicacion = getDb().ubicaciones.find((u) => u.id === ubicacionId);
  if (!ubicacion) {
    throw new ErrorJornada("ubicacion_no_encontrada", `Ubicacion ${ubicacionId} no existe`, 404);
  }
  return ubicacion;
}

/**
 * Codigo de autorizacion gerencial vigente HOY para una ubicacion, + segundos
 * hasta que rote (a medianoche UTC del reloj del servidor, por como funciona
 * el contador de instante de totp.ts — ver README-DEMO.md sobre zonas horarias
 * simplificadas en esta demo). Pensado para una pantalla/panel que un gerente
 * con permiso pueda abrir a demanda (no un kiosko fijo como /jornada/pantalla,
 * ver docstring de arriba).
 */
export function obtenerCodigoGerencialVigente(
  ubicacionId: string,
  ahoraMs: number = Date.now()
): CodigoTotpVigente {
  const ubicacion = obtenerUbicacionOrThrow(ubicacionId);
  return generarCodigoVigente(secretoGerencial(ubicacion), ahoraMs, PERIODO_CODIGO_GERENCIAL_SEG);
}

/**
 * Valida un codigo de autorizacion gerencial contra la ubicacion indicada.
 * Sin tolerancia retroactiva (`ventanasAtras: 0`): solo el codigo de HOY es
 * valido. Punto de integracion pensado para lib/sales/engine.ts (descuentos/
 * anulaciones) u otro checkpoint que necesite una autorizacion gerencial
 * secundaria cuando el gerente no puede teclear su PIN en persona — ver
 * ALCANCE DE ESTA PASADA arriba: no se conecta a esos checkpoints en este
 * cambio, solo se deja lista para consumirse.
 */
export function validarCodigoGerencial(
  ubicacionId: string,
  codigo: string,
  ahoraMs: number = Date.now()
): boolean {
  const ubicacion = obtenerUbicacionOrThrow(ubicacionId);
  return validarCodigo(secretoGerencial(ubicacion), codigo, ahoraMs, {
    periodoSeg: PERIODO_CODIGO_GERENCIAL_SEG,
    ventanasAtras: 0,
  });
}
