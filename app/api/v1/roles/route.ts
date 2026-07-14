/**
 * GET /api/v1/roles — datos de referencia (roles RBAC sembrados en lib/db/store.ts).
 * Pequeno endpoint de infraestructura agregado para poblar los selectores de
 * rol en la UI de /empleados (rrhh-personal-pos); no cambia el modelo de roles.
 */

import { conPersistencia, getDb } from "@/lib/db/store";

export const dynamic = "force-dynamic";

export async function GET() {
  return conPersistencia(async () => {
    return Response.json({ roles: getDb().roles });
  });
}
