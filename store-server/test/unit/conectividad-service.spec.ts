/**
 * Unit tests de ConectividadService (F3-T2) SIN red ni base de datos real:
 * se mockean PrismaService, EventosService y VerificadorRed (mismo patron que
 * test/unit/sync-outbox.spec.ts para SyncService). Cubren:
 *  - Ciclo con todos los hosts alcanzables: no hay transicion, no se llama a
 *    EventosService.emitir.
 *  - Umbral N-de-M: un solo host caido de varios -> "degradado", no
 *    "sin_conexion".
 *  - Debounce de extremo a extremo a traves del servicio (confirmaciones
 *    consecutivas antes de emitir el evento).
 *  - GARANTIA DEFENSIVA pedida por la tarea: si VerificadorRed.verificar()
 *    lanza (en vez de resolver false, rompiendo su propio contrato), el
 *    ciclo NO se cae — se cuenta como fallo y sigue.
 *  - GARANTIA DEFENSIVA: si EventosService.emitir() falla (ej. DB caida justo
 *    al momento de una transicion), el ciclo tampoco se cae.
 *  - onModuleInit re-siembra el estado desde el ultimo EventoDominio
 *    ConectividadCambiada si existe, y no rompe el arranque si Prisma falla.
 *
 * El test de integracion real (persistencia via Prisma) vive en
 * test/integration/conectividad.integration.spec.ts.
 */
import { ConectividadService } from "../../src/conectividad/conectividad.service";
import type { PrismaService } from "../../src/common/prisma/prisma.service";
import type { EventosService } from "../../src/common/eventos/eventos.service";
import type { VerificadorRed } from "../../src/conectividad/verificador-red";

