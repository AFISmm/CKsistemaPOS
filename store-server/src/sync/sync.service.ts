import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaService } from "../common/prisma/prisma.service";
import { SyncHttpClient } from "./sync-http-client";
import { calcularBackoffMs, sleep } from "./backoff";
import type { EventoOutboxDto, RespuestaSyncEventos } from "./tipos-sync";

/**
 * SyncService — agente de sincronizacion OUTBOX (tienda -> nube), F1-T5.
 *
 * Implementa arquitectura.md §4.4 punto 2-3-5:
 *   - Lee `EventoDominio` pendientes (`sincronizadoEn IS NULL`), ordenados por
 *     `ocurridoEn` (mismo criterio documentado en README.md §8, ya usado como
 *     contrato desde F1-T4).
 *   - Los envia en lotes a `POST {CLOUD_SYNC_URL}/sync/eventos`.
 *   - Solo marca `sincronizadoEn` en los `id` que la nube confirma en la
 *     respuesta (`confirmados`): un ack parcial NO marca el resto.
 *   - Si la peticion falla (red, 5xx, timeout) reintenta con backoff
 *     exponencial + jitter (ver backoff.ts), capado a `SYNC_MAX_REINTENTOS`;
 *     si se agotan los reintentos, NO se marca nada y se deja el ciclo para
 *     el proximo tick del intervalo.
 *
 * Propiedad clave de diseno (idempotencia por reinicio, verificada en
 * test/integration/sync.integration.spec.ts): como nada se marca sincronizado
 * hasta recibir el ack, un crash/reinicio en cualquier punto simplemente hace
 * que el siguiente ciclo vuelva a leer las MISMAS filas pendientes y las
 * reenvie con el MISMO `id` (UUID v7, nunca regenerado) — la nube (idempotente
 * por `id`) colapsa el reenvio sin duplicar. No hace falta estado de
 * "recuperacion de crash" separado: la tabla EventoDominio ES ese estado.
 */
