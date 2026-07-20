import { Injectable, Logger } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { PrismaService } from "../prisma/prisma.service";
import { uuidv7 } from "../util/uuid";
import { EventosGateway } from "./eventos.gateway";
import type { EmitirEventoInput, EnvelopeEvento } from "./tipos-evento";

/**
 * EventosService — UNICO punto de emision de eventos de dominio (C-EVENTOS).
 *
 * Por diseno (ver docs/arquitectura.md §6.3 y la tarea F1-T4/F1-T2), una sola
 * llamada a `emitir()` hace TRES cosas sin caminos separados que puedan
 * divergir:
 *   1. Persiste una fila en EventoDominio (source of truth del outbox de
 *      sincronizacion F1-T5 y del replay del bus).
 *   2. Publica el mismo envelope por WebSocket (EventosGateway) — un cliente
 *      suscrito lo ve en bien menos de 2s (RNF-01), sin polling.
 *   3. Emite un evento interno (EventEmitter2) con el mismo `tipo`, para que
 *      otros modulos del MISMO proceso (ej. InventarioModule escuchando
 *      "VentaConfirmada"/"VentaRevertida") reaccionen sin acoplarse por
 *      llamada directa a VentasService.
 *
 * Los tres pasos comparten el mismo `id`/`ocurridoEn`/`version`/`payload`: no
 * hay dos codepaths que puedan quedar desincronizados.
 */
@Injectable()
export class EventosService {
  private readonly logger = new Logger(EventosService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: EventosGateway,
    private readonly emitter: EventEmitter2,
  ) {}

  async emitir<TPayload = unknown>(input: EmitirEventoInput<TPayload>): Promise<EnvelopeEvento<TPayload>> {
    const id = uuidv7();
    const ocurridoEn = new Date();
    const version = input.version ?? 1;

    await this.prisma.eventoDominio.create({
      data: {
        id,
        tipo: input.tipo,
        agregadoTipo: input.agregadoTipo,
        agregadoId: input.agregadoId,
        ubicacionId: input.ubicacionId,
        ocurridoEn,
        payload: input.payload as object,
        version,
      },
    });

    const envelope: EnvelopeEvento<TPayload> = {
      id,
      tipo: input.tipo,
      ubicacionId: input.ubicacionId,
      ocurridoEn: ocurridoEn.toISOString(),
      version,
      payload: input.payload,
    };

    this.gateway.publicar(envelope);
    // emitAsync (no emit): esperamos a que los listeners internos async
    // terminen (ej. InventarioModule reaccionando a VentaConfirmada) antes de
    // devolver el control. Mantiene el descuento de stock consistente dentro
    // del mismo request en vez de ser una carrera de fire-and-forget.
    await this.emitter.emitAsync(input.tipo, envelope);

    this.logger.debug(`Evento emitido: ${input.tipo} (${id})`);
    return envelope;
  }
}
