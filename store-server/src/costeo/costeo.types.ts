/**
 * CosteoService — tipos + funcion PURA de costeo (F2-T1, "Costeo por
 * combinacion / BOM por variante", DUENO: menu-inventario-pos,
 * arquitectura.md §9.3).
 *
 * `calcularCostoLinea` NO toca Prisma/DB: recibe todo ya resuelto (receta
 * base del producto, deltas de cada modificador aplicado, y si la linea es
 * un combo, la receta de cada producto efectivamente elegido por slot) y
 * devuelve un desglose de costo POR INSUMO + total, auditable. Es
 * deliberadamente independiente de VentasModule: NUNCA calcula ni toca
 * precioUnitario/subtotalLinea (lo que paga el cliente, C-SNAPSHOT) — solo
 * resuelve cuanto cuesta en insumos lo que se vendio, para reportar margen
 * real internamente.
 */
import { Decimal } from "@prisma/client/runtime/library";
import type { TipoModificador } from "@prisma/client";

/** Una linea de receta ya resuelta: insumo + cantidad (por UNIDAD de producto). */
export interface InsumoCantidad {
  insumoId: string;
  cantidad: Decimal;
}

/** Un LineaModificador ya resuelto con los deltas de insumo de su RecetaModificador. */
export interface ModificadorResuelto {
  modificadorId: string;
  descripcion?: string;
  tipo: TipoModificador;
  /** Deltas de insumo (positivos = agrega, negativos = quita/sustituye). Vacio si el modificador no tiene RecetaModificador definida (no afecta costo). */
  deltas: InsumoCantidad[];
}

/** Receta resuelta de UN producto componente de combo efectivamente elegido en un slot. */
export interface ComboComponenteSeleccionado {
  productoId: string;
  insumos: InsumoCantidad[];
}

export interface CalcularCostoLineaInput {
  /** Solo informativo/trazabilidad en el resultado. */
  productoId: string;
  /** LineaDePedido.cantidad (unidades vendidas de esta linea). */
  cantidad: number;
  /** Receta base del producto de la linea (vacio si no tiene receta activa definida). */
  recetaBase: InsumoCantidad[];
  /** LineaModificador[] de la linea, resueltos con su RecetaModificador. */
  modificadores: ModificadorResuelto[];
  /** Solo si la linea es un Combo: receta de cada producto elegido por slot. */
  comboSeleccion?: ComboComponenteSeleccionado[];
  /** Costo unitario VIGENTE por insumo (Insumo.costoUnitario). Insumos ausentes en el mapa cuestan 0 (no rompe el calculo, solo no aporta costo). */
  costosUnitarios: Map<string, Decimal>;
}

export interface DesgloseInsumoCosteo {
  insumoId: string;
  /** Cantidad neta de insumo por UNIDAD de producto (tras sumar receta base + deltas de modificadores + combo), nunca negativa (clamp a 0: no existe "uso negativo" de insumo). */
  cantidadPorUnidad: string;
  /** cantidadPorUnidad * LineaDePedido.cantidad. */
  cantidadTotal: string;
  costoUnitario: string;
  /** cantidadTotal * costoUnitario. */
  costoTotal: string;
}

export interface CosteoLinea {
  productoId: string;
  cantidad: number;
  /** Desglose auditable por insumo (no un numero unico opaco). */
  desglose: DesgloseInsumoCosteo[];
  costoTotalLinea: string;
  /** costoTotalLinea / cantidad (costo de ingredientes por unidad vendida). */
  costoUnitarioLinea: string;
}

/**
 * Funcion pura de costeo. Resuelve el costo real de UNA linea vendida,
 * combinando:
 *  1. La receta base del producto (RecetaInsumo).
 *  2. El delta de insumo de CADA modificador aplicado (RecetaModificador;
 *     "agregar" tipicamente suma, "sin"/"sustituir" tipicamente resta — el
 *     signo vive en `cantidadDelta`, esta funcion solo suma).
 *  3. Si es un Combo, la receta de CADA producto efectivamente elegido en sus
 *     slots (arquitectura.md: "aunque el precio sea fijo, el costo real
 *     varia por exactamente que combinacion se vendio").
 *
 * Deliberadamente NO requiere `Producto.precioBase`/`Modificador.precioDelta`:
 * el costeo no sabe ni le importa cuanto se cobro (eso es 100% de VentasModule).
 */
