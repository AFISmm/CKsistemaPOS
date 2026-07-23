/**
 * Bloqueo temporal de login por PIN — DUENO: shell de UI / lib/auth
 * (seguridad de acceso, hallazgo de la llamada de revision 2026-07-22:
 * "bloqueo por intentos fallidos de PIN" en el plan de seguridad para
 * produccion, ver docs/analisis-revision-20260722-modulos-innovacion-seguridad.md).
 *
 * Mismo patron EXACTO que lib/jornada/bloqueo.ts (bloqueo de verificacion
 * facial): 3 intentos de PIN fallidos CONSECUTIVOS bloquean el login por PIN
 * de ESE Usuario por 5 minutos. Mismo N (3) y misma ventana (5 min) que el
 * bloqueo facial ya existente, por consistencia dentro de la app — no hay una
 * razon de negocio para que difieran, y reusar los mismos numeros hace mas
 * facil explicarle el comportamiento a un usuario/soporte ("3 intentos, 5
 * minutos", sin importar el metodo).
 *
 * Estado en memoria via lib/db/store.ts (Db.bloqueosPin), mismo patron
 * singleton que el resto de la demo: se reinicia en cold start de Vercel o al
 * llamar POST /api/v1/reset.
 *
 * DIFERENCIA DE INDEXADO frente a bloqueo.ts: el bloqueo facial se indexa por
 * `empleadoId` porque el celular del empleado YA sabe que empleado eligio de
 * una lista (no hay ambiguedad ni riesgo de enumeracion nuevo). Este bloqueo
 * de PIN se indexa por `Usuario.id`, y SOLO se activa cuando
 * lib/auth/autenticacion.ts ya resolvio un Usuario real a partir del email
 * ingresado (si el email no existe, nunca se llega a incrementar nada aqui:
 * ver la nota de compensacion mas abajo).
 *
 * NOTA DE SEGURIDAD HONESTA (igual que las demas notas de este tipo en el
 * repo): una vez que un email SI resuelve a un Usuario y el atacante agota 3
 * intentos, el mensaje de error cambia de "credenciales invalidas" (generico)
 * a "bloqueado temporalmente" — eso revela, con el tiempo, que ese correo
 * pertenece a una cuenta real (una fuga de informacion minima: 1 bit,
 * "existe/no existe", solo despues de 3 intentos). Es un tradeoff aceptado
 * explicitamente en esta demo para poder ofrecer bloqueo por fuerza bruta sin
 * inventar un mecanismo nuevo: la alternativa (bloquear tambien emails
 * inexistentes) requeriria trackear intentos por email en vez de por Usuario,
 * lo que abre la puerta a que un atacante "bloquee" cuentas ajenas con solo
 * el correo (sin saber si existen) - un riesgo peor. Produccion: mitigarlo
 * con rate limiting por IP/dispositivo (fuera de alcance de esta demo).
 */

import { getDb } from "../db/store";
import type { EstadoBloqueoPin } from "../domain/types";

const MAX_INTENTOS_FALLIDOS_CONSECUTIVOS = 3;
const BLOQUEO_MINUTOS = 5;

function obtenerOCrearEstado(usuarioId: string): EstadoBloqueoPin {
  let estado = getDb().bloqueosPin.find((b) => b.usuarioId === usuarioId);
  if (!estado) {
    estado = { usuarioId, intentosFallidosConsecutivos: 0, bloqueadoHasta: null };
    getDb().bloqueosPin.push(estado);
  }
  return estado;
}

/** Bloqueo vigente ahora mismo (ISO datetime), o null si no hay bloqueo activo / ya expiro. */
export function bloqueadoHastaPin(usuarioId: string): string | null {
  const estado = getDb().bloqueosPin.find((b) => b.usuarioId === usuarioId);
  if (!estado?.bloqueadoHasta) return null;
  if (new Date(estado.bloqueadoHasta).getTime() <= Date.now()) return null; // ya expiro
  return estado.bloqueadoHasta;
}

/**
 * Registra un intento fallido de PIN para el Usuario; al llegar a 3 fallos
 * consecutivos, activa el bloqueo de 5 minutos. Si un bloqueo anterior ya
 * expiro, el contador arranca limpio de nuevo.
 */
export function registrarIntentoFallidoPin(usuarioId: string): { bloqueadoHasta: string | null } {
  const estado = obtenerOCrearEstado(usuarioId);

  if (estado.bloqueadoHasta && new Date(estado.bloqueadoHasta).getTime() <= Date.now()) {
    estado.bloqueadoHasta = null;
    estado.intentosFallidosConsecutivos = 0;
  }

  estado.intentosFallidosConsecutivos += 1;
  if (estado.intentosFallidosConsecutivos >= MAX_INTENTOS_FALLIDOS_CONSECUTIVOS) {
    estado.bloqueadoHasta = new Date(Date.now() + BLOQUEO_MINUTOS * 60_000).toISOString();
  }

  return { bloqueadoHasta: estado.bloqueadoHasta };
}

/** Limpia el contador de fallos y levanta el bloqueo (tras un login exitoso). */
export function reiniciarIntentosPin(usuarioId: string): void {
  const estado = obtenerOCrearEstado(usuarioId);
  estado.intentosFallidosConsecutivos = 0;
  estado.bloqueadoHasta = null;
}
