/**
 * Enriquecimiento DEMO Fase B del catalogo real — DUENO: menu-inventario-pos (2026-07-22).
 *
 * Este archivo NO es auto-generado (a diferencia de lib/data/catalog-recetario.generado.ts,
 * que tiene un encabezado explicito de "no editar a mano" y por eso este
 * enriquecimiento vive APARTE, como un paso de post-procesamiento sobre la
 * salida de ese import). Aqui se agregan 3 cosas, cada una documentada con su
 * propio caveat DEMO (ver docs/analisis-revision-20260722-modulos-innovacion-seguridad.md
 * Anexo y docs/requisitos.md S-14/S-16):
 *
 * 1. `Insumo.costoUnitarioCentavos` / `Insumo.alergenos` para los 84 insumos
 *    reales (heuristicas de nombre, ver catalog-insumos-costos.demo.ts /
 *    catalog-insumos-alergenos.demo.ts).
 * 2. UN insumo compuesto DEMO ("salsa Garlic Cilantro preparada") que
 *    demuestra BOM multi-nivel (Insumo.recetaBaseId) end-to-end: se agrega
 *    como ingrediente extra de "ORIGINAL CHOP-CHOP" (ver Anexo A.3). Esto es
 *    una SIMPLIFICACION DE DEMO fabricada para ejercitar la capacidad de BOM
 *    multi-nivel del codigo — NO es una afirmacion de que Chicken Kitchen
 *    realmente prepare esa salsa en tienda (sigue abierto en S-14).
 * 3. Un catalogo DEMO ACOTADO de GrupoModificador/Modificador, generado a
 *    partir de productos REALES del recetario (categorias Sauces/Dressings/
 *    Toppings/Modifiers) para un subconjunto CURADO de 6 platos ancla — NO
 *    para los 469 productos (mantener el dataset demo acotado). Reutiliza
 *    nombres y precios REALES del archivo fuente en vez de inventarlos.
 *
 * `lib/data/catalog-real.ts` llama a `enriquecerCatalogoFaseB()` sobre la
 * salida cruda del import antes de exponerla como `SeedCatalogo`.
 */

import type {
  CategoriaModificador,
  GrupoModificador,
  Insumo,
  Modificador,
  Producto,
  RecetaInsumo,
  SeedCatalogo,
  TipoAlergeno,
  TipoModificador,
} from "../domain/types";
import { explotarAInsumosBase, indexarRecetaInsumosPorReceta } from "../inventory/bom";
import { detectarAlergenosDemo } from "./catalog-insumos-alergenos.demo";
import { estimarCostoUnitarioCentavosDemo } from "./catalog-insumos-costos.demo";

// ---------------------------------------------------------------------------
// Anexo A.3 — insumo compuesto DEMO (BOM multi-nivel)
// ---------------------------------------------------------------------------

/** Producto real (categoria Sauces) elegido como el UNICO ejemplo demo de insumo elaborado. */
const ID_PRODUCTO_SALSA_BASE = "prod-real-sauces-garlic-cilantro-3";
/** Plato real (categoria Chop-Chop, CON receta real) al que se le agrega la salsa como ingrediente. */
const ID_PRODUCTO_PLATO_CON_SALSA = "prod-real-chop-chop-original-chop-chop-21";
/** Id del NUEVO insumo compuesto (no viene del import; se agrega aqui). */
export const ID_INSUMO_SALSA_DEMO = "insu-demo-salsa-garlic-cilantro-preparada";

