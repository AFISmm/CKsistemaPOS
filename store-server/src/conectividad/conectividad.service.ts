import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaService } from "../common/prisma/prisma.service";
import { EventosService } from "../common/eventos/eventos.service";
import { EVENTOS_DOMINIO } from "../common/eventos/tipos-evento";
import type { ConectividadCambiadaPayload } from "../common/eventos/tipos-evento";
import { VerificadorRed } from "./verificador-red";
import { leerConfigConectividadEnv, resolverConfigConectividad, type ConfigConectividad } from "./conectividad-config";
import {
  MaquinaEstadoConectividad,
  type EstadoConectividad,
  type TransicionEstadoConectividad,
} from "./estado-conectividad";

const AGREGADO_TIPO_CONECTIVIDAD = "Conectividad";

export interface EstadoConectividadActual {
  estado: EstadoConectividad;
  /** ISO datetime: desde cuando esta vigente `estado`. */
  desde: string;
  /** ISO datetime del ultimo ciclo de verificacion ejecutado, o null si todavia no corrio ninguno. */
  ultimaVerificacion: string | null;
}

/**
 * ConectividadService — monitoreo de conectividad a internet por tienda con
 * alertas tempranas (F3-T2, PLAN_DE_PRODUCCION.md Fase 3).
 *
 * Por que existe ADEMAS de SyncService/InboxService (F1-T5, `src/sync/`):
 * el agente de sincronizacion YA detecta implicitamente la caida de internet
 * (un POST /sync/eventos que falla = no hay internet), pero solo lo hace
 * cada `SYNC_INTERVALO_MS` (default 15s) Y solo como efecto secundario de
 * intentar drenar el outbox — si el outbox esta vacio (tienda tranquila,
 * pocos eventos), pueden pasar minutos sin que nadie note que la tienda esta
 * offline. Este servicio es una SENAL NUEVA, independiente y mas rapida
 * (default 20s, pero pensada para poder bajarse mucho mas): no le pregunta
 * nada a la nube de negocio, solo verifica alcance de red contra un puñado de
 * hosts publicos confiables, para poder avisarle al gerente ANTES de que el
 * corte se vuelva un problema de sincronizacion. Deliberadamente NO toca
 * `src/sync/*` (owned/terminado por F1-T5): son dos fuentes de verdad
 * distintas que conviven sin que una dependa de la otra.
 *
 * Persistencia (decision documentada, ver store-server/README.md seccion
 * nueva): las transiciones de estado se emiten como EventoDominio con tipo
 * `ConectividadCambiada` (via EventosService.emitir, igual que cualquier otro
 * evento de negocio) en vez de como EventoDeAuditoria o una tabla nueva
 * dedicada:
 *  - EventoDeAuditoria (RNF-07/C-AUDIT) es para ACCIONES de un usuario
 *    (descuento, reembolso, ajuste de inventario...) con `usuarioId`/`motivo`
 *    de una lista cerrada; una caida de internet no la "hace" ningun
 *    usuario, no encaja en ese contrato.
 *  - Reutilizar EventoDominio (en vez de crear una tabla nueva) da GRATIS:
 *    persistencia atomica + push WS (EventosGateway) + sincronizacion a la
 *    nube con el MISMO mecanismo de F1-T5 (SyncService ya drena cualquier
 *    EventoDominio pendiente, sin cambios) — el historial de caidas de una
 *    tienda queda disponible para un futuro dashboard corporativo sin escribir
 *    una sola linea de codigo de sync nueva. El costo es cero migraciones de
 *    Prisma para este modulo (no se toco schema.prisma).
 *  - El estado ACTUAL (no el historial) vive en memoria de proceso
 *    (`obtenerEstadoActual()`) y se re-siembra al arrancar desde el ULTIMO
 *    EventoDominio `ConectividadCambiada` (best-effort, ver
 *    `seedEstadoDesdeHistorial`); no hace falta una fila "estado actual"
 *    separada en DB para esto.
 */
