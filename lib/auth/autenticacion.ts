/**
 * Sesion DEMO por PIN — DUENO: shell de UI (etapa 1 de 3 de este proyecto).
 *
 * IMPORTANTE: esto es una simulacion de autenticacion para la demo, NO el
 * mecanismo de produccion. No hay JWT, cookies de servidor, ni comparacion
 * segura de secretos (bcrypt/argon2, S-10). Se valida el PIN en texto plano
 * contra `Usuario.pinHash` con el formato sembrado `"demo:<pin>"` (mismo
 * formato usado en toda la app, ver lib/db/store.ts y lib/data/rrhh-seed.ts).
 *
 * La etapa 2 de este proyecto (fuera de alcance aqui) reemplazara este login
 * por el flujo TOTP + verificacion facial descrito en los ADRs de seguridad
 * (docs/adr/0005-seguridad-pci-y-tokenizacion-de-pagos.md y el agente
 * seguridad-accesos-pos); el contrato de UsuarioSinPin/Rol de aqui deberia
 * poder reutilizarse tal cual en ese reemplazo.
 *
 * Alcance DEMO: solo se puede iniciar sesion con usuarios de la ubicacion
 * piloto (Miami, FL) — es la unica tienda con datos de demo completos.
 */

import { getDb, UBICACION_PILOTO_ID } from "@/lib/db/store";
import type { Rol, Usuario } from "@/lib/domain/types";
import { ErrorAuth } from "./errores";

/** Usuario sin el campo `pinHash` (nunca se debe exponer al cliente). */
export type UsuarioSinPin = Omit<Usuario, "pinHash">;

function sinPin(usuario: Usuario): UsuarioSinPin {
  const { pinHash: _pinHash, ...resto } = usuario;
  return resto;
}

function rolDe(rolId: string): Rol {
  const rol = getDb().roles.find((r) => r.id === rolId);
  if (!rol) {
    throw new ErrorAuth("rol_no_encontrado", "El usuario no tiene un rol valido asignado.", 500);
  }
  return rol;
}

/** Valida un PIN y devuelve el usuario (sin pinHash) + su rol resuelto. */
export function iniciarSesion(pin: string): { usuario: UsuarioSinPin; rol: Rol } {
  const pinLimpio = (pin ?? "").trim();
  if (!pinLimpio) {
    throw new ErrorAuth("pin_requerido", "Ingresa tu PIN.", 400);
  }

  const usuario = getDb().usuarios.find(
    (u) => u.ubicacionId === UBICACION_PILOTO_ID && u.activo && u.pinHash === `demo:${pinLimpio}`
  );
  if (!usuario) {
    throw new ErrorAuth("credenciales_invalidas", "PIN incorrecto.", 401);
  }

  return { usuario: sinPin(usuario), rol: rolDe(usuario.rolId) };
}

/**
 * Resuelve la sesion guardada en localStorage (solo el usuarioId) contra el
 * estado actual del servidor. Se llama en cada carga de pagina para no
 * confiar en datos viejos del navegador (ej. si el usuario fue dado de baja).
 */
export function obtenerSesion(usuarioId: string): { usuario: UsuarioSinPin; rol: Rol } {
  const usuario = getDb().usuarios.find((u) => u.id === usuarioId && u.activo);
  if (!usuario) {
    throw new ErrorAuth("sesion_invalida", "Sesion no encontrada o usuario inactivo.", 404);
  }
  return { usuario: sinPin(usuario), rol: rolDe(usuario.rolId) };
}