describe("ConectividadService.ejecutarCicloVerificacion (mocks, sin DB/red)", () => {
  const ENV_KEYS = [
    "CONECTIVIDAD_HOSTS",
    "CONECTIVIDAD_MIN_FALLOS_DEGRADADO",
    "CONECTIVIDAD_CONFIRMACIONES_REQUERIDAS",
    "UBICACION_PILOTO_ID",
  ] as const;
  let backup: Record<string, string | undefined>;

  beforeEach(() => {
    backup = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
    process.env.CONECTIVIDAD_HOSTS = "https://a.test,https://b.test,https://c.test";
    process.env.CONECTIVIDAD_MIN_FALLOS_DEGRADADO = "1";
    process.env.CONECTIVIDAD_CONFIRMACIONES_REQUERIDAS = "2";
    process.env.UBICACION_PILOTO_ID = "ubic-test";
  });

  afterEach(() => {
    for (const k of ENV_KEYS) {
      if (backup[k] === undefined) delete process.env[k];
      else process.env[k] = backup[k];
    }
  });

  function crearMocks() {
    const findFirst = jest.fn();
    const prisma = { eventoDominio: { findFirst } } as unknown as PrismaService;

    const emitir = jest.fn().mockResolvedValue(undefined);
    const eventos = { emitir } as unknown as EventosService;

    const verificar = jest.fn();
    const verificador = { verificar } as unknown as VerificadorRed;

    return { prisma, findFirst, eventos, emitir, verificador, verificar };
  }

  it("con todos los hosts alcanzables, el estado permanece en_linea y NO se emite ningun evento", async () => {
    const { prisma, eventos, emitir, verificador, verificar } = crearMocks();
    verificar.mockResolvedValue(true);

    const service = new ConectividadService(prisma, eventos, verificador);
    const resultado = await service.ejecutarCicloVerificacion();

    expect(resultado).toEqual({ estado: "en_linea", transicion: null });
    expect(emitir).not.toHaveBeenCalled();
    expect(service.obtenerEstadoActual().estado).toBe("en_linea");
    expect(service.obtenerEstadoActual().ultimaVerificacion).not.toBeNull();
  });

  it("umbral N-de-M: UN solo host de 3 inalcanzable, sostenido 2 ciclos, confirma degradado (no sin_conexion)", async () => {
    const { prisma, eventos, emitir, verificador, verificar } = crearMocks();
    verificar.mockImplementation(async (host: string) => host !== "https://a.test"); // a.test siempre falla, b/c siempre ok

    const service = new ConectividadService(prisma, eventos, verificador);

    const r1 = await service.ejecutarCicloVerificacion();
    expect(r1.transicion).toBeNull(); // primera confirmacion, debounce en curso

    const r2 = await service.ejecutarCicloVerificacion();
    expect(r2.transicion).toMatchObject({ estadoAnterior: "en_linea", estadoNuevo: "degradado" });
    expect(emitir).toHaveBeenCalledTimes(1);
    expect(emitir).toHaveBeenCalledWith(
      expect.objectContaining({
        tipo: "ConectividadCambiada",
        ubicacionId: "ubic-test",
        agregadoTipo: "Conectividad",
        agregadoId: "ubic-test",
        payload: expect.objectContaining({ estadoAnterior: "en_linea", estadoNuevo: "degradado" }),
      }),
    );
  });

  it("umbral N-de-M: TODOS los hosts inalcanzables, sostenido 2 ciclos, confirma sin_conexion", async () => {
    const { prisma, eventos, emitir, verificador, verificar } = crearMocks();
    verificar.mockResolvedValue(false);

    const service = new ConectividadService(prisma, eventos, verificador);
    await service.ejecutarCicloVerificacion();
    const r2 = await service.ejecutarCicloVerificacion();

    expect(r2.transicion?.estadoNuevo).toBe("sin_conexion");
    expect(emitir).toHaveBeenCalledTimes(1);
  });

  it("un blip aislado de un solo ciclo NO dispara ninguna emision (debounce end-to-end)", async () => {
    const { prisma, eventos, emitir, verificador, verificar } = crearMocks();

    const service = new ConectividadService(prisma, eventos, verificador);

    verificar.mockResolvedValue(true);
    await service.ejecutarCicloVerificacion(); // en_linea estable

    verificar.mockResolvedValue(false); // ciclo malo aislado
    const rBlip = await service.ejecutarCicloVerificacion();
    expect(rBlip.transicion).toBeNull();
    expect(service.obtenerEstadoActual().estado).toBe("en_linea");

    verificar.mockResolvedValue(true); // se recupera antes de confirmar
    const rRecuperado = await service.ejecutarCicloVerificacion();
    expect(rRecuperado.transicion).toBeNull();
    expect(service.obtenerEstadoActual().estado).toBe("en_linea");

    expect(emitir).not.toHaveBeenCalled();
  });

  it("DEFENSIVO: si VerificadorRed.verificar() lanza (rompiendo su propio contrato), el ciclo NO se cae", async () => {
    const { prisma, eventos, emitir, verificador, verificar } = crearMocks();
    verificar.mockRejectedValue(new Error("bug simulado: DNS explota"));

    const service = new ConectividadService(prisma, eventos, verificador);

    // NUNCA debe rechazar/lanzar, sin importar cuantas veces se llame.
    await expect(service.ejecutarCicloVerificacion()).resolves.toBeDefined();
    const r2 = await service.ejecutarCicloVerificacion();

    // Una excepcion en TODOS los hosts se trata igual que "todos inalcanzables".
    expect(r2.transicion?.estadoNuevo).toBe("sin_conexion");
    expect(emitir).toHaveBeenCalledTimes(1);
  });

  it("DEFENSIVO: si EventosService.emitir() falla justo en la transicion, el ciclo NO se cae y el estado igual queda confirmado", async () => {
    const { prisma, eventos, emitir, verificador, verificar } = crearMocks();
    verificar.mockResolvedValue(false);
    emitir.mockRejectedValue(new Error("bug simulado: DB caida"));

    const service = new ConectividadService(prisma, eventos, verificador);
    await service.ejecutarCicloVerificacion();

    await expect(service.ejecutarCicloVerificacion()).resolves.toBeDefined();
    // El estado en memoria SI se actualizo (la maquina de estado no depende
    // de que la persistencia del evento haya tenido exito).
    expect(service.obtenerEstadoActual().estado).toBe("sin_conexion");
  });

  it("un host individual que lanza (no todos) no tumba Promise.all: cuenta solo ese host como fallo", async () => {
    const { prisma, eventos, emitir, verificador, verificar } = crearMocks();
    verificar.mockImplementation(async (host: string) => {
      if (host === "https://a.test") throw new Error("bug simulado en un solo host");
      return true; // b y c estan bien
    });

    const service = new ConectividadService(prisma, eventos, verificador);
    await service.ejecutarCicloVerificacion();
    const r2 = await service.ejecutarCicloVerificacion();

    // 1 de 3 "fallo" (por excepcion) -> degradado, NO sin_conexion, y sin lanzar.
    expect(r2.transicion?.estadoNuevo).toBe("degradado");
  });
});

