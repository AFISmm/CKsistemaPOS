/**
 * PspAdapter — contrato de integracion con el PSP (ADR-0005, C-PCI).
 *
 * El POS NUNCA recibe/transmite PAN/CVV: el terminal EMV (o, en Fase 2, el
 * SDK semi-integrado del PSP real) es quien captura la tarjeta y devuelve
 * SOLO {aprobado, pspTokenId, pspReferencia, ultimos4, marca}. Esta interfaz
 * es el punto de reemplazo para Fase 2 (F2-T4/F2-T5): PagosModule/VentasModule
 * dependen de este contrato, nunca de una implementacion concreta, asi que
 * cambiar MockPspAdapter por el SDK real del PSP no toca logica de negocio.
 */
export interface AutorizarPagoInput {
  /** Monto total a autorizar en dolares (monto + propina), Decimal-compatible. */
  montoTotal: string | number;
  /** Simula que el terminal no tiene conectividad (store-and-forward, S-05). */
  offline?: boolean;
  /** Solo para pruebas/demo: fuerza un rechazo del banco/PSP. */
  forzarRechazo?: boolean;
}

export interface ResultadoAutorizacionPsp {
  aprobado: boolean;
  /** true = quedo en cola store-and-forward (S-05); ni aprobado ni rechazado aun. */
  encolado: boolean;
  pspTokenId: string | null;
  pspReferencia: string | null;
  ultimos4: string | null;
  marca: string | null;
  mensaje: string;
}

export interface ResultadoReembolsoPsp {
  aprobado: boolean;
  pspReferencia: string | null;
  mensaje: string;
}

export interface ResultadoCancelacionPsp {
  /** true = el terminal confirmo que no hay cargo pendiente (o nunca lo hubo). */
  cancelado: boolean;
  mensaje: string;
}

export const PSP_ADAPTER = Symbol("PSP_ADAPTER");

/**
 * PspAdapter — ver comentario de archivo arriba para el contrato base
 * (`autorizar`/`reembolsar`, ya usado por PagosModule desde Fase 1).
 *
 * `cancelarTransaccionPendiente` (F2-T4, ADITIVO): los SDK semi-integrados
 * EMV/P2PE reales (ej. Datacap NETePay, recomendado en ADR-0006 F0-T3) son
 * tipicamente asincronos/basados en callback contra el terminal fisico y
 * tienen su propio timeout de espera de tarjeta/PIN — a diferencia del
 * `MockPspAdapter` en memoria (Fase 1), que responde sincronicamente y nunca
 * queda "a medias". Un flujo real necesita poder decirle al terminal "aborta
 * la transaccion en curso" cuando el cajero cancela o el terminal se
 * demora mas de lo esperado (evita una tarjeta autorizada por el banco pero
 * nunca registrada en el POS). Se agrega como metodo OPCIONAL (no rompe
 * `MockPspAdapter` ni ningun otro `PspAdapter` existente/futuro que no lo
 * implemente) en vez de hacerlo obligatorio, ya reflejando que no todos los
 * PSP lo soportan de la misma forma. NO es una integracion real contra un
 * PSP contratado (S-05 sigue sin contrato, ver ADR-0006) — solo la
 * extension de CONTRATO necesaria para que, cuando exista un PSP real, el
 * cambio sea aditivo y no requiera tocar `PagosModule`/`VentasModule`.
 */
export interface PspAdapter {
  autorizar(input: AutorizarPagoInput): Promise<ResultadoAutorizacionPsp>;
  reembolsar(pspReferenciaOriginal: string, monto: string | number): Promise<ResultadoReembolsoPsp>;
  cancelarTransaccionPendiente?(referenciaTransaccion?: string): Promise<ResultadoCancelacionPsp>;
}