function slug(texto: string): string {
  return texto
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function agregarInsumoCompuestoDemo(seed: SeedCatalogo): { insumos: Insumo[]; recetaInsumos: RecetaInsumo[] } {
  const productoSalsa = seed.productos.find((p) => p.id === ID_PRODUCTO_SALSA_BASE);
  const recetaSalsa = seed.recetas.find((r) => r.productoId === ID_PRODUCTO_SALSA_BASE && r.activo);
  const recetaPlato = seed.recetas.find((r) => r.productoId === ID_PRODUCTO_PLATO_CON_SALSA && r.activo);

  if (!productoSalsa || !recetaSalsa || !recetaPlato) {
    // No deberia pasar contra el catalogo real actual; si el import cambia y
    // estos ids dejan de existir, se omite el enriquecimiento en vez de
    // romper el build (robustez DEMO ante cambios futuros del .xlsx).
    return { insumos: [], recetaInsumos: [] };
  }

  const insumoCompuesto: Insumo = {
    id: ID_INSUMO_SALSA_DEMO,
    nombre: `${productoSalsa.nombre} (salsa preparada en casa — DEMO)`,
    unidadMedida: "porcion",
    umbralStockBajo: 0, // no lleva Stock propio: es un nodo virtual del BOM (ver bom.ts)
    // costoUnitarioCentavos / alergenos NO se asignan aqui a proposito: se
    // DERIVAN de sus insumos base al costear/etiquetar (lib/menu/costeo.ts,
    // lib/menu/alergenos.ts), exactamente para demostrar que el BOM cascadea.
    recetaBaseId: recetaSalsa.id,
  };

  const recetaInsumoNuevo: RecetaInsumo = {
    id: "ri-demo-chopchop-original-salsa-garlic-cilantro",
    recetaId: recetaPlato.id,
    insumoId: ID_INSUMO_SALSA_DEMO,
    // DEMO: cantidad ilustrativa (una porcion de salsa por lote de la receta
    // de "ORIGINAL CHOP-CHOP"), no una medicion real de cocina — ver Anexo A.3.
    cantidad: 0.3,
  };

  return { insumos: [insumoCompuesto], recetaInsumos: [recetaInsumoNuevo] };
}

// ---------------------------------------------------------------------------
// Modificadores DEMO curados (Sauces/Dressings/Toppings/Modifiers reales)
// ---------------------------------------------------------------------------

/**
 * Platos ancla CURADOS (6 de 469 productos reales) para los que se genera un
 * catalogo DEMO de modificadores. Alcance ACOTADO a proposito (ver docstring
 * del archivo): no se genero para los 469 productos.
 */
const PRODUCTOS_ANCLA: string[] = [
  "prod-real-chop-chop-original-chop-chop-21", // Chop-Chop (tambien lleva la salsa BOM demo)
  "prod-real-chop-chop-deluxe-chop-chop-22", // Chop-Chop
  "prod-real-wrapitos-original-wrapito-1", // Wrapitos
  "prod-real-salads-chicken-caesar-salad-4", // Salads
  "prod-real-boneless-single-chicken-breast-f-3", // Boneless
  "prod-real-cheesadillas-chicken-cheesadilla-2", // Cheesadillas
];

function productosDeCategoria(seed: SeedCatalogo, categoriaId: string): Producto[] {
  return seed.productos.filter((p) => p.categoriaId === categoriaId);
}

/** Insumos que ese unico insumo/linea de receta aporta, explotando su BOM (si aplica). */
function alergenosDeUnaLinea(
  insumoId: string,
  cantidad: number,
  insumosPorId: Map<string, Insumo>,
  recetaInsumosPorRecetaId: Map<string, RecetaInsumo[]>
): TipoAlergeno[] {
  const hojas = explotarAInsumosBase(insumoId, cantidad, insumosPorId, recetaInsumosPorRecetaId);
  const encontrados = new Set<TipoAlergeno>();
  for (const hoja of hojas) {
    const insumo = insumosPorId.get(hoja.insumoId);
    for (const a of insumo?.alergenos ?? []) encontrados.add(a);
  }
  return Array.from(encontrados);
}

function generarModificadoresDemo(
  seed: SeedCatalogo,
  insumos: Insumo[],
  recetaInsumos: RecetaInsumo[]
): { gruposModificador: GrupoModificador[]; modificadores: Modificador[] } {
  const gruposModificador: GrupoModificador[] = [];
  const modificadores: Modificador[] = [];

  const insumosPorId = new Map(insumos.map((i) => [i.id, i]));
  const recetaInsumosPorRecetaId = indexarRecetaInsumosPorReceta(recetaInsumos);

  // ---- Fuente REAL: Sauces + Dressings (categoria DEMO "salsa") ----
  const salsas = [
    ...productosDeCategoria(seed, "cat-real-sauces"),
    ...productosDeCategoria(seed, "cat-real-dressings"),
  ].slice(0, 8);

  // ---- Fuente REAL: Toppings, excluyendo "NO X" (remociones) y utilitarios de precio 0 (categoria DEMO "topping") ----
  const toppings = productosDeCategoria(seed, "cat-real-toppings")
    .filter((p) => p.precioBase > 0 && !p.nombre.toUpperCase().startsWith("NO "))
    .slice(0, 8);

  // ---- Fuente REAL: Modifiers, solo "SUBSTITUTE X" (categoria DEMO "sustitucion", tipo mecanico "sustituir") ----
  const sustituciones = productosDeCategoria(seed, "cat-real-modifiers").filter((p) =>
    p.nombre.toUpperCase().startsWith("SUBSTITUTE")
  );

  function agregarGrupoDesdeProductos(
    productoAnclaId: string,
    sufijoGrupo: string,
    nombreGrupo: string,
    origenes: Producto[],
    tipo: TipoModificador,
    categoria: CategoriaModificador,
    maxSelecciones: number
  ): void {
    if (origenes.length === 0) return;
    const grupoId = `gm-${sufijoGrupo}-demo-${productoAnclaId}`;
    gruposModificador.push({
      id: grupoId,
      productoId: productoAnclaId,
      nombre: nombreGrupo,
      minSelecciones: 0,
      maxSelecciones,
      obligatorio: false,
    });
    origenes.forEach((origen, idx) => {
      modificadores.push({
        id: `mod-${sufijoGrupo}-demo-${productoAnclaId}-${idx}-${slug(origen.nombre)}`,
        grupoModificadorId: grupoId,
        nombre: origen.nombre,
        // DEMO: reutiliza el precio REAL del producto de catalogo del que se
        // deriva (ver docstring del archivo) en vez de inventar un delta.
        precioDelta: origen.precioBase,
        disponible86: origen.disponible86,
        tipo,
        categoria,
      });
    });
  }

  for (const productoAnclaId of PRODUCTOS_ANCLA) {
    agregarGrupoDesdeProductos(productoAnclaId, "salsas", "Salsas / Aderezos", salsas, "agregar", "salsa", 3);
    agregarGrupoDesdeProductos(productoAnclaId, "toppings", "Toppings", toppings, "agregar", "topping", 5);
    agregarGrupoDesdeProductos(
      productoAnclaId,
      "sustituciones",
      "Sustituciones",
      sustituciones,
      "sustituir",
      "sustitucion",
      1
    );

    // ---- Grupo "Quitar ingredientes" (categoria DEMO "otro"): SOLO los
    // insumos DIRECTOS de la receta de ESTE plato que aportan >=1 alergeno
    // DEMO (atravesando su propio BOM si el insumo es un compuesto, ver
    // Anexo A.3). Esto es lo que conecta S-16 (alergenos) con un modificador
    // real "sin X" usable (Modificador.insumoAfectadoId).
    const receta = seed.recetas.find((r) => r.productoId === productoAnclaId && r.activo);
    const itemsDirectos = receta ? recetaInsumos.filter((ri) => ri.recetaId === receta.id) : [];
    const itemsConAlergeno = itemsDirectos.filter(
      (item) => alergenosDeUnaLinea(item.insumoId, item.cantidad, insumosPorId, recetaInsumosPorRecetaId).length > 0
    );

    if (itemsConAlergeno.length > 0) {
      const grupoId = `gm-sin-alergenos-demo-${productoAnclaId}`;
      gruposModificador.push({
        id: grupoId,
        productoId: productoAnclaId,
        nombre: "Quitar ingredientes (alergenos)",
        minSelecciones: 0,
        maxSelecciones: itemsConAlergeno.length,
        obligatorio: false,
      });
      itemsConAlergeno.forEach((item, idx) => {
        const insumo = insumosPorId.get(item.insumoId);
        modificadores.push({
          id: `mod-sin-demo-${productoAnclaId}-${idx}`,
          grupoModificadorId: grupoId,
          nombre: `Sin ${insumo?.nombre ?? item.insumoId} (alergeno — demo)`,
          precioDelta: 0,
          disponible86: true,
          tipo: "sin",
          categoria: "otro",
          insumoAfectadoId: item.insumoId,
        });
      });
    }
  }

  return { gruposModificador, modificadores };
}

// ---------------------------------------------------------------------------

/**
 * Punto de entrada: toma la semilla CRUDA del import real (lib/data/catalog-real.ts)
 * y devuelve una semilla enriquecida con costos/alergenos DEMO de insumo, el
 * insumo compuesto BOM demo, y el catalogo curado de modificadores demo.
 */
export function enriquecerCatalogoFaseB(seedCrudo: SeedCatalogo): SeedCatalogo {
  const insumosEnriquecidos: Insumo[] = seedCrudo.insumos.map((insumo) => ({
    ...insumo,
    costoUnitarioCentavos: estimarCostoUnitarioCentavosDemo(insumo.nombre),
    alergenos: detectarAlergenosDemo(insumo.nombre),
  }));

  const { insumos: insumosCompuestos, recetaInsumos: recetaInsumosNuevos } = agregarInsumoCompuestoDemo({
    ...seedCrudo,
    insumos: insumosEnriquecidos,
  });

  const insumosFinal = [...insumosEnriquecidos, ...insumosCompuestos];
  const recetaInsumosFinal = [...seedCrudo.recetaInsumos, ...recetaInsumosNuevos];

  const { gruposModificador, modificadores } = generarModificadoresDemo(
    seedCrudo,
    insumosFinal,
    recetaInsumosFinal
  );

  return {
    ...seedCrudo,
    insumos: insumosFinal,
    recetaInsumos: recetaInsumosFinal,
    gruposModificador,
    modificadores,
  };
}
