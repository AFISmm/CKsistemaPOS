/**
 * Orquestacion del "chequeo de inicio de jornada" (TOTP + verificacion
 * facial simulada) — DUENO: rrhh-personal-pos (etapa 2 de 3 de este
 * proyecto).
 *
 * Este modulo NO reimplementa el registro de asistencia: valida el codigo
 * TOTP / PIN de respaldo y el estado de bloqueo, y despues llama a
 * `registrarMarcaje` (lib/rrhh/asistencia.ts), que sigue siendo la UNICA
 * fuente de verdad de como se crea un Marcaje (secuencia entrada/salida,
 * calculo de tardanza, auditoria de alertas, etc).
 *
 * Flujo de negocio (decisiones ya tomadas, ver README-DEMO.md):
 *  1. El empleado "pasa" una verificacion facial SIMULADA en su celular
 *     (mock: sin biometria real, ver app/jornada/marcar/page.tsx).
 *  2. Si fallan 3 intentos faciales consecutivos, el metodo facial se
 *     bloquea 5 minutos para ese empleado (lib/jornada/bloqueo.ts); el PIN de
 *     respaldo (Usuario.pinHash) queda disponible como plan B.
 *  3. Si la verificacion facial fue exitosa, el empleado digita el codigo
 *     TOTP de 6 digitos que ve en la PANTALLA CENTRAL de la tienda (prueba
 *     de presencia fisica) y se registra el Marcaje.
 */

import { getDb } from "../db/store";
import type { Marcaje, TipoMarcaje, Ubicacion } from "../domain/types";
import { registrarMarcaje } from "../rrhh/asistencia";
import { obtenerEmpleado } from "../rrhh/empleados";
import { ErrorRrhh } from "../rrhh/errores";
import { bloqueadoHasta, reiniciarIntentosFaciales, registrarIntentoFallidoFacial } from "./bloqueo";
import { ErrorJornada } from "./errores";
import { generarCodigoVigente, validarCodigo, type CodigoTotpVigente } from "./totp";

function obtenerUbicacionOrThrow(ubicacionId: string): Ubicacion {
  const ubicacion = getDb().ubicaciones.find((u) => u.id === ubicacionId);
  if (!ubicacion) {
    throw new ErrorJornada("ubicacion_no_encontrada", `Ubicacion ${ubicacionId} no existe`, 404);
  }
  return ubicacion;
}

function obtenerEmpleadoOrThrow(empleadoId: string) {
  const empleado = obtenerEmpleado(empleadoId);
  if (!empleado) {
    throw new ErrorJornada("empleado_no_encontrado", `Empleado ${empleadoId} no existe`, 404);
  }
  return empleado;
}

/** Envuelve un ErrorRrhh (empleado inactivo, secuencia entrada/salida invalida, etc) como ErrorJornada, sin duplicar esa validacion. */
function delegarARegistrarMarcaje(input: Parameters<typeof registrarMarcaje>[0]): Marcaje {
  try {
    return registrarMarcaje(input);
  } catch (e) {
    if (e instanceof ErrorRrhh) {
      throw new ErrorJornada(e.codigo, e.message, e.status);
    }
    throw e;
  }
}

/** GET /api/v1/jornada/codigo — codigo TOTP vigente + segundos restantes, para la pantalla central de la tienda. */
export function obtenerCodigoVigente(ubicacionId: string): CodigoTotpVigente {
  const ubicacion = obtenerUbicacionOrThrow(ubicacionId);
  return generarCodigoVigente(ubicacion.secretoTotp);
}

/** Estado de bloqueo de verificacion facial vigente para un empleado (fuente de verdad server-side). */
export function consultarBloqueo(empleadoId: string): { bloqueadoHasta: string | null } {
  obtenerEmpleadoOrThrow(empleadoId);
  return { bloqueadoHasta: bloqueadoHasta(empleadoId) };
}

/**
 * Reporta el resultado de UN intento de verificacion facial (simulado desde
 * el celular del empleado). El cliente decide cuando mostrar "Simular
 * verificacion exitosa/fallida"; este endpoint es quien lleva la cuenta real
 * de fallos consecutivos y activa/levanta el bloqueo de 5 minutos.
 */
export function reportarIntentoFacial(
  empleadoId: string,
  exitoso: boolean
): { bloqueadoHasta: string | null } {
  obtenerEmpleadoOrThrow(empleadoId);
  if (exitoso) {
    reiniciarIntentosFaciales(empleadoId);
    return { bloqueadoHasta: null };
  }
  return registrarIntentoFallidoFacial(empleadoId);
}

