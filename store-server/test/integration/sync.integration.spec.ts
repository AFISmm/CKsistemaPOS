/**
 * Test de integracion de F1-T5 (agente de sincronizacion outbox/inbox).
 * Requiere PostgreSQL real (mismo patron que test/integration/pedidos.
 * integration.spec.ts): si DATABASE_URL no esta definido, la suite se
 * SALTA (describe.skip) con un console.warn, no rompe `npm test`.
 *
 * Levanta un mock-cloud local (test/mock-cloud/mock-cloud-server.ts, NO es
 * la nube real de Fase 5) y contra el, valida:
 *  (a) drenado normal del outbox: eventos pendientes -> POST /sync/eventos ->
 *      solo los ids confirmados quedan con sincronizadoEn seteado.
 *  (b) ack parcial: un id que la nube NO confirma queda pendiente; un ciclo
 *      posterior (cuando la nube ya lo acepta) lo termina de sincronizar.
 *  (c) idempotencia ante "crash" simulado: reenviar manualmente el mismo
 *      evento (mismo id) a la nube despues de haberlo sincronizado no rompe
 *      nada (upsert idempotente) Y un ciclo real posterior no vuelve a leer
 *      esa fila (WHERE sincronizadoEn IS NULL ya la excluye) — se verifica
 *      la propiedad de idempotencia por reinicio directamente, sin necesitar
 *      matar el proceso de verdad.
 *  (d) inbox: un cambio de ReglaDeImpuesto versionado se aplica (LWW) y el
 *      cursor de SyncEstado avanza; un cambio con version menor a la local
 *      NO sobreescribe (override local gana, arquitectura.md §4.5).
 */
import type { INestApplication } from "@nestjs/common";
import { Decimal } from "@prisma/client/runtime/library";
import { SyncService } from "../../src/sync/sync.service";
import { InboxService } from "../../src/sync/inbox.service";
import { PrismaService } from "../../src/common/prisma/prisma.service";
import { uuidv7 } from "../../src/common/util/uuid";
import { iniciarMockCloud, type ServidorMockCloud } from "../mock-cloud/mock-cloud-server";
import { crearAppDePrueba, limpiarBaseDeDatos, sembrarFixturesBasicas, UBICACION_TEST } from "./setup";

const DB_DISPONIBLE = Boolean(process.env.DATABASE_URL);
if (!DB_DISPONIBLE) {
  // eslint-disable-next-line no-console
  console.warn(
    "[integration] DATABASE_URL no definido: se omiten los tests de sincronizacion (F1-T5). " +
      "Ver store-server/README.md (seccion Tests) y docker-compose.test.yml.",
  );
}

