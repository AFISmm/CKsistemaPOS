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

// ---- WebAuthn (Face ID/Touch ID/Windows Hello REAL), refuerzo de la
// verificacion facial simulada — ver lib/jornada/webauthn.ts para el detalle
// de que es real (el gesto biometrico, exigido por el navegador/SO) y que se
// simplifica a proposito en esta demo (verificacion criptografica de firma
// server-side, fuera de alcance). Estas funciones SOLO arman/envian datos;
// quien dispara el prompt biometrico es navigator.credentials.create()/.get()
// en app/jornada/marcar/page.tsx.

export interface OpcionesRegistroWebauthn {
  challenge: string; // base64url
  rp: { name: string };
  user: { id: string; name: string; displayName: string }; // id en base64url
  pubKeyCredParams: { alg: number; type: "public-key" }[];
  authenticatorSelection: { authenticatorAttachment: "platform"; userVerification: "required" };
  timeout: number;
}

/** Opciones para navigator.credentials.create() (primer registro de biometria en este dispositivo). */
export async function obtenerOpcionesRegistroWebauthn(
  empleadoId: string
): Promise<OpcionesRegistroWebauthn> {
  return solicitar<OpcionesRegistroWebauthn>("/jornada/webauthn/opciones-registro", {
    method: "POST",
    body: JSON.stringify({ empleadoId }),
  });
}

/** Guarda el credentialId devuelto por create(), tras un gesto biometrico exitoso. */
export async function registrarCredencialWebauthn(
  empleadoId: string,
  credentialId: string
): Promise<{ credencialWebauthnId: string }> {
  return solicitar("/jornada/webauthn/registrar", {
    method: "POST",
    body: JSON.stringify({ empleadoId, credentialId }),
  });
}

export interface OpcionesLoginWebauthn {
  challenge: string; // base64url
  allowCredentials: { id: string; type: "public-key" }[]; // id en base64url
  userVerification: "required";
  timeout: number;
}

/**
 * Opciones para navigator.credentials.get() (usos posteriores, credencial ya
 * registrada). Si el empleado no tiene credencial, el servidor responde 422
 * con codigo "sin_credencial_webauthn" (ErrorApi) para que el llamador caiga
 * al flujo de registro.
 */
export async function obtenerOpcionesLoginWebauthn(
  empleadoId: string
): Promise<OpcionesLoginWebauthn> {
  return solicitar<OpcionesLoginWebauthn>("/jornada/webauthn/opciones-login", {
    method: "POST",
    body: JSON.stringify({ empleadoId }),
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

// ---- Codigo de autorizacion gerencial diario (ver lib/jornada/codigoGerencial.ts) ----

/** Codigo de autorizacion gerencial vigente HOY de la ubicacion, para el panel gerencial. */
export async function obtenerCodigoGerencialVigente(ubicacionId: string): Promise<CodigoVigente> {
  return solicitar<CodigoVigente>(
    `/jornada/codigo-gerencial?ubicacionId=${encodeURIComponent(ubicacionId)}`
  );
}

/** Valida un codigo de autorizacion gerencial sin revelar el codigo vigente. */
export async function validarCodigoGerencial(
  ubicacionId: string,
  codigo: string
): Promise<{ valido: boolean }> {
  return solicitar<{ valido: boolean }>("/jornada/codigo-gerencial/validar", {
    method: "POST",
    body: JSON.stringify({ ubicacionId, codigo }),
  });
}
