/**
 * Unit test puro (sin red, sin certificados reales salvo el ultimo caso que
 * usa archivos temporales de contenido arbitrario) de la logica de branching
 * mTLS-vs-fallback (F1-T5, ADR-0005 "mTLS obligatorio tienda<->nube"):
 *   - Si las 3 env vars (MTLS_CERT_PATH/KEY_PATH/CA_PATH) estan presentes ->
 *     mTLS habilitado, se leen los 3 archivos.
 *   - Si falta cualquiera (incluido "ninguna", el caso de dev local) ->
 *     deshabilitado, NINGUN archivo se lee.
 */
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resolverConfigMtls, type ConfigMtlsEnv } from "../../src/sync/mtls-config";
import { SyncHttpClient } from "../../src/sync/sync-http-client";

describe("resolverConfigMtls (branching puro, sin tocar disco)", () => {
  function leerArchivoMock(contenidos: Record<string, string>) {
    return jest.fn((ruta: string) => Buffer.from(contenidos[ruta] ?? `contenido-de-${ruta}`));
  }

  it("deshabilitado y sin leer nada si no hay ninguna variable definida (caso dev local)", () => {
    const leer = leerArchivoMock({});
    const config = resolverConfigMtls({}, leer);
    expect(config.habilitado).toBe(false);
    expect(leer).not.toHaveBeenCalled();
  });

  it("deshabilitado si falta cualquiera de las 3 (mTLS es todo-o-nada)", () => {
    const casosParciales: ConfigMtlsEnv[] = [
      { certPath: "/a/cert.pem" },
      { certPath: "/a/cert.pem", keyPath: "/a/key.pem" },
      { keyPath: "/a/key.pem", caPath: "/a/ca.pem" },
      { certPath: "/a/cert.pem", caPath: "/a/ca.pem" },
    ];
    for (const env of casosParciales) {
      const leer = leerArchivoMock({});
      const config = resolverConfigMtls(env, leer);
      expect(config.habilitado).toBe(false);
      expect(leer).not.toHaveBeenCalled();
    }
  });

  it("habilitado y lee exactamente los 3 archivos cuando las 3 variables estan presentes", () => {
    const leer = leerArchivoMock({
      "/ruta/cert.pem": "CERT",
      "/ruta/key.pem": "KEY",
      "/ruta/ca.pem": "CA",
    });
    const config = resolverConfigMtls({ certPath: "/ruta/cert.pem", keyPath: "/ruta/key.pem", caPath: "/ruta/ca.pem" }, leer);

    expect(config.habilitado).toBe(true);
    if (config.habilitado) {
      expect(config.cert.toString()).toBe("CERT");
      expect(config.key.toString()).toBe("KEY");
      expect(config.ca.toString()).toBe("CA");
    }
    expect(leer).toHaveBeenCalledTimes(3);
    expect(leer).toHaveBeenCalledWith("/ruta/cert.pem");
    expect(leer).toHaveBeenCalledWith("/ruta/key.pem");
    expect(leer).toHaveBeenCalledWith("/ruta/ca.pem");
  });
});

describe("SyncHttpClient (branching real via env vars de proceso)", () => {
  const ENV_KEYS = ["MTLS_CERT_PATH", "MTLS_KEY_PATH", "MTLS_CA_PATH"] as const;
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

  it("cae a fallback (mtlsHabilitado=false) si no hay variables de entorno mTLS", () => {
    const cliente = new SyncHttpClient();
    expect(cliente.mtlsHabilitado).toBe(false);
  });

  it("habilita mTLS si las 3 variables apuntan a archivos legibles", () => {
    const dir = mkdtempSync(join(tmpdir(), "ckpos-mtls-test-"));
    try {
      const certPath = join(dir, "cert.pem");
      const keyPath = join(dir, "key.pem");
      const caPath = join(dir, "ca.pem");
      writeFileSync(certPath, "cert-dummy");
      writeFileSync(keyPath, "key-dummy");
      writeFileSync(caPath, "ca-dummy");

      process.env.MTLS_CERT_PATH = certPath;
      process.env.MTLS_KEY_PATH = keyPath;
      process.env.MTLS_CA_PATH = caPath;

      const cliente = new SyncHttpClient();
      expect(cliente.mtlsHabilitado).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
