/**
 * GET /api/v1/stock — DUENO: menu-inventario-pos.
 *
 * Devuelve el stock actual (con nombre/unidad de insumo) y la lista de insumos
 * por debajo de su umbral de bajo stock. Query opcional: ?ubicacionId=...
 * (por defecto, la ubicacion piloto).
 */

import { UBICACION_PILOTO_ID, getDb } from "@/lib/db/store";
import { insumosBajoUmbral } from "@/lib/inventory/inventario";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const ubicacionId = searchParams.get("ubicacionId") ?? UBICACION_PILOTO_ID;

  const db = getDb();
  const insumosPorId = new Map(db.insumos.map((i) => [i.id, i]));

  const stock = db.stock
    .filter((s) => s.ubicacionId === ubicacionId)
    .map((s) => {
      const insumo = insumosPorId.get(s.insumoId);
      return {
        ...s,
        nombreInsumo: insumo?.nombre ?? "(insumo desconocido)",
        unidadMedida: insumo?.unidadMedida ?? "",
        umbralStockBajo: insumo?.umbralStockBajo ?? 0,
      };
    });

  const bajoUmbral = insumosBajoUmbral(ubicacionId);

  return Response.json({ ubicacionId, stock, bajoUmbral });
}