@Injectable()
export class SyncService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SyncService.name);
  private intervalo?: NodeJS.Timeout;

  private readonly cloudUrl?: string;
  private readonly batchSize: number;
  private readonly maxLotesPorCiclo: number;
  private readonly maxReintentos: number;
  private readonly timeoutMs: number;
  private readonly intervaloMs: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly http: SyncHttpClient,
  ) {
    this.cloudUrl = process.env.CLOUD_SYNC_URL?.replace(/\/+$/, "");
    this.batchSize = this.leerEnteroEnv("SYNC_BATCH_SIZE", 50);
    this.maxLotesPorCiclo = this.leerEnteroEnv("SYNC_MAX_LOTES_POR_CICLO", 20);
    this.maxReintentos = this.leerEnteroEnv("SYNC_MAX_REINTENTOS", 4);
    this.timeoutMs = this.leerEnteroEnv("SYNC_TIMEOUT_MS", 10_000);
    this.intervaloMs = this.leerEnteroEnv("SYNC_INTERVALO_MS", 15_000);
  }

  /**
   * Lee un entero >= 0 de una env var. OJO: `n >= 0` (no `n > 0`) porque
   * `SYNC_MAX_REINTENTOS=0` es un valor legitimo (sin reintentos), no un
   * error de configuracion — usar `> 0` aqui trataria "0" como invalido y
   * silenciosamente volveria al default, que es exactamente el bug que este
   * comentario documenta haber evitado.
   */
  private leerEnteroEnv(nombre: string, porDefecto: number): number {
    const valor = process.env[nombre];
    if (valor === undefined || valor === "") return porDefecto;
    const n = Number(valor);
    return Number.isFinite(n) && n >= 0 ? n : porDefecto;
  }

  onModuleInit(): void {
    if (!this.cloudUrl) {
      this.logger.warn(
        "Agente de sincronizacion (outbox) DESHABILITADO: falta CLOUD_SYNC_URL en el entorno. " +
          "EventoDominio sigue acumulando eventos pendientes (sincronizadoEn IS NULL) sin drenar " +
          "hasta que se configure el endpoint de la nube.",
      );
      return;
    }
    this.logger.log(
      `Agente de sincronizacion (outbox) habilitado: ${this.cloudUrl}/sync/eventos cada ${this.intervaloMs}ms ` +
        `(lote=${this.batchSize}, mTLS=${this.http.mtlsHabilitado ? "on" : "OFF (dev)"}).`,
    );
    this.intervalo = setInterval(() => {
      this.ejecutarCicloOutbox().catch((err) =>
        this.logger.error(`Ciclo de outbox fallo de forma inesperada: ${(err as Error).message}`),
      );
    }, this.intervaloMs);
    // No debe mantener vivo el proceso el mero hecho de tener el timer armado
    // (relevante para tests/CLI cortos); en produccion el servidor HTTP ya
    // mantiene el proceso vivo igualmente.
    this.intervalo.unref?.();
  }

  onModuleDestroy(): void {
    if (this.intervalo) {
      clearInterval(this.intervalo);
      this.intervalo = undefined;
    }
  }

  /**
   * Ejecuta un ciclo completo de drenado del outbox (uno o mas lotes, hasta
   * `maxLotesPorCiclo` o hasta que no queden pendientes). Publico y idempotente
   * por diseno: se puede invocar manualmente (tests, endpoint de diagnostico
   * futuro) ademas de desde el `setInterval`.
   */
  async ejecutarCicloOutbox(): Promise<{ lotesEnviados: number; eventosConfirmados: number }> {
    if (!this.cloudUrl) {
      return { lotesEnviados: 0, eventosConfirmados: 0 };
    }

    let lotesEnviados = 0;
    let eventosConfirmados = 0;

    for (let i = 0; i < this.maxLotesPorCiclo; i++) {
      const pendientes = await this.prisma.eventoDominio.findMany({
        where: { sincronizadoEn: null },
        orderBy: { ocurridoEn: "asc" },
        take: this.batchSize,
      });

      if (pendientes.length === 0) break;

      const lote: EventoOutboxDto[] = pendientes.map((e) => ({
        id: e.id,
        tipo: e.tipo,
        agregadoTipo: e.agregadoTipo,
        agregadoId: e.agregadoId,
        ubicacionId: e.ubicacionId,
        ocurridoEn: e.ocurridoEn.toISOString(),
        version: e.version,
        payload: e.payload,
      }));

      lotesEnviados++;

      let confirmados: string[];
      try {
        confirmados = await this.enviarLoteConReintentos(lote);
      } catch (err) {
        this.logger.error(
          `Ciclo de outbox: lote de ${lote.length} eventos fallo tras agotar reintentos (${(err as Error).message}). ` +
            "No se marca nada como sincronizado; se reintentara en el proximo ciclo con las MISMAS filas/ids.",
        );
        break;
      }

      if (confirmados.length > 0) {
        await this.marcarSincronizados(confirmados);
        eventosConfirmados += confirmados.length;
      }

      if (confirmados.length < lote.length) {
        const noConfirmados = lote.length - confirmados.length;
        this.logger.warn(
          `Ciclo de outbox: ack parcial, ${confirmados.length}/${lote.length} confirmados ` +
            `(${noConfirmados} quedan pendientes para el proximo ciclo).`,
        );
        // No seguimos pidiendo mas lotes en este mismo ciclo: los no
        // confirmados volveran a salir primero (mismo orden por ocurridoEn)
        // en el proximo tick.
        break;
      }
    }

    return { lotesEnviados, eventosConfirmados };
  }

  /** Marca exactamente los `id` confirmados (nunca mas, nunca menos) como sincronizados. */
  private async marcarSincronizados(ids: string[]): Promise<void> {
    await this.prisma.eventoDominio.updateMany({
      where: { id: { in: ids } },
      data: { sincronizadoEn: new Date() },
    });
  }

  /** POST del lote con backoff exponencial + jitter; lanza si se agotan los reintentos. */
  private async enviarLoteConReintentos(lote: EventoOutboxDto[]): Promise<string[]> {
    let ultimoError: unknown;

    for (let intento = 0; intento <= this.maxReintentos; intento++) {
      try {
        const resp = await this.http.postJson<RespuestaSyncEventos>(
          `${this.cloudUrl}/sync/eventos`,
          { eventos: lote },
          this.timeoutMs,
        );

        if (resp.status >= 200 && resp.status < 300) {
          return Array.isArray(resp.body?.confirmados) ? resp.body.confirmados : [];
        }
        throw new Error(`la nube respondio status ${resp.status}`);
      } catch (err) {
        ultimoError = err;
        if (intento < this.maxReintentos) {
          const espera = calcularBackoffMs(intento);
          this.logger.warn(
            `POST /sync/eventos intento ${intento + 1}/${this.maxReintentos + 1} fallo ` +
              `(${(err as Error).message}); reintentando en ${espera}ms.`,
          );
          await sleep(espera);
        }
      }
    }

    throw ultimoError instanceof Error ? ultimoError : new Error(String(ultimoError));
  }
}
