/**
 * Cliente HTTP del modulo de Empleados/Asistencia (rrhh-personal-pos).
 *
 * REGLA DURA (igual que components/pos/api.ts): este modulo SOLO habla con el
 * backend via `fetch` a /api/v1/... Nunca importa lib/db ni lib/rrhh (romperia
 * el bundle de cliente). Tipos de dominio importados con `import type`.
 */

import type { Empleado, HorarioTurno, Marcaje, Rol, Ubicacion } from "@/lib/domain/types";
import type { IntervaloTrabajado } from "@/lib/rrhh/asistencia";

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

export interface NuevoEmpleadoBody {
  ubicacionId: string;
  nombre: string;
  email: string;
  telefono: string;
  rolId: string;
  fechaContratacion?: string;
  tarifaHoraCentavos: number;
}

export interface EditarEmpleadoBody {
  nombre?: string;
  email?: string;
  telefono?: string;
  rolId?: string;
  ubicacionId?: string;
  tarifaHoraCentavos?: number;
}

export async function listarEmpleados(filtro?: {
  ubicacionId?: string;
  estado?: string;
  /**
   * Excluye del resultado las cuentas developer (rol-developer, ver
   * lib/db/store.ts `ROL_DEVELOPER_ID`) — usado por las listas operativas de
   * la tienda (/empleados, /nomina, "Gestionar perfiles"). El id del rol se
   * resuelve server-side (GET /api/v1/empleados); este cliente nunca
   * importa lib/db.
   */
  excluirDevelopers?: boolean;
  /** Filtra por el Empleado vinculado a este usuarioId (0 o 1 resultado). Ver `obtenerEmpleadoPorUsuarioId` abajo. */
  usuarioId?: string;
}): Promise<Empleado[]> {
  const qs = new URLSearchParams();
  if (filtro?.ubicacionId) qs.set("ubicacionId", filtro.ubicacionId);
  if (filtro?.estado) qs.set("estado", filtro.estado);
  if (filtro?.excluirDevelopers) qs.set("excluirDevelopers", "true");
  if (filtro?.usuarioId) qs.set("usuarioId", filtro.usuarioId);
  const query = qs.toString();
  const { empleados } = await solicitar<{ empleados: Empleado[] }>(
    `/empleados${query ? `?${query}` : ""}`
  );
  return empleados;
}

export async function obtenerEmpleado(id: string): Promise<Empleado> {
  const { empleado } = await solicitar<{ empleado: Empleado }>(`/empleados/${id}`);
  return empleado;
}

/**
 * Resuelve el Empleado vinculado a un Usuario de login por su `usuarioId`
 * (o `null` si no existe ninguno). Usado por "Mi Perfil"
 * (app/mi-perfil/page.tsx) para que cualquier usuario logueado edite sus
 * propios datos a partir de `useSesion().usuarioActual.id`.
 */
export async function obtenerEmpleadoPorUsuarioId(usuarioId: string): Promise<Empleado | null> {
  const empleados = await listarEmpleados({ usuarioId });
  return empleados[0] ?? null;
}

export async function crearEmpleado(body: NuevoEmpleadoBody): Promise<Empleado> {
  const { empleado } = await solicitar<{ empleado: Empleado }>("/empleados", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return empleado;
}

export async function editarEmpleado(id: string, body: EditarEmpleadoBody): Promise<Empleado> {
  const { empleado } = await solicitar<{ empleado: Empleado }>(`/empleados/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  return empleado;
}

export async function completarOnboarding(id: string, pin: string): Promise<Empleado> {
  const { empleado } = await solicitar<{ empleado: Empleado }>(`/empleados/${id}/onboarding`, {
    method: "POST",
    body: JSON.stringify({ pin }),
  });
  return empleado;
}

export async function darDeBajaEmpleado(id: string, motivo: string): Promise<Empleado> {
  const { empleado } = await solicitar<{ empleado: Empleado }>(`/empleados/${id}/baja`, {
    method: "POST",
    body: JSON.stringify({ motivo }),
  });
  return empleado;
}

export async function listarRoles(): Promise<Rol[]> {
  const { roles } = await solicitar<{ roles: Rol[] }>("/roles");
  return roles;
}

export async function listarUbicaciones(): Promise<Ubicacion[]> {
  const { ubicaciones } = await solicitar<{ ubicaciones: Ubicacion[] }>("/ubicaciones");
  return ubicaciones;
}

export interface MarcarAsistenciaBody {
  empleadoId: string;
  tipo: "entrada" | "salida";
  simularFueraDeZona?: boolean;
  simularFalloIdentidad?: boolean;
}

export async function registrarMarcaje(body: MarcarAsistenciaBody): Promise<Marcaje> {
  const { marcaje } = await solicitar<{ marcaje: Marcaje }>("/asistencia", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return marcaje;
}

export async function listarMarcajes(filtro: {
  empleadoId?: string;
  desde?: string;
  hasta?: string;
}): Promise<Marcaje[]> {
  const qs = new URLSearchParams();
  if (filtro.empleadoId) qs.set("empleadoId", filtro.empleadoId);
  if (filtro.desde) qs.set("desde", filtro.desde);
  if (filtro.hasta) qs.set("hasta", filtro.hasta);
  const { marcajes } = await solicitar<{ marcajes: Marcaje[] }>(`/asistencia?${qs.toString()}`);
  return marcajes;
}

export interface ResumenHorasResponse {
  empleadoId: string;
  desde: string;
  hasta: string;
  minutosTrabajados: number;
  intervalos: IntervaloTrabajado[];
}

export async function obtenerResumenHoras(
  empleadoId: string,
  desde: string,
  hasta: string
): Promise<ResumenHorasResponse> {
  const qs = new URLSearchParams({ empleadoId, desde, hasta });
  const { resumen } = await solicitar<{ resumen: ResumenHorasResponse }>(
    `/asistencia/resumen?${qs.toString()}`
  );
  return resumen;
}

export interface NuevoHorarioBody {
  empleadoId: string;
  ubicacionId?: string;
  fecha: string; // YYYY-MM-DD
  horaInicioProgramada: string; // HH:MM 24h
  horaFinProgramada: string; // HH:MM 24h
}

export interface HorarioCreadoResponse {
  horario: HorarioTurno;
  /** Minutos totales programados para esa semana (lunes-domingo), incluyendo este horario. */
  minutosTotalesSemana: number;
}

export async function listarHorarios(filtro: {
  empleadoId?: string;
  ubicacionId?: string;
  desde?: string;
  hasta?: string;
}): Promise<HorarioTurno[]> {
  const qs = new URLSearchParams();
  if (filtro.empleadoId) qs.set("empleadoId", filtro.empleadoId);
  if (filtro.ubicacionId) qs.set("ubicacionId", filtro.ubicacionId);
  if (filtro.desde) qs.set("desde", filtro.desde);
  if (filtro.hasta) qs.set("hasta", filtro.hasta);
  const { horarios } = await solicitar<{ horarios: HorarioTurno[] }>(
    `/horarios${qs.toString() ? `?${qs.toString()}` : ""}`
  );
  return horarios;
}

export async function crearHorario(body: NuevoHorarioBody): Promise<HorarioCreadoResponse> {
  return solicitar<HorarioCreadoResponse>("/horarios", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
