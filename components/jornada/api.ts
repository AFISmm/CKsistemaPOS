/**
 * Cliente HTTP del chequeo de inicio de jornada (rrhh-personal-pos, etapa 2).
 *
 * REGLA DURA (igual que components/empleados/api.ts): este modulo SOLO habla
 * con el backend via `fetch` a /api/v1/... Nunca importa lib/db, lib/rrhh ni
 * lib/jornada (romperia el bundle de cliente, y ademas el secreto TOTP jamas
 * debe poder llegar al bundle de cliente). Tipos de dominio importados con
 * `import type`.
 */

import type { Empleado, Marcaje } from "@/lib/domain/types";

const BASE_URL = "/api/v1";

export class ErrorApi extends Error {
  status: number;
  codigo?: string;
  constructor(message: string, status: number, codigo?: string) {
    super(message);
    this.name = "ErrorApi";
    this.status = status;
    this.codigo = codigo;
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

function extraerCodigoError(cuerpo: unknown): string | undefined {
  if (cuerpo && typeof cuerpo === "object") {
    const registro = cuerpo as Record<string, unknown>;
    if (typeof registro.codigo === "string") return registro.codigo;
  }
  return undefined;
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
    throw new ErrorApi(
      extraerMensajeError(cuerpo, respuesta.status),
      respuesta.status,
      extraerCodigoError(cuerpo)
    );
  }
  return cuerpo as T;
}

export async function listarEmpleadosActivos(): Promise<Empleado[]> {
  const { empleados } = await solicitar<{ empleados: Empleado[] }>("/empleados?estado=activo");
  return empleados;
}

export interface CodigoVigente {
  codigo: string;
  segundosRestantes: number;
}

/** Codigo TOTP vigente de la ubicacion, para la pantalla central (/jornada/pantalla). */
export async function obtenerCodigoVigente(ubicacionId: string): Promise<CodigoVigente> {
  return solicitar<CodigoVigente>(`/jornada/codigo?ubicacionId=${encodeURIComponent(ubicacionId)}`);
}

export interface EstadoBloqueo {
  bloqueadoHasta: string | null;
}

export async function consultarBloqueo(empleadoId: string): Promise<EstadoBloqueo> {
  return solicitar<EstadoBloqueo>(`/jornada/bloqueo?empleadoId=${encodeURIComponent(empleadoId)}`);
}

/** Reporta el resultado de un intento de verificacion facial simulada. */
export async function reportarIntentoFacial(
  empleadoId: string,
  exitoso: boolean
): Promise<EstadoBloqueo> {
  return solicitar<EstadoBloqueo>("/jornada/intento-facial", {
    method: "POST",
    body: JSON.stringify({ empleadoId, exitoso }),
  });
}

export interface MarcarPorFacialBody {
  empleadoId: string;
  tipo: "entrada" | "salida";
  codigo: string;
}

export async function marcarPorFacial(body: MarcarPorFacialBody): Promise<Marcaje> {
  const { marcaje } = await solicitar<{ marcaje: Marcaje }>("/jornada/marcar", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return marcaje;
}

export interface MarcarPorPinBody {
  empleadoId: string;
  tipo: "entrada" | "salida";
  pin: string;
}

export async function marcarPorPinRespaldo(body: MarcarPorPinBody): Promise<Marcaje> {
  const { marcaje } = await solicitar<{ marcaje: Marcaje }>("/jornada/marcar-respaldo", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return marcaje;
}
