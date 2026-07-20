/**
 * mock-cloud-server.ts — INFRAESTRUCTURA DE TEST, NO es un entregable de
 * produccion. Simula el lado nube (Hub) del contrato de sincronizacion
 * (arquitectura.md §6.4) SOLO para poder probar el cliente de sincronizacion
 * del Store Server (F1-T5) de punta a punta sin depender de la nube real de
 * Fase 5 (que todavia no existe).
 *
 * Implementa el minimo indispensable de:
 *   - `POST /sync/eventos`: upsert idempotente por `id` en un Map en memoria;
 *     responde `{ confirmados: string[] }`. Soporta `rechazarIds` mutable
 *     para simular ack parcial (la nube no confirma ciertos ids a proposito).
 *   - `GET /sync/config?desde=version`: devuelve los `cambiosConfig`
 *     (mutable) con `version > desde`.
 *   - `fallarSiempre` mutable: fuerza 500 en cualquier ruta, para probar el
 *     camino de reintento/backoff del cliente real.
 *
 * Es HTTP plano (no HTTPS/mTLS): el cliente de sincronizacion cae a HTTP
 * simple cuando no hay MTLS_CERT_PATH/KEY/CA configurados (fallback de
 * desarrollo documentado en src/sync/mtls-config.ts), que es exactamente el
 * modo en que estos tests lo ejercitan.
 */
import * as http from "node:http";
import type { AddressInfo } from "node:net";
import type { CambioConfigInbox } from "../../src/sync/tipos-sync";

export interface EventoRecibidoMock {
  id: string;
  tipo: string;
  [clave: string]: unknown;
}

export interface OpcionesMockCloud {
  rechazarIds?: Iterable<string>;
  cambiosConfig?: CambioConfigInbox[];
  fallarSiempre?: boolean;
}

export interface ServidorMockCloud {
  readonly server: http.Server;
  readonly url: string;
  /** Eventos recibidos por id (idempotente: reenviar el mismo id no duplica la entrada). */
  readonly eventosRecibidos: Map<string, EventoRecibidoMock>;
  /** Mutable: agregar/quitar ids aqui simula que la nube confirma o no un evento en el proximo POST. */
  rechazarIds: Set<string>;
  /** Mutable: cambios de config servidos por GET /sync/config. */
  cambiosConfig: CambioConfigInbox[];
  /** Mutable: si true, toda peticion responde 500 (simula caida de la nube). */
  fallarSiempre: boolean;
  cerrar(): Promise<void>;
}

export async function iniciarMockCloud(opciones: OpcionesMockCloud = {}): Promise<ServidorMockCloud> {
  // `estado` es el MISMO objeto que se retorna (ver Object.assign abajo): el
  // handler HTTP cierra sobre esta referencia, asi que mutar las propiedades
  // del objeto retornado (mock.fallarSiempre = true, mock.rechazarIds.add(id))
  // cambia el comportamiento del servidor sin reiniciarlo.
  const estado = {
    eventosRecibidos: new Map<string, EventoRecibidoMock>(),
    rechazarIds: new Set<string>(opciones.rechazarIds ?? []),
    cambiosConfig: [...(opciones.cambiosConfig ?? [])],
    fallarSiempre: opciones.fallarSiempre ?? false,
  };

  const server = http.createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => {
      try {
        if (estado.fallarSiempre) {
          responderJson(res, 500, { codigo: "error_simulado", mensaje: "mock-cloud: fallo forzado para test" });
          return;
        }

        const url = new URL(req.url ?? "/", "http://localhost");

        if (req.method === "POST" && url.pathname === "/sync/eventos") {
          const raw = chunks.length ? Buffer.concat(chunks).toString("utf8") : "{}";
          const body = JSON.parse(raw) as { eventos?: EventoRecibidoMock[] };
          const eventos = Array.isArray(body.eventos) ? body.eventos : [];
          const confirmados: string[] = [];
          for (const evento of eventos) {
            if (estado.rechazarIds.has(evento.id)) continue;
            // Idempotente por diseno: mismo `id` sobreescribe la misma
            // entrada del Map, nunca crea una segunda (arquitectura.md §4.4.3).
            estado.eventosRecibidos.set(evento.id, evento);
            confirmados.push(evento.id);
          }
          responderJson(res, 200, { confirmados });
          return;
        }

        if (req.method === "GET" && url.pathname === "/sync/config") {
          const desde = Number(url.searchParams.get("desde") ?? "0");
          const cambios = estado.cambiosConfig.filter((c) => c.version > desde);
          const version = cambios.length > 0 ? Math.max(...cambios.map((c) => c.version)) : desde;
          responderJson(res, 200, { version, cambios });
          return;
        }

        responderJson(res, 404, {
          codigo: "no_encontrado",
          mensaje: `mock-cloud: ruta no soportada ${req.method} ${url.pathname}`,
        });
      } catch (err) {
        responderJson(res, 500, { codigo: "error_mock", mensaje: (err as Error).message });
      }
    });
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address() as AddressInfo;
  const url = `http://127.0.0.1:${address.port}`;

  const cerrar = (): Promise<void> =>
    new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });

  return Object.assign(estado, { server, url, cerrar });
}

function responderJson(res: http.ServerResponse, status: number, body: unknown): void {
  const raw = JSON.stringify(body);
  res.writeHead(status, { "content-type": "application/json", "content-length": Buffer.byteLength(raw) });
  res.end(raw);
}
