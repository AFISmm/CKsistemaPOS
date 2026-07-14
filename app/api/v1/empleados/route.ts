import {
  crearEmpleado,
  listarEmpleados,
  obtenerEmpleadoPorUsuarioId,
  type NuevoEmpleadoInput,
} from "@/lib/rrhh/empleados";
import { respuestaErrorRrhh } from "@/lib/rrhh/http";
import type { EstadoEmpleado } from "@/lib/domain/types";

import { conPersistencia, ROL_DEVELOPER_ID } from "@/lib/db/store";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/empleados?ubicacionId=&estado=&excluirDevelopers=&usuarioId=
 *
 * - `excluirDevelopers=true`: excluye del resultado las cuentas con rol
 *   developer (rol-developer, ver lib/db/store.ts `ROL_DEVELOPER_ID`). Lo
 *   usan las listas operativas de la tienda (/empleados, /nomina, "Gestionar
 *   perfiles"): esas cuentas son de administracion del sistema, no personal
 *   de tienda. El cliente NUNCA necesita conocer el id del rol developer
 *   (se resuelve aqui, server-side); el flujo de login/auto-registro
 *   (obtenerEmpleadoPorEmail) no pasa por este endpoint y no se ve afectado.
 * - `usuarioId=`: devuelve (como lista de 0 o 1 elemento, mismo envelope
 *   `{ empleados }`) el Empleado vinculado a ese Usuario de login. Lo usa
 *   "Mi Perfil" (app/mi-perfil/page.tsx) para resolver su propio Empleado a
 *   partir de `useSesion().usuarioActual.id`.
 */
export async function GET(request: Request) {
  return conPersistencia(async () => {
    try {
      const { searchParams } = new URL(request.url);
      const usuarioId = searchParams.get("usuarioId") ?? undefined;
      if (usuarioId) {
        const empleado = obtenerEmpleadoPorUsuarioId(usuarioId);
        return Response.json({ empleados: empleado ? [empleado] : [] });
      }
      const ubicacionId = searchParams.get("ubicacionId") ?? undefined;
      const estado = (searchParams.get("estado") as EstadoEmpleado | null) ?? undefined;
      const excluirRolId =
        searchParams.get("excluirDevelopers") === "true" ? ROL_DEVELOPER_ID : undefined;
      const empleados = listarEmpleados({ ubicacionId, estado, excluirRolId });
      return Response.json({ empleados });
    } catch (e) {
      return respuestaErrorRrhh(e);
    }
  });
}

/** POST /api/v1/empleados — alta de empleado (onboarding). */
export async function POST(request: Request) {
  return conPersistencia(async () => {
    try {
      const body = (await request.json().catch(() => ({}))) as NuevoEmpleadoInput;
      const empleado = crearEmpleado(body);
      return Response.json({ empleado }, { status: 201 });
    } catch (e) {
      return respuestaErrorRrhh(e);
    }
  });
}
