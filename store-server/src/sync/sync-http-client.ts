import * as http from "node:http";
import * as https from "node:https";
import { URL } from "node:url";
import { Injectable, Logger } from "@nestjs/common";
import { resolverConfigMtls, leerConfigMtlsEnv } from "./mtls-config";

export interface RespuestaHttp<T = unknown> {
  status: number;
  body: T;
}

/**
 * Cliente HTTP(S) del agente de sincronizacion (F1-T5, arquitectura.md §6.4:
 * "mTLS obligatorio en ambos sentidos"). Usa los modulos nativos `http`/
 * `https` de Node (sin dependencia nueva de npm): construye un `https.Agent`
 * con cert/key/ca de cliente cuando las 3 variables `MTLS_CERT_PATH`/
 * `MTLS_KEY_PATH`/`MTLS_CA_PATH` estan presentes (ver mtls-config.ts).
 *
 * Fallback de desarrollo: si no hay mTLS configurado, se hace la peticion sin
 * agente de cliente (HTTPS simple, o HTTP plano si la URL es http:// — como
 * el mock-cloud de test). Esto se loguea siempre como warning al construir el
 * cliente: NO es aceptable para trafico tienda<->nube real (ADR-0005).
 */
@Injectable()
export class SyncHttpClient {
  private readonly logger = new Logger(SyncHttpClient.name);
  private readonly agenteHttps?: https.Agent;
  readonly mtlsHabilitado: boolean;

  constructor() {
    const config = resolverConfigMtls(leerConfigMtlsEnv());
    if (config.habilitado) {
      this.agenteHttps = new https.Agent({ cert: config.cert, key: config.key, ca: config.ca });
      this.mtlsHabilitado = true;
      this.logger.log("mTLS habilitado para sincronizacion tienda<->nube (cert/key/ca cargados por ruta de archivo).");
    } else {
      this.mtlsHabilitado = false;
      this.logger.warn(
        "mTLS DESHABILITADO para sincronizacion (faltan MTLS_CERT_PATH/MTLS_KEY_PATH/MTLS_CA_PATH). " +
          "Usando HTTP/HTTPS simple sin certificado de cliente: esto es SOLO una conveniencia de " +
          "desarrollo local (p. ej. contra el mock-cloud de test); NUNCA aceptable para trafico " +
          "tienda<->nube real (ADR-0005, arquitectura.md §7.3).",
      );
    }
  }

  async postJson<T = unknown>(url: string, payload: unknown, timeoutMs: number): Promise<RespuestaHttp<T>> {
    return this.request<T>("POST", url, payload, timeoutMs);
  }

  async getJson<T = unknown>(url: string, timeoutMs: number): Promise<RespuestaHttp<T>> {
    return this.request<T>("GET", url, undefined, timeoutMs);
  }

  private request<T>(method: string, urlStr: string, payload: unknown, timeoutMs: number): Promise<RespuestaHttp<T>> {
    return new Promise((resolve, reject) => {
      let url: URL;
      try {
        url = new URL(urlStr);
      } catch (err) {
        reject(new Error(`URL de sincronizacion invalida: ${urlStr} (${(err as Error).message})`));
        return;
      }

      const esHttps = url.protocol === "https:";
      const lib = esHttps ? https : http;
      const cuerpo = payload !== undefined ? JSON.stringify(payload) : undefined;

      const options: https.RequestOptions = {
        method,
        hostname: url.hostname,
        port: url.port ? Number(url.port) : esHttps ? 443 : 80,
        path: `${url.pathname}${url.search}`,
        headers: {
          "content-type": "application/json",
          ...(cuerpo ? { "content-length": Buffer.byteLength(cuerpo) } : {}),
        },
        timeout: timeoutMs,
        // El agente mTLS solo aplica a peticiones https:// reales hacia la
        // nube; contra el mock-cloud de test (http://localhost) no se usa.
        ...(esHttps && this.agenteHttps ? { agent: this.agenteHttps } : {}),
      };

      const req = lib.request(options, (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => {
          const raw = Buffer.concat(chunks).toString("utf8");
          let parsed: unknown = undefined;
          if (raw) {
            try {
              parsed = JSON.parse(raw);
            } catch {
              parsed = raw;
            }
          }
          resolve({ status: res.statusCode ?? 0, body: parsed as T });
        });
      });

      req.on("timeout", () => {
        req.destroy(new Error(`sync http: timeout tras ${timeoutMs}ms (${method} ${urlStr})`));
      });
      req.on("error", (err) => reject(err));

      if (cuerpo) req.write(cuerpo);
      req.end();
    });
  }
}
