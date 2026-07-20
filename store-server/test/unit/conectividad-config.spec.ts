/**
 * Unit test puro (sin red, sin NestJS DI) del parseo/branching de
 * configuracion del monitoreo de conectividad (F3-T2), mismo estilo que
 * test/unit/hardware-config.spec.ts / test/unit/mtls-config.spec.ts.
 */
import {
  HOSTS_CONECTIVIDAD_DEFAULT,
  leerConfigConectividadEnv,
  resolverConfigConectividad,
  resolverHostsConectividad,
  type ConfigConectividadEnvRaw,
} from "../../src/conectividad/conectividad-config";

describe("resolverHostsConectividad (branching puro)", () => {
  it("usa el default (3 proveedores distintos) si no hay CONECTIVIDAD_HOSTS", () => {
    expect(resolverHostsConectividad(undefined)).toEqual([...HOSTS_CONECTIVIDAD_DEFAULT]);
    expect(resolverHostsConectividad("")).toEqual([...HOSTS_CONECTIVIDAD_DEFAULT]);
    expect(resolverHostsConectividad("   ")).toEqual([...HOSTS_CONECTIVIDAD_DEFAULT]);
  });

  it("parsea una lista separada por comas, recortando espacios", () => {
    expect(resolverHostsConectividad("https://a.test, https://b.test ,https://c.test")).toEqual([
      "https://a.test",
      "https://b.test",
      "https://c.test",
    ]);
  });

  it("descarta entradas vacias (comas sueltas) sin romper", () => {
    expect(resolverHostsConectividad("https://a.test,,https://b.test,")).toEqual(["https://a.test", "https://b.test"]);
  });

  it("cae al default si, tras limpiar, no queda ningun host valido", () => {
    expect(resolverHostsConectividad(",,,")).toEqual([...HOSTS_CONECTIVIDAD_DEFAULT]);
  });
});

describe("resolverConfigConectividad (defaults + parseo de enteros)", () => {
  it("usa todos los defaults documentados si no se provee nada", () => {
    expect(resolverConfigConectividad({})).toEqual({
      hosts: [...HOSTS_CONECTIVIDAD_DEFAULT],
      intervaloMs: 20_000,
      timeoutMs: 5_000,
      minFallosParaDegradado: 1,
      confirmacionesRequeridas: 2,
      ubicacionId: "ubic-miami-fl",
      historialMax: 20,
    });
  });

  it("respeta valores explicitos validos", () => {
    const env: ConfigConectividadEnvRaw = {
      hosts: "https://x.test",
      intervaloMs: "5000",
      timeoutMs: "1000",
      minFallosParaDegradado: "2",
      confirmacionesRequeridas: "3",
      ubicacionId: "  ubic-otra  ",
      historialMax: "50",
    };
    expect(resolverConfigConectividad(env)).toEqual({
      hosts: ["https://x.test"],
      intervaloMs: 5000,
      timeoutMs: 1000,
      minFallosParaDegradado: 2,
      confirmacionesRequeridas: 3,
      ubicacionId: "ubic-otra",
      historialMax: 50,
    });
  });

  it("recae al default en cualquier entero invalido (no numerico, negativo o cero)", () => {
    const env: ConfigConectividadEnvRaw = {
      intervaloMs: "no-es-un-numero",
      timeoutMs: "-5",
      minFallosParaDegradado: "0",
      confirmacionesRequeridas: "",
    };
    const config = resolverConfigConectividad(env);
    expect(config.intervaloMs).toBe(20_000);
    expect(config.timeoutMs).toBe(5_000);
    expect(config.minFallosParaDegradado).toBe(1);
    expect(config.confirmacionesRequeridas).toBe(2);
  });

  it("recae al default de ubicacionId si viene vacio o solo espacios", () => {
    expect(resolverConfigConectividad({ ubicacionId: "   " }).ubicacionId).toBe("ubic-miami-fl");
    expect(resolverConfigConectividad({ ubicacionId: undefined }).ubicacionId).toBe("ubic-miami-fl");
  });
});

describe("leerConfigConectividadEnv (punto de entrada real via process.env)", () => {
  const ENV_KEYS = [
    "CONECTIVIDAD_HOSTS",
    "CONECTIVIDAD_INTERVALO_MS",
    "CONECTIVIDAD_TIMEOUT_MS",
    "CONECTIVIDAD_MIN_FALLOS_DEGRADADO",
    "CONECTIVIDAD_CONFIRMACIONES_REQUERIDAS",
    "UBICACION_PILOTO_ID",
    "CONECTIVIDAD_HISTORIAL_MAX",
  ] as const;
  let backup: Record<string, string | undefined>;

  beforeEach(() => {
    backup = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
    for (const k of ENV_KEYS) delete process.env[k];
  });

  afterEach(() => {
    for (const k of ENV_KEYS) {
      if (backup[k] === undefined) delete process.env[k];
      else process.env[k] = backup[k];
    }
  });

  it("lee undefined para todo si no hay nada definido", () => {
    expect(leerConfigConectividadEnv()).toEqual({
      hosts: undefined,
      intervaloMs: undefined,
      timeoutMs: undefined,
      minFallosParaDegradado: undefined,
      confirmacionesRequeridas: undefined,
      ubicacionId: undefined,
      historialMax: undefined,
    });
  });

  it("lee los valores reales de process.env, incluyendo UBICACION_PILOTO_ID (ya existente desde F1-T1)", () => {
    process.env.CONECTIVIDAD_HOSTS = "https://a.test";
    process.env.CONECTIVIDAD_INTERVALO_MS = "9000";
    process.env.UBICACION_PILOTO_ID = "ubic-austin-tx";

    expect(leerConfigConectividadEnv()).toMatchObject({
      hosts: "https://a.test",
      intervaloMs: "9000",
      ubicacionId: "ubic-austin-tx",
    });
  });
});
