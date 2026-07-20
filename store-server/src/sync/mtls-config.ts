import { readFileSync } from "node:fs";

/**
 * Resolucion de configuracion mTLS para el cliente de sincronizacion
 * (F1-T5, ADR-0005 "Cifrado y secretos": mTLS obligatorio tienda<->nube,
 * certificados NUNCA hardcodeados ni commiteados).
 *
 * Los certificados se cargan SOLO por ruta de archivo via variables de
 * entorno (`MTLS_CERT_PATH`, `MTLS_KEY_PATH`, `MTLS_CA_PATH`), nunca embebidos
 * en codigo/config del repo. El gestor de secretos de la tienda (fuera de
 * alcance de este repo) es responsable de materializar esos archivos en disco
 * antes de arrancar el proceso.
 *
 * Si las tres variables no estan definidas, se cae a HTTP/HTTPS simple SIN
 * mTLS. Esto es una conveniencia deliberada de DESARROLLO LOCAL (para poder
 * correr contra el mock-cloud de test sin generar certificados) y NUNCA es
 * aceptable para trafico tienda<->nube real: el llamador (SyncHttpClient)
 * debe loguear un warning explicito cuando esto ocurre.
 */
export interface ConfigMtlsEnv {
  certPath?: string;
  keyPath?: string;
  caPath?: string;
}

export type ConfigMtls =
  | { habilitado: true; cert: Buffer; key: Buffer; ca: Buffer }
  | { habilitado: false };

/**
 * Pura respecto a `env`; el unico efecto lateral (lectura de disco) pasa por
 * `leerArchivo`, inyectable para poder testear la logica de branching sin
 * certificados reales en disco (ver test/unit/mtls-config.spec.ts).
 */
export function resolverConfigMtls(
  env: ConfigMtlsEnv,
  leerArchivo: (ruta: string) => Buffer = (ruta) => readFileSync(ruta),
): ConfigMtls {
  const { certPath, keyPath, caPath } = env;

  if (certPath && keyPath && caPath) {
    return {
      habilitado: true,
      cert: leerArchivo(certPath),
      key: leerArchivo(keyPath),
      ca: leerArchivo(caPath),
    };
  }

  // Cualquier subconjunto parcial (ej. solo cert sin key) tambien cae a
  // deshabilitado: mTLS es todo-o-nada, un cert sin key no sirve.
  return { habilitado: false };
}

/** Lee las 3 env vars de mTLS desde `process.env` (punto de entrada real). */
export function leerConfigMtlsEnv(): ConfigMtlsEnv {
  return {
    certPath: process.env.MTLS_CERT_PATH,
    keyPath: process.env.MTLS_KEY_PATH,
    caPath: process.env.MTLS_CA_PATH,
  };
}
