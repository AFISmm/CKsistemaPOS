/**
 * Unit tests de SyncService (F1-T5) SIN base de datos ni red real: se
 * mockean PrismaService y SyncHttpClient. Cubren:
 *   - Ack parcial: de un lote de N eventos, solo los `id` que la nube
 *     confirma se marcan `sincronizadoEn` (updateMany con exactamente esos
 *     ids, nunca todos ni ninguno de mas).
 *   - Ack total: se sigue drenando en el mismo ciclo hasta agotar pendientes.
 *   - Fallo de red/5xx agotando reintentos: NO se marca nada como
 *     sincronizado (se deja para el proximo ciclo).
 *
 * El test de integracion real contra Postgres + mock-cloud vive en
 * test/integration/sync.integration.spec.ts.
 */
import { SyncService } from "../../src/sync/sync.service";
import type { PrismaService } from "../../src/common/prisma/prisma.service";
import type { SyncHttpClient } from "../../src/sync/sync-http-client";

function eventoDominioFake(id: string, ocurridoEn: Date) {
  return {
    id,
    tipo: "TicketEnviadoACocina",
    agregadoTipo: "Pedido",
    agregadoId: "pedido-1",
    ubicacionId: "ubic-test",
    ocurridoEn,
    payload: { foo: "bar" },
    version: 1,
    sincronizadoEn: null,
  };
}

describe("SyncService.ejecutarCicloOutbox (mocks, sin DB/red)", () => {
  const ENV_KEYS = ["CLOUD_SYNC_URL", "SYNC_BATCH_SIZE", "SYNC_MAX_LOTES_POR_CICLO", "SYNC_MAX_REINTENTOS"] as const;
  let backup: Record<string, string | undefined>;

  beforeEach(() => {
    backup = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
    process.env.CLOUD_SYNC_URL = "http://cloud.test";
  });

  afterEach(() => {
    for (const k of ENV_KEYS) {
      if (backup[k] === undefined) delete process.env[k];
      else process.env[k] = backup[k];
    }
  });

  function crearMocks() {
    const findMany = jest.fn();
    const updateMany = jest.fn().mockResolvedValue({ count: 0 });
    const prisma = { eventoDominio: { findMany, updateMany } } as unknown as PrismaService;

    const postJson = jest.fn();
    const http = { postJson, mtlsHabilitado: false } as unknown as SyncHttpClient;

    return { prisma, findMany, updateMany, http, postJson };
  }

  it("con ack parcial, SOLO los ids confirmados se marcan sincronizados (updateMany exacto)", async () => {
    const { prisma, findMany, updateMany, http, postJson } = crearMocks();
    const eventos = [
      eventoDominioFake("evt-a", new Date("2026-01-01T00:00:00Z")),
      eventoDominioFake("evt-b", new Date("2026-01-01T00:00:01Z")),
      eventoDominioFake("evt-c", new Date("2026-01-01T00:00:02Z")),
    ];
    findMany.mockResolvedValueOnce(eventos);
    postJson.mockResolvedValueOnce({ status: 200, body: { confirmados: ["evt-a", "evt-c"] } });

    const service = new SyncService(prisma, http);
    const resultado = await service.ejecutarCicloOutbox();

    expect(resultado).toEqual({ lotesEnviados: 1, eventosConfirmados: 2 });
    expect(updateMany).toHaveBeenCalledTimes(1);
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: { in: ["evt-a", "evt-c"] } },
      data: { sincronizadoEn: expect.any(Date) },
    });
    // Ack parcial: no se pide un segundo lote en el mismo ciclo (evt-b vuelve
    // a salir primero, por ocurridoEn, en el proximo tick).
    expect(findMany).toHaveBeenCalledTimes(1);
  });

  it("con ack total, sigue drenando lotes en el mismo ciclo hasta que no quedan pendientes", async () => {
    const { prisma, findMany, updateMany, http, postJson } = crearMocks();
    process.env.SYNC_BATCH_SIZE = "2";

    const lote1 = [eventoDominioFake("evt-1", new Date("2026-01-01T00:00:00Z")), eventoDominioFake("evt-2", new Date("2026-01-01T00:00:01Z"))];
    const lote2 = [eventoDominioFake("evt-3", new Date("2026-01-01T00:00:02Z"))];

    findMany.mockResolvedValueOnce(lote1).mockResolvedValueOnce(lote2).mockResolvedValueOnce([]);
    postJson
      .mockResolvedValueOnce({ status: 200, body: { confirmados: ["evt-1", "evt-2"] } })
      .mockResolvedValueOnce({ status: 200, body: { confirmados: ["evt-3"] } });

    const service = new SyncService(prisma, http);
    const resultado = await service.ejecutarCicloOutbox();

    expect(resultado).toEqual({ lotesEnviados: 2, eventosConfirmados: 3 });
    expect(updateMany).toHaveBeenCalledTimes(2);
    expect(findMany).toHaveBeenCalledTimes(3); // lote1, lote2, [] (fin)
  });

  it("si la nube devuelve 500 y se agotan los reintentos, NO se marca nada como sincronizado", async () => {
    const { prisma, findMany, updateMany, http, postJson } = crearMocks();
    process.env.SYNC_MAX_REINTENTOS = "0"; // sin reintentos, para no esperar backoff real en el test

    findMany.mockResolvedValueOnce([eventoDominioFake("evt-x", new Date())]);
    postJson.mockResolvedValueOnce({ status: 500, body: {} });

    const service = new SyncService(prisma, http);
    const resultado = await service.ejecutarCicloOutbox();

    expect(resultado).toEqual({ lotesEnviados: 1, eventosConfirmados: 0 });
    expect(updateMany).not.toHaveBeenCalled();
  });

  it("si CLOUD_SYNC_URL no esta definido, el ciclo es un no-op (no toca Prisma)", async () => {
    delete process.env.CLOUD_SYNC_URL;
    const { prisma, findMany, updateMany, http } = crearMocks();

    const service = new SyncService(prisma, http);
    const resultado = await service.ejecutarCicloOutbox();

    expect(resultado).toEqual({ lotesEnviados: 0, eventosConfirmados: 0 });
    expect(findMany).not.toHaveBeenCalled();
    expect(updateMany).not.toHaveBeenCalled();
  });
});