export interface MarcarPorFacialInput {
  empleadoId: string;
  tipo: TipoMarcaje;
  codigo: string;
}

/**
 * POST /api/v1/jornada/marcar — verificacion facial simulada (ya exitosa en
 * el paso previo del flujo) + codigo TOTP de la pantalla central. Crea el
 * Marcaje con `identidadVerificada=true` y `metodoVerificacion="facial"`.
 */
export function marcarPorFacial(input: MarcarPorFacialInput): Marcaje {
  const empleado = obtenerEmpleadoOrThrow(input.empleadoId);

  // Defensa server-side: aunque el cliente ya "paso" la verificacion facial
  // simulada, si el empleado esta bloqueado (3 fallos previos) no se acepta
  // este metodo — debe usar el PIN de respaldo.
  const bloqueo = bloqueadoHasta(input.empleadoId);
  if (bloqueo) {
    throw new ErrorJornada(
      "bloqueado_temporalmente",
      `Verificacion facial bloqueada temporalmente hasta ${bloqueo}. Usa el PIN de respaldo.`,
      423
    );
  }

  const ubicacion = obtenerUbicacionOrThrow(empleado.ubicacionId);
  if (!validarCodigo(ubicacion.secretoTotp, input.codigo)) {
    throw new ErrorJornada(
      "codigo_incorrecto",
      "El codigo no es valido o ya expiro. Verifica el codigo vigente en la pantalla central de la tienda.",
      401
    );
  }

  const marcaje = delegarARegistrarMarcaje({
    empleadoId: input.empleadoId,
    tipo: input.tipo,
    identidadVerificada: true,
    // El codigo TOTP de la pantalla central de la tienda prueba presencia fisica.
    dentroDeGeofence: true,
    metodoVerificacion: "facial",
  });

  reiniciarIntentosFaciales(input.empleadoId);
  return marcaje;
}

export interface MarcarPorPinInput {
  empleadoId: string;
  tipo: TipoMarcaje;
  pin: string;
}

/**
 * POST /api/v1/jornada/marcar-respaldo — plan B tras agotar los 3 intentos
 * de verificacion facial. Valida el PIN contra Usuario.pinHash (mismo hash
 * DEMO que el resto del sistema) y crea el Marcaje con
 * `metodoVerificacion="pinRespaldo"`.
 *
 * Solo se acepta si el empleado esta REALMENTE bloqueado en el servidor (no
 * se confia en que el cliente diga "agote mis 3 intentos"): evita que el PIN
 * de respaldo se use como atajo para saltarse la verificacion facial.
 */
export function marcarPorPinRespaldo(input: MarcarPorPinInput): Marcaje {
  const empleado = obtenerEmpleadoOrThrow(input.empleadoId);

  if (!bloqueadoHasta(input.empleadoId)) {
    throw new ErrorJornada(
      "respaldo_no_disponible",
      "El PIN de respaldo solo esta disponible despues de agotar los 3 intentos de verificacion facial.",
      409
    );
  }

  if (!empleado.usuarioId) {
    throw new ErrorJornada(
      "sin_usuario_login",
      "Este empleado no tiene un PIN asignado (falta completar su onboarding).",
      409
    );
  }
  const usuario = getDb().usuarios.find((u) => u.id === empleado.usuarioId && u.activo);
  const pinLimpio = (input.pin ?? "").trim();
  if (!pinLimpio) {
    throw new ErrorJornada("pin_requerido", "Ingresa tu PIN.", 400);
  }
  if (!usuario || usuario.pinHash !== `demo:${pinLimpio}`) {
    throw new ErrorJornada("pin_incorrecto", "PIN incorrecto.", 401);
  }

  const marcaje = delegarARegistrarMarcaje({
    empleadoId: input.empleadoId,
    tipo: input.tipo,
    identidadVerificada: true,
    // DEMO: el PIN de respaldo NO exige el codigo TOTP de la pantalla
    // central, por lo tanto no prueba presencia fisica como el metodo
    // facial. Gap de seguridad conocido y documentado (ver docs/backlog.md).
    dentroDeGeofence: false,
    metodoVerificacion: "pinRespaldo",
  });

  // Exito con el plan B: se levanta el bloqueo para el proximo ciclo de marcaje.
  reiniciarIntentosFaciales(input.empleadoId);
  return marcaje;
}
