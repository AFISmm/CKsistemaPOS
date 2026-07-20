import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaService } from "../common/prisma/prisma.service";
import { SyncHttpClient } from "./sync-http-client";
import type { CambioConfigInbox, RespuestaSyncConfig } from "./tipos-sync";

const ID_ESTADO_INBOX = "inbox";

/**
 * InboxService — agente de sincronizacion INBOX (nube -> tienda), F1-T5.
 *
 * Implementa arquitectura.md §4.4 punto 4 y §4.5 (resolucion de conflictos de
 * catalogo/config): consulta periodicamente `GET /sync/config?desde=version`
 * y aplica los cambios recibidos localmente por `id`/`version` con
 * **Last-Writer-Wins**: un cambio entrante solo se aplica si su `version` es
 * ESTRICTAMENTE mayor a la version local del registro (o si el registro no
 * existe localmente todavia).
 *
 * Alcance deliberado (no sobre-construir, ver tarea F1-T5): hoy no existe una
 * nube real con catalogo maestro (eso es Fase 5). Este servicio implementa el
 * mecanismo GENERICO de aplicar `cambios` versionados, y provee UN ejemplo
 * concreto (`ReglaDeImpuesto`) para probar que el mecanismo funciona
 * end-to-end. Agregar mas entidades a `aplicarCambio()` cuando haya un caso de
 * uso real (catalogo/precios multi-tienda); no se anticipa aqui.
 */
