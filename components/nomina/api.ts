/**
 * Cliente HTTP del modulo de Nomina (nomina-pos). Mismo patron y misma regla
 * dura que components/pos/api.ts / components/empleados/api.ts: solo `fetch`
 * a /api/v1/nomina, nunca importa lib/db ni lib/nomina en runtime.
 */

import type { ReciboDePago } from "@/lib/domain/types";

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
    throw new ErrorApi(
      "No hay conexion con el servidor. Revisa tu red e intenta de nuevo.",
      0,
      "SIN_CONEXION"
    );
  }

  const cuerpo = await leerCuerpoSeguro(respuesta);
  if (!respuesta.ok) {
    throw new ErrorApi(
      extraerMensajeError(cuerpo, respuesta.status),
      respuesta.status,
      extraerCodigoError(cuerpo) ?? "ERROR_INESPERADO_CLIENTE"
    );
  }
  return cuerpo as T;
}

export async function correrNomina(input: {
  periodoInicio: string;
  periodoFin: string;
  empleadoId?: string;
}): Promise<ReciboDePago[]> {
  const { recibos } = await solicitar<{ recibos: ReciboDePago[] }>("/nomina", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return recibos;
}

export async function listarRecibos(empleadoId?: string): Promise<ReciboDePago[]> {
  const qs = empleadoId ? `?empleadoId=${encodeURIComponent(empleadoId)}` : "";
  const { recibos } = await solicitar<{ recibos: ReciboDePago[] }>(`/nomina${qs}`);
  return recibos;
}
