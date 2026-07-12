/**
 * Ciclo de vida del empleado — DUENO: rrhh-personal-pos.
 *
 * Alta (onboarding), completar onboarding (crea Usuario de login + pasa a
 * "activo"), edicion y baja logica (nunca se borra el registro: hay nomina y
 * auditoria que dependen de el). NO calcula pago (eso es nomina-pos) y NO
 * define permisos por rol (eso es seguridad-accesos-pos); aqui solo se asigna
 * el rolId/ubicacionId que esos modulos consumen.
 */

import { ahora, getDb, registrarEvento, uid, UBICACION_PILOTO_ID } from "../db/store";
import type { Empleado, EstadoEmpleado, Usuario } from "../domain/types";
import { ErrorRrhh } from "./errores";

export interface NuevoEmpleadoInput {
  ubicacionId?: string;
  nombre: string;
  email: string;
  telefono: string;
  rolId: string;
  fechaContratacion?: string; // ISO date; default hoy
  tarifaHoraCentavos: number;
}

function validarRol(rolId: string): void {
  const existe = getDb().roles.some((r) => r.id === rolId);
  if (!existe) {
    throw new ErrorRrhh("rol_no_encontrado", `Rol ${rolId} no existe`, 422);
  }
}

function validarUbicacion(ubicacionId: string): void {
  const existe = getDb().ubicaciones.some((u) => u.id === ubicacionId);
  if (!existe) {
    throw new ErrorRrhh("ubicacion_no_encontrada", `Ubicacion ${ubicacionId} no existe`, 422);
  }
}

/** Alta de empleado (onboarding): crea el Empleado en estado "onboarding", sin Usuario de login todavia. */
export function crearEmpleado(input: NuevoEmpleadoInput): Empleado {
  if (!input.nombre?.trim()) {
    throw new ErrorRrhh("nombre_requerido", "nombre es requerido", 422);
  }
  if (!input.email?.trim()) {
    throw new ErrorRrhh("email_requerido", "email es requerido", 422);
  }
  if (!input.telefono?.trim()) {
    throw new ErrorRrhh("telefono_requerido", "telefono es requerido", 422);
  }
  if (!input.rolId) {
    throw new ErrorRrhh("rol_requerido", "rolId es requerido", 422);
  }
  if (!Number.isInteger(input.tarifaHoraCentavos) || input.tarifaHoraCentavos <= 0) {
    throw new ErrorRrhh(
      "tarifa_invalida",
      "tarifaHoraCentavos debe ser un entero de centavos > 0",
      422
    );
  }

  const ubicacionId = input.ubicacionId ?? UBICACION_PILOTO_ID;
  validarUbicacion(ubicacionId);
  validarRol(input.rolId);

  const empleado: Empleado = {
    id: uid(),
    ubicacionId,
    nombre: input.nombre.trim(),
    email: input.email.trim(),
    telefono: input.telefono.trim(),
    rolId: input.rolId,
    fechaContratacion: input.fechaContratacion ?? ahora().slice(0, 10),
    estado: "onboarding",
    tarifaHoraCentavos: input.tarifaHoraCentavos,
    usuarioId: null,
    motivoBaja: null,
    creadoEn: ahora(),
  };

  getDb().empleados.push(empleado);

  registrarEvento({
    ubicacionId,
    usuarioId: null,
    tipo: "altaEmpleado",
    agregadoTipo: "Empleado",
    agregadoId: empleado.id,
    motivo: "Alta de empleado (onboarding)",
    payload: { nombre: empleado.nombre, rolId: empleado.rolId },
  });

  return empleado;
}

export function listarEmpleados(filtro: { ubicacionId?: string; estado?: EstadoEmpleado } = {}): Empleado[] {
  let empleados = getDb().empleados;
  if (filtro.ubicacionId) {
    empleados = empleados.filter((e) => e.ubicacionId === filtro.ubicacionId);
  }
  if (filtro.estado) {
    empleados = empleados.filter((e) => e.estado === filtro.estado);
  }
  return empleados;
}

export function obtenerEmpleado(empleadoId: string): Empleado | undefined {
  return getDb().empleados.find((e) => e.id === empleadoId);
}

function obtenerEmpleadoOrThrow(empleadoId: string): Empleado {
  const empleado = obtenerEmpleado(empleadoId);
  if (!empleado) {
    throw new ErrorRrhh("empleado_no_encontrado", `Empleado ${empleadoId} no existe`, 404);
  }
  return empleado;
}

export interface CompletarOnboardingInput {
  /** PIN en claro (DEMO); se guarda como hash simple igual que el resto de Usuario. */
  pin: string;
}

/**
 * Completa el onboarding: crea el Usuario de login (PIN + rol + tienda del
 * empleado) y pasa el Empleado a "activo". Solo aplica a empleados en
 * estado "onboarding".
 */
