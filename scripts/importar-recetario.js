/**
 * Importador ONE-TIME de `Recetario_Simplificado.xlsx` -> semilla real de catalogo.
 *
 * DUENO: menu-inventario-pos (Fase A, 2026-07-22).
 *
 * Que hace: lee el archivo real de recetas (503 productos unicos / 18 hojas de
 * categoria) y genera `lib/data/catalog-recetario.generado.ts`, un archivo TS
 * con datos literales (Categoria/Producto/Insumo/Receta/RecetaInsumo/stock
 * inicial) listo para que `lib/data/catalog-real.ts` lo consuma en runtime.
 *
 * Por que un script aparte en vez de parsear el .xlsx en runtime: (1) `xlsx`
 * es una dependencia pesada que NO queremos en el bundle serverless de Vercel;
 * (2) el resultado es determinista, asi que conviene commitear el TS generado
 * y correr este script solo cuando el .xlsx real cambie.
 *
 * Uso:  node scripts/importar-recetario.js
 * Requiere: `npm install --no-save xlsx` (o como devDependency) si no esta
 * instalado localmente — no es dependencia de la app en runtime.
 *
 * ---------------------------------------------------------------------------
 * REGLAS DE PARSEO (ver docs/analisis-revision-20260722-modulos-innovacion-seguridad.md
 * y el encargo de tarea que motivo este script):
 *
 * - Cada hoja de categoria tiene 4 columnas: "Receta / Ingrediente" | "Cantidad"
 *   | "Costo ($)" | "Precio ($)". Una fila con valor numerico en Precio ($) es
 *   un PRODUCTO (su precio de venta); las filas siguientes sin Precio pero con
 *   Cantidad+Costo son las lineas de ingrediente de ESE producto, hasta la
 *   siguiente fila con Precio.
 * - Se EXCLUYEN las 3 hojas "Olo *" (Olo Fee / Olo Value Meals / Olo Vm Mods):
 *   son estructuras de precio/fee para una futura integracion de pedidos
 *   online (Olo), no recetas de menu reales. Fuera de alcance de este import.
 * - La columna "Costo ($)" NO se importa: se verifico rigurosamente que no es
 *   un costo unitario confiable (ej. "SALT IODIZED GRANULAR" usada 185 veces
 *   implica costo-por-onza entre $0.019 y $3.58 segun la receta — ~180x de
 *   varianza). Por suerte ni `Insumo` ni `RecetaInsumo` tienen un campo de
 *   costo en el modelo de dominio (ver lib/domain/types.ts), asi que no hay
 *   nada que "no llenar": simplemente se ignora esa columna del archivo.
 * - Se verifico que NO hay BOM multi-nivel real en este archivo (0 nombres de
 *   ingrediente que coincidan con nombres de producto), asi que una estructura
 *   plana Producto -> Receta -> RecetaInsumo -> Insumo es correcta y suficiente.
 * - Productos sin desglose de ingredientes (varios Toppings/Modifiers/Catering)
 *   se importan igual como Producto vendible, simplemente sin Receta.
 * - Lineas de ingrediente cuyo valor de "Cantidad" no trae un numero (ej. solo
 *   "LB" o "EA", sin cantidad — 14 casos de 1646, defecto del archivo fuente)
 *   se DESCARTAN (no se puede crear una RecetaInsumo sin cantidad valida); se
 *   listan en el resumen impreso por este script para trazabilidad.
 * - Cuando el mismo insumo aparece mas de una vez dentro de la receta de UN
 *   producto (ej. "SALT IODIZED GRANULAR" 3 veces en un mismo Chop-Chop, con
 *   cantidades distintas), se SUMAN en una sola RecetaInsumo (un producto no
 *   deberia tener dos lineas para el mismo insumo).
 * - umbralStockBajo / stock inicial: el archivo no trae esta informacion (es
 *   inventario, no receta), asi que se calculan con una heuristica DEMO simple
 *   a partir de la cantidad tipica de uso por receta (ver `calcularUmbral`
 *   abajo) — documentado como PENDIENTE DE VALIDAR contra inventario real.
 * ---------------------------------------------------------------------------
 */

const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");

const ARCHIVO_ORIGEN = path.join(__dirname, "..", "Recetario_Simplificado.xlsx");
const ARCHIVO_SALIDA = path.join(__dirname, "..", "lib", "data", "catalog-recetario.generado.ts");

// Hojas de categoria reales (excluye "RESUMEN" y las 3 hojas "Olo *", ver nota arriba).
const HOJAS_CATEGORIA = [
  "Chop-Chop",
  "Extras",
  "Wrapitos",
  "Salads",
  "Boneless",
  "Sides",
  "Dessert",
  "Kids",
  "Beverages",
  "Dressings",
  "Sauces",
  "Toppings",
  "Modifiers",
  "Cheesadillas",
  "Catering",
];

const HOJAS_OLO_EXCLUIDAS = ["Olo Fee", "Olo Value Meals", "Olo Vm Mods"];

