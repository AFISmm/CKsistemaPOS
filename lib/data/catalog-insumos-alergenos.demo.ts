/**
 * ETIQUETADO DEMO de alergenos por insumo — DUENO: menu-inventario-pos (Fase B, 2026-07-22).
 *
 * CONTEXTO (ver docs/requisitos.md S-16): la matriz de requerimientos de
 * Alsea marca el catalogo de alergenos como "super importante" (alta
 * prioridad de seguridad alimentaria), pero NO existen todavia datos reales
 * de alergenos por insumo/producto de Chicken Kitchen en este proyecto. S-16
 * originalmente decia "no se modela con datos inventados" — esta Fase B
 * cambia esa postura siguiendo la convencion ya establecida del proyecto para
 * este tipo de brecha (ver los demas `[SUPUESTO]` de docs/requisitos.md):
 * documentar la asuncion EXPLICITAMENTE y avanzar con datos DEMO claramente
 * marcados, en vez de bloquear la funcionalidad por completo.
 *
 * ESTA ES UNA HEURISTICA DE PALABRAS CLAVE sobre el NOMBRE del insumo, NO
 * datos verificados de un nutriologo ni de Chicken Kitchen. Antes de un
 * lanzamiento real, operaciones DEBE confirmar/corregir esta lista insumo
 * por insumo (un alergeno mal etiquetado es un riesgo de salud del cliente,
 * no solo un defecto de software — ver S-16).
 *
 * Alcance de la heuristica: solo cubre los `TipoAlergeno` ya definidos en
 * lib/domain/types.ts (lacteos/gluten/huevo/soya/frutosSecos/mariscos). El
 * recetario real de Chicken Kitchen no trae, por nombre, ningun insumo que
 * dispare frutosSecos o mariscos (no hay mariscos ni frutos secos en el
 * catalogo de 84 insumos reales importado) — se documenta como resultado
 * esperado, no como bug de la heuristica (ver conteo en el reporte de la tarea).
 */

import type { TipoAlergeno } from "../domain/types";

interface ReglaAlergeno {
  /** Coincide si el nombre (en MAYUSCULAS) contiene ALGUNA de estas subcadenas. */
  contieneAlguna: string[];
  alergeno: TipoAlergeno;
}

// ---------------------------------------------------------------------------
// Reglas de palabras clave (no exhaustivas — ver caveats arriba). Un insumo
// puede recibir mas de un alergeno si matchea varias reglas.
// ---------------------------------------------------------------------------
const REGLAS: ReglaAlergeno[] = [
  // Lacteos
  { contieneAlguna: ["CHEESE", "SOUR CREAM", "DRESSING CAESAR", "DRESSING COLESLAW", "FLAN", "BROWNIE"], alergeno: "lacteos" },
  // Gluten (trigo): panes, tortillas, croutones, postres horneados
  { contieneAlguna: ["BREAD", "PITA", "TORTILLA", "CROUTON", "BROWNIE"], alergeno: "gluten" },
  // Huevo: mayonesa y derivados, aderezo caesar clasico, postres tipo flan/brownie
  { contieneAlguna: ["MAYO", "DRESSING CAESAR", "FLAN", "BROWNIE"], alergeno: "huevo" },
  // Soya: salsas tipo teriyaki (soy sauce es la base tipica de un glaseado teriyaki)
  { contieneAlguna: ["TERIYAKI"], alergeno: "soya" },
  // Frutos secos y mariscos: sin insumos reales que matcheen por nombre en el
  // recetario importado (ver docstring) — reglas declaradas para que el tipo
  // TipoAlergeno quede completo/documentado, aunque hoy no disparen matches.
  { contieneAlguna: ["PEANUT", "ALMOND", "CASHEW", "WALNUT", "PECAN", "HAZELNUT", "PISTACHIO"], alergeno: "frutosSecos" },
  { contieneAlguna: ["SHRIMP", "CAMARON", "FISH", "PESCADO", "CRAB", "CANGREJO", "LOBSTER", "LANGOSTA"], alergeno: "mariscos" },
];

/**
 * Detecta alergenos DEMO a partir del nombre del insumo. Puede devolver un
 * arreglo vacio (sin alergeno detectado por la heuristica — NO equivale a
 * "verificado libre de alergenos", ver caveats de este archivo).
 */
export function detectarAlergenosDemo(nombre: string): TipoAlergeno[] {
  const nombreUpper = nombre.toUpperCase();
  const encontrados = new Set<TipoAlergeno>();
  for (const regla of REGLAS) {
    if (regla.contieneAlguna.some((sub) => nombreUpper.includes(sub))) {
      encontrados.add(regla.alergeno);
    }
  }
  return Array.from(encontrados);
}