(DB_DISPONIBLE ? describe : describe.skip)("Agente de sincronizacion outbox/inbox (F1-T5)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let syncService: SyncService;
  let inboxService: InboxService;
  let mockCloud: ServidorMockCloud;

  beforeAll(async () => {
    mockCloud = await iniciarMockCloud();

    // Deben quedar seteadas ANTES de compilar el AppModule: SyncService/
    // InboxService leen process.env en su constructor (Nest DI instancia los
    // providers durante moduleRef.compile()/app.init()).
    process.env.CLOUD_SYNC_URL = mockCloud.url;
    // Intervalos enormes para que el setInterval de produccion (arrancado en
    // onModuleInit) NO dispare un ciclo de fondo mientras el test corre: cada
    // test invoca ejecutarCicloOutbox()/ejecutarCicloInbox() explicitamente.
    process.env.SYNC_INTERVALO_MS = "3600000";
    process.env.SYNC_INBOX_INTERVALO_MS = "3600000";

    const ctx = await crearAppDePrueba();
    app = ctx.app;
    prisma = ctx.prisma;
    syncService = app.get(SyncService);
    inboxService = app.get(InboxService);
  });

  afterAll(async () => {
    await app.close();
    await mockCloud.cerrar();
    delete process.env.CLOUD_SYNC_URL;
    delete process.env.SYNC_INTERVALO_MS;
    delete process.env.SYNC_INBOX_INTERVALO_MS;
  });

  beforeEach(async () => {
    await limpiarBaseDeDatos(prisma);
    await sembrarFixturesBasicas(prisma);
    mockCloud.eventosRecibidos.clear();
    mockCloud.rechazarIds.clear();
    mockCloud.cambiosConfig = [];
    mockCloud.fallarSiempre = false;
  });

  async function crearEventoDominioPendiente(id: string, ocurridoEn: Date) {
    return prisma.eventoDominio.create({
      data: {
        id,
        tipo: "TicketEnviadoACocina",
        agregadoTipo: "Pedido",
        agregadoId: "pedido-fake",
        ubicacionId: UBICACION_TEST,
        ocurridoEn,
        payload: { demo: true },
        version: 1,
      },
    });
  }

  it("(a) drena el outbox: eventos pendientes se envian y se marcan sincronizados", async () => {
    const id1 = uuidv7();
    const id2 = uuidv7();
    await crearEventoDominioPendiente(id1, new Date("2026-01-01T10:00:00Z"));
    await crearEventoDominioPendiente(id2, new Date("2026-01-01T10:00:01Z"));

    const resultado = await syncService.ejecutarCicloOutbox();
    expect(resultado).toEqual({ lotesEnviados: 1, eventosConfirmados: 2 });

    const [evt1, evt2] = await Promise.all([
      prisma.eventoDominio.findUniqueOrThrow({ where: { id: id1 } }),
      prisma.eventoDominio.findUniqueOrThrow({ where: { id: id2 } }),
    ]);
    expect(evt1.sincronizadoEn).not.toBeNull();
    expect(evt2.sincronizadoEn).not.toBeNull();

    expect(mockCloud.eventosRecibidos.has(id1)).toBe(true);
    expect(mockCloud.eventosRecibidos.has(id2)).toBe(true);
  });

  it("(b) ack parcial: el id no confirmado queda pendiente y se completa en un ciclo posterior", async () => {
    const idConfirma = uuidv7();
    const idRechaza = uuidv7();
    await crearEventoDominioPendiente(idConfirma, new Date("2026-01-02T10:00:00Z"));
    await crearEventoDominioPendiente(idRechaza, new Date("2026-01-02T10:00:01Z"));

    mockCloud.rechazarIds.add(idRechaza);

    const primerCiclo = await syncService.ejecutarCicloOutbox();
    expect(primerCiclo.eventosConfirmados).toBe(1);

    const confirmado = await prisma.eventoDominio.findUniqueOrThrow({ where: { id: idConfirma } });
    const rechazado = await prisma.eventoDominio.findUniqueOrThrow({ where: { id: idRechaza } });
    expect(confirmado.sincronizadoEn).not.toBeNull();
    expect(rechazado.sincronizadoEn).toBeNull(); // NO se marco: ack parcial respetado

    // La nube "cambia de opinion" (deja de rechazarlo) y drena en el proximo ciclo.
    mockCloud.rechazarIds.delete(idRechaza);
    const segundoCiclo = await syncService.ejecutarCicloOutbox();
    expect(segundoCiclo.eventosConfirmados).toBe(1);

    const rechazadoAhoraSi = await prisma.eventoDominio.findUniqueOrThrow({ where: { id: idRechaza } });
    expect(rechazadoAhoraSi.sincronizadoEn).not.toBeNull();
  });

  it("(c) idempotencia: reenviar el mismo id ya sincronizado no duplica ni rompe nada, y el siguiente ciclo real no lo vuelve a leer", async () => {
    const id = uuidv7();
    const ocurridoEn = new Date("2026-01-03T10:00:00Z");
    await crearEventoDominioPendiente(id, ocurridoEn);

    const cicloReal = await syncService.ejecutarCicloOutbox();
    expect(cicloReal.eventosConfirmados).toBe(1);
    expect(mockCloud.eventosRecibidos.size).toBe(1);

    // Simula: un proceso anterior envio este mismo evento a la nube pero
    // "crasheo" antes de persistir sincronizadoEn (o simplemente reintenta
    // de mas). El id/payload NUNCA se regenera (C-ID): se reenvia tal cual.
    const respuestaReenvio = await fetch(`${mockCloud.url}/sync/eventos`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        eventos: [
          {
            id,
            tipo: "TicketEnviadoACocina",
            agregadoTipo: "Pedido",
            agregadoId: "pedido-fake",
            ubicacionId: UBICACION_TEST,
            ocurridoEn: ocurridoEn.toISOString(),
            version: 1,
            payload: { demo: true },
          },
        ],
      }),
    });
    const cuerpoReenvio = (await respuestaReenvio.json()) as { confirmados: string[] };
    expect(respuestaReenvio.status).toBe(200);
    expect(cuerpoReenvio.confirmados).toEqual([id]); // la nube lo re-confirma sin error (upsert idempotente)
    expect(mockCloud.eventosRecibidos.size).toBe(1); // sigue habiendo UNA sola entrada, no dos

    // Propiedad clave: el store-side solo relee `sincronizadoEn IS NULL`, asi
    // que un ciclo real posterior ya no encuentra esta fila (no la reenvia).
    const cicloSiguiente = await syncService.ejecutarCicloOutbox();
    expect(cicloSiguiente).toEqual({ lotesEnviados: 0, eventosConfirmados: 0 });

    const filas = await prisma.eventoDominio.findMany({ where: { id } });
    expect(filas).toHaveLength(1); // nunca se duplico la fila local tampoco
  });

  it("(d) inbox aplica un cambio versionado (LWW) y avanza el cursor de SyncEstado", async () => {
    const idRegla = "regla-inbox-test";
    mockCloud.cambiosConfig = [
      {
        entidad: "ReglaDeImpuesto",
        id: idRegla,
        version: 5,
        datos: {
          ubicacionId: UBICACION_TEST,
          jurisdiccion: "FL-INBOX",
          nombre: "Regla desde inbox",
          tasa: 0.05,
          vigenteDesde: "2026-01-01T00:00:00.000Z",
          vigenteHasta: null,
          aplicaAExentos: false,
        },
      },
    ];

    const resultado = await inboxService.ejecutarCicloInbox();
    expect(resultado).toEqual({ aplicados: 1, ignorados: 0 });

    const regla = await prisma.reglaDeImpuesto.findUniqueOrThrow({ where: { id: idRegla } });
    expect(new Decimal(regla.tasa).toString()).toBe("0.05");
    expect(regla.version).toBe(5);

    const estado = await prisma.syncEstado.findUniqueOrThrow({ where: { id: "inbox" } });
    expect(estado.ultimaVersionAplicada).toBe(5);

    // Repetir el mismo ciclo (misma respuesta de la nube, desde=5 ahora) no
    // trae cambios nuevos: el mock ya no devuelve version <= 5.
    const segundoResultado = await inboxService.ejecutarCicloInbox();
    expect(segundoResultado).toEqual({ aplicados: 0, ignorados: 0 });
  });

  it("(d.2) Last-Writer-Wins: un override local con version mayor gana sobre un cambio entrante mas viejo", async () => {
    const idRegla = "regla-lww-test";
    await prisma.reglaDeImpuesto.create({
      data: {
        id: idRegla,
        ubicacionId: UBICACION_TEST,
        jurisdiccion: "FL-LOCAL",
        nombre: "Override local (gerente tienda)",
        tasa: 0.09,
        vigenteDesde: new Date("2026-01-01"),
        vigenteHasta: null,
        aplicaAExentos: false,
        version: 10, // ya "gano" localmente
      },
    });

    mockCloud.cambiosConfig = [
      {
        entidad: "ReglaDeImpuesto",
        id: idRegla,
        version: 6, // mas vieja que la local
        datos: {
          ubicacionId: UBICACION_TEST,
          jurisdiccion: "FL-NUBE-VIEJA",
          nombre: "Version vieja de la nube",
          tasa: 0.01,
          vigenteDesde: "2026-01-01T00:00:00.000Z",
          vigenteHasta: null,
          aplicaAExentos: false,
        },
      },
    ];

    const resultado = await inboxService.ejecutarCicloInbox();
    expect(resultado).toEqual({ aplicados: 0, ignorados: 1 });

    const regla = await prisma.reglaDeImpuesto.findUniqueOrThrow({ where: { id: idRegla } });
    expect(regla.nombre).toBe("Override local (gerente tienda)"); // NO se sobreescribio
    expect(new Decimal(regla.tasa).toString()).toBe("0.09");
    expect(regla.version).toBe(10);
  });
});
