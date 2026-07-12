/**
 * PSP MOCK — DUENO: pagos-pos.
 *
 * ==========================================================================
 *  ESTE ARCHIVO ES UN MOCK DE DEMO. NO ES UN PSP REAL.
 *  REEMPLAZAR ANTES DE PRODUCCION por la integracion semi-integrada/P2PE con el
 *  PSP real seleccionado (ver ADR-0005). Aqui solo simulamos, en memoria y de
 *  forma sincrona, las respuestas que un terminal EMV/PSP le devolveria al POS
 *  (aprobada / rechazada / encolada offline).
 * ==========================================================================
 *
 * C-PCI: este modulo (y todo el sistema) NUNCA recibe, procesa ni almacena
 * PAN (numero de tarjeta completo) ni CVV. El "terminal" fisico (o, en este
 * mock, esta funcion) es quien tendria el alcance PCI real; aqui solo se
 * generan/retornan token (pspTokenId), referencia de transaccion
 * (pspReferencia), marca y ultimos 4 digitos — el resto del POS (pedidos,
 * reportes, base de datos) opera exclusivamente con esos datos no sensibles.
 *
 * Modo OFFLINE (store-and-forward, riesgo S-05): si `offline=true` simulamos
 * que el terminal no pudo comunicarse con el PSP en el momento del cobro. La
 * transaccion queda "encolada" (estado `encolado` en el dominio) para
 * reenvio/confirmacion cuando vuelva la conectividad. En esta demo NO existe
 * un job de reenvio real; el encolado solo se refleja en el estado del Pago.
 */

import { uid } from "../db/store";

export interface ResultadoPsp {
  aprobado: boolean;
  encolado: boolean; // true si quedo en store-and-forward offline
  pspTokenId: string | null;
  pspReferencia: string | null;
  ultimos4: string | null;
  marca: string | null;
  mensaje: string;
}

export interface AutorizarInput {
  montoTotal: number; // centavos (monto + propina)
  offline?: boolean;
  forzarRechazo?: boolean; // util para demostrar rechazo
}

const MARCAS_DEMO = ["VISA", "MC"] as const;

/** Genera 4 digitos pseudo-aleatorios para `ultimos4` (NUNCA el PAN real). */
function ultimos4Aleatorios(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

function marcaAleatoria(): string {
  return MARCAS_DEMO[Math.floor(Math.random() * MARCAS_DEMO.length)];
}

/**
 * Simula la autorizacion de una tarjeta ante el PSP.
 *
 * MOCK: no hay red, no hay terminal fisico, no hay PSP real. Resultado
 * determinado por las banderas de entrada (pensadas para poder demostrar los
 * tres caminos desde la UI/pruebas de la demo):
 *  - forzarRechazo=true  -> transaccion rechazada.
 *  - offline=true        -> transaccion encolada (store-and-forward).
 *  - caso normal         -> transaccion aprobada con token/referencia mock.
 */
export function autorizarTarjeta(input: AutorizarInput): ResultadoPsp {
  const { forzarRechazo, offline } = input;

  if (forzarRechazo) {
    return {
      aprobado: false,
      encolado: false,
      pspTokenId: null,
      pspReferencia: null,
      ultimos4: null,
      marca: null,
      mensaje: "Rechazada (demo)",
    };
  }

  if (offline) {
    // Store-and-forward: el "terminal" genera un token/referencia local que
    // se reenviara al PSP cuando vuelva la conectividad (fuera de alcance de
    // esta demo). El Pago queda con estado "encolado", NUNCA "aprobado".
    return {
      aprobado: false,
      encolado: true,
      pspTokenId: uid(),
      pspReferencia: uid(),
      ultimos4: "4242",
      marca: "VISA",
      mensaje: "Encolada offline (store-and-forward demo)",
    };
  }

  return {
    aprobado: true,
    encolado: false,
    pspTokenId: uid(),
    pspReferencia: uid(),
    ultimos4: ultimos4Aleatorios(),
    marca: marcaAleatoria(),
    mensaje: "Aprobada (demo)",
  };
}

/**
 * Simula un reembolso (refund) ante el PSP, referenciando la transaccion
 * original por `pspReferencia` (nunca por PAN). Devuelve una NUEVA referencia
 * de PSP para el movimiento de reembolso, tal como lo haria un PSP real.
 */
export function reembolsarTarjeta(
  pspReferencia: string,
  monto: number
): ResultadoPsp {
  return {
    aprobado: true,
    encolado: false,
    pspTokenId: uid(),
    pspReferencia: uid(),
    ultimos4: null,
    marca: null,
    mensaje: `Reembolso aprobado (demo) por ${monto} centavos, referencia original ${pspReferencia}`,
  };
}
