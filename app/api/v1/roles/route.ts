/**
 * GET /api/v1/roles — datos de referencia (roles RBAC sembrados en lib/db/store.ts).
 * Pequeno endpoint de infraestructura agregado para poblar los selectores de
 * rol en la UI de /empleados (rrhh-personal-pos); no cambia el modelo de roles.
 *
 * PATCH /api/v1/roles — Fase B (revision 2026-07-22 seccion "reparto de
 * propinas por rol/puntos"): edita `Rol.porcentajePropinaDemo` de un rol
 * existente. Body: { rolId: string, porcentajePropinaDemo: number (0-100) }.
 * Endpoint deliberadamente pequeno/generico (no un [id] dinamico aparte)
 * porque hoy es el UNICO campo editable de `Rol` desde la UI; si en el futuro
 * se necesita editar mas campos de Rol, vale la pena migrar a /api/v1/roles/[id].
 */

import { conPersistencia, getDb } from "@/lib/db/store";
import { porcentajeReparteValido } from "@/lib/propinas/reparto";
import { ErrorPropinas } from "@/lib/propinas/errores";
import { respuestaErrorPropinas } from "@/lib/propinas/http";

export const dynamic = "force-dynamic";

export async function GET() {
  return conPersistencia(async () => {
    return Response.json({ roles: getDb().roles });
  });
}

interface PatchRolBody {
  rolId?: string;
  porcentajePropinaDemo?: number;
}

export async function PATCH(request: Request) {
  return conPersistencia(async () => {
    try {
      const body = (await request.json().catch(() => ({}))) as PatchRolBody;
      if (!body.rolId) {
        throw new ErrorPropinas("rol_id_requerido", "rolId es requerido", 422);
      }
      if (!porcentajeReparteValido(body.porcentajePropinaDemo)) {
        throw new ErrorPropinas(
          "porcentaje_invalido",
          "porcentajePropinaDemo debe ser un entero entre 0 y 100",
          422
        );
      }

      const rol = getDb().roles.find((r) => r.id === body.rolId);
      if (!rol) {
        throw new ErrorPropinas("rol_no_encontrado", `Rol ${body.rolId} no existe`, 404);
      }

      rol.porcentajePropinaDemo = body.porcentajePropinaDemo;
      return Response.json({ rol });
    } catch (e) {
      return respuestaErrorPropinas(e);
    }
  });
}
