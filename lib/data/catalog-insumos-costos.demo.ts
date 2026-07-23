/**
 * ESTIMADOS DEMO de costo unitario por insumo — DUENO: menu-inventario-pos (Fase B, 2026-07-22).
 *
 * POR QUE ESTE ARCHIVO EXISTE (ver docs/analisis-revision-20260722-modulos-innovacion-seguridad.md,
 * Anexo A.2, y el encabezado de scripts/importar-recetario.js): el import real de
 * `Recetario_Simplificado.xlsx` EXCLUYE a proposito la columna "Costo ($)" del
 * archivo fuente porque se verifico que no es un costo unitario confiable
 * (ej. "SALT IODIZED GRANULAR" usada 185 veces implica un costo-por-onza entre
 * $0.019 y $3.58 segun la receta en la que aparece — ~180x de varianza). Por
 * eso `Insumo.costoUnitarioCentavos` (lib/domain/types.ts) llega vacio desde el
 * import real.
 *
 * Este archivo NO intenta arreglar el dato del archivo fuente: en vez de eso
 * asigna un ESTIMADO DEMO razonable de costo mayorista US tipico por CATEGORIA
 * de insumo (proteinas, produce, lacteos, especias/secos, salsas/aderezos/aceites,
 * panes/almidones, bebidas, postres, empaque/desechables), detectada por
 * PALABRAS CLAVE sobre el nombre real del insumo (mismo tipo de heuristica de
 * nombre que docs/requisitos.md S-16 describe para alergenos). El valor esta
 * en CENTAVOS ENTEROS (C-DINERO) por 1 unidad en la `unidadMedida` PROPIA de
 * ese insumo (la misma unidad en la que se expresa `RecetaInsumo.cantidad`),
 * para que el costeo de una receta sea una simple suma de `cantidad *
 * costoUnitarioCentavos` sin tener que convertir unidades.
 *
 * PENDIENTE DE VALIDAR contra facturas reales de proveedor antes de usarse
 * para decisiones de precio real (mismo caveat que el resto de los datos DEMO
 * de este proyecto — buscar "DEMO" en este archivo).
 */

interface ReglaCosto {
  /** Nombre corto de la categoria DEMO (solo para trazabilidad/depuracion). */
  categoria: string;
  /** Coincide si el nombre (ya en MAYUSCULAS) contiene TODAS estas subcadenas. */
  contieneTodas: string[];
  /** Costo estimado en CENTAVOS por 1 unidad de `unidadMedida` propia del insumo. */
  centavos: number;
}

