/**
 * Utilidades de dinero (C-DINERO) — DUENO: backend-ventas-pos.
 *
 * TODOS los montos se manejan como Prisma.Decimal (mapeado a DECIMAL(12,2) en
 * Postgres). Nunca se opera con `number` de punto flotante para dinero: se
 * redondea al centavo EXACTO usando Decimal con ROUND_HALF_UP, coherente con
 * RN-08/S-06 (redondeo al centavo por transaccion).
 */
import { Decimal } from "@prisma/client/runtime/library";

export type DineroInput = Decimal | number | string;

export function decimal(valor: DineroInput): Decimal {
  return new Decimal(valor);
}

export const CERO = new Decimal(0);

/** Redondea a 2 decimales (centavo) con HALF_UP, el estandar comercial USD. */
export function redondearCentavo(valor: Decimal): Decimal {
  return valor.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}

/** Acota un Decimal al rango [min, max]. */
export function acotar(valor: Decimal, min: Decimal, max: Decimal): Decimal {
  if (valor.lessThan(min)) return min;
  if (valor.greaterThan(max)) return max;
  return valor;
}

export function sumar(...valores: DineroInput[]): Decimal {
  return valores.reduce<Decimal>((acc, v) => acc.plus(decimal(v)), new Decimal(0));
}