function slug(texto) {
  return texto
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** Parsea "1.8176 OZ" / ".012 EA" / "1 4 OZ CONT" -> { num, unit }. null si no hay numero. */
function parseCantidad(raw) {
  const s = String(raw).trim();
  const m = s.match(/^(-?[\d.]+)\s*(.*)$/);
  if (!m) return null;
  const num = parseFloat(m[1]);
  if (Number.isNaN(num)) return null;
  return { num, unit: m[2].trim() };
}

/**
 * Redondea a 4 decimales (evita ruido de floats en cantidades, sin destruir
 * cantidades legitimamente chicas — ej. "FOOD COLORING YLW PWDR" se usa en
 * fracciones de botella del orden de .0002-.0057; redondear a 2 decimales
 * las convertiria en 0, lo cual rompe la receta. Se detecto este bug durante
 * el desarrollo de este script, ver verificacion en el reporte de la tarea).
 */
function r2(n) {
  return Math.round(n * 10000) / 10000;
}

/**
 * Heuristica DEMO de umbral de stock bajo: ~10 usos tipicos de receta.
 * PENDIENTE DE VALIDAR contra inventario/facturas reales (mismo caveat que el
 * resto de este import respecto a datos operativos que el archivo no trae).
 */
function calcularUmbral(cantidadesUso) {
  if (cantidadesUso.length === 0) return 1;
  const promedio = cantidadesUso.reduce((a, b) => a + b, 0) / cantidadesUso.length;
  return Math.max(0.01, r2(promedio * 10));
}

function leerLibro() {
  if (!fs.existsSync(ARCHIVO_ORIGEN)) {
    throw new Error(`No se encontro el archivo fuente: ${ARCHIVO_ORIGEN}`);
  }
  return XLSX.readFile(ARCHIVO_ORIGEN);
}

function main() {
  const wb = leerLibro();

  for (const hoja of HOJAS_CATEGORIA) {
    if (!wb.Sheets[hoja]) {
      throw new Error(`Hoja esperada no encontrada en el libro: "${hoja}"`);
    }
  }

  const categorias = [];
  const productos = [];
  const recetas = [];
  const recetaInsumos = [];

  // insumoId -> { nombre, unidad, usos: number[] }
  const insumosPorNombre = new Map();
  const lineasDescartadas = [];
  let contadorRi = 0;

  HOJAS_CATEGORIA.forEach((hoja, idxHoja) => {
    const sheet = wb.Sheets[hoja];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });

    const categoriaId = `cat-real-${slug(hoja)}`;
    const tituloCategoria = (rows[0] && rows[0][0]) || hoja.toUpperCase();
    categorias.push({
      id: categoriaId,
      nombre: String(tituloCategoria).trim(),
      orden: idxHoja + 1,
      activo: true,
    });

    let productoActual = null; // { id, nombre, ingredientesAcumulados: Map<insumoId, {nombre, cantidad}> }
    let contadorProductoEnHoja = 0;

    function cerrarProductoActual() {
      if (!productoActual) return;
      if (productoActual.ingredientesAcumulados.size > 0) {
        const recetaId = `receta-real-${productoActual.id}`;
        recetas.push({ id: recetaId, productoId: productoActual.id, activo: true });
        for (const [insumoId, info] of productoActual.ingredientesAcumulados) {
          contadorRi += 1;
          recetaInsumos.push({
            id: `ri-real-${contadorRi}`,
            recetaId,
            insumoId,
            cantidad: r2(info.cantidad),
          });
          const entradaInsumo = insumosPorNombre.get(insumoId);
          entradaInsumo.usos.push(info.cantidad);
        }
      }
      productoActual = null;
    }

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row[0] == null) continue;
      const nombreCelda = row[0];
      if (typeof nombreCelda !== "string") continue;
      const nombre = nombreCelda.trim();
      if (nombre === "" || nombre === "Receta / Ingrediente") continue;
      if (i === 0) continue; // fila de titulo de la hoja (ej. "CHOP-CHOP")

      const cantidadRaw = row[1];
      const precio = row[3];

      const esFilaProducto = typeof precio === "number";

      if (esFilaProducto) {
        cerrarProductoActual();
        contadorProductoEnHoja += 1;
        const productoId = `prod-real-${slug(hoja)}-${slug(nombre)}-${contadorProductoEnHoja}`;
        const producto = {
          id: productoId,
          categoriaId,
          nombre,
          descripcion: "",
          precioBase: Math.round(precio * 100), // C-DINERO: centavos enteros
          gravable: true,
          esCombo: false,
          disponible86: true,
          activo: true,
        };
        productos.push(producto);
        productoActual = { id: productoId, nombre, ingredientesAcumulados: new Map() };
      } else if (cantidadRaw != null && productoActual) {
        const parsed = parseCantidad(cantidadRaw);
        if (!parsed) {
          lineasDescartadas.push({ hoja, producto: productoActual.nombre, ingrediente: nombre, cantidadRaw });
          continue;
        }
        const insumoId = `insu-real-${slug(nombre)}`;
        if (!insumosPorNombre.has(insumoId)) {
          insumosPorNombre.set(insumoId, { nombre, unidad: parsed.unit, usos: [] });
        }
        const acc = productoActual.ingredientesAcumulados;
        const previo = acc.get(insumoId);
        if (previo) {
          previo.cantidad += parsed.num;
        } else {
          acc.set(insumoId, { nombre, cantidad: parsed.num });
        }
      }
      // Si no hay producto abierto y la fila no es de producto (dato huerfano al
      // inicio de hoja), se ignora silenciosamente: no deberia ocurrir dado el
      // formato observado del archivo (verificado con scripts/_explore*.js).
    }
    cerrarProductoActual();
  });

  // Construir Insumo[] + stockInicial a partir del mapa acumulado.
  const insumos = [];
  const stockInicial = [];
  for (const [insumoId, info] of insumosPorNombre) {
    const umbral = calcularUmbral(info.usos);
    insumos.push({
      id: insumoId,
      nombre: info.nombre,
      unidadMedida: info.unidad || "unidad",
      umbralStockBajo: umbral,
    });
    // Buffer inicial DEMO: 8x el umbral, para no arrancar la app con medio
    // catalogo ya en 86 por falta de conteo real de inventario (pendiente de
    // validar contra inventario real, igual que el umbral).
    stockInicial.push({ insumoId, cantidadActual: r2(umbral * 8) });
  }

  // ---- Resumen impreso (para el reporte de verificacion de la tarea) ----
  console.log("=== Import Recetario_Simplificado.xlsx -> catalogo real ===");
  console.log("Categorias:", categorias.length);
  console.log("Productos:", productos.length);
  console.log("Recetas (productos CON ingredientes):", recetas.length);
  console.log("Lineas RecetaInsumo:", recetaInsumos.length);
  console.log("Insumos unicos:", insumos.length);
  console.log("Lineas de ingrediente descartadas (sin cantidad numerica parseable):", lineasDescartadas.length);
  if (lineasDescartadas.length > 0) {
    console.log(JSON.stringify(lineasDescartadas, null, 2));
  }
  console.log("Hojas Olo excluidas (fuera de alcance, futura integracion online):", HOJAS_OLO_EXCLUIDAS.join(", "));

  // ---- Generar el archivo TS ----
  const encabezado = `/**
 * ARCHIVO AUTO-GENERADO — NO EDITAR A MANO.
 *
 * Generado por scripts/importar-recetario.js a partir de
 * Recetario_Simplificado.xlsx (503 productos reales / 18 hojas de categoria,
 * 15 importadas como catalogo vendible — ver el script para el detalle de
 * reglas de parseo y exclusiones). Para regenerar tras un cambio al .xlsx:
 *
 *   node scripts/importar-recetario.js
 *
 * Dueno: menu-inventario-pos (Fase A, 2026-07-22).
 *
 * CAVEATS DE DATOS (heredados del archivo fuente, ya documentados y
 * verificados — ver docs/analisis-revision-20260722-modulos-innovacion-seguridad.md):
 *  - La columna "Costo ($)" del archivo NO se importa (no es un costo unitario
 *    confiable: variaciones de hasta ~180x para el mismo insumo entre recetas).
 *  - umbralStockBajo y el stock inicial son una heuristica DEMO (10x/80x el
 *    uso tipico por receta) — PENDIENTE DE VALIDAR contra inventario real.
 *  - Los precios (Producto.precioBase) SI son reales (columna "Precio ($)").
 *  - Las 3 hojas "Olo *" (pricing de una futura integracion de pedidos online)
 *    se excluyeron de este import — fuera de alcance.
 *  - Este import NO genera Combo / GrupoModificador / Modificador: no hay
 *    forma confiable de derivarlos de este archivo (es un recetario de costos,
 *    no una definicion de grupos de modificadores); queda como trabajo futuro
 *    si se necesita UI de combos/modificadores sobre el catalogo real.
 */

import type { Categoria, Insumo, Producto, Receta, RecetaInsumo } from "../domain/types";

export const CATEGORIAS_RECETARIO: Categoria[] = ${JSON.stringify(categorias, null, 2)};

export const PRODUCTOS_RECETARIO: Producto[] = ${JSON.stringify(productos, null, 2)};

export const INSUMOS_RECETARIO: Insumo[] = ${JSON.stringify(insumos, null, 2)};

export const RECETAS_RECETARIO: Receta[] = ${JSON.stringify(recetas, null, 2)};

export const RECETA_INSUMOS_RECETARIO: RecetaInsumo[] = ${JSON.stringify(recetaInsumos, null, 2)};

export const STOCK_INICIAL_RECETARIO: { insumoId: string; cantidadActual: number }[] = ${JSON.stringify(stockInicial, null, 2)};
`;

  fs.writeFileSync(ARCHIVO_SALIDA, encabezado, "utf8");
  console.log(`\nEscrito: ${ARCHIVO_SALIDA}`);
}

main();