@Injectable()
export class ConectividadService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ConectividadService.name);
  private intervalo?: NodeJS.Timeout;
  private ultimaVerificacion: Date | null = null;

  private readonly config: ConfigConectividad;
  private readonly maquina: MaquinaEstadoConectividad;

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventos: EventosService,
    private readonly verificador: VerificadorRed,
  ) {
    this.config = resolverConfigConectividad(leerConfigConectividadEnv());
    this.maquina = new MaquinaEstadoConectividad({
      minFallosParaDegradado: this.config.minFallosParaDegradado,
      confirmacionesRequeridas: this.config.confirmacionesRequeridas,
    });
  }

  get ubicacionIdConfigurada(): string {
    return this.config.ubicacionId;
  }

  get historialMaxConfigurado(): number {
    return this.config.historialMax;
  }

  async onModuleInit(): Promise<void> {
    await this.seedEstadoDesdeHistorial();

    this.logger.log(
      `Monitoreo de conectividad habilitado: ${this.config.hosts.length} host(s) cada ${this.config.intervaloMs}ms ` +
        `(umbral degradado>=${this.config.minFallosParaDegradado} fallo(s) de ${this.config.hosts.length}, ` +
        `confirmaciones consecutivas=${this.config.confirmacionesRequeridas}).`,
    );

    this.intervalo = setInterval(() => {
      this.ejecutarCicloVerificacion().catch((err) =>
        // Defensa de ultimo nivel: esto NUNCA deberia dispararse (el propio
        // ejecutarCicloVerificacion atrapa todo internamente), pero si un bug
        // futuro rompiera esa garantia, un timer que lanza sin catch mataria
        // el proceso Node completo (incluida la venta) — jamas aceptable para
        // un modulo de monitoreo, ver PLAN_DE_PRODUCCION.md F3-T2.
        this.logger.error(`Ciclo de verificacion de conectividad fallo de forma inesperada: ${(err as Error)?.message ?? err}`),
      );
    }, this.config.intervaloMs);
    this.intervalo.unref?.();
  }

  onModuleDestroy(): void {
    if (this.intervalo) {
      clearInterval(this.intervalo);
      this.intervalo = undefined;
    }
  }

  /** Snapshot en memoria, usado por ConectividadController (GET /api/v1/conectividad/estado). */
  obtenerEstadoActual(): EstadoConectividadActual {
    return {
      estado: this.maquina.estado,
      desde: this.maquina.desde.toISOString(),
      ultimaVerificacion: this.ultimaVerificacion ? this.ultimaVerificacion.toISOString() : null,
    };
  }

  /**
   * Ejecuta UN ciclo de verificacion: consulta todos los hosts configurados
   * en paralelo, evalua la maquina de estado y, si hubo una transicion
   * CONFIRMADA, la persiste/emite. Publico e idempotente por diseno (se puede
   * invocar manualmente desde tests ademas de desde el `setInterval`).
   *
   * GARANTIA CENTRAL (pedida explicitamente por la tarea): esta funcion NUNCA
   * lanza. Un bug en la verificacion de un host, en la maquina de estado, o
   * al persistir la transicion queda contenido y logueado; jamas debe poder
   * tumbar o bloquear el camino de venta del Store Server.
   */
  async ejecutarCicloVerificacion(): Promise<{ estado: EstadoConectividad; transicion: TransicionEstadoConectividad | null }> {
    const ahora = new Date();
    let resultados: boolean[];

    try {
      resultados = await Promise.all(
        this.config.hosts.map((host) =>
          this.verificador.verificar(host, this.config.timeoutMs).catch((err: unknown) => {
            // Defensivo: VerificadorRed.verificar() esta documentado para
            // nunca lanzar, pero si un bug lo hiciera, un host individual que
            // explota NO debe tumbar Promise.all para todos los demas — se
            // cuenta como "no alcanzable" y el ciclo sigue.
            this.logger.debug(
              `Verificacion de host de conectividad '${host}' lanzo una excepcion (se cuenta como fallo): ${(err as Error)?.message ?? err}`,
            );
            return false;
          }),
        ),
      );
    } catch (err) {
      // Defensa de ultimo nivel: no deberia poder llegar aqui (cada promesa ya
      // atrapa su propio error arriba), pero si algo inesperado rompiera el
      // mapeo/Promise.all en si, el ciclo se registra como "sin datos" (0
      // hosts respondidos) y CONTINUA en vez de propagar.
      this.logger.error(`Ciclo de verificacion de conectividad fallo de forma inesperada al consultar hosts: ${(err as Error)?.message ?? err}`);
      resultados = [];
    }

    this.ultimaVerificacion = ahora;

    let transicion: TransicionEstadoConectividad | null = null;
    try {
      transicion = this.maquina.evaluar(resultados, ahora);
    } catch (err) {
      this.logger.error(`La maquina de estado de conectividad fallo evaluando el ciclo (no deberia, es codigo puro): ${(err as Error)?.message ?? err}`);
    }

    if (transicion) {
      await this.registrarTransicion(transicion).catch((err) =>
        this.logger.error(
          `No se pudo registrar/emitir la transicion de conectividad (${transicion!.estadoAnterior} -> ${transicion!.estadoNuevo}): ${(err as Error)?.message ?? err}`,
        ),
      );
    }

    return { estado: this.maquina.estado, transicion };
  }

  /**
   * Emite `ConectividadCambiada` (EventosService.emitir hace, en una sola
   * llamada, las 3 cosas de siempre: persistir EventoDominio + push WS +
   * bus interno de proceso — ver common/eventos/eventos.service.ts). Tambien
   * loguea la transicion a nivel `warn` (visible en logs del Store Server sin
   * necesitar un dashboard).
   */
  private async registrarTransicion(transicion: TransicionEstadoConectividad): Promise<void> {
    const payload: ConectividadCambiadaPayload = {
      estadoAnterior: transicion.estadoAnterior,
      estadoNuevo: transicion.estadoNuevo,
      desde: transicion.desde.toISOString(),
      hasta: transicion.hasta.toISOString(),
      duracionMs: transicion.duracionMs,
    };

    this.logger.warn(
      `Conectividad: ${transicion.estadoAnterior} -> ${transicion.estadoNuevo} ` +
        `(el estado anterior duro ${Math.round(transicion.duracionMs / 1000)}s).`,
    );

    await this.eventos.emitir({
      tipo: EVENTOS_DOMINIO.CONECTIVIDAD_CAMBIADA,
      ubicacionId: this.config.ubicacionId,
      agregadoTipo: AGREGADO_TIPO_CONECTIVIDAD,
      agregadoId: this.config.ubicacionId,
      payload,
    });
  }

  /**
   * Best-effort: al arrancar, intenta reconstruir el ULTIMO estado conocido
   * desde el EventoDominio `ConectividadCambiada` mas reciente de esta
   * ubicacion (si el proceso se reinicio, no queremos "olvidar" que ya
   * estabamos en `sin_conexion` y reportar `en_linea` erroneamente hasta que
   * se cumplan las confirmaciones de nuevo). Si falla por CUALQUIER motivo
   * (DB no disponible todavia en el arranque, tabla vacia porque es la
   * primera vez que corre esta tienda, etc.) se cae silenciosamente al
   * default (`en_linea` desde ahora) — JAMAS bloquea ni retrasa el arranque
   * del Store Server por esto.
   */
  private async seedEstadoDesdeHistorial(): Promise<void> {
    try {
      const ultimo = await this.prisma.eventoDominio.findFirst({
        where: { tipo: EVENTOS_DOMINIO.CONECTIVIDAD_CAMBIADA, ubicacionId: this.config.ubicacionId },
        orderBy: { ocurridoEn: "desc" },
      });
      if (!ultimo) return;

      const payload = ultimo.payload as unknown as ConectividadCambiadaPayload;
      const estadoNuevo = payload?.estadoNuevo as EstadoConectividad | undefined;
      if (estadoNuevo !== "en_linea" && estadoNuevo !== "degradado" && estadoNuevo !== "sin_conexion") {
        return; // payload inesperado/corrupto: se ignora, no se rompe el arranque
      }

      this.maquina.restaurar(estadoNuevo, ultimo.ocurridoEn);
      this.logger.log(`Estado de conectividad restaurado desde el historial: ${estadoNuevo} (vigente desde ${ultimo.ocurridoEn.toISOString()}).`);
    } catch (err) {
      this.logger.warn(
        `No se pudo restaurar el estado de conectividad previo desde EventoDominio (se asume en_linea desde el arranque): ${(err as Error)?.message ?? err}`,
      );
    }
  }
}
