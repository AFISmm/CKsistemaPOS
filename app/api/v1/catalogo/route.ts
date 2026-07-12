/**
 * GET /api/v1/catalogo — DUENO: menu-inventario-pos.
 *
 * Devuelve el catalogo completo (categorias, productos, grupos de modificador,
 * modificadores y combos) desde el almacen en memoria, ordenado por categoria.
 * Consumido por frontend-mostrador-kiosco-pos.
 */

import { getDb } from "@/lib/db/store";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const db = getDb();

  const categorias = [...db.categorias]
    .filter((c) => c.activo)
    .sort((a, b) => a.orden - b.orden);

  const ordenPorCategoria = new Map(categorias.map((c) => [c.id, c.orden]));

  const productos = [...db.productos].sort((a, b) => {
    const ordenA = ordenPorCategoria.get(a.categoriaId) ?? Number.MAX_SAFE_INTEGER;
    const ordenB = ordenPorCategoria.get(b.categoriaId) ?? Number.MAX_SAFE_INTEGER;
    if (ordenA !== ordenB) return ordenA - ordenB;
    return a.nombre.localeCompare(b.nombre);
  });

  return Response.json({
    categorias,
    productos,
    gruposModificador: db.gruposModificador,
    modificadores: db.modificadores,
    combos: db.combos,
  });
}
