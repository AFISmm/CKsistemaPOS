import { Injectable } from "@nestjs/common";
import { uuidv7 } from "../../common/util/uuid";
import type {
  AutorizarPagoInput,
  PspAdapter,
  ResultadoAutorizacionPsp,
  ResultadoCancelacionPsp,
  ResultadoReembolsoPsp,
} from "./psp-adapter.interface";

/**
 * MockPspAdapter — implementacion EN MEMORIA del PspAdapter (Fase 1, F1-T1).
 *
 * ==========================================================================
 *  MOCK: no hay red, no hay terminal fisico, no hay PSP real. Reemplazar en
 *  Fase 2 (F2-T4/F2-T5) por el SDK semi-integrado del PSP seleccionado tras
 *  cerrar el bloqueante S-05 (soporte de store-and-forward). El resto del
 *  sistema (PagosModule/VentasModule) no cambia: solo se reemplaza el
 *  provider registrado bajo el token PSP_ADAPTER.
 * ==========================================================================
 *
 * Caminos deterministas (misma logica que lib/payments/psp.ts de la demo,
 * portada 1:1):
 *  - forzarRechazo=true -> rechazada.
 *  - offline=true       -> encolada (store-and-forward); NUNCA "aprobado".
 *  - caso normal        -> aprobada con token/referencia/ultimos4/marca mock.
 */
@Injectable()
export class MockPspAdapter implements PspAdapter {
  private static readonly MARCAS = ["VISA", "MC"] as const;

  async autorizar(input: AutorizarPagoInput): Promise<ResultadoAutorizacionPsp> {
    if (input.forzarRechazo) {
      return {
        aprobado: false,
        encolado: false,
        pspTokenId: null,
        pspReferencia: null,
        ultimos4: null,
        marca: null,
        mensaje: "Rechazada (mock PSP)",
      };
    }

    if (input.offline) {
      return {
        aprobado: false,
        encolado: true,
        pspTokenId: uuidv7(),
        pspReferencia: uuidv7(),
        ultimos4: "4242",
        marca: "VISA",
        mensaje: "Encolada offline (store-and-forward, mock PSP)",
      };
    }

    return {
      aprobado: true,
      encolado: false,
      pspTokenId: uuidv7(),
      pspReferencia: uuidv7(),
      ultimos4: String(Math.floor(1000 + Math.random() * 9000)),
      marca: MockPspAdapter.MARCAS[Math.floor(Math.random() * MockPspAdapter.MARCAS.length)],
      mensaje: "Aprobada (mock PSP)",
    };
  }

  async reembolsar(pspReferenciaOriginal: string, monto: string | number): Promise<ResultadoReembolsoPsp> {
    return {
      aprobado: true,
      pspReferencia: uuidv7(),
      mensaje: `Reembolso aprobado (mock PSP) por ${monto}, referencia original ${pspReferenciaOriginal}`,
    };
  }

  /**
   * F2-T4 (aditivo, ver psp-adapter.interface.ts): el mock nunca queda "a
   * medias" (responde sincronicamente en `autorizar`), asi que aqui no hay
   * nada real que cancelar — se implementa como no-op siempre exitoso, solo
   * para que el contrato completo sea ejercitable en tests sin esperar al
   * SDK real de un PSP contratado.
   */
  async cancelarTransaccionPendiente(referenciaTransaccion?: string): Promise<ResultadoCancelacionPsp> {
    return {
      cancelado: true,
      mensaje: referenciaTransaccion
        ? `Sin transaccion pendiente que cancelar (mock PSP, referencia ${referenciaTransaccion})`
        : "Sin transaccion pendiente que cancelar (mock PSP)",
    };
  }
}
