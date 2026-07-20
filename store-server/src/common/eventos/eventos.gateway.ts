import { Logger } from "@nestjs/common";
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import type { Server, Socket } from "socket.io";
import type { EnvelopeEvento } from "./tipos-evento";

/**
 * EventosGateway — bus de eventos WebSocket local (F1-T4, RNF-01 ≤2 s).
 *
 * Los clientes (KDS, frontend cajero, CFD) se conectan por WS y opcionalmente
 * envian `{ubicacionId}` en el mensaje "suscribir" para unirse a la sala de su
 * tienda (multi-tienda desde el esquema, C-TENANT); si no se suscriben a
 * ninguna sala, reciben el broadcast global (comodo para el MVP de una sola
 * tienda piloto). El nombre de evento Socket.IO usado para el push es
 * "evento-dominio"; el payload es el envelope exacto {id, tipo, ubicacionId,
 * ocurridoEn, version, payload} de arquitectura.md §6.3 — el cliente
 * distingue el tipo de negocio por el campo `tipo`, no por el nombre del
 * evento de transporte.
 */
@WebSocketGateway({
  cors: { origin: "*" },
})
export class EventosGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(EventosGateway.name);

  handleConnection(client: Socket): void {
    this.logger.debug(`Cliente WS conectado: ${client.id}`);
  }

  handleDisconnect(client: Socket): void {
    this.logger.debug(`Cliente WS desconectado: ${client.id}`);
  }

  @SubscribeMessage("suscribir")
  handleSuscribir(client: Socket, data: { ubicacionId?: string }): void {
    if (data?.ubicacionId) {
      void client.join(salaUbicacion(data.ubicacionId));
    }
  }

  /** Publica el envelope a la sala de la ubicacion y al canal global. */
  publicar(envelope: EnvelopeEvento): void {
    if (!this.server) return; // guard para tests unitarios sin servidor HTTP real
    this.server.to(salaUbicacion(envelope.ubicacionId)).emit("evento-dominio", envelope);
    this.server.emit("evento-dominio", envelope);
  }
}

function salaUbicacion(ubicacionId: string): string {
  return `ubicacion:${ubicacionId}`;
}
