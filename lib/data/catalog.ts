/**
 * Semilla de catalogo — DUENO: menu-inventario-pos.
 *
 * Catalogo real de Chicken Kitchen (categorias, nombres de productos y las 13
 * Signature Sauces tal como aparecen en https://chickenkitchen.com). Los PRECIOS,
 * RECETAS, INSUMOS y NIVELES DE STOCK son DEMO razonables tipo fast-casual (USD);
 * el sitio publico no publica precios ni recetas. Buscar "DEMO" en este archivo.
 *
 * Dinero SIEMPRE en centavos enteros (C-DINERO). Ej: 995 = $9.95.
 */

import type {
  Categoria,
  Combo,
  ComboComponente,
  GrupoModificador,
  Insumo,
  Modificador,
  Producto,
  Receta,
  RecetaInsumo,
  SeedCatalogo,
} from "../domain/types";

// ---------------------------------------------------------------------------
// Utilidades locales de construccion de semilla (solo para este archivo).
// ---------------------------------------------------------------------------

function slug(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // quita acentos (marcas diacriticas combinantes)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

let contadorId = 0;
/** Genera ids legibles y estables dentro de una sola construccion de semilla. */
function nid(prefijo: string): string {
  contadorId += 1;
  return `${prefijo}-${contadorId}`;
}

// ---------------------------------------------------------------------------
// Categorias (orden tal como aparecen en el menu real de Chicken Kitchen).
// ---------------------------------------------------------------------------

const CATEGORIAS: Categoria[] = [
  { id: "cat-bowls", nombre: "CHOP-CHOP® BOWLS", orden: 1, activo: true },
  { id: "cat-wrapito", nombre: "WRAPITO®", orden: 2, activo: true },
  { id: "cat-salads", nombre: "SALADS", orden: 3, activo: true },
  { id: "cat-breast", nombre: "GRILLED BREAST MEALS", orden: 4, activo: true },
  { id: "cat-cheesadilla", nombre: "CHEESADILLA®", orden: 5, activo: true },
  { id: "cat-kids", nombre: "HEALTHY KIDS MEALS", orden: 6, activo: true },
  { id: "cat-sides", nombre: "SIDE ORDERS", orden: 7, activo: true },
  { id: "cat-desserts", nombre: "DESSERTS", orden: 8, activo: true },
  { id: "cat-drinks", nombre: "DRINKS", orden: 9, activo: true },
];

// ---------------------------------------------------------------------------
// Productos. Precios DEMO (fast-casual USD), en centavos.
// ---------------------------------------------------------------------------

interface OpcionesProducto {
  descripcion?: string;
  gravable?: boolean;
  esCombo?: boolean;
  disponible86?: boolean;
  activo?: boolean;
}

function crearProducto(
  id: string,
  categoriaId: string,
  nombre: string,
  precioBase: number,
  opts: OpcionesProducto = {}
): Producto {
  return {
    id,
    categoriaId,
    nombre,
    descripcion: opts.descripcion ?? "",
    precioBase, // DEMO
    gravable: opts.gravable ?? true,
    esCombo: opts.esCombo ?? false,
    disponible86: opts.disponible86 ?? true,
    activo: opts.activo ?? true,
  };
}

// --- CHOP-CHOP® BOWLS ---
const P_BOWL_BUILD = crearProducto(
  "prod-bowl-build",
  "cat-bowls",
  "Build Your Own Bowl",
  995,
  { descripcion: "Arma tu propio bowl: base, proteina y toppings a eleccion." }
);
const P_BOWL_CLASSIC = crearProducto(
  "prod-bowl-classic",
  "cat-bowls",
  "Classic Chop-Chop Bowl",
  1095,
  { descripcion: "Pollo a la parrilla, arroz, maiz y tomate." }
);
const P_BOWL_CHIPOTLE = crearProducto(
  "prod-bowl-chipotle",
  "cat-bowls",
  "Chipotle Lime Bowl",
  1150,
  { descripcion: "Pollo a la parrilla, arroz, frijoles negros y maiz, salsa chipotle lime." }
);
const P_BOWL_BBQ = crearProducto(
  "prod-bowl-bbq",
  "cat-bowls",
  "BBQ Bowl",
  1150,
  { descripcion: "Pollo a la parrilla, arroz, maiz y queso, salsa BBQ." }
);
const P_BOWL_CAESAR = crearProducto(
  "prod-bowl-caesar",
  "cat-bowls",
  "Caesar Chop-Chop Bowl",
  1095,
  { descripcion: "Pollo a la parrilla, lechuga, arroz y queso, aderezo Caesar." }
);

// --- WRAPITO® ---
const P_WRAP_BUILD = crearProducto(
  "prod-wrap-build",
  "cat-wrapito",
  "Build Your Own Wrapito",
  895,
  { descripcion: "Arma tu propio wrapito: tortilla, proteina y toppings a eleccion." }
);
const P_WRAP_CLASSIC = crearProducto(
  "prod-wrap-classic",
  "cat-wrapito",
  "Classic Wrapito",
  995,
  { descripcion: "Pollo a la parrilla, arroz y frijoles negros en tortilla." }
);
const P_WRAP_CHIPOTLE = crearProducto(
  "prod-wrap-chipotle",
  "cat-wrapito",
  "Chipotle Lime Wrapito",
  1050,
  { descripcion: "Pollo a la parrilla, maiz y queso, salsa chipotle lime." }
);
const P_WRAP_BBQ = crearProducto(
  "prod-wrap-bbq",
  "cat-wrapito",
  "BBQ Wrapito",
  1050,
  { descripcion: "Pollo a la parrilla, queso y maiz, salsa BBQ." }
);

// --- SALADS ---
const P_SALAD_GRILLED = crearProducto(
  "prod-salad-grilled",
  "cat-salads",
  "Grilled Chicken Salad",
  995,
  { descripcion: "Lechuga fresca, pollo a la parrilla y tomate." }
);
const P_SALAD_CAESAR = crearProducto(
  "prod-salad-caesar",
  "cat-salads",
  "Caesar Chicken Salad",
  1050,
  { descripcion: "Lechuga, pollo a la parrilla, queso y aderezo Caesar." }
);
const P_SALAD_CHOPCHOP = crearProducto(
  "prod-salad-chopchop",
  "cat-salads",
  "Chop-Chop Salad",
  1050,
  { descripcion: "Lechuga, pollo a la parrilla, maiz y frijoles negros." }
);
const P_SALAD_SOUTHWEST = crearProducto(
  "prod-salad-southwest",
  "cat-salads",
  "Southwest Salad",
  1095,
  { descripcion: "Lechuga, pollo a la parrilla, maiz y tomate, estilo southwest." }
);

// --- GRILLED BREAST MEALS ---
const P_BREAST_WHOLE = crearProducto(
  "prod-breast-whole",
  "cat-breast",
  "Grilled Breast Meal (Whole)",
  1195,
  { descripcion: "Pechuga de pollo entera a la parrilla, sobre lechuga." }
);
const P_BREAST_CHOPPED = crearProducto(
  "prod-breast-chopped",
  "cat-breast",
  "Grilled Breast Meal (Chopped)",
  1195,
  { descripcion: "Pechuga de pollo picada a la parrilla, sobre lechuga." }
);
const P_BREAST_WHOLE_2SIDES = crearProducto(
  "prod-breast-whole-2sides",
  "cat-breast",
  "Grilled Breast Meal (Whole) with Two Sides",
  1395,
  {
    descripcion: "Pechuga entera a la parrilla + 2 acompanamientos a eleccion.",
    esCombo: true,
  }
);
const P_BREAST_CHOPPED_2SIDES = crearProducto(
  "prod-breast-chopped-2sides",
  "cat-breast",
  "Grilled Breast Meal (Chopped) with Two Sides",
  1395,
  {
    descripcion: "Pechuga picada a la parrilla + 2 acompanamientos a eleccion.",
    esCombo: true,
  }
);

// --- CHEESADILLA® ---
const P_CHEESADILLA_CHICKEN = crearProducto(
  "prod-cheesadilla-chicken",
  "cat-cheesadilla",
  "Chicken Cheesadilla",
  895,
  { descripcion: "Tortilla de harina con pollo a la parrilla y queso fundido." }
);
const P_CHEESADILLA_COMBO = crearProducto(
  "prod-cheesadilla-combo",
  "cat-cheesadilla",
  "Chicken Cheesadilla Combo",
  1095,
  {
    descripcion: "Chicken Cheesadilla + 1 acompanamiento a eleccion.",
    esCombo: true,
  }
);
const P_CHEESADILLA_CHEESE = crearProducto(
  "prod-cheesadilla-cheese",
  "cat-cheesadilla",
  "Cheese Cheesadilla",
  795,
  { descripcion: "Tortilla de harina con queso fundido (sin pollo)." }
);

// --- HEALTHY KIDS MEALS ---
const P_KIDS_MINICHOP = crearProducto(
  "prod-kids-minichop",
  "cat-kids",
  "Mini-Chop®",
  595,
  { descripcion: "Version chica del Chop-Chop Bowl para ninos." }
);
const P_KIDS_BREAST = crearProducto(
  "prod-kids-breast",
  "cat-kids",
  "Kids Grilled Breast",
  595,
  { descripcion: "Porcion chica de pechuga a la parrilla para ninos." }
);

// --- SIDE ORDERS ---
const P_SIDE_BALSAMIC_TOMATOES = crearProducto(
  "prod-side-balsamic-tomatoes",
  "cat-sides",
  "Balsamic Tomatoes",
  350,
  { descripcion: "Tomate fresco con vinagreta balsamica." }
);
const P_SIDE_CORN_MIX = crearProducto(
  "prod-side-corn-mix",
  "cat-sides",
  "Corn Mix",
  350,
  { descripcion: "Mezcla de maiz salteado." }
);
const P_SIDE_SWEET_POTATOES = crearProducto(
  "prod-side-sweet-potatoes",
  "cat-sides",
  "Sweet Potatoes",
  395,
  { descripcion: "Camote horneado en trozos." }
);
const P_SIDE_GUACAMOLE = crearProducto(
  "prod-side-guacamole",
  "cat-sides",
  "Guacamole",
  450,
  { descripcion: "Guacamole fresco preparado en casa." }
);

// --- DESSERTS ---
const P_DESSERT_BROWNIE = crearProducto(
  "prod-dessert-brownie",
  "cat-desserts",
  "Chocolate Brownie",
  350,
  { descripcion: "Brownie de chocolate individual." }
);

// --- DRINKS ---
const P_DRINK_SOFT_REGULAR = crearProducto(
  "prod-drink-soft-regular",
  "cat-drinks",
  "Soft Drink (Regular)",
  250,
  { descripcion: "Refresco fuente, tamano regular." }
);
const P_DRINK_SOFT_LARGE = crearProducto(
  "prod-drink-soft-large",
  "cat-drinks",
  "Soft Drink (Large)",
  295,
  { descripcion: "Refresco fuente, tamano grande." }
);
const P_DRINK_WATER = crearProducto(
  "prod-drink-water",
  "cat-drinks",
  "Bottled Water",
  250,
  { descripcion: "Agua embotellada." }
);
const P_DRINK_ICEDTEA = crearProducto(
  "prod-drink-icedtea",
  "cat-drinks",
  "Iced Tea",
  275,
  { descripcion: "Te helado, disponible en regular o grande." }
);

const PRODUCTOS: Producto[] = [
  P_BOWL_BUILD,
  P_BOWL_CLASSIC,
  P_BOWL_CHIPOTLE,
  P_BOWL_BBQ,
  P_BOWL_CAESAR,
  P_WRAP_BUILD,
  P_WRAP_CLASSIC,
  P_WRAP_CHIPOTLE,
  P_WRAP_BBQ,
  P_SALAD_GRILLED,
  P_SALAD_CAESAR,
  P_SALAD_CHOPCHOP,
  P_SALAD_SOUTHWEST,
  P_BREAST_WHOLE,
  P_BREAST_CHOPPED,
  P_BREAST_WHOLE_2SIDES,
  P_BREAST_CHOPPED_2SIDES,
  P_CHEESADILLA_CHICKEN,
  P_CHEESADILLA_COMBO,
  P_CHEESADILLA_CHEESE,
  P_KIDS_MINICHOP,
  P_KIDS_BREAST,
  P_SIDE_BALSAMIC_TOMATOES,
  P_SIDE_CORN_MIX,
  P_SIDE_SWEET_POTATOES,
  P_SIDE_GUACAMOLE,
  P_DESSERT_BROWNIE,
  P_DRINK_SOFT_REGULAR,
  P_DRINK_SOFT_LARGE,
  P_DRINK_WATER,
  P_DRINK_ICEDTEA,
];

// ---------------------------------------------------------------------------
// Combos (meals con acompanamiento incluido — DEMO).
// ---------------------------------------------------------------------------

const OPCIONES_SIDES: string[] = [
  P_SIDE_BALSAMIC_TOMATOES.id,
  P_SIDE_CORN_MIX.id,
  P_SIDE_SWEET_POTATOES.id,
  P_SIDE_GUACAMOLE.id,
];

function componenteSide(grupoSeleccion: string): ComboComponente {
  return { grupoSeleccion, obligatorio: true, opciones: OPCIONES_SIDES };
}

const COMBOS: Combo[] = [
  {
    id: nid("combo"),
    productoId: P_BREAST_WHOLE_2SIDES.id,
    componentes: [componenteSide("Side 1"), componenteSide("Side 2")],
  },
  {
    id: nid("combo"),
    productoId: P_BREAST_CHOPPED_2SIDES.id,
    componentes: [componenteSide("Side 1"), componenteSide("Side 2")],
  },
  {
    id: nid("combo"),
    productoId: P_CHEESADILLA_COMBO.id,
    componentes: [componenteSide("Choose a Side")],
  },
];

// ---------------------------------------------------------------------------
// Grupos de modificadores + modificadores.
// ---------------------------------------------------------------------------

const GRUPOS_MODIFICADOR: GrupoModificador[] = [];
const MODIFICADORES: Modificador[] = [];

/** Las 13 Signature Sauces reales de Chicken Kitchen (precioDelta 0, DEMO). */
const SIGNATURE_SAUCES: string[] = [
  "Mustard'n Curry®",
  "Spicy Mustard'n Curry",
  "Fresh Salsa",
  "Chipotle Lime",
  "BBQ",
  "Spicy Salsa Verde",
  "Hot'n Spicy",
  "Garlic Cilantro",
  "Sweet Chili",
  "Balsamic Vinaigrette",
  "Pink Vinaigrette",
  "Caesar",
  "Olive Oil",
];

/**
 * Adjunta el grupo "Signature Sauces" a un producto (min 0, max 3, no obligatorio).
 * Se duplican registros de GrupoModificador/Modificador por producto (cada producto
 * necesita su propio grupo, aunque el catalogo de salsas sea el mismo) para respetar
 * el modelo GrupoModificador.productoId 1:1.
 */
function adjuntarSignatureSauces(productoId: string): void {
  const grupoId = `gm-salsas-${productoId}`;
  GRUPOS_MODIFICADOR.push({
    id: grupoId,
    productoId,
    nombre: "Signature Sauces",
    minSelecciones: 0,
    maxSelecciones: 3,
    obligatorio: false,
  });
  SIGNATURE_SAUCES.forEach((nombreSalsa, idx) => {
    MODIFICADORES.push({
      id: `mod-salsa-${slug(nombreSalsa)}-${productoId}-${idx}`,
      grupoModificadorId: grupoId,
      nombre: nombreSalsa,
      precioDelta: 0,
      disponible86: true,
      tipo: "agregar",
    });
  });
}

/** Adjunta el grupo "Add Guacamole" (agregar, +$1.50 DEMO) a un producto. */
function adjuntarAddGuacamole(productoId: string): void {
  const grupoId = `gm-guac-${productoId}`;
  GRUPOS_MODIFICADOR.push({
    id: grupoId,
    productoId,
    nombre: "Add Guacamole",
    minSelecciones: 0,
    maxSelecciones: 1,
    obligatorio: false,
  });
  MODIFICADORES.push({
    id: `mod-guac-${productoId}`,
    grupoModificadorId: grupoId,
    nombre: "Add Guacamole",
    precioDelta: 150, // DEMO: +$1.50
    disponible86: true,
    tipo: "agregar",
  });
}

// Signature Sauces: Build Your Own Bowl, Build Your Own Wrapito,
// los 4 Grilled Breast Meals y las 2 Cheesadilla con pollo.
const PRODUCTOS_CON_SALSAS: string[] = [
  P_BOWL_BUILD.id,
  P_WRAP_BUILD.id,
  P_BREAST_WHOLE.id,
  P_BREAST_CHOPPED.id,
  P_BREAST_WHOLE_2SIDES.id,
  P_BREAST_CHOPPED_2SIDES.id,
  P_CHEESADILLA_CHICKEN.id,
  P_CHEESADILLA_COMBO.id,
];
PRODUCTOS_CON_SALSAS.forEach(adjuntarSignatureSauces);

// Add Guacamole: todos los bowls y wrapitos.
const PRODUCTOS_CON_GUACAMOLE: string[] = [
  P_BOWL_BUILD.id,
  P_BOWL_CLASSIC.id,
  P_BOWL_CHIPOTLE.id,
  P_BOWL_BBQ.id,
  P_BOWL_CAESAR.id,
  P_WRAP_BUILD.id,
  P_WRAP_CLASSIC.id,
  P_WRAP_CHIPOTLE.id,
  P_WRAP_BBQ.id,
];
PRODUCTOS_CON_GUACAMOLE.forEach(adjuntarAddGuacamole);

// Grupo "Size" (obligatorio, min1/max1) — Iced Tea es el unico drink sin
// productos separados por tamano, asi que aqui "si aplica" el modificador.
{
  const grupoId = "gm-size-icedtea";
  GRUPOS_MODIFICADOR.push({
    id: grupoId,
    productoId: P_DRINK_ICEDTEA.id,
    nombre: "Size",
    minSelecciones: 1,
    maxSelecciones: 1,
    obligatorio: true,
  });
  MODIFICADORES.push(
    {
      id: "mod-size-icedtea-regular",
      grupoModificadorId: grupoId,
      nombre: "Regular",
      precioDelta: 0,
      disponible86: true,
      tipo: "agregar",
    },
    {
      id: "mod-size-icedtea-large",
      grupoModificadorId: grupoId,
      nombre: "Large",
      precioDelta: 45, // DEMO: +$0.45
      disponible86: true,
      tipo: "agregar",
    }
  );
}

// ---------------------------------------------------------------------------
// Insumos DEMO (unidades e umbrales de bajo stock razonables fast-casual).
// ---------------------------------------------------------------------------

const INSU_CHICKEN: Insumo = {
  id: "insu-chicken",
  nombre: "Grilled Chicken Breast",
  unidadMedida: "lb",
  umbralStockBajo: 5,
};
const INSU_LETTUCE: Insumo = {
  id: "insu-lettuce",
  nombre: "Lettuce",
  unidadMedida: "lb",
  umbralStockBajo: 3,
};
const INSU_RICE: Insumo = {
  id: "insu-rice",
  nombre: "Rice",
  unidadMedida: "lb",
  umbralStockBajo: 5,
};
const INSU_BLACKBEANS: Insumo = {
  id: "insu-blackbeans",
  nombre: "Black Beans",
  unidadMedida: "lb",
  umbralStockBajo: 3,
};
const INSU_CORN: Insumo = {
  id: "insu-corn",
  nombre: "Corn",
  unidadMedida: "lb",
  umbralStockBajo: 3,
};
const INSU_TOMATO: Insumo = {
  id: "insu-tomato",
  nombre: "Tomato",
  unidadMedida: "lb",
  umbralStockBajo: 3,
};
const INSU_CHEESE: Insumo = {
  id: "insu-cheese",
  nombre: "Cheese",
  unidadMedida: "lb",
  umbralStockBajo: 3,
};
const INSU_TORTILLA: Insumo = {
  id: "insu-tortilla",
  nombre: "Tortilla",
  unidadMedida: "unidad",
  umbralStockBajo: 10,
};
const INSU_GUACAMOLE: Insumo = {
  id: "insu-guacamole",
  nombre: "Guacamole",
  unidadMedida: "lb",
  umbralStockBajo: 2,
};
const INSU_SWEETPOTATO: Insumo = {
  id: "insu-sweetpotato",
  nombre: "Sweet Potato",
  unidadMedida: "lb",
  umbralStockBajo: 3,
};
const INSU_BROWNIE: Insumo = {
  id: "insu-brownie",
  nombre: "Brownie",
  unidadMedida: "unidad",
  umbralStockBajo: 5,
};
const INSU_SODASYRUP: Insumo = {
  id: "insu-sodasyrup",
  nombre: "Soda Syrup",
  unidadMedida: "liter",
  umbralStockBajo: 2,
};
const INSU_CUP: Insumo = {
  id: "insu-cup",
  nombre: "Cup",
  unidadMedida: "unidad",
  umbralStockBajo: 20,
};
const INSU_BOTTLEDWATER: Insumo = {
  id: "insu-bottledwater",
  nombre: "Bottled Water",
  unidadMedida: "unidad",
  umbralStockBajo: 10,
};
const INSU_TEAMIX: Insumo = {
  id: "insu-teamix",
  nombre: "Tea Mix",
  unidadMedida: "liter",
  umbralStockBajo: 2,
};

const INSUMOS: Insumo[] = [
  INSU_CHICKEN,
  INSU_LETTUCE,
  INSU_RICE,
  INSU_BLACKBEANS,
  INSU_CORN,
  INSU_TOMATO,
  INSU_CHEESE,
  INSU_TORTILLA,
  INSU_GUACAMOLE,
  INSU_SWEETPOTATO,
  INSU_BROWNIE,
  INSU_SODASYRUP,
  INSU_CUP,
  INSU_BOTTLEDWATER,
  INSU_TEAMIX,
];

// ---------------------------------------------------------------------------
// Recetas: cada producto principal consume 2-4 insumos (cantidades DEMO).
// ---------------------------------------------------------------------------

const RECETAS: Receta[] = [];
const RECETA_INSUMOS: RecetaInsumo[] = [];

function crearReceta(
  productoId: string,
  items: Array<{ insumo: Insumo; cantidad: number }>
): void {
  const recetaId = `receta-${productoId}`;
  RECETAS.push({ id: recetaId, productoId, activo: true });
  items.forEach(({ insumo, cantidad }) => {
    RECETA_INSUMOS.push({
      id: `ri-${productoId}-${insumo.id}`,
      recetaId,
      insumoId: insumo.id,
      cantidad, // DEMO
    });
  });
}

// CHOP-CHOP BOWLS
crearReceta(P_BOWL_BUILD.id, [
  { insumo: INSU_CHICKEN, cantidad: 0.35 },
  { insumo: INSU_RICE, cantidad: 0.4 },
  { insumo: INSU_LETTUCE, cantidad: 0.15 },
  { insumo: INSU_BLACKBEANS, cantidad: 0.2 },
]);
crearReceta(P_BOWL_CLASSIC.id, [
  { insumo: INSU_CHICKEN, cantidad: 0.35 },
  { insumo: INSU_RICE, cantidad: 0.4 },
  { insumo: INSU_CORN, cantidad: 0.15 },
  { insumo: INSU_TOMATO, cantidad: 0.1 },
]);
crearReceta(P_BOWL_CHIPOTLE.id, [
  { insumo: INSU_CHICKEN, cantidad: 0.35 },
  { insumo: INSU_RICE, cantidad: 0.4 },
  { insumo: INSU_BLACKBEANS, cantidad: 0.2 },
  { insumo: INSU_CORN, cantidad: 0.15 },
]);
crearReceta(P_BOWL_BBQ.id, [
  { insumo: INSU_CHICKEN, cantidad: 0.35 },
  { insumo: INSU_RICE, cantidad: 0.4 },
  { insumo: INSU_CORN, cantidad: 0.15 },
  { insumo: INSU_CHEESE, cantidad: 0.1 },
]);
crearReceta(P_BOWL_CAESAR.id, [
  { insumo: INSU_CHICKEN, cantidad: 0.35 },
  { insumo: INSU_LETTUCE, cantidad: 0.3 },
  { insumo: INSU_CHEESE, cantidad: 0.1 },
  { insumo: INSU_RICE, cantidad: 0.3 },
]);

// WRAPITO
crearReceta(P_WRAP_BUILD.id, [
  { insumo: INSU_CHICKEN, cantidad: 0.3 },
  { insumo: INSU_TORTILLA, cantidad: 1 },
  { insumo: INSU_LETTUCE, cantidad: 0.15 },
  { insumo: INSU_RICE, cantidad: 0.25 },
]);
crearReceta(P_WRAP_CLASSIC.id, [
  { insumo: INSU_CHICKEN, cantidad: 0.3 },
  { insumo: INSU_TORTILLA, cantidad: 1 },
  { insumo: INSU_BLACKBEANS, cantidad: 0.15 },
  { insumo: INSU_RICE, cantidad: 0.25 },
]);
crearReceta(P_WRAP_CHIPOTLE.id, [
  { insumo: INSU_CHICKEN, cantidad: 0.3 },
  { insumo: INSU_TORTILLA, cantidad: 1 },
  { insumo: INSU_CORN, cantidad: 0.15 },
  { insumo: INSU_CHEESE, cantidad: 0.1 },
]);
crearReceta(P_WRAP_BBQ.id, [
  { insumo: INSU_CHICKEN, cantidad: 0.3 },
  { insumo: INSU_TORTILLA, cantidad: 1 },
  { insumo: INSU_CHEESE, cantidad: 0.1 },
  { insumo: INSU_CORN, cantidad: 0.15 },
]);

// SALADS
crearReceta(P_SALAD_GRILLED.id, [
  { insumo: INSU_CHICKEN, cantidad: 0.35 },
  { insumo: INSU_LETTUCE, cantidad: 0.4 },
  { insumo: INSU_TOMATO, cantidad: 0.15 },
]);
crearReceta(P_SALAD_CAESAR.id, [
  { insumo: INSU_CHICKEN, cantidad: 0.35 },
  { insumo: INSU_LETTUCE, cantidad: 0.4 },
  { insumo: INSU_CHEESE, cantidad: 0.1 },
]);
crearReceta(P_SALAD_CHOPCHOP.id, [
  { insumo: INSU_CHICKEN, cantidad: 0.3 },
  { insumo: INSU_LETTUCE, cantidad: 0.3 },
  { insumo: INSU_CORN, cantidad: 0.15 },
  { insumo: INSU_BLACKBEANS, cantidad: 0.15 },
]);
crearReceta(P_SALAD_SOUTHWEST.id, [
  { insumo: INSU_CHICKEN, cantidad: 0.3 },
  { insumo: INSU_LETTUCE, cantidad: 0.3 },
  { insumo: INSU_CORN, cantidad: 0.15 },
  { insumo: INSU_TOMATO, cantidad: 0.15 },
]);

// GRILLED BREAST MEALS
crearReceta(P_BREAST_WHOLE.id, [
  { insumo: INSU_CHICKEN, cantidad: 0.6 },
  { insumo: INSU_LETTUCE, cantidad: 0.1 },
]);
crearReceta(P_BREAST_CHOPPED.id, [
  { insumo: INSU_CHICKEN, cantidad: 0.6 },
  { insumo: INSU_LETTUCE, cantidad: 0.1 },
]);
crearReceta(P_BREAST_WHOLE_2SIDES.id, [
  { insumo: INSU_CHICKEN, cantidad: 0.6 },
  { insumo: INSU_LETTUCE, cantidad: 0.1 },
]);
crearReceta(P_BREAST_CHOPPED_2SIDES.id, [
  { insumo: INSU_CHICKEN, cantidad: 0.6 },
  { insumo: INSU_LETTUCE, cantidad: 0.1 },
]);

// CHEESADILLA
crearReceta(P_CHEESADILLA_CHICKEN.id, [
  { insumo: INSU_CHICKEN, cantidad: 0.3 },
  { insumo: INSU_TORTILLA, cantidad: 1 },
  { insumo: INSU_CHEESE, cantidad: 0.2 },
]);
crearReceta(P_CHEESADILLA_COMBO.id, [
  { insumo: INSU_CHICKEN, cantidad: 0.3 },
  { insumo: INSU_TORTILLA, cantidad: 1 },
  { insumo: INSU_CHEESE, cantidad: 0.2 },
]);
crearReceta(P_CHEESADILLA_CHEESE.id, [
  { insumo: INSU_TORTILLA, cantidad: 1 },
  { insumo: INSU_CHEESE, cantidad: 0.25 },
]);

// HEALTHY KIDS MEALS
crearReceta(P_KIDS_MINICHOP.id, [
  { insumo: INSU_CHICKEN, cantidad: 0.2 },
  { insumo: INSU_RICE, cantidad: 0.2 },
  { insumo: INSU_LETTUCE, cantidad: 0.1 },
]);
crearReceta(P_KIDS_BREAST.id, [
  { insumo: INSU_CHICKEN, cantidad: 0.25 },
  { insumo: INSU_LETTUCE, cantidad: 0.1 },
]);

// SIDE ORDERS
crearReceta(P_SIDE_BALSAMIC_TOMATOES.id, [{ insumo: INSU_TOMATO, cantidad: 0.25 }]);
crearReceta(P_SIDE_CORN_MIX.id, [
  { insumo: INSU_CORN, cantidad: 0.25 },
  { insumo: INSU_BLACKBEANS, cantidad: 0.1 },
]);
crearReceta(P_SIDE_SWEET_POTATOES.id, [{ insumo: INSU_SWEETPOTATO, cantidad: 0.3 }]);
crearReceta(P_SIDE_GUACAMOLE.id, [{ insumo: INSU_GUACAMOLE, cantidad: 0.2 }]);

// DESSERTS
crearReceta(P_DESSERT_BROWNIE.id, [{ insumo: INSU_BROWNIE, cantidad: 1 }]);

// DRINKS
crearReceta(P_DRINK_SOFT_REGULAR.id, [
  { insumo: INSU_SODASYRUP, cantidad: 0.15 },
  { insumo: INSU_CUP, cantidad: 1 },
]);
crearReceta(P_DRINK_SOFT_LARGE.id, [
  { insumo: INSU_SODASYRUP, cantidad: 0.22 },
  { insumo: INSU_CUP, cantidad: 1 },
]);
crearReceta(P_DRINK_WATER.id, [{ insumo: INSU_BOTTLEDWATER, cantidad: 1 }]);
crearReceta(P_DRINK_ICEDTEA.id, [
  { insumo: INSU_TEAMIX, cantidad: 0.1 },
  { insumo: INSU_CUP, cantidad: 1 },
]);

// ---------------------------------------------------------------------------
// Stock inicial DEMO (para la ubicacion piloto). Guacamole y Cup quedan cerca/
// bajo su umbral a proposito, para poder demostrar la alerta de bajo stock.
// ---------------------------------------------------------------------------

const STOCK_INICIAL: SeedCatalogo["stockInicial"] = [
  { insumoId: INSU_CHICKEN.id, cantidadActual: 40 },
  { insumoId: INSU_LETTUCE.id, cantidadActual: 20 },
  { insumoId: INSU_RICE.id, cantidadActual: 30 },
  { insumoId: INSU_BLACKBEANS.id, cantidadActual: 15 },
  { insumoId: INSU_CORN.id, cantidadActual: 15 },
  { insumoId: INSU_TOMATO.id, cantidadActual: 12 },
  { insumoId: INSU_CHEESE.id, cantidadActual: 10 },
  { insumoId: INSU_TORTILLA.id, cantidadActual: 60 },
  { insumoId: INSU_GUACAMOLE.id, cantidadActual: 2 }, // <= umbral (2): BAJO STOCK demo
  { insumoId: INSU_SWEETPOTATO.id, cantidadActual: 25 },
  { insumoId: INSU_BROWNIE.id, cantidadActual: 20 },
  { insumoId: INSU_SODASYRUP.id, cantidadActual: 10 },
  { insumoId: INSU_CUP.id, cantidadActual: 15 }, // < umbral (20): BAJO STOCK demo
  { insumoId: INSU_BOTTLEDWATER.id, cantidadActual: 40 },
  { insumoId: INSU_TEAMIX.id, cantidadActual: 8 },
];

// ---------------------------------------------------------------------------

export function getSeedCatalogo(): SeedCatalogo {
  return {
    categorias: CATEGORIAS,
    productos: PRODUCTOS,
    combos: COMBOS,
    gruposModificador: GRUPOS_MODIFICADOR,
    modificadores: MODIFICADORES,
    insumos: INSUMOS,
    recetas: RECETAS,
    recetaInsumos: RECETA_INSUMOS,
    stockInicial: STOCK_INICIAL,
  };
}