export function completarOnboarding(empleadoId: string, input: CompletarOnboardingInput): Empleado {
  const empleado = obtenerEmpleadoOrThrow(empleadoId);
  if (empleado.estado !== "onboarding") {
    throw new ErrorRrhh(
      "estado_invalido",
      `El empleado ${empleadoId} esta en estado "${empleado.estado}"; solo se completa onboarding desde "onboarding"`,
      409
    );
  }
  if (!input.pin || !/^\d{4,6}$/.test(input.pin)) {
    throw new ErrorRrhh("pin_invalido", "pin debe tener entre 4 y 6 digitos", 422);
  }

  const usuario: Usuario = {
    id: uid(),
    ubicacionId: empleado.ubicacionId,
    nombre: empleado.nombre,
    pinHash: `demo:${input.pin}`, // DEMO: hash simple, ver S-10 en README-DEMO.md
    rolId: empleado.rolId,
    activo: true,
  };
  getDb().usuarios.push(usuario);

  empleado.usuarioId = usuario.id;
  empleado.estado = "activo";

  registrarEvento({
    ubicacionId: empleado.ubicacionId,
    usuarioId: usuario.id,
    tipo: "altaEmpleado",
    agregadoTipo: "Empleado",
    agregadoId: empleado.id,
    motivo: "Onboarding completado: Usuario de login creado, empleado activo",
    payload: { usuarioId: usuario.id },
  });

  return empleado;
}

export interface EditarEmpleadoInput {
  nombre?: string;
  email?: string;
  telefono?: string;
  rolId?: string;
  ubicacionId?: string;
  tarifaHoraCentavos?: number;
}

/** Edita datos del empleado. Si cambia rolId, registra evento de auditoria dedicado. */
export function editarEmpleado(empleadoId: string, cambios: EditarEmpleadoInput): Empleado {
  const empleado = obtenerEmpleadoOrThrow(empleadoId);
  if (empleado.estado === "inactivo") {
    throw new ErrorRrhh(
      "empleado_inactivo",
      "No se puede editar un empleado dado de baja",
      409
    );
  }

  const rolAnterior = empleado.rolId;

  if (cambios.nombre !== undefined) empleado.nombre = cambios.nombre.trim();
  if (cambios.email !== undefined) empleado.email = cambios.email.trim();
  if (cambios.telefono !== undefined) empleado.telefono = cambios.telefono.trim();
  if (cambios.ubicacionId !== undefined) {
    validarUbicacion(cambios.ubicacionId);
    empleado.ubicacionId = cambios.ubicacionId;
  }
  if (cambios.tarifaHoraCentavos !== undefined) {
    if (!Number.isInteger(cambios.tarifaHoraCentavos) || cambios.tarifaHoraCentavos <= 0) {
      throw new ErrorRrhh(
        "tarifa_invalida",
        "tarifaHoraCentavos debe ser un entero de centavos > 0",
        422
      );
    }
    empleado.tarifaHoraCentavos = cambios.tarifaHoraCentavos;
  }
  if (cambios.rolId !== undefined && cambios.rolId !== rolAnterior) {
    validarRol(cambios.rolId);
    empleado.rolId = cambios.rolId;

    // El Usuario de login (si existe) tambien debe reflejar el nuevo rol,
    // para no duplicar la logica de permisos (seguridad-accesos-pos consume rolId).
    if (empleado.usuarioId) {
      const usuario = getDb().usuarios.find((u) => u.id === empleado.usuarioId);
      if (usuario) usuario.rolId = cambios.rolId;
    }

    registrarEvento({
      ubicacionId: empleado.ubicacionId,
      usuarioId: empleado.usuarioId,
      tipo: "cambioRolEmpleado",
      agregadoTipo: "Empleado",
      agregadoId: empleado.id,
      motivo: `Cambio de rol: ${rolAnterior} -> ${cambios.rolId}`,
      payload: { rolAnterior, rolNuevo: cambios.rolId },
    });
  }

  return empleado;
}

export interface BajaEmpleadoInput {
  motivo: string;
  usuarioId?: string | null;
}

/** Baja LOGICA (nunca se borra el registro): estado -> "inactivo" + motivo + evento de auditoria. */
export function darDeBajaEmpleado(empleadoId: string, input: BajaEmpleadoInput): Empleado {
  const empleado = obtenerEmpleadoOrThrow(empleadoId);
  if (empleado.estado === "inactivo") {
    throw new ErrorRrhh("empleado_ya_inactivo", `El empleado ${empleadoId} ya esta de baja`, 409);
  }
  if (!input.motivo?.trim()) {
    throw new ErrorRrhh("motivo_requerido", "motivo es requerido para dar de baja", 422);
  }

  empleado.estado = "inactivo";
  empleado.motivoBaja = input.motivo.trim();

  // La baja tambien desactiva el acceso de login (si tenia Usuario asociado).
  if (empleado.usuarioId) {
    const usuario = getDb().usuarios.find((u) => u.id === empleado.usuarioId);
    if (usuario) usuario.activo = false;
  }

  registrarEvento({
    ubicacionId: empleado.ubicacionId,
    usuarioId: input.usuarioId ?? null,
    tipo: "bajaEmpleado",
    agregadoTipo: "Empleado",
    agregadoId: empleado.id,
    motivo: input.motivo.trim(),
    payload: { empleadoId: empleado.id },
  });

  return empleado;
}
