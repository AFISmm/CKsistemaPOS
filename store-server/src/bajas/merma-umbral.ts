/**
 * Calculo PURO del umbral de merma (F3-T1, S-13, sin Prisma/DB) — mismo
 * patron que src/costeo/costeo.types.ts: una funcion sin efectos que el
 * envoltorio con Prisma (bajas.service.ts) alimenta con datos ya resueltos.
 *
 * S-13 (docs/requisitos.md): "Umbral de merma permitido antes de alerta
 * automatica de auditoria: 3% del valor de insumo recibido por periodo de
 * conteo, configurable por Ubicacion". Esta funcion decide, dado cuanto ya se
 * habia aprobado de merma en el periodo ANTES de esta aprobacion y cuanto se
 * acaba de aprobar AHORA, si el acumulado supera el umbral configurado — y
 * ademas distingue si YA estaba por encima antes de esta aprobacion o si esta
 * aprobacion es la que lo hizo cruzar (ver BajasService.evaluarUmbralYAuditar
 * para como se usa esa distincion).
 */
import { Decimal } from "@prisma/client/runtime/library";

export interface EvaluarUmbralMermaInput {
  /** Valor en dolares de la merma YA aprobada en el periodo, ANTES de esta aprobacion. */
  valorMermaPrevia: Decimal;
  /** Valor en dolares de la merma que se ACABA de aprobar (cantidad * costoUnitario). */
  valorMermaNueva: Decimal;
  /**
   * Denominador del porcentaje (S-13: "valor de insumo recibido por periodo
   * de conteo"). Ver bajas.service.ts para como se resuelve en la practica
   * (este modulo no le importa de donde salio el numero).
   */
  valorBaseRecibido: Decimal;
  /** Umbral configurado, en PUNTOS PORCENTUALES (3 = 3%), Ubicacion.umbralMermaPorcentaje. */
  umbralPorcentaje: Decimal;
}

export interface ResultadoEvaluacionUmbralMerma {
  /** previa + nueva, como string (C-DINERO: nunca number/float). */
  valorMermaAcumulada: string;
  /** (valorMermaAcumulada / valorBaseRecibido) * 100, como string. "0" si no hay base valida (ver abajo). */
  porcentajeMermaAcumulada: string;
  /** true si YA se superaba el umbral antes de contar esta aprobacion. */
  yaEstabaSobreUmbralAntes: boolean;
  /** true si, contando esta aprobacion, el acumulado supera el umbral. */
  superaUmbralAhora: boolean;
  /** true SOLO si esta aprobacion es la que hizo cruzar el umbral (no estaba antes, si despues). */
  cruzoUmbralEnEstaAprobacion: boolean;
}

/**
 * Sin base valida (0 o negativa) no hay porcentaje que calcular — se reporta
 * "sin alerta" en vez de dividir por 0/producir NaN o Infinity. Esto puede
 * pasar legitimamente si un insumo nunca tuvo un movimiento de recepcion ni
 * stock valorizable todavia (ver bajas.service.ts, seccion "que se usa como
 * base" en README.md §17).
 */
export function evaluarUmbralMerma(input: EvaluarUmbralMermaInput): ResultadoEvaluacionUmbralMerma {
  const acumulada = input.valorMermaPrevia.plus(input.valorMermaNueva);

  if (input.valorBaseRecibido.isZero() || input.valorBaseRecibido.isNegative()) {
    return {
      valorMermaAcumulada: acumulada.toString(),
      porcentajeMermaAcumulada: "0",
      yaEstabaSobreUmbralAntes: false,
      superaUmbralAhora: false,
      cruzoUmbralEnEstaAprobacion: false,
    };
  }

  const pctPrevio = input.valorMermaPrevia.div(input.valorBaseRecibido).mul(100);
  const pctAhora = acumulada.div(input.valorBaseRecibido).mul(100);

  const yaEstabaSobreUmbralAntes = pctPrevio.greaterThan(input.umbralPorcentaje);
  const superaUmbralAhora = pctAhora.greaterThan(input.umbralPorcentaje);

  return {
    valorMermaAcumulada: acumulada.toString(),
    porcentajeMermaAcumulada: pctAhora.toString(),
    yaEstabaSobreUmbralAntes,
    superaUmbralAhora,
    cruzoUmbralEnEstaAprobacion: !yaEstabaSobreUmbralAntes && superaUmbralAhora,
  };
}
