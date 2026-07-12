/**
 * Bloqueo temporal de verificacion facial — DUENO: rrhh-personal-pos (etapa
 * 2, chequeo de inicio de jornada).
 *
 * Regla de negocio YA DECIDIDA con el dueno de producto: 3 intentos fallidos
 * CONSECUTIVOS de verificacion facial (simulada) bloquean al empleado por 5
 * minutos para ESE metodo especifico; el PIN de respaldo (Usuario.pinHash)
 * sigue disponible durante el bloqueo (ver lib/jornada/marcaje.ts).
 *
 * Estado en memoria via lib/db/store.ts (Db.bloqueosVerificacionFacial),
 * mismo patron singleton que el resto de la demo: se reinicia en cold start
 * de Vercel o al llamar POST /api/v1/reset. El cliente (celular del
 * empleado) cuenta fallos localmente solo para la UX; la FUENTE DE VERDAD
 * del bloqueo es siempre este modulo server-side.
 */

import { getDb } from "../db/store";
import type { EstadoVerificacionFacial } from "../domain/types";

const MAX_INTENTOS_FALLIDOS_CONSECUTIVOS = 3;
const BLOQUEO_MINUTOS = 5;

function obtenerOCrearEstado(empleadoId: string): EstadoVerificacionFacial {
  let estado = getDb().bloqueosVerificacionFacial.find((b) => b.empleadoId === empleadoId);
  if (!estado) {
    estado = { empleadoId, intentosFallidosConsecutivos: 0, bloqueadoHasta: null };
    getDb().bloqueosVerificacionFacial.push(estado);
  }
  return estado;
}

/** Bloqueo vigente ahora mismo (ISO datetime), o null si no hay bloqueo activo / ya expiro. */
export function bloqueadoHasta(empleadoId: string): string | null {
  const estado = getDb().bloqueosVerificacionFacial.find((b) => b.empleadoId === empleadoId);
  if (!estado?.bloqueadoHasta) return null;
  if (new Date(estado.bloqueadoHasta).getTime() <= Date.now()) return null; // ya expiro
  return estado.bloqueadoHasta;
}

/**
 * Registra un intento fallido de verificacion facial para el empleado; al
 * llegar a 3 fallos consecutivos, activa el bloqueo de 5 minutos. Si un
 * bloqueo anterior ya expiro, el contador arranca limpio de nuevo.
 */
export function registrarIntentoFallidoFacial(empleadoId: string): { bloqueadoHasta: string | null } {
  const estado = obtenerOCrearEstado(empleadoId);

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

/** Limpia el contador de fallos y levanta el bloqueo (ej. tras un marcaje exitoso, facial o por PIN de respaldo). */
export function reiniciarIntentosFaciales(empleadoId: string): void {
  const estado = obtenerOCrearEstado(empleadoId);
  estado.intentosFallidosConsecutivos = 0;
  estado.bloqueadoHasta = null;
}
