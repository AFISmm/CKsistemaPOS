/**
 * Test de integracion (F3-T2, monitoreo de conectividad) contra PostgreSQL
 * real, mismo patron `describe.skip` que el resto de la suite si
 * `DATABASE_URL` no esta definido (ver store-server/README.md seccion Tests).
 *
 * Cubre la parte que test/unit/conectividad-service.spec.ts NO puede cubrir
 * (ahi Prisma esta mockeado): que una transicion CONFIRMADA realmente
 * persiste un `EventoDominio` con tipo "ConectividadCambiada" (el mecanismo
 * de historial elegido, ver ConectividadService cabecera de comentario y
 * store-server/README.md), y que `GET /api/v1/conectividad/estado`
 * (invocado aqui directamente sobre el controller, mismo criterio que el
 * resto de tests de integracion — ver pedidos.integration.spec.ts) refleja
 * ese historial.
 *
 * NO hace peticiones de red reales: `VerificadorRed` se reemplaza (override
 * de provider de Nest) por un doble de prueba controlado — el sandbox de
 * test no debe depender de acceso real a internet para validar esta logica.
 */
import { Test } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
import { AppModule } from "../../src/app.module";
import { PrismaService } from "../../src/common/prisma/prisma.service";
import { VerificadorRed } from "../../src/conectividad/verificador-red";
import { ConectividadService } from "../../src/conectividad/conectividad.service";
import { ConectividadController } from "../../src/conectividad/conectividad.controller";
import { EVENTOS_DOMINIO } from "../../src/common/eventos/tipos-evento";
import { limpiarBaseDeDatos, sembrarFixturesBasicas, UBICACION_TEST } from "./setup";

const DB_DISPONIBLE = Boolean(process.env.DATABASE_URL);
if (!DB_DISPONIBLE) {
  // eslint-disable-next-line no-console
  console.warn(
    "[integration] DATABASE_URL no definido: se omiten los tests de conectividad (F3-T2). " +
      "Ver store-server/README.md (seccion Tests) y docker-compose.test.yml.",
  );
}

interface VerificadorFake {
  verificar: jest.Mock<Promise<boolean>, [string, number]>;
}

(DB_DISPONIBLE ? describe : describe.skip)("ConectividadService — persistencia de transiciones via EventoDominio (F3-T2)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let conectividad: ConectividadService;
  let controller: ConectividadController;
  let verificadorFake: VerificadorFake;

  beforeAll(async () => {
    // Deben quedar seteadas ANTES de compilar el AppModule (ConectividadService
    // lee process.env en su constructor, igual que SyncService/InboxService —
    // ver sync.integration.spec.ts para el mismo criterio). Intervalo enorme
    // para que el setInterval real (arrancado en onModuleInit) no dispare un
    // ciclo de fondo mientras el test corre: cada test invoca
    // ejecutarCicloVerificacion() explicitamente.
    process.env.UBICACION_PILOTO_ID = UBICACION_TEST;
    process.env.CONECTIVIDAD_INTERVALO_MS = "3600000";
    process.env.CONECTIVIDAD_CONFIRMACIONES_REQUERIDAS = "2";
    process.env.CONECTIVIDAD_HOSTS = "https://a.test,https://b.test";

    verificadorFake = { verificar: jest.fn() };

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(VerificadorRed)
      .useValue(verificadorFake)
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
    conectividad = app.get(ConectividadService);
    controller = app.get(ConectividadController);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await limpiarBaseDeDatos(prisma);
    await sembrarFixturesBasicas(prisma);
    verificadorFake.verificar.mockReset();
  });

  it("(a) dos ciclos consecutivos con todos los hosts inalcanzables confirman sin_conexion y persisten UN EventoDominio ConectividadCambiada", async () => {
    verificadorFake.verificar.mockResolvedValue(false);

    const r1 = await conectividad.ejecutarCicloVerificacion();
    expect(r1.transicion).toBeNull(); // primera observacion: todavia acumulando confirmacion (debounce)

    const r2 = await conectividad.ejecutarCicloVerificacion();
    expect(r2.transicion?.estadoAnterior).toBe("en_linea");
    expect(r2.transicion?.estadoNuevo).toBe("sin_conexion");

    const eventos = await prisma.eventoDominio.findMany({
      where: { tipo: EVENTOS_DOMINIO.CONECTIVIDAD_CAMBIADA, ubicacionId: UBICACION_TEST },
    });
    expect(eventos).toHaveLength(1);
    expect(eventos[0].payload).toMatchObject({ estadoAnterior: "en_linea", estadoNuevo: "sin_conexion" });
    expect(eventos[0].sincronizadoEn).toBeNull(); // pendiente de sync (F1-T5 la drena, sin cambios)
  });

  it("(b) GET /api/v1/conectividad/estado refleja el estado confirmado y el historial reciente", async () => {
    verificadorFake.verificar.mockResolvedValue(false);
    await conectividad.ejecutarCicloVerificacion();
    await conectividad.ejecutarCicloVerificacion();

    const respuesta = await controller.estado();
    expect(respuesta.estado).toBe("sin_conexion");
    expect(respuesta.ultimaVerificacion).not.toBeNull();
    expect(respuesta.historialReciente).toHaveLength(1);
    expect(respuesta.historialReciente[0]).toMatchObject({ estadoAnterior: "en_linea", estadoNuevo: "sin_conexion" });
  });

  it("(c) una recuperacion posterior (dos ciclos OK) agrega una SEGUNDA transicion sin duplicar ni perder la primera", async () => {
    verificadorFake.verificar.mockResolvedValue(false);
    await conectividad.ejecutarCicloVerificacion();
    await conectividad.ejecutarCicloVerificacion(); // confirma sin_conexion

    verificadorFake.verificar.mockResolvedValue(true);
    await conectividad.ejecutarCicloVerificacion();
    const r4 = await conectividad.ejecutarCicloVerificacion(); // confirma en_linea

    expect(r4.transicion?.estadoAnterior).toBe("sin_conexion");
    expect(r4.transicion?.estadoNuevo).toBe("en_linea");

    const eventos = await prisma.eventoDominio.findMany({
      where: { tipo: EVENTOS_DOMINIO.CONECTIVIDAD_CAMBIADA, ubicacionId: UBICACION_TEST },
      orderBy: { ocurridoEn: "asc" },
    });
    expect(eventos).toHaveLength(2);
    expect(eventos[0].payload).toMatchObject({ estadoNuevo: "sin_conexion" });
    expect(eventos[1].payload).toMatchObject({ estadoAnterior: "sin_conexion", estadoNuevo: "en_linea" });
  });
});
