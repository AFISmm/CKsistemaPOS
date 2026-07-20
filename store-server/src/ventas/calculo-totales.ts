/**
 * Motor de calculo de totales — DUENO EXCLUSIVO: backend-ventas-pos (§9.2).
 *
 * Funcion PURA (sin I/O, sin Prisma, sin Nest): facil de testear en
 * aislamiento (ver test/unit/calculo-totales.spec.ts). Nadie mas recalcula
 * subtotal/descuento/impuesto/propina/total (pagos-pos y el frontend solo
 * leen lo que esta funcion produce).
 *
 * Formulas (idénticas a la logica ya validada en la demo, lib/sales/engine.ts,
 * migradas de centavos-enteros a Decimal por C-DINERO):
 *  - subtotal          = suma(subtotalLinea)
 *  - subtotalGravable  = suma(subtotalLinea de lineas con gravable=true)
 *  - descuentoTotal    = snapshot fijado al aplicar el descuento, acotado a [0, subtotal]
 *  - baseGravable      = subtotalGravable - (descuentoTotal * subtotalGravable/subtotal)
 *                        (el descuento se prorratea entre lineas gravables y exentas
 *                        segun su peso en el subtotal)
 *  - impuestoTotal     = round_half_up(baseGravable * tasa) — la PROPINA NUNCA
 *                        genera impuesto (RN-02)
 *  - total             = subtotal - descuentoTotal + impuestoTotal + propinaTotal
 *
 * Impuesto: se aplica sobre el subtotal gravable TRAS descuentos (RN-01, RN-03,
 * S-06). Redondeo al centavo POR TRANSACCION (RN-08), no linea por linea.
 */
import { Decimal } from "@prisma/client/runtime/library";
import { acotar, redondearCentavo, sumar } from "../common/util/dinero";

export interface LineaParaCalculo {
  subtotalLinea: Decimal | number | string;
  gravable: boolean;
}

export interface CalcularTotalesInput {
  lineas: LineaParaCalculo[];
  /** Descuento ya fijado (monto en dolares); se acota internamente a [0, subtotal]. */
  descuentoTotal: Decimal | number | string;
  /**
   * Tasa combinada de las `ReglaDeImpuesto` vigentes con `aplicaAExentos=false`
   * (el caso normal): se aplica solo sobre `baseGravable`. Ej 0.0825 = 8.25%.
   */
  tasaImpuesto: Decimal | number | string;
  /**
   * FIX (revision adversarial post-Fase 3): tasa combinada de las
   * `ReglaDeImpuesto` vigentes con `aplicaAExentos=true` — reglas locales que
   * SI gravan lineas marcadas `gravable=false` (el campo existia en el
   * modelo/sync desde Fase 1 pero ningun calculo lo consultaba). Se aplica
   * sobre la base EXENTA (tras descuento prorrateado), nunca sobre la
   * gravable (que ya paga `tasaImpuesto`). Default 0 si no hay ninguna regla
   * asi configurada (comportamiento identico al de antes de este fix).
   */
  tasaSobreExentos?: Decimal | number | string;
  /** Propina ya cobrada (suma de Pagos aprobados); NO genera impuesto (RN-02). */
  propinaTotal: Decimal | number | string;
}

export interface TotalesPedido {
  subtotal: Decimal;
  subtotalGravable: Decimal;
  descuentoTotal: Decimal;
  baseGravable: Decimal;
  impuestoTotal: Decimal;
  propinaTotal: Decimal;
  total: Decimal;
}

export function calcularTotales(input: CalcularTotalesInput): TotalesPedido {
  const lineas = input.lineas.map((l) => ({
    subtotalLinea: new Decimal(l.subtotalLinea),
    gravable: l.gravable,
  }));

  const subtotal = redondearCentavo(sumar(...lineas.map((l) => l.subtotalLinea)));
  const subtotalGravable = redondearCentavo(
    sumar(...lineas.filter((l) => l.gravable).map((l) => l.subtotalLinea)),
  );

  const descuentoTotal = acotar(new Decimal(input.descuentoTotal), new Decimal(0), subtotal);

  const proporcionGravable = subtotal.isZero() ? new Decimal(0) : subtotalGravable.div(subtotal);
  const descuentoSobreGravable = redondearCentavo(descuentoTotal.mul(proporcionGravable));
  const baseGravable = Decimal.max(subtotalGravable.minus(descuentoSobreGravable), new Decimal(0));

  // Base exenta = el resto del subtotal (lineas gravable=false), tras su parte
  // proporcional del descuento — mismo prorrateo que baseGravable, nunca se
  // vuelve a descontar lo mismo dos veces (las dos proporciones suman 1).
  const subtotalExento = subtotal.minus(subtotalGravable);
  const descuentoSobreExento = redondearCentavo(descuentoTotal.minus(descuentoSobreGravable));
  const baseExenta = Decimal.max(subtotalExento.minus(descuentoSobreExento), new Decimal(0));

  const tasa = new Decimal(input.tasaImpuesto);
  const tasaSobreExentos = new Decimal(input.tasaSobreExentos ?? 0);
  const impuestoTotal = redondearCentavo(baseGravable.mul(tasa).plus(baseExenta.mul(tasaSobreExentos)));

  const propinaTotal = redondearCentavo(new Decimal(input.propinaTotal));

  const total = subtotal.minus(descuentoTotal).plus(impuestoTotal).plus(propinaTotal);

  return { subtotal, subtotalGravable, descuentoTotal, baseGravable, impuestoTotal, propinaTotal, total };
}