// ---------------------------------------------------------------------------
// Reglas ordenadas de MAS a MENOS especifica (la primera que matchea gana).
// Los valores son ordenes de magnitud de mayoreo US tipico (2025-2026), no
// cotizaciones reales de ningun proveedor de Chicken Kitchen.
// ---------------------------------------------------------------------------
const REGLAS: ReglaCosto[] = [
  // ---- Empaque / desechables (precio por pieza, EA/EACH/each) ----
  { categoria: "empaque-dispensador", contieneTodas: ["DSPNSR"], centavos: 800 }, // bien durable, no se consume por orden
  { categoria: "empaque-lid", contieneTodas: ["LID"], centavos: 6 },
  { categoria: "empaque-cup", contieneTodas: ["CUP"], centavos: 3 },
  { categoria: "empaque-container-grande", contieneTodas: ["CONTAINER"], centavos: 10 },
  { categoria: "empaque-bowl", contieneTodas: ["BOWL"], centavos: 14 },
  { categoria: "empaque-plate", contieneTodas: ["PLATE"], centavos: 12 },
  // OJO: "BAG" solo (sin "T-SHIRT") da falsos positivos contra insumos reales
  // que dicen "BAG" como descriptor de empaque de PRODUCE (ej. "ONION YLW
  // JUMBO FRSH BAG") o incluso como subcadena accidental dentro de "CABBAGE" —
  // encontrado al validar esta heuristica contra los 84 insumos reales (ver
  // reporte de la tarea). Se exige tambien "T-SHIRT" para acotarlo a la bolsa
  // desechable real del catalogo ("BAG T-SHIRT 12X6X21").
  { categoria: "empaque-bag", contieneTodas: ["BAG", "T-SHIRT"], centavos: 4 },
  { categoria: "empaque-napkin", contieneTodas: ["NAPKIN"], centavos: 1 },
  { categoria: "empaque-fork", contieneTodas: ["FORK"], centavos: 2 },
  { categoria: "empaque-wrap-foil", contieneTodas: ["WRAP"], centavos: 5 },

  // ---- Proteinas (OZ) ----
  { categoria: "proteina-pollo-pechuga", contieneTodas: ["CHICKEN", "BREAST"], centavos: 20 },
  { categoria: "proteina-pollo-muslo", contieneTodas: ["CHICKEN", "THIGH"], centavos: 16 },

  // ---- Lacteos / huevo (OZ) ----
  { categoria: "lacteo-parmesano", contieneTodas: ["CHEESE", "PARMESAN"], centavos: 30 },
  { categoria: "lacteo-queso", contieneTodas: ["CHEESE"], centavos: 22 },
  { categoria: "lacteo-crema", contieneTodas: ["SOUR CREAM"], centavos: 9 },
  { categoria: "huevo-mayo", contieneTodas: ["MAYO"], centavos: 6 },

  // ---- Postres (horneados: gluten+lacteos+huevo tipico) ----
  { categoria: "postre-flan", contieneTodas: ["FLAN"], centavos: 90 },
  { categoria: "postre-brownie", contieneTodas: ["BROWNIE"], centavos: 18 },

  // ---- Bebidas (por pieza) ----
  { categoria: "bebida-agua", contieneTodas: ["WATER"], centavos: 25 },
  { categoria: "bebida-soda", contieneTodas: ["SODA"], centavos: 30 },
  { categoria: "bebida-jugo", contieneTodas: ["DRINK"], centavos: 35 },

  // ---- Panes / tortillas / almidones (por pieza o OZ) ----
  { categoria: "pan-pita", contieneTodas: ["BREAD", "PITA"], centavos: 22 },
  { categoria: "tortilla", contieneTodas: ["TORTILLA"], centavos: 20 },
  { categoria: "almidon-arroz-blanco", contieneTodas: ["WHITE RICE"], centavos: 3 },
  { categoria: "almidon-arroz-integral", contieneTodas: ["BROWN RICE"], centavos: 4 },
  { categoria: "almidon-papa-pure", contieneTodas: ["POTATO", "MASHED"], centavos: 6 },
  { categoria: "almidon-camote", contieneTodas: ["POTATO", "SWEET"], centavos: 45 }, // por pieza (Each)
  { categoria: "legumbre-frijol", contieneTodas: ["BLACK BEAN"], centavos: 5 },

  // ---- Bases / caldos concentrados (OZ) ----
  { categoria: "base-caldo", contieneTodas: ["BASE", "CHICKEN"], centavos: 18 },

  // ---- Salsas / aderezos / glaseados / aceites / vinagres / mostaza (OZ) ----
  { categoria: "salsa-glaseado-teriyaki", contieneTodas: ["GLAZE", "TERIYAKI"], centavos: 12 },
  { categoria: "aderezo-caesar", contieneTodas: ["DRESSING", "CAESAR"], centavos: 14 },
  { categoria: "aderezo-coleslaw", contieneTodas: ["DRESSING", "COLESLAW"], centavos: 10 },
  { categoria: "salsa-generica", contieneTodas: ["SAUCE"], centavos: 10 },
  { categoria: "aceite-oliva", contieneTodas: ["OIL", "OLIVE"], centavos: 24 },
  { categoria: "aceite-vegetal", contieneTodas: ["VEG OIL"], centavos: 7 },
  { categoria: "vinagre-balsamico", contieneTodas: ["VINEGAR", "BALSAMIC"], centavos: 14 },
  { categoria: "vinagre-generico", contieneTodas: ["VINEGAR"], centavos: 6 },
  { categoria: "mostaza", contieneTodas: ["MUSTARD"], centavos: 5 },

  // ---- Especias / secos (OZ, uso en pizca => mas caro por oz) ----
  { categoria: "especia-curry", contieneTodas: ["CURRY"], centavos: 35 },
  { categoria: "especia-ajo-polvo", contieneTodas: ["GARLIC", "PWDR"], centavos: 25 },
  { categoria: "especia-pimienta", contieneTodas: ["PEPPER", "BLACK"], centavos: 30 },
  { categoria: "especia-ajonjoli", contieneTodas: ["SESAME"], centavos: 25 },
  { categoria: "colorante", contieneTodas: ["FOOD COLORING"], centavos: 450 }, // por botella
  { categoria: "sal", contieneTodas: ["SALT"], centavos: 2 },

  // ---- Produce fresco (OZ salvo excepciones "por pieza" marcadas) ----
  { categoria: "produce-limon-lima", contieneTodas: ["LIMES"], centavos: 15 }, // por pieza (EA)
  { categoria: "produce-aguacate", contieneTodas: ["AVOCADO"], centavos: 65 }, // por pieza (EA)
  { categoria: "produce-cilantro", contieneTodas: ["CILANTRO"], centavos: 10 },
  { categoria: "produce-ajo-fresco", contieneTodas: ["GARLIC"], centavos: 12 },
  { categoria: "produce-cebolla-roja", contieneTodas: ["ONION", "RED"], centavos: 5 },
  { categoria: "produce-cebolla-verde", contieneTodas: ["ONION", "GREEN"], centavos: 10 },
  { categoria: "produce-cebolla-amarilla", contieneTodas: ["ONION"], centavos: 4 },
  { categoria: "produce-tomate", contieneTodas: ["TOMATO"], centavos: 6 },
  { categoria: "produce-lechuga-romana", contieneTodas: ["LETTUCE", "ROMAINE"], centavos: 6 },
  { categoria: "produce-lechuga", contieneTodas: ["LETTUCE"], centavos: 5 },
  { categoria: "produce-mix-verdes", contieneTodas: ["SPRING MIX"], centavos: 12 },
  { categoria: "produce-zanahoria", contieneTodas: ["CARROT"], centavos: 5 },
  { categoria: "produce-pepino", contieneTodas: ["CUCUMBER"], centavos: 5 },
  { categoria: "produce-croutones", contieneTodas: ["CROUTON"], centavos: 10 },
  { categoria: "produce-pimiento-rojo", contieneTodas: ["PEPPERS", "RED BELL"], centavos: 9 },
  { categoria: "produce-pimiento-verde", contieneTodas: ["PEPPERS", "GREEN BELL"], centavos: 7 },
  { categoria: "produce-jalapeno", contieneTodas: ["JALAPENO"], centavos: 7 },
  { categoria: "produce-platano", contieneTodas: ["PLANTAIN"], centavos: 7 },
  { categoria: "produce-elote", contieneTodas: ["CORN"], centavos: 5 },
  { categoria: "produce-repollo", contieneTodas: ["CABBAGE"], centavos: 4 },
  { categoria: "produce-brocoli-mini", contieneTodas: ["BROCCOLI", "FLORET"], centavos: 8 },
  { categoria: "produce-brocoli", contieneTodas: ["BROCCOLI"], centavos: 7 },
  { categoria: "produce-aceituna", contieneTodas: ["OLIVE"], centavos: 14 },
  { categoria: "produce-chile-banana", contieneTodas: ["PEPPERS", "BANANA"], centavos: 7 },
];

/** Fallback si ninguna regla matchea (no deberia pasar para los 84 insumos reales, ver reporte). */
const CENTAVOS_DEFECTO = 10;

/**
 * Estima el costo unitario DEMO (centavos, en la unidad propia del insumo) a
 * partir de su nombre. Ver caveats de este archivo: NO es un costo real.
 */
export function estimarCostoUnitarioCentavosDemo(nombre: string): number {
  const nombreUpper = nombre.toUpperCase();
  for (const regla of REGLAS) {
    if (regla.contieneTodas.every((sub) => nombreUpper.includes(sub))) {
      return regla.centavos;
    }
  }
  return CENTAVOS_DEFECTO;
}
