/**
 * Helper compartido para traducir errores de los clientes HTTP de
 * componentes/*​/api.ts (pos, empleados, nomina, jornada) al idioma activo.
 *
 * Contexto: cada api.ts de cliente lanza `ErrorApi` con `message` (texto
 * amigable) y, opcionalmente, `codigo`. Varios casos son 100% generados en el
 * CLIENTE (sin red / respuesta sin cuerpo JSON util / escritura encolada
 * offline) y SI se traducen aqui via las claves `api.sinConexion` /
 * `api.errorInesperado` / `api.encoladoSinConexion`. El resto de los `codigo`
 * (ej. "pedido_no_encontrado", "tarifa_invalida") vienen del backend de
 * dominio (lib/sales, lib/rrhh, lib/nomina) con su `mensaje` ya en espanol:
 * como el backend de esta demo no tiene su propio i18n, ese mensaje se
 * muestra tal cual (limitacion conocida, documentada en el reporte de la
 * tarea de i18n).
 */

/** Codigos sinteticos asignados por los propios clientes api.ts (no vienen del backend). */
export const CODIGO_SIN_CONEXION = "SIN_CONEXION";
export const CODIGO_ERROR_INESPERADO_CLIENTE = "ERROR_INESPERADO_CLIENTE";
/** F1-T3: la escritura fallo por red pero quedo en la cola offline (lib/offline/queue.ts), no se perdio. */
export const CODIGO_ENCOLADO_SIN_CONEXION = "ENCOLADO_SIN_CONEXION";

interface ErrorApiComoDuckType {
  message?: unknown;
  codigo?: unknown;
  status?: unknown;
}

type FuncionTraducir = (clave: string, vars?: Record<string, string | number>) => string;

/**
 * Devuelve el texto a mostrar en pantalla para un error atrapado en un
 * `catch`. Si es un error de red/generico sintetizado por el cliente, se
 * traduce con `t`; si trae un `mensaje` real del backend, se muestra tal cual
 * (ver limitacion arriba); si no es un ErrorApi reconocible, se usa
 * `claveFallback`.
 */
export function textoErrorApi(err: unknown, t: FuncionTraducir, claveFallback: string): string {
  if (err && typeof err === "object" && "message" in err) {
    const error = err as ErrorApiComoDuckType;
    if (error.codigo === CODIGO_SIN_CONEXION) return t("api.sinConexion");
    if (error.codigo === CODIGO_ENCOLADO_SIN_CONEXION) return t("api.encoladoSinConexion");
    if (error.codigo === CODIGO_ERROR_INESPERADO_CLIENTE) {
      return t("api.errorInesperado", { status: typeof error.status === "number" ? error.status : "" });
    }
    if (typeof error.message === "string" && error.message.trim()) return error.message;
  }
  return t(claveFallback);
}
