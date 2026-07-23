/**
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

export const CATEGORIAS_RECETARIO: Categoria[] = [
  {
    "id": "cat-real-chop-chop",
    "nombre": "CHOP-CHOP",
    "orden": 1,
    "activo": true
  },
  {
    "id": "cat-real-extras",
    "nombre": "EXTRAS",
    "orden": 2,
    "activo": true
  },
  {
    "id": "cat-real-wrapitos",
    "nombre": "WRAPITOS",
    "orden": 3,
    "activo": true
  },
  {
    "id": "cat-real-salads",
    "nombre": "SALADS",
    "orden": 4,
    "activo": true
  },
  {
    "id": "cat-real-boneless",
    "nombre": "BONELESS",
    "orden": 5,
    "activo": true
  },
  {
    "id": "cat-real-sides",
    "nombre": "SIDES",
    "orden": 6,
    "activo": true
  },
  {
    "id": "cat-real-dessert",
    "nombre": "DESSERT",
    "orden": 7,
    "activo": true
  },
  {
    "id": "cat-real-kids",
    "nombre": "KIDS",
    "orden": 8,
    "activo": true
  },
  {
    "id": "cat-real-beverages",
    "nombre": "BEVERAGES",
    "orden": 9,
    "activo": true
  },
  {
    "id": "cat-real-dressings",
    "nombre": "DRESSINGS",
    "orden": 10,
    "activo": true
  },
  {
    "id": "cat-real-sauces",
    "nombre": "SAUCES",
    "orden": 11,
    "activo": true
  },
  {
    "id": "cat-real-toppings",
    "nombre": "TOPPINGS",
    "orden": 12,
    "activo": true
  },
  {
    "id": "cat-real-modifiers",
    "nombre": "MODIFIERS",
    "orden": 13,
    "activo": true
  },
  {
    "id": "cat-real-cheesadillas",
    "nombre": "CHEESADILLAS",
    "orden": 14,
    "activo": true
  },
  {
    "id": "cat-real-catering",
    "nombre": "CATERING",
    "orden": 15,
    "activo": true
  }
];

export const PRODUCTOS_RECETARIO: Producto[] = [
  {
    "id": "prod-real-chop-chop-sm-original-chop-chop-1",
    "categoriaId": "cat-real-chop-chop",
    "nombre": "SM ORIGINAL CHOP-CHOP",
    "descripcion": "",
    "precioBase": 899,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-chop-chop-sm-deluxe-chop-chop-2",
    "categoriaId": "cat-real-chop-chop",
    "nombre": "SM DELUXE CHOP-CHOP",
    "descripcion": "",
    "precioBase": 999,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-chop-chop-sm-cuban-chop-chop-3",
    "categoriaId": "cat-real-chop-chop",
    "nombre": "SM CUBAN CHOP-CHOP",
    "descripcion": "",
    "precioBase": 1069,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-chop-chop-sm-mexican-chop-chop-4",
    "categoriaId": "cat-real-chop-chop",
    "nombre": "SM MEXICAN CHOP-CHOP",
    "descripcion": "",
    "precioBase": 1249,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-chop-chop-sm-bazooka-chop-chop-5",
    "categoriaId": "cat-real-chop-chop",
    "nombre": "SM BAZOOKA CHOP-CHOP",
    "descripcion": "",
    "precioBase": 1359,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-chop-chop-sm-no-carb-chop-chop-6",
    "categoriaId": "cat-real-chop-chop",
    "nombre": "SM NO-CARB CHOP-CHOP",
    "descripcion": "",
    "precioBase": 999,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-chop-chop-sm-asian-chop-chop-7",
    "categoriaId": "cat-real-chop-chop",
    "nombre": "SM ASIAN CHOP-CHOP",
    "descripcion": "",
    "precioBase": 1069,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-chop-chop-sm-teriyaki-chop-chop-8",
    "categoriaId": "cat-real-chop-chop",
    "nombre": "SM TERIYAKI CHOP-CHOP",
    "descripcion": "",
    "precioBase": 899,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-chop-chop-sm-vegetarian-chop-chop-9",
    "categoriaId": "cat-real-chop-chop",
    "nombre": "SM VEGETARIAN CHOP-CHOP",
    "descripcion": "",
    "precioBase": 999,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-chop-chop-sm-make-your-own-chop-c-10",
    "categoriaId": "cat-real-chop-chop",
    "nombre": "SM MAKE YOUR OWN CHOP-C",
    "descripcion": "",
    "precioBase": 899,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-chop-chop-lg-original-chop-chop-11",
    "categoriaId": "cat-real-chop-chop",
    "nombre": "LG ORIGINAL CHOP-CHOP",
    "descripcion": "",
    "precioBase": 1219,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-chop-chop-lg-deluxe-chop-chop-12",
    "categoriaId": "cat-real-chop-chop",
    "nombre": "LG DELUXE CHOP-CHOP",
    "descripcion": "",
    "precioBase": 1319,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-chop-chop-lg-cuban-chop-chop-13",
    "categoriaId": "cat-real-chop-chop",
    "nombre": "LG CUBAN CHOP-CHOP",
    "descripcion": "",
    "precioBase": 1389,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-chop-chop-lg-mexican-chop-chop-14",
    "categoriaId": "cat-real-chop-chop",
    "nombre": "LG MEXICAN CHOP-CHOP",
    "descripcion": "",
    "precioBase": 1569,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-chop-chop-lg-bazooka-chop-chop-15",
    "categoriaId": "cat-real-chop-chop",
    "nombre": "LG BAZOOKA CHOP-CHOP",
    "descripcion": "",
    "precioBase": 1679,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-chop-chop-lg-no-carb-chop-chop-16",
    "categoriaId": "cat-real-chop-chop",
    "nombre": "LG-NO-CARB CHOP-CHOP",
    "descripcion": "",
    "precioBase": 1329,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-chop-chop-lg-asian-chop-chop-17",
    "categoriaId": "cat-real-chop-chop",
    "nombre": "LG ASIAN CHOP-CHOP",
    "descripcion": "",
    "precioBase": 1389,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-chop-chop-lg-teriyaki-chop-chop-18",
    "categoriaId": "cat-real-chop-chop",
    "nombre": "LG TERIYAKI CHOP-CHOP",
    "descripcion": "",
    "precioBase": 1219,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-chop-chop-lg-vegetarian-chop-chop-19",
    "categoriaId": "cat-real-chop-chop",
    "nombre": "LG VEGETARIAN CHOP-CHOP",
    "descripcion": "",
    "precioBase": 1319,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-chop-chop-lg-make-your-own-chop-c-20",
    "categoriaId": "cat-real-chop-chop",
    "nombre": "LG MAKE YOUR OWN CHOP-C",
    "descripcion": "",
    "precioBase": 1219,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-chop-chop-original-chop-chop-21",
    "categoriaId": "cat-real-chop-chop",
    "nombre": "ORIGINAL CHOP-CHOP",
    "descripcion": "",
    "precioBase": 4499,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-chop-chop-deluxe-chop-chop-22",
    "categoriaId": "cat-real-chop-chop",
    "nombre": "DELUXE CHOP-CHOP",
    "descripcion": "",
    "precioBase": 4999,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-chop-chop-cuban-chop-chop-23",
    "categoriaId": "cat-real-chop-chop",
    "nombre": "CUBAN CHOP-CHOP",
    "descripcion": "",
    "precioBase": 5349,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-chop-chop-mexican-chop-chop-24",
    "categoriaId": "cat-real-chop-chop",
    "nombre": "MEXICAN CHOP-CHOP",
    "descripcion": "",
    "precioBase": 6249,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-chop-chop-bazooka-chop-chop-25",
    "categoriaId": "cat-real-chop-chop",
    "nombre": "BAZOOKA CHOP-CHOP",
    "descripcion": "",
    "precioBase": 6799,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-chop-chop-no-carb-chop-chop-26",
    "categoriaId": "cat-real-chop-chop",
    "nombre": "NO CARB CHOP-CHOP",
    "descripcion": "",
    "precioBase": 4999,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-chop-chop-asian-chop-chop-27",
    "categoriaId": "cat-real-chop-chop",
    "nombre": "ASIAN CHOP-CHOP",
    "descripcion": "",
    "precioBase": 5349,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-chop-chop-fa-teriyaki-chop-chop-28",
    "categoriaId": "cat-real-chop-chop",
    "nombre": "FA-TERIYAKI CHOP-CHOP",
    "descripcion": "",
    "precioBase": 4499,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-chop-chop-fa-vegetarian-chop-chop-29",
    "categoriaId": "cat-real-chop-chop",
    "nombre": "FA-VEGETARIAN CHOP-CHOP",
    "descripcion": "",
    "precioBase": 4999,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-chop-chop-make-your-own-chop-c-30",
    "categoriaId": "cat-real-chop-chop",
    "nombre": "MAKE YOUR OWN CHOP-C",
    "descripcion": "",
    "precioBase": 4499,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-chop-chop-teriyaki-chop-chop-31",
    "categoriaId": "cat-real-chop-chop",
    "nombre": "TERIYAKI CHOP-CHOP",
    "descripcion": "",
    "precioBase": 8999,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-chop-chop-vegetarian-chop-chop-32",
    "categoriaId": "cat-real-chop-chop",
    "nombre": "VEGETARIAN CHOP-CHOP",
    "descripcion": "",
    "precioBase": 9999,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-chop-chop-open-chop-chop-33",
    "categoriaId": "cat-real-chop-chop",
    "nombre": "OPEN CHOP-CHOP",
    "descripcion": "",
    "precioBase": 0,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-chop-chop-lg-no-carb-chop-chop-34",
    "categoriaId": "cat-real-chop-chop",
    "nombre": "LG- NO-CARB CHOP-CHOP",
    "descripcion": "",
    "precioBase": 1329,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-chop-chop-family-original-chop-ch-35",
    "categoriaId": "cat-real-chop-chop",
    "nombre": "FAMILY ORIGINAL CHOP-CH",
    "descripcion": "",
    "precioBase": 4499,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-chop-chop-family-deluxe-chop-chop-36",
    "categoriaId": "cat-real-chop-chop",
    "nombre": "FAMILY DELUXE CHOP-CHOP",
    "descripcion": "",
    "precioBase": 4999,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-chop-chop-family-cuban-chop-chop-37",
    "categoriaId": "cat-real-chop-chop",
    "nombre": "FAMILY CUBAN CHOP-CHOP",
    "descripcion": "",
    "precioBase": 5349,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-chop-chop-family-mexican-chop-cho-38",
    "categoriaId": "cat-real-chop-chop",
    "nombre": "FAMILY MEXICAN CHOP-CHO",
    "descripcion": "",
    "precioBase": 6249,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-chop-chop-family-bazooka-chop-cho-39",
    "categoriaId": "cat-real-chop-chop",
    "nombre": "FAMILY BAZOOKA CHOP-CHO",
    "descripcion": "",
    "precioBase": 6799,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-chop-chop-family-no-carb-chop-cho-40",
    "categoriaId": "cat-real-chop-chop",
    "nombre": "FAMILY NO CARB CHOP-CHO",
    "descripcion": "",
    "precioBase": 4999,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-chop-chop-family-make-your-own-ch-41",
    "categoriaId": "cat-real-chop-chop",
    "nombre": "FAMILY MAKE YOUR OWN CH",
    "descripcion": "",
    "precioBase": 4499,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-chop-chop-family-asian-chop-chop-42",
    "categoriaId": "cat-real-chop-chop",
    "nombre": "FAMILY ASIAN CHOP-CHOP",
    "descripcion": "",
    "precioBase": 5349,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-chop-chop-family-teriyaki-chop-ch-43",
    "categoriaId": "cat-real-chop-chop",
    "nombre": "FAMILY TERIYAKI CHOP-CH",
    "descripcion": "",
    "precioBase": 4499,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-chop-chop-family-vegetarian-chop-44",
    "categoriaId": "cat-real-chop-chop",
    "nombre": "FAMILY VEGETARIAN CHOP-",
    "descripcion": "",
    "precioBase": 4999,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-chop-chop-party-original-chop-cho-45",
    "categoriaId": "cat-real-chop-chop",
    "nombre": "PARTY ORIGINAL CHOP-CHO",
    "descripcion": "",
    "precioBase": 8999,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-chop-chop-party-deluxe-chop-chop-46",
    "categoriaId": "cat-real-chop-chop",
    "nombre": "PARTY DELUXE CHOP-CHOP",
    "descripcion": "",
    "precioBase": 9999,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-chop-chop-party-cuban-chop-chop-47",
    "categoriaId": "cat-real-chop-chop",
    "nombre": "PARTY CUBAN CHOP-CHOP",
    "descripcion": "",
    "precioBase": 10699,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-chop-chop-party-mexican-chop-chop-48",
    "categoriaId": "cat-real-chop-chop",
    "nombre": "PARTY MEXICAN CHOP-CHOP",
    "descripcion": "",
    "precioBase": 12499,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-chop-chop-party-bazooka-chop-chop-49",
    "categoriaId": "cat-real-chop-chop",
    "nombre": "PARTY BAZOOKA CHOP-CHOP",
    "descripcion": "",
    "precioBase": 13599,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-chop-chop-party-no-carb-chop-chop-50",
    "categoriaId": "cat-real-chop-chop",
    "nombre": "PARTY NO CARB CHOP-CHOP",
    "descripcion": "",
    "precioBase": 9999,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-chop-chop-party-make-your-own-cho-51",
    "categoriaId": "cat-real-chop-chop",
    "nombre": "PARTY MAKE YOUR OWN CHO",
    "descripcion": "",
    "precioBase": 8999,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-chop-chop-party-asian-chop-chop-52",
    "categoriaId": "cat-real-chop-chop",
    "nombre": "PARTY ASIAN CHOP-CHOP",
    "descripcion": "",
    "precioBase": 10699,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-chop-chop-party-teriyaki-chop-cho-53",
    "categoriaId": "cat-real-chop-chop",
    "nombre": "PARTY TERIYAKI CHOP-CHO",
    "descripcion": "",
    "precioBase": 8999,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-chop-chop-party-vegetarian-chop-c-54",
    "categoriaId": "cat-real-chop-chop",
    "nombre": "PARTY VEGETARIAN CHOP-C",
    "descripcion": "",
    "precioBase": 9999,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-chop-chop-sm-dark-meat-roast-chop-55",
    "categoriaId": "cat-real-chop-chop",
    "nombre": "SM DARK MEAT ROAST CHOP",
    "descripcion": "",
    "precioBase": 899,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-chop-chop-lg-dark-meat-roast-chop-56",
    "categoriaId": "cat-real-chop-chop",
    "nombre": "LG DARK MEAT ROAST CHOP",
    "descripcion": "",
    "precioBase": 1219,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-chop-chop-sm-steak-chop-chop-57",
    "categoriaId": "cat-real-chop-chop",
    "nombre": "SM STEAK CHOP-CHOP",
    "descripcion": "",
    "precioBase": 1799,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-chop-chop-lg-steak-chop-chop-58",
    "categoriaId": "cat-real-chop-chop",
    "nombre": "LG STEAK CHOP-CHOP",
    "descripcion": "",
    "precioBase": 2099,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-chop-chop-sm-half-chi-stk-chop-59",
    "categoriaId": "cat-real-chop-chop",
    "nombre": "SM Half Chi & Stk Chop",
    "descripcion": "",
    "precioBase": 1459,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-chop-chop-lg-half-chi-stk-chop-60",
    "categoriaId": "cat-real-chop-chop",
    "nombre": "LG Half Chi & Stk Chop",
    "descripcion": "",
    "precioBase": 1779,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-chop-chop-sm-skirt-steak-chop-cho-61",
    "categoriaId": "cat-real-chop-chop",
    "nombre": "SM SKIRT STEAK CHOP-CHO",
    "descripcion": "",
    "precioBase": 1799,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-chop-chop-lg-steak-chop-cho-62",
    "categoriaId": "cat-real-chop-chop",
    "nombre": "LG STEAK CHOP-CHO",
    "descripcion": "",
    "precioBase": 2099,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-chop-chop-sm-half-n-half-chop-cho-63",
    "categoriaId": "cat-real-chop-chop",
    "nombre": "SM HALF N HALF CHOP-CHO",
    "descripcion": "",
    "precioBase": 1459,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-chop-chop-lg-half-n-half-chop-cho-64",
    "categoriaId": "cat-real-chop-chop",
    "nombre": "LG HALF N HALF CHOP-CHO",
    "descripcion": "",
    "precioBase": 1779,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-chop-chop-stuffed-sweet-potato-ch-65",
    "categoriaId": "cat-real-chop-chop",
    "nombre": "STUFFED SWEET POTATO CH",
    "descripcion": "",
    "precioBase": 729,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-chop-chop-family-skirt-steak-chop-66",
    "categoriaId": "cat-real-chop-chop",
    "nombre": "FAMILY SKIRT STEAK CHOP",
    "descripcion": "",
    "precioBase": 8999,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-chop-chop-family-half-chk-half-st-67",
    "categoriaId": "cat-real-chop-chop",
    "nombre": "FAMILY HALF CHK HALF ST",
    "descripcion": "",
    "precioBase": 7299,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-chop-chop-family-dark-meat-roast-68",
    "categoriaId": "cat-real-chop-chop",
    "nombre": "FAMILY DARK MEAT ROAST",
    "descripcion": "",
    "precioBase": 4499,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-chop-chop-party-skirt-steak-chop-69",
    "categoriaId": "cat-real-chop-chop",
    "nombre": "PARTY SKIRT STEAK CHOP-",
    "descripcion": "",
    "precioBase": 17999,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-chop-chop-party-half-chk-half-ste-70",
    "categoriaId": "cat-real-chop-chop",
    "nombre": "PARTY HALF CHK HALF STE",
    "descripcion": "",
    "precioBase": 14599,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-chop-chop-party-dark-meat-roast-c-71",
    "categoriaId": "cat-real-chop-chop",
    "nombre": "PARTY DARK MEAT ROAST C",
    "descripcion": "",
    "precioBase": 8999,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-chop-chop-skirt-steak-chop-chop-72",
    "categoriaId": "cat-real-chop-chop",
    "nombre": "SKIRT STEAK CHOP-CHOP",
    "descripcion": "",
    "precioBase": 8999,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-chop-chop-half-ck-half-steak-chop-73",
    "categoriaId": "cat-real-chop-chop",
    "nombre": "HALF CK HALF STEAK CHOP",
    "descripcion": "",
    "precioBase": 7249,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-chop-chop-dark-meat-roast-chop-ch-74",
    "categoriaId": "cat-real-chop-chop",
    "nombre": "DARK MEAT ROAST CHOP-CH",
    "descripcion": "",
    "precioBase": 8999,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-extras-extra-chopped-breast-1",
    "categoriaId": "cat-real-extras",
    "nombre": "EXTRA CHOPPED BREAST",
    "descripcion": "",
    "precioBase": 479,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-extras-extra-teriyaki-2",
    "categoriaId": "cat-real-extras",
    "nombre": "EXTRA TERIYAKI",
    "descripcion": "",
    "precioBase": 479,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-extras-extra-dark-meat-roast-3",
    "categoriaId": "cat-real-extras",
    "nombre": "EXTRA DARK MEAT ROAST",
    "descripcion": "",
    "precioBase": 479,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-extras-free-crispy-skin-4",
    "categoriaId": "cat-real-extras",
    "nombre": "FREE CRISPY SKIN",
    "descripcion": "",
    "precioBase": 0,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-extras-pita-bread-white-5",
    "categoriaId": "cat-real-extras",
    "nombre": "PITA BREAD WHITE",
    "descripcion": "",
    "precioBase": 69,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-extras-pita-bread-wheat-6",
    "categoriaId": "cat-real-extras",
    "nombre": "PITA BREAD WHEAT",
    "descripcion": "",
    "precioBase": 59,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-extras-tortilla-white-7",
    "categoriaId": "cat-real-extras",
    "nombre": "TORTILLA WHITE",
    "descripcion": "",
    "precioBase": 99,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-extras-tortilla-wheat-8",
    "categoriaId": "cat-real-extras",
    "nombre": "TORTILLA WHEAT",
    "descripcion": "",
    "precioBase": 109,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-extras-salad-with-chicken-9",
    "categoriaId": "cat-real-extras",
    "nombre": "SALAD WITH CHICKEN",
    "descripcion": "",
    "precioBase": 519,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-extras-extra-steak-10",
    "categoriaId": "cat-real-extras",
    "nombre": "EXTRA STEAK",
    "descripcion": "",
    "precioBase": 869,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-wrapitos-original-wrapito-1",
    "categoriaId": "cat-real-wrapitos",
    "nombre": "ORIGINAL WRAPITO",
    "descripcion": "",
    "precioBase": 999,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-wrapitos-deluxe-wrapito-2",
    "categoriaId": "cat-real-wrapitos",
    "nombre": "DELUXE WRAPITO",
    "descripcion": "",
    "precioBase": 1099,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-wrapitos-cuban-wrapito-3",
    "categoriaId": "cat-real-wrapitos",
    "nombre": "CUBAN WRAPITO",
    "descripcion": "",
    "precioBase": 1169,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-wrapitos-caesar-wrapito-4",
    "categoriaId": "cat-real-wrapitos",
    "nombre": "CAESAR WRAPITO",
    "descripcion": "",
    "precioBase": 1079,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-wrapitos-mexican-wrapito-5",
    "categoriaId": "cat-real-wrapitos",
    "nombre": "MEXICAN WRAPITO",
    "descripcion": "",
    "precioBase": 1349,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-wrapitos-bazooka-wrapito-6",
    "categoriaId": "cat-real-wrapitos",
    "nombre": "BAZOOKA WRAPITO",
    "descripcion": "",
    "precioBase": 1459,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-wrapitos-no-rice-wrapito-7",
    "categoriaId": "cat-real-wrapitos",
    "nombre": "NO-RICE WRAPITO",
    "descripcion": "",
    "precioBase": 1099,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-wrapitos-asian-wrapito-8",
    "categoriaId": "cat-real-wrapitos",
    "nombre": "ASIAN WRAPITO",
    "descripcion": "",
    "precioBase": 1169,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-wrapitos-vegetarian-wrapito-9",
    "categoriaId": "cat-real-wrapitos",
    "nombre": "VEGETARIAN WRAPITO",
    "descripcion": "",
    "precioBase": 1099,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-wrapitos-make-your-own-wrapito-10",
    "categoriaId": "cat-real-wrapitos",
    "nombre": "MAKE YOUR OWN WRAPITO",
    "descripcion": "",
    "precioBase": 999,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-wrapitos-teriyaki-wrapito-11",
    "categoriaId": "cat-real-wrapitos",
    "nombre": "TERIYAKI WRAPITO",
    "descripcion": "",
    "precioBase": 999,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-wrapitos-skirt-steak-wrapito-12",
    "categoriaId": "cat-real-wrapitos",
    "nombre": "SKIRT STEAK WRAPITO",
    "descripcion": "",
    "precioBase": 1899,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-wrapitos-half-chicken-half-steak-13",
    "categoriaId": "cat-real-wrapitos",
    "nombre": "HALF CHICKEN HALF STEAK",
    "descripcion": "",
    "precioBase": 1559,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-wrapitos-dark-meat-roast-wrapito-14",
    "categoriaId": "cat-real-wrapitos",
    "nombre": "DARK MEAT ROAST WRAPITO",
    "descripcion": "",
    "precioBase": 999,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-salads-garden-salad-1",
    "categoriaId": "cat-real-salads",
    "nombre": "GARDEN SALAD",
    "descripcion": "",
    "precioBase": 759,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-salads-chicken-garden-salad-2",
    "categoriaId": "cat-real-salads",
    "nombre": "CHICKEN GARDEN SALAD",
    "descripcion": "",
    "precioBase": 1189,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-salads-caesar-salad-3",
    "categoriaId": "cat-real-salads",
    "nombre": "CAESAR SALAD",
    "descripcion": "",
    "precioBase": 1039,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-salads-chicken-caesar-salad-4",
    "categoriaId": "cat-real-salads",
    "nombre": "CHICKEN CAESAR SALAD",
    "descripcion": "",
    "precioBase": 1559,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-salads-make-your-own-salad-5",
    "categoriaId": "cat-real-salads",
    "nombre": "MAKE YOUR OWN SALAD",
    "descripcion": "",
    "precioBase": 7799,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-salads-chicken-make-your-own-s-6",
    "categoriaId": "cat-real-salads",
    "nombre": "CHICKEN MAKE YOUR OWN S",
    "descripcion": "",
    "precioBase": 1559,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-salads-chicken-make-your-ow-7",
    "categoriaId": "cat-real-salads",
    "nombre": "CHICKEN MAKE YOUR OW",
    "descripcion": "",
    "precioBase": 7799,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-salads-xtra-chicken-8",
    "categoriaId": "cat-real-salads",
    "nombre": "XTRA CHICKEN",
    "descripcion": "",
    "precioBase": 479,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-salads-family-garden-salad-9",
    "categoriaId": "cat-real-salads",
    "nombre": "FAMILY GARDEN SALAD",
    "descripcion": "",
    "precioBase": 3819,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-salads-family-chicken-garden-s-10",
    "categoriaId": "cat-real-salads",
    "nombre": "FAMILY CHICKEN GARDEN S",
    "descripcion": "",
    "precioBase": 5979,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-salads-family-caesar-salad-11",
    "categoriaId": "cat-real-salads",
    "nombre": "FAMILY CAESAR SALAD",
    "descripcion": "",
    "precioBase": 5199,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-salads-family-chicken-caesar-s-12",
    "categoriaId": "cat-real-salads",
    "nombre": "FAMILY CHICKEN CAESAR S",
    "descripcion": "",
    "precioBase": 7799,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-salads-family-make-your-own-sa-13",
    "categoriaId": "cat-real-salads",
    "nombre": "FAMILY MAKE YOUR OWN SA",
    "descripcion": "",
    "precioBase": 5199,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-salads-family-chicken-make-you-14",
    "categoriaId": "cat-real-salads",
    "nombre": "FAMILY CHICKEN MAKE YOU",
    "descripcion": "",
    "precioBase": 7799,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-salads-party-garden-salad-15",
    "categoriaId": "cat-real-salads",
    "nombre": "PARTY GARDEN SALAD",
    "descripcion": "",
    "precioBase": 7519,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-salads-party-chicken-garden-sa-16",
    "categoriaId": "cat-real-salads",
    "nombre": "PARTY CHICKEN GARDEN SA",
    "descripcion": "",
    "precioBase": 11849,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-salads-party-caesar-salad-17",
    "categoriaId": "cat-real-salads",
    "nombre": "PARTY CAESAR SALAD",
    "descripcion": "",
    "precioBase": 10399,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-salads-party-chicken-caesar-sa-18",
    "categoriaId": "cat-real-salads",
    "nombre": "PARTY CHICKEN CAESAR SA",
    "descripcion": "",
    "precioBase": 15599,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-salads-party-make-your-own-sal-19",
    "categoriaId": "cat-real-salads",
    "nombre": "PARTY MAKE YOUR OWN SAL",
    "descripcion": "",
    "precioBase": 10399,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-salads-party-chicken-make-your-20",
    "categoriaId": "cat-real-salads",
    "nombre": "PARTY CHICKEN MAKE YOUR",
    "descripcion": "",
    "precioBase": 15599,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-salads-baja-mexican-salad-21",
    "categoriaId": "cat-real-salads",
    "nombre": "BAJA MEXICAN SALAD",
    "descripcion": "",
    "precioBase": 1039,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-salads-california-napa-salad-22",
    "categoriaId": "cat-real-salads",
    "nombre": "CALIFORNIA NAPA SALAD",
    "descripcion": "",
    "precioBase": 1399,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-salads-mykonos-greek-salad-23",
    "categoriaId": "cat-real-salads",
    "nombre": "MYKONOS GREEK SALAD",
    "descripcion": "",
    "precioBase": 1249,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-salads-asian-thai-salad-24",
    "categoriaId": "cat-real-salads",
    "nombre": "ASIAN THAI SALAD",
    "descripcion": "",
    "precioBase": 1249,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-salads-kale-power-blend-salad-25",
    "categoriaId": "cat-real-salads",
    "nombre": "KALE POWER BLEND SALAD",
    "descripcion": "",
    "precioBase": 999,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-salads-miami-garden-salad-26",
    "categoriaId": "cat-real-salads",
    "nombre": "MIAMI GARDEN SALAD",
    "descripcion": "",
    "precioBase": 899,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-salads-classic-caesar-salad-27",
    "categoriaId": "cat-real-salads",
    "nombre": "CLASSIC CAESAR SALAD",
    "descripcion": "",
    "precioBase": 1039,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-salads-kale-caesar-salad-28",
    "categoriaId": "cat-real-salads",
    "nombre": "KALE CAESAR SALAD",
    "descripcion": "",
    "precioBase": 999,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-salads-baja-mexican-wrap-29",
    "categoriaId": "cat-real-salads",
    "nombre": "Baja Mexican Wrap",
    "descripcion": "",
    "precioBase": 1039,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-salads-california-napa-wrap-30",
    "categoriaId": "cat-real-salads",
    "nombre": "California Napa Wrap",
    "descripcion": "",
    "precioBase": 999,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-salads-mykonos-greek-wrap-31",
    "categoriaId": "cat-real-salads",
    "nombre": "Mykonos Greek Wrap",
    "descripcion": "",
    "precioBase": 1249,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-salads-asian-thai-wrap-32",
    "categoriaId": "cat-real-salads",
    "nombre": "Asian Thai Wrap",
    "descripcion": "",
    "precioBase": 1249,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-salads-miami-garden-wrap-33",
    "categoriaId": "cat-real-salads",
    "nombre": "Miami Garden Wrap",
    "descripcion": "",
    "precioBase": 799,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-salads-classic-caesar-wrap-34",
    "categoriaId": "cat-real-salads",
    "nombre": "Classic Caesar Wrap",
    "descripcion": "",
    "precioBase": 1039,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-salads-make-your-own-salad-wra-35",
    "categoriaId": "cat-real-salads",
    "nombre": "Make Your Own Salad Wra",
    "descripcion": "",
    "precioBase": 1039,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-salads-kale-caesar-wrap-36",
    "categoriaId": "cat-real-salads",
    "nombre": "Kale Caesar Wrap",
    "descripcion": "",
    "precioBase": 899,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-boneless-sm-chopped-chicken-bre-1",
    "categoriaId": "cat-real-boneless",
    "nombre": "SM CHOPPED CHICKEN  BRE",
    "descripcion": "",
    "precioBase": 899,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-boneless-lg-chopped-chicken-bre-2",
    "categoriaId": "cat-real-boneless",
    "nombre": "LG CHOPPED CHICKEN  BRE",
    "descripcion": "",
    "precioBase": 1799,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-boneless-single-chicken-breast-f-3",
    "categoriaId": "cat-real-boneless",
    "nombre": "SINGLE CHICKEN BREAST F",
    "descripcion": "",
    "precioBase": 1119,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-boneless-double-chicken-breast-f-4",
    "categoriaId": "cat-real-boneless",
    "nombre": "DOUBLE CHICKEN BREAST F",
    "descripcion": "",
    "precioBase": 2079,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-boneless-sm-chopped-chicken-brea-5",
    "categoriaId": "cat-real-boneless",
    "nombre": "SM CHOPPED CHICKEN BREA",
    "descripcion": "",
    "precioBase": 1359,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-boneless-lg-chopped-chicken-brea-6",
    "categoriaId": "cat-real-boneless",
    "nombre": "LG CHOPPED CHICKEN BREA",
    "descripcion": "",
    "precioBase": 1769,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-boneless-chicken-breast-filet-pl-7",
    "categoriaId": "cat-real-boneless",
    "nombre": "CHICKEN BREAST FILET PL",
    "descripcion": "",
    "precioBase": 1769,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-boneless-double-chikn-breast-fam-8",
    "categoriaId": "cat-real-boneless",
    "nombre": "DOUBLE CHIKN BREAST FAM",
    "descripcion": "",
    "precioBase": 3349,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-boneless-sm-skirt-steak-platter-9",
    "categoriaId": "cat-real-boneless",
    "nombre": "SM SKIRT STEAK PLATTER",
    "descripcion": "",
    "precioBase": 2219,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-boneless-lg-skirt-steak-platter-10",
    "categoriaId": "cat-real-boneless",
    "nombre": "LG SKIRT STEAK PLATTER",
    "descripcion": "",
    "precioBase": 2529,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-boneless-sm-dark-meat-roast-chk-11",
    "categoriaId": "cat-real-boneless",
    "nombre": "SM DARK MEAT ROAST CHK",
    "descripcion": "",
    "precioBase": 1359,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-boneless-lg-dark-meat-roast-chk-12",
    "categoriaId": "cat-real-boneless",
    "nombre": "LG DARK MEAT ROAST CHK",
    "descripcion": "",
    "precioBase": 1769,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-boneless-sm-dark-meat-chicken-pl-13",
    "categoriaId": "cat-real-boneless",
    "nombre": "SM DARK MEAT CHICKEN PL",
    "descripcion": "",
    "precioBase": 1359,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-boneless-lg-dark-meat-roast-plat-14",
    "categoriaId": "cat-real-boneless",
    "nombre": "LG DARK MEAT ROAST PLAT",
    "descripcion": "",
    "precioBase": 1769,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-sides-sm-fresh-guacamole-1",
    "categoriaId": "cat-real-sides",
    "nombre": "SM FRESH GUACAMOLE",
    "descripcion": "",
    "precioBase": 919,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-sides-sm-baked-sweet-plant-2",
    "categoriaId": "cat-real-sides",
    "nombre": "SM BAKED SWEET PLANT",
    "descripcion": "",
    "precioBase": 339,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-sides-sm-black-beans-3",
    "categoriaId": "cat-real-sides",
    "nombre": "SM BLACK BEANS",
    "descripcion": "",
    "precioBase": 339,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-sides-sm-corn-kernels-4",
    "categoriaId": "cat-real-sides",
    "nombre": "SM CORN KERNELS",
    "descripcion": "",
    "precioBase": 359,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-sides-sm-corn-mix-salad-5",
    "categoriaId": "cat-real-sides",
    "nombre": "SM CORN MIX SALAD",
    "descripcion": "",
    "precioBase": 359,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-sides-sm-cole-slaw-6",
    "categoriaId": "cat-real-sides",
    "nombre": "SM COLE SLAW",
    "descripcion": "",
    "precioBase": 339,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-sides-sm-broccoli-7",
    "categoriaId": "cat-real-sides",
    "nombre": "SM BROCCOLI",
    "descripcion": "",
    "precioBase": 339,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-sides-sm-balsamic-tomatoes-8",
    "categoriaId": "cat-real-sides",
    "nombre": "SM BALSAMIC TOMATOES",
    "descripcion": "",
    "precioBase": 359,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-sides-sm-mashed-potatoes-9",
    "categoriaId": "cat-real-sides",
    "nombre": "SM MASHED POTATOES",
    "descripcion": "",
    "precioBase": 359,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-sides-sm-yellow-rice-10",
    "categoriaId": "cat-real-sides",
    "nombre": "SM YELLOW RICE",
    "descripcion": "",
    "precioBase": 299,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-sides-sm-brown-rice-11",
    "categoriaId": "cat-real-sides",
    "nombre": "SM BROWN RICE",
    "descripcion": "",
    "precioBase": 339,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-sides-sm-cilantro-white-rice-12",
    "categoriaId": "cat-real-sides",
    "nombre": "SM CILANTRO WHITE RICE",
    "descripcion": "",
    "precioBase": 339,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-sides-half-baked-sweet-potato-13",
    "categoriaId": "cat-real-sides",
    "nombre": "HALF BAKED SWEET POTATO",
    "descripcion": "",
    "precioBase": 379,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-sides-8-oz-half-pint-of-sau-14",
    "categoriaId": "cat-real-sides",
    "nombre": "8 OZ - HALF PINT OF SAU",
    "descripcion": "",
    "precioBase": 399,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-sides-lg-fresh-guacamole-15",
    "categoriaId": "cat-real-sides",
    "nombre": "LG FRESH GUACAMOLE",
    "descripcion": "",
    "precioBase": 1769,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-sides-lg-baked-sweet-plantain-16",
    "categoriaId": "cat-real-sides",
    "nombre": "LG BAKED SWEET PLANTAIN",
    "descripcion": "",
    "precioBase": 659,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-sides-lg-black-beans-17",
    "categoriaId": "cat-real-sides",
    "nombre": "LG BLACK BEANS",
    "descripcion": "",
    "precioBase": 659,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-sides-lg-corn-kernels-18",
    "categoriaId": "cat-real-sides",
    "nombre": "LG CORN KERNELS",
    "descripcion": "",
    "precioBase": 689,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-sides-lg-corn-mix-salad-19",
    "categoriaId": "cat-real-sides",
    "nombre": "LG CORN MIX SALAD",
    "descripcion": "",
    "precioBase": 689,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-sides-lg-coleslaw-20",
    "categoriaId": "cat-real-sides",
    "nombre": "LG COLESLAW",
    "descripcion": "",
    "precioBase": 659,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-sides-lg-broccoli-21",
    "categoriaId": "cat-real-sides",
    "nombre": "LG BROCCOLI",
    "descripcion": "",
    "precioBase": 659,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-sides-lg-balsamic-tomatoes-22",
    "categoriaId": "cat-real-sides",
    "nombre": "LG BALSAMIC TOMATOES",
    "descripcion": "",
    "precioBase": 689,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-sides-lg-mashed-potatoes-23",
    "categoriaId": "cat-real-sides",
    "nombre": "LG MASHED POTATOES",
    "descripcion": "",
    "precioBase": 689,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-sides-lg-yellow-rice-24",
    "categoriaId": "cat-real-sides",
    "nombre": "LG YELLOW RICE",
    "descripcion": "",
    "precioBase": 599,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-sides-lg-brown-rice-25",
    "categoriaId": "cat-real-sides",
    "nombre": "LG BROWN RICE",
    "descripcion": "",
    "precioBase": 659,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-sides-lg-cilantro-white-rice-26",
    "categoriaId": "cat-real-sides",
    "nombre": "LG CILANTRO WHITE RICE",
    "descripcion": "",
    "precioBase": 659,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-sides-16-oz-full-pint-of-sa-27",
    "categoriaId": "cat-real-sides",
    "nombre": "16 OZ - FULL PINT OF SA",
    "descripcion": "",
    "precioBase": 799,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-sides-abuela-s-classic-flan-28",
    "categoriaId": "cat-real-sides",
    "nombre": "ABUELA'S CLASSIC FLAN",
    "descripcion": "",
    "precioBase": 299,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-sides-side-of-crispy-skin-29",
    "categoriaId": "cat-real-sides",
    "nombre": "SIDE OF CRISPY SKIN",
    "descripcion": "",
    "precioBase": 129,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-sides-side-of-skin-30",
    "categoriaId": "cat-real-sides",
    "nombre": "SIDE OF SKIN",
    "descripcion": "",
    "precioBase": 129,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-sides-sm-teriyaki-chicken-8-31",
    "categoriaId": "cat-real-sides",
    "nombre": "SM TERIYAKI CHICKEN  8",
    "descripcion": "",
    "precioBase": 899,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-sides-whole-baked-sweet-potat-32",
    "categoriaId": "cat-real-sides",
    "nombre": "WHOLE BAKED SWEET POTAT",
    "descripcion": "",
    "precioBase": 629,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-sides-lg-teriyaki-chicken-16-33",
    "categoriaId": "cat-real-sides",
    "nombre": "LG TERIYAKI CHICKEN 16-",
    "descripcion": "",
    "precioBase": 1799,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-sides-lg-dark-meat-roast-chic-34",
    "categoriaId": "cat-real-sides",
    "nombre": "LG DARK MEAT ROAST CHIC",
    "descripcion": "",
    "precioBase": 1799,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-sides-sm-baked-sweet-plantain-35",
    "categoriaId": "cat-real-sides",
    "nombre": "SM BAKED SWEET PLANTAIN",
    "descripcion": "",
    "precioBase": 339,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-sides-sm-chopped-sweet-planta-36",
    "categoriaId": "cat-real-sides",
    "nombre": "SM CHOPPED SWEET PLANTA",
    "descripcion": "",
    "precioBase": 339,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-sides-sm-coleslaw-37",
    "categoriaId": "cat-real-sides",
    "nombre": "SM COLESLAW",
    "descripcion": "",
    "precioBase": 339,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-sides-sm-mixed-greens-38",
    "categoriaId": "cat-real-sides",
    "nombre": "SM MIXED GREENS",
    "descripcion": "",
    "precioBase": 319,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-sides-sm-shredded-lettuce-39",
    "categoriaId": "cat-real-sides",
    "nombre": "SM SHREDDED LETTUCE",
    "descripcion": "",
    "precioBase": 339,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-sides-sm-baked-sweet-potato-40",
    "categoriaId": "cat-real-sides",
    "nombre": "SM BAKED SWEET POTATO",
    "descripcion": "",
    "precioBase": 379,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-sides-sm-1-2-pint-of-sauce-8o-41",
    "categoriaId": "cat-real-sides",
    "nombre": "SM 1/2 PINT OF SAUCE 8O",
    "descripcion": "",
    "precioBase": 319,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-sides-lg-chopped-sweet-planta-42",
    "categoriaId": "cat-real-sides",
    "nombre": "LG CHOPPED SWEET PLANTA",
    "descripcion": "",
    "precioBase": 659,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-sides-lg-cole-slaw-43",
    "categoriaId": "cat-real-sides",
    "nombre": "LG COLE SLAW",
    "descripcion": "",
    "precioBase": 659,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-sides-lg-mixed-greens-44",
    "categoriaId": "cat-real-sides",
    "nombre": "LG MIXED GREENS",
    "descripcion": "",
    "precioBase": 599,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-sides-lg-shredded-lettuce-45",
    "categoriaId": "cat-real-sides",
    "nombre": "LG SHREDDED LETTUCE",
    "descripcion": "",
    "precioBase": 729,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-sides-lg-baked-sweet-potato-46",
    "categoriaId": "cat-real-sides",
    "nombre": "LG BAKED SWEET POTATO",
    "descripcion": "",
    "precioBase": 629,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-sides-lg-pint-of-sauce-16oz-47",
    "categoriaId": "cat-real-sides",
    "nombre": "LG PINT OF SAUCE 16OZ",
    "descripcion": "",
    "precioBase": 599,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-sides-sm-chopped-teriyaki-thi-48",
    "categoriaId": "cat-real-sides",
    "nombre": "SM CHOPPED TERIYAKI THI",
    "descripcion": "",
    "precioBase": 839,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-sides-lg-chopped-teriyaki-thi-49",
    "categoriaId": "cat-real-sides",
    "nombre": "LG CHOPPED TERIYAKI THI",
    "descripcion": "",
    "precioBase": 1699,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-sides-brownie-50",
    "categoriaId": "cat-real-sides",
    "nombre": "BROWNIE",
    "descripcion": "",
    "precioBase": 399,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-sides-flan-caramel-51",
    "categoriaId": "cat-real-sides",
    "nombre": "FLAN CARAMEL",
    "descripcion": "",
    "precioBase": 329,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-sides-sm-dark-meat-roast-chic-52",
    "categoriaId": "cat-real-sides",
    "nombre": "SM DARK MEAT ROAST CHIC",
    "descripcion": "",
    "precioBase": 899,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-sides-sm-dark-meat-roast-8oz-53",
    "categoriaId": "cat-real-sides",
    "nombre": "SM  DARK MEAT ROAST 8OZ",
    "descripcion": "",
    "precioBase": 899,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-sides-lg-dark-meat-roast-16oz-54",
    "categoriaId": "cat-real-sides",
    "nombre": "LG DARK MEAT ROAST 16OZ",
    "descripcion": "",
    "precioBase": 1799,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-sides-sm-skirt-steak-8oz-55",
    "categoriaId": "cat-real-sides",
    "nombre": "SM SKIRT STEAK 8OZ",
    "descripcion": "",
    "precioBase": 1800,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-sides-lg-skirt-steak-16oz-56",
    "categoriaId": "cat-real-sides",
    "nombre": "LG SKIRT STEAK 16OZ",
    "descripcion": "",
    "precioBase": 3600,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-dessert-heavenly-brownie-1",
    "categoriaId": "cat-real-dessert",
    "nombre": "HEAVENLY BROWNIE",
    "descripcion": "",
    "precioBase": 399,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-dessert-half-heavenly-brownie-2",
    "categoriaId": "cat-real-dessert",
    "nombre": "HALF HEAVENLY BROWNIE",
    "descripcion": "",
    "precioBase": 199,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-kids-original-mini-chop-1",
    "categoriaId": "cat-real-kids",
    "nombre": "ORIGINAL MINI-CHOP",
    "descripcion": "",
    "precioBase": 789,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-kids-teriyaki-mini-chop-2",
    "categoriaId": "cat-real-kids",
    "nombre": "TERIYAKI MINI-CHOP",
    "descripcion": "",
    "precioBase": 789,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-kids-plain-cheesadilla-kids-3",
    "categoriaId": "cat-real-kids",
    "nombre": "PLAIN CHEESADILLA KIDS",
    "descripcion": "",
    "precioBase": 789,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-kids-chicken-cheesadilla-kid-4",
    "categoriaId": "cat-real-kids",
    "nombre": "CHICKEN CHEESADILLA KID",
    "descripcion": "",
    "precioBase": 1129,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-kids-dark-meat-roast-mini-ch-5",
    "categoriaId": "cat-real-kids",
    "nombre": "DARK MEAT ROAST MINI-CH",
    "descripcion": "",
    "precioBase": 789,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-beverages-bottled-water-1",
    "categoriaId": "cat-real-beverages",
    "nombre": "BOTTLED WATER",
    "descripcion": "",
    "precioBase": 199,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-beverages-diet-pepsi-soda-2",
    "categoriaId": "cat-real-beverages",
    "nombre": "DIET PEPSI SODA",
    "descripcion": "",
    "precioBase": 299,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-beverages-diet-pepsi-can-3",
    "categoriaId": "cat-real-beverages",
    "nombre": "DIET PEPSI CAN",
    "descripcion": "",
    "precioBase": 299,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-beverages-pepsi-soda-4",
    "categoriaId": "cat-real-beverages",
    "nombre": "PEPSI SODA",
    "descripcion": "",
    "precioBase": 299,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-beverages-pepsi-can-5",
    "categoriaId": "cat-real-beverages",
    "nombre": "PEPSI CAN",
    "descripcion": "",
    "precioBase": 299,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-beverages-sierra-mist-soda-6",
    "categoriaId": "cat-real-beverages",
    "nombre": "SIERRA MIST SODA",
    "descripcion": "",
    "precioBase": 299,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-beverages-sierra-mist-can-7",
    "categoriaId": "cat-real-beverages",
    "nombre": "SIERRA MIST CAN",
    "descripcion": "",
    "precioBase": 269,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-beverages-raspberry-tea-soda-8",
    "categoriaId": "cat-real-beverages",
    "nombre": "RASPBERRY TEA SODA",
    "descripcion": "",
    "precioBase": 299,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-beverages-lemonade-soda-9",
    "categoriaId": "cat-real-beverages",
    "nombre": "LEMONADE SODA",
    "descripcion": "",
    "precioBase": 299,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-beverages-diet-lipton-tea-bottle-10",
    "categoriaId": "cat-real-beverages",
    "nombre": "DIET LIPTON TEA BOTTLE",
    "descripcion": "",
    "precioBase": 329,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-beverages-lipton-tea-bottle-11",
    "categoriaId": "cat-real-beverages",
    "nombre": "LIPTON TEA BOTTLE",
    "descripcion": "",
    "precioBase": 329,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-beverages-gatorade-orange-12",
    "categoriaId": "cat-real-beverages",
    "nombre": "GATORADE ORANGE",
    "descripcion": "",
    "precioBase": 369,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-beverages-gatorade-lemon-lime-13",
    "categoriaId": "cat-real-beverages",
    "nombre": "GATORADE LEMON LIME",
    "descripcion": "",
    "precioBase": 369,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-beverages-gatorade-zero-frosty-bl-14",
    "categoriaId": "cat-real-beverages",
    "nombre": "GATORADE ZERO-FROSTY BL",
    "descripcion": "",
    "precioBase": 369,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-beverages-san-pellegrino-water-15",
    "categoriaId": "cat-real-beverages",
    "nombre": "SAN PELLEGRINO WATER",
    "descripcion": "",
    "precioBase": 369,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-beverages-san-pellegrino-aranciat-16",
    "categoriaId": "cat-real-beverages",
    "nombre": "SAN PELLEGRINO ARANCIAT",
    "descripcion": "",
    "precioBase": 369,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-beverages-capri-fruit-punch-17",
    "categoriaId": "cat-real-beverages",
    "nombre": "CAPRI FRUIT PUNCH",
    "descripcion": "",
    "precioBase": 179,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-beverages-pineapple-cream-soda-18",
    "categoriaId": "cat-real-beverages",
    "nombre": "PINEAPPLE CREAM SODA",
    "descripcion": "",
    "precioBase": 299,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-beverages-brisk-iced-tea-19",
    "categoriaId": "cat-real-beverages",
    "nombre": "BRISK ICED TEA",
    "descripcion": "",
    "precioBase": 299,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-beverages-san-pellegrino-limonata-20",
    "categoriaId": "cat-real-beverages",
    "nombre": "SAN PELLEGRINO LIMONATA",
    "descripcion": "",
    "precioBase": 369,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-beverages-gatorade-lemon-lime-can-21",
    "categoriaId": "cat-real-beverages",
    "nombre": "GATORADE LEMON LIME^CAN",
    "descripcion": "",
    "precioBase": 369,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-beverages-gatorade-orange-can-22",
    "categoriaId": "cat-real-beverages",
    "nombre": "GATORADE ORANGE CAN",
    "descripcion": "",
    "precioBase": 369,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-beverages-diet-lemonade-can-23",
    "categoriaId": "cat-real-beverages",
    "nombre": "DIET LEMONADE CAN",
    "descripcion": "",
    "precioBase": 259,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-beverages-lipton-diet-green-tea-c-24",
    "categoriaId": "cat-real-beverages",
    "nombre": "LIPTON DIET GREEN TEA C",
    "descripcion": "",
    "precioBase": 329,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-beverages-lipton-lemon-iced-tea-25",
    "categoriaId": "cat-real-beverages",
    "nombre": "LIPTON LEMON ICED TEA",
    "descripcion": "",
    "precioBase": 329,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-beverages-starry-lemon-lime-26",
    "categoriaId": "cat-real-beverages",
    "nombre": "STARRY LEMON-LIME",
    "descripcion": "",
    "precioBase": 299,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-beverages-proud-source-water-27",
    "categoriaId": "cat-real-beverages",
    "nombre": "PROUD SOURCE WATER",
    "descripcion": "",
    "precioBase": 319,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-beverages-arizona-green-tea-28",
    "categoriaId": "cat-real-beverages",
    "nombre": "ARIZONA GREEN TEA",
    "descripcion": "",
    "precioBase": 369,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-dressings-pink-vinaigrette-1",
    "categoriaId": "cat-real-dressings",
    "nombre": "PINK VINAIGRETTE",
    "descripcion": "",
    "precioBase": 179,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-dressings-balsamic-vinaigrette-2",
    "categoriaId": "cat-real-dressings",
    "nombre": "BALSAMIC VINAIGRETTE",
    "descripcion": "",
    "precioBase": 179,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-dressings-caesar-dressing-3",
    "categoriaId": "cat-real-dressings",
    "nombre": "CAESAR DRESSING",
    "descripcion": "",
    "precioBase": 179,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-dressings-balsamic-vinegar-4",
    "categoriaId": "cat-real-dressings",
    "nombre": "BALSAMIC VINEGAR",
    "descripcion": "",
    "precioBase": 179,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-dressings-olive-oil-5",
    "categoriaId": "cat-real-dressings",
    "nombre": "OLIVE OIL",
    "descripcion": "",
    "precioBase": 179,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-dressings-red-wine-vinegar-6",
    "categoriaId": "cat-real-dressings",
    "nombre": "RED WINE VINEGAR",
    "descripcion": "",
    "precioBase": 169,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-dressings-heavenly-ranch-7",
    "categoriaId": "cat-real-dressings",
    "nombre": "HEAVENLY RANCH",
    "descripcion": "",
    "precioBase": 169,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-dressings-heavenly-ranch-dressing-8",
    "categoriaId": "cat-real-dressings",
    "nombre": "HEAVENLY RANCH DRESSING",
    "descripcion": "",
    "precioBase": 169,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-sauces-original-mustard-n-curr-1",
    "categoriaId": "cat-real-sauces",
    "nombre": "ORIGINAL MUSTARD'N CURR",
    "descripcion": "",
    "precioBase": 99,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-sauces-spicy-mustard-n-curry-2",
    "categoriaId": "cat-real-sauces",
    "nombre": "SPICY MUSTARD'N CURRY",
    "descripcion": "",
    "precioBase": 99,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-sauces-garlic-cilantro-3",
    "categoriaId": "cat-real-sauces",
    "nombre": "GARLIC CILANTRO",
    "descripcion": "",
    "precioBase": 99,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-sauces-chipotle-lime-4",
    "categoriaId": "cat-real-sauces",
    "nombre": "CHIPOTLE LIME",
    "descripcion": "",
    "precioBase": 99,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-sauces-bbq-5",
    "categoriaId": "cat-real-sauces",
    "nombre": "BBQ",
    "descripcion": "",
    "precioBase": 99,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-sauces-fresh-salsa-6",
    "categoriaId": "cat-real-sauces",
    "nombre": "FRESH SALSA",
    "descripcion": "",
    "precioBase": 99,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-sauces-spicy-salsa-verde-7",
    "categoriaId": "cat-real-sauces",
    "nombre": "SPICY SALSA VERDE",
    "descripcion": "",
    "precioBase": 99,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-sauces-sweet-sour-8",
    "categoriaId": "cat-real-sauces",
    "nombre": "SWEET & SOUR",
    "descripcion": "",
    "precioBase": 99,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-sauces-hot-n-spicy-9",
    "categoriaId": "cat-real-sauces",
    "nombre": "HOT'N SPICY",
    "descripcion": "",
    "precioBase": 99,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-sauces-caesars-creamy-sauce-10",
    "categoriaId": "cat-real-sauces",
    "nombre": "CAESARS CREAMY SAUCE",
    "descripcion": "",
    "precioBase": 99,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-sauces-cholula-hot-sauce-packe-11",
    "categoriaId": "cat-real-sauces",
    "nombre": "CHOLULA HOT SAUCE PACKE",
    "descripcion": "",
    "precioBase": 99,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-sauces-original-mustardn-curry-12",
    "categoriaId": "cat-real-sauces",
    "nombre": "ORIGINAL MUSTARDN CURRY",
    "descripcion": "",
    "precioBase": 99,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-sauces-spicy-mustardn-curry-13",
    "categoriaId": "cat-real-sauces",
    "nombre": "SPICY MUSTARDN CURRY",
    "descripcion": "",
    "precioBase": 99,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-sauces-sweet-n-sour-14",
    "categoriaId": "cat-real-sauces",
    "nombre": "SWEET'N SOUR",
    "descripcion": "",
    "precioBase": 99,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-sauces-hot-n-spicy-15",
    "categoriaId": "cat-real-sauces",
    "nombre": "HOT N SPICY",
    "descripcion": "",
    "precioBase": 99,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-sauces-sweetn-sour-16",
    "categoriaId": "cat-real-sauces",
    "nombre": "SWEETN SOUR",
    "descripcion": "",
    "precioBase": 399,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-sauces-hotn-spicy-17",
    "categoriaId": "cat-real-sauces",
    "nombre": "HOTN SPICY",
    "descripcion": "",
    "precioBase": 799,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-sauces-spicy-garlic-cilantro-18",
    "categoriaId": "cat-real-sauces",
    "nombre": "SPICY GARLIC CILANTRO",
    "descripcion": "",
    "precioBase": 99,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-sauces-classic-caesar-dressing-19",
    "categoriaId": "cat-real-sauces",
    "nombre": "CLASSIC CAESAR DRESSING",
    "descripcion": "",
    "precioBase": 169,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-sauces-sesame-thai-vinaigrette-20",
    "categoriaId": "cat-real-sauces",
    "nombre": "SESAME THAI VINAIGRETTE",
    "descripcion": "",
    "precioBase": 169,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-sauces-apple-cider-vinaigrette-21",
    "categoriaId": "cat-real-sauces",
    "nombre": "APPLE CIDER VINAIGRETTE",
    "descripcion": "",
    "precioBase": 179,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-sauces-lo-cal-skinny-rose-vina-22",
    "categoriaId": "cat-real-sauces",
    "nombre": "LO-CAL SKINNY ROSE VINA",
    "descripcion": "",
    "precioBase": 169,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-sauces-chipotle-lime-sauce-23",
    "categoriaId": "cat-real-sauces",
    "nombre": "CHIPOTLE LIME SAUCE",
    "descripcion": "",
    "precioBase": 169,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-sauces-spicy-chipotle-vinaigre-24",
    "categoriaId": "cat-real-sauces",
    "nombre": "SPICY CHIPOTLE VINAIGRE",
    "descripcion": "",
    "precioBase": 179,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-sauces-cilantro-garlic-vinaigr-25",
    "categoriaId": "cat-real-sauces",
    "nombre": "CILANTRO GARLIC VINAIGR",
    "descripcion": "",
    "precioBase": 179,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-sauces-mustard-n-curry-vinaigr-26",
    "categoriaId": "cat-real-sauces",
    "nombre": "MUSTARD'N CURRY VINAIGR",
    "descripcion": "",
    "precioBase": 179,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-sauces-ck-pink-vinaigrette-27",
    "categoriaId": "cat-real-sauces",
    "nombre": "CK PINK VINAIGRETTE",
    "descripcion": "",
    "precioBase": 179,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-sauces-cesame-ginger-vinaigret-28",
    "categoriaId": "cat-real-sauces",
    "nombre": "CESAME GINGER VINAIGRET",
    "descripcion": "",
    "precioBase": 179,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-toppings-fresh-guacamole-1",
    "categoriaId": "cat-real-toppings",
    "nombre": "FRESH GUACAMOLE",
    "descripcion": "",
    "precioBase": 209,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-toppings-avocado-half-2",
    "categoriaId": "cat-real-toppings",
    "nombre": "AVOCADO (HALF)",
    "descripcion": "",
    "precioBase": 299,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-toppings-cheddar-cheese-3",
    "categoriaId": "cat-real-toppings",
    "nombre": "CHEDDAR CHEESE",
    "descripcion": "",
    "precioBase": 189,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-toppings-sour-cream-4",
    "categoriaId": "cat-real-toppings",
    "nombre": "SOUR CREAM",
    "descripcion": "",
    "precioBase": 149,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-toppings-diced-tomatoes-5",
    "categoriaId": "cat-real-toppings",
    "nombre": "DICED TOMATOES",
    "descripcion": "",
    "precioBase": 69,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-toppings-shredded-lettuce-6",
    "categoriaId": "cat-real-toppings",
    "nombre": "SHREDDED LETTUCE",
    "descripcion": "",
    "precioBase": 69,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-toppings-corn-mix-7",
    "categoriaId": "cat-real-toppings",
    "nombre": "CORN MIX",
    "descripcion": "",
    "precioBase": 159,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-toppings-corn-kernels-8",
    "categoriaId": "cat-real-toppings",
    "nombre": "CORN KERNELS",
    "descripcion": "",
    "precioBase": 129,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-toppings-black-beans-9",
    "categoriaId": "cat-real-toppings",
    "nombre": "BLACK BEANS",
    "descripcion": "",
    "precioBase": 69,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-toppings-scallions-10",
    "categoriaId": "cat-real-toppings",
    "nombre": "SCALLIONS",
    "descripcion": "",
    "precioBase": 69,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-toppings-red-onions-11",
    "categoriaId": "cat-real-toppings",
    "nombre": "RED ONIONS",
    "descripcion": "",
    "precioBase": 69,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-toppings-red-peppers-12",
    "categoriaId": "cat-real-toppings",
    "nombre": "RED PEPPERS",
    "descripcion": "",
    "precioBase": 69,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-toppings-peppers-13",
    "categoriaId": "cat-real-toppings",
    "nombre": "PEPPERS",
    "descripcion": "",
    "precioBase": 59,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-toppings-broccoli-14",
    "categoriaId": "cat-real-toppings",
    "nombre": "BROCCOLI",
    "descripcion": "",
    "precioBase": 159,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-toppings-cucumbers-15",
    "categoriaId": "cat-real-toppings",
    "nombre": "CUCUMBERS",
    "descripcion": "",
    "precioBase": 69,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-toppings-carrots-16",
    "categoriaId": "cat-real-toppings",
    "nombre": "CARROTS",
    "descripcion": "",
    "precioBase": 69,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-toppings-balsamic-tomatoes-17",
    "categoriaId": "cat-real-toppings",
    "nombre": "BALSAMIC TOMATOES",
    "descripcion": "",
    "precioBase": 159,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-toppings-banana-peppers-18",
    "categoriaId": "cat-real-toppings",
    "nombre": "BANANA PEPPERS",
    "descripcion": "",
    "precioBase": 69,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-toppings-jalapenos-19",
    "categoriaId": "cat-real-toppings",
    "nombre": "JALAPENOS",
    "descripcion": "",
    "precioBase": 69,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-toppings-greek-olives-20",
    "categoriaId": "cat-real-toppings",
    "nombre": "GREEK OLIVES",
    "descripcion": "",
    "precioBase": 69,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-toppings-chopped-sweet-plantains-21",
    "categoriaId": "cat-real-toppings",
    "nombre": "CHOPPED SWEET PLANTAINS",
    "descripcion": "",
    "precioBase": 189,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-toppings-whole-sweet-plantains-22",
    "categoriaId": "cat-real-toppings",
    "nombre": "WHOLE SWEET PLANTAINS",
    "descripcion": "",
    "precioBase": 189,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-toppings-romaine-lettuce-23",
    "categoriaId": "cat-real-toppings",
    "nombre": "ROMAINE LETTUCE",
    "descripcion": "",
    "precioBase": 99,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-toppings-mixed-greens-24",
    "categoriaId": "cat-real-toppings",
    "nombre": "MIXED GREENS",
    "descripcion": "",
    "precioBase": 59,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-toppings-coleslaw-25",
    "categoriaId": "cat-real-toppings",
    "nombre": "COLESLAW",
    "descripcion": "",
    "precioBase": 159,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-toppings-parmesan-cheese-26",
    "categoriaId": "cat-real-toppings",
    "nombre": "PARMESAN CHEESE",
    "descripcion": "",
    "precioBase": 169,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-toppings-sesame-seeds-27",
    "categoriaId": "cat-real-toppings",
    "nombre": "SESAME SEEDS",
    "descripcion": "",
    "precioBase": 69,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-toppings-croutons-28",
    "categoriaId": "cat-real-toppings",
    "nombre": "CROUTONS",
    "descripcion": "",
    "precioBase": 69,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-toppings-yellow-rice-scoop-29",
    "categoriaId": "cat-real-toppings",
    "nombre": "YELLOW RICE SCOOP",
    "descripcion": "",
    "precioBase": 69,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-toppings-brown-rice-plain-30",
    "categoriaId": "cat-real-toppings",
    "nombre": "BROWN RICE PLAIN",
    "descripcion": "",
    "precioBase": 99,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-toppings-cilantro-white-rice-31",
    "categoriaId": "cat-real-toppings",
    "nombre": "CILANTRO WHITE RICE",
    "descripcion": "",
    "precioBase": 99,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-toppings-guacamole-32",
    "categoriaId": "cat-real-toppings",
    "nombre": "GUACAMOLE",
    "descripcion": "",
    "precioBase": 209,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-toppings-half-avocado-33",
    "categoriaId": "cat-real-toppings",
    "nombre": "HALF AVOCADO",
    "descripcion": "",
    "precioBase": 299,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-toppings-lettuce-shredded-34",
    "categoriaId": "cat-real-toppings",
    "nombre": "LETTUCE SHREDDED",
    "descripcion": "",
    "precioBase": 69,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-toppings-chopped-plantains-35",
    "categoriaId": "cat-real-toppings",
    "nombre": "CHOPPED PLANTAINS",
    "descripcion": "",
    "precioBase": 189,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-toppings-sweet-plantains-whole-36",
    "categoriaId": "cat-real-toppings",
    "nombre": "SWEET PLANTAINS WHOLE",
    "descripcion": "",
    "precioBase": 189,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-toppings-grilled-chicken-37",
    "categoriaId": "cat-real-toppings",
    "nombre": "GRILLED CHICKEN",
    "descripcion": "",
    "precioBase": 479,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-toppings-avocado-38",
    "categoriaId": "cat-real-toppings",
    "nombre": "AVOCADO",
    "descripcion": "",
    "precioBase": 1399,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-toppings-romain-kale-mix-39",
    "categoriaId": "cat-real-toppings",
    "nombre": "ROMAIN & KALE MIX",
    "descripcion": "",
    "precioBase": 99,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-toppings-healthy-slaw-mix-40",
    "categoriaId": "cat-real-toppings",
    "nombre": "HEALTHY SLAW MIX",
    "descripcion": "",
    "precioBase": 79,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-toppings-cilantro-41",
    "categoriaId": "cat-real-toppings",
    "nombre": "CILANTRO",
    "descripcion": "",
    "precioBase": 89,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-toppings-tortilla-chips-42",
    "categoriaId": "cat-real-toppings",
    "nombre": "TORTILLA CHIPS",
    "descripcion": "",
    "precioBase": 69,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-toppings-iceberg-lettuce-43",
    "categoriaId": "cat-real-toppings",
    "nombre": "ICEBERG LETTUCE",
    "descripcion": "",
    "precioBase": 59,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-toppings-grape-tomatoes-44",
    "categoriaId": "cat-real-toppings",
    "nombre": "GRAPE TOMATOES",
    "descripcion": "",
    "precioBase": 89,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-toppings-whole-avocado-45",
    "categoriaId": "cat-real-toppings",
    "nombre": "WHOLE AVOCADO",
    "descripcion": "",
    "precioBase": 599,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-toppings-sunflower-seeds-46",
    "categoriaId": "cat-real-toppings",
    "nombre": "SUNFLOWER SEEDS",
    "descripcion": "",
    "precioBase": 99,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-toppings-romaine-47",
    "categoriaId": "cat-real-toppings",
    "nombre": "ROMAINE",
    "descripcion": "",
    "precioBase": 89,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-toppings-feta-cheese-48",
    "categoriaId": "cat-real-toppings",
    "nombre": "FETA CHEESE",
    "descripcion": "",
    "precioBase": 189,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-toppings-mandarin-wedges-49",
    "categoriaId": "cat-real-toppings",
    "nombre": "MANDARIN WEDGES",
    "descripcion": "",
    "precioBase": 69,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-toppings-almonds-50",
    "categoriaId": "cat-real-toppings",
    "nombre": "ALMONDS",
    "descripcion": "",
    "precioBase": 169,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-toppings-crispy-asian-chips-51",
    "categoriaId": "cat-real-toppings",
    "nombre": "CRISPY ASIAN CHIPS",
    "descripcion": "",
    "precioBase": 89,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-toppings-kale-52",
    "categoriaId": "cat-real-toppings",
    "nombre": "KALE",
    "descripcion": "",
    "precioBase": 79,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-toppings-cranberries-53",
    "categoriaId": "cat-real-toppings",
    "nombre": "CRANBERRIES",
    "descripcion": "",
    "precioBase": 79,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-toppings-shaved-parmesan-cheese-54",
    "categoriaId": "cat-real-toppings",
    "nombre": "SHAVED PARMESAN CHEESE",
    "descripcion": "",
    "precioBase": 189,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-toppings-pumpkin-seeds-55",
    "categoriaId": "cat-real-toppings",
    "nombre": "PUMPKIN SEEDS",
    "descripcion": "",
    "precioBase": 119,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-toppings-cauliflower-56",
    "categoriaId": "cat-real-toppings",
    "nombre": "CAULIFLOWER",
    "descripcion": "",
    "precioBase": 59,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-toppings-healthy-lemon-slaw-57",
    "categoriaId": "cat-real-toppings",
    "nombre": "HEALTHY LEMON SLAW",
    "descripcion": "",
    "precioBase": 79,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-toppings-half-pita-bread-58",
    "categoriaId": "cat-real-toppings",
    "nombre": "HALF PITA BREAD",
    "descripcion": "",
    "precioBase": 59,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-toppings-whole-pita-bread-59",
    "categoriaId": "cat-real-toppings",
    "nombre": "WHOLE PITA BREAD",
    "descripcion": "",
    "precioBase": 119,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-toppings-lo-cal-rose-vinaigrette-60",
    "categoriaId": "cat-real-toppings",
    "nombre": "LO-CAL ROSE VINAIGRETTE",
    "descripcion": "",
    "precioBase": 169,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-toppings-house-pink-vinaigrette-61",
    "categoriaId": "cat-real-toppings",
    "nombre": "HOUSE PINK VINAIGRETTE",
    "descripcion": "",
    "precioBase": 179,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-toppings-no-protein-62",
    "categoriaId": "cat-real-toppings",
    "nombre": "NO PROTEIN",
    "descripcion": "",
    "precioBase": 0,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-toppings-baked-salmon-hot-63",
    "categoriaId": "cat-real-toppings",
    "nombre": "BAKED SALMON HOT",
    "descripcion": "",
    "precioBase": 499,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-toppings-baked-salmon-cold-64",
    "categoriaId": "cat-real-toppings",
    "nombre": "BAKED SALMON COLD",
    "descripcion": "",
    "precioBase": 499,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-toppings-sauteed-shrimp-65",
    "categoriaId": "cat-real-toppings",
    "nombre": "SAUTEED SHRIMP",
    "descripcion": "",
    "precioBase": 499,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-toppings-grilled-chicken-breast-66",
    "categoriaId": "cat-real-toppings",
    "nombre": "GRILLED CHICKEN BREAST",
    "descripcion": "",
    "precioBase": 499,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-toppings-dark-roast-meat-67",
    "categoriaId": "cat-real-toppings",
    "nombre": "DARK ROAST MEAT",
    "descripcion": "",
    "precioBase": 499,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-toppings-as-is-68",
    "categoriaId": "cat-real-toppings",
    "nombre": "AS IS",
    "descripcion": "",
    "precioBase": 0,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-toppings-no-almonds-69",
    "categoriaId": "cat-real-toppings",
    "nombre": "NO ALMONDS",
    "descripcion": "",
    "precioBase": 0,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-toppings-no-avocado-70",
    "categoriaId": "cat-real-toppings",
    "nombre": "NO AVOCADO",
    "descripcion": "",
    "precioBase": 0,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-toppings-no-black-beans-71",
    "categoriaId": "cat-real-toppings",
    "nombre": "NO BLACK BEANS",
    "descripcion": "",
    "precioBase": 0,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-toppings-no-broccoli-72",
    "categoriaId": "cat-real-toppings",
    "nombre": "NO BROCCOLI",
    "descripcion": "",
    "precioBase": 0,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-toppings-no-carrots-73",
    "categoriaId": "cat-real-toppings",
    "nombre": "NO CARROTS",
    "descripcion": "",
    "precioBase": 0,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-toppings-no-cheddar-cheese-74",
    "categoriaId": "cat-real-toppings",
    "nombre": "NO CHEDDAR CHEESE",
    "descripcion": "",
    "precioBase": 0,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-toppings-no-cilantro-75",
    "categoriaId": "cat-real-toppings",
    "nombre": "NO CILANTRO",
    "descripcion": "",
    "precioBase": 0,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-toppings-no-corn-76",
    "categoriaId": "cat-real-toppings",
    "nombre": "NO CORN",
    "descripcion": "",
    "precioBase": 0,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-toppings-no-cranberries-77",
    "categoriaId": "cat-real-toppings",
    "nombre": "NO CRANBERRIES",
    "descripcion": "",
    "precioBase": 0,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-toppings-no-crunchy-asian-chips-78",
    "categoriaId": "cat-real-toppings",
    "nombre": "NO CRUNCHY ASIAN CHIPS",
    "descripcion": "",
    "precioBase": 0,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-toppings-no-cucumbers-79",
    "categoriaId": "cat-real-toppings",
    "nombre": "NO CUCUMBERS",
    "descripcion": "",
    "precioBase": 0,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-toppings-no-grape-tomatoes-80",
    "categoriaId": "cat-real-toppings",
    "nombre": "NO GRAPE TOMATOES",
    "descripcion": "",
    "precioBase": 0,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-toppings-no-greek-olives-81",
    "categoriaId": "cat-real-toppings",
    "nombre": "NO GREEK OLIVES",
    "descripcion": "",
    "precioBase": 0,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-toppings-no-healthy-slaw-mix-82",
    "categoriaId": "cat-real-toppings",
    "nombre": "NO HEALTHY SLAW MIX",
    "descripcion": "",
    "precioBase": 0,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-toppings-no-iceberg-lettuce-83",
    "categoriaId": "cat-real-toppings",
    "nombre": "NO ICEBERG LETTUCE",
    "descripcion": "",
    "precioBase": 0,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-toppings-no-kale-84",
    "categoriaId": "cat-real-toppings",
    "nombre": "NO KALE",
    "descripcion": "",
    "precioBase": 0,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-toppings-no-mandarin-wedges-85",
    "categoriaId": "cat-real-toppings",
    "nombre": "NO MANDARIN WEDGES",
    "descripcion": "",
    "precioBase": 0,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-toppings-no-multigrain-croutons-86",
    "categoriaId": "cat-real-toppings",
    "nombre": "NO MULTIGRAIN CROUTONS",
    "descripcion": "",
    "precioBase": 0,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-toppings-no-peppers-87",
    "categoriaId": "cat-real-toppings",
    "nombre": "NO PEPPERS",
    "descripcion": "",
    "precioBase": 0,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-toppings-no-pumpkin-seeds-88",
    "categoriaId": "cat-real-toppings",
    "nombre": "NO PUMPKIN SEEDS",
    "descripcion": "",
    "precioBase": 0,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-toppings-no-red-onions-89",
    "categoriaId": "cat-real-toppings",
    "nombre": "NO RED ONIONS",
    "descripcion": "",
    "precioBase": 0,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-toppings-no-romaine-90",
    "categoriaId": "cat-real-toppings",
    "nombre": "NO ROMAINE",
    "descripcion": "",
    "precioBase": 0,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-toppings-no-romaine-kale-mix-91",
    "categoriaId": "cat-real-toppings",
    "nombre": "NO ROMAINE/KALE MIX",
    "descripcion": "",
    "precioBase": 0,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-toppings-no-scallions-92",
    "categoriaId": "cat-real-toppings",
    "nombre": "NO SCALLIONS",
    "descripcion": "",
    "precioBase": 0,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-toppings-no-shaved-parmesan-chee-93",
    "categoriaId": "cat-real-toppings",
    "nombre": "NO SHAVED PARMESAN CHEE",
    "descripcion": "",
    "precioBase": 0,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-toppings-no-sunflower-seeds-94",
    "categoriaId": "cat-real-toppings",
    "nombre": "NO SUNFLOWER SEEDS",
    "descripcion": "",
    "precioBase": 0,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-toppings-no-tortilla-chips-95",
    "categoriaId": "cat-real-toppings",
    "nombre": "NO TORTILLA CHIPS",
    "descripcion": "",
    "precioBase": 0,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-toppings-no-feta-cheese-96",
    "categoriaId": "cat-real-toppings",
    "nombre": "NO FETA CHEESE",
    "descripcion": "",
    "precioBase": 0,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-toppings-dressing-inside-97",
    "categoriaId": "cat-real-toppings",
    "nombre": "DRESSING INSIDE",
    "descripcion": "",
    "precioBase": 0,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-toppings-dressing-on-the-side-98",
    "categoriaId": "cat-real-toppings",
    "nombre": "DRESSING ON THE SIDE",
    "descripcion": "",
    "precioBase": 0,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-toppings-white-tortilla-99",
    "categoriaId": "cat-real-toppings",
    "nombre": "White Tortilla",
    "descripcion": "",
    "precioBase": 0,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-toppings-spinach-tortilla-100",
    "categoriaId": "cat-real-toppings",
    "nombre": "Spinach Tortilla",
    "descripcion": "",
    "precioBase": 0,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-toppings-romaine-kale-mix-101",
    "categoriaId": "cat-real-toppings",
    "nombre": "ROMAINE/KALE MIX",
    "descripcion": "",
    "precioBase": 99,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-toppings-seasoned-croutons-102",
    "categoriaId": "cat-real-toppings",
    "nombre": "SEASONED CROUTONS",
    "descripcion": "",
    "precioBase": 69,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-toppings-crispy-chicken-skin-103",
    "categoriaId": "cat-real-toppings",
    "nombre": "CRISPY CHICKEN SKIN",
    "descripcion": "",
    "precioBase": 99,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-modifiers-fine-chopped-breast-1",
    "categoriaId": "cat-real-modifiers",
    "nombre": "FINE CHOPPED BREAST",
    "descripcion": "",
    "precioBase": 0,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-modifiers-special-request-2",
    "categoriaId": "cat-real-modifiers",
    "nombre": "SPECIAL REQUEST",
    "descripcion": "",
    "precioBase": 0,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-modifiers-toppings-outside-3",
    "categoriaId": "cat-real-modifiers",
    "nombre": "TOPPINGS OUTSIDE",
    "descripcion": "",
    "precioBase": 0,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-modifiers-sauce-inside-4",
    "categoriaId": "cat-real-modifiers",
    "nombre": "SAUCE INSIDE",
    "descripcion": "",
    "precioBase": 0,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-modifiers-no-sauces-5",
    "categoriaId": "cat-real-modifiers",
    "nombre": "NO SAUCES",
    "descripcion": "",
    "precioBase": 0,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-modifiers-extra-sauce-6",
    "categoriaId": "cat-real-modifiers",
    "nombre": "EXTRA SAUCE",
    "descripcion": "",
    "precioBase": 59,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-modifiers-free-water-cup-7",
    "categoriaId": "cat-real-modifiers",
    "nombre": "FREE WATER CUP",
    "descripcion": "",
    "precioBase": 0,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-modifiers-substitute-yellow-rice-8",
    "categoriaId": "cat-real-modifiers",
    "nombre": "SUBSTITUTE YELLOW RICE",
    "descripcion": "",
    "precioBase": 0,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-modifiers-substitute-brown-rice-9",
    "categoriaId": "cat-real-modifiers",
    "nombre": "SUBSTITUTE BROWN RICE",
    "descripcion": "",
    "precioBase": 139,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-modifiers-substitute-cilantro-whi-10",
    "categoriaId": "cat-real-modifiers",
    "nombre": "SUBSTITUTE CILANTRO WHI",
    "descripcion": "",
    "precioBase": 139,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-modifiers-substitute-romaine-11",
    "categoriaId": "cat-real-modifiers",
    "nombre": "SUBSTITUTE ROMAINE",
    "descripcion": "",
    "precioBase": 119,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-modifiers-substitute-lettuce-12",
    "categoriaId": "cat-real-modifiers",
    "nombre": "SUBSTITUTE LETTUCE",
    "descripcion": "",
    "precioBase": 0,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-modifiers-substitute-mixed-greens-13",
    "categoriaId": "cat-real-modifiers",
    "nombre": "SUBSTITUTE MIXED GREENS",
    "descripcion": "",
    "precioBase": 79,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-modifiers-menu-exception-14",
    "categoriaId": "cat-real-modifiers",
    "nombre": "!MENU EXCEPTION",
    "descripcion": "",
    "precioBase": 0,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-modifiers-menu-comments-15",
    "categoriaId": "cat-real-modifiers",
    "nombre": "!MENU COMMENTS",
    "descripcion": "",
    "precioBase": 0,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-modifiers-employee-must-clock-out-16",
    "categoriaId": "cat-real-modifiers",
    "nombre": "EMPLOYEE MUST CLOCK OUT",
    "descripcion": "",
    "precioBase": 0,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-modifiers-to-receive-free-meal-17",
    "categoriaId": "cat-real-modifiers",
    "nombre": "TO RECEIVE FREE MEAL",
    "descripcion": "",
    "precioBase": 0,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-modifiers-olo-coupon-18",
    "categoriaId": "cat-real-modifiers",
    "nombre": "OLO COUPON",
    "descripcion": "",
    "precioBase": 0,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-modifiers-dispatch-fee-19",
    "categoriaId": "cat-real-modifiers",
    "nombre": "DISPATCH FEE",
    "descripcion": "",
    "precioBase": 0,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-modifiers-dispatch-tip-20",
    "categoriaId": "cat-real-modifiers",
    "nombre": "DISPATCH TIP",
    "descripcion": "",
    "precioBase": 0,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-modifiers-rails-upcharge-21",
    "categoriaId": "cat-real-modifiers",
    "nombre": "RAILS UPCHARGE",
    "descripcion": "",
    "precioBase": 0,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-modifiers-enter-delivery-fee-amou-22",
    "categoriaId": "cat-real-modifiers",
    "nombre": "ENTER DELIVERY FEE AMOU",
    "descripcion": "",
    "precioBase": 0,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-modifiers-enter-percentage-to-cha-23",
    "categoriaId": "cat-real-modifiers",
    "nombre": "ENTER PERCENTAGE TO CHA",
    "descripcion": "",
    "precioBase": 0,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-modifiers-service-fee-24",
    "categoriaId": "cat-real-modifiers",
    "nombre": "Service Fee",
    "descripcion": "",
    "precioBase": 0,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-cheesadillas-cheesadilla-1",
    "categoriaId": "cat-real-cheesadillas",
    "nombre": "CHEESADILLA",
    "descripcion": "",
    "precioBase": 789,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-cheesadillas-chicken-cheesadilla-2",
    "categoriaId": "cat-real-cheesadillas",
    "nombre": "CHICKEN CHEESADILLA",
    "descripcion": "",
    "precioBase": 1129,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-cheesadillas-family-cheesadilla-tray-3",
    "categoriaId": "cat-real-cheesadillas",
    "nombre": "FAMILY CHEESADILLA TRAY",
    "descripcion": "",
    "precioBase": 3349,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-cheesadillas-family-chicken-cheesadi-4",
    "categoriaId": "cat-real-cheesadillas",
    "nombre": "FAMILY CHICKEN CHEESADI",
    "descripcion": "",
    "precioBase": 4799,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-cheesadillas-wheat-tortilla-5",
    "categoriaId": "cat-real-cheesadillas",
    "nombre": "WHEAT TORTILLA",
    "descripcion": "",
    "precioBase": 119,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-cheesadillas-white-tortilla-6",
    "categoriaId": "cat-real-cheesadillas",
    "nombre": "WHITE TORTILLA",
    "descripcion": "",
    "precioBase": 119,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-cheesadillas-plain-cheesadilla-7",
    "categoriaId": "cat-real-cheesadillas",
    "nombre": "PLAIN CHEESADILLA",
    "descripcion": "",
    "precioBase": 789,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-cheesadillas-mashed-potato-8",
    "categoriaId": "cat-real-cheesadillas",
    "nombre": "MASHED POTATO",
    "descripcion": "",
    "precioBase": 269,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-catering-add-napkins-1",
    "categoriaId": "cat-real-catering",
    "nombre": "ADD NAPKINS",
    "descripcion": "",
    "precioBase": 0,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-catering-add-utensils-2",
    "categoriaId": "cat-real-catering",
    "nombre": "ADD UTENSILS",
    "descripcion": "",
    "precioBase": 0,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-catering-single-portion-grilled-3",
    "categoriaId": "cat-real-catering",
    "nombre": "SINGLE PORTION GRILLED",
    "descripcion": "",
    "precioBase": 0,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-catering-double-portion-grilled-4",
    "categoriaId": "cat-real-catering",
    "nombre": "DOUBLE PORTION GRILLED",
    "descripcion": "",
    "precioBase": 479,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-catering-single-portion-teriyaki-5",
    "categoriaId": "cat-real-catering",
    "nombre": "SINGLE PORTION TERIYAKI",
    "descripcion": "",
    "precioBase": 0,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-catering-double-portion-teriyaki-6",
    "categoriaId": "cat-real-catering",
    "nombre": "DOUBLE PORTION TERIYAKI",
    "descripcion": "",
    "precioBase": 479,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-catering-sauce-outside-the-wrapi-7",
    "categoriaId": "cat-real-catering",
    "nombre": "SAUCE OUTSIDE THE WRAPI",
    "descripcion": "",
    "precioBase": 0,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-catering-sauce-inside-the-wrapit-8",
    "categoriaId": "cat-real-catering",
    "nombre": "SAUCE INSIDE THE WRAPIT",
    "descripcion": "",
    "precioBase": 0,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-catering-side-of-garden-salad-9",
    "categoriaId": "cat-real-catering",
    "nombre": "SIDE OF GARDEN SALAD",
    "descripcion": "",
    "precioBase": 0,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-catering-side-caesar-salad-10",
    "categoriaId": "cat-real-catering",
    "nombre": "SIDE CAESAR SALAD",
    "descripcion": "",
    "precioBase": 0,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-catering-no-sauce-11",
    "categoriaId": "cat-real-catering",
    "nombre": "NO SAUCE",
    "descripcion": "",
    "precioBase": 0,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-catering-no-pita-12",
    "categoriaId": "cat-real-catering",
    "nombre": "NO PITA",
    "descripcion": "",
    "precioBase": 0,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-catering-spinach-tortilla-13",
    "categoriaId": "cat-real-catering",
    "nombre": "SPINACH TORTILLA",
    "descripcion": "",
    "precioBase": 109,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-catering-side-of-crispy-skin-14",
    "categoriaId": "cat-real-catering",
    "nombre": "SIDE OF  CRISPY SKIN",
    "descripcion": "",
    "precioBase": 129,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-catering-substitute-brown-rice-p-15",
    "categoriaId": "cat-real-catering",
    "nombre": "SUBSTITUTE BROWN RICE P",
    "descripcion": "",
    "precioBase": 139,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-catering-side-garden-salad-16",
    "categoriaId": "cat-real-catering",
    "nombre": "SIDE GARDEN SALAD",
    "descripcion": "",
    "precioBase": 0,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-catering-yellow-rice-base-17",
    "categoriaId": "cat-real-catering",
    "nombre": "YELLOW RICE BASE",
    "descripcion": "",
    "precioBase": 0,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-catering-plain-brown-rice-base-18",
    "categoriaId": "cat-real-catering",
    "nombre": "PLAIN BROWN RICE BASE",
    "descripcion": "",
    "precioBase": 139,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-catering-cilantro-white-rice-bas-19",
    "categoriaId": "cat-real-catering",
    "nombre": "CILANTRO WHITE RICE BAS",
    "descripcion": "",
    "precioBase": 119,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-catering-shredded-lettuce-base-20",
    "categoriaId": "cat-real-catering",
    "nombre": "SHREDDED LETTUCE BASE",
    "descripcion": "",
    "precioBase": 0,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-catering-romaine-lettuce-base-21",
    "categoriaId": "cat-real-catering",
    "nombre": "ROMAINE LETTUCE BASE",
    "descripcion": "",
    "precioBase": 100,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-catering-mixed-greens-base-22",
    "categoriaId": "cat-real-catering",
    "nombre": "MIXED GREENS BASE",
    "descripcion": "",
    "precioBase": 89,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-catering-romain-lettuce-base-23",
    "categoriaId": "cat-real-catering",
    "nombre": "ROMAIN LETTUCE BASE",
    "descripcion": "",
    "precioBase": 110,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-catering-sm-no-carb-chop-chop-24",
    "categoriaId": "cat-real-catering",
    "nombre": "SM-NO-CARB CHOP-CHOP",
    "descripcion": "",
    "precioBase": 999,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-catering-lg-no-carb-chop-chop-25",
    "categoriaId": "cat-real-catering",
    "nombre": "LG NO-CARB CHOP-CHOP",
    "descripcion": "",
    "precioBase": 1329,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-catering-party-no-carb-chop-chop-26",
    "categoriaId": "cat-real-catering",
    "nombre": "PARTY NO-CARB CHOP-CHOP",
    "descripcion": "",
    "precioBase": 9999,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-catering-single-or-double-chicke-27",
    "categoriaId": "cat-real-catering",
    "nombre": "SINGLE OR DOUBLE CHICKE",
    "descripcion": "",
    "precioBase": 1499,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-catering-lg-chopped-chicken-br-28",
    "categoriaId": "cat-real-catering",
    "nombre": "LG CHOPPED CHICKEN  BR",
    "descripcion": "",
    "precioBase": 1599,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-catering-green-peppers-29",
    "categoriaId": "cat-real-catering",
    "nombre": "GREEN PEPPERS",
    "descripcion": "",
    "precioBase": 55,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-catering-sm-chopped-teriyaky-thi-30",
    "categoriaId": "cat-real-catering",
    "nombre": "SM CHOPPED TERIYAKY THI",
    "descripcion": "",
    "precioBase": 799,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-catering-lg-chopped-teriyaky-thi-31",
    "categoriaId": "cat-real-catering",
    "nombre": "LG CHOPPED TERIYAKY THI",
    "descripcion": "",
    "precioBase": 1599,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-catering-packed-in-lg-containers-32",
    "categoriaId": "cat-real-catering",
    "nombre": "PACKED IN LG CONTAINERS",
    "descripcion": "",
    "precioBase": 0,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-catering-sauces-ind-packed-33",
    "categoriaId": "cat-real-catering",
    "nombre": "SAUCES IND. PACKED",
    "descripcion": "",
    "precioBase": 0,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-catering-no-napkins-34",
    "categoriaId": "cat-real-catering",
    "nombre": "NO NAPKINS",
    "descripcion": "",
    "precioBase": 0,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-catering-no-utensils-35",
    "categoriaId": "cat-real-catering",
    "nombre": "NO UTENSILS",
    "descripcion": "",
    "precioBase": 0,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-catering-no-sour-cream-36",
    "categoriaId": "cat-real-catering",
    "nombre": "NO SOUR CREAM",
    "descripcion": "",
    "precioBase": 0,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-catering-no-fresh-salsa-37",
    "categoriaId": "cat-real-catering",
    "nombre": "NO FRESH SALSA",
    "descripcion": "",
    "precioBase": 0,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-catering-finely-chopped-38",
    "categoriaId": "cat-real-catering",
    "nombre": "FINELY CHOPPED",
    "descripcion": "",
    "precioBase": 0,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-catering-roughly-chopped-39",
    "categoriaId": "cat-real-catering",
    "nombre": "ROUGHLY CHOPPED",
    "descripcion": "",
    "precioBase": 0,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-catering-buffet-style-40",
    "categoriaId": "cat-real-catering",
    "nombre": "BUFFET STYLE",
    "descripcion": "",
    "precioBase": 0,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-catering-individual-containers-41",
    "categoriaId": "cat-real-catering",
    "nombre": "INDIVIDUAL CONTAINERS",
    "descripcion": "",
    "precioBase": 0,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-catering-delivery-fee-30-42",
    "categoriaId": "cat-real-catering",
    "nombre": "DELIVERY FEE $30",
    "descripcion": "",
    "precioBase": 3000,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-catering-delivery-fee-40-43",
    "categoriaId": "cat-real-catering",
    "nombre": "DELIVERY FEE $40",
    "descripcion": "",
    "precioBase": 4000,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-catering-delivery-fee-44",
    "categoriaId": "cat-real-catering",
    "nombre": "DELIVERY FEE",
    "descripcion": "",
    "precioBase": 5000,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-catering-delivery-fee-25-45",
    "categoriaId": "cat-real-catering",
    "nombre": "DELIVERY FEE $25",
    "descripcion": "",
    "precioBase": 2500,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-catering-wheat-spinach-tortilla-46",
    "categoriaId": "cat-real-catering",
    "nombre": "WHEAT SPINACH TORTILLA",
    "descripcion": "",
    "precioBase": 119,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-catering-single-portion-dark-mea-47",
    "categoriaId": "cat-real-catering",
    "nombre": "SINGLE PORTION DARK MEA",
    "descripcion": "",
    "precioBase": 0,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-catering-double-portion-dark-mea-48",
    "categoriaId": "cat-real-catering",
    "nombre": "DOUBLE PORTION DARK MEA",
    "descripcion": "",
    "precioBase": 479,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-catering-chopped-crispy-skin-49",
    "categoriaId": "cat-real-catering",
    "nombre": "CHOPPED CRISPY SKIN",
    "descripcion": "",
    "precioBase": 99,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-catering-addl-single-skirt-steak-50",
    "categoriaId": "cat-real-catering",
    "nombre": "Addl Single Skirt Steak",
    "descripcion": "",
    "precioBase": 900,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-catering-addl-double-skirt-steak-51",
    "categoriaId": "cat-real-catering",
    "nombre": "Addl Double Skirt Steak",
    "descripcion": "",
    "precioBase": 1800,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-catering-single-a-halfa-n-halfa-52",
    "categoriaId": "cat-real-catering",
    "nombre": "Single â€œHalfâ€™n Halfâ€",
    "descripcion": "",
    "precioBase": 529,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-catering-double-a-halfa-n-halfa-53",
    "categoriaId": "cat-real-catering",
    "nombre": "Double â€œHalfâ€™n Halfâ€",
    "descripcion": "",
    "precioBase": 1299,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-catering-mashed-potato-base-54",
    "categoriaId": "cat-real-catering",
    "nombre": "MASHED POTATO BASE",
    "descripcion": "",
    "precioBase": 499,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-catering-addl-sing-a-halfa-n-halfa-55",
    "categoriaId": "cat-real-catering",
    "nombre": "Addl Sing â€œHalfâ€™n Halfâ€",
    "descripcion": "",
    "precioBase": 769,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-catering-addl-dbl-a-halfa-n-halfa-56",
    "categoriaId": "cat-real-catering",
    "nombre": "Addl Dbl â€œHalfâ€™n Halfâ€",
    "descripcion": "",
    "precioBase": 1539,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-catering-single-half-n-half-57",
    "categoriaId": "cat-real-catering",
    "nombre": "SINGLE HALF N HALF",
    "descripcion": "",
    "precioBase": 529,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-catering-double-half-n-half-58",
    "categoriaId": "cat-real-catering",
    "nombre": "DOUBLE HALF N HALF",
    "descripcion": "",
    "precioBase": 1299,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  },
  {
    "id": "prod-real-catering-whole-sweet-potato-59",
    "categoriaId": "cat-real-catering",
    "nombre": "WHOLE SWEET POTATO",
    "descripcion": "",
    "precioBase": 629,
    "gravable": true,
    "esCombo": false,
    "disponible86": true,
    "activo": true
  }
];

export const INSUMOS_RECETARIO: Insumo[] = [
  {
    "id": "insu-real-lid-for-1-5-oz-souffle-cup-portion-cup-2500-pcs",
    "nombre": "LID FOR 1.5 OZ. SOUFFLE CUP / PORTION CUP 2500 PCS",
    "unidadMedida": "Ea",
    "umbralStockBajo": 24
  },
  {
    "id": "insu-real-1-5-oz-clear-plastic-souffle-cup-portion-cup-25",
    "nombre": "1.5 OZ. CLEAR PLASTIC SOUFFLE CUP / PORTION CUP 25",
    "unidadMedida": "Each",
    "umbralStockBajo": 24
  },
  {
    "id": "insu-real-small-plate-32-oz-round-container-only-base-300",
    "nombre": "SMALL PLATE - 32 OZ. ROUND CONTAINER ONLY BASE 300",
    "unidadMedida": "EA",
    "umbralStockBajo": 10
  },
  {
    "id": "insu-real-24-32-oz-injected-molded-clear-lid-300pcsc",
    "nombre": "24-32 OZ. INJECTED MOLDED CLEAR LID 300PCSC",
    "unidadMedida": "EACH",
    "umbralStockBajo": 10
  },
  {
    "id": "insu-real-limes-200-ct",
    "nombre": "LIMES 200 CT",
    "unidadMedida": "EA",
    "umbralStockBajo": 0.6238
  },
  {
    "id": "insu-real-food-coloring-ylw-pwdr",
    "nombre": "FOOD COLORING YLW PWDR",
    "unidadMedida": "Bottles",
    "umbralStockBajo": 0.0166
  },
  {
    "id": "insu-real-garlic-whl-pld-frsh",
    "nombre": "GARLIC WHL PLD FRSH",
    "unidadMedida": "OZ",
    "umbralStockBajo": 0.445
  },
  {
    "id": "insu-real-mayo-4-1-gal",
    "nombre": "MAYO 4/1 GAL",
    "unidadMedida": "OZ",
    "umbralStockBajo": 20.2568
  },
  {
    "id": "insu-real-salt-iodized-granular",
    "nombre": "SALT IODIZED GRANULAR",
    "unidadMedida": "OZ",
    "umbralStockBajo": 2.0654
  },
  {
    "id": "insu-real-bread-pita-white-12-10-ct",
    "nombre": "BREAD PITA WHITE 12/10 CT",
    "unidadMedida": "EACH",
    "umbralStockBajo": 10.42
  },
  {
    "id": "insu-real-napkin-xpress-nat-13-x-8-6",
    "nombre": "NAPKIN XPRESS NAT 13 X 8.6",
    "unidadMedida": "EA",
    "umbralStockBajo": 27.0094
  },
  {
    "id": "insu-real-cilantro-short-stemmed-30-ct",
    "nombre": "CILANTRO SHORT STEMMED 30 CT",
    "unidadMedida": "EA",
    "umbralStockBajo": 1
  },
  {
    "id": "insu-real-chicken-breast-4-10-lb",
    "nombre": "CHICKEN BREAST 4/10 LB",
    "unidadMedida": "OZ",
    "umbralStockBajo": 152.5
  },
  {
    "id": "insu-real-curry-pwdr-4-4-lb",
    "nombre": "CURRY PWDR 4/4 LB",
    "unidadMedida": "OZ",
    "umbralStockBajo": 1.0247
  },
  {
    "id": "insu-real-white-rice-50-lb",
    "nombre": "WHITE RICE 50 LB",
    "unidadMedida": "OZ",
    "umbralStockBajo": 85.6844
  },
  {
    "id": "insu-real-veg-oil",
    "nombre": "VEG OIL",
    "unidadMedida": "OZ",
    "umbralStockBajo": 5.2679
  },
  {
    "id": "insu-real-forks",
    "nombre": "FORKS",
    "unidadMedida": "EA",
    "umbralStockBajo": 10.6452
  },
  {
    "id": "insu-real-mustard-country-style-4-1-gal",
    "nombre": "MUSTARD COUNTRY STYLE 4/1 GAL",
    "unidadMedida": "OZ",
    "umbralStockBajo": 0.5124
  },
  {
    "id": "insu-real-base-chicken-lemon",
    "nombre": "BASE CHICKEN LEMON",
    "unidadMedida": "OZ",
    "umbralStockBajo": 3.336
  },
  {
    "id": "insu-real-bag-t-shirt-12x6x21",
    "nombre": "BAG T-SHIRT 12X6X21",
    "unidadMedida": "EA",
    "umbralStockBajo": 9.0031
  },
  {
    "id": "insu-real-onion-ylw-jumbo-frsh-bag",
    "nombre": "ONION YLW JUMBO FRSH BAG",
    "unidadMedida": "OZ",
    "umbralStockBajo": 10.3697
  },
  {
    "id": "insu-real-sour-cream-pouch-pack",
    "nombre": "SOUR CREAM POUCH PACK",
    "unidadMedida": "OZ",
    "umbralStockBajo": 17.4679
  },
  {
    "id": "insu-real-base-chicken-caldo-de-pollo",
    "nombre": "BASE CHICKEN CALDO DE POLLO",
    "unidadMedida": "OZ",
    "umbralStockBajo": 2.6678
  },
  {
    "id": "insu-real-tomato-25-lb",
    "nombre": "TOMATO 25 LB",
    "unidadMedida": "OZ",
    "umbralStockBajo": 45.695
  },
  {
    "id": "insu-real-lettuce-shred-1-8",
    "nombre": "LETTUCE SHRED 1/8\"",
    "unidadMedida": "OZ",
    "umbralStockBajo": 48.3784
  },
  {
    "id": "insu-real-black-bean-seasoned",
    "nombre": "BLACK BEAN SEASONED",
    "unidadMedida": "OZ",
    "umbralStockBajo": 503.6099
  },
  {
    "id": "insu-real-cheese-ched-mild-shred-fancy",
    "nombre": "CHEESE CHED MILD SHRED FANCY",
    "unidadMedida": "OZ",
    "umbralStockBajo": 52.3684
  },
  {
    "id": "insu-real-avocado-ripe-48-ct",
    "nombre": "AVOCADO RIPE 48 CT",
    "unidadMedida": "EA",
    "umbralStockBajo": 10.4081
  },
  {
    "id": "insu-real-peppers-jalapeno",
    "nombre": "PEPPERS JALAPENO",
    "unidadMedida": "OZ",
    "umbralStockBajo": 2.6201
  },
  {
    "id": "insu-real-onion-red-jumbo",
    "nombre": "ONION RED JUMBO",
    "unidadMedida": "OZ",
    "umbralStockBajo": 6.0501
  },
  {
    "id": "insu-real-chicken-thigh-meat-b-s-4-10-lb",
    "nombre": "CHICKEN THIGH MEAT B/S 4/10 LB",
    "unidadMedida": "OZ",
    "umbralStockBajo": 94.5238
  },
  {
    "id": "insu-real-sesame-seed-whi",
    "nombre": "SESAME SEED WHI",
    "unidadMedida": "OZ",
    "umbralStockBajo": 10.5
  },
  {
    "id": "insu-real-glaze-teriyaki-4-4-76-kg",
    "nombre": "GLAZE TERIYAKI 4/4.76 KG",
    "unidadMedida": "OZ",
    "umbralStockBajo": 16.4792
  },
  {
    "id": "insu-real-onion-green-w-t",
    "nombre": "ONION GREEN W&T",
    "unidadMedida": "OZ",
    "umbralStockBajo": 4.4616
  },
  {
    "id": "insu-real-large-plate-35oz-round-black-container-only-base",
    "nombre": "LARGE PLATE 35OZ ROUND BLACK CONTAINER- ONLY BASE",
    "unidadMedida": "EA",
    "umbralStockBajo": 10
  },
  {
    "id": "insu-real-clear-lid-lg-bowl",
    "nombre": "CLEAR LID LG BOWL",
    "unidadMedida": "each",
    "umbralStockBajo": 10
  },
  {
    "id": "insu-real-10-80-oz-high-pro-bowl-polypro-25-cs-black",
    "nombre": "10\" - 80 OZ. HIGH PRO BOWL POLYPRO 25/CS BLACK",
    "unidadMedida": "EACH",
    "umbralStockBajo": 10
  },
  {
    "id": "insu-real-glaze-teriyaki-6-5-lb",
    "nombre": "GLAZE TERIYAKI 6/5 LB",
    "unidadMedida": "OZ",
    "umbralStockBajo": 6.667
  },
  {
    "id": "insu-real-bread-pita-wheat-12-10-ct",
    "nombre": "BREAD PITA WHEAT 12/10 CT",
    "unidadMedida": "EA",
    "umbralStockBajo": 5
  },
  {
    "id": "insu-real-wrap-cushion-foil-14x16-slvr",
    "nombre": "WRAP CUSHION FOIL 14X16 SLVR",
    "unidadMedida": "each",
    "umbralStockBajo": 0.02
  },
  {
    "id": "insu-real-tortilla-flour-13-in",
    "nombre": "TORTILLA FLOUR 13 IN",
    "unidadMedida": "EA",
    "umbralStockBajo": 10
  },
  {
    "id": "insu-real-dressing-caesar-royal",
    "nombre": "DRESSING CAESAR ROYAL",
    "unidadMedida": "OZ",
    "umbralStockBajo": 15
  },
  {
    "id": "insu-real-cheese-parmesan-romano-style",
    "nombre": "CHEESE PARMESAN ROMANO STYLE",
    "unidadMedida": "OZ",
    "umbralStockBajo": 7.5
  },
  {
    "id": "insu-real-clear-salad-bowl-32oz-1000-ml-case-pack-300pcs",
    "nombre": "CLEAR SALAD BOWL 32OZ-1000 ML CASE PACK 300PCS",
    "unidadMedida": "Ea",
    "umbralStockBajo": 10
  },
  {
    "id": "insu-real-peppers-red-bell",
    "nombre": "PEPPERS RED BELL",
    "unidadMedida": "OZ",
    "umbralStockBajo": 24.5458
  },
  {
    "id": "insu-real-lettuce-romaine-hearts-24-ct",
    "nombre": "LETTUCE ROMAINE HEARTS 24 CT",
    "unidadMedida": "OZ",
    "umbralStockBajo": 107.5
  },
  {
    "id": "insu-real-spring-mix",
    "nombre": "SPRING MIX",
    "unidadMedida": "OZ",
    "umbralStockBajo": 46.1111
  },
  {
    "id": "insu-real-carrot-sticks-5-lb",
    "nombre": "CARROT STICKS 5 LB",
    "unidadMedida": "OZ",
    "umbralStockBajo": 40.3571
  },
  {
    "id": "insu-real-cucumber-sel",
    "nombre": "CUCUMBER SEL",
    "unidadMedida": "OZ",
    "umbralStockBajo": 41.0714
  },
  {
    "id": "insu-real-crouton-hs-lg-seasnd",
    "nombre": "CROUTON HS LG SEASND",
    "unidadMedida": "OZ",
    "umbralStockBajo": 16.6667
  },
  {
    "id": "insu-real-peppers-green-bell",
    "nombre": "PEPPERS GREEN BELL",
    "unidadMedida": "OZ",
    "umbralStockBajo": 40.125
  },
  {
    "id": "insu-real-8-oz-translucent-pp-round-deli-container-with-lid",
    "nombre": "8 OZ TRANSLUCENT PP ROUND DELI CONTAINER WITH LID",
    "unidadMedida": "each",
    "umbralStockBajo": 11.6667
  },
  {
    "id": "insu-real-e16-oz-translucent-pp-round-deli-container-with-lid",
    "nombre": "E16 OZ TRANSLUCENT PP ROUND DELI CONTAINER WITH LID",
    "unidadMedida": "EACH",
    "umbralStockBajo": 10
  },
  {
    "id": "insu-real-plantain-sweet-sliced",
    "nombre": "PLANTAIN SWEET SLICED",
    "unidadMedida": "OZ",
    "umbralStockBajo": 75.5556
  },
  {
    "id": "insu-real-corn-ylw-super-sweet-cut",
    "nombre": "CORN YLW SUPER SWEET CUT",
    "unidadMedida": "OZ",
    "umbralStockBajo": 50.2667
  },
  {
    "id": "insu-real-vinegar-red-wine",
    "nombre": "VINEGAR RED WINE",
    "unidadMedida": "OZ",
    "umbralStockBajo": 7.6778
  },
  {
    "id": "insu-real-dressing-coleslaw-base",
    "nombre": "DRESSING COLESLAW BASE",
    "unidadMedida": "OZ",
    "umbralStockBajo": 10
  },
  {
    "id": "insu-real-cabbage-shred-sep-color",
    "nombre": "CABBAGE SHRED SEP COLOR",
    "unidadMedida": "OZ",
    "umbralStockBajo": 100
  },
  {
    "id": "insu-real-pepper-black-table-grind-jar",
    "nombre": "PEPPER BLACK TABLE GRIND JAR",
    "unidadMedida": "OZ",
    "umbralStockBajo": 0.25
  },
  {
    "id": "insu-real-broccoli-crown-20-lb",
    "nombre": "BROCCOLI CROWN 20 LB",
    "unidadMedida": "OZ",
    "umbralStockBajo": 120
  },
  {
    "id": "insu-real-oil-olive-extra-virgin",
    "nombre": "OIL OLIVE EXTRA VIRGIN",
    "unidadMedida": "OZ",
    "umbralStockBajo": 2.3377
  },
  {
    "id": "insu-real-vinegar-balsamic",
    "nombre": "VINEGAR BALSAMIC",
    "unidadMedida": "OZ",
    "umbralStockBajo": 7.5304
  },
  {
    "id": "insu-real-potato-mashed-redskin",
    "nombre": "POTATO MASHED REDSKIN",
    "unidadMedida": "OZ",
    "umbralStockBajo": 120
  },
  {
    "id": "insu-real-brown-rice-25-lb",
    "nombre": "BROWN RICE 25 LB",
    "unidadMedida": "OZ",
    "umbralStockBajo": 36.2261
  },
  {
    "id": "insu-real-potato-sweet-60-65-ct",
    "nombre": "POTATO SWEET 60-65 CT",
    "unidadMedida": "Each",
    "umbralStockBajo": 10
  },
  {
    "id": "insu-real-flan-de-caramello",
    "nombre": "FLAN DE CARAMELLO",
    "unidadMedida": "4 OZ CONT",
    "umbralStockBajo": 10
  },
  {
    "id": "insu-real-brownie-fudge-choc-chip",
    "nombre": "BROWNIE FUDGE CHOC CHIP",
    "unidadMedida": "OZ",
    "umbralStockBajo": 40
  },
  {
    "id": "insu-real-water-spring",
    "nombre": "WATER SPRING",
    "unidadMedida": "16.9 OZ BTL",
    "umbralStockBajo": 10
  },
  {
    "id": "insu-real-soda-cola-diet-can",
    "nombre": "SODA COLA DIET CAN",
    "unidadMedida": "12 oz can",
    "umbralStockBajo": 10
  },
  {
    "id": "insu-real-soda-cola-can",
    "nombre": "SODA COLA CAN",
    "unidadMedida": "EACH",
    "umbralStockBajo": 10
  },
  {
    "id": "insu-real-drink-fruit-punch-single-serve",
    "nombre": "DRINK FRUIT PUNCH SINGLE SERVE",
    "unidadMedida": "6 OZ PACK",
    "umbralStockBajo": 10
  },
  {
    "id": "insu-real-garlic-pwdr-fine-grnd-1-4-lb",
    "nombre": "GARLIC PWDR FINE GRND 1/4 lb",
    "unidadMedida": "Oz",
    "umbralStockBajo": 0.6
  },
  {
    "id": "insu-real-oil-olive-100-extra-virgin",
    "nombre": "OIL OLIVE 100% EXTRA VIRGIN",
    "unidadMedida": "OZ",
    "umbralStockBajo": 15
  },
  {
    "id": "insu-real-sauce-hot",
    "nombre": "SAUCE HOT",
    "unidadMedida": "OZ",
    "umbralStockBajo": 2.692
  },
  {
    "id": "insu-real-sauce-ancho-chipotle-sandwich",
    "nombre": "SAUCE ANCHO CHIPOTLE SANDWICH",
    "unidadMedida": "OZ",
    "umbralStockBajo": 15
  },
  {
    "id": "insu-real-sauce-bbq-sweet-bold",
    "nombre": "SAUCE BBQ SWEET & BOLD",
    "unidadMedida": "OZ",
    "umbralStockBajo": 12
  },
  {
    "id": "insu-real-cilantro-fresh-1-lb",
    "nombre": "CILANTRO FRESH 1 LB",
    "unidadMedida": "OZ",
    "umbralStockBajo": 2.4
  },
  {
    "id": "insu-real-sauce-chili-sweet-red-hot",
    "nombre": "SAUCE CHILI SWEET RED HOT",
    "unidadMedida": "OZ",
    "umbralStockBajo": 15
  },
  {
    "id": "insu-real-sauce-hot-packet",
    "nombre": "SAUCE HOT PACKET",
    "unidadMedida": "EA",
    "umbralStockBajo": 10
  },
  {
    "id": "insu-real-broccoli-floret-mini",
    "nombre": "BROCCOLI FLORET MINI",
    "unidadMedida": "OZ",
    "umbralStockBajo": 20
  },
  {
    "id": "insu-real-peppers-banana-rings-mild",
    "nombre": "PEPPERS BANANA RINGS MILD",
    "unidadMedida": "OZ",
    "umbralStockBajo": 15
  },
  {
    "id": "insu-real-olive-slcd-ripe-imp",
    "nombre": "OLIVE SLCD RIPE IMP",
    "unidadMedida": "OZ",
    "umbralStockBajo": 10
  },
  {
    "id": "insu-real-tortilla-wheat-13-in",
    "nombre": "TORTILLA WHEAT 13 IN",
    "unidadMedida": "EA",
    "umbralStockBajo": 10
  },
  {
    "id": "insu-real-dspnsr-napkin-1000-cpcty-stand",
    "nombre": "DSPNSR NAPKIN 1000 CPCTY STAND",
    "unidadMedida": "1 CT",
    "umbralStockBajo": 10
  }
];

export const RECETAS_RECETARIO: Receta[] = [
  {
    "id": "receta-real-prod-real-chop-chop-sm-original-chop-chop-1",
    "productoId": "prod-real-chop-chop-sm-original-chop-chop-1",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-chop-chop-sm-deluxe-chop-chop-2",
    "productoId": "prod-real-chop-chop-sm-deluxe-chop-chop-2",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-chop-chop-sm-cuban-chop-chop-3",
    "productoId": "prod-real-chop-chop-sm-cuban-chop-chop-3",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-chop-chop-sm-mexican-chop-chop-4",
    "productoId": "prod-real-chop-chop-sm-mexican-chop-chop-4",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-chop-chop-sm-bazooka-chop-chop-5",
    "productoId": "prod-real-chop-chop-sm-bazooka-chop-chop-5",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-chop-chop-sm-no-carb-chop-chop-6",
    "productoId": "prod-real-chop-chop-sm-no-carb-chop-chop-6",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-chop-chop-sm-asian-chop-chop-7",
    "productoId": "prod-real-chop-chop-sm-asian-chop-chop-7",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-chop-chop-sm-teriyaki-chop-chop-8",
    "productoId": "prod-real-chop-chop-sm-teriyaki-chop-chop-8",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-chop-chop-sm-vegetarian-chop-chop-9",
    "productoId": "prod-real-chop-chop-sm-vegetarian-chop-chop-9",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-chop-chop-sm-make-your-own-chop-c-10",
    "productoId": "prod-real-chop-chop-sm-make-your-own-chop-c-10",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-chop-chop-lg-original-chop-chop-11",
    "productoId": "prod-real-chop-chop-lg-original-chop-chop-11",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-chop-chop-lg-deluxe-chop-chop-12",
    "productoId": "prod-real-chop-chop-lg-deluxe-chop-chop-12",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-chop-chop-lg-cuban-chop-chop-13",
    "productoId": "prod-real-chop-chop-lg-cuban-chop-chop-13",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-chop-chop-lg-mexican-chop-chop-14",
    "productoId": "prod-real-chop-chop-lg-mexican-chop-chop-14",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-chop-chop-lg-bazooka-chop-chop-15",
    "productoId": "prod-real-chop-chop-lg-bazooka-chop-chop-15",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-chop-chop-lg-no-carb-chop-chop-16",
    "productoId": "prod-real-chop-chop-lg-no-carb-chop-chop-16",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-chop-chop-lg-asian-chop-chop-17",
    "productoId": "prod-real-chop-chop-lg-asian-chop-chop-17",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-chop-chop-lg-teriyaki-chop-chop-18",
    "productoId": "prod-real-chop-chop-lg-teriyaki-chop-chop-18",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-chop-chop-lg-vegetarian-chop-chop-19",
    "productoId": "prod-real-chop-chop-lg-vegetarian-chop-chop-19",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-chop-chop-lg-make-your-own-chop-c-20",
    "productoId": "prod-real-chop-chop-lg-make-your-own-chop-c-20",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-chop-chop-original-chop-chop-21",
    "productoId": "prod-real-chop-chop-original-chop-chop-21",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-chop-chop-deluxe-chop-chop-22",
    "productoId": "prod-real-chop-chop-deluxe-chop-chop-22",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-chop-chop-cuban-chop-chop-23",
    "productoId": "prod-real-chop-chop-cuban-chop-chop-23",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-chop-chop-mexican-chop-chop-24",
    "productoId": "prod-real-chop-chop-mexican-chop-chop-24",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-chop-chop-bazooka-chop-chop-25",
    "productoId": "prod-real-chop-chop-bazooka-chop-chop-25",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-chop-chop-asian-chop-chop-27",
    "productoId": "prod-real-chop-chop-asian-chop-chop-27",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-chop-chop-lg-no-carb-chop-chop-34",
    "productoId": "prod-real-chop-chop-lg-no-carb-chop-chop-34",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-chop-chop-family-original-chop-ch-35",
    "productoId": "prod-real-chop-chop-family-original-chop-ch-35",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-chop-chop-family-deluxe-chop-chop-36",
    "productoId": "prod-real-chop-chop-family-deluxe-chop-chop-36",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-chop-chop-family-cuban-chop-chop-37",
    "productoId": "prod-real-chop-chop-family-cuban-chop-chop-37",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-chop-chop-family-mexican-chop-cho-38",
    "productoId": "prod-real-chop-chop-family-mexican-chop-cho-38",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-chop-chop-party-original-chop-cho-45",
    "productoId": "prod-real-chop-chop-party-original-chop-cho-45",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-chop-chop-party-cuban-chop-chop-47",
    "productoId": "prod-real-chop-chop-party-cuban-chop-chop-47",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-chop-chop-party-mexican-chop-chop-48",
    "productoId": "prod-real-chop-chop-party-mexican-chop-chop-48",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-chop-chop-party-bazooka-chop-chop-49",
    "productoId": "prod-real-chop-chop-party-bazooka-chop-chop-49",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-extras-extra-chopped-breast-1",
    "productoId": "prod-real-extras-extra-chopped-breast-1",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-extras-extra-teriyaki-2",
    "productoId": "prod-real-extras-extra-teriyaki-2",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-extras-pita-bread-white-5",
    "productoId": "prod-real-extras-pita-bread-white-5",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-extras-pita-bread-wheat-6",
    "productoId": "prod-real-extras-pita-bread-wheat-6",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-wrapitos-original-wrapito-1",
    "productoId": "prod-real-wrapitos-original-wrapito-1",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-wrapitos-deluxe-wrapito-2",
    "productoId": "prod-real-wrapitos-deluxe-wrapito-2",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-wrapitos-cuban-wrapito-3",
    "productoId": "prod-real-wrapitos-cuban-wrapito-3",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-wrapitos-caesar-wrapito-4",
    "productoId": "prod-real-wrapitos-caesar-wrapito-4",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-wrapitos-mexican-wrapito-5",
    "productoId": "prod-real-wrapitos-mexican-wrapito-5",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-wrapitos-bazooka-wrapito-6",
    "productoId": "prod-real-wrapitos-bazooka-wrapito-6",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-wrapitos-no-rice-wrapito-7",
    "productoId": "prod-real-wrapitos-no-rice-wrapito-7",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-wrapitos-asian-wrapito-8",
    "productoId": "prod-real-wrapitos-asian-wrapito-8",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-wrapitos-vegetarian-wrapito-9",
    "productoId": "prod-real-wrapitos-vegetarian-wrapito-9",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-wrapitos-make-your-own-wrapito-10",
    "productoId": "prod-real-wrapitos-make-your-own-wrapito-10",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-wrapitos-teriyaki-wrapito-11",
    "productoId": "prod-real-wrapitos-teriyaki-wrapito-11",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-salads-garden-salad-1",
    "productoId": "prod-real-salads-garden-salad-1",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-salads-chicken-garden-salad-2",
    "productoId": "prod-real-salads-chicken-garden-salad-2",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-salads-caesar-salad-3",
    "productoId": "prod-real-salads-caesar-salad-3",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-salads-chicken-caesar-salad-4",
    "productoId": "prod-real-salads-chicken-caesar-salad-4",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-salads-chicken-make-your-own-s-6",
    "productoId": "prod-real-salads-chicken-make-your-own-s-6",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-salads-xtra-chicken-8",
    "productoId": "prod-real-salads-xtra-chicken-8",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-salads-family-garden-salad-9",
    "productoId": "prod-real-salads-family-garden-salad-9",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-salads-family-chicken-garden-s-10",
    "productoId": "prod-real-salads-family-chicken-garden-s-10",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-salads-party-garden-salad-15",
    "productoId": "prod-real-salads-party-garden-salad-15",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-boneless-sm-chopped-chicken-bre-1",
    "productoId": "prod-real-boneless-sm-chopped-chicken-bre-1",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-boneless-lg-chopped-chicken-bre-2",
    "productoId": "prod-real-boneless-lg-chopped-chicken-bre-2",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-boneless-single-chicken-breast-f-3",
    "productoId": "prod-real-boneless-single-chicken-breast-f-3",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-boneless-double-chicken-breast-f-4",
    "productoId": "prod-real-boneless-double-chicken-breast-f-4",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-boneless-sm-chopped-chicken-brea-5",
    "productoId": "prod-real-boneless-sm-chopped-chicken-brea-5",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-boneless-lg-chopped-chicken-brea-6",
    "productoId": "prod-real-boneless-lg-chopped-chicken-brea-6",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-boneless-chicken-breast-filet-pl-7",
    "productoId": "prod-real-boneless-chicken-breast-filet-pl-7",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-boneless-double-chikn-breast-fam-8",
    "productoId": "prod-real-boneless-double-chikn-breast-fam-8",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-sides-sm-fresh-guacamole-1",
    "productoId": "prod-real-sides-sm-fresh-guacamole-1",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-sides-sm-baked-sweet-plant-2",
    "productoId": "prod-real-sides-sm-baked-sweet-plant-2",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-sides-sm-black-beans-3",
    "productoId": "prod-real-sides-sm-black-beans-3",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-sides-sm-corn-kernels-4",
    "productoId": "prod-real-sides-sm-corn-kernels-4",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-sides-sm-corn-mix-salad-5",
    "productoId": "prod-real-sides-sm-corn-mix-salad-5",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-sides-sm-cole-slaw-6",
    "productoId": "prod-real-sides-sm-cole-slaw-6",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-sides-sm-broccoli-7",
    "productoId": "prod-real-sides-sm-broccoli-7",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-sides-sm-balsamic-tomatoes-8",
    "productoId": "prod-real-sides-sm-balsamic-tomatoes-8",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-sides-sm-mashed-potatoes-9",
    "productoId": "prod-real-sides-sm-mashed-potatoes-9",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-sides-sm-yellow-rice-10",
    "productoId": "prod-real-sides-sm-yellow-rice-10",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-sides-sm-brown-rice-11",
    "productoId": "prod-real-sides-sm-brown-rice-11",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-sides-sm-cilantro-white-rice-12",
    "productoId": "prod-real-sides-sm-cilantro-white-rice-12",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-sides-half-baked-sweet-potato-13",
    "productoId": "prod-real-sides-half-baked-sweet-potato-13",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-sides-8-oz-half-pint-of-sau-14",
    "productoId": "prod-real-sides-8-oz-half-pint-of-sau-14",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-sides-lg-fresh-guacamole-15",
    "productoId": "prod-real-sides-lg-fresh-guacamole-15",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-sides-lg-baked-sweet-plantain-16",
    "productoId": "prod-real-sides-lg-baked-sweet-plantain-16",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-sides-lg-black-beans-17",
    "productoId": "prod-real-sides-lg-black-beans-17",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-sides-lg-corn-kernels-18",
    "productoId": "prod-real-sides-lg-corn-kernels-18",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-sides-lg-corn-mix-salad-19",
    "productoId": "prod-real-sides-lg-corn-mix-salad-19",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-sides-lg-coleslaw-20",
    "productoId": "prod-real-sides-lg-coleslaw-20",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-sides-lg-broccoli-21",
    "productoId": "prod-real-sides-lg-broccoli-21",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-sides-lg-balsamic-tomatoes-22",
    "productoId": "prod-real-sides-lg-balsamic-tomatoes-22",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-sides-lg-mashed-potatoes-23",
    "productoId": "prod-real-sides-lg-mashed-potatoes-23",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-sides-lg-yellow-rice-24",
    "productoId": "prod-real-sides-lg-yellow-rice-24",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-sides-lg-brown-rice-25",
    "productoId": "prod-real-sides-lg-brown-rice-25",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-sides-lg-cilantro-white-rice-26",
    "productoId": "prod-real-sides-lg-cilantro-white-rice-26",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-sides-16-oz-full-pint-of-sa-27",
    "productoId": "prod-real-sides-16-oz-full-pint-of-sa-27",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-sides-abuela-s-classic-flan-28",
    "productoId": "prod-real-sides-abuela-s-classic-flan-28",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-sides-sm-teriyaki-chicken-8-31",
    "productoId": "prod-real-sides-sm-teriyaki-chicken-8-31",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-sides-lg-teriyaki-chicken-16-33",
    "productoId": "prod-real-sides-lg-teriyaki-chicken-16-33",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-sides-lg-dark-meat-roast-chic-34",
    "productoId": "prod-real-sides-lg-dark-meat-roast-chic-34",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-sides-sm-baked-sweet-plantain-35",
    "productoId": "prod-real-sides-sm-baked-sweet-plantain-35",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-sides-sm-chopped-sweet-planta-36",
    "productoId": "prod-real-sides-sm-chopped-sweet-planta-36",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-sides-sm-coleslaw-37",
    "productoId": "prod-real-sides-sm-coleslaw-37",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-sides-sm-shredded-lettuce-39",
    "productoId": "prod-real-sides-sm-shredded-lettuce-39",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-sides-sm-baked-sweet-potato-40",
    "productoId": "prod-real-sides-sm-baked-sweet-potato-40",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-sides-lg-chopped-sweet-planta-42",
    "productoId": "prod-real-sides-lg-chopped-sweet-planta-42",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-sides-lg-cole-slaw-43",
    "productoId": "prod-real-sides-lg-cole-slaw-43",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-sides-lg-shredded-lettuce-45",
    "productoId": "prod-real-sides-lg-shredded-lettuce-45",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-dessert-heavenly-brownie-1",
    "productoId": "prod-real-dessert-heavenly-brownie-1",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-kids-original-mini-chop-1",
    "productoId": "prod-real-kids-original-mini-chop-1",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-kids-teriyaki-mini-chop-2",
    "productoId": "prod-real-kids-teriyaki-mini-chop-2",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-kids-plain-cheesadilla-kids-3",
    "productoId": "prod-real-kids-plain-cheesadilla-kids-3",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-kids-chicken-cheesadilla-kid-4",
    "productoId": "prod-real-kids-chicken-cheesadilla-kid-4",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-beverages-bottled-water-1",
    "productoId": "prod-real-beverages-bottled-water-1",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-beverages-diet-pepsi-soda-2",
    "productoId": "prod-real-beverages-diet-pepsi-soda-2",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-beverages-diet-pepsi-can-3",
    "productoId": "prod-real-beverages-diet-pepsi-can-3",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-beverages-pepsi-soda-4",
    "productoId": "prod-real-beverages-pepsi-soda-4",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-beverages-pepsi-can-5",
    "productoId": "prod-real-beverages-pepsi-can-5",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-beverages-capri-fruit-punch-17",
    "productoId": "prod-real-beverages-capri-fruit-punch-17",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-dressings-balsamic-vinaigrette-2",
    "productoId": "prod-real-dressings-balsamic-vinaigrette-2",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-dressings-caesar-dressing-3",
    "productoId": "prod-real-dressings-caesar-dressing-3",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-dressings-balsamic-vinegar-4",
    "productoId": "prod-real-dressings-balsamic-vinegar-4",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-dressings-olive-oil-5",
    "productoId": "prod-real-dressings-olive-oil-5",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-dressings-red-wine-vinegar-6",
    "productoId": "prod-real-dressings-red-wine-vinegar-6",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-sauces-original-mustard-n-curr-1",
    "productoId": "prod-real-sauces-original-mustard-n-curr-1",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-sauces-spicy-mustard-n-curry-2",
    "productoId": "prod-real-sauces-spicy-mustard-n-curry-2",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-sauces-garlic-cilantro-3",
    "productoId": "prod-real-sauces-garlic-cilantro-3",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-sauces-chipotle-lime-4",
    "productoId": "prod-real-sauces-chipotle-lime-4",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-sauces-bbq-5",
    "productoId": "prod-real-sauces-bbq-5",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-sauces-fresh-salsa-6",
    "productoId": "prod-real-sauces-fresh-salsa-6",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-sauces-spicy-salsa-verde-7",
    "productoId": "prod-real-sauces-spicy-salsa-verde-7",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-sauces-sweet-sour-8",
    "productoId": "prod-real-sauces-sweet-sour-8",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-sauces-cholula-hot-sauce-packe-11",
    "productoId": "prod-real-sauces-cholula-hot-sauce-packe-11",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-sauces-original-mustardn-curry-12",
    "productoId": "prod-real-sauces-original-mustardn-curry-12",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-sauces-spicy-mustardn-curry-13",
    "productoId": "prod-real-sauces-spicy-mustardn-curry-13",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-toppings-fresh-guacamole-1",
    "productoId": "prod-real-toppings-fresh-guacamole-1",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-toppings-avocado-half-2",
    "productoId": "prod-real-toppings-avocado-half-2",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-toppings-cheddar-cheese-3",
    "productoId": "prod-real-toppings-cheddar-cheese-3",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-toppings-sour-cream-4",
    "productoId": "prod-real-toppings-sour-cream-4",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-toppings-diced-tomatoes-5",
    "productoId": "prod-real-toppings-diced-tomatoes-5",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-toppings-shredded-lettuce-6",
    "productoId": "prod-real-toppings-shredded-lettuce-6",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-toppings-corn-mix-7",
    "productoId": "prod-real-toppings-corn-mix-7",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-toppings-corn-kernels-8",
    "productoId": "prod-real-toppings-corn-kernels-8",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-toppings-black-beans-9",
    "productoId": "prod-real-toppings-black-beans-9",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-toppings-scallions-10",
    "productoId": "prod-real-toppings-scallions-10",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-toppings-red-onions-11",
    "productoId": "prod-real-toppings-red-onions-11",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-toppings-red-peppers-12",
    "productoId": "prod-real-toppings-red-peppers-12",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-toppings-peppers-13",
    "productoId": "prod-real-toppings-peppers-13",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-toppings-broccoli-14",
    "productoId": "prod-real-toppings-broccoli-14",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-toppings-cucumbers-15",
    "productoId": "prod-real-toppings-cucumbers-15",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-toppings-carrots-16",
    "productoId": "prod-real-toppings-carrots-16",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-toppings-balsamic-tomatoes-17",
    "productoId": "prod-real-toppings-balsamic-tomatoes-17",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-toppings-banana-peppers-18",
    "productoId": "prod-real-toppings-banana-peppers-18",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-toppings-jalapenos-19",
    "productoId": "prod-real-toppings-jalapenos-19",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-toppings-greek-olives-20",
    "productoId": "prod-real-toppings-greek-olives-20",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-toppings-chopped-sweet-plantains-21",
    "productoId": "prod-real-toppings-chopped-sweet-plantains-21",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-toppings-whole-sweet-plantains-22",
    "productoId": "prod-real-toppings-whole-sweet-plantains-22",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-toppings-romaine-lettuce-23",
    "productoId": "prod-real-toppings-romaine-lettuce-23",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-toppings-mixed-greens-24",
    "productoId": "prod-real-toppings-mixed-greens-24",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-toppings-coleslaw-25",
    "productoId": "prod-real-toppings-coleslaw-25",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-toppings-parmesan-cheese-26",
    "productoId": "prod-real-toppings-parmesan-cheese-26",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-toppings-sesame-seeds-27",
    "productoId": "prod-real-toppings-sesame-seeds-27",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-toppings-croutons-28",
    "productoId": "prod-real-toppings-croutons-28",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-toppings-yellow-rice-scoop-29",
    "productoId": "prod-real-toppings-yellow-rice-scoop-29",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-toppings-brown-rice-plain-30",
    "productoId": "prod-real-toppings-brown-rice-plain-30",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-toppings-cilantro-white-rice-31",
    "productoId": "prod-real-toppings-cilantro-white-rice-31",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-toppings-guacamole-32",
    "productoId": "prod-real-toppings-guacamole-32",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-toppings-half-avocado-33",
    "productoId": "prod-real-toppings-half-avocado-33",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-toppings-lettuce-shredded-34",
    "productoId": "prod-real-toppings-lettuce-shredded-34",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-toppings-chopped-plantains-35",
    "productoId": "prod-real-toppings-chopped-plantains-35",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-toppings-sweet-plantains-whole-36",
    "productoId": "prod-real-toppings-sweet-plantains-whole-36",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-modifiers-substitute-yellow-rice-8",
    "productoId": "prod-real-modifiers-substitute-yellow-rice-8",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-modifiers-substitute-brown-rice-9",
    "productoId": "prod-real-modifiers-substitute-brown-rice-9",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-cheesadillas-cheesadilla-1",
    "productoId": "prod-real-cheesadillas-cheesadilla-1",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-cheesadillas-chicken-cheesadilla-2",
    "productoId": "prod-real-cheesadillas-chicken-cheesadilla-2",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-cheesadillas-wheat-tortilla-5",
    "productoId": "prod-real-cheesadillas-wheat-tortilla-5",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-cheesadillas-white-tortilla-6",
    "productoId": "prod-real-cheesadillas-white-tortilla-6",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-cheesadillas-plain-cheesadilla-7",
    "productoId": "prod-real-cheesadillas-plain-cheesadilla-7",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-catering-single-portion-grilled-3",
    "productoId": "prod-real-catering-single-portion-grilled-3",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-catering-double-portion-grilled-4",
    "productoId": "prod-real-catering-double-portion-grilled-4",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-catering-single-portion-teriyaki-5",
    "productoId": "prod-real-catering-single-portion-teriyaki-5",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-catering-double-portion-teriyaki-6",
    "productoId": "prod-real-catering-double-portion-teriyaki-6",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-catering-spinach-tortilla-13",
    "productoId": "prod-real-catering-spinach-tortilla-13",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-catering-side-garden-salad-16",
    "productoId": "prod-real-catering-side-garden-salad-16",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-catering-mixed-greens-base-22",
    "productoId": "prod-real-catering-mixed-greens-base-22",
    "activo": true
  },
  {
    "id": "receta-real-prod-real-catering-lg-chopped-chicken-br-28",
    "productoId": "prod-real-catering-lg-chopped-chicken-br-28",
    "activo": true
  }
];

export const RECETA_INSUMOS_RECETARIO: RecetaInsumo[] = [
  {
    "id": "ri-real-1",
    "recetaId": "receta-real-prod-real-chop-chop-sm-original-chop-chop-1",
    "insumoId": "insu-real-lid-for-1-5-oz-souffle-cup-portion-cup-2500-pcs",
    "cantidad": 2
  },
  {
    "id": "ri-real-2",
    "recetaId": "receta-real-prod-real-chop-chop-sm-original-chop-chop-1",
    "insumoId": "insu-real-1-5-oz-clear-plastic-souffle-cup-portion-cup-25",
    "cantidad": 2
  },
  {
    "id": "ri-real-3",
    "recetaId": "receta-real-prod-real-chop-chop-sm-original-chop-chop-1",
    "insumoId": "insu-real-small-plate-32-oz-round-container-only-base-300",
    "cantidad": 1
  },
  {
    "id": "ri-real-4",
    "recetaId": "receta-real-prod-real-chop-chop-sm-original-chop-chop-1",
    "insumoId": "insu-real-24-32-oz-injected-molded-clear-lid-300pcsc",
    "cantidad": 1
  },
  {
    "id": "ri-real-5",
    "recetaId": "receta-real-prod-real-chop-chop-sm-original-chop-chop-1",
    "insumoId": "insu-real-limes-200-ct",
    "cantidad": 0.012
  },
  {
    "id": "ri-real-6",
    "recetaId": "receta-real-prod-real-chop-chop-sm-original-chop-chop-1",
    "insumoId": "insu-real-food-coloring-ylw-pwdr",
    "cantidad": 0.0007
  },
  {
    "id": "ri-real-7",
    "recetaId": "receta-real-prod-real-chop-chop-sm-original-chop-chop-1",
    "insumoId": "insu-real-garlic-whl-pld-frsh",
    "cantidad": 0.036
  },
  {
    "id": "ri-real-8",
    "recetaId": "receta-real-prod-real-chop-chop-sm-original-chop-chop-1",
    "insumoId": "insu-real-mayo-4-1-gal",
    "cantidad": 1.8176
  },
  {
    "id": "ri-real-9",
    "recetaId": "receta-real-prod-real-chop-chop-sm-original-chop-chop-1",
    "insumoId": "insu-real-salt-iodized-granular",
    "cantidad": 0.1347
  },
  {
    "id": "ri-real-10",
    "recetaId": "receta-real-prod-real-chop-chop-sm-original-chop-chop-1",
    "insumoId": "insu-real-bread-pita-white-12-10-ct",
    "cantidad": 1
  },
  {
    "id": "ri-real-11",
    "recetaId": "receta-real-prod-real-chop-chop-sm-original-chop-chop-1",
    "insumoId": "insu-real-napkin-xpress-nat-13-x-8-6",
    "cantidad": 3
  },
  {
    "id": "ri-real-12",
    "recetaId": "receta-real-prod-real-chop-chop-sm-original-chop-chop-1",
    "insumoId": "insu-real-cilantro-short-stemmed-30-ct",
    "cantidad": 0.012
  },
  {
    "id": "ri-real-13",
    "recetaId": "receta-real-prod-real-chop-chop-sm-original-chop-chop-1",
    "insumoId": "insu-real-chicken-breast-4-10-lb",
    "cantidad": 4.6667
  },
  {
    "id": "ri-real-14",
    "recetaId": "receta-real-prod-real-chop-chop-sm-original-chop-chop-1",
    "insumoId": "insu-real-curry-pwdr-4-4-lb",
    "cantidad": 0.0896
  },
  {
    "id": "ri-real-15",
    "recetaId": "receta-real-prod-real-chop-chop-sm-original-chop-chop-1",
    "insumoId": "insu-real-white-rice-50-lb",
    "cantidad": 3.6226
  },
  {
    "id": "ri-real-16",
    "recetaId": "receta-real-prod-real-chop-chop-sm-original-chop-chop-1",
    "insumoId": "insu-real-veg-oil",
    "cantidad": 0.2264
  },
  {
    "id": "ri-real-17",
    "recetaId": "receta-real-prod-real-chop-chop-sm-original-chop-chop-1",
    "insumoId": "insu-real-forks",
    "cantidad": 1
  },
  {
    "id": "ri-real-18",
    "recetaId": "receta-real-prod-real-chop-chop-sm-original-chop-chop-1",
    "insumoId": "insu-real-mustard-country-style-4-1-gal",
    "cantidad": 0.0448
  },
  {
    "id": "ri-real-19",
    "recetaId": "receta-real-prod-real-chop-chop-sm-original-chop-chop-1",
    "insumoId": "insu-real-base-chicken-lemon",
    "cantidad": 0.1021
  },
  {
    "id": "ri-real-20",
    "recetaId": "receta-real-prod-real-chop-chop-sm-original-chop-chop-1",
    "insumoId": "insu-real-bag-t-shirt-12x6x21",
    "cantidad": 1
  },
  {
    "id": "ri-real-21",
    "recetaId": "receta-real-prod-real-chop-chop-sm-original-chop-chop-1",
    "insumoId": "insu-real-onion-ylw-jumbo-frsh-bag",
    "cantidad": 0.4528
  },
  {
    "id": "ri-real-22",
    "recetaId": "receta-real-prod-real-chop-chop-sm-original-chop-chop-1",
    "insumoId": "insu-real-sour-cream-pouch-pack",
    "cantidad": 0.216
  },
  {
    "id": "ri-real-23",
    "recetaId": "receta-real-prod-real-chop-chop-sm-original-chop-chop-1",
    "insumoId": "insu-real-base-chicken-caldo-de-pollo",
    "cantidad": 0.1132
  },
  {
    "id": "ri-real-24",
    "recetaId": "receta-real-prod-real-chop-chop-sm-deluxe-chop-chop-2",
    "insumoId": "insu-real-lid-for-1-5-oz-souffle-cup-portion-cup-2500-pcs",
    "cantidad": 2
  },
  {
    "id": "ri-real-25",
    "recetaId": "receta-real-prod-real-chop-chop-sm-deluxe-chop-chop-2",
    "insumoId": "insu-real-1-5-oz-clear-plastic-souffle-cup-portion-cup-25",
    "cantidad": 2
  },
  {
    "id": "ri-real-26",
    "recetaId": "receta-real-prod-real-chop-chop-sm-deluxe-chop-chop-2",
    "insumoId": "insu-real-small-plate-32-oz-round-container-only-base-300",
    "cantidad": 1
  },
  {
    "id": "ri-real-27",
    "recetaId": "receta-real-prod-real-chop-chop-sm-deluxe-chop-chop-2",
    "insumoId": "insu-real-24-32-oz-injected-molded-clear-lid-300pcsc",
    "cantidad": 1
  },
  {
    "id": "ri-real-28",
    "recetaId": "receta-real-prod-real-chop-chop-sm-deluxe-chop-chop-2",
    "insumoId": "insu-real-limes-200-ct",
    "cantidad": 0.012
  },
  {
    "id": "ri-real-29",
    "recetaId": "receta-real-prod-real-chop-chop-sm-deluxe-chop-chop-2",
    "insumoId": "insu-real-food-coloring-ylw-pwdr",
    "cantidad": 0.0007
  },
  {
    "id": "ri-real-30",
    "recetaId": "receta-real-prod-real-chop-chop-sm-deluxe-chop-chop-2",
    "insumoId": "insu-real-garlic-whl-pld-frsh",
    "cantidad": 0.036
  },
  {
    "id": "ri-real-31",
    "recetaId": "receta-real-prod-real-chop-chop-sm-deluxe-chop-chop-2",
    "insumoId": "insu-real-mayo-4-1-gal",
    "cantidad": 1.8176
  },
  {
    "id": "ri-real-32",
    "recetaId": "receta-real-prod-real-chop-chop-sm-deluxe-chop-chop-2",
    "insumoId": "insu-real-salt-iodized-granular",
    "cantidad": 0.1409
  },
  {
    "id": "ri-real-33",
    "recetaId": "receta-real-prod-real-chop-chop-sm-deluxe-chop-chop-2",
    "insumoId": "insu-real-bread-pita-white-12-10-ct",
    "cantidad": 1
  },
  {
    "id": "ri-real-34",
    "recetaId": "receta-real-prod-real-chop-chop-sm-deluxe-chop-chop-2",
    "insumoId": "insu-real-napkin-xpress-nat-13-x-8-6",
    "cantidad": 3
  },
  {
    "id": "ri-real-35",
    "recetaId": "receta-real-prod-real-chop-chop-sm-deluxe-chop-chop-2",
    "insumoId": "insu-real-cilantro-short-stemmed-30-ct",
    "cantidad": 0.012
  },
  {
    "id": "ri-real-36",
    "recetaId": "receta-real-prod-real-chop-chop-sm-deluxe-chop-chop-2",
    "insumoId": "insu-real-chicken-breast-4-10-lb",
    "cantidad": 5.3333
  },
  {
    "id": "ri-real-37",
    "recetaId": "receta-real-prod-real-chop-chop-sm-deluxe-chop-chop-2",
    "insumoId": "insu-real-curry-pwdr-4-4-lb",
    "cantidad": 0.0896
  },
  {
    "id": "ri-real-38",
    "recetaId": "receta-real-prod-real-chop-chop-sm-deluxe-chop-chop-2",
    "insumoId": "insu-real-white-rice-50-lb",
    "cantidad": 3.6226
  },
  {
    "id": "ri-real-39",
    "recetaId": "receta-real-prod-real-chop-chop-sm-deluxe-chop-chop-2",
    "insumoId": "insu-real-veg-oil",
    "cantidad": 0.2264
  },
  {
    "id": "ri-real-40",
    "recetaId": "receta-real-prod-real-chop-chop-sm-deluxe-chop-chop-2",
    "insumoId": "insu-real-forks",
    "cantidad": 1
  },
  {
    "id": "ri-real-41",
    "recetaId": "receta-real-prod-real-chop-chop-sm-deluxe-chop-chop-2",
    "insumoId": "insu-real-mustard-country-style-4-1-gal",
    "cantidad": 0.0448
  },
  {
    "id": "ri-real-42",
    "recetaId": "receta-real-prod-real-chop-chop-sm-deluxe-chop-chop-2",
    "insumoId": "insu-real-base-chicken-lemon",
    "cantidad": 0.1167
  },
  {
    "id": "ri-real-43",
    "recetaId": "receta-real-prod-real-chop-chop-sm-deluxe-chop-chop-2",
    "insumoId": "insu-real-bag-t-shirt-12x6x21",
    "cantidad": 1
  },
  {
    "id": "ri-real-44",
    "recetaId": "receta-real-prod-real-chop-chop-sm-deluxe-chop-chop-2",
    "insumoId": "insu-real-tomato-25-lb",
    "cantidad": 2
  },
  {
    "id": "ri-real-45",
    "recetaId": "receta-real-prod-real-chop-chop-sm-deluxe-chop-chop-2",
    "insumoId": "insu-real-lettuce-shred-1-8",
    "cantidad": 2
  },
  {
    "id": "ri-real-46",
    "recetaId": "receta-real-prod-real-chop-chop-sm-deluxe-chop-chop-2",
    "insumoId": "insu-real-onion-ylw-jumbo-frsh-bag",
    "cantidad": 0.4528
  },
  {
    "id": "ri-real-47",
    "recetaId": "receta-real-prod-real-chop-chop-sm-deluxe-chop-chop-2",
    "insumoId": "insu-real-sour-cream-pouch-pack",
    "cantidad": 0.216
  },
  {
    "id": "ri-real-48",
    "recetaId": "receta-real-prod-real-chop-chop-sm-deluxe-chop-chop-2",
    "insumoId": "insu-real-base-chicken-caldo-de-pollo",
    "cantidad": 0.1132
  },
  {
    "id": "ri-real-49",
    "recetaId": "receta-real-prod-real-chop-chop-sm-cuban-chop-chop-3",
    "insumoId": "insu-real-lid-for-1-5-oz-souffle-cup-portion-cup-2500-pcs",
    "cantidad": 2
  },
  {
    "id": "ri-real-50",
    "recetaId": "receta-real-prod-real-chop-chop-sm-cuban-chop-chop-3",
    "insumoId": "insu-real-1-5-oz-clear-plastic-souffle-cup-portion-cup-25",
    "cantidad": 2
  },
  {
    "id": "ri-real-51",
    "recetaId": "receta-real-prod-real-chop-chop-sm-cuban-chop-chop-3",
    "insumoId": "insu-real-small-plate-32-oz-round-container-only-base-300",
    "cantidad": 1
  },
  {
    "id": "ri-real-52",
    "recetaId": "receta-real-prod-real-chop-chop-sm-cuban-chop-chop-3",
    "insumoId": "insu-real-24-32-oz-injected-molded-clear-lid-300pcsc",
    "cantidad": 1
  },
  {
    "id": "ri-real-53",
    "recetaId": "receta-real-prod-real-chop-chop-sm-cuban-chop-chop-3",
    "insumoId": "insu-real-limes-200-ct",
    "cantidad": 0.012
  },
  {
    "id": "ri-real-54",
    "recetaId": "receta-real-prod-real-chop-chop-sm-cuban-chop-chop-3",
    "insumoId": "insu-real-food-coloring-ylw-pwdr",
    "cantidad": 0.0007
  },
  {
    "id": "ri-real-55",
    "recetaId": "receta-real-prod-real-chop-chop-sm-cuban-chop-chop-3",
    "insumoId": "insu-real-garlic-whl-pld-frsh",
    "cantidad": 0.036
  },
  {
    "id": "ri-real-56",
    "recetaId": "receta-real-prod-real-chop-chop-sm-cuban-chop-chop-3",
    "insumoId": "insu-real-mayo-4-1-gal",
    "cantidad": 1.8176
  },
  {
    "id": "ri-real-57",
    "recetaId": "receta-real-prod-real-chop-chop-sm-cuban-chop-chop-3",
    "insumoId": "insu-real-salt-iodized-granular",
    "cantidad": 0.1409
  },
  {
    "id": "ri-real-58",
    "recetaId": "receta-real-prod-real-chop-chop-sm-cuban-chop-chop-3",
    "insumoId": "insu-real-napkin-xpress-nat-13-x-8-6",
    "cantidad": 3
  },
  {
    "id": "ri-real-59",
    "recetaId": "receta-real-prod-real-chop-chop-sm-cuban-chop-chop-3",
    "insumoId": "insu-real-cilantro-short-stemmed-30-ct",
    "cantidad": 0.012
  },
  {
    "id": "ri-real-60",
    "recetaId": "receta-real-prod-real-chop-chop-sm-cuban-chop-chop-3",
    "insumoId": "insu-real-chicken-breast-4-10-lb",
    "cantidad": 5.3333
  },
  {
    "id": "ri-real-61",
    "recetaId": "receta-real-prod-real-chop-chop-sm-cuban-chop-chop-3",
    "insumoId": "insu-real-black-bean-seasoned",
    "cantidad": 3
  },
  {
    "id": "ri-real-62",
    "recetaId": "receta-real-prod-real-chop-chop-sm-cuban-chop-chop-3",
    "insumoId": "insu-real-curry-pwdr-4-4-lb",
    "cantidad": 0.0896
  },
  {
    "id": "ri-real-63",
    "recetaId": "receta-real-prod-real-chop-chop-sm-cuban-chop-chop-3",
    "insumoId": "insu-real-white-rice-50-lb",
    "cantidad": 3.6226
  },
  {
    "id": "ri-real-64",
    "recetaId": "receta-real-prod-real-chop-chop-sm-cuban-chop-chop-3",
    "insumoId": "insu-real-veg-oil",
    "cantidad": 0.2264
  },
  {
    "id": "ri-real-65",
    "recetaId": "receta-real-prod-real-chop-chop-sm-cuban-chop-chop-3",
    "insumoId": "insu-real-forks",
    "cantidad": 1
  },
  {
    "id": "ri-real-66",
    "recetaId": "receta-real-prod-real-chop-chop-sm-cuban-chop-chop-3",
    "insumoId": "insu-real-mustard-country-style-4-1-gal",
    "cantidad": 0.0448
  },
  {
    "id": "ri-real-67",
    "recetaId": "receta-real-prod-real-chop-chop-sm-cuban-chop-chop-3",
    "insumoId": "insu-real-base-chicken-lemon",
    "cantidad": 0.1167
  },
  {
    "id": "ri-real-68",
    "recetaId": "receta-real-prod-real-chop-chop-sm-cuban-chop-chop-3",
    "insumoId": "insu-real-bag-t-shirt-12x6x21",
    "cantidad": 1
  },
  {
    "id": "ri-real-69",
    "recetaId": "receta-real-prod-real-chop-chop-sm-cuban-chop-chop-3",
    "insumoId": "insu-real-tomato-25-lb",
    "cantidad": 2
  },
  {
    "id": "ri-real-70",
    "recetaId": "receta-real-prod-real-chop-chop-sm-cuban-chop-chop-3",
    "insumoId": "insu-real-lettuce-shred-1-8",
    "cantidad": 2
  },
  {
    "id": "ri-real-71",
    "recetaId": "receta-real-prod-real-chop-chop-sm-cuban-chop-chop-3",
    "insumoId": "insu-real-onion-ylw-jumbo-frsh-bag",
    "cantidad": 0.4528
  },
  {
    "id": "ri-real-72",
    "recetaId": "receta-real-prod-real-chop-chop-sm-cuban-chop-chop-3",
    "insumoId": "insu-real-sour-cream-pouch-pack",
    "cantidad": 0.216
  },
  {
    "id": "ri-real-73",
    "recetaId": "receta-real-prod-real-chop-chop-sm-cuban-chop-chop-3",
    "insumoId": "insu-real-base-chicken-caldo-de-pollo",
    "cantidad": 0.1132
  },
  {
    "id": "ri-real-74",
    "recetaId": "receta-real-prod-real-chop-chop-sm-mexican-chop-chop-4",
    "insumoId": "insu-real-lid-for-1-5-oz-souffle-cup-portion-cup-2500-pcs",
    "cantidad": 2
  },
  {
    "id": "ri-real-75",
    "recetaId": "receta-real-prod-real-chop-chop-sm-mexican-chop-chop-4",
    "insumoId": "insu-real-1-5-oz-clear-plastic-souffle-cup-portion-cup-25",
    "cantidad": 2
  },
  {
    "id": "ri-real-76",
    "recetaId": "receta-real-prod-real-chop-chop-sm-mexican-chop-chop-4",
    "insumoId": "insu-real-small-plate-32-oz-round-container-only-base-300",
    "cantidad": 1
  },
  {
    "id": "ri-real-77",
    "recetaId": "receta-real-prod-real-chop-chop-sm-mexican-chop-chop-4",
    "insumoId": "insu-real-24-32-oz-injected-molded-clear-lid-300pcsc",
    "cantidad": 1
  },
  {
    "id": "ri-real-78",
    "recetaId": "receta-real-prod-real-chop-chop-sm-mexican-chop-chop-4",
    "insumoId": "insu-real-limes-200-ct",
    "cantidad": 0.012
  },
  {
    "id": "ri-real-79",
    "recetaId": "receta-real-prod-real-chop-chop-sm-mexican-chop-chop-4",
    "insumoId": "insu-real-food-coloring-ylw-pwdr",
    "cantidad": 0.0007
  },
  {
    "id": "ri-real-80",
    "recetaId": "receta-real-prod-real-chop-chop-sm-mexican-chop-chop-4",
    "insumoId": "insu-real-garlic-whl-pld-frsh",
    "cantidad": 0.036
  },
  {
    "id": "ri-real-81",
    "recetaId": "receta-real-prod-real-chop-chop-sm-mexican-chop-chop-4",
    "insumoId": "insu-real-mayo-4-1-gal",
    "cantidad": 1.8176
  },
  {
    "id": "ri-real-82",
    "recetaId": "receta-real-prod-real-chop-chop-sm-mexican-chop-chop-4",
    "insumoId": "insu-real-salt-iodized-granular",
    "cantidad": 0.1409
  },
  {
    "id": "ri-real-83",
    "recetaId": "receta-real-prod-real-chop-chop-sm-mexican-chop-chop-4",
    "insumoId": "insu-real-napkin-xpress-nat-13-x-8-6",
    "cantidad": 3
  },
  {
    "id": "ri-real-84",
    "recetaId": "receta-real-prod-real-chop-chop-sm-mexican-chop-chop-4",
    "insumoId": "insu-real-cheese-ched-mild-shred-fancy",
    "cantidad": 2
  },
  {
    "id": "ri-real-85",
    "recetaId": "receta-real-prod-real-chop-chop-sm-mexican-chop-chop-4",
    "insumoId": "insu-real-cilantro-short-stemmed-30-ct",
    "cantidad": 0.012
  },
  {
    "id": "ri-real-86",
    "recetaId": "receta-real-prod-real-chop-chop-sm-mexican-chop-chop-4",
    "insumoId": "insu-real-chicken-breast-4-10-lb",
    "cantidad": 5.3333
  },
  {
    "id": "ri-real-87",
    "recetaId": "receta-real-prod-real-chop-chop-sm-mexican-chop-chop-4",
    "insumoId": "insu-real-black-bean-seasoned",
    "cantidad": 9
  },
  {
    "id": "ri-real-88",
    "recetaId": "receta-real-prod-real-chop-chop-sm-mexican-chop-chop-4",
    "insumoId": "insu-real-curry-pwdr-4-4-lb",
    "cantidad": 0.0896
  },
  {
    "id": "ri-real-89",
    "recetaId": "receta-real-prod-real-chop-chop-sm-mexican-chop-chop-4",
    "insumoId": "insu-real-white-rice-50-lb",
    "cantidad": 3.6226
  },
  {
    "id": "ri-real-90",
    "recetaId": "receta-real-prod-real-chop-chop-sm-mexican-chop-chop-4",
    "insumoId": "insu-real-veg-oil",
    "cantidad": 0.2264
  },
  {
    "id": "ri-real-91",
    "recetaId": "receta-real-prod-real-chop-chop-sm-mexican-chop-chop-4",
    "insumoId": "insu-real-forks",
    "cantidad": 1
  },
  {
    "id": "ri-real-92",
    "recetaId": "receta-real-prod-real-chop-chop-sm-mexican-chop-chop-4",
    "insumoId": "insu-real-mustard-country-style-4-1-gal",
    "cantidad": 0.0448
  },
  {
    "id": "ri-real-93",
    "recetaId": "receta-real-prod-real-chop-chop-sm-mexican-chop-chop-4",
    "insumoId": "insu-real-base-chicken-lemon",
    "cantidad": 0.1167
  },
  {
    "id": "ri-real-94",
    "recetaId": "receta-real-prod-real-chop-chop-sm-mexican-chop-chop-4",
    "insumoId": "insu-real-bag-t-shirt-12x6x21",
    "cantidad": 1
  },
  {
    "id": "ri-real-95",
    "recetaId": "receta-real-prod-real-chop-chop-sm-mexican-chop-chop-4",
    "insumoId": "insu-real-tomato-25-lb",
    "cantidad": 2
  },
  {
    "id": "ri-real-96",
    "recetaId": "receta-real-prod-real-chop-chop-sm-mexican-chop-chop-4",
    "insumoId": "insu-real-lettuce-shred-1-8",
    "cantidad": 2
  },
  {
    "id": "ri-real-97",
    "recetaId": "receta-real-prod-real-chop-chop-sm-mexican-chop-chop-4",
    "insumoId": "insu-real-onion-ylw-jumbo-frsh-bag",
    "cantidad": 0.4528
  },
  {
    "id": "ri-real-98",
    "recetaId": "receta-real-prod-real-chop-chop-sm-mexican-chop-chop-4",
    "insumoId": "insu-real-sour-cream-pouch-pack",
    "cantidad": 1.216
  },
  {
    "id": "ri-real-99",
    "recetaId": "receta-real-prod-real-chop-chop-sm-mexican-chop-chop-4",
    "insumoId": "insu-real-base-chicken-caldo-de-pollo",
    "cantidad": 0.1132
  },
  {
    "id": "ri-real-100",
    "recetaId": "receta-real-prod-real-chop-chop-sm-bazooka-chop-chop-5",
    "insumoId": "insu-real-lid-for-1-5-oz-souffle-cup-portion-cup-2500-pcs",
    "cantidad": 2
  },
  {
    "id": "ri-real-101",
    "recetaId": "receta-real-prod-real-chop-chop-sm-bazooka-chop-chop-5",
    "insumoId": "insu-real-1-5-oz-clear-plastic-souffle-cup-portion-cup-25",
    "cantidad": 2
  },
  {
    "id": "ri-real-102",
    "recetaId": "receta-real-prod-real-chop-chop-sm-bazooka-chop-chop-5",
    "insumoId": "insu-real-small-plate-32-oz-round-container-only-base-300",
    "cantidad": 1
  },
  {
    "id": "ri-real-103",
    "recetaId": "receta-real-prod-real-chop-chop-sm-bazooka-chop-chop-5",
    "insumoId": "insu-real-24-32-oz-injected-molded-clear-lid-300pcsc",
    "cantidad": 1
  },
  {
    "id": "ri-real-104",
    "recetaId": "receta-real-prod-real-chop-chop-sm-bazooka-chop-chop-5",
    "insumoId": "insu-real-limes-200-ct",
    "cantidad": 0.0549
  },
  {
    "id": "ri-real-105",
    "recetaId": "receta-real-prod-real-chop-chop-sm-bazooka-chop-chop-5",
    "insumoId": "insu-real-food-coloring-ylw-pwdr",
    "cantidad": 0.0007
  },
  {
    "id": "ri-real-106",
    "recetaId": "receta-real-prod-real-chop-chop-sm-bazooka-chop-chop-5",
    "insumoId": "insu-real-garlic-whl-pld-frsh",
    "cantidad": 0.036
  },
  {
    "id": "ri-real-107",
    "recetaId": "receta-real-prod-real-chop-chop-sm-bazooka-chop-chop-5",
    "insumoId": "insu-real-avocado-ripe-48-ct",
    "cantidad": 0.2857
  },
  {
    "id": "ri-real-108",
    "recetaId": "receta-real-prod-real-chop-chop-sm-bazooka-chop-chop-5",
    "insumoId": "insu-real-peppers-jalapeno",
    "cantidad": 0.0571
  },
  {
    "id": "ri-real-109",
    "recetaId": "receta-real-prod-real-chop-chop-sm-bazooka-chop-chop-5",
    "insumoId": "insu-real-mayo-4-1-gal",
    "cantidad": 1.8176
  },
  {
    "id": "ri-real-110",
    "recetaId": "receta-real-prod-real-chop-chop-sm-bazooka-chop-chop-5",
    "insumoId": "insu-real-salt-iodized-granular",
    "cantidad": 0.198
  },
  {
    "id": "ri-real-111",
    "recetaId": "receta-real-prod-real-chop-chop-sm-bazooka-chop-chop-5",
    "insumoId": "insu-real-bread-pita-white-12-10-ct",
    "cantidad": 2.004
  },
  {
    "id": "ri-real-112",
    "recetaId": "receta-real-prod-real-chop-chop-sm-bazooka-chop-chop-5",
    "insumoId": "insu-real-napkin-xpress-nat-13-x-8-6",
    "cantidad": 3
  },
  {
    "id": "ri-real-113",
    "recetaId": "receta-real-prod-real-chop-chop-sm-bazooka-chop-chop-5",
    "insumoId": "insu-real-cheese-ched-mild-shred-fancy",
    "cantidad": 2
  },
  {
    "id": "ri-real-114",
    "recetaId": "receta-real-prod-real-chop-chop-sm-bazooka-chop-chop-5",
    "insumoId": "insu-real-cilantro-short-stemmed-30-ct",
    "cantidad": 0.0691
  },
  {
    "id": "ri-real-115",
    "recetaId": "receta-real-prod-real-chop-chop-sm-bazooka-chop-chop-5",
    "insumoId": "insu-real-chicken-breast-4-10-lb",
    "cantidad": 5.3333
  },
  {
    "id": "ri-real-116",
    "recetaId": "receta-real-prod-real-chop-chop-sm-bazooka-chop-chop-5",
    "insumoId": "insu-real-black-bean-seasoned",
    "cantidad": 9
  },
  {
    "id": "ri-real-117",
    "recetaId": "receta-real-prod-real-chop-chop-sm-bazooka-chop-chop-5",
    "insumoId": "insu-real-curry-pwdr-4-4-lb",
    "cantidad": 0.0896
  },
  {
    "id": "ri-real-118",
    "recetaId": "receta-real-prod-real-chop-chop-sm-bazooka-chop-chop-5",
    "insumoId": "insu-real-white-rice-50-lb",
    "cantidad": 3.6226
  },
  {
    "id": "ri-real-119",
    "recetaId": "receta-real-prod-real-chop-chop-sm-bazooka-chop-chop-5",
    "insumoId": "insu-real-veg-oil",
    "cantidad": 0.2264
  },
  {
    "id": "ri-real-120",
    "recetaId": "receta-real-prod-real-chop-chop-sm-bazooka-chop-chop-5",
    "insumoId": "insu-real-forks",
    "cantidad": 1
  },
  {
    "id": "ri-real-121",
    "recetaId": "receta-real-prod-real-chop-chop-sm-bazooka-chop-chop-5",
    "insumoId": "insu-real-mustard-country-style-4-1-gal",
    "cantidad": 0.0448
  },
  {
    "id": "ri-real-122",
    "recetaId": "receta-real-prod-real-chop-chop-sm-bazooka-chop-chop-5",
    "insumoId": "insu-real-base-chicken-lemon",
    "cantidad": 0.1167
  },
  {
    "id": "ri-real-123",
    "recetaId": "receta-real-prod-real-chop-chop-sm-bazooka-chop-chop-5",
    "insumoId": "insu-real-bag-t-shirt-12x6x21",
    "cantidad": 1
  },
  {
    "id": "ri-real-124",
    "recetaId": "receta-real-prod-real-chop-chop-sm-bazooka-chop-chop-5",
    "insumoId": "insu-real-tomato-25-lb",
    "cantidad": 2.4571
  },
  {
    "id": "ri-real-125",
    "recetaId": "receta-real-prod-real-chop-chop-sm-bazooka-chop-chop-5",
    "insumoId": "insu-real-lettuce-shred-1-8",
    "cantidad": 2
  },
  {
    "id": "ri-real-126",
    "recetaId": "receta-real-prod-real-chop-chop-sm-bazooka-chop-chop-5",
    "insumoId": "insu-real-onion-red-jumbo",
    "cantidad": 0.1143
  },
  {
    "id": "ri-real-127",
    "recetaId": "receta-real-prod-real-chop-chop-sm-bazooka-chop-chop-5",
    "insumoId": "insu-real-onion-ylw-jumbo-frsh-bag",
    "cantidad": 0.4528
  },
  {
    "id": "ri-real-128",
    "recetaId": "receta-real-prod-real-chop-chop-sm-bazooka-chop-chop-5",
    "insumoId": "insu-real-sour-cream-pouch-pack",
    "cantidad": 1.216
  },
  {
    "id": "ri-real-129",
    "recetaId": "receta-real-prod-real-chop-chop-sm-bazooka-chop-chop-5",
    "insumoId": "insu-real-base-chicken-caldo-de-pollo",
    "cantidad": 0.1132
  },
  {
    "id": "ri-real-130",
    "recetaId": "receta-real-prod-real-chop-chop-sm-no-carb-chop-chop-6",
    "insumoId": "insu-real-lid-for-1-5-oz-souffle-cup-portion-cup-2500-pcs",
    "cantidad": 2
  },
  {
    "id": "ri-real-131",
    "recetaId": "receta-real-prod-real-chop-chop-sm-no-carb-chop-chop-6",
    "insumoId": "insu-real-1-5-oz-clear-plastic-souffle-cup-portion-cup-25",
    "cantidad": 2
  },
  {
    "id": "ri-real-132",
    "recetaId": "receta-real-prod-real-chop-chop-sm-no-carb-chop-chop-6",
    "insumoId": "insu-real-small-plate-32-oz-round-container-only-base-300",
    "cantidad": 1
  },
  {
    "id": "ri-real-133",
    "recetaId": "receta-real-prod-real-chop-chop-sm-no-carb-chop-chop-6",
    "insumoId": "insu-real-24-32-oz-injected-molded-clear-lid-300pcsc",
    "cantidad": 1
  },
  {
    "id": "ri-real-134",
    "recetaId": "receta-real-prod-real-chop-chop-sm-no-carb-chop-chop-6",
    "insumoId": "insu-real-limes-200-ct",
    "cantidad": 0.012
  },
  {
    "id": "ri-real-135",
    "recetaId": "receta-real-prod-real-chop-chop-sm-no-carb-chop-chop-6",
    "insumoId": "insu-real-garlic-whl-pld-frsh",
    "cantidad": 0.036
  },
  {
    "id": "ri-real-136",
    "recetaId": "receta-real-prod-real-chop-chop-sm-no-carb-chop-chop-6",
    "insumoId": "insu-real-mayo-4-1-gal",
    "cantidad": 1.8176
  },
  {
    "id": "ri-real-137",
    "recetaId": "receta-real-prod-real-chop-chop-sm-no-carb-chop-chop-6",
    "insumoId": "insu-real-salt-iodized-granular",
    "cantidad": 0.0998
  },
  {
    "id": "ri-real-138",
    "recetaId": "receta-real-prod-real-chop-chop-sm-no-carb-chop-chop-6",
    "insumoId": "insu-real-bread-pita-white-12-10-ct",
    "cantidad": 1
  },
  {
    "id": "ri-real-139",
    "recetaId": "receta-real-prod-real-chop-chop-sm-no-carb-chop-chop-6",
    "insumoId": "insu-real-napkin-xpress-nat-13-x-8-6",
    "cantidad": 3
  },
  {
    "id": "ri-real-140",
    "recetaId": "receta-real-prod-real-chop-chop-sm-no-carb-chop-chop-6",
    "insumoId": "insu-real-cilantro-short-stemmed-30-ct",
    "cantidad": 0.012
  },
  {
    "id": "ri-real-141",
    "recetaId": "receta-real-prod-real-chop-chop-sm-no-carb-chop-chop-6",
    "insumoId": "insu-real-chicken-breast-4-10-lb",
    "cantidad": 10
  },
  {
    "id": "ri-real-142",
    "recetaId": "receta-real-prod-real-chop-chop-sm-no-carb-chop-chop-6",
    "insumoId": "insu-real-curry-pwdr-4-4-lb",
    "cantidad": 0.0896
  },
  {
    "id": "ri-real-143",
    "recetaId": "receta-real-prod-real-chop-chop-sm-no-carb-chop-chop-6",
    "insumoId": "insu-real-forks",
    "cantidad": 1
  },
  {
    "id": "ri-real-144",
    "recetaId": "receta-real-prod-real-chop-chop-sm-no-carb-chop-chop-6",
    "insumoId": "insu-real-mustard-country-style-4-1-gal",
    "cantidad": 0.0448
  },
  {
    "id": "ri-real-145",
    "recetaId": "receta-real-prod-real-chop-chop-sm-no-carb-chop-chop-6",
    "insumoId": "insu-real-base-chicken-lemon",
    "cantidad": 0.2188
  },
  {
    "id": "ri-real-146",
    "recetaId": "receta-real-prod-real-chop-chop-sm-no-carb-chop-chop-6",
    "insumoId": "insu-real-bag-t-shirt-12x6x21",
    "cantidad": 1
  },
  {
    "id": "ri-real-147",
    "recetaId": "receta-real-prod-real-chop-chop-sm-no-carb-chop-chop-6",
    "insumoId": "insu-real-tomato-25-lb",
    "cantidad": 2.5
  },
  {
    "id": "ri-real-148",
    "recetaId": "receta-real-prod-real-chop-chop-sm-no-carb-chop-chop-6",
    "insumoId": "insu-real-lettuce-shred-1-8",
    "cantidad": 4
  },
  {
    "id": "ri-real-149",
    "recetaId": "receta-real-prod-real-chop-chop-sm-no-carb-chop-chop-6",
    "insumoId": "insu-real-sour-cream-pouch-pack",
    "cantidad": 0.216
  },
  {
    "id": "ri-real-150",
    "recetaId": "receta-real-prod-real-chop-chop-sm-asian-chop-chop-7",
    "insumoId": "insu-real-lid-for-1-5-oz-souffle-cup-portion-cup-2500-pcs",
    "cantidad": 2
  },
  {
    "id": "ri-real-151",
    "recetaId": "receta-real-prod-real-chop-chop-sm-asian-chop-chop-7",
    "insumoId": "insu-real-1-5-oz-clear-plastic-souffle-cup-portion-cup-25",
    "cantidad": 2
  },
  {
    "id": "ri-real-152",
    "recetaId": "receta-real-prod-real-chop-chop-sm-asian-chop-chop-7",
    "insumoId": "insu-real-small-plate-32-oz-round-container-only-base-300",
    "cantidad": 1
  },
  {
    "id": "ri-real-153",
    "recetaId": "receta-real-prod-real-chop-chop-sm-asian-chop-chop-7",
    "insumoId": "insu-real-24-32-oz-injected-molded-clear-lid-300pcsc",
    "cantidad": 1
  },
  {
    "id": "ri-real-154",
    "recetaId": "receta-real-prod-real-chop-chop-sm-asian-chop-chop-7",
    "insumoId": "insu-real-limes-200-ct",
    "cantidad": 0.012
  },
  {
    "id": "ri-real-155",
    "recetaId": "receta-real-prod-real-chop-chop-sm-asian-chop-chop-7",
    "insumoId": "insu-real-food-coloring-ylw-pwdr",
    "cantidad": 0.0007
  },
  {
    "id": "ri-real-156",
    "recetaId": "receta-real-prod-real-chop-chop-sm-asian-chop-chop-7",
    "insumoId": "insu-real-garlic-whl-pld-frsh",
    "cantidad": 0.036
  },
  {
    "id": "ri-real-157",
    "recetaId": "receta-real-prod-real-chop-chop-sm-asian-chop-chop-7",
    "insumoId": "insu-real-chicken-thigh-meat-b-s-4-10-lb",
    "cantidad": 7
  },
  {
    "id": "ri-real-158",
    "recetaId": "receta-real-prod-real-chop-chop-sm-asian-chop-chop-7",
    "insumoId": "insu-real-mayo-4-1-gal",
    "cantidad": 1.8176
  },
  {
    "id": "ri-real-159",
    "recetaId": "receta-real-prod-real-chop-chop-sm-asian-chop-chop-7",
    "insumoId": "insu-real-salt-iodized-granular",
    "cantidad": 0.1128
  },
  {
    "id": "ri-real-160",
    "recetaId": "receta-real-prod-real-chop-chop-sm-asian-chop-chop-7",
    "insumoId": "insu-real-sesame-seed-whi",
    "cantidad": 0.5
  },
  {
    "id": "ri-real-161",
    "recetaId": "receta-real-prod-real-chop-chop-sm-asian-chop-chop-7",
    "insumoId": "insu-real-napkin-xpress-nat-13-x-8-6",
    "cantidad": 3
  },
  {
    "id": "ri-real-162",
    "recetaId": "receta-real-prod-real-chop-chop-sm-asian-chop-chop-7",
    "insumoId": "insu-real-cilantro-short-stemmed-30-ct",
    "cantidad": 0.012
  },
  {
    "id": "ri-real-163",
    "recetaId": "receta-real-prod-real-chop-chop-sm-asian-chop-chop-7",
    "insumoId": "insu-real-glaze-teriyaki-4-4-76-kg",
    "cantidad": 1.225
  },
  {
    "id": "ri-real-164",
    "recetaId": "receta-real-prod-real-chop-chop-sm-asian-chop-chop-7",
    "insumoId": "insu-real-curry-pwdr-4-4-lb",
    "cantidad": 0.0896
  },
  {
    "id": "ri-real-165",
    "recetaId": "receta-real-prod-real-chop-chop-sm-asian-chop-chop-7",
    "insumoId": "insu-real-white-rice-50-lb",
    "cantidad": 3.6226
  },
  {
    "id": "ri-real-166",
    "recetaId": "receta-real-prod-real-chop-chop-sm-asian-chop-chop-7",
    "insumoId": "insu-real-veg-oil",
    "cantidad": 0.2264
  },
  {
    "id": "ri-real-167",
    "recetaId": "receta-real-prod-real-chop-chop-sm-asian-chop-chop-7",
    "insumoId": "insu-real-forks",
    "cantidad": 1
  },
  {
    "id": "ri-real-168",
    "recetaId": "receta-real-prod-real-chop-chop-sm-asian-chop-chop-7",
    "insumoId": "insu-real-mustard-country-style-4-1-gal",
    "cantidad": 0.0448
  },
  {
    "id": "ri-real-169",
    "recetaId": "receta-real-prod-real-chop-chop-sm-asian-chop-chop-7",
    "insumoId": "insu-real-bag-t-shirt-12x6x21",
    "cantidad": 1
  },
  {
    "id": "ri-real-170",
    "recetaId": "receta-real-prod-real-chop-chop-sm-asian-chop-chop-7",
    "insumoId": "insu-real-tomato-25-lb",
    "cantidad": 1.5
  },
  {
    "id": "ri-real-171",
    "recetaId": "receta-real-prod-real-chop-chop-sm-asian-chop-chop-7",
    "insumoId": "insu-real-lettuce-shred-1-8",
    "cantidad": 1.5
  },
  {
    "id": "ri-real-172",
    "recetaId": "receta-real-prod-real-chop-chop-sm-asian-chop-chop-7",
    "insumoId": "insu-real-onion-ylw-jumbo-frsh-bag",
    "cantidad": 0.4528
  },
  {
    "id": "ri-real-173",
    "recetaId": "receta-real-prod-real-chop-chop-sm-asian-chop-chop-7",
    "insumoId": "insu-real-onion-green-w-t",
    "cantidad": 0.5
  },
  {
    "id": "ri-real-174",
    "recetaId": "receta-real-prod-real-chop-chop-sm-asian-chop-chop-7",
    "insumoId": "insu-real-sour-cream-pouch-pack",
    "cantidad": 0.216
  },
  {
    "id": "ri-real-175",
    "recetaId": "receta-real-prod-real-chop-chop-sm-asian-chop-chop-7",
    "insumoId": "insu-real-base-chicken-caldo-de-pollo",
    "cantidad": 0.1132
  },
  {
    "id": "ri-real-176",
    "recetaId": "receta-real-prod-real-chop-chop-sm-teriyaki-chop-chop-8",
    "insumoId": "insu-real-lid-for-1-5-oz-souffle-cup-portion-cup-2500-pcs",
    "cantidad": 2
  },
  {
    "id": "ri-real-177",
    "recetaId": "receta-real-prod-real-chop-chop-sm-teriyaki-chop-chop-8",
    "insumoId": "insu-real-1-5-oz-clear-plastic-souffle-cup-portion-cup-25",
    "cantidad": 2
  },
  {
    "id": "ri-real-178",
    "recetaId": "receta-real-prod-real-chop-chop-sm-teriyaki-chop-chop-8",
    "insumoId": "insu-real-small-plate-32-oz-round-container-only-base-300",
    "cantidad": 1
  },
  {
    "id": "ri-real-179",
    "recetaId": "receta-real-prod-real-chop-chop-sm-teriyaki-chop-chop-8",
    "insumoId": "insu-real-24-32-oz-injected-molded-clear-lid-300pcsc",
    "cantidad": 1
  },
  {
    "id": "ri-real-180",
    "recetaId": "receta-real-prod-real-chop-chop-sm-teriyaki-chop-chop-8",
    "insumoId": "insu-real-limes-200-ct",
    "cantidad": 0.012
  },
  {
    "id": "ri-real-181",
    "recetaId": "receta-real-prod-real-chop-chop-sm-teriyaki-chop-chop-8",
    "insumoId": "insu-real-food-coloring-ylw-pwdr",
    "cantidad": 0.0007
  },
  {
    "id": "ri-real-182",
    "recetaId": "receta-real-prod-real-chop-chop-sm-teriyaki-chop-chop-8",
    "insumoId": "insu-real-garlic-whl-pld-frsh",
    "cantidad": 0.036
  },
  {
    "id": "ri-real-183",
    "recetaId": "receta-real-prod-real-chop-chop-sm-teriyaki-chop-chop-8",
    "insumoId": "insu-real-chicken-thigh-meat-b-s-4-10-lb",
    "cantidad": 7
  },
  {
    "id": "ri-real-184",
    "recetaId": "receta-real-prod-real-chop-chop-sm-teriyaki-chop-chop-8",
    "insumoId": "insu-real-mayo-4-1-gal",
    "cantidad": 1.8176
  },
  {
    "id": "ri-real-185",
    "recetaId": "receta-real-prod-real-chop-chop-sm-teriyaki-chop-chop-8",
    "insumoId": "insu-real-salt-iodized-granular",
    "cantidad": 0.1128
  },
  {
    "id": "ri-real-186",
    "recetaId": "receta-real-prod-real-chop-chop-sm-teriyaki-chop-chop-8",
    "insumoId": "insu-real-napkin-xpress-nat-13-x-8-6",
    "cantidad": 3
  },
  {
    "id": "ri-real-187",
    "recetaId": "receta-real-prod-real-chop-chop-sm-teriyaki-chop-chop-8",
    "insumoId": "insu-real-cilantro-short-stemmed-30-ct",
    "cantidad": 0.012
  },
  {
    "id": "ri-real-188",
    "recetaId": "receta-real-prod-real-chop-chop-sm-teriyaki-chop-chop-8",
    "insumoId": "insu-real-glaze-teriyaki-4-4-76-kg",
    "cantidad": 1.225
  },
  {
    "id": "ri-real-189",
    "recetaId": "receta-real-prod-real-chop-chop-sm-teriyaki-chop-chop-8",
    "insumoId": "insu-real-curry-pwdr-4-4-lb",
    "cantidad": 0.0896
  },
  {
    "id": "ri-real-190",
    "recetaId": "receta-real-prod-real-chop-chop-sm-teriyaki-chop-chop-8",
    "insumoId": "insu-real-white-rice-50-lb",
    "cantidad": 3.6226
  },
  {
    "id": "ri-real-191",
    "recetaId": "receta-real-prod-real-chop-chop-sm-teriyaki-chop-chop-8",
    "insumoId": "insu-real-veg-oil",
    "cantidad": 0.2264
  },
  {
    "id": "ri-real-192",
    "recetaId": "receta-real-prod-real-chop-chop-sm-teriyaki-chop-chop-8",
    "insumoId": "insu-real-forks",
    "cantidad": 1
  },
  {
    "id": "ri-real-193",
    "recetaId": "receta-real-prod-real-chop-chop-sm-teriyaki-chop-chop-8",
    "insumoId": "insu-real-mustard-country-style-4-1-gal",
    "cantidad": 0.0448
  },
  {
    "id": "ri-real-194",
    "recetaId": "receta-real-prod-real-chop-chop-sm-teriyaki-chop-chop-8",
    "insumoId": "insu-real-bag-t-shirt-12x6x21",
    "cantidad": 1
  },
  {
    "id": "ri-real-195",
    "recetaId": "receta-real-prod-real-chop-chop-sm-teriyaki-chop-chop-8",
    "insumoId": "insu-real-onion-ylw-jumbo-frsh-bag",
    "cantidad": 0.4528
  },
  {
    "id": "ri-real-196",
    "recetaId": "receta-real-prod-real-chop-chop-sm-teriyaki-chop-chop-8",
    "insumoId": "insu-real-sour-cream-pouch-pack",
    "cantidad": 0.216
  },
  {
    "id": "ri-real-197",
    "recetaId": "receta-real-prod-real-chop-chop-sm-teriyaki-chop-chop-8",
    "insumoId": "insu-real-base-chicken-caldo-de-pollo",
    "cantidad": 0.1132
  },
  {
    "id": "ri-real-198",
    "recetaId": "receta-real-prod-real-chop-chop-sm-vegetarian-chop-chop-9",
    "insumoId": "insu-real-lid-for-1-5-oz-souffle-cup-portion-cup-2500-pcs",
    "cantidad": 2
  },
  {
    "id": "ri-real-199",
    "recetaId": "receta-real-prod-real-chop-chop-sm-vegetarian-chop-chop-9",
    "insumoId": "insu-real-1-5-oz-clear-plastic-souffle-cup-portion-cup-25",
    "cantidad": 2
  },
  {
    "id": "ri-real-200",
    "recetaId": "receta-real-prod-real-chop-chop-sm-vegetarian-chop-chop-9",
    "insumoId": "insu-real-small-plate-32-oz-round-container-only-base-300",
    "cantidad": 1
  },
  {
    "id": "ri-real-201",
    "recetaId": "receta-real-prod-real-chop-chop-sm-vegetarian-chop-chop-9",
    "insumoId": "insu-real-24-32-oz-injected-molded-clear-lid-300pcsc",
    "cantidad": 1
  },
  {
    "id": "ri-real-202",
    "recetaId": "receta-real-prod-real-chop-chop-sm-vegetarian-chop-chop-9",
    "insumoId": "insu-real-limes-200-ct",
    "cantidad": 0.0549
  },
  {
    "id": "ri-real-203",
    "recetaId": "receta-real-prod-real-chop-chop-sm-vegetarian-chop-chop-9",
    "insumoId": "insu-real-food-coloring-ylw-pwdr",
    "cantidad": 0.0007
  },
  {
    "id": "ri-real-204",
    "recetaId": "receta-real-prod-real-chop-chop-sm-vegetarian-chop-chop-9",
    "insumoId": "insu-real-garlic-whl-pld-frsh",
    "cantidad": 0.036
  },
  {
    "id": "ri-real-205",
    "recetaId": "receta-real-prod-real-chop-chop-sm-vegetarian-chop-chop-9",
    "insumoId": "insu-real-avocado-ripe-48-ct",
    "cantidad": 0.2857
  },
  {
    "id": "ri-real-206",
    "recetaId": "receta-real-prod-real-chop-chop-sm-vegetarian-chop-chop-9",
    "insumoId": "insu-real-peppers-jalapeno",
    "cantidad": 0.0571
  },
  {
    "id": "ri-real-207",
    "recetaId": "receta-real-prod-real-chop-chop-sm-vegetarian-chop-chop-9",
    "insumoId": "insu-real-mayo-4-1-gal",
    "cantidad": 1.8176
  },
  {
    "id": "ri-real-208",
    "recetaId": "receta-real-prod-real-chop-chop-sm-vegetarian-chop-chop-9",
    "insumoId": "insu-real-salt-iodized-granular",
    "cantidad": 0.148
  },
  {
    "id": "ri-real-209",
    "recetaId": "receta-real-prod-real-chop-chop-sm-vegetarian-chop-chop-9",
    "insumoId": "insu-real-bread-pita-white-12-10-ct",
    "cantidad": 1
  },
  {
    "id": "ri-real-210",
    "recetaId": "receta-real-prod-real-chop-chop-sm-vegetarian-chop-chop-9",
    "insumoId": "insu-real-napkin-xpress-nat-13-x-8-6",
    "cantidad": 3
  },
  {
    "id": "ri-real-211",
    "recetaId": "receta-real-prod-real-chop-chop-sm-vegetarian-chop-chop-9",
    "insumoId": "insu-real-cheese-ched-mild-shred-fancy",
    "cantidad": 2
  },
  {
    "id": "ri-real-212",
    "recetaId": "receta-real-prod-real-chop-chop-sm-vegetarian-chop-chop-9",
    "insumoId": "insu-real-cilantro-short-stemmed-30-ct",
    "cantidad": 0.0691
  },
  {
    "id": "ri-real-213",
    "recetaId": "receta-real-prod-real-chop-chop-sm-vegetarian-chop-chop-9",
    "insumoId": "insu-real-black-bean-seasoned",
    "cantidad": 3
  },
  {
    "id": "ri-real-214",
    "recetaId": "receta-real-prod-real-chop-chop-sm-vegetarian-chop-chop-9",
    "insumoId": "insu-real-curry-pwdr-4-4-lb",
    "cantidad": 0.0896
  },
  {
    "id": "ri-real-215",
    "recetaId": "receta-real-prod-real-chop-chop-sm-vegetarian-chop-chop-9",
    "insumoId": "insu-real-white-rice-50-lb",
    "cantidad": 3.6226
  },
  {
    "id": "ri-real-216",
    "recetaId": "receta-real-prod-real-chop-chop-sm-vegetarian-chop-chop-9",
    "insumoId": "insu-real-veg-oil",
    "cantidad": 0.2264
  },
  {
    "id": "ri-real-217",
    "recetaId": "receta-real-prod-real-chop-chop-sm-vegetarian-chop-chop-9",
    "insumoId": "insu-real-forks",
    "cantidad": 1
  },
  {
    "id": "ri-real-218",
    "recetaId": "receta-real-prod-real-chop-chop-sm-vegetarian-chop-chop-9",
    "insumoId": "insu-real-mustard-country-style-4-1-gal",
    "cantidad": 0.0448
  },
  {
    "id": "ri-real-219",
    "recetaId": "receta-real-prod-real-chop-chop-sm-vegetarian-chop-chop-9",
    "insumoId": "insu-real-bag-t-shirt-12x6x21",
    "cantidad": 1
  },
  {
    "id": "ri-real-220",
    "recetaId": "receta-real-prod-real-chop-chop-sm-vegetarian-chop-chop-9",
    "insumoId": "insu-real-tomato-25-lb",
    "cantidad": 2.4571
  },
  {
    "id": "ri-real-221",
    "recetaId": "receta-real-prod-real-chop-chop-sm-vegetarian-chop-chop-9",
    "insumoId": "insu-real-lettuce-shred-1-8",
    "cantidad": 2
  },
  {
    "id": "ri-real-222",
    "recetaId": "receta-real-prod-real-chop-chop-sm-vegetarian-chop-chop-9",
    "insumoId": "insu-real-onion-red-jumbo",
    "cantidad": 0.1143
  },
  {
    "id": "ri-real-223",
    "recetaId": "receta-real-prod-real-chop-chop-sm-vegetarian-chop-chop-9",
    "insumoId": "insu-real-onion-ylw-jumbo-frsh-bag",
    "cantidad": 0.4528
  },
  {
    "id": "ri-real-224",
    "recetaId": "receta-real-prod-real-chop-chop-sm-vegetarian-chop-chop-9",
    "insumoId": "insu-real-sour-cream-pouch-pack",
    "cantidad": 2.216
  },
  {
    "id": "ri-real-225",
    "recetaId": "receta-real-prod-real-chop-chop-sm-vegetarian-chop-chop-9",
    "insumoId": "insu-real-base-chicken-caldo-de-pollo",
    "cantidad": 0.1132
  },
  {
    "id": "ri-real-226",
    "recetaId": "receta-real-prod-real-chop-chop-sm-make-your-own-chop-c-10",
    "insumoId": "insu-real-lid-for-1-5-oz-souffle-cup-portion-cup-2500-pcs",
    "cantidad": 2
  },
  {
    "id": "ri-real-227",
    "recetaId": "receta-real-prod-real-chop-chop-sm-make-your-own-chop-c-10",
    "insumoId": "insu-real-1-5-oz-clear-plastic-souffle-cup-portion-cup-25",
    "cantidad": 2
  },
  {
    "id": "ri-real-228",
    "recetaId": "receta-real-prod-real-chop-chop-sm-make-your-own-chop-c-10",
    "insumoId": "insu-real-small-plate-32-oz-round-container-only-base-300",
    "cantidad": 1
  },
  {
    "id": "ri-real-229",
    "recetaId": "receta-real-prod-real-chop-chop-sm-make-your-own-chop-c-10",
    "insumoId": "insu-real-24-32-oz-injected-molded-clear-lid-300pcsc",
    "cantidad": 1
  },
  {
    "id": "ri-real-230",
    "recetaId": "receta-real-prod-real-chop-chop-sm-make-your-own-chop-c-10",
    "insumoId": "insu-real-limes-200-ct",
    "cantidad": 0.012
  },
  {
    "id": "ri-real-231",
    "recetaId": "receta-real-prod-real-chop-chop-sm-make-your-own-chop-c-10",
    "insumoId": "insu-real-food-coloring-ylw-pwdr",
    "cantidad": 0.0008
  },
  {
    "id": "ri-real-232",
    "recetaId": "receta-real-prod-real-chop-chop-sm-make-your-own-chop-c-10",
    "insumoId": "insu-real-garlic-whl-pld-frsh",
    "cantidad": 0.036
  },
  {
    "id": "ri-real-233",
    "recetaId": "receta-real-prod-real-chop-chop-sm-make-your-own-chop-c-10",
    "insumoId": "insu-real-mayo-4-1-gal",
    "cantidad": 1.8176
  },
  {
    "id": "ri-real-234",
    "recetaId": "receta-real-prod-real-chop-chop-sm-make-your-own-chop-c-10",
    "insumoId": "insu-real-salt-iodized-granular",
    "cantidad": 0.1551
  },
  {
    "id": "ri-real-235",
    "recetaId": "receta-real-prod-real-chop-chop-sm-make-your-own-chop-c-10",
    "insumoId": "insu-real-bread-pita-white-12-10-ct",
    "cantidad": 1
  },
  {
    "id": "ri-real-236",
    "recetaId": "receta-real-prod-real-chop-chop-sm-make-your-own-chop-c-10",
    "insumoId": "insu-real-napkin-xpress-nat-13-x-8-6",
    "cantidad": 3
  },
  {
    "id": "ri-real-237",
    "recetaId": "receta-real-prod-real-chop-chop-sm-make-your-own-chop-c-10",
    "insumoId": "insu-real-cilantro-short-stemmed-30-ct",
    "cantidad": 0.012
  },
  {
    "id": "ri-real-238",
    "recetaId": "receta-real-prod-real-chop-chop-sm-make-your-own-chop-c-10",
    "insumoId": "insu-real-chicken-breast-4-10-lb",
    "cantidad": 5.3333
  },
  {
    "id": "ri-real-239",
    "recetaId": "receta-real-prod-real-chop-chop-sm-make-your-own-chop-c-10",
    "insumoId": "insu-real-curry-pwdr-4-4-lb",
    "cantidad": 0.0896
  },
  {
    "id": "ri-real-240",
    "recetaId": "receta-real-prod-real-chop-chop-sm-make-your-own-chop-c-10",
    "insumoId": "insu-real-white-rice-50-lb",
    "cantidad": 4.2264
  },
  {
    "id": "ri-real-241",
    "recetaId": "receta-real-prod-real-chop-chop-sm-make-your-own-chop-c-10",
    "insumoId": "insu-real-veg-oil",
    "cantidad": 0.2642
  },
  {
    "id": "ri-real-242",
    "recetaId": "receta-real-prod-real-chop-chop-sm-make-your-own-chop-c-10",
    "insumoId": "insu-real-forks",
    "cantidad": 1
  },
  {
    "id": "ri-real-243",
    "recetaId": "receta-real-prod-real-chop-chop-sm-make-your-own-chop-c-10",
    "insumoId": "insu-real-mustard-country-style-4-1-gal",
    "cantidad": 0.0448
  },
  {
    "id": "ri-real-244",
    "recetaId": "receta-real-prod-real-chop-chop-sm-make-your-own-chop-c-10",
    "insumoId": "insu-real-base-chicken-lemon",
    "cantidad": 0.1167
  },
  {
    "id": "ri-real-245",
    "recetaId": "receta-real-prod-real-chop-chop-sm-make-your-own-chop-c-10",
    "insumoId": "insu-real-bag-t-shirt-12x6x21",
    "cantidad": 1
  },
  {
    "id": "ri-real-246",
    "recetaId": "receta-real-prod-real-chop-chop-sm-make-your-own-chop-c-10",
    "insumoId": "insu-real-onion-ylw-jumbo-frsh-bag",
    "cantidad": 0.5283
  },
  {
    "id": "ri-real-247",
    "recetaId": "receta-real-prod-real-chop-chop-sm-make-your-own-chop-c-10",
    "insumoId": "insu-real-sour-cream-pouch-pack",
    "cantidad": 0.216
  },
  {
    "id": "ri-real-248",
    "recetaId": "receta-real-prod-real-chop-chop-sm-make-your-own-chop-c-10",
    "insumoId": "insu-real-base-chicken-caldo-de-pollo",
    "cantidad": 0.1321
  },
  {
    "id": "ri-real-249",
    "recetaId": "receta-real-prod-real-chop-chop-lg-original-chop-chop-11",
    "insumoId": "insu-real-lid-for-1-5-oz-souffle-cup-portion-cup-2500-pcs",
    "cantidad": 3
  },
  {
    "id": "ri-real-250",
    "recetaId": "receta-real-prod-real-chop-chop-lg-original-chop-chop-11",
    "insumoId": "insu-real-1-5-oz-clear-plastic-souffle-cup-portion-cup-25",
    "cantidad": 3
  },
  {
    "id": "ri-real-251",
    "recetaId": "receta-real-prod-real-chop-chop-lg-original-chop-chop-11",
    "insumoId": "insu-real-large-plate-35oz-round-black-container-only-base",
    "cantidad": 1
  },
  {
    "id": "ri-real-252",
    "recetaId": "receta-real-prod-real-chop-chop-lg-original-chop-chop-11",
    "insumoId": "insu-real-limes-200-ct",
    "cantidad": 0.018
  },
  {
    "id": "ri-real-253",
    "recetaId": "receta-real-prod-real-chop-chop-lg-original-chop-chop-11",
    "insumoId": "insu-real-food-coloring-ylw-pwdr",
    "cantidad": 0.0009
  },
  {
    "id": "ri-real-254",
    "recetaId": "receta-real-prod-real-chop-chop-lg-original-chop-chop-11",
    "insumoId": "insu-real-garlic-whl-pld-frsh",
    "cantidad": 0.054
  },
  {
    "id": "ri-real-255",
    "recetaId": "receta-real-prod-real-chop-chop-lg-original-chop-chop-11",
    "insumoId": "insu-real-mayo-4-1-gal",
    "cantidad": 2.7264
  },
  {
    "id": "ri-real-256",
    "recetaId": "receta-real-prod-real-chop-chop-lg-original-chop-chop-11",
    "insumoId": "insu-real-salt-iodized-granular",
    "cantidad": 0.1722
  },
  {
    "id": "ri-real-257",
    "recetaId": "receta-real-prod-real-chop-chop-lg-original-chop-chop-11",
    "insumoId": "insu-real-bread-pita-white-12-10-ct",
    "cantidad": 1
  },
  {
    "id": "ri-real-258",
    "recetaId": "receta-real-prod-real-chop-chop-lg-original-chop-chop-11",
    "insumoId": "insu-real-napkin-xpress-nat-13-x-8-6",
    "cantidad": 3
  },
  {
    "id": "ri-real-259",
    "recetaId": "receta-real-prod-real-chop-chop-lg-original-chop-chop-11",
    "insumoId": "insu-real-cilantro-short-stemmed-30-ct",
    "cantidad": 0.018
  },
  {
    "id": "ri-real-260",
    "recetaId": "receta-real-prod-real-chop-chop-lg-original-chop-chop-11",
    "insumoId": "insu-real-chicken-breast-4-10-lb",
    "cantidad": 5.3333
  },
  {
    "id": "ri-real-261",
    "recetaId": "receta-real-prod-real-chop-chop-lg-original-chop-chop-11",
    "insumoId": "insu-real-curry-pwdr-4-4-lb",
    "cantidad": 0.1344
  },
  {
    "id": "ri-real-262",
    "recetaId": "receta-real-prod-real-chop-chop-lg-original-chop-chop-11",
    "insumoId": "insu-real-white-rice-50-lb",
    "cantidad": 4.8302
  },
  {
    "id": "ri-real-263",
    "recetaId": "receta-real-prod-real-chop-chop-lg-original-chop-chop-11",
    "insumoId": "insu-real-veg-oil",
    "cantidad": 0.3019
  },
  {
    "id": "ri-real-264",
    "recetaId": "receta-real-prod-real-chop-chop-lg-original-chop-chop-11",
    "insumoId": "insu-real-forks",
    "cantidad": 1
  },
  {
    "id": "ri-real-265",
    "recetaId": "receta-real-prod-real-chop-chop-lg-original-chop-chop-11",
    "insumoId": "insu-real-mustard-country-style-4-1-gal",
    "cantidad": 0.0672
  },
  {
    "id": "ri-real-266",
    "recetaId": "receta-real-prod-real-chop-chop-lg-original-chop-chop-11",
    "insumoId": "insu-real-base-chicken-lemon",
    "cantidad": 0.1167
  },
  {
    "id": "ri-real-267",
    "recetaId": "receta-real-prod-real-chop-chop-lg-original-chop-chop-11",
    "insumoId": "insu-real-bag-t-shirt-12x6x21",
    "cantidad": 1
  },
  {
    "id": "ri-real-268",
    "recetaId": "receta-real-prod-real-chop-chop-lg-original-chop-chop-11",
    "insumoId": "insu-real-clear-lid-lg-bowl",
    "cantidad": 1
  },
  {
    "id": "ri-real-269",
    "recetaId": "receta-real-prod-real-chop-chop-lg-original-chop-chop-11",
    "insumoId": "insu-real-onion-ylw-jumbo-frsh-bag",
    "cantidad": 0.6038
  },
  {
    "id": "ri-real-270",
    "recetaId": "receta-real-prod-real-chop-chop-lg-original-chop-chop-11",
    "insumoId": "insu-real-sour-cream-pouch-pack",
    "cantidad": 0.324
  },
  {
    "id": "ri-real-271",
    "recetaId": "receta-real-prod-real-chop-chop-lg-original-chop-chop-11",
    "insumoId": "insu-real-base-chicken-caldo-de-pollo",
    "cantidad": 0.1509
  },
  {
    "id": "ri-real-272",
    "recetaId": "receta-real-prod-real-chop-chop-lg-deluxe-chop-chop-12",
    "insumoId": "insu-real-lid-for-1-5-oz-souffle-cup-portion-cup-2500-pcs",
    "cantidad": 3
  },
  {
    "id": "ri-real-273",
    "recetaId": "receta-real-prod-real-chop-chop-lg-deluxe-chop-chop-12",
    "insumoId": "insu-real-1-5-oz-clear-plastic-souffle-cup-portion-cup-25",
    "cantidad": 3
  },
  {
    "id": "ri-real-274",
    "recetaId": "receta-real-prod-real-chop-chop-lg-deluxe-chop-chop-12",
    "insumoId": "insu-real-large-plate-35oz-round-black-container-only-base",
    "cantidad": 1
  },
  {
    "id": "ri-real-275",
    "recetaId": "receta-real-prod-real-chop-chop-lg-deluxe-chop-chop-12",
    "insumoId": "insu-real-limes-200-ct",
    "cantidad": 0.018
  },
  {
    "id": "ri-real-276",
    "recetaId": "receta-real-prod-real-chop-chop-lg-deluxe-chop-chop-12",
    "insumoId": "insu-real-food-coloring-ylw-pwdr",
    "cantidad": 0.0009
  },
  {
    "id": "ri-real-277",
    "recetaId": "receta-real-prod-real-chop-chop-lg-deluxe-chop-chop-12",
    "insumoId": "insu-real-garlic-whl-pld-frsh",
    "cantidad": 0.054
  },
  {
    "id": "ri-real-278",
    "recetaId": "receta-real-prod-real-chop-chop-lg-deluxe-chop-chop-12",
    "insumoId": "insu-real-mayo-4-1-gal",
    "cantidad": 2.7264
  },
  {
    "id": "ri-real-279",
    "recetaId": "receta-real-prod-real-chop-chop-lg-deluxe-chop-chop-12",
    "insumoId": "insu-real-salt-iodized-granular",
    "cantidad": 0.1722
  },
  {
    "id": "ri-real-280",
    "recetaId": "receta-real-prod-real-chop-chop-lg-deluxe-chop-chop-12",
    "insumoId": "insu-real-napkin-xpress-nat-13-x-8-6",
    "cantidad": 3
  },
  {
    "id": "ri-real-281",
    "recetaId": "receta-real-prod-real-chop-chop-lg-deluxe-chop-chop-12",
    "insumoId": "insu-real-cilantro-short-stemmed-30-ct",
    "cantidad": 0.018
  },
  {
    "id": "ri-real-282",
    "recetaId": "receta-real-prod-real-chop-chop-lg-deluxe-chop-chop-12",
    "insumoId": "insu-real-chicken-breast-4-10-lb",
    "cantidad": 5.3333
  },
  {
    "id": "ri-real-283",
    "recetaId": "receta-real-prod-real-chop-chop-lg-deluxe-chop-chop-12",
    "insumoId": "insu-real-curry-pwdr-4-4-lb",
    "cantidad": 0.1344
  },
  {
    "id": "ri-real-284",
    "recetaId": "receta-real-prod-real-chop-chop-lg-deluxe-chop-chop-12",
    "insumoId": "insu-real-white-rice-50-lb",
    "cantidad": 4.8302
  },
  {
    "id": "ri-real-285",
    "recetaId": "receta-real-prod-real-chop-chop-lg-deluxe-chop-chop-12",
    "insumoId": "insu-real-veg-oil",
    "cantidad": 0.3019
  },
  {
    "id": "ri-real-286",
    "recetaId": "receta-real-prod-real-chop-chop-lg-deluxe-chop-chop-12",
    "insumoId": "insu-real-forks",
    "cantidad": 1
  },
  {
    "id": "ri-real-287",
    "recetaId": "receta-real-prod-real-chop-chop-lg-deluxe-chop-chop-12",
    "insumoId": "insu-real-mustard-country-style-4-1-gal",
    "cantidad": 0.0672
  },
  {
    "id": "ri-real-288",
    "recetaId": "receta-real-prod-real-chop-chop-lg-deluxe-chop-chop-12",
    "insumoId": "insu-real-base-chicken-lemon",
    "cantidad": 0.1167
  },
  {
    "id": "ri-real-289",
    "recetaId": "receta-real-prod-real-chop-chop-lg-deluxe-chop-chop-12",
    "insumoId": "insu-real-bag-t-shirt-12x6x21",
    "cantidad": 1
  },
  {
    "id": "ri-real-290",
    "recetaId": "receta-real-prod-real-chop-chop-lg-deluxe-chop-chop-12",
    "insumoId": "insu-real-clear-lid-lg-bowl",
    "cantidad": 1
  },
  {
    "id": "ri-real-291",
    "recetaId": "receta-real-prod-real-chop-chop-lg-deluxe-chop-chop-12",
    "insumoId": "insu-real-tomato-25-lb",
    "cantidad": 3
  },
  {
    "id": "ri-real-292",
    "recetaId": "receta-real-prod-real-chop-chop-lg-deluxe-chop-chop-12",
    "insumoId": "insu-real-lettuce-shred-1-8",
    "cantidad": 3
  },
  {
    "id": "ri-real-293",
    "recetaId": "receta-real-prod-real-chop-chop-lg-deluxe-chop-chop-12",
    "insumoId": "insu-real-onion-ylw-jumbo-frsh-bag",
    "cantidad": 0.6038
  },
  {
    "id": "ri-real-294",
    "recetaId": "receta-real-prod-real-chop-chop-lg-deluxe-chop-chop-12",
    "insumoId": "insu-real-sour-cream-pouch-pack",
    "cantidad": 0.324
  },
  {
    "id": "ri-real-295",
    "recetaId": "receta-real-prod-real-chop-chop-lg-deluxe-chop-chop-12",
    "insumoId": "insu-real-base-chicken-caldo-de-pollo",
    "cantidad": 0.1509
  },
  {
    "id": "ri-real-296",
    "recetaId": "receta-real-prod-real-chop-chop-lg-cuban-chop-chop-13",
    "insumoId": "insu-real-lid-for-1-5-oz-souffle-cup-portion-cup-2500-pcs",
    "cantidad": 3
  },
  {
    "id": "ri-real-297",
    "recetaId": "receta-real-prod-real-chop-chop-lg-cuban-chop-chop-13",
    "insumoId": "insu-real-1-5-oz-clear-plastic-souffle-cup-portion-cup-25",
    "cantidad": 3
  },
  {
    "id": "ri-real-298",
    "recetaId": "receta-real-prod-real-chop-chop-lg-cuban-chop-chop-13",
    "insumoId": "insu-real-large-plate-35oz-round-black-container-only-base",
    "cantidad": 1
  },
  {
    "id": "ri-real-299",
    "recetaId": "receta-real-prod-real-chop-chop-lg-cuban-chop-chop-13",
    "insumoId": "insu-real-limes-200-ct",
    "cantidad": 0.018
  },
  {
    "id": "ri-real-300",
    "recetaId": "receta-real-prod-real-chop-chop-lg-cuban-chop-chop-13",
    "insumoId": "insu-real-food-coloring-ylw-pwdr",
    "cantidad": 0.0009
  },
  {
    "id": "ri-real-301",
    "recetaId": "receta-real-prod-real-chop-chop-lg-cuban-chop-chop-13",
    "insumoId": "insu-real-garlic-whl-pld-frsh",
    "cantidad": 0.054
  },
  {
    "id": "ri-real-302",
    "recetaId": "receta-real-prod-real-chop-chop-lg-cuban-chop-chop-13",
    "insumoId": "insu-real-mayo-4-1-gal",
    "cantidad": 2.7264
  },
  {
    "id": "ri-real-303",
    "recetaId": "receta-real-prod-real-chop-chop-lg-cuban-chop-chop-13",
    "insumoId": "insu-real-salt-iodized-granular",
    "cantidad": 0.1847
  },
  {
    "id": "ri-real-304",
    "recetaId": "receta-real-prod-real-chop-chop-lg-cuban-chop-chop-13",
    "insumoId": "insu-real-napkin-xpress-nat-13-x-8-6",
    "cantidad": 3
  },
  {
    "id": "ri-real-305",
    "recetaId": "receta-real-prod-real-chop-chop-lg-cuban-chop-chop-13",
    "insumoId": "insu-real-cilantro-short-stemmed-30-ct",
    "cantidad": 0.018
  },
  {
    "id": "ri-real-306",
    "recetaId": "receta-real-prod-real-chop-chop-lg-cuban-chop-chop-13",
    "insumoId": "insu-real-chicken-breast-4-10-lb",
    "cantidad": 6.6667
  },
  {
    "id": "ri-real-307",
    "recetaId": "receta-real-prod-real-chop-chop-lg-cuban-chop-chop-13",
    "insumoId": "insu-real-black-bean-seasoned",
    "cantidad": 6
  },
  {
    "id": "ri-real-308",
    "recetaId": "receta-real-prod-real-chop-chop-lg-cuban-chop-chop-13",
    "insumoId": "insu-real-curry-pwdr-4-4-lb",
    "cantidad": 0.1344
  },
  {
    "id": "ri-real-309",
    "recetaId": "receta-real-prod-real-chop-chop-lg-cuban-chop-chop-13",
    "insumoId": "insu-real-white-rice-50-lb",
    "cantidad": 4.8302
  },
  {
    "id": "ri-real-310",
    "recetaId": "receta-real-prod-real-chop-chop-lg-cuban-chop-chop-13",
    "insumoId": "insu-real-veg-oil",
    "cantidad": 0.3019
  },
  {
    "id": "ri-real-311",
    "recetaId": "receta-real-prod-real-chop-chop-lg-cuban-chop-chop-13",
    "insumoId": "insu-real-forks",
    "cantidad": 1
  },
  {
    "id": "ri-real-312",
    "recetaId": "receta-real-prod-real-chop-chop-lg-cuban-chop-chop-13",
    "insumoId": "insu-real-mustard-country-style-4-1-gal",
    "cantidad": 0.0672
  },
  {
    "id": "ri-real-313",
    "recetaId": "receta-real-prod-real-chop-chop-lg-cuban-chop-chop-13",
    "insumoId": "insu-real-base-chicken-lemon",
    "cantidad": 0.1458
  },
  {
    "id": "ri-real-314",
    "recetaId": "receta-real-prod-real-chop-chop-lg-cuban-chop-chop-13",
    "insumoId": "insu-real-bag-t-shirt-12x6x21",
    "cantidad": 1
  },
  {
    "id": "ri-real-315",
    "recetaId": "receta-real-prod-real-chop-chop-lg-cuban-chop-chop-13",
    "insumoId": "insu-real-clear-lid-lg-bowl",
    "cantidad": 1
  },
  {
    "id": "ri-real-316",
    "recetaId": "receta-real-prod-real-chop-chop-lg-cuban-chop-chop-13",
    "insumoId": "insu-real-tomato-25-lb",
    "cantidad": 4
  },
  {
    "id": "ri-real-317",
    "recetaId": "receta-real-prod-real-chop-chop-lg-cuban-chop-chop-13",
    "insumoId": "insu-real-lettuce-shred-1-8",
    "cantidad": 4
  },
  {
    "id": "ri-real-318",
    "recetaId": "receta-real-prod-real-chop-chop-lg-cuban-chop-chop-13",
    "insumoId": "insu-real-onion-ylw-jumbo-frsh-bag",
    "cantidad": 0.6038
  },
  {
    "id": "ri-real-319",
    "recetaId": "receta-real-prod-real-chop-chop-lg-cuban-chop-chop-13",
    "insumoId": "insu-real-sour-cream-pouch-pack",
    "cantidad": 0.324
  },
  {
    "id": "ri-real-320",
    "recetaId": "receta-real-prod-real-chop-chop-lg-cuban-chop-chop-13",
    "insumoId": "insu-real-base-chicken-caldo-de-pollo",
    "cantidad": 0.1509
  },
  {
    "id": "ri-real-321",
    "recetaId": "receta-real-prod-real-chop-chop-lg-mexican-chop-chop-14",
    "insumoId": "insu-real-lid-for-1-5-oz-souffle-cup-portion-cup-2500-pcs",
    "cantidad": 3
  },
  {
    "id": "ri-real-322",
    "recetaId": "receta-real-prod-real-chop-chop-lg-mexican-chop-chop-14",
    "insumoId": "insu-real-1-5-oz-clear-plastic-souffle-cup-portion-cup-25",
    "cantidad": 3
  },
  {
    "id": "ri-real-323",
    "recetaId": "receta-real-prod-real-chop-chop-lg-mexican-chop-chop-14",
    "insumoId": "insu-real-large-plate-35oz-round-black-container-only-base",
    "cantidad": 1
  },
  {
    "id": "ri-real-324",
    "recetaId": "receta-real-prod-real-chop-chop-lg-mexican-chop-chop-14",
    "insumoId": "insu-real-limes-200-ct",
    "cantidad": 0.018
  },
  {
    "id": "ri-real-325",
    "recetaId": "receta-real-prod-real-chop-chop-lg-mexican-chop-chop-14",
    "insumoId": "insu-real-food-coloring-ylw-pwdr",
    "cantidad": 0.0009
  },
  {
    "id": "ri-real-326",
    "recetaId": "receta-real-prod-real-chop-chop-lg-mexican-chop-chop-14",
    "insumoId": "insu-real-garlic-whl-pld-frsh",
    "cantidad": 0.054
  },
  {
    "id": "ri-real-327",
    "recetaId": "receta-real-prod-real-chop-chop-lg-mexican-chop-chop-14",
    "insumoId": "insu-real-mayo-4-1-gal",
    "cantidad": 2.7264
  },
  {
    "id": "ri-real-328",
    "recetaId": "receta-real-prod-real-chop-chop-lg-mexican-chop-chop-14",
    "insumoId": "insu-real-salt-iodized-granular",
    "cantidad": 0.1847
  },
  {
    "id": "ri-real-329",
    "recetaId": "receta-real-prod-real-chop-chop-lg-mexican-chop-chop-14",
    "insumoId": "insu-real-bread-pita-white-12-10-ct",
    "cantidad": 1
  },
  {
    "id": "ri-real-330",
    "recetaId": "receta-real-prod-real-chop-chop-lg-mexican-chop-chop-14",
    "insumoId": "insu-real-napkin-xpress-nat-13-x-8-6",
    "cantidad": 3
  },
  {
    "id": "ri-real-331",
    "recetaId": "receta-real-prod-real-chop-chop-lg-mexican-chop-chop-14",
    "insumoId": "insu-real-cheese-ched-mild-shred-fancy",
    "cantidad": 4
  },
  {
    "id": "ri-real-332",
    "recetaId": "receta-real-prod-real-chop-chop-lg-mexican-chop-chop-14",
    "insumoId": "insu-real-cilantro-short-stemmed-30-ct",
    "cantidad": 0.018
  },
  {
    "id": "ri-real-333",
    "recetaId": "receta-real-prod-real-chop-chop-lg-mexican-chop-chop-14",
    "insumoId": "insu-real-chicken-breast-4-10-lb",
    "cantidad": 6.6667
  },
  {
    "id": "ri-real-334",
    "recetaId": "receta-real-prod-real-chop-chop-lg-mexican-chop-chop-14",
    "insumoId": "insu-real-black-bean-seasoned",
    "cantidad": 6
  },
  {
    "id": "ri-real-335",
    "recetaId": "receta-real-prod-real-chop-chop-lg-mexican-chop-chop-14",
    "insumoId": "insu-real-curry-pwdr-4-4-lb",
    "cantidad": 0.1344
  },
  {
    "id": "ri-real-336",
    "recetaId": "receta-real-prod-real-chop-chop-lg-mexican-chop-chop-14",
    "insumoId": "insu-real-white-rice-50-lb",
    "cantidad": 4.8302
  },
  {
    "id": "ri-real-337",
    "recetaId": "receta-real-prod-real-chop-chop-lg-mexican-chop-chop-14",
    "insumoId": "insu-real-veg-oil",
    "cantidad": 0.3019
  },
  {
    "id": "ri-real-338",
    "recetaId": "receta-real-prod-real-chop-chop-lg-mexican-chop-chop-14",
    "insumoId": "insu-real-forks",
    "cantidad": 1
  },
  {
    "id": "ri-real-339",
    "recetaId": "receta-real-prod-real-chop-chop-lg-mexican-chop-chop-14",
    "insumoId": "insu-real-mustard-country-style-4-1-gal",
    "cantidad": 0.0672
  },
  {
    "id": "ri-real-340",
    "recetaId": "receta-real-prod-real-chop-chop-lg-mexican-chop-chop-14",
    "insumoId": "insu-real-base-chicken-lemon",
    "cantidad": 0.1458
  },
  {
    "id": "ri-real-341",
    "recetaId": "receta-real-prod-real-chop-chop-lg-mexican-chop-chop-14",
    "insumoId": "insu-real-bag-t-shirt-12x6x21",
    "cantidad": 1
  },
  {
    "id": "ri-real-342",
    "recetaId": "receta-real-prod-real-chop-chop-lg-mexican-chop-chop-14",
    "insumoId": "insu-real-clear-lid-lg-bowl",
    "cantidad": 1
  },
  {
    "id": "ri-real-343",
    "recetaId": "receta-real-prod-real-chop-chop-lg-mexican-chop-chop-14",
    "insumoId": "insu-real-tomato-25-lb",
    "cantidad": 4
  },
  {
    "id": "ri-real-344",
    "recetaId": "receta-real-prod-real-chop-chop-lg-mexican-chop-chop-14",
    "insumoId": "insu-real-lettuce-shred-1-8",
    "cantidad": 4
  },
  {
    "id": "ri-real-345",
    "recetaId": "receta-real-prod-real-chop-chop-lg-mexican-chop-chop-14",
    "insumoId": "insu-real-onion-ylw-jumbo-frsh-bag",
    "cantidad": 0.6038
  },
  {
    "id": "ri-real-346",
    "recetaId": "receta-real-prod-real-chop-chop-lg-mexican-chop-chop-14",
    "insumoId": "insu-real-sour-cream-pouch-pack",
    "cantidad": 2.324
  },
  {
    "id": "ri-real-347",
    "recetaId": "receta-real-prod-real-chop-chop-lg-mexican-chop-chop-14",
    "insumoId": "insu-real-base-chicken-caldo-de-pollo",
    "cantidad": 0.1509
  },
  {
    "id": "ri-real-348",
    "recetaId": "receta-real-prod-real-chop-chop-lg-bazooka-chop-chop-15",
    "insumoId": "insu-real-lid-for-1-5-oz-souffle-cup-portion-cup-2500-pcs",
    "cantidad": 3
  },
  {
    "id": "ri-real-349",
    "recetaId": "receta-real-prod-real-chop-chop-lg-bazooka-chop-chop-15",
    "insumoId": "insu-real-1-5-oz-clear-plastic-souffle-cup-portion-cup-25",
    "cantidad": 3
  },
  {
    "id": "ri-real-350",
    "recetaId": "receta-real-prod-real-chop-chop-lg-bazooka-chop-chop-15",
    "insumoId": "insu-real-large-plate-35oz-round-black-container-only-base",
    "cantidad": 1
  },
  {
    "id": "ri-real-351",
    "recetaId": "receta-real-prod-real-chop-chop-lg-bazooka-chop-chop-15",
    "insumoId": "insu-real-limes-200-ct",
    "cantidad": 0.0609
  },
  {
    "id": "ri-real-352",
    "recetaId": "receta-real-prod-real-chop-chop-lg-bazooka-chop-chop-15",
    "insumoId": "insu-real-food-coloring-ylw-pwdr",
    "cantidad": 0.0012
  },
  {
    "id": "ri-real-353",
    "recetaId": "receta-real-prod-real-chop-chop-lg-bazooka-chop-chop-15",
    "insumoId": "insu-real-garlic-whl-pld-frsh",
    "cantidad": 0.054
  },
  {
    "id": "ri-real-354",
    "recetaId": "receta-real-prod-real-chop-chop-lg-bazooka-chop-chop-15",
    "insumoId": "insu-real-avocado-ripe-48-ct",
    "cantidad": 0.2857
  },
  {
    "id": "ri-real-355",
    "recetaId": "receta-real-prod-real-chop-chop-lg-bazooka-chop-chop-15",
    "insumoId": "insu-real-peppers-jalapeno",
    "cantidad": 0.0571
  },
  {
    "id": "ri-real-356",
    "recetaId": "receta-real-prod-real-chop-chop-lg-bazooka-chop-chop-15",
    "insumoId": "insu-real-mayo-4-1-gal",
    "cantidad": 2.7264
  },
  {
    "id": "ri-real-357",
    "recetaId": "receta-real-prod-real-chop-chop-lg-bazooka-chop-chop-15",
    "insumoId": "insu-real-salt-iodized-granular",
    "cantidad": 0.2576
  },
  {
    "id": "ri-real-358",
    "recetaId": "receta-real-prod-real-chop-chop-lg-bazooka-chop-chop-15",
    "insumoId": "insu-real-bread-pita-white-12-10-ct",
    "cantidad": 1
  },
  {
    "id": "ri-real-359",
    "recetaId": "receta-real-prod-real-chop-chop-lg-bazooka-chop-chop-15",
    "insumoId": "insu-real-napkin-xpress-nat-13-x-8-6",
    "cantidad": 3
  },
  {
    "id": "ri-real-360",
    "recetaId": "receta-real-prod-real-chop-chop-lg-bazooka-chop-chop-15",
    "insumoId": "insu-real-cheese-ched-mild-shred-fancy",
    "cantidad": 4
  },
  {
    "id": "ri-real-361",
    "recetaId": "receta-real-prod-real-chop-chop-lg-bazooka-chop-chop-15",
    "insumoId": "insu-real-cilantro-short-stemmed-30-ct",
    "cantidad": 0.0751
  },
  {
    "id": "ri-real-362",
    "recetaId": "receta-real-prod-real-chop-chop-lg-bazooka-chop-chop-15",
    "insumoId": "insu-real-chicken-breast-4-10-lb",
    "cantidad": 5.3333
  },
  {
    "id": "ri-real-363",
    "recetaId": "receta-real-prod-real-chop-chop-lg-bazooka-chop-chop-15",
    "insumoId": "insu-real-black-bean-seasoned",
    "cantidad": 6
  },
  {
    "id": "ri-real-364",
    "recetaId": "receta-real-prod-real-chop-chop-lg-bazooka-chop-chop-15",
    "insumoId": "insu-real-curry-pwdr-4-4-lb",
    "cantidad": 0.1344
  },
  {
    "id": "ri-real-365",
    "recetaId": "receta-real-prod-real-chop-chop-lg-bazooka-chop-chop-15",
    "insumoId": "insu-real-white-rice-50-lb",
    "cantidad": 6.0377
  },
  {
    "id": "ri-real-366",
    "recetaId": "receta-real-prod-real-chop-chop-lg-bazooka-chop-chop-15",
    "insumoId": "insu-real-veg-oil",
    "cantidad": 0.3774
  },
  {
    "id": "ri-real-367",
    "recetaId": "receta-real-prod-real-chop-chop-lg-bazooka-chop-chop-15",
    "insumoId": "insu-real-forks",
    "cantidad": 1
  },
  {
    "id": "ri-real-368",
    "recetaId": "receta-real-prod-real-chop-chop-lg-bazooka-chop-chop-15",
    "insumoId": "insu-real-mustard-country-style-4-1-gal",
    "cantidad": 0.0672
  },
  {
    "id": "ri-real-369",
    "recetaId": "receta-real-prod-real-chop-chop-lg-bazooka-chop-chop-15",
    "insumoId": "insu-real-base-chicken-lemon",
    "cantidad": 0.1167
  },
  {
    "id": "ri-real-370",
    "recetaId": "receta-real-prod-real-chop-chop-lg-bazooka-chop-chop-15",
    "insumoId": "insu-real-bag-t-shirt-12x6x21",
    "cantidad": 1
  },
  {
    "id": "ri-real-371",
    "recetaId": "receta-real-prod-real-chop-chop-lg-bazooka-chop-chop-15",
    "insumoId": "insu-real-clear-lid-lg-bowl",
    "cantidad": 1
  },
  {
    "id": "ri-real-372",
    "recetaId": "receta-real-prod-real-chop-chop-lg-bazooka-chop-chop-15",
    "insumoId": "insu-real-tomato-25-lb",
    "cantidad": 4.4571
  },
  {
    "id": "ri-real-373",
    "recetaId": "receta-real-prod-real-chop-chop-lg-bazooka-chop-chop-15",
    "insumoId": "insu-real-lettuce-shred-1-8",
    "cantidad": 4
  },
  {
    "id": "ri-real-374",
    "recetaId": "receta-real-prod-real-chop-chop-lg-bazooka-chop-chop-15",
    "insumoId": "insu-real-onion-red-jumbo",
    "cantidad": 0.1143
  },
  {
    "id": "ri-real-375",
    "recetaId": "receta-real-prod-real-chop-chop-lg-bazooka-chop-chop-15",
    "insumoId": "insu-real-onion-ylw-jumbo-frsh-bag",
    "cantidad": 0.7547
  },
  {
    "id": "ri-real-376",
    "recetaId": "receta-real-prod-real-chop-chop-lg-bazooka-chop-chop-15",
    "insumoId": "insu-real-sour-cream-pouch-pack",
    "cantidad": 2.324
  },
  {
    "id": "ri-real-377",
    "recetaId": "receta-real-prod-real-chop-chop-lg-bazooka-chop-chop-15",
    "insumoId": "insu-real-base-chicken-caldo-de-pollo",
    "cantidad": 0.1887
  },
  {
    "id": "ri-real-378",
    "recetaId": "receta-real-prod-real-chop-chop-lg-no-carb-chop-chop-16",
    "insumoId": "insu-real-lid-for-1-5-oz-souffle-cup-portion-cup-2500-pcs",
    "cantidad": 3
  },
  {
    "id": "ri-real-379",
    "recetaId": "receta-real-prod-real-chop-chop-lg-no-carb-chop-chop-16",
    "insumoId": "insu-real-1-5-oz-clear-plastic-souffle-cup-portion-cup-25",
    "cantidad": 3
  },
  {
    "id": "ri-real-380",
    "recetaId": "receta-real-prod-real-chop-chop-lg-no-carb-chop-chop-16",
    "insumoId": "insu-real-large-plate-35oz-round-black-container-only-base",
    "cantidad": 1
  },
  {
    "id": "ri-real-381",
    "recetaId": "receta-real-prod-real-chop-chop-lg-no-carb-chop-chop-16",
    "insumoId": "insu-real-limes-200-ct",
    "cantidad": 0.018
  },
  {
    "id": "ri-real-382",
    "recetaId": "receta-real-prod-real-chop-chop-lg-no-carb-chop-chop-16",
    "insumoId": "insu-real-garlic-whl-pld-frsh",
    "cantidad": 0.054
  },
  {
    "id": "ri-real-383",
    "recetaId": "receta-real-prod-real-chop-chop-lg-no-carb-chop-chop-16",
    "insumoId": "insu-real-mayo-4-1-gal",
    "cantidad": 2.7264
  },
  {
    "id": "ri-real-384",
    "recetaId": "receta-real-prod-real-chop-chop-lg-no-carb-chop-chop-16",
    "insumoId": "insu-real-salt-iodized-granular",
    "cantidad": 0.059
  },
  {
    "id": "ri-real-385",
    "recetaId": "receta-real-prod-real-chop-chop-lg-no-carb-chop-chop-16",
    "insumoId": "insu-real-bread-pita-white-12-10-ct",
    "cantidad": 1
  },
  {
    "id": "ri-real-386",
    "recetaId": "receta-real-prod-real-chop-chop-lg-no-carb-chop-chop-16",
    "insumoId": "insu-real-napkin-xpress-nat-13-x-8-6",
    "cantidad": 3
  },
  {
    "id": "ri-real-387",
    "recetaId": "receta-real-prod-real-chop-chop-lg-no-carb-chop-chop-16",
    "insumoId": "insu-real-cilantro-short-stemmed-30-ct",
    "cantidad": 0.018
  },
  {
    "id": "ri-real-388",
    "recetaId": "receta-real-prod-real-chop-chop-lg-no-carb-chop-chop-16",
    "insumoId": "insu-real-chicken-breast-4-10-lb",
    "cantidad": 5.3333
  },
  {
    "id": "ri-real-389",
    "recetaId": "receta-real-prod-real-chop-chop-lg-no-carb-chop-chop-16",
    "insumoId": "insu-real-curry-pwdr-4-4-lb",
    "cantidad": 0.1344
  },
  {
    "id": "ri-real-390",
    "recetaId": "receta-real-prod-real-chop-chop-lg-no-carb-chop-chop-16",
    "insumoId": "insu-real-forks",
    "cantidad": 1
  },
  {
    "id": "ri-real-391",
    "recetaId": "receta-real-prod-real-chop-chop-lg-no-carb-chop-chop-16",
    "insumoId": "insu-real-mustard-country-style-4-1-gal",
    "cantidad": 0.0672
  },
  {
    "id": "ri-real-392",
    "recetaId": "receta-real-prod-real-chop-chop-lg-no-carb-chop-chop-16",
    "insumoId": "insu-real-base-chicken-lemon",
    "cantidad": 0.1167
  },
  {
    "id": "ri-real-393",
    "recetaId": "receta-real-prod-real-chop-chop-lg-no-carb-chop-chop-16",
    "insumoId": "insu-real-bag-t-shirt-12x6x21",
    "cantidad": 1
  },
  {
    "id": "ri-real-394",
    "recetaId": "receta-real-prod-real-chop-chop-lg-no-carb-chop-chop-16",
    "insumoId": "insu-real-clear-lid-lg-bowl",
    "cantidad": 1
  },
  {
    "id": "ri-real-395",
    "recetaId": "receta-real-prod-real-chop-chop-lg-no-carb-chop-chop-16",
    "insumoId": "insu-real-tomato-25-lb",
    "cantidad": 4
  },
  {
    "id": "ri-real-396",
    "recetaId": "receta-real-prod-real-chop-chop-lg-no-carb-chop-chop-16",
    "insumoId": "insu-real-lettuce-shred-1-8",
    "cantidad": 6
  },
  {
    "id": "ri-real-397",
    "recetaId": "receta-real-prod-real-chop-chop-lg-no-carb-chop-chop-16",
    "insumoId": "insu-real-sour-cream-pouch-pack",
    "cantidad": 0.324
  },
  {
    "id": "ri-real-398",
    "recetaId": "receta-real-prod-real-chop-chop-lg-asian-chop-chop-17",
    "insumoId": "insu-real-food-coloring-ylw-pwdr",
    "cantidad": 0.0009
  },
  {
    "id": "ri-real-399",
    "recetaId": "receta-real-prod-real-chop-chop-lg-asian-chop-chop-17",
    "insumoId": "insu-real-chicken-thigh-meat-b-s-4-10-lb",
    "cantidad": 10
  },
  {
    "id": "ri-real-400",
    "recetaId": "receta-real-prod-real-chop-chop-lg-asian-chop-chop-17",
    "insumoId": "insu-real-salt-iodized-granular",
    "cantidad": 0.1444
  },
  {
    "id": "ri-real-401",
    "recetaId": "receta-real-prod-real-chop-chop-lg-asian-chop-chop-17",
    "insumoId": "insu-real-sesame-seed-whi",
    "cantidad": 0.5
  },
  {
    "id": "ri-real-402",
    "recetaId": "receta-real-prod-real-chop-chop-lg-asian-chop-chop-17",
    "insumoId": "insu-real-glaze-teriyaki-4-4-76-kg",
    "cantidad": 1.75
  },
  {
    "id": "ri-real-403",
    "recetaId": "receta-real-prod-real-chop-chop-lg-asian-chop-chop-17",
    "insumoId": "insu-real-white-rice-50-lb",
    "cantidad": 4.8302
  },
  {
    "id": "ri-real-404",
    "recetaId": "receta-real-prod-real-chop-chop-lg-asian-chop-chop-17",
    "insumoId": "insu-real-veg-oil",
    "cantidad": 0.3019
  },
  {
    "id": "ri-real-405",
    "recetaId": "receta-real-prod-real-chop-chop-lg-asian-chop-chop-17",
    "insumoId": "insu-real-tomato-25-lb",
    "cantidad": 3
  },
  {
    "id": "ri-real-406",
    "recetaId": "receta-real-prod-real-chop-chop-lg-asian-chop-chop-17",
    "insumoId": "insu-real-lettuce-shred-1-8",
    "cantidad": 2
  },
  {
    "id": "ri-real-407",
    "recetaId": "receta-real-prod-real-chop-chop-lg-asian-chop-chop-17",
    "insumoId": "insu-real-onion-ylw-jumbo-frsh-bag",
    "cantidad": 0.6038
  },
  {
    "id": "ri-real-408",
    "recetaId": "receta-real-prod-real-chop-chop-lg-asian-chop-chop-17",
    "insumoId": "insu-real-onion-green-w-t",
    "cantidad": 0.75
  },
  {
    "id": "ri-real-409",
    "recetaId": "receta-real-prod-real-chop-chop-lg-asian-chop-chop-17",
    "insumoId": "insu-real-base-chicken-caldo-de-pollo",
    "cantidad": 0.1509
  },
  {
    "id": "ri-real-410",
    "recetaId": "receta-real-prod-real-chop-chop-lg-teriyaki-chop-chop-18",
    "insumoId": "insu-real-food-coloring-ylw-pwdr",
    "cantidad": 0.0009
  },
  {
    "id": "ri-real-411",
    "recetaId": "receta-real-prod-real-chop-chop-lg-teriyaki-chop-chop-18",
    "insumoId": "insu-real-chicken-thigh-meat-b-s-4-10-lb",
    "cantidad": 11
  },
  {
    "id": "ri-real-412",
    "recetaId": "receta-real-prod-real-chop-chop-lg-teriyaki-chop-chop-18",
    "insumoId": "insu-real-salt-iodized-granular",
    "cantidad": 0.1476
  },
  {
    "id": "ri-real-413",
    "recetaId": "receta-real-prod-real-chop-chop-lg-teriyaki-chop-chop-18",
    "insumoId": "insu-real-glaze-teriyaki-4-4-76-kg",
    "cantidad": 1.925
  },
  {
    "id": "ri-real-414",
    "recetaId": "receta-real-prod-real-chop-chop-lg-teriyaki-chop-chop-18",
    "insumoId": "insu-real-white-rice-50-lb",
    "cantidad": 4.8302
  },
  {
    "id": "ri-real-415",
    "recetaId": "receta-real-prod-real-chop-chop-lg-teriyaki-chop-chop-18",
    "insumoId": "insu-real-veg-oil",
    "cantidad": 0.3019
  },
  {
    "id": "ri-real-416",
    "recetaId": "receta-real-prod-real-chop-chop-lg-teriyaki-chop-chop-18",
    "insumoId": "insu-real-onion-ylw-jumbo-frsh-bag",
    "cantidad": 0.6038
  },
  {
    "id": "ri-real-417",
    "recetaId": "receta-real-prod-real-chop-chop-lg-teriyaki-chop-chop-18",
    "insumoId": "insu-real-base-chicken-caldo-de-pollo",
    "cantidad": 0.1509
  },
  {
    "id": "ri-real-418",
    "recetaId": "receta-real-prod-real-chop-chop-lg-vegetarian-chop-chop-19",
    "insumoId": "insu-real-limes-200-ct",
    "cantidad": 0.0643
  },
  {
    "id": "ri-real-419",
    "recetaId": "receta-real-prod-real-chop-chop-lg-vegetarian-chop-chop-19",
    "insumoId": "insu-real-food-coloring-ylw-pwdr",
    "cantidad": 0.0009
  },
  {
    "id": "ri-real-420",
    "recetaId": "receta-real-prod-real-chop-chop-lg-vegetarian-chop-chop-19",
    "insumoId": "insu-real-avocado-ripe-48-ct",
    "cantidad": 0.4286
  },
  {
    "id": "ri-real-421",
    "recetaId": "receta-real-prod-real-chop-chop-lg-vegetarian-chop-chop-19",
    "insumoId": "insu-real-peppers-jalapeno",
    "cantidad": 0.0857
  },
  {
    "id": "ri-real-422",
    "recetaId": "receta-real-prod-real-chop-chop-lg-vegetarian-chop-chop-19",
    "insumoId": "insu-real-salt-iodized-granular",
    "cantidad": 0.1989
  },
  {
    "id": "ri-real-423",
    "recetaId": "receta-real-prod-real-chop-chop-lg-vegetarian-chop-chop-19",
    "insumoId": "insu-real-cheese-ched-mild-shred-fancy",
    "cantidad": 1.5
  },
  {
    "id": "ri-real-424",
    "recetaId": "receta-real-prod-real-chop-chop-lg-vegetarian-chop-chop-19",
    "insumoId": "insu-real-cilantro-short-stemmed-30-ct",
    "cantidad": 0.0857
  },
  {
    "id": "ri-real-425",
    "recetaId": "receta-real-prod-real-chop-chop-lg-vegetarian-chop-chop-19",
    "insumoId": "insu-real-black-bean-seasoned",
    "cantidad": 46.6667
  },
  {
    "id": "ri-real-426",
    "recetaId": "receta-real-prod-real-chop-chop-lg-vegetarian-chop-chop-19",
    "insumoId": "insu-real-white-rice-50-lb",
    "cantidad": 4.8302
  },
  {
    "id": "ri-real-427",
    "recetaId": "receta-real-prod-real-chop-chop-lg-vegetarian-chop-chop-19",
    "insumoId": "insu-real-veg-oil",
    "cantidad": 0.3019
  },
  {
    "id": "ri-real-428",
    "recetaId": "receta-real-prod-real-chop-chop-lg-vegetarian-chop-chop-19",
    "insumoId": "insu-real-tomato-25-lb",
    "cantidad": 3.6857
  },
  {
    "id": "ri-real-429",
    "recetaId": "receta-real-prod-real-chop-chop-lg-vegetarian-chop-chop-19",
    "insumoId": "insu-real-lettuce-shred-1-8",
    "cantidad": 2
  },
  {
    "id": "ri-real-430",
    "recetaId": "receta-real-prod-real-chop-chop-lg-vegetarian-chop-chop-19",
    "insumoId": "insu-real-onion-red-jumbo",
    "cantidad": 0.1714
  },
  {
    "id": "ri-real-431",
    "recetaId": "receta-real-prod-real-chop-chop-lg-vegetarian-chop-chop-19",
    "insumoId": "insu-real-onion-ylw-jumbo-frsh-bag",
    "cantidad": 0.6038
  },
  {
    "id": "ri-real-432",
    "recetaId": "receta-real-prod-real-chop-chop-lg-vegetarian-chop-chop-19",
    "insumoId": "insu-real-sour-cream-pouch-pack",
    "cantidad": 12
  },
  {
    "id": "ri-real-433",
    "recetaId": "receta-real-prod-real-chop-chop-lg-vegetarian-chop-chop-19",
    "insumoId": "insu-real-base-chicken-caldo-de-pollo",
    "cantidad": 0.1509
  },
  {
    "id": "ri-real-434",
    "recetaId": "receta-real-prod-real-chop-chop-lg-make-your-own-chop-c-20",
    "insumoId": "insu-real-10-80-oz-high-pro-bowl-polypro-25-cs-black",
    "cantidad": 1
  },
  {
    "id": "ri-real-435",
    "recetaId": "receta-real-prod-real-chop-chop-lg-make-your-own-chop-c-20",
    "insumoId": "insu-real-food-coloring-ylw-pwdr",
    "cantidad": 0.0009
  },
  {
    "id": "ri-real-436",
    "recetaId": "receta-real-prod-real-chop-chop-lg-make-your-own-chop-c-20",
    "insumoId": "insu-real-salt-iodized-granular",
    "cantidad": 0.1757
  },
  {
    "id": "ri-real-437",
    "recetaId": "receta-real-prod-real-chop-chop-lg-make-your-own-chop-c-20",
    "insumoId": "insu-real-bread-pita-white-12-10-ct",
    "cantidad": 1
  },
  {
    "id": "ri-real-438",
    "recetaId": "receta-real-prod-real-chop-chop-lg-make-your-own-chop-c-20",
    "insumoId": "insu-real-chicken-breast-4-10-lb",
    "cantidad": 6.6667
  },
  {
    "id": "ri-real-439",
    "recetaId": "receta-real-prod-real-chop-chop-lg-make-your-own-chop-c-20",
    "insumoId": "insu-real-white-rice-50-lb",
    "cantidad": 4.8302
  },
  {
    "id": "ri-real-440",
    "recetaId": "receta-real-prod-real-chop-chop-lg-make-your-own-chop-c-20",
    "insumoId": "insu-real-veg-oil",
    "cantidad": 0.3019
  },
  {
    "id": "ri-real-441",
    "recetaId": "receta-real-prod-real-chop-chop-lg-make-your-own-chop-c-20",
    "insumoId": "insu-real-forks",
    "cantidad": 1
  },
  {
    "id": "ri-real-442",
    "recetaId": "receta-real-prod-real-chop-chop-lg-make-your-own-chop-c-20",
    "insumoId": "insu-real-base-chicken-lemon",
    "cantidad": 0.1458
  },
  {
    "id": "ri-real-443",
    "recetaId": "receta-real-prod-real-chop-chop-lg-make-your-own-chop-c-20",
    "insumoId": "insu-real-onion-ylw-jumbo-frsh-bag",
    "cantidad": 0.6038
  },
  {
    "id": "ri-real-444",
    "recetaId": "receta-real-prod-real-chop-chop-lg-make-your-own-chop-c-20",
    "insumoId": "insu-real-base-chicken-caldo-de-pollo",
    "cantidad": 0.1509
  },
  {
    "id": "ri-real-445",
    "recetaId": "receta-real-prod-real-chop-chop-original-chop-chop-21",
    "insumoId": "insu-real-food-coloring-ylw-pwdr",
    "cantidad": 0.0028
  },
  {
    "id": "ri-real-446",
    "recetaId": "receta-real-prod-real-chop-chop-original-chop-chop-21",
    "insumoId": "insu-real-salt-iodized-granular",
    "cantidad": 0.5896
  },
  {
    "id": "ri-real-447",
    "recetaId": "receta-real-prod-real-chop-chop-original-chop-chop-21",
    "insumoId": "insu-real-chicken-breast-4-10-lb",
    "cantidad": 26.6667
  },
  {
    "id": "ri-real-448",
    "recetaId": "receta-real-prod-real-chop-chop-original-chop-chop-21",
    "insumoId": "insu-real-white-rice-50-lb",
    "cantidad": 14.4906
  },
  {
    "id": "ri-real-449",
    "recetaId": "receta-real-prod-real-chop-chop-original-chop-chop-21",
    "insumoId": "insu-real-veg-oil",
    "cantidad": 0.9057
  },
  {
    "id": "ri-real-450",
    "recetaId": "receta-real-prod-real-chop-chop-original-chop-chop-21",
    "insumoId": "insu-real-base-chicken-lemon",
    "cantidad": 0.5833
  },
  {
    "id": "ri-real-451",
    "recetaId": "receta-real-prod-real-chop-chop-original-chop-chop-21",
    "insumoId": "insu-real-onion-ylw-jumbo-frsh-bag",
    "cantidad": 1.8113
  },
  {
    "id": "ri-real-452",
    "recetaId": "receta-real-prod-real-chop-chop-original-chop-chop-21",
    "insumoId": "insu-real-base-chicken-caldo-de-pollo",
    "cantidad": 0.4528
  },
  {
    "id": "ri-real-453",
    "recetaId": "receta-real-prod-real-chop-chop-deluxe-chop-chop-22",
    "insumoId": "insu-real-food-coloring-ylw-pwdr",
    "cantidad": 0.0028
  },
  {
    "id": "ri-real-454",
    "recetaId": "receta-real-prod-real-chop-chop-deluxe-chop-chop-22",
    "insumoId": "insu-real-salt-iodized-granular",
    "cantidad": 0.5896
  },
  {
    "id": "ri-real-455",
    "recetaId": "receta-real-prod-real-chop-chop-deluxe-chop-chop-22",
    "insumoId": "insu-real-chicken-breast-4-10-lb",
    "cantidad": 26.6667
  },
  {
    "id": "ri-real-456",
    "recetaId": "receta-real-prod-real-chop-chop-deluxe-chop-chop-22",
    "insumoId": "insu-real-white-rice-50-lb",
    "cantidad": 14.4906
  },
  {
    "id": "ri-real-457",
    "recetaId": "receta-real-prod-real-chop-chop-deluxe-chop-chop-22",
    "insumoId": "insu-real-veg-oil",
    "cantidad": 0.9057
  },
  {
    "id": "ri-real-458",
    "recetaId": "receta-real-prod-real-chop-chop-deluxe-chop-chop-22",
    "insumoId": "insu-real-base-chicken-lemon",
    "cantidad": 0.5833
  },
  {
    "id": "ri-real-459",
    "recetaId": "receta-real-prod-real-chop-chop-deluxe-chop-chop-22",
    "insumoId": "insu-real-tomato-25-lb",
    "cantidad": 6
  },
  {
    "id": "ri-real-460",
    "recetaId": "receta-real-prod-real-chop-chop-deluxe-chop-chop-22",
    "insumoId": "insu-real-lettuce-shred-1-8",
    "cantidad": 6
  },
  {
    "id": "ri-real-461",
    "recetaId": "receta-real-prod-real-chop-chop-deluxe-chop-chop-22",
    "insumoId": "insu-real-onion-ylw-jumbo-frsh-bag",
    "cantidad": 1.8113
  },
  {
    "id": "ri-real-462",
    "recetaId": "receta-real-prod-real-chop-chop-deluxe-chop-chop-22",
    "insumoId": "insu-real-base-chicken-caldo-de-pollo",
    "cantidad": 0.4528
  },
  {
    "id": "ri-real-463",
    "recetaId": "receta-real-prod-real-chop-chop-cuban-chop-chop-23",
    "insumoId": "insu-real-food-coloring-ylw-pwdr",
    "cantidad": 0.0028
  },
  {
    "id": "ri-real-464",
    "recetaId": "receta-real-prod-real-chop-chop-cuban-chop-chop-23",
    "insumoId": "insu-real-salt-iodized-granular",
    "cantidad": 0.5896
  },
  {
    "id": "ri-real-465",
    "recetaId": "receta-real-prod-real-chop-chop-cuban-chop-chop-23",
    "insumoId": "insu-real-chicken-breast-4-10-lb",
    "cantidad": 26.6667
  },
  {
    "id": "ri-real-466",
    "recetaId": "receta-real-prod-real-chop-chop-cuban-chop-chop-23",
    "insumoId": "insu-real-black-bean-seasoned",
    "cantidad": 74.6667
  },
  {
    "id": "ri-real-467",
    "recetaId": "receta-real-prod-real-chop-chop-cuban-chop-chop-23",
    "insumoId": "insu-real-white-rice-50-lb",
    "cantidad": 14.4906
  },
  {
    "id": "ri-real-468",
    "recetaId": "receta-real-prod-real-chop-chop-cuban-chop-chop-23",
    "insumoId": "insu-real-veg-oil",
    "cantidad": 0.9057
  },
  {
    "id": "ri-real-469",
    "recetaId": "receta-real-prod-real-chop-chop-cuban-chop-chop-23",
    "insumoId": "insu-real-base-chicken-lemon",
    "cantidad": 0.5833
  },
  {
    "id": "ri-real-470",
    "recetaId": "receta-real-prod-real-chop-chop-cuban-chop-chop-23",
    "insumoId": "insu-real-tomato-25-lb",
    "cantidad": 6
  },
  {
    "id": "ri-real-471",
    "recetaId": "receta-real-prod-real-chop-chop-cuban-chop-chop-23",
    "insumoId": "insu-real-lettuce-shred-1-8",
    "cantidad": 6
  },
  {
    "id": "ri-real-472",
    "recetaId": "receta-real-prod-real-chop-chop-cuban-chop-chop-23",
    "insumoId": "insu-real-onion-ylw-jumbo-frsh-bag",
    "cantidad": 1.8113
  },
  {
    "id": "ri-real-473",
    "recetaId": "receta-real-prod-real-chop-chop-cuban-chop-chop-23",
    "insumoId": "insu-real-base-chicken-caldo-de-pollo",
    "cantidad": 0.4528
  },
  {
    "id": "ri-real-474",
    "recetaId": "receta-real-prod-real-chop-chop-mexican-chop-chop-24",
    "insumoId": "insu-real-food-coloring-ylw-pwdr",
    "cantidad": 0.0028
  },
  {
    "id": "ri-real-475",
    "recetaId": "receta-real-prod-real-chop-chop-mexican-chop-chop-24",
    "insumoId": "insu-real-salt-iodized-granular",
    "cantidad": 0.5896
  },
  {
    "id": "ri-real-476",
    "recetaId": "receta-real-prod-real-chop-chop-mexican-chop-chop-24",
    "insumoId": "insu-real-cheese-ched-mild-shred-fancy",
    "cantidad": 8
  },
  {
    "id": "ri-real-477",
    "recetaId": "receta-real-prod-real-chop-chop-mexican-chop-chop-24",
    "insumoId": "insu-real-chicken-breast-4-10-lb",
    "cantidad": 26.6667
  },
  {
    "id": "ri-real-478",
    "recetaId": "receta-real-prod-real-chop-chop-mexican-chop-chop-24",
    "insumoId": "insu-real-black-bean-seasoned",
    "cantidad": 74.6667
  },
  {
    "id": "ri-real-479",
    "recetaId": "receta-real-prod-real-chop-chop-mexican-chop-chop-24",
    "insumoId": "insu-real-white-rice-50-lb",
    "cantidad": 14.4906
  },
  {
    "id": "ri-real-480",
    "recetaId": "receta-real-prod-real-chop-chop-mexican-chop-chop-24",
    "insumoId": "insu-real-veg-oil",
    "cantidad": 0.9057
  },
  {
    "id": "ri-real-481",
    "recetaId": "receta-real-prod-real-chop-chop-mexican-chop-chop-24",
    "insumoId": "insu-real-base-chicken-lemon",
    "cantidad": 0.5833
  },
  {
    "id": "ri-real-482",
    "recetaId": "receta-real-prod-real-chop-chop-mexican-chop-chop-24",
    "insumoId": "insu-real-tomato-25-lb",
    "cantidad": 6
  },
  {
    "id": "ri-real-483",
    "recetaId": "receta-real-prod-real-chop-chop-mexican-chop-chop-24",
    "insumoId": "insu-real-lettuce-shred-1-8",
    "cantidad": 6
  },
  {
    "id": "ri-real-484",
    "recetaId": "receta-real-prod-real-chop-chop-mexican-chop-chop-24",
    "insumoId": "insu-real-onion-ylw-jumbo-frsh-bag",
    "cantidad": 1.8113
  },
  {
    "id": "ri-real-485",
    "recetaId": "receta-real-prod-real-chop-chop-mexican-chop-chop-24",
    "insumoId": "insu-real-sour-cream-pouch-pack",
    "cantidad": 1
  },
  {
    "id": "ri-real-486",
    "recetaId": "receta-real-prod-real-chop-chop-mexican-chop-chop-24",
    "insumoId": "insu-real-base-chicken-caldo-de-pollo",
    "cantidad": 0.4528
  },
  {
    "id": "ri-real-487",
    "recetaId": "receta-real-prod-real-chop-chop-bazooka-chop-chop-25",
    "insumoId": "insu-real-limes-200-ct",
    "cantidad": 0.3429
  },
  {
    "id": "ri-real-488",
    "recetaId": "receta-real-prod-real-chop-chop-bazooka-chop-chop-25",
    "insumoId": "insu-real-food-coloring-ylw-pwdr",
    "cantidad": 0.0028
  },
  {
    "id": "ri-real-489",
    "recetaId": "receta-real-prod-real-chop-chop-bazooka-chop-chop-25",
    "insumoId": "insu-real-avocado-ripe-48-ct",
    "cantidad": 2.2857
  },
  {
    "id": "ri-real-490",
    "recetaId": "receta-real-prod-real-chop-chop-bazooka-chop-chop-25",
    "insumoId": "insu-real-peppers-jalapeno",
    "cantidad": 0.4571
  },
  {
    "id": "ri-real-491",
    "recetaId": "receta-real-prod-real-chop-chop-bazooka-chop-chop-25",
    "insumoId": "insu-real-salt-iodized-granular",
    "cantidad": 1.0467
  },
  {
    "id": "ri-real-492",
    "recetaId": "receta-real-prod-real-chop-chop-bazooka-chop-chop-25",
    "insumoId": "insu-real-cheese-ched-mild-shred-fancy",
    "cantidad": 8
  },
  {
    "id": "ri-real-493",
    "recetaId": "receta-real-prod-real-chop-chop-bazooka-chop-chop-25",
    "insumoId": "insu-real-cilantro-short-stemmed-30-ct",
    "cantidad": 0.4571
  },
  {
    "id": "ri-real-494",
    "recetaId": "receta-real-prod-real-chop-chop-bazooka-chop-chop-25",
    "insumoId": "insu-real-chicken-breast-4-10-lb",
    "cantidad": 26.6667
  },
  {
    "id": "ri-real-495",
    "recetaId": "receta-real-prod-real-chop-chop-bazooka-chop-chop-25",
    "insumoId": "insu-real-black-bean-seasoned",
    "cantidad": 149.3333
  },
  {
    "id": "ri-real-496",
    "recetaId": "receta-real-prod-real-chop-chop-bazooka-chop-chop-25",
    "insumoId": "insu-real-white-rice-50-lb",
    "cantidad": 14.4906
  },
  {
    "id": "ri-real-497",
    "recetaId": "receta-real-prod-real-chop-chop-bazooka-chop-chop-25",
    "insumoId": "insu-real-veg-oil",
    "cantidad": 0.9057
  },
  {
    "id": "ri-real-498",
    "recetaId": "receta-real-prod-real-chop-chop-bazooka-chop-chop-25",
    "insumoId": "insu-real-base-chicken-lemon",
    "cantidad": 0.5833
  },
  {
    "id": "ri-real-499",
    "recetaId": "receta-real-prod-real-chop-chop-bazooka-chop-chop-25",
    "insumoId": "insu-real-tomato-25-lb",
    "cantidad": 9.6571
  },
  {
    "id": "ri-real-500",
    "recetaId": "receta-real-prod-real-chop-chop-bazooka-chop-chop-25",
    "insumoId": "insu-real-lettuce-shred-1-8",
    "cantidad": 6
  },
  {
    "id": "ri-real-501",
    "recetaId": "receta-real-prod-real-chop-chop-bazooka-chop-chop-25",
    "insumoId": "insu-real-onion-red-jumbo",
    "cantidad": 0.9143
  },
  {
    "id": "ri-real-502",
    "recetaId": "receta-real-prod-real-chop-chop-bazooka-chop-chop-25",
    "insumoId": "insu-real-onion-ylw-jumbo-frsh-bag",
    "cantidad": 1.8113
  },
  {
    "id": "ri-real-503",
    "recetaId": "receta-real-prod-real-chop-chop-bazooka-chop-chop-25",
    "insumoId": "insu-real-sour-cream-pouch-pack",
    "cantidad": 1
  },
  {
    "id": "ri-real-504",
    "recetaId": "receta-real-prod-real-chop-chop-bazooka-chop-chop-25",
    "insumoId": "insu-real-base-chicken-caldo-de-pollo",
    "cantidad": 0.4528
  },
  {
    "id": "ri-real-505",
    "recetaId": "receta-real-prod-real-chop-chop-asian-chop-chop-27",
    "insumoId": "insu-real-food-coloring-ylw-pwdr",
    "cantidad": 0.0028
  },
  {
    "id": "ri-real-506",
    "recetaId": "receta-real-prod-real-chop-chop-asian-chop-chop-27",
    "insumoId": "insu-real-chicken-thigh-meat-b-s-4-10-lb",
    "cantidad": 20
  },
  {
    "id": "ri-real-507",
    "recetaId": "receta-real-prod-real-chop-chop-asian-chop-chop-27",
    "insumoId": "insu-real-salt-iodized-granular",
    "cantidad": 0.4021
  },
  {
    "id": "ri-real-508",
    "recetaId": "receta-real-prod-real-chop-chop-asian-chop-chop-27",
    "insumoId": "insu-real-sesame-seed-whi",
    "cantidad": 2.5
  },
  {
    "id": "ri-real-509",
    "recetaId": "receta-real-prod-real-chop-chop-asian-chop-chop-27",
    "insumoId": "insu-real-glaze-teriyaki-4-4-76-kg",
    "cantidad": 3.5
  },
  {
    "id": "ri-real-510",
    "recetaId": "receta-real-prod-real-chop-chop-asian-chop-chop-27",
    "insumoId": "insu-real-white-rice-50-lb",
    "cantidad": 14.4906
  },
  {
    "id": "ri-real-511",
    "recetaId": "receta-real-prod-real-chop-chop-asian-chop-chop-27",
    "insumoId": "insu-real-veg-oil",
    "cantidad": 0.9057
  },
  {
    "id": "ri-real-512",
    "recetaId": "receta-real-prod-real-chop-chop-asian-chop-chop-27",
    "insumoId": "insu-real-tomato-25-lb",
    "cantidad": 6
  },
  {
    "id": "ri-real-513",
    "recetaId": "receta-real-prod-real-chop-chop-asian-chop-chop-27",
    "insumoId": "insu-real-lettuce-shred-1-8",
    "cantidad": 6
  },
  {
    "id": "ri-real-514",
    "recetaId": "receta-real-prod-real-chop-chop-asian-chop-chop-27",
    "insumoId": "insu-real-onion-ylw-jumbo-frsh-bag",
    "cantidad": 1.8113
  },
  {
    "id": "ri-real-515",
    "recetaId": "receta-real-prod-real-chop-chop-asian-chop-chop-27",
    "insumoId": "insu-real-onion-green-w-t",
    "cantidad": 1.5
  },
  {
    "id": "ri-real-516",
    "recetaId": "receta-real-prod-real-chop-chop-asian-chop-chop-27",
    "insumoId": "insu-real-base-chicken-caldo-de-pollo",
    "cantidad": 0.4528
  },
  {
    "id": "ri-real-517",
    "recetaId": "receta-real-prod-real-chop-chop-lg-no-carb-chop-chop-34",
    "insumoId": "insu-real-salt-iodized-granular",
    "cantidad": 0.0562
  },
  {
    "id": "ri-real-518",
    "recetaId": "receta-real-prod-real-chop-chop-lg-no-carb-chop-chop-34",
    "insumoId": "insu-real-chicken-breast-4-10-lb",
    "cantidad": 6
  },
  {
    "id": "ri-real-519",
    "recetaId": "receta-real-prod-real-chop-chop-lg-no-carb-chop-chop-34",
    "insumoId": "insu-real-base-chicken-lemon",
    "cantidad": 0.1312
  },
  {
    "id": "ri-real-520",
    "recetaId": "receta-real-prod-real-chop-chop-lg-no-carb-chop-chop-34",
    "insumoId": "insu-real-tomato-25-lb",
    "cantidad": 3.5
  },
  {
    "id": "ri-real-521",
    "recetaId": "receta-real-prod-real-chop-chop-lg-no-carb-chop-chop-34",
    "insumoId": "insu-real-lettuce-shred-1-8",
    "cantidad": 5.5
  },
  {
    "id": "ri-real-522",
    "recetaId": "receta-real-prod-real-chop-chop-family-original-chop-ch-35",
    "insumoId": "insu-real-food-coloring-ylw-pwdr",
    "cantidad": 0.0028
  },
  {
    "id": "ri-real-523",
    "recetaId": "receta-real-prod-real-chop-chop-family-original-chop-ch-35",
    "insumoId": "insu-real-salt-iodized-granular",
    "cantidad": 0.5896
  },
  {
    "id": "ri-real-524",
    "recetaId": "receta-real-prod-real-chop-chop-family-original-chop-ch-35",
    "insumoId": "insu-real-chicken-breast-4-10-lb",
    "cantidad": 26.6667
  },
  {
    "id": "ri-real-525",
    "recetaId": "receta-real-prod-real-chop-chop-family-original-chop-ch-35",
    "insumoId": "insu-real-white-rice-50-lb",
    "cantidad": 14.4906
  },
  {
    "id": "ri-real-526",
    "recetaId": "receta-real-prod-real-chop-chop-family-original-chop-ch-35",
    "insumoId": "insu-real-veg-oil",
    "cantidad": 0.9057
  },
  {
    "id": "ri-real-527",
    "recetaId": "receta-real-prod-real-chop-chop-family-original-chop-ch-35",
    "insumoId": "insu-real-base-chicken-lemon",
    "cantidad": 0.5833
  },
  {
    "id": "ri-real-528",
    "recetaId": "receta-real-prod-real-chop-chop-family-original-chop-ch-35",
    "insumoId": "insu-real-onion-ylw-jumbo-frsh-bag",
    "cantidad": 1.8113
  },
  {
    "id": "ri-real-529",
    "recetaId": "receta-real-prod-real-chop-chop-family-original-chop-ch-35",
    "insumoId": "insu-real-base-chicken-caldo-de-pollo",
    "cantidad": 0.4528
  },
  {
    "id": "ri-real-530",
    "recetaId": "receta-real-prod-real-chop-chop-family-deluxe-chop-chop-36",
    "insumoId": "insu-real-food-coloring-ylw-pwdr",
    "cantidad": 0.0057
  },
  {
    "id": "ri-real-531",
    "recetaId": "receta-real-prod-real-chop-chop-family-deluxe-chop-chop-36",
    "insumoId": "insu-real-salt-iodized-granular",
    "cantidad": 1.1792
  },
  {
    "id": "ri-real-532",
    "recetaId": "receta-real-prod-real-chop-chop-family-deluxe-chop-chop-36",
    "insumoId": "insu-real-chicken-breast-4-10-lb",
    "cantidad": 53.3333
  },
  {
    "id": "ri-real-533",
    "recetaId": "receta-real-prod-real-chop-chop-family-deluxe-chop-chop-36",
    "insumoId": "insu-real-black-bean-seasoned",
    "cantidad": 149.3333
  },
  {
    "id": "ri-real-534",
    "recetaId": "receta-real-prod-real-chop-chop-family-deluxe-chop-chop-36",
    "insumoId": "insu-real-white-rice-50-lb",
    "cantidad": 28.9811
  },
  {
    "id": "ri-real-535",
    "recetaId": "receta-real-prod-real-chop-chop-family-deluxe-chop-chop-36",
    "insumoId": "insu-real-veg-oil",
    "cantidad": 1.8113
  },
  {
    "id": "ri-real-536",
    "recetaId": "receta-real-prod-real-chop-chop-family-deluxe-chop-chop-36",
    "insumoId": "insu-real-base-chicken-lemon",
    "cantidad": 1.1667
  },
  {
    "id": "ri-real-537",
    "recetaId": "receta-real-prod-real-chop-chop-family-deluxe-chop-chop-36",
    "insumoId": "insu-real-tomato-25-lb",
    "cantidad": 12
  },
  {
    "id": "ri-real-538",
    "recetaId": "receta-real-prod-real-chop-chop-family-deluxe-chop-chop-36",
    "insumoId": "insu-real-lettuce-shred-1-8",
    "cantidad": 12
  },
  {
    "id": "ri-real-539",
    "recetaId": "receta-real-prod-real-chop-chop-family-deluxe-chop-chop-36",
    "insumoId": "insu-real-onion-ylw-jumbo-frsh-bag",
    "cantidad": 3.6226
  },
  {
    "id": "ri-real-540",
    "recetaId": "receta-real-prod-real-chop-chop-family-deluxe-chop-chop-36",
    "insumoId": "insu-real-base-chicken-caldo-de-pollo",
    "cantidad": 0.9057
  },
  {
    "id": "ri-real-541",
    "recetaId": "receta-real-prod-real-chop-chop-family-cuban-chop-chop-37",
    "insumoId": "insu-real-food-coloring-ylw-pwdr",
    "cantidad": 0.0028
  },
  {
    "id": "ri-real-542",
    "recetaId": "receta-real-prod-real-chop-chop-family-cuban-chop-chop-37",
    "insumoId": "insu-real-salt-iodized-granular",
    "cantidad": 0.5896
  },
  {
    "id": "ri-real-543",
    "recetaId": "receta-real-prod-real-chop-chop-family-cuban-chop-chop-37",
    "insumoId": "insu-real-chicken-breast-4-10-lb",
    "cantidad": 26.6667
  },
  {
    "id": "ri-real-544",
    "recetaId": "receta-real-prod-real-chop-chop-family-cuban-chop-chop-37",
    "insumoId": "insu-real-black-bean-seasoned",
    "cantidad": 74.6667
  },
  {
    "id": "ri-real-545",
    "recetaId": "receta-real-prod-real-chop-chop-family-cuban-chop-chop-37",
    "insumoId": "insu-real-white-rice-50-lb",
    "cantidad": 14.4906
  },
  {
    "id": "ri-real-546",
    "recetaId": "receta-real-prod-real-chop-chop-family-cuban-chop-chop-37",
    "insumoId": "insu-real-veg-oil",
    "cantidad": 0.9057
  },
  {
    "id": "ri-real-547",
    "recetaId": "receta-real-prod-real-chop-chop-family-cuban-chop-chop-37",
    "insumoId": "insu-real-base-chicken-lemon",
    "cantidad": 0.5833
  },
  {
    "id": "ri-real-548",
    "recetaId": "receta-real-prod-real-chop-chop-family-cuban-chop-chop-37",
    "insumoId": "insu-real-tomato-25-lb",
    "cantidad": 6
  },
  {
    "id": "ri-real-549",
    "recetaId": "receta-real-prod-real-chop-chop-family-cuban-chop-chop-37",
    "insumoId": "insu-real-lettuce-shred-1-8",
    "cantidad": 6
  },
  {
    "id": "ri-real-550",
    "recetaId": "receta-real-prod-real-chop-chop-family-cuban-chop-chop-37",
    "insumoId": "insu-real-onion-ylw-jumbo-frsh-bag",
    "cantidad": 1.8113
  },
  {
    "id": "ri-real-551",
    "recetaId": "receta-real-prod-real-chop-chop-family-cuban-chop-chop-37",
    "insumoId": "insu-real-base-chicken-caldo-de-pollo",
    "cantidad": 0.4528
  },
  {
    "id": "ri-real-552",
    "recetaId": "receta-real-prod-real-chop-chop-family-mexican-chop-cho-38",
    "insumoId": "insu-real-food-coloring-ylw-pwdr",
    "cantidad": 0.0028
  },
  {
    "id": "ri-real-553",
    "recetaId": "receta-real-prod-real-chop-chop-family-mexican-chop-cho-38",
    "insumoId": "insu-real-salt-iodized-granular",
    "cantidad": 0.5896
  },
  {
    "id": "ri-real-554",
    "recetaId": "receta-real-prod-real-chop-chop-family-mexican-chop-cho-38",
    "insumoId": "insu-real-cheese-ched-mild-shred-fancy",
    "cantidad": 8
  },
  {
    "id": "ri-real-555",
    "recetaId": "receta-real-prod-real-chop-chop-family-mexican-chop-cho-38",
    "insumoId": "insu-real-chicken-breast-4-10-lb",
    "cantidad": 26.6667
  },
  {
    "id": "ri-real-556",
    "recetaId": "receta-real-prod-real-chop-chop-family-mexican-chop-cho-38",
    "insumoId": "insu-real-black-bean-seasoned",
    "cantidad": 74.6667
  },
  {
    "id": "ri-real-557",
    "recetaId": "receta-real-prod-real-chop-chop-family-mexican-chop-cho-38",
    "insumoId": "insu-real-white-rice-50-lb",
    "cantidad": 14.4906
  },
  {
    "id": "ri-real-558",
    "recetaId": "receta-real-prod-real-chop-chop-family-mexican-chop-cho-38",
    "insumoId": "insu-real-veg-oil",
    "cantidad": 0.9057
  },
  {
    "id": "ri-real-559",
    "recetaId": "receta-real-prod-real-chop-chop-family-mexican-chop-cho-38",
    "insumoId": "insu-real-base-chicken-lemon",
    "cantidad": 0.5833
  },
  {
    "id": "ri-real-560",
    "recetaId": "receta-real-prod-real-chop-chop-family-mexican-chop-cho-38",
    "insumoId": "insu-real-tomato-25-lb",
    "cantidad": 6
  },
  {
    "id": "ri-real-561",
    "recetaId": "receta-real-prod-real-chop-chop-family-mexican-chop-cho-38",
    "insumoId": "insu-real-lettuce-shred-1-8",
    "cantidad": 6
  },
  {
    "id": "ri-real-562",
    "recetaId": "receta-real-prod-real-chop-chop-family-mexican-chop-cho-38",
    "insumoId": "insu-real-onion-ylw-jumbo-frsh-bag",
    "cantidad": 1.8113
  },
  {
    "id": "ri-real-563",
    "recetaId": "receta-real-prod-real-chop-chop-family-mexican-chop-cho-38",
    "insumoId": "insu-real-sour-cream-pouch-pack",
    "cantidad": 8
  },
  {
    "id": "ri-real-564",
    "recetaId": "receta-real-prod-real-chop-chop-family-mexican-chop-cho-38",
    "insumoId": "insu-real-base-chicken-caldo-de-pollo",
    "cantidad": 0.4528
  },
  {
    "id": "ri-real-565",
    "recetaId": "receta-real-prod-real-chop-chop-party-original-chop-cho-45",
    "insumoId": "insu-real-food-coloring-ylw-pwdr",
    "cantidad": 0.0057
  },
  {
    "id": "ri-real-566",
    "recetaId": "receta-real-prod-real-chop-chop-party-original-chop-cho-45",
    "insumoId": "insu-real-salt-iodized-granular",
    "cantidad": 1.1792
  },
  {
    "id": "ri-real-567",
    "recetaId": "receta-real-prod-real-chop-chop-party-original-chop-cho-45",
    "insumoId": "insu-real-chicken-breast-4-10-lb",
    "cantidad": 53.3333
  },
  {
    "id": "ri-real-568",
    "recetaId": "receta-real-prod-real-chop-chop-party-original-chop-cho-45",
    "insumoId": "insu-real-white-rice-50-lb",
    "cantidad": 28.9811
  },
  {
    "id": "ri-real-569",
    "recetaId": "receta-real-prod-real-chop-chop-party-original-chop-cho-45",
    "insumoId": "insu-real-veg-oil",
    "cantidad": 1.8113
  },
  {
    "id": "ri-real-570",
    "recetaId": "receta-real-prod-real-chop-chop-party-original-chop-cho-45",
    "insumoId": "insu-real-base-chicken-lemon",
    "cantidad": 1.1667
  },
  {
    "id": "ri-real-571",
    "recetaId": "receta-real-prod-real-chop-chop-party-original-chop-cho-45",
    "insumoId": "insu-real-onion-ylw-jumbo-frsh-bag",
    "cantidad": 3.6226
  },
  {
    "id": "ri-real-572",
    "recetaId": "receta-real-prod-real-chop-chop-party-original-chop-cho-45",
    "insumoId": "insu-real-base-chicken-caldo-de-pollo",
    "cantidad": 0.9057
  },
  {
    "id": "ri-real-573",
    "recetaId": "receta-real-prod-real-chop-chop-party-cuban-chop-chop-47",
    "insumoId": "insu-real-food-coloring-ylw-pwdr",
    "cantidad": 0.0057
  },
  {
    "id": "ri-real-574",
    "recetaId": "receta-real-prod-real-chop-chop-party-cuban-chop-chop-47",
    "insumoId": "insu-real-salt-iodized-granular",
    "cantidad": 1.1792
  },
  {
    "id": "ri-real-575",
    "recetaId": "receta-real-prod-real-chop-chop-party-cuban-chop-chop-47",
    "insumoId": "insu-real-chicken-breast-4-10-lb",
    "cantidad": 53.3333
  },
  {
    "id": "ri-real-576",
    "recetaId": "receta-real-prod-real-chop-chop-party-cuban-chop-chop-47",
    "insumoId": "insu-real-black-bean-seasoned",
    "cantidad": 149.3333
  },
  {
    "id": "ri-real-577",
    "recetaId": "receta-real-prod-real-chop-chop-party-cuban-chop-chop-47",
    "insumoId": "insu-real-white-rice-50-lb",
    "cantidad": 28.9811
  },
  {
    "id": "ri-real-578",
    "recetaId": "receta-real-prod-real-chop-chop-party-cuban-chop-chop-47",
    "insumoId": "insu-real-veg-oil",
    "cantidad": 1.8113
  },
  {
    "id": "ri-real-579",
    "recetaId": "receta-real-prod-real-chop-chop-party-cuban-chop-chop-47",
    "insumoId": "insu-real-base-chicken-lemon",
    "cantidad": 1.1667
  },
  {
    "id": "ri-real-580",
    "recetaId": "receta-real-prod-real-chop-chop-party-cuban-chop-chop-47",
    "insumoId": "insu-real-tomato-25-lb",
    "cantidad": 12
  },
  {
    "id": "ri-real-581",
    "recetaId": "receta-real-prod-real-chop-chop-party-cuban-chop-chop-47",
    "insumoId": "insu-real-lettuce-shred-1-8",
    "cantidad": 12
  },
  {
    "id": "ri-real-582",
    "recetaId": "receta-real-prod-real-chop-chop-party-cuban-chop-chop-47",
    "insumoId": "insu-real-onion-ylw-jumbo-frsh-bag",
    "cantidad": 3.6226
  },
  {
    "id": "ri-real-583",
    "recetaId": "receta-real-prod-real-chop-chop-party-cuban-chop-chop-47",
    "insumoId": "insu-real-base-chicken-caldo-de-pollo",
    "cantidad": 0.9057
  },
  {
    "id": "ri-real-584",
    "recetaId": "receta-real-prod-real-chop-chop-party-mexican-chop-chop-48",
    "insumoId": "insu-real-food-coloring-ylw-pwdr",
    "cantidad": 0.0057
  },
  {
    "id": "ri-real-585",
    "recetaId": "receta-real-prod-real-chop-chop-party-mexican-chop-chop-48",
    "insumoId": "insu-real-salt-iodized-granular",
    "cantidad": 1.1792
  },
  {
    "id": "ri-real-586",
    "recetaId": "receta-real-prod-real-chop-chop-party-mexican-chop-chop-48",
    "insumoId": "insu-real-cheese-ched-mild-shred-fancy",
    "cantidad": 16
  },
  {
    "id": "ri-real-587",
    "recetaId": "receta-real-prod-real-chop-chop-party-mexican-chop-chop-48",
    "insumoId": "insu-real-chicken-breast-4-10-lb",
    "cantidad": 53.3333
  },
  {
    "id": "ri-real-588",
    "recetaId": "receta-real-prod-real-chop-chop-party-mexican-chop-chop-48",
    "insumoId": "insu-real-black-bean-seasoned",
    "cantidad": 149.3333
  },
  {
    "id": "ri-real-589",
    "recetaId": "receta-real-prod-real-chop-chop-party-mexican-chop-chop-48",
    "insumoId": "insu-real-white-rice-50-lb",
    "cantidad": 28.9811
  },
  {
    "id": "ri-real-590",
    "recetaId": "receta-real-prod-real-chop-chop-party-mexican-chop-chop-48",
    "insumoId": "insu-real-veg-oil",
    "cantidad": 1.8113
  },
  {
    "id": "ri-real-591",
    "recetaId": "receta-real-prod-real-chop-chop-party-mexican-chop-chop-48",
    "insumoId": "insu-real-base-chicken-lemon",
    "cantidad": 1.1667
  },
  {
    "id": "ri-real-592",
    "recetaId": "receta-real-prod-real-chop-chop-party-mexican-chop-chop-48",
    "insumoId": "insu-real-tomato-25-lb",
    "cantidad": 12
  },
  {
    "id": "ri-real-593",
    "recetaId": "receta-real-prod-real-chop-chop-party-mexican-chop-chop-48",
    "insumoId": "insu-real-lettuce-shred-1-8",
    "cantidad": 12
  },
  {
    "id": "ri-real-594",
    "recetaId": "receta-real-prod-real-chop-chop-party-mexican-chop-chop-48",
    "insumoId": "insu-real-onion-ylw-jumbo-frsh-bag",
    "cantidad": 3.6226
  },
  {
    "id": "ri-real-595",
    "recetaId": "receta-real-prod-real-chop-chop-party-mexican-chop-chop-48",
    "insumoId": "insu-real-sour-cream-pouch-pack",
    "cantidad": 12
  },
  {
    "id": "ri-real-596",
    "recetaId": "receta-real-prod-real-chop-chop-party-mexican-chop-chop-48",
    "insumoId": "insu-real-base-chicken-caldo-de-pollo",
    "cantidad": 0.9057
  },
  {
    "id": "ri-real-597",
    "recetaId": "receta-real-prod-real-chop-chop-party-bazooka-chop-chop-49",
    "insumoId": "insu-real-limes-200-ct",
    "cantidad": 0.6857
  },
  {
    "id": "ri-real-598",
    "recetaId": "receta-real-prod-real-chop-chop-party-bazooka-chop-chop-49",
    "insumoId": "insu-real-food-coloring-ylw-pwdr",
    "cantidad": 0.0057
  },
  {
    "id": "ri-real-599",
    "recetaId": "receta-real-prod-real-chop-chop-party-bazooka-chop-chop-49",
    "insumoId": "insu-real-avocado-ripe-48-ct",
    "cantidad": 4.5714
  },
  {
    "id": "ri-real-600",
    "recetaId": "receta-real-prod-real-chop-chop-party-bazooka-chop-chop-49",
    "insumoId": "insu-real-peppers-jalapeno",
    "cantidad": 0.9143
  },
  {
    "id": "ri-real-601",
    "recetaId": "receta-real-prod-real-chop-chop-party-bazooka-chop-chop-49",
    "insumoId": "insu-real-salt-iodized-granular",
    "cantidad": 2.0935
  },
  {
    "id": "ri-real-602",
    "recetaId": "receta-real-prod-real-chop-chop-party-bazooka-chop-chop-49",
    "insumoId": "insu-real-cheese-ched-mild-shred-fancy",
    "cantidad": 16
  },
  {
    "id": "ri-real-603",
    "recetaId": "receta-real-prod-real-chop-chop-party-bazooka-chop-chop-49",
    "insumoId": "insu-real-cilantro-short-stemmed-30-ct",
    "cantidad": 0.9143
  },
  {
    "id": "ri-real-604",
    "recetaId": "receta-real-prod-real-chop-chop-party-bazooka-chop-chop-49",
    "insumoId": "insu-real-chicken-breast-4-10-lb",
    "cantidad": 53.3333
  },
  {
    "id": "ri-real-605",
    "recetaId": "receta-real-prod-real-chop-chop-party-bazooka-chop-chop-49",
    "insumoId": "insu-real-black-bean-seasoned",
    "cantidad": 298.6667
  },
  {
    "id": "ri-real-606",
    "recetaId": "receta-real-prod-real-chop-chop-party-bazooka-chop-chop-49",
    "insumoId": "insu-real-white-rice-50-lb",
    "cantidad": 28.9811
  },
  {
    "id": "ri-real-607",
    "recetaId": "receta-real-prod-real-chop-chop-party-bazooka-chop-chop-49",
    "insumoId": "insu-real-veg-oil",
    "cantidad": 1.8113
  },
  {
    "id": "ri-real-608",
    "recetaId": "receta-real-prod-real-chop-chop-party-bazooka-chop-chop-49",
    "insumoId": "insu-real-base-chicken-lemon",
    "cantidad": 1.1667
  },
  {
    "id": "ri-real-609",
    "recetaId": "receta-real-prod-real-chop-chop-party-bazooka-chop-chop-49",
    "insumoId": "insu-real-tomato-25-lb",
    "cantidad": 19.3143
  },
  {
    "id": "ri-real-610",
    "recetaId": "receta-real-prod-real-chop-chop-party-bazooka-chop-chop-49",
    "insumoId": "insu-real-lettuce-shred-1-8",
    "cantidad": 12
  },
  {
    "id": "ri-real-611",
    "recetaId": "receta-real-prod-real-chop-chop-party-bazooka-chop-chop-49",
    "insumoId": "insu-real-onion-red-jumbo",
    "cantidad": 1.8286
  },
  {
    "id": "ri-real-612",
    "recetaId": "receta-real-prod-real-chop-chop-party-bazooka-chop-chop-49",
    "insumoId": "insu-real-onion-ylw-jumbo-frsh-bag",
    "cantidad": 3.6226
  },
  {
    "id": "ri-real-613",
    "recetaId": "receta-real-prod-real-chop-chop-party-bazooka-chop-chop-49",
    "insumoId": "insu-real-sour-cream-pouch-pack",
    "cantidad": 16
  },
  {
    "id": "ri-real-614",
    "recetaId": "receta-real-prod-real-chop-chop-party-bazooka-chop-chop-49",
    "insumoId": "insu-real-base-chicken-caldo-de-pollo",
    "cantidad": 0.9057
  },
  {
    "id": "ri-real-615",
    "recetaId": "receta-real-prod-real-extras-extra-chopped-breast-1",
    "insumoId": "insu-real-salt-iodized-granular",
    "cantidad": 0.05
  },
  {
    "id": "ri-real-616",
    "recetaId": "receta-real-prod-real-extras-extra-chopped-breast-1",
    "insumoId": "insu-real-chicken-breast-4-10-lb",
    "cantidad": 5.3333
  },
  {
    "id": "ri-real-617",
    "recetaId": "receta-real-prod-real-extras-extra-chopped-breast-1",
    "insumoId": "insu-real-base-chicken-lemon",
    "cantidad": 0.1167
  },
  {
    "id": "ri-real-618",
    "recetaId": "receta-real-prod-real-extras-extra-teriyaki-2",
    "insumoId": "insu-real-chicken-thigh-meat-b-s-4-10-lb",
    "cantidad": 3.3333
  },
  {
    "id": "ri-real-619",
    "recetaId": "receta-real-prod-real-extras-extra-teriyaki-2",
    "insumoId": "insu-real-glaze-teriyaki-6-5-lb",
    "cantidad": 0.6667
  },
  {
    "id": "ri-real-620",
    "recetaId": "receta-real-prod-real-extras-pita-bread-white-5",
    "insumoId": "insu-real-bread-pita-white-12-10-ct",
    "cantidad": 0.5
  },
  {
    "id": "ri-real-621",
    "recetaId": "receta-real-prod-real-extras-pita-bread-wheat-6",
    "insumoId": "insu-real-bread-pita-wheat-12-10-ct",
    "cantidad": 0.5
  },
  {
    "id": "ri-real-622",
    "recetaId": "receta-real-prod-real-wrapitos-original-wrapito-1",
    "insumoId": "insu-real-lid-for-1-5-oz-souffle-cup-portion-cup-2500-pcs",
    "cantidad": 2
  },
  {
    "id": "ri-real-623",
    "recetaId": "receta-real-prod-real-wrapitos-original-wrapito-1",
    "insumoId": "insu-real-1-5-oz-clear-plastic-souffle-cup-portion-cup-25",
    "cantidad": 2
  },
  {
    "id": "ri-real-624",
    "recetaId": "receta-real-prod-real-wrapitos-original-wrapito-1",
    "insumoId": "insu-real-limes-200-ct",
    "cantidad": 0.012
  },
  {
    "id": "ri-real-625",
    "recetaId": "receta-real-prod-real-wrapitos-original-wrapito-1",
    "insumoId": "insu-real-food-coloring-ylw-pwdr",
    "cantidad": 0.0017
  },
  {
    "id": "ri-real-626",
    "recetaId": "receta-real-prod-real-wrapitos-original-wrapito-1",
    "insumoId": "insu-real-garlic-whl-pld-frsh",
    "cantidad": 0.036
  },
  {
    "id": "ri-real-627",
    "recetaId": "receta-real-prod-real-wrapitos-original-wrapito-1",
    "insumoId": "insu-real-mayo-4-1-gal",
    "cantidad": 1.8176
  },
  {
    "id": "ri-real-628",
    "recetaId": "receta-real-prod-real-wrapitos-original-wrapito-1",
    "insumoId": "insu-real-salt-iodized-granular",
    "cantidad": 0.2916
  },
  {
    "id": "ri-real-629",
    "recetaId": "receta-real-prod-real-wrapitos-original-wrapito-1",
    "insumoId": "insu-real-napkin-xpress-nat-13-x-8-6",
    "cantidad": 0.006
  },
  {
    "id": "ri-real-630",
    "recetaId": "receta-real-prod-real-wrapitos-original-wrapito-1",
    "insumoId": "insu-real-cilantro-short-stemmed-30-ct",
    "cantidad": 0.012
  },
  {
    "id": "ri-real-631",
    "recetaId": "receta-real-prod-real-wrapitos-original-wrapito-1",
    "insumoId": "insu-real-chicken-breast-4-10-lb",
    "cantidad": 9.3333
  },
  {
    "id": "ri-real-632",
    "recetaId": "receta-real-prod-real-wrapitos-original-wrapito-1",
    "insumoId": "insu-real-curry-pwdr-4-4-lb",
    "cantidad": 0.0896
  },
  {
    "id": "ri-real-633",
    "recetaId": "receta-real-prod-real-wrapitos-original-wrapito-1",
    "insumoId": "insu-real-white-rice-50-lb",
    "cantidad": 8.4528
  },
  {
    "id": "ri-real-634",
    "recetaId": "receta-real-prod-real-wrapitos-original-wrapito-1",
    "insumoId": "insu-real-veg-oil",
    "cantidad": 0.5283
  },
  {
    "id": "ri-real-635",
    "recetaId": "receta-real-prod-real-wrapitos-original-wrapito-1",
    "insumoId": "insu-real-mustard-country-style-4-1-gal",
    "cantidad": 0.0448
  },
  {
    "id": "ri-real-636",
    "recetaId": "receta-real-prod-real-wrapitos-original-wrapito-1",
    "insumoId": "insu-real-base-chicken-lemon",
    "cantidad": 0.2042
  },
  {
    "id": "ri-real-637",
    "recetaId": "receta-real-prod-real-wrapitos-original-wrapito-1",
    "insumoId": "insu-real-bag-t-shirt-12x6x21",
    "cantidad": 0.002
  },
  {
    "id": "ri-real-638",
    "recetaId": "receta-real-prod-real-wrapitos-original-wrapito-1",
    "insumoId": "insu-real-wrap-cushion-foil-14x16-slvr",
    "cantidad": 0.002
  },
  {
    "id": "ri-real-639",
    "recetaId": "receta-real-prod-real-wrapitos-original-wrapito-1",
    "insumoId": "insu-real-onion-ylw-jumbo-frsh-bag",
    "cantidad": 1.0566
  },
  {
    "id": "ri-real-640",
    "recetaId": "receta-real-prod-real-wrapitos-original-wrapito-1",
    "insumoId": "insu-real-sour-cream-pouch-pack",
    "cantidad": 0.216
  },
  {
    "id": "ri-real-641",
    "recetaId": "receta-real-prod-real-wrapitos-original-wrapito-1",
    "insumoId": "insu-real-base-chicken-caldo-de-pollo",
    "cantidad": 0.2642
  },
  {
    "id": "ri-real-642",
    "recetaId": "receta-real-prod-real-wrapitos-deluxe-wrapito-2",
    "insumoId": "insu-real-lid-for-1-5-oz-souffle-cup-portion-cup-2500-pcs",
    "cantidad": 1
  },
  {
    "id": "ri-real-643",
    "recetaId": "receta-real-prod-real-wrapitos-deluxe-wrapito-2",
    "insumoId": "insu-real-1-5-oz-clear-plastic-souffle-cup-portion-cup-25",
    "cantidad": 1
  },
  {
    "id": "ri-real-644",
    "recetaId": "receta-real-prod-real-wrapitos-deluxe-wrapito-2",
    "insumoId": "insu-real-limes-200-ct",
    "cantidad": 0.006
  },
  {
    "id": "ri-real-645",
    "recetaId": "receta-real-prod-real-wrapitos-deluxe-wrapito-2",
    "insumoId": "insu-real-food-coloring-ylw-pwdr",
    "cantidad": 0.0007
  },
  {
    "id": "ri-real-646",
    "recetaId": "receta-real-prod-real-wrapitos-deluxe-wrapito-2",
    "insumoId": "insu-real-garlic-whl-pld-frsh",
    "cantidad": 0.018
  },
  {
    "id": "ri-real-647",
    "recetaId": "receta-real-prod-real-wrapitos-deluxe-wrapito-2",
    "insumoId": "insu-real-mayo-4-1-gal",
    "cantidad": 0.9088
  },
  {
    "id": "ri-real-648",
    "recetaId": "receta-real-prod-real-wrapitos-deluxe-wrapito-2",
    "insumoId": "insu-real-tortilla-flour-13-in",
    "cantidad": 1
  },
  {
    "id": "ri-real-649",
    "recetaId": "receta-real-prod-real-wrapitos-deluxe-wrapito-2",
    "insumoId": "insu-real-salt-iodized-granular",
    "cantidad": 0.1379
  },
  {
    "id": "ri-real-650",
    "recetaId": "receta-real-prod-real-wrapitos-deluxe-wrapito-2",
    "insumoId": "insu-real-napkin-xpress-nat-13-x-8-6",
    "cantidad": 0.006
  },
  {
    "id": "ri-real-651",
    "recetaId": "receta-real-prod-real-wrapitos-deluxe-wrapito-2",
    "insumoId": "insu-real-cilantro-short-stemmed-30-ct",
    "cantidad": 0.006
  },
  {
    "id": "ri-real-652",
    "recetaId": "receta-real-prod-real-wrapitos-deluxe-wrapito-2",
    "insumoId": "insu-real-chicken-breast-4-10-lb",
    "cantidad": 5.3333
  },
  {
    "id": "ri-real-653",
    "recetaId": "receta-real-prod-real-wrapitos-deluxe-wrapito-2",
    "insumoId": "insu-real-curry-pwdr-4-4-lb",
    "cantidad": 0.0448
  },
  {
    "id": "ri-real-654",
    "recetaId": "receta-real-prod-real-wrapitos-deluxe-wrapito-2",
    "insumoId": "insu-real-white-rice-50-lb",
    "cantidad": 3.6226
  },
  {
    "id": "ri-real-655",
    "recetaId": "receta-real-prod-real-wrapitos-deluxe-wrapito-2",
    "insumoId": "insu-real-veg-oil",
    "cantidad": 0.2264
  },
  {
    "id": "ri-real-656",
    "recetaId": "receta-real-prod-real-wrapitos-deluxe-wrapito-2",
    "insumoId": "insu-real-mustard-country-style-4-1-gal",
    "cantidad": 0.0224
  },
  {
    "id": "ri-real-657",
    "recetaId": "receta-real-prod-real-wrapitos-deluxe-wrapito-2",
    "insumoId": "insu-real-base-chicken-lemon",
    "cantidad": 0.1167
  },
  {
    "id": "ri-real-658",
    "recetaId": "receta-real-prod-real-wrapitos-deluxe-wrapito-2",
    "insumoId": "insu-real-bag-t-shirt-12x6x21",
    "cantidad": 0.002
  },
  {
    "id": "ri-real-659",
    "recetaId": "receta-real-prod-real-wrapitos-deluxe-wrapito-2",
    "insumoId": "insu-real-wrap-cushion-foil-14x16-slvr",
    "cantidad": 0.002
  },
  {
    "id": "ri-real-660",
    "recetaId": "receta-real-prod-real-wrapitos-deluxe-wrapito-2",
    "insumoId": "insu-real-tomato-25-lb",
    "cantidad": 2
  },
  {
    "id": "ri-real-661",
    "recetaId": "receta-real-prod-real-wrapitos-deluxe-wrapito-2",
    "insumoId": "insu-real-lettuce-shred-1-8",
    "cantidad": 2
  },
  {
    "id": "ri-real-662",
    "recetaId": "receta-real-prod-real-wrapitos-deluxe-wrapito-2",
    "insumoId": "insu-real-onion-ylw-jumbo-frsh-bag",
    "cantidad": 0.4528
  },
  {
    "id": "ri-real-663",
    "recetaId": "receta-real-prod-real-wrapitos-deluxe-wrapito-2",
    "insumoId": "insu-real-sour-cream-pouch-pack",
    "cantidad": 0.108
  },
  {
    "id": "ri-real-664",
    "recetaId": "receta-real-prod-real-wrapitos-deluxe-wrapito-2",
    "insumoId": "insu-real-base-chicken-caldo-de-pollo",
    "cantidad": 0.1132
  },
  {
    "id": "ri-real-665",
    "recetaId": "receta-real-prod-real-wrapitos-cuban-wrapito-3",
    "insumoId": "insu-real-lid-for-1-5-oz-souffle-cup-portion-cup-2500-pcs",
    "cantidad": 2
  },
  {
    "id": "ri-real-666",
    "recetaId": "receta-real-prod-real-wrapitos-cuban-wrapito-3",
    "insumoId": "insu-real-1-5-oz-clear-plastic-souffle-cup-portion-cup-25",
    "cantidad": 2
  },
  {
    "id": "ri-real-667",
    "recetaId": "receta-real-prod-real-wrapitos-cuban-wrapito-3",
    "insumoId": "insu-real-limes-200-ct",
    "cantidad": 0.012
  },
  {
    "id": "ri-real-668",
    "recetaId": "receta-real-prod-real-wrapitos-cuban-wrapito-3",
    "insumoId": "insu-real-food-coloring-ylw-pwdr",
    "cantidad": 0.0007
  },
  {
    "id": "ri-real-669",
    "recetaId": "receta-real-prod-real-wrapitos-cuban-wrapito-3",
    "insumoId": "insu-real-garlic-whl-pld-frsh",
    "cantidad": 0.036
  },
  {
    "id": "ri-real-670",
    "recetaId": "receta-real-prod-real-wrapitos-cuban-wrapito-3",
    "insumoId": "insu-real-mayo-4-1-gal",
    "cantidad": 1.8176
  },
  {
    "id": "ri-real-671",
    "recetaId": "receta-real-prod-real-wrapitos-cuban-wrapito-3",
    "insumoId": "insu-real-tortilla-flour-13-in",
    "cantidad": 1
  },
  {
    "id": "ri-real-672",
    "recetaId": "receta-real-prod-real-wrapitos-cuban-wrapito-3",
    "insumoId": "insu-real-salt-iodized-granular",
    "cantidad": 0.1409
  },
  {
    "id": "ri-real-673",
    "recetaId": "receta-real-prod-real-wrapitos-cuban-wrapito-3",
    "insumoId": "insu-real-napkin-xpress-nat-13-x-8-6",
    "cantidad": 0.006
  },
  {
    "id": "ri-real-674",
    "recetaId": "receta-real-prod-real-wrapitos-cuban-wrapito-3",
    "insumoId": "insu-real-cilantro-short-stemmed-30-ct",
    "cantidad": 0.012
  },
  {
    "id": "ri-real-675",
    "recetaId": "receta-real-prod-real-wrapitos-cuban-wrapito-3",
    "insumoId": "insu-real-chicken-breast-4-10-lb",
    "cantidad": 5.3333
  },
  {
    "id": "ri-real-676",
    "recetaId": "receta-real-prod-real-wrapitos-cuban-wrapito-3",
    "insumoId": "insu-real-black-bean-seasoned",
    "cantidad": 3
  },
  {
    "id": "ri-real-677",
    "recetaId": "receta-real-prod-real-wrapitos-cuban-wrapito-3",
    "insumoId": "insu-real-curry-pwdr-4-4-lb",
    "cantidad": 0.0896
  },
  {
    "id": "ri-real-678",
    "recetaId": "receta-real-prod-real-wrapitos-cuban-wrapito-3",
    "insumoId": "insu-real-white-rice-50-lb",
    "cantidad": 3.6226
  },
  {
    "id": "ri-real-679",
    "recetaId": "receta-real-prod-real-wrapitos-cuban-wrapito-3",
    "insumoId": "insu-real-veg-oil",
    "cantidad": 0.2264
  },
  {
    "id": "ri-real-680",
    "recetaId": "receta-real-prod-real-wrapitos-cuban-wrapito-3",
    "insumoId": "insu-real-mustard-country-style-4-1-gal",
    "cantidad": 0.0448
  },
  {
    "id": "ri-real-681",
    "recetaId": "receta-real-prod-real-wrapitos-cuban-wrapito-3",
    "insumoId": "insu-real-base-chicken-lemon",
    "cantidad": 0.1167
  },
  {
    "id": "ri-real-682",
    "recetaId": "receta-real-prod-real-wrapitos-cuban-wrapito-3",
    "insumoId": "insu-real-bag-t-shirt-12x6x21",
    "cantidad": 0.002
  },
  {
    "id": "ri-real-683",
    "recetaId": "receta-real-prod-real-wrapitos-cuban-wrapito-3",
    "insumoId": "insu-real-wrap-cushion-foil-14x16-slvr",
    "cantidad": 0.002
  },
  {
    "id": "ri-real-684",
    "recetaId": "receta-real-prod-real-wrapitos-cuban-wrapito-3",
    "insumoId": "insu-real-tomato-25-lb",
    "cantidad": 2
  },
  {
    "id": "ri-real-685",
    "recetaId": "receta-real-prod-real-wrapitos-cuban-wrapito-3",
    "insumoId": "insu-real-lettuce-shred-1-8",
    "cantidad": 2
  },
  {
    "id": "ri-real-686",
    "recetaId": "receta-real-prod-real-wrapitos-cuban-wrapito-3",
    "insumoId": "insu-real-onion-ylw-jumbo-frsh-bag",
    "cantidad": 0.4528
  },
  {
    "id": "ri-real-687",
    "recetaId": "receta-real-prod-real-wrapitos-cuban-wrapito-3",
    "insumoId": "insu-real-sour-cream-pouch-pack",
    "cantidad": 0.216
  },
  {
    "id": "ri-real-688",
    "recetaId": "receta-real-prod-real-wrapitos-cuban-wrapito-3",
    "insumoId": "insu-real-base-chicken-caldo-de-pollo",
    "cantidad": 0.1132
  },
  {
    "id": "ri-real-689",
    "recetaId": "receta-real-prod-real-wrapitos-caesar-wrapito-4",
    "insumoId": "insu-real-10-80-oz-high-pro-bowl-polypro-25-cs-black",
    "cantidad": 1
  },
  {
    "id": "ri-real-690",
    "recetaId": "receta-real-prod-real-wrapitos-caesar-wrapito-4",
    "insumoId": "insu-real-dressing-caesar-royal",
    "cantidad": 1.5
  },
  {
    "id": "ri-real-691",
    "recetaId": "receta-real-prod-real-wrapitos-caesar-wrapito-4",
    "insumoId": "insu-real-cheese-parmesan-romano-style",
    "cantidad": 0.5
  },
  {
    "id": "ri-real-692",
    "recetaId": "receta-real-prod-real-wrapitos-caesar-wrapito-4",
    "insumoId": "insu-real-tortilla-flour-13-in",
    "cantidad": 1
  },
  {
    "id": "ri-real-693",
    "recetaId": "receta-real-prod-real-wrapitos-caesar-wrapito-4",
    "insumoId": "insu-real-salt-iodized-granular",
    "cantidad": 0.0438
  },
  {
    "id": "ri-real-694",
    "recetaId": "receta-real-prod-real-wrapitos-caesar-wrapito-4",
    "insumoId": "insu-real-chicken-breast-4-10-lb",
    "cantidad": 4.6667
  },
  {
    "id": "ri-real-695",
    "recetaId": "receta-real-prod-real-wrapitos-caesar-wrapito-4",
    "insumoId": "insu-real-forks",
    "cantidad": 1
  },
  {
    "id": "ri-real-696",
    "recetaId": "receta-real-prod-real-wrapitos-caesar-wrapito-4",
    "insumoId": "insu-real-base-chicken-lemon",
    "cantidad": 0.1021
  },
  {
    "id": "ri-real-697",
    "recetaId": "receta-real-prod-real-wrapitos-mexican-wrapito-5",
    "insumoId": "insu-real-lid-for-1-5-oz-souffle-cup-portion-cup-2500-pcs",
    "cantidad": 2
  },
  {
    "id": "ri-real-698",
    "recetaId": "receta-real-prod-real-wrapitos-mexican-wrapito-5",
    "insumoId": "insu-real-1-5-oz-clear-plastic-souffle-cup-portion-cup-25",
    "cantidad": 2
  },
  {
    "id": "ri-real-699",
    "recetaId": "receta-real-prod-real-wrapitos-mexican-wrapito-5",
    "insumoId": "insu-real-limes-200-ct",
    "cantidad": 0.012
  },
  {
    "id": "ri-real-700",
    "recetaId": "receta-real-prod-real-wrapitos-mexican-wrapito-5",
    "insumoId": "insu-real-food-coloring-ylw-pwdr",
    "cantidad": 0.0007
  },
  {
    "id": "ri-real-701",
    "recetaId": "receta-real-prod-real-wrapitos-mexican-wrapito-5",
    "insumoId": "insu-real-garlic-whl-pld-frsh",
    "cantidad": 0.036
  },
  {
    "id": "ri-real-702",
    "recetaId": "receta-real-prod-real-wrapitos-mexican-wrapito-5",
    "insumoId": "insu-real-mayo-4-1-gal",
    "cantidad": 1.8176
  },
  {
    "id": "ri-real-703",
    "recetaId": "receta-real-prod-real-wrapitos-mexican-wrapito-5",
    "insumoId": "insu-real-tortilla-flour-13-in",
    "cantidad": 1
  },
  {
    "id": "ri-real-704",
    "recetaId": "receta-real-prod-real-wrapitos-mexican-wrapito-5",
    "insumoId": "insu-real-salt-iodized-granular",
    "cantidad": 0.1409
  },
  {
    "id": "ri-real-705",
    "recetaId": "receta-real-prod-real-wrapitos-mexican-wrapito-5",
    "insumoId": "insu-real-napkin-xpress-nat-13-x-8-6",
    "cantidad": 0.006
  },
  {
    "id": "ri-real-706",
    "recetaId": "receta-real-prod-real-wrapitos-mexican-wrapito-5",
    "insumoId": "insu-real-cheese-ched-mild-shred-fancy",
    "cantidad": 2
  },
  {
    "id": "ri-real-707",
    "recetaId": "receta-real-prod-real-wrapitos-mexican-wrapito-5",
    "insumoId": "insu-real-cilantro-short-stemmed-30-ct",
    "cantidad": 0.012
  },
  {
    "id": "ri-real-708",
    "recetaId": "receta-real-prod-real-wrapitos-mexican-wrapito-5",
    "insumoId": "insu-real-chicken-breast-4-10-lb",
    "cantidad": 5.3333
  },
  {
    "id": "ri-real-709",
    "recetaId": "receta-real-prod-real-wrapitos-mexican-wrapito-5",
    "insumoId": "insu-real-black-bean-seasoned",
    "cantidad": 9
  },
  {
    "id": "ri-real-710",
    "recetaId": "receta-real-prod-real-wrapitos-mexican-wrapito-5",
    "insumoId": "insu-real-curry-pwdr-4-4-lb",
    "cantidad": 0.0896
  },
  {
    "id": "ri-real-711",
    "recetaId": "receta-real-prod-real-wrapitos-mexican-wrapito-5",
    "insumoId": "insu-real-white-rice-50-lb",
    "cantidad": 3.6226
  },
  {
    "id": "ri-real-712",
    "recetaId": "receta-real-prod-real-wrapitos-mexican-wrapito-5",
    "insumoId": "insu-real-veg-oil",
    "cantidad": 0.2264
  },
  {
    "id": "ri-real-713",
    "recetaId": "receta-real-prod-real-wrapitos-mexican-wrapito-5",
    "insumoId": "insu-real-mustard-country-style-4-1-gal",
    "cantidad": 0.0448
  },
  {
    "id": "ri-real-714",
    "recetaId": "receta-real-prod-real-wrapitos-mexican-wrapito-5",
    "insumoId": "insu-real-base-chicken-lemon",
    "cantidad": 0.1167
  },
  {
    "id": "ri-real-715",
    "recetaId": "receta-real-prod-real-wrapitos-mexican-wrapito-5",
    "insumoId": "insu-real-bag-t-shirt-12x6x21",
    "cantidad": 0.002
  },
  {
    "id": "ri-real-716",
    "recetaId": "receta-real-prod-real-wrapitos-mexican-wrapito-5",
    "insumoId": "insu-real-wrap-cushion-foil-14x16-slvr",
    "cantidad": 0.002
  },
  {
    "id": "ri-real-717",
    "recetaId": "receta-real-prod-real-wrapitos-mexican-wrapito-5",
    "insumoId": "insu-real-tomato-25-lb",
    "cantidad": 2
  },
  {
    "id": "ri-real-718",
    "recetaId": "receta-real-prod-real-wrapitos-mexican-wrapito-5",
    "insumoId": "insu-real-lettuce-shred-1-8",
    "cantidad": 2
  },
  {
    "id": "ri-real-719",
    "recetaId": "receta-real-prod-real-wrapitos-mexican-wrapito-5",
    "insumoId": "insu-real-onion-ylw-jumbo-frsh-bag",
    "cantidad": 0.4528
  },
  {
    "id": "ri-real-720",
    "recetaId": "receta-real-prod-real-wrapitos-mexican-wrapito-5",
    "insumoId": "insu-real-sour-cream-pouch-pack",
    "cantidad": 2.216
  },
  {
    "id": "ri-real-721",
    "recetaId": "receta-real-prod-real-wrapitos-mexican-wrapito-5",
    "insumoId": "insu-real-base-chicken-caldo-de-pollo",
    "cantidad": 0.1132
  },
  {
    "id": "ri-real-722",
    "recetaId": "receta-real-prod-real-wrapitos-bazooka-wrapito-6",
    "insumoId": "insu-real-lid-for-1-5-oz-souffle-cup-portion-cup-2500-pcs",
    "cantidad": 2
  },
  {
    "id": "ri-real-723",
    "recetaId": "receta-real-prod-real-wrapitos-bazooka-wrapito-6",
    "insumoId": "insu-real-1-5-oz-clear-plastic-souffle-cup-portion-cup-25",
    "cantidad": 2
  },
  {
    "id": "ri-real-724",
    "recetaId": "receta-real-prod-real-wrapitos-bazooka-wrapito-6",
    "insumoId": "insu-real-limes-200-ct",
    "cantidad": 0.0549
  },
  {
    "id": "ri-real-725",
    "recetaId": "receta-real-prod-real-wrapitos-bazooka-wrapito-6",
    "insumoId": "insu-real-food-coloring-ylw-pwdr",
    "cantidad": 0.0007
  },
  {
    "id": "ri-real-726",
    "recetaId": "receta-real-prod-real-wrapitos-bazooka-wrapito-6",
    "insumoId": "insu-real-garlic-whl-pld-frsh",
    "cantidad": 0.036
  },
  {
    "id": "ri-real-727",
    "recetaId": "receta-real-prod-real-wrapitos-bazooka-wrapito-6",
    "insumoId": "insu-real-avocado-ripe-48-ct",
    "cantidad": 0.2857
  },
  {
    "id": "ri-real-728",
    "recetaId": "receta-real-prod-real-wrapitos-bazooka-wrapito-6",
    "insumoId": "insu-real-peppers-jalapeno",
    "cantidad": 0.0571
  },
  {
    "id": "ri-real-729",
    "recetaId": "receta-real-prod-real-wrapitos-bazooka-wrapito-6",
    "insumoId": "insu-real-mayo-4-1-gal",
    "cantidad": 1.8176
  },
  {
    "id": "ri-real-730",
    "recetaId": "receta-real-prod-real-wrapitos-bazooka-wrapito-6",
    "insumoId": "insu-real-tortilla-flour-13-in",
    "cantidad": 1
  },
  {
    "id": "ri-real-731",
    "recetaId": "receta-real-prod-real-wrapitos-bazooka-wrapito-6",
    "insumoId": "insu-real-salt-iodized-granular",
    "cantidad": 0.198
  },
  {
    "id": "ri-real-732",
    "recetaId": "receta-real-prod-real-wrapitos-bazooka-wrapito-6",
    "insumoId": "insu-real-napkin-xpress-nat-13-x-8-6",
    "cantidad": 0.006
  },
  {
    "id": "ri-real-733",
    "recetaId": "receta-real-prod-real-wrapitos-bazooka-wrapito-6",
    "insumoId": "insu-real-cheese-ched-mild-shred-fancy",
    "cantidad": 2
  },
  {
    "id": "ri-real-734",
    "recetaId": "receta-real-prod-real-wrapitos-bazooka-wrapito-6",
    "insumoId": "insu-real-cilantro-short-stemmed-30-ct",
    "cantidad": 0.0691
  },
  {
    "id": "ri-real-735",
    "recetaId": "receta-real-prod-real-wrapitos-bazooka-wrapito-6",
    "insumoId": "insu-real-chicken-breast-4-10-lb",
    "cantidad": 5.3333
  },
  {
    "id": "ri-real-736",
    "recetaId": "receta-real-prod-real-wrapitos-bazooka-wrapito-6",
    "insumoId": "insu-real-black-bean-seasoned",
    "cantidad": 9
  },
  {
    "id": "ri-real-737",
    "recetaId": "receta-real-prod-real-wrapitos-bazooka-wrapito-6",
    "insumoId": "insu-real-curry-pwdr-4-4-lb",
    "cantidad": 0.0896
  },
  {
    "id": "ri-real-738",
    "recetaId": "receta-real-prod-real-wrapitos-bazooka-wrapito-6",
    "insumoId": "insu-real-white-rice-50-lb",
    "cantidad": 3.6226
  },
  {
    "id": "ri-real-739",
    "recetaId": "receta-real-prod-real-wrapitos-bazooka-wrapito-6",
    "insumoId": "insu-real-veg-oil",
    "cantidad": 0.2264
  },
  {
    "id": "ri-real-740",
    "recetaId": "receta-real-prod-real-wrapitos-bazooka-wrapito-6",
    "insumoId": "insu-real-mustard-country-style-4-1-gal",
    "cantidad": 0.0448
  },
  {
    "id": "ri-real-741",
    "recetaId": "receta-real-prod-real-wrapitos-bazooka-wrapito-6",
    "insumoId": "insu-real-base-chicken-lemon",
    "cantidad": 0.1167
  },
  {
    "id": "ri-real-742",
    "recetaId": "receta-real-prod-real-wrapitos-bazooka-wrapito-6",
    "insumoId": "insu-real-bag-t-shirt-12x6x21",
    "cantidad": 0.002
  },
  {
    "id": "ri-real-743",
    "recetaId": "receta-real-prod-real-wrapitos-bazooka-wrapito-6",
    "insumoId": "insu-real-wrap-cushion-foil-14x16-slvr",
    "cantidad": 0.002
  },
  {
    "id": "ri-real-744",
    "recetaId": "receta-real-prod-real-wrapitos-bazooka-wrapito-6",
    "insumoId": "insu-real-tomato-25-lb",
    "cantidad": 2.4571
  },
  {
    "id": "ri-real-745",
    "recetaId": "receta-real-prod-real-wrapitos-bazooka-wrapito-6",
    "insumoId": "insu-real-lettuce-shred-1-8",
    "cantidad": 2
  },
  {
    "id": "ri-real-746",
    "recetaId": "receta-real-prod-real-wrapitos-bazooka-wrapito-6",
    "insumoId": "insu-real-onion-red-jumbo",
    "cantidad": 0.1143
  },
  {
    "id": "ri-real-747",
    "recetaId": "receta-real-prod-real-wrapitos-bazooka-wrapito-6",
    "insumoId": "insu-real-onion-ylw-jumbo-frsh-bag",
    "cantidad": 0.4528
  },
  {
    "id": "ri-real-748",
    "recetaId": "receta-real-prod-real-wrapitos-bazooka-wrapito-6",
    "insumoId": "insu-real-sour-cream-pouch-pack",
    "cantidad": 2.216
  },
  {
    "id": "ri-real-749",
    "recetaId": "receta-real-prod-real-wrapitos-bazooka-wrapito-6",
    "insumoId": "insu-real-base-chicken-caldo-de-pollo",
    "cantidad": 0.1132
  },
  {
    "id": "ri-real-750",
    "recetaId": "receta-real-prod-real-wrapitos-no-rice-wrapito-7",
    "insumoId": "insu-real-tortilla-flour-13-in",
    "cantidad": 1
  },
  {
    "id": "ri-real-751",
    "recetaId": "receta-real-prod-real-wrapitos-no-rice-wrapito-7",
    "insumoId": "insu-real-salt-iodized-granular",
    "cantidad": 0.05
  },
  {
    "id": "ri-real-752",
    "recetaId": "receta-real-prod-real-wrapitos-no-rice-wrapito-7",
    "insumoId": "insu-real-napkin-xpress-nat-13-x-8-6",
    "cantidad": 0.006
  },
  {
    "id": "ri-real-753",
    "recetaId": "receta-real-prod-real-wrapitos-no-rice-wrapito-7",
    "insumoId": "insu-real-chicken-breast-4-10-lb",
    "cantidad": 5.3333
  },
  {
    "id": "ri-real-754",
    "recetaId": "receta-real-prod-real-wrapitos-no-rice-wrapito-7",
    "insumoId": "insu-real-base-chicken-lemon",
    "cantidad": 0.1167
  },
  {
    "id": "ri-real-755",
    "recetaId": "receta-real-prod-real-wrapitos-no-rice-wrapito-7",
    "insumoId": "insu-real-bag-t-shirt-12x6x21",
    "cantidad": 0.002
  },
  {
    "id": "ri-real-756",
    "recetaId": "receta-real-prod-real-wrapitos-no-rice-wrapito-7",
    "insumoId": "insu-real-wrap-cushion-foil-14x16-slvr",
    "cantidad": 0.002
  },
  {
    "id": "ri-real-757",
    "recetaId": "receta-real-prod-real-wrapitos-no-rice-wrapito-7",
    "insumoId": "insu-real-tomato-25-lb",
    "cantidad": 2
  },
  {
    "id": "ri-real-758",
    "recetaId": "receta-real-prod-real-wrapitos-no-rice-wrapito-7",
    "insumoId": "insu-real-lettuce-shred-1-8",
    "cantidad": 4
  },
  {
    "id": "ri-real-759",
    "recetaId": "receta-real-prod-real-wrapitos-asian-wrapito-8",
    "insumoId": "insu-real-food-coloring-ylw-pwdr",
    "cantidad": 0.0005
  },
  {
    "id": "ri-real-760",
    "recetaId": "receta-real-prod-real-wrapitos-asian-wrapito-8",
    "insumoId": "insu-real-chicken-thigh-meat-b-s-4-10-lb",
    "cantidad": 4
  },
  {
    "id": "ri-real-761",
    "recetaId": "receta-real-prod-real-wrapitos-asian-wrapito-8",
    "insumoId": "insu-real-tortilla-flour-13-in",
    "cantidad": 1
  },
  {
    "id": "ri-real-762",
    "recetaId": "receta-real-prod-real-wrapitos-asian-wrapito-8",
    "insumoId": "insu-real-salt-iodized-granular",
    "cantidad": 0.0691
  },
  {
    "id": "ri-real-763",
    "recetaId": "receta-real-prod-real-wrapitos-asian-wrapito-8",
    "insumoId": "insu-real-sesame-seed-whi",
    "cantidad": 0.25
  },
  {
    "id": "ri-real-764",
    "recetaId": "receta-real-prod-real-wrapitos-asian-wrapito-8",
    "insumoId": "insu-real-napkin-xpress-nat-13-x-8-6",
    "cantidad": 0.006
  },
  {
    "id": "ri-real-765",
    "recetaId": "receta-real-prod-real-wrapitos-asian-wrapito-8",
    "insumoId": "insu-real-glaze-teriyaki-4-4-76-kg",
    "cantidad": 0.7
  },
  {
    "id": "ri-real-766",
    "recetaId": "receta-real-prod-real-wrapitos-asian-wrapito-8",
    "insumoId": "insu-real-white-rice-50-lb",
    "cantidad": 2.4151
  },
  {
    "id": "ri-real-767",
    "recetaId": "receta-real-prod-real-wrapitos-asian-wrapito-8",
    "insumoId": "insu-real-veg-oil",
    "cantidad": 0.1509
  },
  {
    "id": "ri-real-768",
    "recetaId": "receta-real-prod-real-wrapitos-asian-wrapito-8",
    "insumoId": "insu-real-bag-t-shirt-12x6x21",
    "cantidad": 0.002
  },
  {
    "id": "ri-real-769",
    "recetaId": "receta-real-prod-real-wrapitos-asian-wrapito-8",
    "insumoId": "insu-real-wrap-cushion-foil-14x16-slvr",
    "cantidad": 0.002
  },
  {
    "id": "ri-real-770",
    "recetaId": "receta-real-prod-real-wrapitos-asian-wrapito-8",
    "insumoId": "insu-real-tomato-25-lb",
    "cantidad": 1.5
  },
  {
    "id": "ri-real-771",
    "recetaId": "receta-real-prod-real-wrapitos-asian-wrapito-8",
    "insumoId": "insu-real-lettuce-shred-1-8",
    "cantidad": 1
  },
  {
    "id": "ri-real-772",
    "recetaId": "receta-real-prod-real-wrapitos-asian-wrapito-8",
    "insumoId": "insu-real-onion-ylw-jumbo-frsh-bag",
    "cantidad": 0.3019
  },
  {
    "id": "ri-real-773",
    "recetaId": "receta-real-prod-real-wrapitos-asian-wrapito-8",
    "insumoId": "insu-real-onion-green-w-t",
    "cantidad": 0.25
  },
  {
    "id": "ri-real-774",
    "recetaId": "receta-real-prod-real-wrapitos-asian-wrapito-8",
    "insumoId": "insu-real-base-chicken-caldo-de-pollo",
    "cantidad": 0.0755
  },
  {
    "id": "ri-real-775",
    "recetaId": "receta-real-prod-real-wrapitos-vegetarian-wrapito-9",
    "insumoId": "insu-real-lid-for-1-5-oz-souffle-cup-portion-cup-2500-pcs",
    "cantidad": 2
  },
  {
    "id": "ri-real-776",
    "recetaId": "receta-real-prod-real-wrapitos-vegetarian-wrapito-9",
    "insumoId": "insu-real-1-5-oz-clear-plastic-souffle-cup-portion-cup-25",
    "cantidad": 2
  },
  {
    "id": "ri-real-777",
    "recetaId": "receta-real-prod-real-wrapitos-vegetarian-wrapito-9",
    "insumoId": "insu-real-limes-200-ct",
    "cantidad": 0.0549
  },
  {
    "id": "ri-real-778",
    "recetaId": "receta-real-prod-real-wrapitos-vegetarian-wrapito-9",
    "insumoId": "insu-real-food-coloring-ylw-pwdr",
    "cantidad": 0.0007
  },
  {
    "id": "ri-real-779",
    "recetaId": "receta-real-prod-real-wrapitos-vegetarian-wrapito-9",
    "insumoId": "insu-real-garlic-whl-pld-frsh",
    "cantidad": 0.036
  },
  {
    "id": "ri-real-780",
    "recetaId": "receta-real-prod-real-wrapitos-vegetarian-wrapito-9",
    "insumoId": "insu-real-avocado-ripe-48-ct",
    "cantidad": 0.2857
  },
  {
    "id": "ri-real-781",
    "recetaId": "receta-real-prod-real-wrapitos-vegetarian-wrapito-9",
    "insumoId": "insu-real-peppers-jalapeno",
    "cantidad": 0.0571
  },
  {
    "id": "ri-real-782",
    "recetaId": "receta-real-prod-real-wrapitos-vegetarian-wrapito-9",
    "insumoId": "insu-real-mayo-4-1-gal",
    "cantidad": 1.8176
  },
  {
    "id": "ri-real-783",
    "recetaId": "receta-real-prod-real-wrapitos-vegetarian-wrapito-9",
    "insumoId": "insu-real-tortilla-flour-13-in",
    "cantidad": 1
  },
  {
    "id": "ri-real-784",
    "recetaId": "receta-real-prod-real-wrapitos-vegetarian-wrapito-9",
    "insumoId": "insu-real-salt-iodized-granular",
    "cantidad": 0.148
  },
  {
    "id": "ri-real-785",
    "recetaId": "receta-real-prod-real-wrapitos-vegetarian-wrapito-9",
    "insumoId": "insu-real-napkin-xpress-nat-13-x-8-6",
    "cantidad": 0.006
  },
  {
    "id": "ri-real-786",
    "recetaId": "receta-real-prod-real-wrapitos-vegetarian-wrapito-9",
    "insumoId": "insu-real-cheese-ched-mild-shred-fancy",
    "cantidad": 2
  },
  {
    "id": "ri-real-787",
    "recetaId": "receta-real-prod-real-wrapitos-vegetarian-wrapito-9",
    "insumoId": "insu-real-cilantro-short-stemmed-30-ct",
    "cantidad": 0.0691
  },
  {
    "id": "ri-real-788",
    "recetaId": "receta-real-prod-real-wrapitos-vegetarian-wrapito-9",
    "insumoId": "insu-real-black-bean-seasoned",
    "cantidad": 9
  },
  {
    "id": "ri-real-789",
    "recetaId": "receta-real-prod-real-wrapitos-vegetarian-wrapito-9",
    "insumoId": "insu-real-curry-pwdr-4-4-lb",
    "cantidad": 0.0896
  },
  {
    "id": "ri-real-790",
    "recetaId": "receta-real-prod-real-wrapitos-vegetarian-wrapito-9",
    "insumoId": "insu-real-white-rice-50-lb",
    "cantidad": 3.6226
  },
  {
    "id": "ri-real-791",
    "recetaId": "receta-real-prod-real-wrapitos-vegetarian-wrapito-9",
    "insumoId": "insu-real-veg-oil",
    "cantidad": 0.2264
  },
  {
    "id": "ri-real-792",
    "recetaId": "receta-real-prod-real-wrapitos-vegetarian-wrapito-9",
    "insumoId": "insu-real-mustard-country-style-4-1-gal",
    "cantidad": 0.0448
  },
  {
    "id": "ri-real-793",
    "recetaId": "receta-real-prod-real-wrapitos-vegetarian-wrapito-9",
    "insumoId": "insu-real-bag-t-shirt-12x6x21",
    "cantidad": 0.002
  },
  {
    "id": "ri-real-794",
    "recetaId": "receta-real-prod-real-wrapitos-vegetarian-wrapito-9",
    "insumoId": "insu-real-wrap-cushion-foil-14x16-slvr",
    "cantidad": 0.002
  },
  {
    "id": "ri-real-795",
    "recetaId": "receta-real-prod-real-wrapitos-vegetarian-wrapito-9",
    "insumoId": "insu-real-tomato-25-lb",
    "cantidad": 2.4571
  },
  {
    "id": "ri-real-796",
    "recetaId": "receta-real-prod-real-wrapitos-vegetarian-wrapito-9",
    "insumoId": "insu-real-lettuce-shred-1-8",
    "cantidad": 2
  },
  {
    "id": "ri-real-797",
    "recetaId": "receta-real-prod-real-wrapitos-vegetarian-wrapito-9",
    "insumoId": "insu-real-onion-red-jumbo",
    "cantidad": 0.1143
  },
  {
    "id": "ri-real-798",
    "recetaId": "receta-real-prod-real-wrapitos-vegetarian-wrapito-9",
    "insumoId": "insu-real-onion-ylw-jumbo-frsh-bag",
    "cantidad": 0.4528
  },
  {
    "id": "ri-real-799",
    "recetaId": "receta-real-prod-real-wrapitos-vegetarian-wrapito-9",
    "insumoId": "insu-real-sour-cream-pouch-pack",
    "cantidad": 2.216
  },
  {
    "id": "ri-real-800",
    "recetaId": "receta-real-prod-real-wrapitos-vegetarian-wrapito-9",
    "insumoId": "insu-real-base-chicken-caldo-de-pollo",
    "cantidad": 0.1132
  },
  {
    "id": "ri-real-801",
    "recetaId": "receta-real-prod-real-wrapitos-make-your-own-wrapito-10",
    "insumoId": "insu-real-lid-for-1-5-oz-souffle-cup-portion-cup-2500-pcs",
    "cantidad": 2
  },
  {
    "id": "ri-real-802",
    "recetaId": "receta-real-prod-real-wrapitos-make-your-own-wrapito-10",
    "insumoId": "insu-real-1-5-oz-clear-plastic-souffle-cup-portion-cup-25",
    "cantidad": 2
  },
  {
    "id": "ri-real-803",
    "recetaId": "receta-real-prod-real-wrapitos-make-your-own-wrapito-10",
    "insumoId": "insu-real-limes-200-ct",
    "cantidad": 0.012
  },
  {
    "id": "ri-real-804",
    "recetaId": "receta-real-prod-real-wrapitos-make-your-own-wrapito-10",
    "insumoId": "insu-real-food-coloring-ylw-pwdr",
    "cantidad": 0.0005
  },
  {
    "id": "ri-real-805",
    "recetaId": "receta-real-prod-real-wrapitos-make-your-own-wrapito-10",
    "insumoId": "insu-real-garlic-whl-pld-frsh",
    "cantidad": 0.036
  },
  {
    "id": "ri-real-806",
    "recetaId": "receta-real-prod-real-wrapitos-make-your-own-wrapito-10",
    "insumoId": "insu-real-mayo-4-1-gal",
    "cantidad": 1.8176
  },
  {
    "id": "ri-real-807",
    "recetaId": "receta-real-prod-real-wrapitos-make-your-own-wrapito-10",
    "insumoId": "insu-real-tortilla-flour-13-in",
    "cantidad": 1
  },
  {
    "id": "ri-real-808",
    "recetaId": "receta-real-prod-real-wrapitos-make-your-own-wrapito-10",
    "insumoId": "insu-real-salt-iodized-granular",
    "cantidad": 0.1001
  },
  {
    "id": "ri-real-809",
    "recetaId": "receta-real-prod-real-wrapitos-make-your-own-wrapito-10",
    "insumoId": "insu-real-napkin-xpress-nat-13-x-8-6",
    "cantidad": 0.006
  },
  {
    "id": "ri-real-810",
    "recetaId": "receta-real-prod-real-wrapitos-make-your-own-wrapito-10",
    "insumoId": "insu-real-cilantro-short-stemmed-30-ct",
    "cantidad": 0.012
  },
  {
    "id": "ri-real-811",
    "recetaId": "receta-real-prod-real-wrapitos-make-your-own-wrapito-10",
    "insumoId": "insu-real-chicken-breast-4-10-lb",
    "cantidad": 4
  },
  {
    "id": "ri-real-812",
    "recetaId": "receta-real-prod-real-wrapitos-make-your-own-wrapito-10",
    "insumoId": "insu-real-curry-pwdr-4-4-lb",
    "cantidad": 0.0896
  },
  {
    "id": "ri-real-813",
    "recetaId": "receta-real-prod-real-wrapitos-make-your-own-wrapito-10",
    "insumoId": "insu-real-white-rice-50-lb",
    "cantidad": 2.4151
  },
  {
    "id": "ri-real-814",
    "recetaId": "receta-real-prod-real-wrapitos-make-your-own-wrapito-10",
    "insumoId": "insu-real-veg-oil",
    "cantidad": 0.1509
  },
  {
    "id": "ri-real-815",
    "recetaId": "receta-real-prod-real-wrapitos-make-your-own-wrapito-10",
    "insumoId": "insu-real-mustard-country-style-4-1-gal",
    "cantidad": 0.0448
  },
  {
    "id": "ri-real-816",
    "recetaId": "receta-real-prod-real-wrapitos-make-your-own-wrapito-10",
    "insumoId": "insu-real-base-chicken-lemon",
    "cantidad": 0.0875
  },
  {
    "id": "ri-real-817",
    "recetaId": "receta-real-prod-real-wrapitos-make-your-own-wrapito-10",
    "insumoId": "insu-real-bag-t-shirt-12x6x21",
    "cantidad": 0.002
  },
  {
    "id": "ri-real-818",
    "recetaId": "receta-real-prod-real-wrapitos-make-your-own-wrapito-10",
    "insumoId": "insu-real-wrap-cushion-foil-14x16-slvr",
    "cantidad": 0.002
  },
  {
    "id": "ri-real-819",
    "recetaId": "receta-real-prod-real-wrapitos-make-your-own-wrapito-10",
    "insumoId": "insu-real-onion-ylw-jumbo-frsh-bag",
    "cantidad": 0.3019
  },
  {
    "id": "ri-real-820",
    "recetaId": "receta-real-prod-real-wrapitos-make-your-own-wrapito-10",
    "insumoId": "insu-real-sour-cream-pouch-pack",
    "cantidad": 0.216
  },
  {
    "id": "ri-real-821",
    "recetaId": "receta-real-prod-real-wrapitos-make-your-own-wrapito-10",
    "insumoId": "insu-real-base-chicken-caldo-de-pollo",
    "cantidad": 0.0755
  },
  {
    "id": "ri-real-822",
    "recetaId": "receta-real-prod-real-wrapitos-teriyaki-wrapito-11",
    "insumoId": "insu-real-food-coloring-ylw-pwdr",
    "cantidad": 0.0005
  },
  {
    "id": "ri-real-823",
    "recetaId": "receta-real-prod-real-wrapitos-teriyaki-wrapito-11",
    "insumoId": "insu-real-chicken-thigh-meat-b-s-4-10-lb",
    "cantidad": 6
  },
  {
    "id": "ri-real-824",
    "recetaId": "receta-real-prod-real-wrapitos-teriyaki-wrapito-11",
    "insumoId": "insu-real-tortilla-flour-13-in",
    "cantidad": 1
  },
  {
    "id": "ri-real-825",
    "recetaId": "receta-real-prod-real-wrapitos-teriyaki-wrapito-11",
    "insumoId": "insu-real-salt-iodized-granular",
    "cantidad": 0.0754
  },
  {
    "id": "ri-real-826",
    "recetaId": "receta-real-prod-real-wrapitos-teriyaki-wrapito-11",
    "insumoId": "insu-real-glaze-teriyaki-4-4-76-kg",
    "cantidad": 1.05
  },
  {
    "id": "ri-real-827",
    "recetaId": "receta-real-prod-real-wrapitos-teriyaki-wrapito-11",
    "insumoId": "insu-real-white-rice-50-lb",
    "cantidad": 2.4151
  },
  {
    "id": "ri-real-828",
    "recetaId": "receta-real-prod-real-wrapitos-teriyaki-wrapito-11",
    "insumoId": "insu-real-veg-oil",
    "cantidad": 0.1509
  },
  {
    "id": "ri-real-829",
    "recetaId": "receta-real-prod-real-wrapitos-teriyaki-wrapito-11",
    "insumoId": "insu-real-onion-ylw-jumbo-frsh-bag",
    "cantidad": 0.3019
  },
  {
    "id": "ri-real-830",
    "recetaId": "receta-real-prod-real-wrapitos-teriyaki-wrapito-11",
    "insumoId": "insu-real-base-chicken-caldo-de-pollo",
    "cantidad": 0.0755
  },
  {
    "id": "ri-real-831",
    "recetaId": "receta-real-prod-real-salads-garden-salad-1",
    "insumoId": "insu-real-lid-for-1-5-oz-souffle-cup-portion-cup-2500-pcs",
    "cantidad": 2
  },
  {
    "id": "ri-real-832",
    "recetaId": "receta-real-prod-real-salads-garden-salad-1",
    "insumoId": "insu-real-1-5-oz-clear-plastic-souffle-cup-portion-cup-25",
    "cantidad": 2
  },
  {
    "id": "ri-real-833",
    "recetaId": "receta-real-prod-real-salads-garden-salad-1",
    "insumoId": "insu-real-clear-salad-bowl-32oz-1000-ml-case-pack-300pcs",
    "cantidad": 1
  },
  {
    "id": "ri-real-834",
    "recetaId": "receta-real-prod-real-salads-garden-salad-1",
    "insumoId": "insu-real-limes-200-ct",
    "cantidad": 0.012
  },
  {
    "id": "ri-real-835",
    "recetaId": "receta-real-prod-real-salads-garden-salad-1",
    "insumoId": "insu-real-peppers-red-bell",
    "cantidad": 1.125
  },
  {
    "id": "ri-real-836",
    "recetaId": "receta-real-prod-real-salads-garden-salad-1",
    "insumoId": "insu-real-garlic-whl-pld-frsh",
    "cantidad": 0.036
  },
  {
    "id": "ri-real-837",
    "recetaId": "receta-real-prod-real-salads-garden-salad-1",
    "insumoId": "insu-real-mayo-4-1-gal",
    "cantidad": 1.8176
  },
  {
    "id": "ri-real-838",
    "recetaId": "receta-real-prod-real-salads-garden-salad-1",
    "insumoId": "insu-real-salt-iodized-granular",
    "cantidad": 0.006
  },
  {
    "id": "ri-real-839",
    "recetaId": "receta-real-prod-real-salads-garden-salad-1",
    "insumoId": "insu-real-napkin-xpress-nat-13-x-8-6",
    "cantidad": 3
  },
  {
    "id": "ri-real-840",
    "recetaId": "receta-real-prod-real-salads-garden-salad-1",
    "insumoId": "insu-real-cilantro-short-stemmed-30-ct",
    "cantidad": 0.012
  },
  {
    "id": "ri-real-841",
    "recetaId": "receta-real-prod-real-salads-garden-salad-1",
    "insumoId": "insu-real-curry-pwdr-4-4-lb",
    "cantidad": 0.0896
  },
  {
    "id": "ri-real-842",
    "recetaId": "receta-real-prod-real-salads-garden-salad-1",
    "insumoId": "insu-real-lettuce-romaine-hearts-24-ct",
    "cantidad": 3
  },
  {
    "id": "ri-real-843",
    "recetaId": "receta-real-prod-real-salads-garden-salad-1",
    "insumoId": "insu-real-forks",
    "cantidad": 1
  },
  {
    "id": "ri-real-844",
    "recetaId": "receta-real-prod-real-salads-garden-salad-1",
    "insumoId": "insu-real-mustard-country-style-4-1-gal",
    "cantidad": 0.0448
  },
  {
    "id": "ri-real-845",
    "recetaId": "receta-real-prod-real-salads-garden-salad-1",
    "insumoId": "insu-real-bag-t-shirt-12x6x21",
    "cantidad": 1
  },
  {
    "id": "ri-real-846",
    "recetaId": "receta-real-prod-real-salads-garden-salad-1",
    "insumoId": "insu-real-clear-lid-lg-bowl",
    "cantidad": 1
  },
  {
    "id": "ri-real-847",
    "recetaId": "receta-real-prod-real-salads-garden-salad-1",
    "insumoId": "insu-real-tomato-25-lb",
    "cantidad": 2
  },
  {
    "id": "ri-real-848",
    "recetaId": "receta-real-prod-real-salads-garden-salad-1",
    "insumoId": "insu-real-spring-mix",
    "cantidad": 2
  },
  {
    "id": "ri-real-849",
    "recetaId": "receta-real-prod-real-salads-garden-salad-1",
    "insumoId": "insu-real-sour-cream-pouch-pack",
    "cantidad": 0.216
  },
  {
    "id": "ri-real-850",
    "recetaId": "receta-real-prod-real-salads-garden-salad-1",
    "insumoId": "insu-real-carrot-sticks-5-lb",
    "cantidad": 1
  },
  {
    "id": "ri-real-851",
    "recetaId": "receta-real-prod-real-salads-garden-salad-1",
    "insumoId": "insu-real-cucumber-sel",
    "cantidad": 1.5
  },
  {
    "id": "ri-real-852",
    "recetaId": "receta-real-prod-real-salads-chicken-garden-salad-2",
    "insumoId": "insu-real-lid-for-1-5-oz-souffle-cup-portion-cup-2500-pcs",
    "cantidad": 2
  },
  {
    "id": "ri-real-853",
    "recetaId": "receta-real-prod-real-salads-chicken-garden-salad-2",
    "insumoId": "insu-real-1-5-oz-clear-plastic-souffle-cup-portion-cup-25",
    "cantidad": 2
  },
  {
    "id": "ri-real-854",
    "recetaId": "receta-real-prod-real-salads-chicken-garden-salad-2",
    "insumoId": "insu-real-clear-salad-bowl-32oz-1000-ml-case-pack-300pcs",
    "cantidad": 1
  },
  {
    "id": "ri-real-855",
    "recetaId": "receta-real-prod-real-salads-chicken-garden-salad-2",
    "insumoId": "insu-real-limes-200-ct",
    "cantidad": 0.012
  },
  {
    "id": "ri-real-856",
    "recetaId": "receta-real-prod-real-salads-chicken-garden-salad-2",
    "insumoId": "insu-real-peppers-red-bell",
    "cantidad": 1.125
  },
  {
    "id": "ri-real-857",
    "recetaId": "receta-real-prod-real-salads-chicken-garden-salad-2",
    "insumoId": "insu-real-garlic-whl-pld-frsh",
    "cantidad": 0.036
  },
  {
    "id": "ri-real-858",
    "recetaId": "receta-real-prod-real-salads-chicken-garden-salad-2",
    "insumoId": "insu-real-mayo-4-1-gal",
    "cantidad": 1.8176
  },
  {
    "id": "ri-real-859",
    "recetaId": "receta-real-prod-real-salads-chicken-garden-salad-2",
    "insumoId": "insu-real-salt-iodized-granular",
    "cantidad": 0.0685
  },
  {
    "id": "ri-real-860",
    "recetaId": "receta-real-prod-real-salads-chicken-garden-salad-2",
    "insumoId": "insu-real-napkin-xpress-nat-13-x-8-6",
    "cantidad": 3
  },
  {
    "id": "ri-real-861",
    "recetaId": "receta-real-prod-real-salads-chicken-garden-salad-2",
    "insumoId": "insu-real-cilantro-short-stemmed-30-ct",
    "cantidad": 0.012
  },
  {
    "id": "ri-real-862",
    "recetaId": "receta-real-prod-real-salads-chicken-garden-salad-2",
    "insumoId": "insu-real-chicken-breast-4-10-lb",
    "cantidad": 6.6667
  },
  {
    "id": "ri-real-863",
    "recetaId": "receta-real-prod-real-salads-chicken-garden-salad-2",
    "insumoId": "insu-real-curry-pwdr-4-4-lb",
    "cantidad": 0.0896
  },
  {
    "id": "ri-real-864",
    "recetaId": "receta-real-prod-real-salads-chicken-garden-salad-2",
    "insumoId": "insu-real-lettuce-romaine-hearts-24-ct",
    "cantidad": 3
  },
  {
    "id": "ri-real-865",
    "recetaId": "receta-real-prod-real-salads-chicken-garden-salad-2",
    "insumoId": "insu-real-forks",
    "cantidad": 1
  },
  {
    "id": "ri-real-866",
    "recetaId": "receta-real-prod-real-salads-chicken-garden-salad-2",
    "insumoId": "insu-real-mustard-country-style-4-1-gal",
    "cantidad": 0.0448
  },
  {
    "id": "ri-real-867",
    "recetaId": "receta-real-prod-real-salads-chicken-garden-salad-2",
    "insumoId": "insu-real-base-chicken-lemon",
    "cantidad": 0.1458
  },
  {
    "id": "ri-real-868",
    "recetaId": "receta-real-prod-real-salads-chicken-garden-salad-2",
    "insumoId": "insu-real-bag-t-shirt-12x6x21",
    "cantidad": 1
  },
  {
    "id": "ri-real-869",
    "recetaId": "receta-real-prod-real-salads-chicken-garden-salad-2",
    "insumoId": "insu-real-clear-lid-lg-bowl",
    "cantidad": 1
  },
  {
    "id": "ri-real-870",
    "recetaId": "receta-real-prod-real-salads-chicken-garden-salad-2",
    "insumoId": "insu-real-tomato-25-lb",
    "cantidad": 2
  },
  {
    "id": "ri-real-871",
    "recetaId": "receta-real-prod-real-salads-chicken-garden-salad-2",
    "insumoId": "insu-real-spring-mix",
    "cantidad": 2
  },
  {
    "id": "ri-real-872",
    "recetaId": "receta-real-prod-real-salads-chicken-garden-salad-2",
    "insumoId": "insu-real-sour-cream-pouch-pack",
    "cantidad": 0.216
  },
  {
    "id": "ri-real-873",
    "recetaId": "receta-real-prod-real-salads-chicken-garden-salad-2",
    "insumoId": "insu-real-carrot-sticks-5-lb",
    "cantidad": 1.5
  },
  {
    "id": "ri-real-874",
    "recetaId": "receta-real-prod-real-salads-chicken-garden-salad-2",
    "insumoId": "insu-real-cucumber-sel",
    "cantidad": 1.5
  },
  {
    "id": "ri-real-875",
    "recetaId": "receta-real-prod-real-salads-caesar-salad-3",
    "insumoId": "insu-real-lid-for-1-5-oz-souffle-cup-portion-cup-2500-pcs",
    "cantidad": 2
  },
  {
    "id": "ri-real-876",
    "recetaId": "receta-real-prod-real-salads-caesar-salad-3",
    "insumoId": "insu-real-1-5-oz-clear-plastic-souffle-cup-portion-cup-25",
    "cantidad": 2
  },
  {
    "id": "ri-real-877",
    "recetaId": "receta-real-prod-real-salads-caesar-salad-3",
    "insumoId": "insu-real-clear-salad-bowl-32oz-1000-ml-case-pack-300pcs",
    "cantidad": 1
  },
  {
    "id": "ri-real-878",
    "recetaId": "receta-real-prod-real-salads-caesar-salad-3",
    "insumoId": "insu-real-limes-200-ct",
    "cantidad": 0.012
  },
  {
    "id": "ri-real-879",
    "recetaId": "receta-real-prod-real-salads-caesar-salad-3",
    "insumoId": "insu-real-cheese-parmesan-romano-style",
    "cantidad": 0.5
  },
  {
    "id": "ri-real-880",
    "recetaId": "receta-real-prod-real-salads-caesar-salad-3",
    "insumoId": "insu-real-garlic-whl-pld-frsh",
    "cantidad": 0.036
  },
  {
    "id": "ri-real-881",
    "recetaId": "receta-real-prod-real-salads-caesar-salad-3",
    "insumoId": "insu-real-mayo-4-1-gal",
    "cantidad": 1.8176
  },
  {
    "id": "ri-real-882",
    "recetaId": "receta-real-prod-real-salads-caesar-salad-3",
    "insumoId": "insu-real-crouton-hs-lg-seasnd",
    "cantidad": 2
  },
  {
    "id": "ri-real-883",
    "recetaId": "receta-real-prod-real-salads-caesar-salad-3",
    "insumoId": "insu-real-salt-iodized-granular",
    "cantidad": 0.006
  },
  {
    "id": "ri-real-884",
    "recetaId": "receta-real-prod-real-salads-caesar-salad-3",
    "insumoId": "insu-real-napkin-xpress-nat-13-x-8-6",
    "cantidad": 3
  },
  {
    "id": "ri-real-885",
    "recetaId": "receta-real-prod-real-salads-caesar-salad-3",
    "insumoId": "insu-real-cilantro-short-stemmed-30-ct",
    "cantidad": 0.012
  },
  {
    "id": "ri-real-886",
    "recetaId": "receta-real-prod-real-salads-caesar-salad-3",
    "insumoId": "insu-real-curry-pwdr-4-4-lb",
    "cantidad": 0.0896
  },
  {
    "id": "ri-real-887",
    "recetaId": "receta-real-prod-real-salads-caesar-salad-3",
    "insumoId": "insu-real-lettuce-romaine-hearts-24-ct",
    "cantidad": 7
  },
  {
    "id": "ri-real-888",
    "recetaId": "receta-real-prod-real-salads-caesar-salad-3",
    "insumoId": "insu-real-forks",
    "cantidad": 1
  },
  {
    "id": "ri-real-889",
    "recetaId": "receta-real-prod-real-salads-caesar-salad-3",
    "insumoId": "insu-real-mustard-country-style-4-1-gal",
    "cantidad": 0.0448
  },
  {
    "id": "ri-real-890",
    "recetaId": "receta-real-prod-real-salads-caesar-salad-3",
    "insumoId": "insu-real-bag-t-shirt-12x6x21",
    "cantidad": 1
  },
  {
    "id": "ri-real-891",
    "recetaId": "receta-real-prod-real-salads-caesar-salad-3",
    "insumoId": "insu-real-clear-lid-lg-bowl",
    "cantidad": 1
  },
  {
    "id": "ri-real-892",
    "recetaId": "receta-real-prod-real-salads-caesar-salad-3",
    "insumoId": "insu-real-sour-cream-pouch-pack",
    "cantidad": 0.216
  },
  {
    "id": "ri-real-893",
    "recetaId": "receta-real-prod-real-salads-chicken-caesar-salad-4",
    "insumoId": "insu-real-lid-for-1-5-oz-souffle-cup-portion-cup-2500-pcs",
    "cantidad": 2
  },
  {
    "id": "ri-real-894",
    "recetaId": "receta-real-prod-real-salads-chicken-caesar-salad-4",
    "insumoId": "insu-real-1-5-oz-clear-plastic-souffle-cup-portion-cup-25",
    "cantidad": 2
  },
  {
    "id": "ri-real-895",
    "recetaId": "receta-real-prod-real-salads-chicken-caesar-salad-4",
    "insumoId": "insu-real-clear-salad-bowl-32oz-1000-ml-case-pack-300pcs",
    "cantidad": 1
  },
  {
    "id": "ri-real-896",
    "recetaId": "receta-real-prod-real-salads-chicken-caesar-salad-4",
    "insumoId": "insu-real-limes-200-ct",
    "cantidad": 0.012
  },
  {
    "id": "ri-real-897",
    "recetaId": "receta-real-prod-real-salads-chicken-caesar-salad-4",
    "insumoId": "insu-real-cheese-parmesan-romano-style",
    "cantidad": 0.5
  },
  {
    "id": "ri-real-898",
    "recetaId": "receta-real-prod-real-salads-chicken-caesar-salad-4",
    "insumoId": "insu-real-garlic-whl-pld-frsh",
    "cantidad": 0.036
  },
  {
    "id": "ri-real-899",
    "recetaId": "receta-real-prod-real-salads-chicken-caesar-salad-4",
    "insumoId": "insu-real-mayo-4-1-gal",
    "cantidad": 1.8176
  },
  {
    "id": "ri-real-900",
    "recetaId": "receta-real-prod-real-salads-chicken-caesar-salad-4",
    "insumoId": "insu-real-crouton-hs-lg-seasnd",
    "cantidad": 1.5
  },
  {
    "id": "ri-real-901",
    "recetaId": "receta-real-prod-real-salads-chicken-caesar-salad-4",
    "insumoId": "insu-real-salt-iodized-granular",
    "cantidad": 0.0685
  },
  {
    "id": "ri-real-902",
    "recetaId": "receta-real-prod-real-salads-chicken-caesar-salad-4",
    "insumoId": "insu-real-napkin-xpress-nat-13-x-8-6",
    "cantidad": 3
  },
  {
    "id": "ri-real-903",
    "recetaId": "receta-real-prod-real-salads-chicken-caesar-salad-4",
    "insumoId": "insu-real-cilantro-short-stemmed-30-ct",
    "cantidad": 0.012
  },
  {
    "id": "ri-real-904",
    "recetaId": "receta-real-prod-real-salads-chicken-caesar-salad-4",
    "insumoId": "insu-real-chicken-breast-4-10-lb",
    "cantidad": 6.6667
  },
  {
    "id": "ri-real-905",
    "recetaId": "receta-real-prod-real-salads-chicken-caesar-salad-4",
    "insumoId": "insu-real-curry-pwdr-4-4-lb",
    "cantidad": 0.0896
  },
  {
    "id": "ri-real-906",
    "recetaId": "receta-real-prod-real-salads-chicken-caesar-salad-4",
    "insumoId": "insu-real-lettuce-romaine-hearts-24-ct",
    "cantidad": 7
  },
  {
    "id": "ri-real-907",
    "recetaId": "receta-real-prod-real-salads-chicken-caesar-salad-4",
    "insumoId": "insu-real-forks",
    "cantidad": 1
  },
  {
    "id": "ri-real-908",
    "recetaId": "receta-real-prod-real-salads-chicken-caesar-salad-4",
    "insumoId": "insu-real-mustard-country-style-4-1-gal",
    "cantidad": 0.0448
  },
  {
    "id": "ri-real-909",
    "recetaId": "receta-real-prod-real-salads-chicken-caesar-salad-4",
    "insumoId": "insu-real-base-chicken-lemon",
    "cantidad": 0.1458
  },
  {
    "id": "ri-real-910",
    "recetaId": "receta-real-prod-real-salads-chicken-caesar-salad-4",
    "insumoId": "insu-real-bag-t-shirt-12x6x21",
    "cantidad": 1
  },
  {
    "id": "ri-real-911",
    "recetaId": "receta-real-prod-real-salads-chicken-caesar-salad-4",
    "insumoId": "insu-real-clear-lid-lg-bowl",
    "cantidad": 1
  },
  {
    "id": "ri-real-912",
    "recetaId": "receta-real-prod-real-salads-chicken-caesar-salad-4",
    "insumoId": "insu-real-sour-cream-pouch-pack",
    "cantidad": 0.216
  },
  {
    "id": "ri-real-913",
    "recetaId": "receta-real-prod-real-salads-chicken-make-your-own-s-6",
    "insumoId": "insu-real-lid-for-1-5-oz-souffle-cup-portion-cup-2500-pcs",
    "cantidad": 2
  },
  {
    "id": "ri-real-914",
    "recetaId": "receta-real-prod-real-salads-chicken-make-your-own-s-6",
    "insumoId": "insu-real-1-5-oz-clear-plastic-souffle-cup-portion-cup-25",
    "cantidad": 2
  },
  {
    "id": "ri-real-915",
    "recetaId": "receta-real-prod-real-salads-chicken-make-your-own-s-6",
    "insumoId": "insu-real-clear-salad-bowl-32oz-1000-ml-case-pack-300pcs",
    "cantidad": 1
  },
  {
    "id": "ri-real-916",
    "recetaId": "receta-real-prod-real-salads-chicken-make-your-own-s-6",
    "insumoId": "insu-real-limes-200-ct",
    "cantidad": 0.012
  },
  {
    "id": "ri-real-917",
    "recetaId": "receta-real-prod-real-salads-chicken-make-your-own-s-6",
    "insumoId": "insu-real-garlic-whl-pld-frsh",
    "cantidad": 0.036
  },
  {
    "id": "ri-real-918",
    "recetaId": "receta-real-prod-real-salads-chicken-make-your-own-s-6",
    "insumoId": "insu-real-mayo-4-1-gal",
    "cantidad": 1.8176
  },
  {
    "id": "ri-real-919",
    "recetaId": "receta-real-prod-real-salads-chicken-make-your-own-s-6",
    "insumoId": "insu-real-salt-iodized-granular",
    "cantidad": 0.0685
  },
  {
    "id": "ri-real-920",
    "recetaId": "receta-real-prod-real-salads-chicken-make-your-own-s-6",
    "insumoId": "insu-real-napkin-xpress-nat-13-x-8-6",
    "cantidad": 3
  },
  {
    "id": "ri-real-921",
    "recetaId": "receta-real-prod-real-salads-chicken-make-your-own-s-6",
    "insumoId": "insu-real-cilantro-short-stemmed-30-ct",
    "cantidad": 0.012
  },
  {
    "id": "ri-real-922",
    "recetaId": "receta-real-prod-real-salads-chicken-make-your-own-s-6",
    "insumoId": "insu-real-chicken-breast-4-10-lb",
    "cantidad": 6.6667
  },
  {
    "id": "ri-real-923",
    "recetaId": "receta-real-prod-real-salads-chicken-make-your-own-s-6",
    "insumoId": "insu-real-curry-pwdr-4-4-lb",
    "cantidad": 0.0896
  },
  {
    "id": "ri-real-924",
    "recetaId": "receta-real-prod-real-salads-chicken-make-your-own-s-6",
    "insumoId": "insu-real-lettuce-romaine-hearts-24-ct",
    "cantidad": 3
  },
  {
    "id": "ri-real-925",
    "recetaId": "receta-real-prod-real-salads-chicken-make-your-own-s-6",
    "insumoId": "insu-real-forks",
    "cantidad": 1
  },
  {
    "id": "ri-real-926",
    "recetaId": "receta-real-prod-real-salads-chicken-make-your-own-s-6",
    "insumoId": "insu-real-mustard-country-style-4-1-gal",
    "cantidad": 0.0448
  },
  {
    "id": "ri-real-927",
    "recetaId": "receta-real-prod-real-salads-chicken-make-your-own-s-6",
    "insumoId": "insu-real-base-chicken-lemon",
    "cantidad": 0.1458
  },
  {
    "id": "ri-real-928",
    "recetaId": "receta-real-prod-real-salads-chicken-make-your-own-s-6",
    "insumoId": "insu-real-bag-t-shirt-12x6x21",
    "cantidad": 1
  },
  {
    "id": "ri-real-929",
    "recetaId": "receta-real-prod-real-salads-chicken-make-your-own-s-6",
    "insumoId": "insu-real-clear-lid-lg-bowl",
    "cantidad": 1
  },
  {
    "id": "ri-real-930",
    "recetaId": "receta-real-prod-real-salads-chicken-make-your-own-s-6",
    "insumoId": "insu-real-spring-mix",
    "cantidad": 2
  },
  {
    "id": "ri-real-931",
    "recetaId": "receta-real-prod-real-salads-chicken-make-your-own-s-6",
    "insumoId": "insu-real-sour-cream-pouch-pack",
    "cantidad": 0.216
  },
  {
    "id": "ri-real-932",
    "recetaId": "receta-real-prod-real-salads-xtra-chicken-8",
    "insumoId": "insu-real-salt-iodized-granular",
    "cantidad": 0.05
  },
  {
    "id": "ri-real-933",
    "recetaId": "receta-real-prod-real-salads-xtra-chicken-8",
    "insumoId": "insu-real-chicken-breast-4-10-lb",
    "cantidad": 5.3333
  },
  {
    "id": "ri-real-934",
    "recetaId": "receta-real-prod-real-salads-xtra-chicken-8",
    "insumoId": "insu-real-base-chicken-lemon",
    "cantidad": 0.1167
  },
  {
    "id": "ri-real-935",
    "recetaId": "receta-real-prod-real-salads-family-garden-salad-9",
    "insumoId": "insu-real-peppers-red-bell",
    "cantidad": 4.5
  },
  {
    "id": "ri-real-936",
    "recetaId": "receta-real-prod-real-salads-family-garden-salad-9",
    "insumoId": "insu-real-lettuce-romaine-hearts-24-ct",
    "cantidad": 20
  },
  {
    "id": "ri-real-937",
    "recetaId": "receta-real-prod-real-salads-family-garden-salad-9",
    "insumoId": "insu-real-tomato-25-lb",
    "cantidad": 6
  },
  {
    "id": "ri-real-938",
    "recetaId": "receta-real-prod-real-salads-family-garden-salad-9",
    "insumoId": "insu-real-peppers-green-bell",
    "cantidad": 4.5
  },
  {
    "id": "ri-real-939",
    "recetaId": "receta-real-prod-real-salads-family-garden-salad-9",
    "insumoId": "insu-real-spring-mix",
    "cantidad": 8
  },
  {
    "id": "ri-real-940",
    "recetaId": "receta-real-prod-real-salads-family-garden-salad-9",
    "insumoId": "insu-real-carrot-sticks-5-lb",
    "cantidad": 6
  },
  {
    "id": "ri-real-941",
    "recetaId": "receta-real-prod-real-salads-family-garden-salad-9",
    "insumoId": "insu-real-cucumber-sel",
    "cantidad": 6
  },
  {
    "id": "ri-real-942",
    "recetaId": "receta-real-prod-real-salads-family-chicken-garden-s-10",
    "insumoId": "insu-real-peppers-red-bell",
    "cantidad": 4.5
  },
  {
    "id": "ri-real-943",
    "recetaId": "receta-real-prod-real-salads-family-chicken-garden-s-10",
    "insumoId": "insu-real-salt-iodized-granular",
    "cantidad": 0.25
  },
  {
    "id": "ri-real-944",
    "recetaId": "receta-real-prod-real-salads-family-chicken-garden-s-10",
    "insumoId": "insu-real-chicken-breast-4-10-lb",
    "cantidad": 26.6667
  },
  {
    "id": "ri-real-945",
    "recetaId": "receta-real-prod-real-salads-family-chicken-garden-s-10",
    "insumoId": "insu-real-lettuce-romaine-hearts-24-ct",
    "cantidad": 20
  },
  {
    "id": "ri-real-946",
    "recetaId": "receta-real-prod-real-salads-family-chicken-garden-s-10",
    "insumoId": "insu-real-base-chicken-lemon",
    "cantidad": 0.5833
  },
  {
    "id": "ri-real-947",
    "recetaId": "receta-real-prod-real-salads-family-chicken-garden-s-10",
    "insumoId": "insu-real-tomato-25-lb",
    "cantidad": 6
  },
  {
    "id": "ri-real-948",
    "recetaId": "receta-real-prod-real-salads-family-chicken-garden-s-10",
    "insumoId": "insu-real-peppers-green-bell",
    "cantidad": 4.5
  },
  {
    "id": "ri-real-949",
    "recetaId": "receta-real-prod-real-salads-family-chicken-garden-s-10",
    "insumoId": "insu-real-spring-mix",
    "cantidad": 8
  },
  {
    "id": "ri-real-950",
    "recetaId": "receta-real-prod-real-salads-family-chicken-garden-s-10",
    "insumoId": "insu-real-carrot-sticks-5-lb",
    "cantidad": 6
  },
  {
    "id": "ri-real-951",
    "recetaId": "receta-real-prod-real-salads-family-chicken-garden-s-10",
    "insumoId": "insu-real-cucumber-sel",
    "cantidad": 6
  },
  {
    "id": "ri-real-952",
    "recetaId": "receta-real-prod-real-salads-party-garden-salad-15",
    "insumoId": "insu-real-peppers-red-bell",
    "cantidad": 9
  },
  {
    "id": "ri-real-953",
    "recetaId": "receta-real-prod-real-salads-party-garden-salad-15",
    "insumoId": "insu-real-lettuce-romaine-hearts-24-ct",
    "cantidad": 40
  },
  {
    "id": "ri-real-954",
    "recetaId": "receta-real-prod-real-salads-party-garden-salad-15",
    "insumoId": "insu-real-tomato-25-lb",
    "cantidad": 12
  },
  {
    "id": "ri-real-955",
    "recetaId": "receta-real-prod-real-salads-party-garden-salad-15",
    "insumoId": "insu-real-peppers-green-bell",
    "cantidad": 9
  },
  {
    "id": "ri-real-956",
    "recetaId": "receta-real-prod-real-salads-party-garden-salad-15",
    "insumoId": "insu-real-spring-mix",
    "cantidad": 16
  },
  {
    "id": "ri-real-957",
    "recetaId": "receta-real-prod-real-salads-party-garden-salad-15",
    "insumoId": "insu-real-carrot-sticks-5-lb",
    "cantidad": 12
  },
  {
    "id": "ri-real-958",
    "recetaId": "receta-real-prod-real-salads-party-garden-salad-15",
    "insumoId": "insu-real-cucumber-sel",
    "cantidad": 12
  },
  {
    "id": "ri-real-959",
    "recetaId": "receta-real-prod-real-boneless-sm-chopped-chicken-bre-1",
    "insumoId": "insu-real-8-oz-translucent-pp-round-deli-container-with-lid",
    "cantidad": 1
  },
  {
    "id": "ri-real-960",
    "recetaId": "receta-real-prod-real-boneless-sm-chopped-chicken-bre-1",
    "insumoId": "insu-real-salt-iodized-granular",
    "cantidad": 0.1
  },
  {
    "id": "ri-real-961",
    "recetaId": "receta-real-prod-real-boneless-sm-chopped-chicken-bre-1",
    "insumoId": "insu-real-napkin-xpress-nat-13-x-8-6",
    "cantidad": 3
  },
  {
    "id": "ri-real-962",
    "recetaId": "receta-real-prod-real-boneless-sm-chopped-chicken-bre-1",
    "insumoId": "insu-real-chicken-breast-4-10-lb",
    "cantidad": 10.6667
  },
  {
    "id": "ri-real-963",
    "recetaId": "receta-real-prod-real-boneless-sm-chopped-chicken-bre-1",
    "insumoId": "insu-real-forks",
    "cantidad": 1
  },
  {
    "id": "ri-real-964",
    "recetaId": "receta-real-prod-real-boneless-sm-chopped-chicken-bre-1",
    "insumoId": "insu-real-base-chicken-lemon",
    "cantidad": 0.2333
  },
  {
    "id": "ri-real-965",
    "recetaId": "receta-real-prod-real-boneless-sm-chopped-chicken-bre-1",
    "insumoId": "insu-real-bag-t-shirt-12x6x21",
    "cantidad": 1
  },
  {
    "id": "ri-real-966",
    "recetaId": "receta-real-prod-real-boneless-lg-chopped-chicken-bre-2",
    "insumoId": "insu-real-e16-oz-translucent-pp-round-deli-container-with-lid",
    "cantidad": 1
  },
  {
    "id": "ri-real-967",
    "recetaId": "receta-real-prod-real-boneless-lg-chopped-chicken-bre-2",
    "insumoId": "insu-real-salt-iodized-granular",
    "cantidad": 0.2
  },
  {
    "id": "ri-real-968",
    "recetaId": "receta-real-prod-real-boneless-lg-chopped-chicken-bre-2",
    "insumoId": "insu-real-napkin-xpress-nat-13-x-8-6",
    "cantidad": 3
  },
  {
    "id": "ri-real-969",
    "recetaId": "receta-real-prod-real-boneless-lg-chopped-chicken-bre-2",
    "insumoId": "insu-real-chicken-breast-4-10-lb",
    "cantidad": 21.3333
  },
  {
    "id": "ri-real-970",
    "recetaId": "receta-real-prod-real-boneless-lg-chopped-chicken-bre-2",
    "insumoId": "insu-real-forks",
    "cantidad": 1
  },
  {
    "id": "ri-real-971",
    "recetaId": "receta-real-prod-real-boneless-lg-chopped-chicken-bre-2",
    "insumoId": "insu-real-base-chicken-lemon",
    "cantidad": 0.4667
  },
  {
    "id": "ri-real-972",
    "recetaId": "receta-real-prod-real-boneless-lg-chopped-chicken-bre-2",
    "insumoId": "insu-real-bag-t-shirt-12x6x21",
    "cantidad": 1
  },
  {
    "id": "ri-real-973",
    "recetaId": "receta-real-prod-real-boneless-single-chicken-breast-f-3",
    "insumoId": "insu-real-small-plate-32-oz-round-container-only-base-300",
    "cantidad": 1
  },
  {
    "id": "ri-real-974",
    "recetaId": "receta-real-prod-real-boneless-single-chicken-breast-f-3",
    "insumoId": "insu-real-24-32-oz-injected-molded-clear-lid-300pcsc",
    "cantidad": 1
  },
  {
    "id": "ri-real-975",
    "recetaId": "receta-real-prod-real-boneless-single-chicken-breast-f-3",
    "insumoId": "insu-real-salt-iodized-granular",
    "cantidad": 0.2
  },
  {
    "id": "ri-real-976",
    "recetaId": "receta-real-prod-real-boneless-single-chicken-breast-f-3",
    "insumoId": "insu-real-napkin-xpress-nat-13-x-8-6",
    "cantidad": 3
  },
  {
    "id": "ri-real-977",
    "recetaId": "receta-real-prod-real-boneless-single-chicken-breast-f-3",
    "insumoId": "insu-real-chicken-breast-4-10-lb",
    "cantidad": 21.3333
  },
  {
    "id": "ri-real-978",
    "recetaId": "receta-real-prod-real-boneless-single-chicken-breast-f-3",
    "insumoId": "insu-real-forks",
    "cantidad": 1
  },
  {
    "id": "ri-real-979",
    "recetaId": "receta-real-prod-real-boneless-single-chicken-breast-f-3",
    "insumoId": "insu-real-base-chicken-lemon",
    "cantidad": 0.4667
  },
  {
    "id": "ri-real-980",
    "recetaId": "receta-real-prod-real-boneless-single-chicken-breast-f-3",
    "insumoId": "insu-real-bag-t-shirt-12x6x21",
    "cantidad": 1
  },
  {
    "id": "ri-real-981",
    "recetaId": "receta-real-prod-real-boneless-double-chicken-breast-f-4",
    "insumoId": "insu-real-large-plate-35oz-round-black-container-only-base",
    "cantidad": 1
  },
  {
    "id": "ri-real-982",
    "recetaId": "receta-real-prod-real-boneless-double-chicken-breast-f-4",
    "insumoId": "insu-real-salt-iodized-granular",
    "cantidad": 0.2
  },
  {
    "id": "ri-real-983",
    "recetaId": "receta-real-prod-real-boneless-double-chicken-breast-f-4",
    "insumoId": "insu-real-napkin-xpress-nat-13-x-8-6",
    "cantidad": 3
  },
  {
    "id": "ri-real-984",
    "recetaId": "receta-real-prod-real-boneless-double-chicken-breast-f-4",
    "insumoId": "insu-real-chicken-breast-4-10-lb",
    "cantidad": 21.3333
  },
  {
    "id": "ri-real-985",
    "recetaId": "receta-real-prod-real-boneless-double-chicken-breast-f-4",
    "insumoId": "insu-real-forks",
    "cantidad": 1
  },
  {
    "id": "ri-real-986",
    "recetaId": "receta-real-prod-real-boneless-double-chicken-breast-f-4",
    "insumoId": "insu-real-base-chicken-lemon",
    "cantidad": 0.4667
  },
  {
    "id": "ri-real-987",
    "recetaId": "receta-real-prod-real-boneless-double-chicken-breast-f-4",
    "insumoId": "insu-real-bag-t-shirt-12x6x21",
    "cantidad": 1
  },
  {
    "id": "ri-real-988",
    "recetaId": "receta-real-prod-real-boneless-double-chicken-breast-f-4",
    "insumoId": "insu-real-clear-lid-lg-bowl",
    "cantidad": 1
  },
  {
    "id": "ri-real-989",
    "recetaId": "receta-real-prod-real-boneless-sm-chopped-chicken-brea-5",
    "insumoId": "insu-real-lid-for-1-5-oz-souffle-cup-portion-cup-2500-pcs",
    "cantidad": 2
  },
  {
    "id": "ri-real-990",
    "recetaId": "receta-real-prod-real-boneless-sm-chopped-chicken-brea-5",
    "insumoId": "insu-real-1-5-oz-clear-plastic-souffle-cup-portion-cup-25",
    "cantidad": 2
  },
  {
    "id": "ri-real-991",
    "recetaId": "receta-real-prod-real-boneless-sm-chopped-chicken-brea-5",
    "insumoId": "insu-real-large-plate-35oz-round-black-container-only-base",
    "cantidad": 1
  },
  {
    "id": "ri-real-992",
    "recetaId": "receta-real-prod-real-boneless-sm-chopped-chicken-brea-5",
    "insumoId": "insu-real-limes-200-ct",
    "cantidad": 0.012
  },
  {
    "id": "ri-real-993",
    "recetaId": "receta-real-prod-real-boneless-sm-chopped-chicken-brea-5",
    "insumoId": "insu-real-garlic-whl-pld-frsh",
    "cantidad": 0.036
  },
  {
    "id": "ri-real-994",
    "recetaId": "receta-real-prod-real-boneless-sm-chopped-chicken-brea-5",
    "insumoId": "insu-real-mayo-4-1-gal",
    "cantidad": 1.8176
  },
  {
    "id": "ri-real-995",
    "recetaId": "receta-real-prod-real-boneless-sm-chopped-chicken-brea-5",
    "insumoId": "insu-real-salt-iodized-granular",
    "cantidad": 0.1185
  },
  {
    "id": "ri-real-996",
    "recetaId": "receta-real-prod-real-boneless-sm-chopped-chicken-brea-5",
    "insumoId": "insu-real-napkin-xpress-nat-13-x-8-6",
    "cantidad": 3
  },
  {
    "id": "ri-real-997",
    "recetaId": "receta-real-prod-real-boneless-sm-chopped-chicken-brea-5",
    "insumoId": "insu-real-cilantro-short-stemmed-30-ct",
    "cantidad": 0.012
  },
  {
    "id": "ri-real-998",
    "recetaId": "receta-real-prod-real-boneless-sm-chopped-chicken-brea-5",
    "insumoId": "insu-real-chicken-breast-4-10-lb",
    "cantidad": 12
  },
  {
    "id": "ri-real-999",
    "recetaId": "receta-real-prod-real-boneless-sm-chopped-chicken-brea-5",
    "insumoId": "insu-real-curry-pwdr-4-4-lb",
    "cantidad": 0.0896
  },
  {
    "id": "ri-real-1000",
    "recetaId": "receta-real-prod-real-boneless-sm-chopped-chicken-brea-5",
    "insumoId": "insu-real-forks",
    "cantidad": 1
  },
  {
    "id": "ri-real-1001",
    "recetaId": "receta-real-prod-real-boneless-sm-chopped-chicken-brea-5",
    "insumoId": "insu-real-mustard-country-style-4-1-gal",
    "cantidad": 0.0448
  },
  {
    "id": "ri-real-1002",
    "recetaId": "receta-real-prod-real-boneless-sm-chopped-chicken-brea-5",
    "insumoId": "insu-real-base-chicken-lemon",
    "cantidad": 0.2625
  },
  {
    "id": "ri-real-1003",
    "recetaId": "receta-real-prod-real-boneless-sm-chopped-chicken-brea-5",
    "insumoId": "insu-real-bag-t-shirt-12x6x21",
    "cantidad": 1
  },
  {
    "id": "ri-real-1004",
    "recetaId": "receta-real-prod-real-boneless-sm-chopped-chicken-brea-5",
    "insumoId": "insu-real-clear-lid-lg-bowl",
    "cantidad": 1
  },
  {
    "id": "ri-real-1005",
    "recetaId": "receta-real-prod-real-boneless-sm-chopped-chicken-brea-5",
    "insumoId": "insu-real-sour-cream-pouch-pack",
    "cantidad": 0.216
  },
  {
    "id": "ri-real-1006",
    "recetaId": "receta-real-prod-real-boneless-lg-chopped-chicken-brea-6",
    "insumoId": "insu-real-lid-for-1-5-oz-souffle-cup-portion-cup-2500-pcs",
    "cantidad": 2
  },
  {
    "id": "ri-real-1007",
    "recetaId": "receta-real-prod-real-boneless-lg-chopped-chicken-brea-6",
    "insumoId": "insu-real-1-5-oz-clear-plastic-souffle-cup-portion-cup-25",
    "cantidad": 2
  },
  {
    "id": "ri-real-1008",
    "recetaId": "receta-real-prod-real-boneless-lg-chopped-chicken-brea-6",
    "insumoId": "insu-real-large-plate-35oz-round-black-container-only-base",
    "cantidad": 1
  },
  {
    "id": "ri-real-1009",
    "recetaId": "receta-real-prod-real-boneless-lg-chopped-chicken-brea-6",
    "insumoId": "insu-real-limes-200-ct",
    "cantidad": 0.012
  },
  {
    "id": "ri-real-1010",
    "recetaId": "receta-real-prod-real-boneless-lg-chopped-chicken-brea-6",
    "insumoId": "insu-real-garlic-whl-pld-frsh",
    "cantidad": 0.036
  },
  {
    "id": "ri-real-1011",
    "recetaId": "receta-real-prod-real-boneless-lg-chopped-chicken-brea-6",
    "insumoId": "insu-real-mayo-4-1-gal",
    "cantidad": 1.8176
  },
  {
    "id": "ri-real-1012",
    "recetaId": "receta-real-prod-real-boneless-lg-chopped-chicken-brea-6",
    "insumoId": "insu-real-salt-iodized-granular",
    "cantidad": 0.1435
  },
  {
    "id": "ri-real-1013",
    "recetaId": "receta-real-prod-real-boneless-lg-chopped-chicken-brea-6",
    "insumoId": "insu-real-napkin-xpress-nat-13-x-8-6",
    "cantidad": 3
  },
  {
    "id": "ri-real-1014",
    "recetaId": "receta-real-prod-real-boneless-lg-chopped-chicken-brea-6",
    "insumoId": "insu-real-cilantro-short-stemmed-30-ct",
    "cantidad": 0.012
  },
  {
    "id": "ri-real-1015",
    "recetaId": "receta-real-prod-real-boneless-lg-chopped-chicken-brea-6",
    "insumoId": "insu-real-chicken-breast-4-10-lb",
    "cantidad": 14.6667
  },
  {
    "id": "ri-real-1016",
    "recetaId": "receta-real-prod-real-boneless-lg-chopped-chicken-brea-6",
    "insumoId": "insu-real-curry-pwdr-4-4-lb",
    "cantidad": 0.0896
  },
  {
    "id": "ri-real-1017",
    "recetaId": "receta-real-prod-real-boneless-lg-chopped-chicken-brea-6",
    "insumoId": "insu-real-forks",
    "cantidad": 1
  },
  {
    "id": "ri-real-1018",
    "recetaId": "receta-real-prod-real-boneless-lg-chopped-chicken-brea-6",
    "insumoId": "insu-real-mustard-country-style-4-1-gal",
    "cantidad": 0.0448
  },
  {
    "id": "ri-real-1019",
    "recetaId": "receta-real-prod-real-boneless-lg-chopped-chicken-brea-6",
    "insumoId": "insu-real-base-chicken-lemon",
    "cantidad": 0.3208
  },
  {
    "id": "ri-real-1020",
    "recetaId": "receta-real-prod-real-boneless-lg-chopped-chicken-brea-6",
    "insumoId": "insu-real-bag-t-shirt-12x6x21",
    "cantidad": 1
  },
  {
    "id": "ri-real-1021",
    "recetaId": "receta-real-prod-real-boneless-lg-chopped-chicken-brea-6",
    "insumoId": "insu-real-clear-lid-lg-bowl",
    "cantidad": 1
  },
  {
    "id": "ri-real-1022",
    "recetaId": "receta-real-prod-real-boneless-lg-chopped-chicken-brea-6",
    "insumoId": "insu-real-sour-cream-pouch-pack",
    "cantidad": 0.216
  },
  {
    "id": "ri-real-1023",
    "recetaId": "receta-real-prod-real-boneless-chicken-breast-filet-pl-7",
    "insumoId": "insu-real-lid-for-1-5-oz-souffle-cup-portion-cup-2500-pcs",
    "cantidad": 2
  },
  {
    "id": "ri-real-1024",
    "recetaId": "receta-real-prod-real-boneless-chicken-breast-filet-pl-7",
    "insumoId": "insu-real-1-5-oz-clear-plastic-souffle-cup-portion-cup-25",
    "cantidad": 2
  },
  {
    "id": "ri-real-1025",
    "recetaId": "receta-real-prod-real-boneless-chicken-breast-filet-pl-7",
    "insumoId": "insu-real-large-plate-35oz-round-black-container-only-base",
    "cantidad": 1
  },
  {
    "id": "ri-real-1026",
    "recetaId": "receta-real-prod-real-boneless-chicken-breast-filet-pl-7",
    "insumoId": "insu-real-limes-200-ct",
    "cantidad": 0.012
  },
  {
    "id": "ri-real-1027",
    "recetaId": "receta-real-prod-real-boneless-chicken-breast-filet-pl-7",
    "insumoId": "insu-real-garlic-whl-pld-frsh",
    "cantidad": 0.036
  },
  {
    "id": "ri-real-1028",
    "recetaId": "receta-real-prod-real-boneless-chicken-breast-filet-pl-7",
    "insumoId": "insu-real-mayo-4-1-gal",
    "cantidad": 1.8176
  },
  {
    "id": "ri-real-1029",
    "recetaId": "receta-real-prod-real-boneless-chicken-breast-filet-pl-7",
    "insumoId": "insu-real-salt-iodized-granular",
    "cantidad": 0.106
  },
  {
    "id": "ri-real-1030",
    "recetaId": "receta-real-prod-real-boneless-chicken-breast-filet-pl-7",
    "insumoId": "insu-real-napkin-xpress-nat-13-x-8-6",
    "cantidad": 3
  },
  {
    "id": "ri-real-1031",
    "recetaId": "receta-real-prod-real-boneless-chicken-breast-filet-pl-7",
    "insumoId": "insu-real-cilantro-short-stemmed-30-ct",
    "cantidad": 0.012
  },
  {
    "id": "ri-real-1032",
    "recetaId": "receta-real-prod-real-boneless-chicken-breast-filet-pl-7",
    "insumoId": "insu-real-chicken-breast-4-10-lb",
    "cantidad": 10.6667
  },
  {
    "id": "ri-real-1033",
    "recetaId": "receta-real-prod-real-boneless-chicken-breast-filet-pl-7",
    "insumoId": "insu-real-curry-pwdr-4-4-lb",
    "cantidad": 0.0896
  },
  {
    "id": "ri-real-1034",
    "recetaId": "receta-real-prod-real-boneless-chicken-breast-filet-pl-7",
    "insumoId": "insu-real-forks",
    "cantidad": 1
  },
  {
    "id": "ri-real-1035",
    "recetaId": "receta-real-prod-real-boneless-chicken-breast-filet-pl-7",
    "insumoId": "insu-real-mustard-country-style-4-1-gal",
    "cantidad": 0.0448
  },
  {
    "id": "ri-real-1036",
    "recetaId": "receta-real-prod-real-boneless-chicken-breast-filet-pl-7",
    "insumoId": "insu-real-base-chicken-lemon",
    "cantidad": 0.2333
  },
  {
    "id": "ri-real-1037",
    "recetaId": "receta-real-prod-real-boneless-chicken-breast-filet-pl-7",
    "insumoId": "insu-real-bag-t-shirt-12x6x21",
    "cantidad": 1
  },
  {
    "id": "ri-real-1038",
    "recetaId": "receta-real-prod-real-boneless-chicken-breast-filet-pl-7",
    "insumoId": "insu-real-clear-lid-lg-bowl",
    "cantidad": 1
  },
  {
    "id": "ri-real-1039",
    "recetaId": "receta-real-prod-real-boneless-chicken-breast-filet-pl-7",
    "insumoId": "insu-real-sour-cream-pouch-pack",
    "cantidad": 0.216
  },
  {
    "id": "ri-real-1040",
    "recetaId": "receta-real-prod-real-boneless-double-chikn-breast-fam-8",
    "insumoId": "insu-real-8-oz-translucent-pp-round-deli-container-with-lid",
    "cantidad": 4
  },
  {
    "id": "ri-real-1041",
    "recetaId": "receta-real-prod-real-boneless-double-chikn-breast-fam-8",
    "insumoId": "insu-real-large-plate-35oz-round-black-container-only-base",
    "cantidad": 1
  },
  {
    "id": "ri-real-1042",
    "recetaId": "receta-real-prod-real-boneless-double-chikn-breast-fam-8",
    "insumoId": "insu-real-salt-iodized-granular",
    "cantidad": 0.2
  },
  {
    "id": "ri-real-1043",
    "recetaId": "receta-real-prod-real-boneless-double-chikn-breast-fam-8",
    "insumoId": "insu-real-napkin-xpress-nat-13-x-8-6",
    "cantidad": 15
  },
  {
    "id": "ri-real-1044",
    "recetaId": "receta-real-prod-real-boneless-double-chikn-breast-fam-8",
    "insumoId": "insu-real-chicken-breast-4-10-lb",
    "cantidad": 21.3333
  },
  {
    "id": "ri-real-1045",
    "recetaId": "receta-real-prod-real-boneless-double-chikn-breast-fam-8",
    "insumoId": "insu-real-forks",
    "cantidad": 5
  },
  {
    "id": "ri-real-1046",
    "recetaId": "receta-real-prod-real-boneless-double-chikn-breast-fam-8",
    "insumoId": "insu-real-base-chicken-lemon",
    "cantidad": 0.4667
  },
  {
    "id": "ri-real-1047",
    "recetaId": "receta-real-prod-real-boneless-double-chikn-breast-fam-8",
    "insumoId": "insu-real-bag-t-shirt-12x6x21",
    "cantidad": 5
  },
  {
    "id": "ri-real-1048",
    "recetaId": "receta-real-prod-real-boneless-double-chikn-breast-fam-8",
    "insumoId": "insu-real-clear-lid-lg-bowl",
    "cantidad": 1
  },
  {
    "id": "ri-real-1049",
    "recetaId": "receta-real-prod-real-sides-sm-fresh-guacamole-1",
    "insumoId": "insu-real-8-oz-translucent-pp-round-deli-container-with-lid",
    "cantidad": 1
  },
  {
    "id": "ri-real-1050",
    "recetaId": "receta-real-prod-real-sides-sm-fresh-guacamole-1",
    "insumoId": "insu-real-limes-200-ct",
    "cantidad": 0.2143
  },
  {
    "id": "ri-real-1051",
    "recetaId": "receta-real-prod-real-sides-sm-fresh-guacamole-1",
    "insumoId": "insu-real-avocado-ripe-48-ct",
    "cantidad": 1.4286
  },
  {
    "id": "ri-real-1052",
    "recetaId": "receta-real-prod-real-sides-sm-fresh-guacamole-1",
    "insumoId": "insu-real-peppers-jalapeno",
    "cantidad": 0.2857
  },
  {
    "id": "ri-real-1053",
    "recetaId": "receta-real-prod-real-sides-sm-fresh-guacamole-1",
    "insumoId": "insu-real-salt-iodized-granular",
    "cantidad": 0.2857
  },
  {
    "id": "ri-real-1054",
    "recetaId": "receta-real-prod-real-sides-sm-fresh-guacamole-1",
    "insumoId": "insu-real-napkin-xpress-nat-13-x-8-6",
    "cantidad": 3
  },
  {
    "id": "ri-real-1055",
    "recetaId": "receta-real-prod-real-sides-sm-fresh-guacamole-1",
    "insumoId": "insu-real-cilantro-short-stemmed-30-ct",
    "cantidad": 0.2857
  },
  {
    "id": "ri-real-1056",
    "recetaId": "receta-real-prod-real-sides-sm-fresh-guacamole-1",
    "insumoId": "insu-real-forks",
    "cantidad": 1
  },
  {
    "id": "ri-real-1057",
    "recetaId": "receta-real-prod-real-sides-sm-fresh-guacamole-1",
    "insumoId": "insu-real-bag-t-shirt-12x6x21",
    "cantidad": 1
  },
  {
    "id": "ri-real-1058",
    "recetaId": "receta-real-prod-real-sides-sm-fresh-guacamole-1",
    "insumoId": "insu-real-tomato-25-lb",
    "cantidad": 2.2857
  },
  {
    "id": "ri-real-1059",
    "recetaId": "receta-real-prod-real-sides-sm-fresh-guacamole-1",
    "insumoId": "insu-real-onion-red-jumbo",
    "cantidad": 0.5714
  },
  {
    "id": "ri-real-1060",
    "recetaId": "receta-real-prod-real-sides-sm-baked-sweet-plant-2",
    "insumoId": "insu-real-8-oz-translucent-pp-round-deli-container-with-lid",
    "cantidad": 1
  },
  {
    "id": "ri-real-1061",
    "recetaId": "receta-real-prod-real-sides-sm-baked-sweet-plant-2",
    "insumoId": "insu-real-napkin-xpress-nat-13-x-8-6",
    "cantidad": 3
  },
  {
    "id": "ri-real-1062",
    "recetaId": "receta-real-prod-real-sides-sm-baked-sweet-plant-2",
    "insumoId": "insu-real-forks",
    "cantidad": 1
  },
  {
    "id": "ri-real-1063",
    "recetaId": "receta-real-prod-real-sides-sm-baked-sweet-plant-2",
    "insumoId": "insu-real-bag-t-shirt-12x6x21",
    "cantidad": 1
  },
  {
    "id": "ri-real-1064",
    "recetaId": "receta-real-prod-real-sides-sm-baked-sweet-plant-2",
    "insumoId": "insu-real-plantain-sweet-sliced",
    "cantidad": 8
  },
  {
    "id": "ri-real-1065",
    "recetaId": "receta-real-prod-real-sides-sm-black-beans-3",
    "insumoId": "insu-real-8-oz-translucent-pp-round-deli-container-with-lid",
    "cantidad": 1
  },
  {
    "id": "ri-real-1066",
    "recetaId": "receta-real-prod-real-sides-sm-black-beans-3",
    "insumoId": "insu-real-napkin-xpress-nat-13-x-8-6",
    "cantidad": 3
  },
  {
    "id": "ri-real-1067",
    "recetaId": "receta-real-prod-real-sides-sm-black-beans-3",
    "insumoId": "insu-real-black-bean-seasoned",
    "cantidad": 9
  },
  {
    "id": "ri-real-1068",
    "recetaId": "receta-real-prod-real-sides-sm-black-beans-3",
    "insumoId": "insu-real-forks",
    "cantidad": 1
  },
  {
    "id": "ri-real-1069",
    "recetaId": "receta-real-prod-real-sides-sm-black-beans-3",
    "insumoId": "insu-real-bag-t-shirt-12x6x21",
    "cantidad": 1
  },
  {
    "id": "ri-real-1070",
    "recetaId": "receta-real-prod-real-sides-sm-corn-kernels-4",
    "insumoId": "insu-real-8-oz-translucent-pp-round-deli-container-with-lid",
    "cantidad": 1
  },
  {
    "id": "ri-real-1071",
    "recetaId": "receta-real-prod-real-sides-sm-corn-kernels-4",
    "insumoId": "insu-real-napkin-xpress-nat-13-x-8-6",
    "cantidad": 3
  },
  {
    "id": "ri-real-1072",
    "recetaId": "receta-real-prod-real-sides-sm-corn-kernels-4",
    "insumoId": "insu-real-corn-ylw-super-sweet-cut",
    "cantidad": 8
  },
  {
    "id": "ri-real-1073",
    "recetaId": "receta-real-prod-real-sides-sm-corn-kernels-4",
    "insumoId": "insu-real-forks",
    "cantidad": 1
  },
  {
    "id": "ri-real-1074",
    "recetaId": "receta-real-prod-real-sides-sm-corn-kernels-4",
    "insumoId": "insu-real-bag-t-shirt-12x6x21",
    "cantidad": 1
  },
  {
    "id": "ri-real-1075",
    "recetaId": "receta-real-prod-real-sides-sm-corn-mix-salad-5",
    "insumoId": "insu-real-8-oz-translucent-pp-round-deli-container-with-lid",
    "cantidad": 1
  },
  {
    "id": "ri-real-1076",
    "recetaId": "receta-real-prod-real-sides-sm-corn-mix-salad-5",
    "insumoId": "insu-real-limes-200-ct",
    "cantidad": 0.1067
  },
  {
    "id": "ri-real-1077",
    "recetaId": "receta-real-prod-real-sides-sm-corn-mix-salad-5",
    "insumoId": "insu-real-peppers-red-bell",
    "cantidad": 0.5333
  },
  {
    "id": "ri-real-1078",
    "recetaId": "receta-real-prod-real-sides-sm-corn-mix-salad-5",
    "insumoId": "insu-real-salt-iodized-granular",
    "cantidad": 0.1067
  },
  {
    "id": "ri-real-1079",
    "recetaId": "receta-real-prod-real-sides-sm-corn-mix-salad-5",
    "insumoId": "insu-real-napkin-xpress-nat-13-x-8-6",
    "cantidad": 3
  },
  {
    "id": "ri-real-1080",
    "recetaId": "receta-real-prod-real-sides-sm-corn-mix-salad-5",
    "insumoId": "insu-real-cilantro-short-stemmed-30-ct",
    "cantidad": 0.16
  },
  {
    "id": "ri-real-1081",
    "recetaId": "receta-real-prod-real-sides-sm-corn-mix-salad-5",
    "insumoId": "insu-real-black-bean-seasoned",
    "cantidad": 5.9733
  },
  {
    "id": "ri-real-1082",
    "recetaId": "receta-real-prod-real-sides-sm-corn-mix-salad-5",
    "insumoId": "insu-real-corn-ylw-super-sweet-cut",
    "cantidad": 1.28
  },
  {
    "id": "ri-real-1083",
    "recetaId": "receta-real-prod-real-sides-sm-corn-mix-salad-5",
    "insumoId": "insu-real-forks",
    "cantidad": 1
  },
  {
    "id": "ri-real-1084",
    "recetaId": "receta-real-prod-real-sides-sm-corn-mix-salad-5",
    "insumoId": "insu-real-bag-t-shirt-12x6x21",
    "cantidad": 1
  },
  {
    "id": "ri-real-1085",
    "recetaId": "receta-real-prod-real-sides-sm-corn-mix-salad-5",
    "insumoId": "insu-real-onion-red-jumbo",
    "cantidad": 0.48
  },
  {
    "id": "ri-real-1086",
    "recetaId": "receta-real-prod-real-sides-sm-corn-mix-salad-5",
    "insumoId": "insu-real-onion-green-w-t",
    "cantidad": 0.0213
  },
  {
    "id": "ri-real-1087",
    "recetaId": "receta-real-prod-real-sides-sm-corn-mix-salad-5",
    "insumoId": "insu-real-vinegar-red-wine",
    "cantidad": 1.28
  },
  {
    "id": "ri-real-1088",
    "recetaId": "receta-real-prod-real-sides-sm-cole-slaw-6",
    "insumoId": "insu-real-8-oz-translucent-pp-round-deli-container-with-lid",
    "cantidad": 1
  },
  {
    "id": "ri-real-1089",
    "recetaId": "receta-real-prod-real-sides-sm-cole-slaw-6",
    "insumoId": "insu-real-dressing-coleslaw-base",
    "cantidad": 0.8
  },
  {
    "id": "ri-real-1090",
    "recetaId": "receta-real-prod-real-sides-sm-cole-slaw-6",
    "insumoId": "insu-real-salt-iodized-granular",
    "cantidad": 0.025
  },
  {
    "id": "ri-real-1091",
    "recetaId": "receta-real-prod-real-sides-sm-cole-slaw-6",
    "insumoId": "insu-real-napkin-xpress-nat-13-x-8-6",
    "cantidad": 3
  },
  {
    "id": "ri-real-1092",
    "recetaId": "receta-real-prod-real-sides-sm-cole-slaw-6",
    "insumoId": "insu-real-cabbage-shred-sep-color",
    "cantidad": 8
  },
  {
    "id": "ri-real-1093",
    "recetaId": "receta-real-prod-real-sides-sm-cole-slaw-6",
    "insumoId": "insu-real-forks",
    "cantidad": 1
  },
  {
    "id": "ri-real-1094",
    "recetaId": "receta-real-prod-real-sides-sm-cole-slaw-6",
    "insumoId": "insu-real-bag-t-shirt-12x6x21",
    "cantidad": 1
  },
  {
    "id": "ri-real-1095",
    "recetaId": "receta-real-prod-real-sides-sm-cole-slaw-6",
    "insumoId": "insu-real-pepper-black-table-grind-jar",
    "cantidad": 0.02
  },
  {
    "id": "ri-real-1096",
    "recetaId": "receta-real-prod-real-sides-sm-cole-slaw-6",
    "insumoId": "insu-real-vinegar-red-wine",
    "cantidad": 0.2
  },
  {
    "id": "ri-real-1097",
    "recetaId": "receta-real-prod-real-sides-sm-broccoli-7",
    "insumoId": "insu-real-8-oz-translucent-pp-round-deli-container-with-lid",
    "cantidad": 1
  },
  {
    "id": "ri-real-1098",
    "recetaId": "receta-real-prod-real-sides-sm-broccoli-7",
    "insumoId": "insu-real-napkin-xpress-nat-13-x-8-6",
    "cantidad": 3
  },
  {
    "id": "ri-real-1099",
    "recetaId": "receta-real-prod-real-sides-sm-broccoli-7",
    "insumoId": "insu-real-broccoli-crown-20-lb",
    "cantidad": 8
  },
  {
    "id": "ri-real-1100",
    "recetaId": "receta-real-prod-real-sides-sm-broccoli-7",
    "insumoId": "insu-real-forks",
    "cantidad": 1
  },
  {
    "id": "ri-real-1101",
    "recetaId": "receta-real-prod-real-sides-sm-broccoli-7",
    "insumoId": "insu-real-bag-t-shirt-12x6x21",
    "cantidad": 1
  },
  {
    "id": "ri-real-1102",
    "recetaId": "receta-real-prod-real-sides-sm-balsamic-tomatoes-8",
    "insumoId": "insu-real-8-oz-translucent-pp-round-deli-container-with-lid",
    "cantidad": 1
  },
  {
    "id": "ri-real-1103",
    "recetaId": "receta-real-prod-real-sides-sm-balsamic-tomatoes-8",
    "insumoId": "insu-real-oil-olive-extra-virgin",
    "cantidad": 0.2078
  },
  {
    "id": "ri-real-1104",
    "recetaId": "receta-real-prod-real-sides-sm-balsamic-tomatoes-8",
    "insumoId": "insu-real-salt-iodized-granular",
    "cantidad": 0.0519
  },
  {
    "id": "ri-real-1105",
    "recetaId": "receta-real-prod-real-sides-sm-balsamic-tomatoes-8",
    "insumoId": "insu-real-napkin-xpress-nat-13-x-8-6",
    "cantidad": 3
  },
  {
    "id": "ri-real-1106",
    "recetaId": "receta-real-prod-real-sides-sm-balsamic-tomatoes-8",
    "insumoId": "insu-real-forks",
    "cantidad": 1
  },
  {
    "id": "ri-real-1107",
    "recetaId": "receta-real-prod-real-sides-sm-balsamic-tomatoes-8",
    "insumoId": "insu-real-bag-t-shirt-12x6x21",
    "cantidad": 1
  },
  {
    "id": "ri-real-1108",
    "recetaId": "receta-real-prod-real-sides-sm-balsamic-tomatoes-8",
    "insumoId": "insu-real-vinegar-balsamic",
    "cantidad": 0.8312
  },
  {
    "id": "ri-real-1109",
    "recetaId": "receta-real-prod-real-sides-sm-balsamic-tomatoes-8",
    "insumoId": "insu-real-tomato-25-lb",
    "cantidad": 6.6494
  },
  {
    "id": "ri-real-1110",
    "recetaId": "receta-real-prod-real-sides-sm-balsamic-tomatoes-8",
    "insumoId": "insu-real-onion-red-jumbo",
    "cantidad": 1.039
  },
  {
    "id": "ri-real-1111",
    "recetaId": "receta-real-prod-real-sides-sm-mashed-potatoes-9",
    "insumoId": "insu-real-8-oz-translucent-pp-round-deli-container-with-lid",
    "cantidad": 1
  },
  {
    "id": "ri-real-1112",
    "recetaId": "receta-real-prod-real-sides-sm-mashed-potatoes-9",
    "insumoId": "insu-real-napkin-xpress-nat-13-x-8-6",
    "cantidad": 3
  },
  {
    "id": "ri-real-1113",
    "recetaId": "receta-real-prod-real-sides-sm-mashed-potatoes-9",
    "insumoId": "insu-real-forks",
    "cantidad": 1
  },
  {
    "id": "ri-real-1114",
    "recetaId": "receta-real-prod-real-sides-sm-mashed-potatoes-9",
    "insumoId": "insu-real-bag-t-shirt-12x6x21",
    "cantidad": 1
  },
  {
    "id": "ri-real-1115",
    "recetaId": "receta-real-prod-real-sides-sm-mashed-potatoes-9",
    "insumoId": "insu-real-potato-mashed-redskin",
    "cantidad": 8
  },
  {
    "id": "ri-real-1116",
    "recetaId": "receta-real-prod-real-sides-sm-yellow-rice-10",
    "insumoId": "insu-real-8-oz-translucent-pp-round-deli-container-with-lid",
    "cantidad": 1
  },
  {
    "id": "ri-real-1117",
    "recetaId": "receta-real-prod-real-sides-sm-yellow-rice-10",
    "insumoId": "insu-real-food-coloring-ylw-pwdr",
    "cantidad": 0.0007
  },
  {
    "id": "ri-real-1118",
    "recetaId": "receta-real-prod-real-sides-sm-yellow-rice-10",
    "insumoId": "insu-real-salt-iodized-granular",
    "cantidad": 0.0849
  },
  {
    "id": "ri-real-1119",
    "recetaId": "receta-real-prod-real-sides-sm-yellow-rice-10",
    "insumoId": "insu-real-napkin-xpress-nat-13-x-8-6",
    "cantidad": 3
  },
  {
    "id": "ri-real-1120",
    "recetaId": "receta-real-prod-real-sides-sm-yellow-rice-10",
    "insumoId": "insu-real-white-rice-50-lb",
    "cantidad": 3.6226
  },
  {
    "id": "ri-real-1121",
    "recetaId": "receta-real-prod-real-sides-sm-yellow-rice-10",
    "insumoId": "insu-real-veg-oil",
    "cantidad": 0.2264
  },
  {
    "id": "ri-real-1122",
    "recetaId": "receta-real-prod-real-sides-sm-yellow-rice-10",
    "insumoId": "insu-real-forks",
    "cantidad": 1
  },
  {
    "id": "ri-real-1123",
    "recetaId": "receta-real-prod-real-sides-sm-yellow-rice-10",
    "insumoId": "insu-real-bag-t-shirt-12x6x21",
    "cantidad": 1
  },
  {
    "id": "ri-real-1124",
    "recetaId": "receta-real-prod-real-sides-sm-yellow-rice-10",
    "insumoId": "insu-real-onion-ylw-jumbo-frsh-bag",
    "cantidad": 0.4528
  },
  {
    "id": "ri-real-1125",
    "recetaId": "receta-real-prod-real-sides-sm-yellow-rice-10",
    "insumoId": "insu-real-base-chicken-caldo-de-pollo",
    "cantidad": 0.1132
  },
  {
    "id": "ri-real-1126",
    "recetaId": "receta-real-prod-real-sides-sm-brown-rice-11",
    "insumoId": "insu-real-8-oz-translucent-pp-round-deli-container-with-lid",
    "cantidad": 1
  },
  {
    "id": "ri-real-1127",
    "recetaId": "receta-real-prod-real-sides-sm-brown-rice-11",
    "insumoId": "insu-real-salt-iodized-granular",
    "cantidad": 0.0566
  },
  {
    "id": "ri-real-1128",
    "recetaId": "receta-real-prod-real-sides-sm-brown-rice-11",
    "insumoId": "insu-real-napkin-xpress-nat-13-x-8-6",
    "cantidad": 3
  },
  {
    "id": "ri-real-1129",
    "recetaId": "receta-real-prod-real-sides-sm-brown-rice-11",
    "insumoId": "insu-real-brown-rice-25-lb",
    "cantidad": 3.6226
  },
  {
    "id": "ri-real-1130",
    "recetaId": "receta-real-prod-real-sides-sm-brown-rice-11",
    "insumoId": "insu-real-veg-oil",
    "cantidad": 0.2264
  },
  {
    "id": "ri-real-1131",
    "recetaId": "receta-real-prod-real-sides-sm-brown-rice-11",
    "insumoId": "insu-real-forks",
    "cantidad": 1
  },
  {
    "id": "ri-real-1132",
    "recetaId": "receta-real-prod-real-sides-sm-brown-rice-11",
    "insumoId": "insu-real-bag-t-shirt-12x6x21",
    "cantidad": 1
  },
  {
    "id": "ri-real-1133",
    "recetaId": "receta-real-prod-real-sides-sm-cilantro-white-rice-12",
    "insumoId": "insu-real-8-oz-translucent-pp-round-deli-container-with-lid",
    "cantidad": 1
  },
  {
    "id": "ri-real-1134",
    "recetaId": "receta-real-prod-real-sides-sm-cilantro-white-rice-12",
    "insumoId": "insu-real-salt-iodized-granular",
    "cantidad": 0.0142
  },
  {
    "id": "ri-real-1135",
    "recetaId": "receta-real-prod-real-sides-sm-cilantro-white-rice-12",
    "insumoId": "insu-real-napkin-xpress-nat-13-x-8-6",
    "cantidad": 3
  },
  {
    "id": "ri-real-1136",
    "recetaId": "receta-real-prod-real-sides-sm-cilantro-white-rice-12",
    "insumoId": "insu-real-cilantro-short-stemmed-30-ct",
    "cantidad": 0.3396
  },
  {
    "id": "ri-real-1137",
    "recetaId": "receta-real-prod-real-sides-sm-cilantro-white-rice-12",
    "insumoId": "insu-real-brown-rice-25-lb",
    "cantidad": 3.6226
  },
  {
    "id": "ri-real-1138",
    "recetaId": "receta-real-prod-real-sides-sm-cilantro-white-rice-12",
    "insumoId": "insu-real-forks",
    "cantidad": 1
  },
  {
    "id": "ri-real-1139",
    "recetaId": "receta-real-prod-real-sides-sm-cilantro-white-rice-12",
    "insumoId": "insu-real-bag-t-shirt-12x6x21",
    "cantidad": 1
  },
  {
    "id": "ri-real-1140",
    "recetaId": "receta-real-prod-real-sides-sm-cilantro-white-rice-12",
    "insumoId": "insu-real-onion-ylw-jumbo-frsh-bag",
    "cantidad": 0.4528
  },
  {
    "id": "ri-real-1141",
    "recetaId": "receta-real-prod-real-sides-sm-cilantro-white-rice-12",
    "insumoId": "insu-real-base-chicken-caldo-de-pollo",
    "cantidad": 0.2264
  },
  {
    "id": "ri-real-1142",
    "recetaId": "receta-real-prod-real-sides-half-baked-sweet-potato-13",
    "insumoId": "insu-real-potato-sweet-60-65-ct",
    "cantidad": 1
  },
  {
    "id": "ri-real-1143",
    "recetaId": "receta-real-prod-real-sides-8-oz-half-pint-of-sau-14",
    "insumoId": "insu-real-lid-for-1-5-oz-souffle-cup-portion-cup-2500-pcs",
    "cantidad": 4
  },
  {
    "id": "ri-real-1144",
    "recetaId": "receta-real-prod-real-sides-8-oz-half-pint-of-sau-14",
    "insumoId": "insu-real-1-5-oz-clear-plastic-souffle-cup-portion-cup-25",
    "cantidad": 4
  },
  {
    "id": "ri-real-1145",
    "recetaId": "receta-real-prod-real-sides-8-oz-half-pint-of-sau-14",
    "insumoId": "insu-real-limes-200-ct",
    "cantidad": 0.024
  },
  {
    "id": "ri-real-1146",
    "recetaId": "receta-real-prod-real-sides-8-oz-half-pint-of-sau-14",
    "insumoId": "insu-real-garlic-whl-pld-frsh",
    "cantidad": 0.072
  },
  {
    "id": "ri-real-1147",
    "recetaId": "receta-real-prod-real-sides-8-oz-half-pint-of-sau-14",
    "insumoId": "insu-real-mayo-4-1-gal",
    "cantidad": 3.6352
  },
  {
    "id": "ri-real-1148",
    "recetaId": "receta-real-prod-real-sides-8-oz-half-pint-of-sau-14",
    "insumoId": "insu-real-salt-iodized-granular",
    "cantidad": 0.012
  },
  {
    "id": "ri-real-1149",
    "recetaId": "receta-real-prod-real-sides-8-oz-half-pint-of-sau-14",
    "insumoId": "insu-real-cilantro-short-stemmed-30-ct",
    "cantidad": 0.024
  },
  {
    "id": "ri-real-1150",
    "recetaId": "receta-real-prod-real-sides-8-oz-half-pint-of-sau-14",
    "insumoId": "insu-real-curry-pwdr-4-4-lb",
    "cantidad": 0.1792
  },
  {
    "id": "ri-real-1151",
    "recetaId": "receta-real-prod-real-sides-8-oz-half-pint-of-sau-14",
    "insumoId": "insu-real-mustard-country-style-4-1-gal",
    "cantidad": 0.0896
  },
  {
    "id": "ri-real-1152",
    "recetaId": "receta-real-prod-real-sides-8-oz-half-pint-of-sau-14",
    "insumoId": "insu-real-sour-cream-pouch-pack",
    "cantidad": 0.432
  },
  {
    "id": "ri-real-1153",
    "recetaId": "receta-real-prod-real-sides-lg-fresh-guacamole-15",
    "insumoId": "insu-real-e16-oz-translucent-pp-round-deli-container-with-lid",
    "cantidad": 1
  },
  {
    "id": "ri-real-1154",
    "recetaId": "receta-real-prod-real-sides-lg-fresh-guacamole-15",
    "insumoId": "insu-real-limes-200-ct",
    "cantidad": 0.4286
  },
  {
    "id": "ri-real-1155",
    "recetaId": "receta-real-prod-real-sides-lg-fresh-guacamole-15",
    "insumoId": "insu-real-avocado-ripe-48-ct",
    "cantidad": 2.8571
  },
  {
    "id": "ri-real-1156",
    "recetaId": "receta-real-prod-real-sides-lg-fresh-guacamole-15",
    "insumoId": "insu-real-peppers-jalapeno",
    "cantidad": 0.5714
  },
  {
    "id": "ri-real-1157",
    "recetaId": "receta-real-prod-real-sides-lg-fresh-guacamole-15",
    "insumoId": "insu-real-salt-iodized-granular",
    "cantidad": 0.5714
  },
  {
    "id": "ri-real-1158",
    "recetaId": "receta-real-prod-real-sides-lg-fresh-guacamole-15",
    "insumoId": "insu-real-napkin-xpress-nat-13-x-8-6",
    "cantidad": 3
  },
  {
    "id": "ri-real-1159",
    "recetaId": "receta-real-prod-real-sides-lg-fresh-guacamole-15",
    "insumoId": "insu-real-cilantro-short-stemmed-30-ct",
    "cantidad": 0.5714
  },
  {
    "id": "ri-real-1160",
    "recetaId": "receta-real-prod-real-sides-lg-fresh-guacamole-15",
    "insumoId": "insu-real-forks",
    "cantidad": 1
  },
  {
    "id": "ri-real-1161",
    "recetaId": "receta-real-prod-real-sides-lg-fresh-guacamole-15",
    "insumoId": "insu-real-bag-t-shirt-12x6x21",
    "cantidad": 1
  },
  {
    "id": "ri-real-1162",
    "recetaId": "receta-real-prod-real-sides-lg-fresh-guacamole-15",
    "insumoId": "insu-real-tomato-25-lb",
    "cantidad": 4.5714
  },
  {
    "id": "ri-real-1163",
    "recetaId": "receta-real-prod-real-sides-lg-fresh-guacamole-15",
    "insumoId": "insu-real-onion-red-jumbo",
    "cantidad": 1.1429
  },
  {
    "id": "ri-real-1164",
    "recetaId": "receta-real-prod-real-sides-lg-baked-sweet-plantain-16",
    "insumoId": "insu-real-e16-oz-translucent-pp-round-deli-container-with-lid",
    "cantidad": 1
  },
  {
    "id": "ri-real-1165",
    "recetaId": "receta-real-prod-real-sides-lg-baked-sweet-plantain-16",
    "insumoId": "insu-real-napkin-xpress-nat-13-x-8-6",
    "cantidad": 3
  },
  {
    "id": "ri-real-1166",
    "recetaId": "receta-real-prod-real-sides-lg-baked-sweet-plantain-16",
    "insumoId": "insu-real-forks",
    "cantidad": 1
  },
  {
    "id": "ri-real-1167",
    "recetaId": "receta-real-prod-real-sides-lg-baked-sweet-plantain-16",
    "insumoId": "insu-real-bag-t-shirt-12x6x21",
    "cantidad": 1
  },
  {
    "id": "ri-real-1168",
    "recetaId": "receta-real-prod-real-sides-lg-baked-sweet-plantain-16",
    "insumoId": "insu-real-plantain-sweet-sliced",
    "cantidad": 16
  },
  {
    "id": "ri-real-1169",
    "recetaId": "receta-real-prod-real-sides-lg-black-beans-17",
    "insumoId": "insu-real-e16-oz-translucent-pp-round-deli-container-with-lid",
    "cantidad": 1
  },
  {
    "id": "ri-real-1170",
    "recetaId": "receta-real-prod-real-sides-lg-black-beans-17",
    "insumoId": "insu-real-napkin-xpress-nat-13-x-8-6",
    "cantidad": 3
  },
  {
    "id": "ri-real-1171",
    "recetaId": "receta-real-prod-real-sides-lg-black-beans-17",
    "insumoId": "insu-real-black-bean-seasoned",
    "cantidad": 15
  },
  {
    "id": "ri-real-1172",
    "recetaId": "receta-real-prod-real-sides-lg-black-beans-17",
    "insumoId": "insu-real-forks",
    "cantidad": 1
  },
  {
    "id": "ri-real-1173",
    "recetaId": "receta-real-prod-real-sides-lg-black-beans-17",
    "insumoId": "insu-real-bag-t-shirt-12x6x21",
    "cantidad": 1
  },
  {
    "id": "ri-real-1174",
    "recetaId": "receta-real-prod-real-sides-lg-corn-kernels-18",
    "insumoId": "insu-real-e16-oz-translucent-pp-round-deli-container-with-lid",
    "cantidad": 1
  },
  {
    "id": "ri-real-1175",
    "recetaId": "receta-real-prod-real-sides-lg-corn-kernels-18",
    "insumoId": "insu-real-napkin-xpress-nat-13-x-8-6",
    "cantidad": 3
  },
  {
    "id": "ri-real-1176",
    "recetaId": "receta-real-prod-real-sides-lg-corn-kernels-18",
    "insumoId": "insu-real-corn-ylw-super-sweet-cut",
    "cantidad": 16
  },
  {
    "id": "ri-real-1177",
    "recetaId": "receta-real-prod-real-sides-lg-corn-kernels-18",
    "insumoId": "insu-real-forks",
    "cantidad": 1
  },
  {
    "id": "ri-real-1178",
    "recetaId": "receta-real-prod-real-sides-lg-corn-kernels-18",
    "insumoId": "insu-real-bag-t-shirt-12x6x21",
    "cantidad": 1
  },
  {
    "id": "ri-real-1179",
    "recetaId": "receta-real-prod-real-sides-lg-corn-mix-salad-19",
    "insumoId": "insu-real-e16-oz-translucent-pp-round-deli-container-with-lid",
    "cantidad": 1
  },
  {
    "id": "ri-real-1180",
    "recetaId": "receta-real-prod-real-sides-lg-corn-mix-salad-19",
    "insumoId": "insu-real-limes-200-ct",
    "cantidad": 0.2133
  },
  {
    "id": "ri-real-1181",
    "recetaId": "receta-real-prod-real-sides-lg-corn-mix-salad-19",
    "insumoId": "insu-real-peppers-red-bell",
    "cantidad": 1.0667
  },
  {
    "id": "ri-real-1182",
    "recetaId": "receta-real-prod-real-sides-lg-corn-mix-salad-19",
    "insumoId": "insu-real-salt-iodized-granular",
    "cantidad": 0.2133
  },
  {
    "id": "ri-real-1183",
    "recetaId": "receta-real-prod-real-sides-lg-corn-mix-salad-19",
    "insumoId": "insu-real-napkin-xpress-nat-13-x-8-6",
    "cantidad": 3
  },
  {
    "id": "ri-real-1184",
    "recetaId": "receta-real-prod-real-sides-lg-corn-mix-salad-19",
    "insumoId": "insu-real-cilantro-short-stemmed-30-ct",
    "cantidad": 0.32
  },
  {
    "id": "ri-real-1185",
    "recetaId": "receta-real-prod-real-sides-lg-corn-mix-salad-19",
    "insumoId": "insu-real-black-bean-seasoned",
    "cantidad": 11.9467
  },
  {
    "id": "ri-real-1186",
    "recetaId": "receta-real-prod-real-sides-lg-corn-mix-salad-19",
    "insumoId": "insu-real-corn-ylw-super-sweet-cut",
    "cantidad": 2.56
  },
  {
    "id": "ri-real-1187",
    "recetaId": "receta-real-prod-real-sides-lg-corn-mix-salad-19",
    "insumoId": "insu-real-forks",
    "cantidad": 1
  },
  {
    "id": "ri-real-1188",
    "recetaId": "receta-real-prod-real-sides-lg-corn-mix-salad-19",
    "insumoId": "insu-real-bag-t-shirt-12x6x21",
    "cantidad": 1
  },
  {
    "id": "ri-real-1189",
    "recetaId": "receta-real-prod-real-sides-lg-corn-mix-salad-19",
    "insumoId": "insu-real-onion-red-jumbo",
    "cantidad": 0.96
  },
  {
    "id": "ri-real-1190",
    "recetaId": "receta-real-prod-real-sides-lg-corn-mix-salad-19",
    "insumoId": "insu-real-onion-green-w-t",
    "cantidad": 0.0427
  },
  {
    "id": "ri-real-1191",
    "recetaId": "receta-real-prod-real-sides-lg-corn-mix-salad-19",
    "insumoId": "insu-real-vinegar-red-wine",
    "cantidad": 2.56
  },
  {
    "id": "ri-real-1192",
    "recetaId": "receta-real-prod-real-sides-lg-coleslaw-20",
    "insumoId": "insu-real-dressing-coleslaw-base",
    "cantidad": 1.6
  },
  {
    "id": "ri-real-1193",
    "recetaId": "receta-real-prod-real-sides-lg-coleslaw-20",
    "insumoId": "insu-real-salt-iodized-granular",
    "cantidad": 0.05
  },
  {
    "id": "ri-real-1194",
    "recetaId": "receta-real-prod-real-sides-lg-coleslaw-20",
    "insumoId": "insu-real-cabbage-shred-sep-color",
    "cantidad": 16
  },
  {
    "id": "ri-real-1195",
    "recetaId": "receta-real-prod-real-sides-lg-coleslaw-20",
    "insumoId": "insu-real-pepper-black-table-grind-jar",
    "cantidad": 0.04
  },
  {
    "id": "ri-real-1196",
    "recetaId": "receta-real-prod-real-sides-lg-coleslaw-20",
    "insumoId": "insu-real-vinegar-red-wine",
    "cantidad": 0.4
  },
  {
    "id": "ri-real-1197",
    "recetaId": "receta-real-prod-real-sides-lg-broccoli-21",
    "insumoId": "insu-real-e16-oz-translucent-pp-round-deli-container-with-lid",
    "cantidad": 1
  },
  {
    "id": "ri-real-1198",
    "recetaId": "receta-real-prod-real-sides-lg-broccoli-21",
    "insumoId": "insu-real-napkin-xpress-nat-13-x-8-6",
    "cantidad": 3
  },
  {
    "id": "ri-real-1199",
    "recetaId": "receta-real-prod-real-sides-lg-broccoli-21",
    "insumoId": "insu-real-broccoli-crown-20-lb",
    "cantidad": 16
  },
  {
    "id": "ri-real-1200",
    "recetaId": "receta-real-prod-real-sides-lg-broccoli-21",
    "insumoId": "insu-real-forks",
    "cantidad": 1
  },
  {
    "id": "ri-real-1201",
    "recetaId": "receta-real-prod-real-sides-lg-broccoli-21",
    "insumoId": "insu-real-bag-t-shirt-12x6x21",
    "cantidad": 1
  },
  {
    "id": "ri-real-1202",
    "recetaId": "receta-real-prod-real-sides-lg-balsamic-tomatoes-22",
    "insumoId": "insu-real-e16-oz-translucent-pp-round-deli-container-with-lid",
    "cantidad": 1
  },
  {
    "id": "ri-real-1203",
    "recetaId": "receta-real-prod-real-sides-lg-balsamic-tomatoes-22",
    "insumoId": "insu-real-oil-olive-extra-virgin",
    "cantidad": 0.4156
  },
  {
    "id": "ri-real-1204",
    "recetaId": "receta-real-prod-real-sides-lg-balsamic-tomatoes-22",
    "insumoId": "insu-real-salt-iodized-granular",
    "cantidad": 0.1039
  },
  {
    "id": "ri-real-1205",
    "recetaId": "receta-real-prod-real-sides-lg-balsamic-tomatoes-22",
    "insumoId": "insu-real-napkin-xpress-nat-13-x-8-6",
    "cantidad": 3
  },
  {
    "id": "ri-real-1206",
    "recetaId": "receta-real-prod-real-sides-lg-balsamic-tomatoes-22",
    "insumoId": "insu-real-forks",
    "cantidad": 1
  },
  {
    "id": "ri-real-1207",
    "recetaId": "receta-real-prod-real-sides-lg-balsamic-tomatoes-22",
    "insumoId": "insu-real-bag-t-shirt-12x6x21",
    "cantidad": 1
  },
  {
    "id": "ri-real-1208",
    "recetaId": "receta-real-prod-real-sides-lg-balsamic-tomatoes-22",
    "insumoId": "insu-real-vinegar-balsamic",
    "cantidad": 1.6623
  },
  {
    "id": "ri-real-1209",
    "recetaId": "receta-real-prod-real-sides-lg-balsamic-tomatoes-22",
    "insumoId": "insu-real-tomato-25-lb",
    "cantidad": 13.2987
  },
  {
    "id": "ri-real-1210",
    "recetaId": "receta-real-prod-real-sides-lg-balsamic-tomatoes-22",
    "insumoId": "insu-real-onion-red-jumbo",
    "cantidad": 2.0779
  },
  {
    "id": "ri-real-1211",
    "recetaId": "receta-real-prod-real-sides-lg-mashed-potatoes-23",
    "insumoId": "insu-real-e16-oz-translucent-pp-round-deli-container-with-lid",
    "cantidad": 1
  },
  {
    "id": "ri-real-1212",
    "recetaId": "receta-real-prod-real-sides-lg-mashed-potatoes-23",
    "insumoId": "insu-real-napkin-xpress-nat-13-x-8-6",
    "cantidad": 3
  },
  {
    "id": "ri-real-1213",
    "recetaId": "receta-real-prod-real-sides-lg-mashed-potatoes-23",
    "insumoId": "insu-real-forks",
    "cantidad": 1
  },
  {
    "id": "ri-real-1214",
    "recetaId": "receta-real-prod-real-sides-lg-mashed-potatoes-23",
    "insumoId": "insu-real-bag-t-shirt-12x6x21",
    "cantidad": 1
  },
  {
    "id": "ri-real-1215",
    "recetaId": "receta-real-prod-real-sides-lg-mashed-potatoes-23",
    "insumoId": "insu-real-potato-mashed-redskin",
    "cantidad": 16
  },
  {
    "id": "ri-real-1216",
    "recetaId": "receta-real-prod-real-sides-lg-yellow-rice-24",
    "insumoId": "insu-real-e16-oz-translucent-pp-round-deli-container-with-lid",
    "cantidad": 1
  },
  {
    "id": "ri-real-1217",
    "recetaId": "receta-real-prod-real-sides-lg-yellow-rice-24",
    "insumoId": "insu-real-food-coloring-ylw-pwdr",
    "cantidad": 0.0009
  },
  {
    "id": "ri-real-1218",
    "recetaId": "receta-real-prod-real-sides-lg-yellow-rice-24",
    "insumoId": "insu-real-salt-iodized-granular",
    "cantidad": 0.1132
  },
  {
    "id": "ri-real-1219",
    "recetaId": "receta-real-prod-real-sides-lg-yellow-rice-24",
    "insumoId": "insu-real-napkin-xpress-nat-13-x-8-6",
    "cantidad": 3
  },
  {
    "id": "ri-real-1220",
    "recetaId": "receta-real-prod-real-sides-lg-yellow-rice-24",
    "insumoId": "insu-real-white-rice-50-lb",
    "cantidad": 4.8302
  },
  {
    "id": "ri-real-1221",
    "recetaId": "receta-real-prod-real-sides-lg-yellow-rice-24",
    "insumoId": "insu-real-veg-oil",
    "cantidad": 0.3019
  },
  {
    "id": "ri-real-1222",
    "recetaId": "receta-real-prod-real-sides-lg-yellow-rice-24",
    "insumoId": "insu-real-forks",
    "cantidad": 1
  },
  {
    "id": "ri-real-1223",
    "recetaId": "receta-real-prod-real-sides-lg-yellow-rice-24",
    "insumoId": "insu-real-bag-t-shirt-12x6x21",
    "cantidad": 1
  },
  {
    "id": "ri-real-1224",
    "recetaId": "receta-real-prod-real-sides-lg-yellow-rice-24",
    "insumoId": "insu-real-onion-ylw-jumbo-frsh-bag",
    "cantidad": 0.6038
  },
  {
    "id": "ri-real-1225",
    "recetaId": "receta-real-prod-real-sides-lg-yellow-rice-24",
    "insumoId": "insu-real-base-chicken-caldo-de-pollo",
    "cantidad": 0.1509
  },
  {
    "id": "ri-real-1226",
    "recetaId": "receta-real-prod-real-sides-lg-brown-rice-25",
    "insumoId": "insu-real-e16-oz-translucent-pp-round-deli-container-with-lid",
    "cantidad": 1
  },
  {
    "id": "ri-real-1227",
    "recetaId": "receta-real-prod-real-sides-lg-brown-rice-25",
    "insumoId": "insu-real-salt-iodized-granular",
    "cantidad": 0.0755
  },
  {
    "id": "ri-real-1228",
    "recetaId": "receta-real-prod-real-sides-lg-brown-rice-25",
    "insumoId": "insu-real-napkin-xpress-nat-13-x-8-6",
    "cantidad": 3
  },
  {
    "id": "ri-real-1229",
    "recetaId": "receta-real-prod-real-sides-lg-brown-rice-25",
    "insumoId": "insu-real-brown-rice-25-lb",
    "cantidad": 4.8302
  },
  {
    "id": "ri-real-1230",
    "recetaId": "receta-real-prod-real-sides-lg-brown-rice-25",
    "insumoId": "insu-real-veg-oil",
    "cantidad": 0.3019
  },
  {
    "id": "ri-real-1231",
    "recetaId": "receta-real-prod-real-sides-lg-brown-rice-25",
    "insumoId": "insu-real-forks",
    "cantidad": 1
  },
  {
    "id": "ri-real-1232",
    "recetaId": "receta-real-prod-real-sides-lg-brown-rice-25",
    "insumoId": "insu-real-bag-t-shirt-12x6x21",
    "cantidad": 1
  },
  {
    "id": "ri-real-1233",
    "recetaId": "receta-real-prod-real-sides-lg-cilantro-white-rice-26",
    "insumoId": "insu-real-e16-oz-translucent-pp-round-deli-container-with-lid",
    "cantidad": 1
  },
  {
    "id": "ri-real-1234",
    "recetaId": "receta-real-prod-real-sides-lg-cilantro-white-rice-26",
    "insumoId": "insu-real-salt-iodized-granular",
    "cantidad": 0.0189
  },
  {
    "id": "ri-real-1235",
    "recetaId": "receta-real-prod-real-sides-lg-cilantro-white-rice-26",
    "insumoId": "insu-real-napkin-xpress-nat-13-x-8-6",
    "cantidad": 3
  },
  {
    "id": "ri-real-1236",
    "recetaId": "receta-real-prod-real-sides-lg-cilantro-white-rice-26",
    "insumoId": "insu-real-cilantro-short-stemmed-30-ct",
    "cantidad": 0.4528
  },
  {
    "id": "ri-real-1237",
    "recetaId": "receta-real-prod-real-sides-lg-cilantro-white-rice-26",
    "insumoId": "insu-real-brown-rice-25-lb",
    "cantidad": 4.8302
  },
  {
    "id": "ri-real-1238",
    "recetaId": "receta-real-prod-real-sides-lg-cilantro-white-rice-26",
    "insumoId": "insu-real-forks",
    "cantidad": 1
  },
  {
    "id": "ri-real-1239",
    "recetaId": "receta-real-prod-real-sides-lg-cilantro-white-rice-26",
    "insumoId": "insu-real-bag-t-shirt-12x6x21",
    "cantidad": 1
  },
  {
    "id": "ri-real-1240",
    "recetaId": "receta-real-prod-real-sides-lg-cilantro-white-rice-26",
    "insumoId": "insu-real-onion-ylw-jumbo-frsh-bag",
    "cantidad": 0.6038
  },
  {
    "id": "ri-real-1241",
    "recetaId": "receta-real-prod-real-sides-lg-cilantro-white-rice-26",
    "insumoId": "insu-real-base-chicken-caldo-de-pollo",
    "cantidad": 0.3019
  },
  {
    "id": "ri-real-1242",
    "recetaId": "receta-real-prod-real-sides-16-oz-full-pint-of-sa-27",
    "insumoId": "insu-real-lid-for-1-5-oz-souffle-cup-portion-cup-2500-pcs",
    "cantidad": 11
  },
  {
    "id": "ri-real-1243",
    "recetaId": "receta-real-prod-real-sides-16-oz-full-pint-of-sa-27",
    "insumoId": "insu-real-1-5-oz-clear-plastic-souffle-cup-portion-cup-25",
    "cantidad": 11
  },
  {
    "id": "ri-real-1244",
    "recetaId": "receta-real-prod-real-sides-16-oz-full-pint-of-sa-27",
    "insumoId": "insu-real-limes-200-ct",
    "cantidad": 0.066
  },
  {
    "id": "ri-real-1245",
    "recetaId": "receta-real-prod-real-sides-16-oz-full-pint-of-sa-27",
    "insumoId": "insu-real-garlic-whl-pld-frsh",
    "cantidad": 0.198
  },
  {
    "id": "ri-real-1246",
    "recetaId": "receta-real-prod-real-sides-16-oz-full-pint-of-sa-27",
    "insumoId": "insu-real-mayo-4-1-gal",
    "cantidad": 9.9968
  },
  {
    "id": "ri-real-1247",
    "recetaId": "receta-real-prod-real-sides-16-oz-full-pint-of-sa-27",
    "insumoId": "insu-real-salt-iodized-granular",
    "cantidad": 0.033
  },
  {
    "id": "ri-real-1248",
    "recetaId": "receta-real-prod-real-sides-16-oz-full-pint-of-sa-27",
    "insumoId": "insu-real-cilantro-short-stemmed-30-ct",
    "cantidad": 0.066
  },
  {
    "id": "ri-real-1249",
    "recetaId": "receta-real-prod-real-sides-16-oz-full-pint-of-sa-27",
    "insumoId": "insu-real-curry-pwdr-4-4-lb",
    "cantidad": 0.4928
  },
  {
    "id": "ri-real-1250",
    "recetaId": "receta-real-prod-real-sides-16-oz-full-pint-of-sa-27",
    "insumoId": "insu-real-mustard-country-style-4-1-gal",
    "cantidad": 0.2464
  },
  {
    "id": "ri-real-1251",
    "recetaId": "receta-real-prod-real-sides-16-oz-full-pint-of-sa-27",
    "insumoId": "insu-real-sour-cream-pouch-pack",
    "cantidad": 1.188
  },
  {
    "id": "ri-real-1252",
    "recetaId": "receta-real-prod-real-sides-abuela-s-classic-flan-28",
    "insumoId": "insu-real-flan-de-caramello",
    "cantidad": 1
  },
  {
    "id": "ri-real-1253",
    "recetaId": "receta-real-prod-real-sides-sm-teriyaki-chicken-8-31",
    "insumoId": "insu-real-chicken-thigh-meat-b-s-4-10-lb",
    "cantidad": 8
  },
  {
    "id": "ri-real-1254",
    "recetaId": "receta-real-prod-real-sides-sm-teriyaki-chicken-8-31",
    "insumoId": "insu-real-salt-iodized-granular",
    "cantidad": 0.025
  },
  {
    "id": "ri-real-1255",
    "recetaId": "receta-real-prod-real-sides-sm-teriyaki-chicken-8-31",
    "insumoId": "insu-real-glaze-teriyaki-4-4-76-kg",
    "cantidad": 1.4
  },
  {
    "id": "ri-real-1256",
    "recetaId": "receta-real-prod-real-sides-lg-teriyaki-chicken-16-33",
    "insumoId": "insu-real-chicken-thigh-meat-b-s-4-10-lb",
    "cantidad": 16
  },
  {
    "id": "ri-real-1257",
    "recetaId": "receta-real-prod-real-sides-lg-teriyaki-chicken-16-33",
    "insumoId": "insu-real-salt-iodized-granular",
    "cantidad": 0.05
  },
  {
    "id": "ri-real-1258",
    "recetaId": "receta-real-prod-real-sides-lg-teriyaki-chicken-16-33",
    "insumoId": "insu-real-glaze-teriyaki-4-4-76-kg",
    "cantidad": 2.8
  },
  {
    "id": "ri-real-1259",
    "recetaId": "receta-real-prod-real-sides-lg-dark-meat-roast-chic-34",
    "insumoId": "insu-real-chicken-thigh-meat-b-s-4-10-lb",
    "cantidad": 16
  },
  {
    "id": "ri-real-1260",
    "recetaId": "receta-real-prod-real-sides-sm-baked-sweet-plantain-35",
    "insumoId": "insu-real-8-oz-translucent-pp-round-deli-container-with-lid",
    "cantidad": 1
  },
  {
    "id": "ri-real-1261",
    "recetaId": "receta-real-prod-real-sides-sm-baked-sweet-plantain-35",
    "insumoId": "insu-real-napkin-xpress-nat-13-x-8-6",
    "cantidad": 3
  },
  {
    "id": "ri-real-1262",
    "recetaId": "receta-real-prod-real-sides-sm-baked-sweet-plantain-35",
    "insumoId": "insu-real-forks",
    "cantidad": 1
  },
  {
    "id": "ri-real-1263",
    "recetaId": "receta-real-prod-real-sides-sm-baked-sweet-plantain-35",
    "insumoId": "insu-real-bag-t-shirt-12x6x21",
    "cantidad": 1
  },
  {
    "id": "ri-real-1264",
    "recetaId": "receta-real-prod-real-sides-sm-baked-sweet-plantain-35",
    "insumoId": "insu-real-plantain-sweet-sliced",
    "cantidad": 8
  },
  {
    "id": "ri-real-1265",
    "recetaId": "receta-real-prod-real-sides-sm-chopped-sweet-planta-36",
    "insumoId": "insu-real-8-oz-translucent-pp-round-deli-container-with-lid",
    "cantidad": 1
  },
  {
    "id": "ri-real-1266",
    "recetaId": "receta-real-prod-real-sides-sm-chopped-sweet-planta-36",
    "insumoId": "insu-real-napkin-xpress-nat-13-x-8-6",
    "cantidad": 3
  },
  {
    "id": "ri-real-1267",
    "recetaId": "receta-real-prod-real-sides-sm-chopped-sweet-planta-36",
    "insumoId": "insu-real-forks",
    "cantidad": 1
  },
  {
    "id": "ri-real-1268",
    "recetaId": "receta-real-prod-real-sides-sm-chopped-sweet-planta-36",
    "insumoId": "insu-real-bag-t-shirt-12x6x21",
    "cantidad": 1
  },
  {
    "id": "ri-real-1269",
    "recetaId": "receta-real-prod-real-sides-sm-chopped-sweet-planta-36",
    "insumoId": "insu-real-plantain-sweet-sliced",
    "cantidad": 8
  },
  {
    "id": "ri-real-1270",
    "recetaId": "receta-real-prod-real-sides-sm-coleslaw-37",
    "insumoId": "insu-real-8-oz-translucent-pp-round-deli-container-with-lid",
    "cantidad": 1
  },
  {
    "id": "ri-real-1271",
    "recetaId": "receta-real-prod-real-sides-sm-coleslaw-37",
    "insumoId": "insu-real-dressing-coleslaw-base",
    "cantidad": 0.8
  },
  {
    "id": "ri-real-1272",
    "recetaId": "receta-real-prod-real-sides-sm-coleslaw-37",
    "insumoId": "insu-real-salt-iodized-granular",
    "cantidad": 0.025
  },
  {
    "id": "ri-real-1273",
    "recetaId": "receta-real-prod-real-sides-sm-coleslaw-37",
    "insumoId": "insu-real-napkin-xpress-nat-13-x-8-6",
    "cantidad": 3
  },
  {
    "id": "ri-real-1274",
    "recetaId": "receta-real-prod-real-sides-sm-coleslaw-37",
    "insumoId": "insu-real-cabbage-shred-sep-color",
    "cantidad": 8
  },
  {
    "id": "ri-real-1275",
    "recetaId": "receta-real-prod-real-sides-sm-coleslaw-37",
    "insumoId": "insu-real-forks",
    "cantidad": 1
  },
  {
    "id": "ri-real-1276",
    "recetaId": "receta-real-prod-real-sides-sm-coleslaw-37",
    "insumoId": "insu-real-bag-t-shirt-12x6x21",
    "cantidad": 1
  },
  {
    "id": "ri-real-1277",
    "recetaId": "receta-real-prod-real-sides-sm-coleslaw-37",
    "insumoId": "insu-real-pepper-black-table-grind-jar",
    "cantidad": 0.02
  },
  {
    "id": "ri-real-1278",
    "recetaId": "receta-real-prod-real-sides-sm-coleslaw-37",
    "insumoId": "insu-real-vinegar-red-wine",
    "cantidad": 0.2
  },
  {
    "id": "ri-real-1279",
    "recetaId": "receta-real-prod-real-sides-sm-shredded-lettuce-39",
    "insumoId": "insu-real-lettuce-shred-1-8",
    "cantidad": 8
  },
  {
    "id": "ri-real-1280",
    "recetaId": "receta-real-prod-real-sides-sm-baked-sweet-potato-40",
    "insumoId": "insu-real-8-oz-translucent-pp-round-deli-container-with-lid",
    "cantidad": 1
  },
  {
    "id": "ri-real-1281",
    "recetaId": "receta-real-prod-real-sides-sm-baked-sweet-potato-40",
    "insumoId": "insu-real-potato-sweet-60-65-ct",
    "cantidad": 1
  },
  {
    "id": "ri-real-1282",
    "recetaId": "receta-real-prod-real-sides-sm-baked-sweet-potato-40",
    "insumoId": "insu-real-napkin-xpress-nat-13-x-8-6",
    "cantidad": 3
  },
  {
    "id": "ri-real-1283",
    "recetaId": "receta-real-prod-real-sides-sm-baked-sweet-potato-40",
    "insumoId": "insu-real-forks",
    "cantidad": 1
  },
  {
    "id": "ri-real-1284",
    "recetaId": "receta-real-prod-real-sides-sm-baked-sweet-potato-40",
    "insumoId": "insu-real-bag-t-shirt-12x6x21",
    "cantidad": 1
  },
  {
    "id": "ri-real-1285",
    "recetaId": "receta-real-prod-real-sides-lg-chopped-sweet-planta-42",
    "insumoId": "insu-real-e16-oz-translucent-pp-round-deli-container-with-lid",
    "cantidad": 1
  },
  {
    "id": "ri-real-1286",
    "recetaId": "receta-real-prod-real-sides-lg-chopped-sweet-planta-42",
    "insumoId": "insu-real-napkin-xpress-nat-13-x-8-6",
    "cantidad": 3
  },
  {
    "id": "ri-real-1287",
    "recetaId": "receta-real-prod-real-sides-lg-chopped-sweet-planta-42",
    "insumoId": "insu-real-forks",
    "cantidad": 1
  },
  {
    "id": "ri-real-1288",
    "recetaId": "receta-real-prod-real-sides-lg-chopped-sweet-planta-42",
    "insumoId": "insu-real-bag-t-shirt-12x6x21",
    "cantidad": 1
  },
  {
    "id": "ri-real-1289",
    "recetaId": "receta-real-prod-real-sides-lg-chopped-sweet-planta-42",
    "insumoId": "insu-real-plantain-sweet-sliced",
    "cantidad": 16
  },
  {
    "id": "ri-real-1290",
    "recetaId": "receta-real-prod-real-sides-lg-cole-slaw-43",
    "insumoId": "insu-real-dressing-coleslaw-base",
    "cantidad": 1.6
  },
  {
    "id": "ri-real-1291",
    "recetaId": "receta-real-prod-real-sides-lg-cole-slaw-43",
    "insumoId": "insu-real-salt-iodized-granular",
    "cantidad": 0.05
  },
  {
    "id": "ri-real-1292",
    "recetaId": "receta-real-prod-real-sides-lg-cole-slaw-43",
    "insumoId": "insu-real-cabbage-shred-sep-color",
    "cantidad": 16
  },
  {
    "id": "ri-real-1293",
    "recetaId": "receta-real-prod-real-sides-lg-cole-slaw-43",
    "insumoId": "insu-real-pepper-black-table-grind-jar",
    "cantidad": 0.04
  },
  {
    "id": "ri-real-1294",
    "recetaId": "receta-real-prod-real-sides-lg-cole-slaw-43",
    "insumoId": "insu-real-vinegar-red-wine",
    "cantidad": 0.4
  },
  {
    "id": "ri-real-1295",
    "recetaId": "receta-real-prod-real-sides-lg-shredded-lettuce-45",
    "insumoId": "insu-real-lettuce-shred-1-8",
    "cantidad": 16
  },
  {
    "id": "ri-real-1296",
    "recetaId": "receta-real-prod-real-dessert-heavenly-brownie-1",
    "insumoId": "insu-real-brownie-fudge-choc-chip",
    "cantidad": 4
  },
  {
    "id": "ri-real-1297",
    "recetaId": "receta-real-prod-real-kids-original-mini-chop-1",
    "insumoId": "insu-real-lid-for-1-5-oz-souffle-cup-portion-cup-2500-pcs",
    "cantidad": 1
  },
  {
    "id": "ri-real-1298",
    "recetaId": "receta-real-prod-real-kids-original-mini-chop-1",
    "insumoId": "insu-real-1-5-oz-clear-plastic-souffle-cup-portion-cup-25",
    "cantidad": 1
  },
  {
    "id": "ri-real-1299",
    "recetaId": "receta-real-prod-real-kids-original-mini-chop-1",
    "insumoId": "insu-real-small-plate-32-oz-round-container-only-base-300",
    "cantidad": 1
  },
  {
    "id": "ri-real-1300",
    "recetaId": "receta-real-prod-real-kids-original-mini-chop-1",
    "insumoId": "insu-real-24-32-oz-injected-molded-clear-lid-300pcsc",
    "cantidad": 1
  },
  {
    "id": "ri-real-1301",
    "recetaId": "receta-real-prod-real-kids-original-mini-chop-1",
    "insumoId": "insu-real-limes-200-ct",
    "cantidad": 0.006
  },
  {
    "id": "ri-real-1302",
    "recetaId": "receta-real-prod-real-kids-original-mini-chop-1",
    "insumoId": "insu-real-food-coloring-ylw-pwdr",
    "cantidad": 0.0005
  },
  {
    "id": "ri-real-1303",
    "recetaId": "receta-real-prod-real-kids-original-mini-chop-1",
    "insumoId": "insu-real-garlic-whl-pld-frsh",
    "cantidad": 0.018
  },
  {
    "id": "ri-real-1304",
    "recetaId": "receta-real-prod-real-kids-original-mini-chop-1",
    "insumoId": "insu-real-mayo-4-1-gal",
    "cantidad": 0.9088
  },
  {
    "id": "ri-real-1305",
    "recetaId": "receta-real-prod-real-kids-original-mini-chop-1",
    "insumoId": "insu-real-salt-iodized-granular",
    "cantidad": 0.0908
  },
  {
    "id": "ri-real-1306",
    "recetaId": "receta-real-prod-real-kids-original-mini-chop-1",
    "insumoId": "insu-real-napkin-xpress-nat-13-x-8-6",
    "cantidad": 3
  },
  {
    "id": "ri-real-1307",
    "recetaId": "receta-real-prod-real-kids-original-mini-chop-1",
    "insumoId": "insu-real-cilantro-short-stemmed-30-ct",
    "cantidad": 0.006
  },
  {
    "id": "ri-real-1308",
    "recetaId": "receta-real-prod-real-kids-original-mini-chop-1",
    "insumoId": "insu-real-chicken-breast-4-10-lb",
    "cantidad": 3.3333
  },
  {
    "id": "ri-real-1309",
    "recetaId": "receta-real-prod-real-kids-original-mini-chop-1",
    "insumoId": "insu-real-curry-pwdr-4-4-lb",
    "cantidad": 0.0448
  },
  {
    "id": "ri-real-1310",
    "recetaId": "receta-real-prod-real-kids-original-mini-chop-1",
    "insumoId": "insu-real-white-rice-50-lb",
    "cantidad": 2.4151
  },
  {
    "id": "ri-real-1311",
    "recetaId": "receta-real-prod-real-kids-original-mini-chop-1",
    "insumoId": "insu-real-veg-oil",
    "cantidad": 0.1509
  },
  {
    "id": "ri-real-1312",
    "recetaId": "receta-real-prod-real-kids-original-mini-chop-1",
    "insumoId": "insu-real-forks",
    "cantidad": 1
  },
  {
    "id": "ri-real-1313",
    "recetaId": "receta-real-prod-real-kids-original-mini-chop-1",
    "insumoId": "insu-real-mustard-country-style-4-1-gal",
    "cantidad": 0.0224
  },
  {
    "id": "ri-real-1314",
    "recetaId": "receta-real-prod-real-kids-original-mini-chop-1",
    "insumoId": "insu-real-base-chicken-lemon",
    "cantidad": 0.0729
  },
  {
    "id": "ri-real-1315",
    "recetaId": "receta-real-prod-real-kids-original-mini-chop-1",
    "insumoId": "insu-real-bag-t-shirt-12x6x21",
    "cantidad": 1
  },
  {
    "id": "ri-real-1316",
    "recetaId": "receta-real-prod-real-kids-original-mini-chop-1",
    "insumoId": "insu-real-onion-ylw-jumbo-frsh-bag",
    "cantidad": 0.3019
  },
  {
    "id": "ri-real-1317",
    "recetaId": "receta-real-prod-real-kids-original-mini-chop-1",
    "insumoId": "insu-real-sour-cream-pouch-pack",
    "cantidad": 0.108
  },
  {
    "id": "ri-real-1318",
    "recetaId": "receta-real-prod-real-kids-original-mini-chop-1",
    "insumoId": "insu-real-base-chicken-caldo-de-pollo",
    "cantidad": 0.0755
  },
  {
    "id": "ri-real-1319",
    "recetaId": "receta-real-prod-real-kids-teriyaki-mini-chop-2",
    "insumoId": "insu-real-lid-for-1-5-oz-souffle-cup-portion-cup-2500-pcs",
    "cantidad": 1
  },
  {
    "id": "ri-real-1320",
    "recetaId": "receta-real-prod-real-kids-teriyaki-mini-chop-2",
    "insumoId": "insu-real-1-5-oz-clear-plastic-souffle-cup-portion-cup-25",
    "cantidad": 1
  },
  {
    "id": "ri-real-1321",
    "recetaId": "receta-real-prod-real-kids-teriyaki-mini-chop-2",
    "insumoId": "insu-real-limes-200-ct",
    "cantidad": 0.006
  },
  {
    "id": "ri-real-1322",
    "recetaId": "receta-real-prod-real-kids-teriyaki-mini-chop-2",
    "insumoId": "insu-real-food-coloring-ylw-pwdr",
    "cantidad": 0.0005
  },
  {
    "id": "ri-real-1323",
    "recetaId": "receta-real-prod-real-kids-teriyaki-mini-chop-2",
    "insumoId": "insu-real-garlic-whl-pld-frsh",
    "cantidad": 0.018
  },
  {
    "id": "ri-real-1324",
    "recetaId": "receta-real-prod-real-kids-teriyaki-mini-chop-2",
    "insumoId": "insu-real-chicken-thigh-meat-b-s-4-10-lb",
    "cantidad": 3
  },
  {
    "id": "ri-real-1325",
    "recetaId": "receta-real-prod-real-kids-teriyaki-mini-chop-2",
    "insumoId": "insu-real-mayo-4-1-gal",
    "cantidad": 0.9088
  },
  {
    "id": "ri-real-1326",
    "recetaId": "receta-real-prod-real-kids-teriyaki-mini-chop-2",
    "insumoId": "insu-real-salt-iodized-granular",
    "cantidad": 0.069
  },
  {
    "id": "ri-real-1327",
    "recetaId": "receta-real-prod-real-kids-teriyaki-mini-chop-2",
    "insumoId": "insu-real-cilantro-short-stemmed-30-ct",
    "cantidad": 0.006
  },
  {
    "id": "ri-real-1328",
    "recetaId": "receta-real-prod-real-kids-teriyaki-mini-chop-2",
    "insumoId": "insu-real-glaze-teriyaki-4-4-76-kg",
    "cantidad": 0.525
  },
  {
    "id": "ri-real-1329",
    "recetaId": "receta-real-prod-real-kids-teriyaki-mini-chop-2",
    "insumoId": "insu-real-curry-pwdr-4-4-lb",
    "cantidad": 0.0448
  },
  {
    "id": "ri-real-1330",
    "recetaId": "receta-real-prod-real-kids-teriyaki-mini-chop-2",
    "insumoId": "insu-real-white-rice-50-lb",
    "cantidad": 2.4151
  },
  {
    "id": "ri-real-1331",
    "recetaId": "receta-real-prod-real-kids-teriyaki-mini-chop-2",
    "insumoId": "insu-real-veg-oil",
    "cantidad": 0.1509
  },
  {
    "id": "ri-real-1332",
    "recetaId": "receta-real-prod-real-kids-teriyaki-mini-chop-2",
    "insumoId": "insu-real-mustard-country-style-4-1-gal",
    "cantidad": 0.0224
  },
  {
    "id": "ri-real-1333",
    "recetaId": "receta-real-prod-real-kids-teriyaki-mini-chop-2",
    "insumoId": "insu-real-onion-ylw-jumbo-frsh-bag",
    "cantidad": 0.3019
  },
  {
    "id": "ri-real-1334",
    "recetaId": "receta-real-prod-real-kids-teriyaki-mini-chop-2",
    "insumoId": "insu-real-sour-cream-pouch-pack",
    "cantidad": 0.108
  },
  {
    "id": "ri-real-1335",
    "recetaId": "receta-real-prod-real-kids-teriyaki-mini-chop-2",
    "insumoId": "insu-real-base-chicken-caldo-de-pollo",
    "cantidad": 0.0755
  },
  {
    "id": "ri-real-1336",
    "recetaId": "receta-real-prod-real-kids-plain-cheesadilla-kids-3",
    "insumoId": "insu-real-small-plate-32-oz-round-container-only-base-300",
    "cantidad": 1
  },
  {
    "id": "ri-real-1337",
    "recetaId": "receta-real-prod-real-kids-plain-cheesadilla-kids-3",
    "insumoId": "insu-real-24-32-oz-injected-molded-clear-lid-300pcsc",
    "cantidad": 1
  },
  {
    "id": "ri-real-1338",
    "recetaId": "receta-real-prod-real-kids-plain-cheesadilla-kids-3",
    "insumoId": "insu-real-tortilla-flour-13-in",
    "cantidad": 1
  },
  {
    "id": "ri-real-1339",
    "recetaId": "receta-real-prod-real-kids-plain-cheesadilla-kids-3",
    "insumoId": "insu-real-napkin-xpress-nat-13-x-8-6",
    "cantidad": 3
  },
  {
    "id": "ri-real-1340",
    "recetaId": "receta-real-prod-real-kids-plain-cheesadilla-kids-3",
    "insumoId": "insu-real-cheese-ched-mild-shred-fancy",
    "cantidad": 4
  },
  {
    "id": "ri-real-1341",
    "recetaId": "receta-real-prod-real-kids-plain-cheesadilla-kids-3",
    "insumoId": "insu-real-forks",
    "cantidad": 1
  },
  {
    "id": "ri-real-1342",
    "recetaId": "receta-real-prod-real-kids-plain-cheesadilla-kids-3",
    "insumoId": "insu-real-bag-t-shirt-12x6x21",
    "cantidad": 1
  },
  {
    "id": "ri-real-1343",
    "recetaId": "receta-real-prod-real-kids-chicken-cheesadilla-kid-4",
    "insumoId": "insu-real-tortilla-flour-13-in",
    "cantidad": 1
  },
  {
    "id": "ri-real-1344",
    "recetaId": "receta-real-prod-real-kids-chicken-cheesadilla-kid-4",
    "insumoId": "insu-real-salt-iodized-granular",
    "cantidad": 0.0312
  },
  {
    "id": "ri-real-1345",
    "recetaId": "receta-real-prod-real-kids-chicken-cheesadilla-kid-4",
    "insumoId": "insu-real-cheese-ched-mild-shred-fancy",
    "cantidad": 4
  },
  {
    "id": "ri-real-1346",
    "recetaId": "receta-real-prod-real-kids-chicken-cheesadilla-kid-4",
    "insumoId": "insu-real-chicken-breast-4-10-lb",
    "cantidad": 3.3333
  },
  {
    "id": "ri-real-1347",
    "recetaId": "receta-real-prod-real-kids-chicken-cheesadilla-kid-4",
    "insumoId": "insu-real-base-chicken-lemon",
    "cantidad": 0.0729
  },
  {
    "id": "ri-real-1348",
    "recetaId": "receta-real-prod-real-beverages-bottled-water-1",
    "insumoId": "insu-real-water-spring",
    "cantidad": 1
  },
  {
    "id": "ri-real-1349",
    "recetaId": "receta-real-prod-real-beverages-diet-pepsi-soda-2",
    "insumoId": "insu-real-soda-cola-diet-can",
    "cantidad": 1
  },
  {
    "id": "ri-real-1350",
    "recetaId": "receta-real-prod-real-beverages-diet-pepsi-can-3",
    "insumoId": "insu-real-soda-cola-diet-can",
    "cantidad": 1
  },
  {
    "id": "ri-real-1351",
    "recetaId": "receta-real-prod-real-beverages-pepsi-soda-4",
    "insumoId": "insu-real-soda-cola-can",
    "cantidad": 1
  },
  {
    "id": "ri-real-1352",
    "recetaId": "receta-real-prod-real-beverages-pepsi-can-5",
    "insumoId": "insu-real-soda-cola-can",
    "cantidad": 1
  },
  {
    "id": "ri-real-1353",
    "recetaId": "receta-real-prod-real-beverages-capri-fruit-punch-17",
    "insumoId": "insu-real-drink-fruit-punch-single-serve",
    "cantidad": 1
  },
  {
    "id": "ri-real-1354",
    "recetaId": "receta-real-prod-real-dressings-balsamic-vinaigrette-2",
    "insumoId": "insu-real-salt-iodized-granular",
    "cantidad": 0.06
  },
  {
    "id": "ri-real-1355",
    "recetaId": "receta-real-prod-real-dressings-balsamic-vinaigrette-2",
    "insumoId": "insu-real-veg-oil",
    "cantidad": 0.96
  },
  {
    "id": "ri-real-1356",
    "recetaId": "receta-real-prod-real-dressings-balsamic-vinaigrette-2",
    "insumoId": "insu-real-garlic-pwdr-fine-grnd-1-4-lb",
    "cantidad": 0.06
  },
  {
    "id": "ri-real-1357",
    "recetaId": "receta-real-prod-real-dressings-balsamic-vinaigrette-2",
    "insumoId": "insu-real-vinegar-balsamic",
    "cantidad": 0.48
  },
  {
    "id": "ri-real-1358",
    "recetaId": "receta-real-prod-real-dressings-caesar-dressing-3",
    "insumoId": "insu-real-dressing-caesar-royal",
    "cantidad": 1.5
  },
  {
    "id": "ri-real-1359",
    "recetaId": "receta-real-prod-real-dressings-balsamic-vinegar-4",
    "insumoId": "insu-real-salt-iodized-granular",
    "cantidad": 0.06
  },
  {
    "id": "ri-real-1360",
    "recetaId": "receta-real-prod-real-dressings-balsamic-vinegar-4",
    "insumoId": "insu-real-veg-oil",
    "cantidad": 0.96
  },
  {
    "id": "ri-real-1361",
    "recetaId": "receta-real-prod-real-dressings-balsamic-vinegar-4",
    "insumoId": "insu-real-garlic-pwdr-fine-grnd-1-4-lb",
    "cantidad": 0.06
  },
  {
    "id": "ri-real-1362",
    "recetaId": "receta-real-prod-real-dressings-balsamic-vinegar-4",
    "insumoId": "insu-real-vinegar-balsamic",
    "cantidad": 0.48
  },
  {
    "id": "ri-real-1363",
    "recetaId": "receta-real-prod-real-dressings-olive-oil-5",
    "insumoId": "insu-real-oil-olive-100-extra-virgin",
    "cantidad": 1.5
  },
  {
    "id": "ri-real-1364",
    "recetaId": "receta-real-prod-real-dressings-red-wine-vinegar-6",
    "insumoId": "insu-real-vinegar-red-wine",
    "cantidad": 1.5
  },
  {
    "id": "ri-real-1365",
    "recetaId": "receta-real-prod-real-sauces-original-mustard-n-curr-1",
    "insumoId": "insu-real-mayo-4-1-gal",
    "cantidad": 1.024
  },
  {
    "id": "ri-real-1366",
    "recetaId": "receta-real-prod-real-sauces-original-mustard-n-curr-1",
    "insumoId": "insu-real-curry-pwdr-4-4-lb",
    "cantidad": 0.064
  },
  {
    "id": "ri-real-1367",
    "recetaId": "receta-real-prod-real-sauces-original-mustard-n-curr-1",
    "insumoId": "insu-real-mustard-country-style-4-1-gal",
    "cantidad": 0.032
  },
  {
    "id": "ri-real-1368",
    "recetaId": "receta-real-prod-real-sauces-spicy-mustard-n-curry-2",
    "insumoId": "insu-real-mayo-4-1-gal",
    "cantidad": 0.8401
  },
  {
    "id": "ri-real-1369",
    "recetaId": "receta-real-prod-real-sauces-spicy-mustard-n-curry-2",
    "insumoId": "insu-real-sauce-hot",
    "cantidad": 0.2692
  },
  {
    "id": "ri-real-1370",
    "recetaId": "receta-real-prod-real-sauces-spicy-mustard-n-curry-2",
    "insumoId": "insu-real-curry-pwdr-4-4-lb",
    "cantidad": 0.0525
  },
  {
    "id": "ri-real-1371",
    "recetaId": "receta-real-prod-real-sauces-spicy-mustard-n-curry-2",
    "insumoId": "insu-real-mustard-country-style-4-1-gal",
    "cantidad": 0.0263
  },
  {
    "id": "ri-real-1372",
    "recetaId": "receta-real-prod-real-sauces-garlic-cilantro-3",
    "insumoId": "insu-real-limes-200-ct",
    "cantidad": 0.03
  },
  {
    "id": "ri-real-1373",
    "recetaId": "receta-real-prod-real-sauces-garlic-cilantro-3",
    "insumoId": "insu-real-garlic-whl-pld-frsh",
    "cantidad": 0.09
  },
  {
    "id": "ri-real-1374",
    "recetaId": "receta-real-prod-real-sauces-garlic-cilantro-3",
    "insumoId": "insu-real-mayo-4-1-gal",
    "cantidad": 0.96
  },
  {
    "id": "ri-real-1375",
    "recetaId": "receta-real-prod-real-sauces-garlic-cilantro-3",
    "insumoId": "insu-real-salt-iodized-granular",
    "cantidad": 0.015
  },
  {
    "id": "ri-real-1376",
    "recetaId": "receta-real-prod-real-sauces-garlic-cilantro-3",
    "insumoId": "insu-real-cilantro-short-stemmed-30-ct",
    "cantidad": 0.03
  },
  {
    "id": "ri-real-1377",
    "recetaId": "receta-real-prod-real-sauces-garlic-cilantro-3",
    "insumoId": "insu-real-sour-cream-pouch-pack",
    "cantidad": 0.54
  },
  {
    "id": "ri-real-1378",
    "recetaId": "receta-real-prod-real-sauces-chipotle-lime-4",
    "insumoId": "insu-real-sauce-ancho-chipotle-sandwich",
    "cantidad": 1.5
  },
  {
    "id": "ri-real-1379",
    "recetaId": "receta-real-prod-real-sauces-bbq-5",
    "insumoId": "insu-real-sauce-bbq-sweet-bold",
    "cantidad": 1.2
  },
  {
    "id": "ri-real-1380",
    "recetaId": "receta-real-prod-real-sauces-fresh-salsa-6",
    "insumoId": "insu-real-limes-200-ct",
    "cantidad": 0.015
  },
  {
    "id": "ri-real-1381",
    "recetaId": "receta-real-prod-real-sauces-fresh-salsa-6",
    "insumoId": "insu-real-peppers-jalapeno",
    "cantidad": 0.03
  },
  {
    "id": "ri-real-1382",
    "recetaId": "receta-real-prod-real-sauces-fresh-salsa-6",
    "insumoId": "insu-real-cilantro-fresh-1-lb",
    "cantidad": 0.24
  },
  {
    "id": "ri-real-1383",
    "recetaId": "receta-real-prod-real-sauces-fresh-salsa-6",
    "insumoId": "insu-real-salt-iodized-granular",
    "cantidad": 0.015
  },
  {
    "id": "ri-real-1384",
    "recetaId": "receta-real-prod-real-sauces-fresh-salsa-6",
    "insumoId": "insu-real-tomato-25-lb",
    "cantidad": 1.5
  },
  {
    "id": "ri-real-1385",
    "recetaId": "receta-real-prod-real-sauces-spicy-salsa-verde-7",
    "insumoId": "insu-real-peppers-jalapeno",
    "cantidad": 0.1862
  },
  {
    "id": "ri-real-1386",
    "recetaId": "receta-real-prod-real-sauces-spicy-salsa-verde-7",
    "insumoId": "insu-real-cilantro-fresh-1-lb",
    "cantidad": 0.24
  },
  {
    "id": "ri-real-1387",
    "recetaId": "receta-real-prod-real-sauces-spicy-salsa-verde-7",
    "insumoId": "insu-real-salt-iodized-granular",
    "cantidad": 0.0462
  },
  {
    "id": "ri-real-1388",
    "recetaId": "receta-real-prod-real-sauces-spicy-salsa-verde-7",
    "insumoId": "insu-real-tomato-25-lb",
    "cantidad": 1.5
  },
  {
    "id": "ri-real-1389",
    "recetaId": "receta-real-prod-real-sauces-sweet-sour-8",
    "insumoId": "insu-real-sauce-chili-sweet-red-hot",
    "cantidad": 1.5
  },
  {
    "id": "ri-real-1390",
    "recetaId": "receta-real-prod-real-sauces-cholula-hot-sauce-packe-11",
    "insumoId": "insu-real-sauce-hot-packet",
    "cantidad": 1
  },
  {
    "id": "ri-real-1391",
    "recetaId": "receta-real-prod-real-sauces-original-mustardn-curry-12",
    "insumoId": "insu-real-mayo-4-1-gal",
    "cantidad": 1.024
  },
  {
    "id": "ri-real-1392",
    "recetaId": "receta-real-prod-real-sauces-original-mustardn-curry-12",
    "insumoId": "insu-real-curry-pwdr-4-4-lb",
    "cantidad": 0.064
  },
  {
    "id": "ri-real-1393",
    "recetaId": "receta-real-prod-real-sauces-original-mustardn-curry-12",
    "insumoId": "insu-real-mustard-country-style-4-1-gal",
    "cantidad": 0.032
  },
  {
    "id": "ri-real-1394",
    "recetaId": "receta-real-prod-real-sauces-spicy-mustardn-curry-13",
    "insumoId": "insu-real-mayo-4-1-gal",
    "cantidad": 0.8401
  },
  {
    "id": "ri-real-1395",
    "recetaId": "receta-real-prod-real-sauces-spicy-mustardn-curry-13",
    "insumoId": "insu-real-sauce-hot",
    "cantidad": 0.2692
  },
  {
    "id": "ri-real-1396",
    "recetaId": "receta-real-prod-real-sauces-spicy-mustardn-curry-13",
    "insumoId": "insu-real-curry-pwdr-4-4-lb",
    "cantidad": 0.0525
  },
  {
    "id": "ri-real-1397",
    "recetaId": "receta-real-prod-real-sauces-spicy-mustardn-curry-13",
    "insumoId": "insu-real-mustard-country-style-4-1-gal",
    "cantidad": 0.0263
  },
  {
    "id": "ri-real-1398",
    "recetaId": "receta-real-prod-real-toppings-fresh-guacamole-1",
    "insumoId": "insu-real-limes-200-ct",
    "cantidad": 0.0429
  },
  {
    "id": "ri-real-1399",
    "recetaId": "receta-real-prod-real-toppings-fresh-guacamole-1",
    "insumoId": "insu-real-avocado-ripe-48-ct",
    "cantidad": 0.2857
  },
  {
    "id": "ri-real-1400",
    "recetaId": "receta-real-prod-real-toppings-fresh-guacamole-1",
    "insumoId": "insu-real-peppers-jalapeno",
    "cantidad": 0.0571
  },
  {
    "id": "ri-real-1401",
    "recetaId": "receta-real-prod-real-toppings-fresh-guacamole-1",
    "insumoId": "insu-real-salt-iodized-granular",
    "cantidad": 0.0571
  },
  {
    "id": "ri-real-1402",
    "recetaId": "receta-real-prod-real-toppings-fresh-guacamole-1",
    "insumoId": "insu-real-cilantro-short-stemmed-30-ct",
    "cantidad": 0.0571
  },
  {
    "id": "ri-real-1403",
    "recetaId": "receta-real-prod-real-toppings-fresh-guacamole-1",
    "insumoId": "insu-real-tomato-25-lb",
    "cantidad": 0.4571
  },
  {
    "id": "ri-real-1404",
    "recetaId": "receta-real-prod-real-toppings-fresh-guacamole-1",
    "insumoId": "insu-real-onion-red-jumbo",
    "cantidad": 0.1143
  },
  {
    "id": "ri-real-1405",
    "recetaId": "receta-real-prod-real-toppings-avocado-half-2",
    "insumoId": "insu-real-avocado-ripe-48-ct",
    "cantidad": 0.5
  },
  {
    "id": "ri-real-1406",
    "recetaId": "receta-real-prod-real-toppings-cheddar-cheese-3",
    "insumoId": "insu-real-cheese-ched-mild-shred-fancy",
    "cantidad": 2
  },
  {
    "id": "ri-real-1407",
    "recetaId": "receta-real-prod-real-toppings-sour-cream-4",
    "insumoId": "insu-real-sour-cream-pouch-pack",
    "cantidad": 1.5
  },
  {
    "id": "ri-real-1408",
    "recetaId": "receta-real-prod-real-toppings-diced-tomatoes-5",
    "insumoId": "insu-real-tomato-25-lb",
    "cantidad": 2
  },
  {
    "id": "ri-real-1409",
    "recetaId": "receta-real-prod-real-toppings-shredded-lettuce-6",
    "insumoId": "insu-real-lettuce-shred-1-8",
    "cantidad": 2
  },
  {
    "id": "ri-real-1410",
    "recetaId": "receta-real-prod-real-toppings-corn-mix-7",
    "insumoId": "insu-real-limes-200-ct",
    "cantidad": 0.0267
  },
  {
    "id": "ri-real-1411",
    "recetaId": "receta-real-prod-real-toppings-corn-mix-7",
    "insumoId": "insu-real-peppers-red-bell",
    "cantidad": 0.1333
  },
  {
    "id": "ri-real-1412",
    "recetaId": "receta-real-prod-real-toppings-corn-mix-7",
    "insumoId": "insu-real-salt-iodized-granular",
    "cantidad": 0.0267
  },
  {
    "id": "ri-real-1413",
    "recetaId": "receta-real-prod-real-toppings-corn-mix-7",
    "insumoId": "insu-real-cilantro-short-stemmed-30-ct",
    "cantidad": 0.04
  },
  {
    "id": "ri-real-1414",
    "recetaId": "receta-real-prod-real-toppings-corn-mix-7",
    "insumoId": "insu-real-black-bean-seasoned",
    "cantidad": 1.4933
  },
  {
    "id": "ri-real-1415",
    "recetaId": "receta-real-prod-real-toppings-corn-mix-7",
    "insumoId": "insu-real-corn-ylw-super-sweet-cut",
    "cantidad": 0.32
  },
  {
    "id": "ri-real-1416",
    "recetaId": "receta-real-prod-real-toppings-corn-mix-7",
    "insumoId": "insu-real-onion-red-jumbo",
    "cantidad": 0.12
  },
  {
    "id": "ri-real-1417",
    "recetaId": "receta-real-prod-real-toppings-corn-mix-7",
    "insumoId": "insu-real-onion-green-w-t",
    "cantidad": 0.0053
  },
  {
    "id": "ri-real-1418",
    "recetaId": "receta-real-prod-real-toppings-corn-mix-7",
    "insumoId": "insu-real-vinegar-red-wine",
    "cantidad": 0.32
  },
  {
    "id": "ri-real-1419",
    "recetaId": "receta-real-prod-real-toppings-corn-kernels-8",
    "insumoId": "insu-real-corn-ylw-super-sweet-cut",
    "cantidad": 2
  },
  {
    "id": "ri-real-1420",
    "recetaId": "receta-real-prod-real-toppings-black-beans-9",
    "insumoId": "insu-real-black-bean-seasoned",
    "cantidad": 3
  },
  {
    "id": "ri-real-1421",
    "recetaId": "receta-real-prod-real-toppings-scallions-10",
    "insumoId": "insu-real-onion-green-w-t",
    "cantidad": 0.5
  },
  {
    "id": "ri-real-1422",
    "recetaId": "receta-real-prod-real-toppings-red-onions-11",
    "insumoId": "insu-real-onion-red-jumbo",
    "cantidad": 1
  },
  {
    "id": "ri-real-1423",
    "recetaId": "receta-real-prod-real-toppings-red-peppers-12",
    "insumoId": "insu-real-peppers-red-bell",
    "cantidad": 2
  },
  {
    "id": "ri-real-1424",
    "recetaId": "receta-real-prod-real-toppings-peppers-13",
    "insumoId": "insu-real-peppers-green-bell",
    "cantidad": 1.5
  },
  {
    "id": "ri-real-1425",
    "recetaId": "receta-real-prod-real-toppings-broccoli-14",
    "insumoId": "insu-real-broccoli-floret-mini",
    "cantidad": 2
  },
  {
    "id": "ri-real-1426",
    "recetaId": "receta-real-prod-real-toppings-cucumbers-15",
    "insumoId": "insu-real-cucumber-sel",
    "cantidad": 1
  },
  {
    "id": "ri-real-1427",
    "recetaId": "receta-real-prod-real-toppings-carrots-16",
    "insumoId": "insu-real-carrot-sticks-5-lb",
    "cantidad": 1
  },
  {
    "id": "ri-real-1428",
    "recetaId": "receta-real-prod-real-toppings-balsamic-tomatoes-17",
    "insumoId": "insu-real-oil-olive-extra-virgin",
    "cantidad": 0.0779
  },
  {
    "id": "ri-real-1429",
    "recetaId": "receta-real-prod-real-toppings-balsamic-tomatoes-17",
    "insumoId": "insu-real-salt-iodized-granular",
    "cantidad": 0.0195
  },
  {
    "id": "ri-real-1430",
    "recetaId": "receta-real-prod-real-toppings-balsamic-tomatoes-17",
    "insumoId": "insu-real-vinegar-balsamic",
    "cantidad": 0.3117
  },
  {
    "id": "ri-real-1431",
    "recetaId": "receta-real-prod-real-toppings-balsamic-tomatoes-17",
    "insumoId": "insu-real-tomato-25-lb",
    "cantidad": 2.4935
  },
  {
    "id": "ri-real-1432",
    "recetaId": "receta-real-prod-real-toppings-balsamic-tomatoes-17",
    "insumoId": "insu-real-onion-red-jumbo",
    "cantidad": 0.3896
  },
  {
    "id": "ri-real-1433",
    "recetaId": "receta-real-prod-real-toppings-banana-peppers-18",
    "insumoId": "insu-real-peppers-banana-rings-mild",
    "cantidad": 1.5
  },
  {
    "id": "ri-real-1434",
    "recetaId": "receta-real-prod-real-toppings-jalapenos-19",
    "insumoId": "insu-real-peppers-jalapeno",
    "cantidad": 1
  },
  {
    "id": "ri-real-1435",
    "recetaId": "receta-real-prod-real-toppings-greek-olives-20",
    "insumoId": "insu-real-olive-slcd-ripe-imp",
    "cantidad": 1
  },
  {
    "id": "ri-real-1436",
    "recetaId": "receta-real-prod-real-toppings-chopped-sweet-plantains-21",
    "insumoId": "insu-real-plantain-sweet-sliced",
    "cantidad": 3
  },
  {
    "id": "ri-real-1437",
    "recetaId": "receta-real-prod-real-toppings-whole-sweet-plantains-22",
    "insumoId": "insu-real-plantain-sweet-sliced",
    "cantidad": 3
  },
  {
    "id": "ri-real-1438",
    "recetaId": "receta-real-prod-real-toppings-romaine-lettuce-23",
    "insumoId": "insu-real-lettuce-romaine-hearts-24-ct",
    "cantidad": 2
  },
  {
    "id": "ri-real-1439",
    "recetaId": "receta-real-prod-real-toppings-mixed-greens-24",
    "insumoId": "insu-real-spring-mix",
    "cantidad": 1
  },
  {
    "id": "ri-real-1440",
    "recetaId": "receta-real-prod-real-toppings-coleslaw-25",
    "insumoId": "insu-real-dressing-coleslaw-base",
    "cantidad": 0.2
  },
  {
    "id": "ri-real-1441",
    "recetaId": "receta-real-prod-real-toppings-coleslaw-25",
    "insumoId": "insu-real-salt-iodized-granular",
    "cantidad": 0.0062
  },
  {
    "id": "ri-real-1442",
    "recetaId": "receta-real-prod-real-toppings-coleslaw-25",
    "insumoId": "insu-real-cabbage-shred-sep-color",
    "cantidad": 2
  },
  {
    "id": "ri-real-1443",
    "recetaId": "receta-real-prod-real-toppings-coleslaw-25",
    "insumoId": "insu-real-pepper-black-table-grind-jar",
    "cantidad": 0.005
  },
  {
    "id": "ri-real-1444",
    "recetaId": "receta-real-prod-real-toppings-coleslaw-25",
    "insumoId": "insu-real-vinegar-red-wine",
    "cantidad": 0.05
  },
  {
    "id": "ri-real-1445",
    "recetaId": "receta-real-prod-real-toppings-parmesan-cheese-26",
    "insumoId": "insu-real-cheese-parmesan-romano-style",
    "cantidad": 1.5
  },
  {
    "id": "ri-real-1446",
    "recetaId": "receta-real-prod-real-toppings-sesame-seeds-27",
    "insumoId": "insu-real-sesame-seed-whi",
    "cantidad": 1.5
  },
  {
    "id": "ri-real-1447",
    "recetaId": "receta-real-prod-real-toppings-croutons-28",
    "insumoId": "insu-real-crouton-hs-lg-seasnd",
    "cantidad": 1.5
  },
  {
    "id": "ri-real-1448",
    "recetaId": "receta-real-prod-real-toppings-yellow-rice-scoop-29",
    "insumoId": "insu-real-food-coloring-ylw-pwdr",
    "cantidad": 0.0002
  },
  {
    "id": "ri-real-1449",
    "recetaId": "receta-real-prod-real-toppings-yellow-rice-scoop-29",
    "insumoId": "insu-real-salt-iodized-granular",
    "cantidad": 0.0283
  },
  {
    "id": "ri-real-1450",
    "recetaId": "receta-real-prod-real-toppings-yellow-rice-scoop-29",
    "insumoId": "insu-real-white-rice-50-lb",
    "cantidad": 1.2075
  },
  {
    "id": "ri-real-1451",
    "recetaId": "receta-real-prod-real-toppings-yellow-rice-scoop-29",
    "insumoId": "insu-real-veg-oil",
    "cantidad": 0.0755
  },
  {
    "id": "ri-real-1452",
    "recetaId": "receta-real-prod-real-toppings-yellow-rice-scoop-29",
    "insumoId": "insu-real-onion-ylw-jumbo-frsh-bag",
    "cantidad": 0.1509
  },
  {
    "id": "ri-real-1453",
    "recetaId": "receta-real-prod-real-toppings-yellow-rice-scoop-29",
    "insumoId": "insu-real-base-chicken-caldo-de-pollo",
    "cantidad": 0.0377
  },
  {
    "id": "ri-real-1454",
    "recetaId": "receta-real-prod-real-toppings-brown-rice-plain-30",
    "insumoId": "insu-real-salt-iodized-granular",
    "cantidad": 0.0566
  },
  {
    "id": "ri-real-1455",
    "recetaId": "receta-real-prod-real-toppings-brown-rice-plain-30",
    "insumoId": "insu-real-brown-rice-25-lb",
    "cantidad": 3.6226
  },
  {
    "id": "ri-real-1456",
    "recetaId": "receta-real-prod-real-toppings-brown-rice-plain-30",
    "insumoId": "insu-real-veg-oil",
    "cantidad": 0.2264
  },
  {
    "id": "ri-real-1457",
    "recetaId": "receta-real-prod-real-toppings-cilantro-white-rice-31",
    "insumoId": "insu-real-salt-iodized-granular",
    "cantidad": 0.0142
  },
  {
    "id": "ri-real-1458",
    "recetaId": "receta-real-prod-real-toppings-cilantro-white-rice-31",
    "insumoId": "insu-real-cilantro-short-stemmed-30-ct",
    "cantidad": 0.3396
  },
  {
    "id": "ri-real-1459",
    "recetaId": "receta-real-prod-real-toppings-cilantro-white-rice-31",
    "insumoId": "insu-real-brown-rice-25-lb",
    "cantidad": 3.6226
  },
  {
    "id": "ri-real-1460",
    "recetaId": "receta-real-prod-real-toppings-cilantro-white-rice-31",
    "insumoId": "insu-real-onion-ylw-jumbo-frsh-bag",
    "cantidad": 0.4528
  },
  {
    "id": "ri-real-1461",
    "recetaId": "receta-real-prod-real-toppings-cilantro-white-rice-31",
    "insumoId": "insu-real-base-chicken-caldo-de-pollo",
    "cantidad": 0.2264
  },
  {
    "id": "ri-real-1462",
    "recetaId": "receta-real-prod-real-toppings-guacamole-32",
    "insumoId": "insu-real-limes-200-ct",
    "cantidad": 0.0429
  },
  {
    "id": "ri-real-1463",
    "recetaId": "receta-real-prod-real-toppings-guacamole-32",
    "insumoId": "insu-real-avocado-ripe-48-ct",
    "cantidad": 0.2857
  },
  {
    "id": "ri-real-1464",
    "recetaId": "receta-real-prod-real-toppings-guacamole-32",
    "insumoId": "insu-real-peppers-jalapeno",
    "cantidad": 0.0571
  },
  {
    "id": "ri-real-1465",
    "recetaId": "receta-real-prod-real-toppings-guacamole-32",
    "insumoId": "insu-real-salt-iodized-granular",
    "cantidad": 0.0571
  },
  {
    "id": "ri-real-1466",
    "recetaId": "receta-real-prod-real-toppings-guacamole-32",
    "insumoId": "insu-real-cilantro-short-stemmed-30-ct",
    "cantidad": 0.0571
  },
  {
    "id": "ri-real-1467",
    "recetaId": "receta-real-prod-real-toppings-guacamole-32",
    "insumoId": "insu-real-tomato-25-lb",
    "cantidad": 0.4571
  },
  {
    "id": "ri-real-1468",
    "recetaId": "receta-real-prod-real-toppings-guacamole-32",
    "insumoId": "insu-real-onion-red-jumbo",
    "cantidad": 0.1143
  },
  {
    "id": "ri-real-1469",
    "recetaId": "receta-real-prod-real-toppings-half-avocado-33",
    "insumoId": "insu-real-avocado-ripe-48-ct",
    "cantidad": 0.5
  },
  {
    "id": "ri-real-1470",
    "recetaId": "receta-real-prod-real-toppings-lettuce-shredded-34",
    "insumoId": "insu-real-lettuce-shred-1-8",
    "cantidad": 2
  },
  {
    "id": "ri-real-1471",
    "recetaId": "receta-real-prod-real-toppings-chopped-plantains-35",
    "insumoId": "insu-real-plantain-sweet-sliced",
    "cantidad": 3
  },
  {
    "id": "ri-real-1472",
    "recetaId": "receta-real-prod-real-toppings-sweet-plantains-whole-36",
    "insumoId": "insu-real-plantain-sweet-sliced",
    "cantidad": 3
  },
  {
    "id": "ri-real-1473",
    "recetaId": "receta-real-prod-real-modifiers-substitute-yellow-rice-8",
    "insumoId": "insu-real-food-coloring-ylw-pwdr",
    "cantidad": 0.0002
  },
  {
    "id": "ri-real-1474",
    "recetaId": "receta-real-prod-real-modifiers-substitute-yellow-rice-8",
    "insumoId": "insu-real-salt-iodized-granular",
    "cantidad": 0.0283
  },
  {
    "id": "ri-real-1475",
    "recetaId": "receta-real-prod-real-modifiers-substitute-yellow-rice-8",
    "insumoId": "insu-real-white-rice-50-lb",
    "cantidad": 1.2075
  },
  {
    "id": "ri-real-1476",
    "recetaId": "receta-real-prod-real-modifiers-substitute-yellow-rice-8",
    "insumoId": "insu-real-veg-oil",
    "cantidad": 0.0755
  },
  {
    "id": "ri-real-1477",
    "recetaId": "receta-real-prod-real-modifiers-substitute-yellow-rice-8",
    "insumoId": "insu-real-onion-ylw-jumbo-frsh-bag",
    "cantidad": 0.1509
  },
  {
    "id": "ri-real-1478",
    "recetaId": "receta-real-prod-real-modifiers-substitute-yellow-rice-8",
    "insumoId": "insu-real-base-chicken-caldo-de-pollo",
    "cantidad": 0.0377
  },
  {
    "id": "ri-real-1479",
    "recetaId": "receta-real-prod-real-modifiers-substitute-brown-rice-9",
    "insumoId": "insu-real-salt-iodized-granular",
    "cantidad": 0.0189
  },
  {
    "id": "ri-real-1480",
    "recetaId": "receta-real-prod-real-modifiers-substitute-brown-rice-9",
    "insumoId": "insu-real-brown-rice-25-lb",
    "cantidad": 1.2075
  },
  {
    "id": "ri-real-1481",
    "recetaId": "receta-real-prod-real-modifiers-substitute-brown-rice-9",
    "insumoId": "insu-real-veg-oil",
    "cantidad": 0.0755
  },
  {
    "id": "ri-real-1482",
    "recetaId": "receta-real-prod-real-cheesadillas-cheesadilla-1",
    "insumoId": "insu-real-tortilla-flour-13-in",
    "cantidad": 1
  },
  {
    "id": "ri-real-1483",
    "recetaId": "receta-real-prod-real-cheesadillas-cheesadilla-1",
    "insumoId": "insu-real-napkin-xpress-nat-13-x-8-6",
    "cantidad": 0.006
  },
  {
    "id": "ri-real-1484",
    "recetaId": "receta-real-prod-real-cheesadillas-cheesadilla-1",
    "insumoId": "insu-real-cheese-ched-mild-shred-fancy",
    "cantidad": 6
  },
  {
    "id": "ri-real-1485",
    "recetaId": "receta-real-prod-real-cheesadillas-cheesadilla-1",
    "insumoId": "insu-real-bag-t-shirt-12x6x21",
    "cantidad": 0.002
  },
  {
    "id": "ri-real-1486",
    "recetaId": "receta-real-prod-real-cheesadillas-cheesadilla-1",
    "insumoId": "insu-real-wrap-cushion-foil-14x16-slvr",
    "cantidad": 0.002
  },
  {
    "id": "ri-real-1487",
    "recetaId": "receta-real-prod-real-cheesadillas-chicken-cheesadilla-2",
    "insumoId": "insu-real-tortilla-flour-13-in",
    "cantidad": 1
  },
  {
    "id": "ri-real-1488",
    "recetaId": "receta-real-prod-real-cheesadillas-chicken-cheesadilla-2",
    "insumoId": "insu-real-salt-iodized-granular",
    "cantidad": 0.0438
  },
  {
    "id": "ri-real-1489",
    "recetaId": "receta-real-prod-real-cheesadillas-chicken-cheesadilla-2",
    "insumoId": "insu-real-napkin-xpress-nat-13-x-8-6",
    "cantidad": 0.006
  },
  {
    "id": "ri-real-1490",
    "recetaId": "receta-real-prod-real-cheesadillas-chicken-cheesadilla-2",
    "insumoId": "insu-real-cheese-ched-mild-shred-fancy",
    "cantidad": 6
  },
  {
    "id": "ri-real-1491",
    "recetaId": "receta-real-prod-real-cheesadillas-chicken-cheesadilla-2",
    "insumoId": "insu-real-chicken-breast-4-10-lb",
    "cantidad": 4.6667
  },
  {
    "id": "ri-real-1492",
    "recetaId": "receta-real-prod-real-cheesadillas-chicken-cheesadilla-2",
    "insumoId": "insu-real-base-chicken-lemon",
    "cantidad": 0.1021
  },
  {
    "id": "ri-real-1493",
    "recetaId": "receta-real-prod-real-cheesadillas-chicken-cheesadilla-2",
    "insumoId": "insu-real-bag-t-shirt-12x6x21",
    "cantidad": 0.002
  },
  {
    "id": "ri-real-1494",
    "recetaId": "receta-real-prod-real-cheesadillas-chicken-cheesadilla-2",
    "insumoId": "insu-real-wrap-cushion-foil-14x16-slvr",
    "cantidad": 0.002
  },
  {
    "id": "ri-real-1495",
    "recetaId": "receta-real-prod-real-cheesadillas-wheat-tortilla-5",
    "insumoId": "insu-real-tortilla-wheat-13-in",
    "cantidad": 1
  },
  {
    "id": "ri-real-1496",
    "recetaId": "receta-real-prod-real-cheesadillas-white-tortilla-6",
    "insumoId": "insu-real-tortilla-flour-13-in",
    "cantidad": 1
  },
  {
    "id": "ri-real-1497",
    "recetaId": "receta-real-prod-real-cheesadillas-plain-cheesadilla-7",
    "insumoId": "insu-real-10-80-oz-high-pro-bowl-polypro-25-cs-black",
    "cantidad": 1
  },
  {
    "id": "ri-real-1498",
    "recetaId": "receta-real-prod-real-cheesadillas-plain-cheesadilla-7",
    "insumoId": "insu-real-tortilla-flour-13-in",
    "cantidad": 1
  },
  {
    "id": "ri-real-1499",
    "recetaId": "receta-real-prod-real-cheesadillas-plain-cheesadilla-7",
    "insumoId": "insu-real-dspnsr-napkin-1000-cpcty-stand",
    "cantidad": 1
  },
  {
    "id": "ri-real-1500",
    "recetaId": "receta-real-prod-real-cheesadillas-plain-cheesadilla-7",
    "insumoId": "insu-real-forks",
    "cantidad": 1
  },
  {
    "id": "ri-real-1501",
    "recetaId": "receta-real-prod-real-catering-single-portion-grilled-3",
    "insumoId": "insu-real-salt-iodized-granular",
    "cantidad": 0.1
  },
  {
    "id": "ri-real-1502",
    "recetaId": "receta-real-prod-real-catering-single-portion-grilled-3",
    "insumoId": "insu-real-chicken-breast-4-10-lb",
    "cantidad": 10.6667
  },
  {
    "id": "ri-real-1503",
    "recetaId": "receta-real-prod-real-catering-single-portion-grilled-3",
    "insumoId": "insu-real-base-chicken-lemon",
    "cantidad": 0.2333
  },
  {
    "id": "ri-real-1504",
    "recetaId": "receta-real-prod-real-catering-double-portion-grilled-4",
    "insumoId": "insu-real-salt-iodized-granular",
    "cantidad": 0.2
  },
  {
    "id": "ri-real-1505",
    "recetaId": "receta-real-prod-real-catering-double-portion-grilled-4",
    "insumoId": "insu-real-chicken-breast-4-10-lb",
    "cantidad": 21.3333
  },
  {
    "id": "ri-real-1506",
    "recetaId": "receta-real-prod-real-catering-double-portion-grilled-4",
    "insumoId": "insu-real-base-chicken-lemon",
    "cantidad": 0.4667
  },
  {
    "id": "ri-real-1507",
    "recetaId": "receta-real-prod-real-catering-single-portion-teriyaki-5",
    "insumoId": "insu-real-chicken-thigh-meat-b-s-4-10-lb",
    "cantidad": 7
  },
  {
    "id": "ri-real-1508",
    "recetaId": "receta-real-prod-real-catering-single-portion-teriyaki-5",
    "insumoId": "insu-real-salt-iodized-granular",
    "cantidad": 0.0219
  },
  {
    "id": "ri-real-1509",
    "recetaId": "receta-real-prod-real-catering-single-portion-teriyaki-5",
    "insumoId": "insu-real-glaze-teriyaki-4-4-76-kg",
    "cantidad": 1.225
  },
  {
    "id": "ri-real-1510",
    "recetaId": "receta-real-prod-real-catering-double-portion-teriyaki-6",
    "insumoId": "insu-real-chicken-thigh-meat-b-s-4-10-lb",
    "cantidad": 14
  },
  {
    "id": "ri-real-1511",
    "recetaId": "receta-real-prod-real-catering-double-portion-teriyaki-6",
    "insumoId": "insu-real-salt-iodized-granular",
    "cantidad": 0.0438
  },
  {
    "id": "ri-real-1512",
    "recetaId": "receta-real-prod-real-catering-double-portion-teriyaki-6",
    "insumoId": "insu-real-glaze-teriyaki-4-4-76-kg",
    "cantidad": 2.45
  },
  {
    "id": "ri-real-1513",
    "recetaId": "receta-real-prod-real-catering-spinach-tortilla-13",
    "insumoId": "insu-real-tortilla-wheat-13-in",
    "cantidad": 1
  },
  {
    "id": "ri-real-1514",
    "recetaId": "receta-real-prod-real-catering-side-garden-salad-16",
    "insumoId": "insu-real-peppers-red-bell",
    "cantidad": 0.5625
  },
  {
    "id": "ri-real-1515",
    "recetaId": "receta-real-prod-real-catering-side-garden-salad-16",
    "insumoId": "insu-real-lettuce-romaine-hearts-24-ct",
    "cantidad": 2.5
  },
  {
    "id": "ri-real-1516",
    "recetaId": "receta-real-prod-real-catering-side-garden-salad-16",
    "insumoId": "insu-real-tomato-25-lb",
    "cantidad": 0.75
  },
  {
    "id": "ri-real-1517",
    "recetaId": "receta-real-prod-real-catering-side-garden-salad-16",
    "insumoId": "insu-real-peppers-green-bell",
    "cantidad": 0.5625
  },
  {
    "id": "ri-real-1518",
    "recetaId": "receta-real-prod-real-catering-side-garden-salad-16",
    "insumoId": "insu-real-spring-mix",
    "cantidad": 1
  },
  {
    "id": "ri-real-1519",
    "recetaId": "receta-real-prod-real-catering-side-garden-salad-16",
    "insumoId": "insu-real-carrot-sticks-5-lb",
    "cantidad": 0.75
  },
  {
    "id": "ri-real-1520",
    "recetaId": "receta-real-prod-real-catering-side-garden-salad-16",
    "insumoId": "insu-real-cucumber-sel",
    "cantidad": 0.75
  },
  {
    "id": "ri-real-1521",
    "recetaId": "receta-real-prod-real-catering-mixed-greens-base-22",
    "insumoId": "insu-real-spring-mix",
    "cantidad": 1.5
  },
  {
    "id": "ri-real-1522",
    "recetaId": "receta-real-prod-real-catering-lg-chopped-chicken-br-28",
    "insumoId": "insu-real-salt-iodized-granular",
    "cantidad": 0.0625
  },
  {
    "id": "ri-real-1523",
    "recetaId": "receta-real-prod-real-catering-lg-chopped-chicken-br-28",
    "insumoId": "insu-real-chicken-breast-4-10-lb",
    "cantidad": 6.6667
  },
  {
    "id": "ri-real-1524",
    "recetaId": "receta-real-prod-real-catering-lg-chopped-chicken-br-28",
    "insumoId": "insu-real-base-chicken-lemon",
    "cantidad": 0.1458
  }
];

export const STOCK_INICIAL_RECETARIO: { insumoId: string; cantidadActual: number }[] = [
  {
    "insumoId": "insu-real-lid-for-1-5-oz-souffle-cup-portion-cup-2500-pcs",
    "cantidadActual": 192
  },
  {
    "insumoId": "insu-real-1-5-oz-clear-plastic-souffle-cup-portion-cup-25",
    "cantidadActual": 192
  },
  {
    "insumoId": "insu-real-small-plate-32-oz-round-container-only-base-300",
    "cantidadActual": 80
  },
  {
    "insumoId": "insu-real-24-32-oz-injected-molded-clear-lid-300pcsc",
    "cantidadActual": 80
  },
  {
    "insumoId": "insu-real-limes-200-ct",
    "cantidadActual": 4.9904
  },
  {
    "insumoId": "insu-real-food-coloring-ylw-pwdr",
    "cantidadActual": 0.1328
  },
  {
    "insumoId": "insu-real-garlic-whl-pld-frsh",
    "cantidadActual": 3.56
  },
  {
    "insumoId": "insu-real-mayo-4-1-gal",
    "cantidadActual": 162.0544
  },
  {
    "insumoId": "insu-real-salt-iodized-granular",
    "cantidadActual": 16.5232
  },
  {
    "insumoId": "insu-real-bread-pita-white-12-10-ct",
    "cantidadActual": 83.36
  },
  {
    "insumoId": "insu-real-napkin-xpress-nat-13-x-8-6",
    "cantidadActual": 216.0752
  },
  {
    "insumoId": "insu-real-cilantro-short-stemmed-30-ct",
    "cantidadActual": 8
  },
  {
    "insumoId": "insu-real-chicken-breast-4-10-lb",
    "cantidadActual": 1220
  },
  {
    "insumoId": "insu-real-curry-pwdr-4-4-lb",
    "cantidadActual": 8.1976
  },
  {
    "insumoId": "insu-real-white-rice-50-lb",
    "cantidadActual": 685.4752
  },
  {
    "insumoId": "insu-real-veg-oil",
    "cantidadActual": 42.1432
  },
  {
    "insumoId": "insu-real-forks",
    "cantidadActual": 85.1616
  },
  {
    "insumoId": "insu-real-mustard-country-style-4-1-gal",
    "cantidadActual": 4.0992
  },
  {
    "insumoId": "insu-real-base-chicken-lemon",
    "cantidadActual": 26.688
  },
  {
    "insumoId": "insu-real-bag-t-shirt-12x6x21",
    "cantidadActual": 72.0248
  },
  {
    "insumoId": "insu-real-onion-ylw-jumbo-frsh-bag",
    "cantidadActual": 82.9576
  },
  {
    "insumoId": "insu-real-sour-cream-pouch-pack",
    "cantidadActual": 139.7432
  },
  {
    "insumoId": "insu-real-base-chicken-caldo-de-pollo",
    "cantidadActual": 21.3424
  },
  {
    "insumoId": "insu-real-tomato-25-lb",
    "cantidadActual": 365.56
  },
  {
    "insumoId": "insu-real-lettuce-shred-1-8",
    "cantidadActual": 387.0272
  },
  {
    "insumoId": "insu-real-black-bean-seasoned",
    "cantidadActual": 4028.8792
  },
  {
    "insumoId": "insu-real-cheese-ched-mild-shred-fancy",
    "cantidadActual": 418.9472
  },
  {
    "insumoId": "insu-real-avocado-ripe-48-ct",
    "cantidadActual": 83.2648
  },
  {
    "insumoId": "insu-real-peppers-jalapeno",
    "cantidadActual": 20.9608
  },
  {
    "insumoId": "insu-real-onion-red-jumbo",
    "cantidadActual": 48.4008
  },
  {
    "insumoId": "insu-real-chicken-thigh-meat-b-s-4-10-lb",
    "cantidadActual": 756.1904
  },
  {
    "insumoId": "insu-real-sesame-seed-whi",
    "cantidadActual": 84
  },
  {
    "insumoId": "insu-real-glaze-teriyaki-4-4-76-kg",
    "cantidadActual": 131.8336
  },
  {
    "insumoId": "insu-real-onion-green-w-t",
    "cantidadActual": 35.6928
  },
  {
    "insumoId": "insu-real-large-plate-35oz-round-black-container-only-base",
    "cantidadActual": 80
  },
  {
    "insumoId": "insu-real-clear-lid-lg-bowl",
    "cantidadActual": 80
  },
  {
    "insumoId": "insu-real-10-80-oz-high-pro-bowl-polypro-25-cs-black",
    "cantidadActual": 80
  },
  {
    "insumoId": "insu-real-glaze-teriyaki-6-5-lb",
    "cantidadActual": 53.336
  },
  {
    "insumoId": "insu-real-bread-pita-wheat-12-10-ct",
    "cantidadActual": 40
  },
  {
    "insumoId": "insu-real-wrap-cushion-foil-14x16-slvr",
    "cantidadActual": 0.16
  },
  {
    "insumoId": "insu-real-tortilla-flour-13-in",
    "cantidadActual": 80
  },
  {
    "insumoId": "insu-real-dressing-caesar-royal",
    "cantidadActual": 120
  },
  {
    "insumoId": "insu-real-cheese-parmesan-romano-style",
    "cantidadActual": 60
  },
  {
    "insumoId": "insu-real-clear-salad-bowl-32oz-1000-ml-case-pack-300pcs",
    "cantidadActual": 80
  },
  {
    "insumoId": "insu-real-peppers-red-bell",
    "cantidadActual": 196.3664
  },
  {
    "insumoId": "insu-real-lettuce-romaine-hearts-24-ct",
    "cantidadActual": 860
  },
  {
    "insumoId": "insu-real-spring-mix",
    "cantidadActual": 368.8888
  },
  {
    "insumoId": "insu-real-carrot-sticks-5-lb",
    "cantidadActual": 322.8568
  },
  {
    "insumoId": "insu-real-cucumber-sel",
    "cantidadActual": 328.5712
  },
  {
    "insumoId": "insu-real-crouton-hs-lg-seasnd",
    "cantidadActual": 133.3336
  },
  {
    "insumoId": "insu-real-peppers-green-bell",
    "cantidadActual": 321
  },
  {
    "insumoId": "insu-real-8-oz-translucent-pp-round-deli-container-with-lid",
    "cantidadActual": 93.3336
  },
  {
    "insumoId": "insu-real-e16-oz-translucent-pp-round-deli-container-with-lid",
    "cantidadActual": 80
  },
  {
    "insumoId": "insu-real-plantain-sweet-sliced",
    "cantidadActual": 604.4448
  },
  {
    "insumoId": "insu-real-corn-ylw-super-sweet-cut",
    "cantidadActual": 402.1336
  },
  {
    "insumoId": "insu-real-vinegar-red-wine",
    "cantidadActual": 61.4224
  },
  {
    "insumoId": "insu-real-dressing-coleslaw-base",
    "cantidadActual": 80
  },
  {
    "insumoId": "insu-real-cabbage-shred-sep-color",
    "cantidadActual": 800
  },
  {
    "insumoId": "insu-real-pepper-black-table-grind-jar",
    "cantidadActual": 2
  },
  {
    "insumoId": "insu-real-broccoli-crown-20-lb",
    "cantidadActual": 960
  },
  {
    "insumoId": "insu-real-oil-olive-extra-virgin",
    "cantidadActual": 18.7016
  },
  {
    "insumoId": "insu-real-vinegar-balsamic",
    "cantidadActual": 60.2432
  },
  {
    "insumoId": "insu-real-potato-mashed-redskin",
    "cantidadActual": 960
  },
  {
    "insumoId": "insu-real-brown-rice-25-lb",
    "cantidadActual": 289.8088
  },
  {
    "insumoId": "insu-real-potato-sweet-60-65-ct",
    "cantidadActual": 80
  },
  {
    "insumoId": "insu-real-flan-de-caramello",
    "cantidadActual": 80
  },
  {
    "insumoId": "insu-real-brownie-fudge-choc-chip",
    "cantidadActual": 320
  },
  {
    "insumoId": "insu-real-water-spring",
    "cantidadActual": 80
  },
  {
    "insumoId": "insu-real-soda-cola-diet-can",
    "cantidadActual": 80
  },
  {
    "insumoId": "insu-real-soda-cola-can",
    "cantidadActual": 80
  },
  {
    "insumoId": "insu-real-drink-fruit-punch-single-serve",
    "cantidadActual": 80
  },
  {
    "insumoId": "insu-real-garlic-pwdr-fine-grnd-1-4-lb",
    "cantidadActual": 4.8
  },
  {
    "insumoId": "insu-real-oil-olive-100-extra-virgin",
    "cantidadActual": 120
  },
  {
    "insumoId": "insu-real-sauce-hot",
    "cantidadActual": 21.536
  },
  {
    "insumoId": "insu-real-sauce-ancho-chipotle-sandwich",
    "cantidadActual": 120
  },
  {
    "insumoId": "insu-real-sauce-bbq-sweet-bold",
    "cantidadActual": 96
  },
  {
    "insumoId": "insu-real-cilantro-fresh-1-lb",
    "cantidadActual": 19.2
  },
  {
    "insumoId": "insu-real-sauce-chili-sweet-red-hot",
    "cantidadActual": 120
  },
  {
    "insumoId": "insu-real-sauce-hot-packet",
    "cantidadActual": 80
  },
  {
    "insumoId": "insu-real-broccoli-floret-mini",
    "cantidadActual": 160
  },
  {
    "insumoId": "insu-real-peppers-banana-rings-mild",
    "cantidadActual": 120
  },
  {
    "insumoId": "insu-real-olive-slcd-ripe-imp",
    "cantidadActual": 80
  },
  {
    "insumoId": "insu-real-tortilla-wheat-13-in",
    "cantidadActual": 80
  },
  {
    "insumoId": "insu-real-dspnsr-napkin-1000-cpcty-stand",
    "cantidadActual": 80
  }
];
