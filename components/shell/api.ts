/**
 * Cliente HTTP del shell de UI (sesion DEMO + notificaciones) — etapa 1.
 *
 * REGLA DURA (igual que components/pos/api.ts y components/empleados/api.ts):
 * este modulo SOLO habla con el backend via `fetch` a /api/v1/... Nunca
 * importa lib/db, lib/auth ni lib/notificaciones (romperia el bundle de
 * cliente). Tipos de dominio importados con `import type`.
 */

import type { Notificacion, Rol, Usuario } from "@/lib/domain/types";

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

export async function iniciarSesionPin(
  pin: string
): Promise<{ usuario: UsuarioSinPin; rol: Rol }> {
  return solicitar("/auth/login", {
    method: "POST",
    body: JSON.stringify({ pin }),
  });
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
