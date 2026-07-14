/**
 * Cliente HTTP del shell de UI (sesion DEMO + notificaciones) — etapa 1.
 *
 * REGLA DURA (igual que components/pos/api.ts y components/empleados/api.ts):
 * este modulo SOLO habla con el backend via `fetch` a /api/v1/... Nunca
 * importa lib/db, lib/auth ni lib/notificaciones (romperia el bundle de
 * cliente). Tipos de dominio importados con `import type`.
 */

import type { Empleado, Notificacion, Rol, Usuario } from "@/lib/domain/types";

const BASE_URL = "/api/v1";

export class ErrorApi extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ErrorApi";
    this.status = status;
  }
}

async function leerCuerpoSeguro(res: Response): Promise<unknown> {
  const texto = await res.text().catch(() => "");
  if (!texto) return null;
  try {
    return JSON.parse(texto);
  } catch {
    return null;
  }
}

function extraerMensajeError(cuerpo: unknown, status: number): string {
  if (cuerpo && typeof cuerpo === "object") {
    const registro = cuerpo as Record<string, unknown>;
    const candidato = registro.mensaje ?? registro.error ?? registro.message;
    if (typeof candidato === "string" && candidato.trim()) return candidato;
  }
  if (status === 0) {
    return "No hay conexion con el servidor. Verifica la red e intenta de nuevo.";
  }
  return `Ocurrio un error inesperado (codigo ${status}). Intenta de nuevo.`;
}

async function solicitar<T>(ruta: string, init?: RequestInit): Promise<T> {
  let respuesta: Response;
  try {
    respuesta = await fetch(`${BASE_URL}${ruta}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
      cache: "no-store",
    });
  } catch {
    throw new ErrorApi("No hay conexion con el servidor. Revisa tu red e intenta de nuevo.", 0);
  }

  const cuerpo = await leerCuerpoSeguro(respuesta);
  if (!respuesta.ok) {
    throw new ErrorApi(extraerMensajeError(cuerpo, respuesta.status), respuesta.status);
  }
  return cuerpo as T;
}

/** Usuario sin el campo `pinHash` (nunca se expone al cliente). */
export type UsuarioSinPin = Omit<Usuario, "pinHash">;

/**
 * Usuario (sin pinHash) + `pinActualDemo` (PIN en texto plano). SOLO valido
 * en esta demo: `pinActualDemo` viene de quitarle el prefijo `"demo:"` a
 * `Usuario.pinHash`, que aqui NUNCA fue un hash criptografico real (ver la
 * nota de cumplimiento completa en lib/auth/autenticacion.ts, funcion
 * `listarUsuarios`). Este tipo/dato es EXCLUSIVO del panel "Gestionar
 * perfiles" (a pedido de producto) y jamas deberia existir en un backend de
 * produccion con hash real (bcrypt/argon2): un hash real no es reversible.
 */
export type UsuarioConPinDemo = UsuarioSinPin & { pinActualDemo: string };

export async function iniciarSesionPin(
  email: string,
  pin: string
): Promise<{ usuario: UsuarioSinPin; rol: Rol }> {
  return solicitar("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, pin }),
  });
}

/** Paso 1 de /login: resuelve si el correo ya es un Empleado y si ya tiene PIN habilitado. */
export interface VerificarCorreoResponse {
  registrado: boolean;
  pinHabilitado: boolean;
}

export async function verificarCorreo(email: string): Promise<VerificarCorreoResponse> {
  return solicitar(`/auth/verificar-correo?email=${encodeURIComponent(email)}`);
}

/** Formulario "Registrarse" de /login: auto-registro, crea Empleado en "onboarding". */
export interface RegistroInput {
  nombre: string;
  apellido: string;
  /** null para correos @digeniusai.com (desarrolladores): no requieren SSN. */
  ssnUltimos4: string | null;
  email: string;
  telefono: string;
}

export async function registrarEmpleado(input: RegistroInput): Promise<Empleado> {
  const { empleado } = await solicitar<{ empleado: Empleado }>("/auth/registrar", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return empleado;
}

export async function obtenerSesionActual(
  usuarioId: string
): Promise<{ usuario: UsuarioSinPin; rol: Rol }> {
  return solicitar(`/auth/sesion?usuarioId=${encodeURIComponent(usuarioId)}`);
}

export async function listarNotificaciones(): Promise<Notificacion[]> {
  const { notificaciones } = await solicitar<{ notificaciones: Notificacion[] }>(
    "/notificaciones"
  );
  return notificaciones;
}

export async function marcarNotificacionLeida(id: string): Promise<Notificacion> {
  const { notificacion } = await solicitar<{ notificacion: Notificacion }>(
    `/notificaciones/${id}/leida`,
    { method: "POST", body: JSON.stringify({}) }
  );
  return notificacion;
}

/** Lista de referencia de roles RBAC (para mostrar el nombre de rol de cada Usuario en "Gestionar perfiles"). */
export async function listarRoles(): Promise<Rol[]> {
  const { roles } = await solicitar<{ roles: Rol[] }>("/roles");
  return roles;
}

/**
 * Lista de Usuario (sin pinHash, mas `pinActualDemo` SOLO por el formato de
 * almacenamiento demo, ver UsuarioConPinDemo arriba) para el panel
 * "Gestionar perfiles" del sidebar (permiso "usuarios.gestionar").
 */
export async function listarUsuarios(): Promise<UsuarioConPinDemo[]> {
  const { usuarios } = await solicitar<{ usuarios: UsuarioConPinDemo[] }>("/auth/usuarios");
  return usuarios;
}

/** Cambia el PIN de acceso de un Usuario (4 digitos numericos; validado tambien server-side). */
export async function cambiarPinUsuario(usuarioId: string, pin: string): Promise<UsuarioSinPin> {
  const { usuario } = await solicitar<{ usuario: UsuarioSinPin }>(
    `/auth/usuarios/${usuarioId}/pin`,
    { method: "PATCH", body: JSON.stringify({ pin }) }
  );
  return usuario;
}