export function calcularCostoLinea(input: CalcularCostoLineaInput): CosteoLinea {
  const porUnidadDeProducto = new Map<string, Decimal>();

  const acumular = (insumoId: string, cantidad: Decimal): void => {
    const actual = porUnidadDeProducto.get(insumoId) ?? new Decimal(0);
    porUnidadDeProducto.set(insumoId, actual.plus(cantidad));
  };

  for (const ri of input.recetaBase) {
    acumular(ri.insumoId, ri.cantidad);
  }
  for (const modificador of input.modificadores) {
    for (const delta of modificador.deltas) {
      acumular(delta.insumoId, delta.cantidad);
    }
  }
  for (const componente of input.comboSeleccion ?? []) {
    for (const ri of componente.insumos) {
      acumular(ri.insumoId, ri.cantidad);
    }
  }

  const cantidadLinea = new Decimal(input.cantidad);
  const desglose: DesgloseInsumoCosteo[] = [];
  let costoTotalLinea = new Decimal(0);

  for (const [insumoId, cantidadNetaPorUnidad] of porUnidadDeProducto.entries()) {
    // Clamp a 0: un modificador ("sin X"/sustitucion) puede restar mas de lo
    // que la receta base tenia (dato de catalogo mal cargado); nunca reporta
    // un "uso negativo" de insumo, simplemente no aporta costo.
    const cantidadPorUnidad = cantidadNetaPorUnidad.lessThan(0) ? new Decimal(0) : cantidadNetaPorUnidad;
    if (cantidadPorUnidad.isZero()) continue; // insumo neteado a 0 (ej. agregado y luego quitado): no aparece en el desglose

    const cantidadTotal = cantidadPorUnidad.mul(cantidadLinea);
    const costoUnitario = input.costosUnitarios.get(insumoId) ?? new Decimal(0);
    const costoTotalInsumo = cantidadTotal.mul(costoUnitario);
    costoTotalLinea = costoTotalLinea.plus(costoTotalInsumo);

    desglose.push({
      insumoId,
      cantidadPorUnidad: cantidadPorUnidad.toString(),
      cantidadTotal: cantidadTotal.toString(),
      costoUnitario: costoUnitario.toString(),
      costoTotal: costoTotalInsumo.toString(),
    });
  }

  return {
    productoId: input.productoId,
    cantidad: input.cantidad,
    desglose,
    costoTotalLinea: costoTotalLinea.toString(),
    costoUnitarioLinea: cantidadLinea.isZero() ? "0" : costoTotalLinea.div(cantidadLinea).toString(),
  };
}

/**
 * S-14 (BOM multinivel — productos elaborados/intermedios, ver
 * docs/analisis-reunion-diego-arches-20260717.md §3.1 y docs/requisitos.md
 * S-14). Funcion PURA (sin Prisma/DB, ver test/unit/costeo-elaborado.spec.ts)
 * que resuelve el costo unitario REAL de un Insumo, recursivamente, cuando
 * ese insumo es "elaborado" (se produce en tienda a partir de otros insumos
 * base, ej. Salsa BBQ) en vez de comprarse ya listo.
 *
 * Precedencia documentada (S-14, punto 3 del enunciado): si `insumoId` tiene
 * una entrada en `recetasElaboradas` (su Receta/RecetaInsumo VIGENTE, ya
 * resuelta contra la DB por CosteoService), el costo se calcula SUMANDO
 * cantidad*costo de CADA insumo base (recursivamente, por si ESE insumo base
 * es a su vez otro elaborado) — la receta manda. `costosBaseConocidos` (el
 * `Insumo.costoUnitario` cacheado/manual de CUALQUIER insumo) es SOLO el
 * fallback: se usa cuando `insumoId` no aparece en `recetasElaboradas` (no es
 * elaborado, o es elaborado pero todavia no tiene receta definida) o cuando
 * `visitados` ya contiene a `insumoId` (ciclo detectado en tiempo de lectura
 * — defensa en profundidad; el camino de ESCRITURA ya deberia haber
 * rechazado ese ciclo con `detectarCicloReceta`, ver
 * src/catalogo/receta-ciclo.ts, mismo principio de "nodo ya en la pila de
 * recursion actual"). Un insumo ausente de AMBOS mapas cuesta 0 (igual
 * criterio que `calcularCostoLinea`: nunca rompe el calculo, solo no aporta
 * costo).
 */
export function resolverCostoUnitarioInsumo(
  insumoId: string,
  costosBaseConocidos: Map<string, Decimal>,
  recetasElaboradas: Map<string, InsumoCantidad[]>,
  visitados: Set<string> = new Set(),
): Decimal {
  const receta = recetasElaboradas.get(insumoId);
  if (!receta || receta.length === 0 || visitados.has(insumoId)) {
    return costosBaseConocidos.get(insumoId) ?? new Decimal(0);
  }

  const siguientesVisitados = new Set(visitados);
  siguientesVisitados.add(insumoId);

  let costoPorUnidad = new Decimal(0);
  for (const item of receta) {
    const costoBase = resolverCostoUnitarioInsumo(item.insumoId, costosBaseConocidos, recetasElaboradas, siguientesVisitados);
    costoPorUnidad = costoPorUnidad.plus(item.cantidad.mul(costoBase));
  }
  return costoPorUnidad;
}
