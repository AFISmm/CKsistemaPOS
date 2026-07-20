import * as http from "node:http";
import * as https from "node:https";
import { URL } from "node:url";
import { Injectable, Logger } from "@nestjs/common";

/**
 * VerificadorRed — la UNICA pieza de este modulo que toca la red real (F3-T2).
 * Mismo patron que `src/sync/sync-http-client.ts`: modulos nativos `http`/
 * `https` de Node, sin dependencia nueva de npm.
 *
 * Contrato deliberado: `verificar()` NUNCA lanza. Cualquier error (DNS, TLS,
 * conexion rechazada, timeout, URL invalida) resuelve `false` ("no
 * alcanzable"). Esto es lo que permite a `ConectividadService` tratar un host
 * caido como un dato mas del ciclo (cuenta como fallo) en vez de una
 * excepcion que haya que manejar caso por caso; `ConectividadService` de
 * todas formas envuelve la llamada en un `.catch()` adicional por si un bug
 * futuro rompiera este contrato (defensa en profundidad, ver
 * conectividad.service.ts).
 *
 * Se mockea por completo en los tests unitarios (test/unit/
 * conectividad-service.spec.ts) para no depender de internet real en CI/
 * sandbox; el propio test de este archivo (test/unit/verificador-red.spec.ts)
 * solo cubre el caso de URL invalida (falla antes de abrir cualquier socket,
 * no requiere red).
 */
@Injectable()
export class VerificadorRed {
  private readonly logger = new Logger(VerificadorRed.name);

  /**
   * HEAD primero (rapido, sin cuerpo); si el host no soporta HEAD (405/501 u
   * otro codigo de error), reintenta una vez con GET antes de declarar el
   * host inalcanzable. Se considera "alcanzable" cualquier respuesta HTTP
   * 2xx/3xx (el objetivo es confirmar que HAY conectividad de red/TLS hasta
   * el host, no validar el contenido servido).
   */
  async verificar(url: string, timeoutMs: number): Promise<boolean> {
    try {
      if (await this.intentar(url, "HEAD", timeoutMs)) return true;
      return await this.intentar(url, "GET", timeoutMs);
    } catch (err) {
      this.logger.debug(`Verificacion de conectividad a ${url} fallo inesperadamente: ${(err as Error)?.message ?? err}`);
      return false;
    }
  }

  private intentar(urlStr: string, method: "HEAD" | "GET", timeoutMs: number): Promise<boolean> {
    return new Promise((resolve) => {
      let url: URL;
      try {
        url = new URL(urlStr);
      } catch {
        resolve(false);
        return;
      }

      const lib = url.protocol === "https:" ? https : http;
      const req = lib.request(
        {
          method,
          hostname: url.hostname,
          port: url.port ? Number(url.port) : url.protocol === "https:" ? 443 : 80,
          path: `${url.pathname}${url.search}`,
          timeout: timeoutMs,
        },
        (res) => {
          res.resume(); // descarta el body: solo importa el status
          const status = res.statusCode ?? 0;
          resolve(status >= 200 && status < 400);
        },
      );

      req.on("timeout", () => req.destroy(new Error(`timeout tras ${timeoutMs}ms`)));
      req.on("error", () => resolve(false));
      req.end();
    });
  }
}
