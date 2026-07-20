/**
 * S-14 (BOM multinivel — productos elaborados/intermedios, ver
 * docs/analisis-reunion-diego-arches-20260717.md §3.1 y docs/requisitos.md
 * S-14). Un Insumo "elaborado" (ej. Salsa BBQ) puede tener su propia Receta
 * de insumos base, y esos insumos base pueden a su vez ser OTROS insumos
 * elaborados (BOM de mas de un nivel). Eso abre la puerta a un ciclo: la
 * receta de A usa B, la receta de B usa A (directo o transitivo) — un ciclo
 * asi haria que tanto InventarioService.producirInsumoElaborado como
 * CosteoService.resolverCostoUnitarioInsumo recursen infinitamente.
 *
 * `detectarCicloReceta` es una funcion PURA (sin Prisma/DB, ver
 * test/unit/receta-ciclo.spec.ts): dado el insumo elaborado que se esta
 * definiendo/actualizando, la lista de insumos base PROPUESTA para su nueva
 * receta, y el grafo de recetas VIGENTES de todos los DEMAS insumos
 * elaborados (insumoId -> ids de sus insumos base), hace un DFS clasico de
 * deteccion de ciclos (marca de "en la pila actual" = `enPila`) y devuelve
 * true si el insumo elaborado terminaria siendo, directa o transitivamente,
 * ingrediente de si mismo.
 *
 * Se usa en DOS lugares con el MISMO algoritmo (documentado, no reimplementado
 * dos veces):
 *  - CatalogoService.definirRecetaInsumoElaborado la llama tal cual, ANTES de
 *    escribir nada, para RECHAZAR la escritura de una receta que crearia un
 *    ciclo (422).
 *  - CosteoService.resolverCostoUnitarioInsumo (funcion pura hermana en
 *    costeo.types.ts) usa el mismo principio de "set de nodos en la pila de
 *    recursion actual" como guarda de defensa en profundidad al RESOLVER
 *    costos (lectura), por si algun dato quedara corrupto por fuera de este
 *    camino de escritura.
 */
export function detectarCicloReceta(
  insumoElaboradoId: string,
  ingredientesPropuestos: string[],
  grafoRecetasVigentes: Map<string, string[]>,
): boolean {
  const grafo = new Map(grafoRecetasVigentes);
  grafo.set(insumoElaboradoId, ingredientesPropuestos);

  const enPila = new Set<string>();
  const visitado = new Set<string>();

  function dfs(nodo: string): boolean {
    if (enPila.has(nodo)) return true; // volvimos a un nodo que ya esta en el camino actual: ciclo
    if (visitado.has(nodo)) return false; // ya explorado en una rama anterior, sin ciclo
    visitado.add(nodo);
    enPila.add(nodo);
    for (const hijo of grafo.get(nodo) ?? []) {
      if (dfs(hijo)) return true;
    }
    enPila.delete(nodo);
    return false;
  }

  return dfs(insumoElaboradoId);
}
