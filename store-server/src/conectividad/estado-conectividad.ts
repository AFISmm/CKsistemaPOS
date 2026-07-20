/**
 * Maquina de estado de conectividad (F3-T2, PLAN_DE_PRODUCCION.md Fase 3:
 * "monitoreo de conectividad por tienda con alertas tempranas"). PURA: sin
 * Prisma, sin red, sin NestJS, sin timers — recibe desde afuera (
 * ConectividadService) los resultados booleanos de un ciclo de verificacion y
 * decide el estado. 100% testeable sin mocks de infraestructura (ver
 * test/unit/estado-conectividad.spec.ts), mismo criterio que
 * src/ventas/calculo-totales.ts o src/costeo/costeo.types.ts.
 *
 * Dos mecanismos anti-falsa-alarma, ambos pedidos explicitamente por la
 * tarea:
 *  1. Umbral N-de-M (`minFallosParaDegradado`): un UNICO host inalcanzable de
 *     varios configurados no basta para "sin_conexion" (eso exige que TODOS
 *     fallen); por defecto basta con que 1 falle para "degradado".
 *  2. Debounce (`confirmacionesRequeridas`): un estado candidato distinto al
 *     confirmado necesita ganar en N ciclos CONSECUTIVOS antes de convertirse
 *     en el estado real — un unico blip de red (un ciclo malo aislado) no
 *     dispara una transicion/alerta/evento.
 */

export type EstadoConectividad = "en_linea" | "degradado" | "sin_conexion";

export interface ConfigMaquinaEstadoConectividad {
  /** Cuantos hosts deben fallar (de los N configurados) para "degradado". Default 1. */
  minFallosParaDegradado?: number;
  /** Evaluaciones CONSECUTIVAS coincidentes para confirmar un cambio de estado. Default 2. */
  confirmacionesRequeridas?: number;
}

export interface TransicionEstadoConectividad {
  estadoAnterior: EstadoConectividad;
  estadoNuevo: EstadoConectividad;
  /** Momento en que empezo `estadoAnterior`. */
  desde: Date;
  /** Momento de esta transicion (= inicio de `estadoNuevo`). */
  hasta: Date;
  /** Cuanto duro `estadoAnterior`, en milisegundos (hasta - desde). */
  duracionMs: number;
}

const DEFAULT_MIN_FALLOS_PARA_DEGRADADO = 1;
const DEFAULT_CONFIRMACIONES_REQUERIDAS = 2;

/**
 * Clasifica UN ciclo de checks (un booleano por host configurado, `true` =
 * alcanzable) en un estado OBSERVADO, sin debounce (eso lo aplica
 * `MaquinaEstadoConectividad.evaluar`). Regla N-de-M:
 *  - Ningun host configurado (lista vacia): "en_linea" por diseno — sin datos
 *    no se puede afirmar una caida; `ConectividadService` exige al menos 1
 *    host configurado (ver conectividad-config.ts), esto es solo la defensa
 *    de la funcion pura ante ese caso limite.
 *  - 0 fallos -> "en_linea".
 *  - Fallan TODOS los hosts -> "sin_conexion" (sin importar el umbral).
 *  - Fallan >= `minFallosParaDegradado` pero no todos -> "degradado".
 *  - Menos fallos que el umbral -> "en_linea" (un blip aislado de un solo
 *    host, con umbral > 1, no degrada).
 */
export function calcularEstadoDesdeResultados(
  resultados: boolean[],
  minFallosParaDegradado: number = DEFAULT_MIN_FALLOS_PARA_DEGRADADO,
): EstadoConectividad {
  if (resultados.length === 0) return "en_linea";

  const fallos = resultados.filter((alcanzable) => !alcanzable).length;
  if (fallos === 0) return "en_linea";
  if (fallos >= resultados.length) return "sin_conexion";

  const umbral = Math.max(1, minFallosParaDegradado);
  return fallos >= umbral ? "degradado" : "en_linea";
}

export class MaquinaEstadoConectividad {
  private estadoActual: EstadoConectividad;
  private desdeInterno: Date;
  private candidato: EstadoConectividad | null = null;
  private contadorCandidato = 0;

  private readonly minFallosParaDegradado: number;
  private readonly confirmacionesRequeridas: number;

  constructor(
    config: ConfigMaquinaEstadoConectividad = {},
    estadoInicial: EstadoConectividad = "en_linea",
    desdeInicial: Date = new Date(),
  ) {
    this.minFallosParaDegradado = Math.max(1, config.minFallosParaDegradado ?? DEFAULT_MIN_FALLOS_PARA_DEGRADADO);
    this.confirmacionesRequeridas = Math.max(1, config.confirmacionesRequeridas ?? DEFAULT_CONFIRMACIONES_REQUERIDAS);
    this.estadoActual = estadoInicial;
    this.desdeInterno = desdeInicial;
  }

  get estado(): EstadoConectividad {
    return this.estadoActual;
  }

  get desde(): Date {
    return this.desdeInterno;
  }

  /**
   * Re-siembra el estado CONFIRMADO sin pasar por el debounce (uso: al
   * arrancar el Store Server, reconstruir el ultimo estado conocido desde el
   * historial persistido — ver ConectividadService.seedEstadoDesdeHistorial).
   * Nunca dispara una transicion (no hay "estadoAnterior" real que reportar).
   */
  restaurar(estado: EstadoConectividad, desde: Date): void {
    this.estadoActual = estado;
    this.desdeInterno = desde;
    this.candidato = null;
    this.contadorCandidato = 0;
  }

  /**
   * Evalua un ciclo nuevo. Devuelve la `TransicionEstadoConectividad` SOLO si
   * el estado CONFIRMADO cambio en este ciclo; `null` en cualquier otro caso,
   * incluyendo "todavia acumulando confirmaciones consecutivas" (el mecanismo
   * anti-flapping en accion, no un error).
   */
  evaluar(resultados: boolean[], ahora: Date = new Date()): TransicionEstadoConectividad | null {
    const observado = calcularEstadoDesdeResultados(resultados, this.minFallosParaDegradado);

    if (observado === this.estadoActual) {
      // Ya estamos en el estado observado: cualquier candidato pendiente
      // hacia OTRO estado se descarta (el blip no se sostuvo).
      this.candidato = null;
      this.contadorCandidato = 0;
      return null;
    }

    if (this.candidato === observado) {
      this.contadorCandidato++;
    } else {
      this.candidato = observado;
      this.contadorCandidato = 1;
    }

    if (this.contadorCandidato < this.confirmacionesRequeridas) {
      return null;
    }

    const transicion: TransicionEstadoConectividad = {
      estadoAnterior: this.estadoActual,
      estadoNuevo: observado,
      desde: this.desdeInterno,
      hasta: ahora,
      duracionMs: ahora.getTime() - this.desdeInterno.getTime(),
    };

    this.estadoActual = observado;
    this.desdeInterno = ahora;
    this.candidato = null;
    this.contadorCandidato = 0;

    return transicion;
  }
}
