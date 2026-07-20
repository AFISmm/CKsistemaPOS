/**
 * Unit test puro (sin red, sin NestJS DI) de la logica de branching
 * real-vs-simulador del adaptador de impresora (F2-T4), mismo estilo que
 * test/unit/mtls-config.spec.ts (F1-T5):
 *   - Sin IMPRESORA_HOST -> simulador (DEFAULT, para sandbox/dev sin hardware).
 *   - Con IMPRESORA_HOST -> real, con IMPRESORA_PUERTO (o 9100 default).
 */
import { resolverConfigImpresora, leerConfigImpresoraEnv, type ConfigImpresoraEnv } from "../../src/hardware/hardware-config";

describe("resolverConfigImpresora (branching puro)", () => {
  it("cae a simulador si IMPRESORA_HOST no esta definido", () => {
    const config = resolverConfigImpresora({});
    expect(config.modo).toBe("simulador");
  });

  it("cae a simulador si IMPRESORA_HOST es string vacio o solo espacios", () => {
    const casos: ConfigImpresoraEnv[] = [{ host: "" }, { host: "   " }];
    for (const env of casos) {
      expect(resolverConfigImpresora(env).modo).toBe("simulador");
    }
  });

  it("usa modo real con el puerto ESC/POS default (9100) si no se especifica IMPRESORA_PUERTO", () => {
    const config = resolverConfigImpresora({ host: "192.168.1.50" });
    expect(config).toEqual({ modo: "real", host: "192.168.1.50", puerto: 9100 });
  });

  it("usa modo real respetando un IMPRESORA_PUERTO explicito", () => {
    const config = resolverConfigImpresora({ host: "192.168.1.50", puerto: "9200" });
    expect(config).toEqual({ modo: "real", host: "192.168.1.50", puerto: 9200 });
  });

  it("recae al puerto default si IMPRESORA_PUERTO no es un numero valido", () => {
    const config = resolverConfigImpresora({ host: "192.168.1.50", puerto: "no-es-un-numero" });
    expect(config).toEqual({ modo: "real", host: "192.168.1.50", puerto: 9100 });
  });

  it("recorta espacios del host antes de decidir el modo", () => {
    const config = resolverConfigImpresora({ host: "  192.168.1.50  " });
    expect(config).toEqual({ modo: "real", host: "192.168.1.50", puerto: 9100 });
  });
});

describe("leerConfigImpresoraEnv (punto de entrada real via process.env)", () => {
  const ENV_KEYS = ["IMPRESORA_HOST", "IMPRESORA_PUERTO"] as const;
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

  it("lee undefined si las env vars no estan definidas", () => {
    expect(leerConfigImpresoraEnv()).toEqual({ host: undefined, puerto: undefined });
  });

  it("lee los valores reales de process.env cuando estan definidos", () => {
    process.env.IMPRESORA_HOST = "10.0.0.5";
    process.env.IMPRESORA_PUERTO = "9100";
    expect(leerConfigImpresoraEnv()).toEqual({ host: "10.0.0.5", puerto: "9100" });
  });
});

describe("HardwareModule — seleccion de provider end-to-end (sin red)", () => {
  const ENV_KEYS = ["IMPRESORA_HOST", "IMPRESORA_PUERTO"] as const;
  let backup: Record<string, string | undefined>;

  beforeEach(() => {
    backup = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
    for (const k of ENV_KEYS) delete process.env[k];
    jest.resetModules();
  });

  afterEach(() => {
    for (const k of ENV_KEYS) {
      if (backup[k] === undefined) delete process.env[k];
      else process.env[k] = backup[k];
    }
    jest.resetModules();
  });

  it("sin IMPRESORA_HOST, el modulo resuelve un SimuladorImpresoraAdapter", async () => {
    const { Test } = await import("@nestjs/testing");
    const { HardwareModule } = await import("../../src/hardware/hardware.module");
    const { IMPRESORA_ADAPTER } = await import("../../src/hardware/impresora-adapter.interface");
    const { SimuladorImpresoraAdapter } = await import("../../src/hardware/simulador-impresora.adapter");

    const moduleRef = await Test.createTestingModule({ imports: [HardwareModule] }).compile();
    const adapter = moduleRef.get(IMPRESORA_ADAPTER);
    expect(adapter).toBeInstanceOf(SimuladorImpresoraAdapter);
    await moduleRef.close();
  });

  it("con IMPRESORA_HOST definido, el modulo resuelve un EscPosImpresoraAdapter (sin conectar a red)", async () => {
    process.env.IMPRESORA_HOST = "192.168.1.50";
    const { Test } = await import("@nestjs/testing");
    const { HardwareModule } = await import("../../src/hardware/hardware.module");
    const { IMPRESORA_ADAPTER } = await import("../../src/hardware/impresora-adapter.interface");
    const { EscPosImpresoraAdapter } = await import("../../src/hardware/esc-pos-impresora.adapter");

    const moduleRef = await Test.createTestingModule({ imports: [HardwareModule] }).compile();
    const adapter = moduleRef.get(IMPRESORA_ADAPTER);
    expect(adapter).toBeInstanceOf(EscPosImpresoraAdapter);
    await moduleRef.close();
  });
});
