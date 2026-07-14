/**
 * GET /api/v1/ubicaciones — datos de referencia (tiendas FL/TX sembradas en lib/db/store.ts).
 * Pequeno endpoint de infraestructura agregado para poblar los selectores de
 * tienda en la UI de /empleados (rrhh-personal-pos); no cambia el modelo de ubicaciones.
 */

import { conPersistencia, getDb } from "@/lib/db/store";

export const dynamic = "force-dynamic";

export async function GET() {
  return conPersistencia(async () => {
    return Response.json({ ubicaciones: getDb().ubicaciones });
  });
}