@Injectable()
export class InboxService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(InboxService.name);
  private intervalo?: NodeJS.Timeout;

  private readonly cloudUrl?: string;
  private readonly timeoutMs: number;
  private readonly intervaloMs: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly http: SyncHttpClient,
  ) {
    this.cloudUrl = process.env.CLOUD_SYNC_URL?.replace(/\/+$/, "");
    this.timeoutMs = this.leerEnteroEnv("SYNC_TIMEOUT_MS", 10_000);
    this.intervaloMs = this.leerEnteroEnv("SYNC_INBOX_INTERVALO_MS", 30_000);
  }

  /** Ver el comentario equivalente en SyncService: `n >= 0`, no `n > 0`. */
  private leerEnteroEnv(nombre: string, porDefecto: number): number {
    const valor = process.env[nombre];
    if (valor === undefined || valor === "") return porDefecto;
    const n = Number(valor);
    return Number.isFinite(n) && n >= 0 ? n : porDefecto;
  }

  onModuleInit(): void {
    if (!this.cloudUrl) {
      this.logger.warn(
        "Agente de sincronizacion (inbox) DESHABILITADO: falta CLOUD_SYNC_URL en el entorno. " +
          "No se consultaran cambios de configuracion de la nube.",
      );
      return;
    }
    this.logger.log(
      `Agente de sincronizacion (inbox) habilitado: GET ${this.cloudUrl}/sync/config cada ${this.intervaloMs}ms.`,
    );
    this.intervalo = setInterval(() => {
      this.ejecutarCicloInbox().catch((err) =>
        this.logger.error(`Ciclo de inbox fallo de forma inesperada: ${(err as Error).message}`),
      );
    }, this.intervaloMs);
    this.intervalo.unref?.();
  }

  onModuleDestroy(): void {
    if (this.intervalo) {
      clearInterval(this.intervalo);
      this.intervalo = undefined;
    }
  }

  /** Lee (o crea en 0) el cursor de version local del inbox. */
  private async obtenerEstado(): Promise<{ ultimaVersionAplicada: number }> {
    const estado = await this.prisma.syncEstado.upsert({
      where: { id: ID_ESTADO_INBOX },
      create: { id: ID_ESTADO_INBOX, ultimaVersionAplicada: 0 },
      update: {},
    });
    return { ultimaVersionAplicada: estado.ultimaVersionAplicada };
  }

  /**
   * Ejecuta un ciclo de pull del inbox: pide los cambios desde el cursor
   * local, los aplica uno a uno (LWW) y avanza el cursor a la version mas
   * alta vista. Publico e idempotente: reintentar el mismo ciclo (misma
   * respuesta de la nube) no duplica nada porque `aplicarCambio` compara
   * versiones antes de escribir.
   */
  async ejecutarCicloInbox(): Promise<{ aplicados: number; ignorados: number }> {
    if (!this.cloudUrl) {
      return { aplicados: 0, ignorados: 0 };
    }

    const estado = await this.obtenerEstado();

    let respuesta: RespuestaSyncConfig;
    try {
      const resp = await this.http.getJson<RespuestaSyncConfig>(
        `${this.cloudUrl}/sync/config?desde=${estado.ultimaVersionAplicada}`,
        this.timeoutMs,
      );
      if (resp.status < 200 || resp.status >= 300) {
        throw new Error(`la nube respondio status ${resp.status}`);
      }
      respuesta = resp.body;
    } catch (err) {
      this.logger.error(
        `Ciclo de inbox: fallo consultando /sync/config (${(err as Error).message}); se reintenta en el proximo tick.`,
      );
      return { aplicados: 0, ignorados: 0 };
    }

    const cambios = Array.isArray(respuesta?.cambios) ? respuesta.cambios : [];
    if (cambios.length === 0) {
      return { aplicados: 0, ignorados: 0 };
    }

    let aplicados = 0;
    let ignorados = 0;
    let versionMaxima = estado.ultimaVersionAplicada;

    for (const cambio of cambios) {
      const seAplico = await this.aplicarCambio(cambio);
      if (seAplico) aplicados++;
      else ignorados++;
      if (cambio.version > versionMaxima) versionMaxima = cambio.version;
    }

    if (versionMaxima > estado.ultimaVersionAplicada) {
      await this.prisma.syncEstado.update({
        where: { id: ID_ESTADO_INBOX },
        data: { ultimaVersionAplicada: versionMaxima },
      });
    }

    return { aplicados, ignorados };
  }

  /** Despacha por `entidad`. Devuelve true si se escribio algo, false si se ignoro (LWW o desconocido). */
  private async aplicarCambio(cambio: CambioConfigInbox): Promise<boolean> {
    switch (cambio.entidad) {
      case "ReglaDeImpuesto":
        return this.aplicarReglaDeImpuesto(cambio);
      default:
        this.logger.warn(
          `Inbox: entidad de configuracion desconocida '${cambio.entidad}' (id=${cambio.id}); se ignora ` +
            "(agregar un caso en InboxService.aplicarCambio si corresponde soportarla).",
        );
        return false;
    }
  }

  /**
   * Ejemplo concreto de upsert versionado LWW (arquitectura.md §4.5): la
   * regla entrante solo gana si su `version` es mayor a la local existente.
   * Si no existe localmente, se crea directamente.
   */
  private async aplicarReglaDeImpuesto(cambio: CambioConfigInbox): Promise<boolean> {
    const existente = await this.prisma.reglaDeImpuesto.findUnique({ where: { id: cambio.id } });

    if (existente && existente.version >= cambio.version) {
      this.logger.debug(
        `Inbox: ReglaDeImpuesto ${cambio.id} ignorada (version local ${existente.version} >= entrante ${cambio.version}).`,
      );
      return false;
    }

    const datos = cambio.datos;
    await this.prisma.reglaDeImpuesto.upsert({
      where: { id: cambio.id },
      create: {
        id: cambio.id,
        ubicacionId: String(datos.ubicacionId),
        jurisdiccion: String(datos.jurisdiccion),
        nombre: String(datos.nombre),
        tasa: datos.tasa as never,
        vigenteDesde: new Date(datos.vigenteDesde as string),
        vigenteHasta: datos.vigenteHasta ? new Date(datos.vigenteHasta as string) : null,
        aplicaAExentos: Boolean(datos.aplicaAExentos ?? false),
        version: cambio.version,
      },
      update: {
        jurisdiccion: String(datos.jurisdiccion),
        nombre: String(datos.nombre),
        tasa: datos.tasa as never,
        vigenteDesde: new Date(datos.vigenteDesde as string),
        vigenteHasta: datos.vigenteHasta ? new Date(datos.vigenteHasta as string) : null,
        aplicaAExentos: Boolean(datos.aplicaAExentos ?? false),
        version: cambio.version,
      },
    });
    this.logger.log(`Inbox: ReglaDeImpuesto ${cambio.id} aplicada (version ${cambio.version}).`);
    return true;
  }
}