describe("ConectividadService.onModuleInit — restauracion de estado (mocks)", () => {
  const ENV_KEYS = ["CONECTIVIDAD_HOSTS", "CONECTIVIDAD_INTERVALO_MS", "UBICACION_PILOTO_ID"] as const;
  let backup: Record<string, string | undefined>;

  beforeEach(() => {
    backup = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
    process.env.CONECTIVIDAD_HOSTS = "https://a.test";
    process.env.CONECTIVIDAD_INTERVALO_MS = "3600000"; // no queremos que el timer real dispare durante el test
    process.env.UBICACION_PILOTO_ID = "ubic-test";
  });

  afterEach(() => {
    for (const k of ENV_KEYS) {
      if (backup[k] === undefined) delete process.env[k];
      else process.env[k] = backup[k];
    }
  });

  function crearMocks(findFirstImpl: () => unknown) {
    const findFirst = jest.fn(findFirstImpl);
    const prisma = { eventoDominio: { findFirst } } as unknown as PrismaService;
    const eventos = { emitir: jest.fn() } as unknown as EventosService;
    const verificador = { verificar: jest.fn().mockResolvedValue(true) } as unknown as VerificadorRed;
    return { prisma, eventos, verificador };
  }

  it("restaura el estado desde el ultimo EventoDominio ConectividadCambiada si existe", async () => {
    const { prisma, eventos, verificador } = crearMocks(() => ({
      ocurridoEn: new Date("2026-07-18T12:00:00Z"),
      payload: { estadoAnterior: "en_linea", estadoNuevo: "sin_conexion", desde: "x", hasta: "y", duracionMs: 1 },
    }));

    const service = new ConectividadService(prisma, eventos, verificador);
    await service.onModuleInit();
    try {
      expect(service.obtenerEstadoActual().estado).toBe("sin_conexion");
      expect(service.obtenerEstadoActual().desde).toBe("2026-07-18T12:00:00.000Z");
    } finally {
      service.onModuleDestroy();
    }
  });

  it("si no hay historial previo, se queda con el default en_linea (no rompe)", async () => {
    const { prisma, eventos, verificador } = crearMocks(() => null);

    const service = new ConectividadService(prisma, eventos, verificador);
    await service.onModuleInit();
    try {
      expect(service.obtenerEstadoActual().estado).toBe("en_linea");
    } finally {
      service.onModuleDestroy();
    }
  });

  it("DEFENSIVO: si Prisma falla al intentar restaurar el estado, el arranque NO se rompe (se asume en_linea)", async () => {
    const { prisma, eventos, verificador } = crearMocks(() => {
      throw new Error("bug simulado: Postgres no disponible todavia");
    });

    const service = new ConectividadService(prisma, eventos, verificador);
    await expect(service.onModuleInit()).resolves.toBeUndefined();
    try {
      expect(service.obtenerEstadoActual().estado).toBe("en_linea");
    } finally {
      service.onModuleDestroy();
    }
  });
});
