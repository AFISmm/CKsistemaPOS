/**
 * Helpers puros para el KDS (pantalla de cocina) — DEMO.
 *
 * IMPORTANTE: este archivo NO debe importar nada de `lib/db`, `lib/sales` ni
 * ningun otro modulo de servidor. Solo tipos de `lib/domain/types` y logica
 * pura (sin efectos secundarios), para poder usarse con seguridad desde un
 * componente cliente ("use client") sin arrastrar codigo de servidor al bundle.
 *
 * Dueno: kds-cocina-pos.
 */

import type {
  CanalPedido,
  EstadoCocina,
  LineaDePedido,
  Pedido,
} from "../domain/types";

/** SLA de servicio de cocina (demo): 5 minutos desde creadoEn. */
export const SLA_MS = 5 * 60 * 1000;

/**
 * Tiempo (ms) que una comanda permanece visible, atenuada, en la cola despues
 * de que TODAS sus lineas llegan a "listo". Pasado este tiempo se retira de
 * la vista local (aunque el backend tarde en dejar de devolverla, o la haya
 * dejado de devolver ya). Simplificacion de demo para dar feedback visual
 * inmediato sin depender del timing exacto del backend.
 */
export const GRACIA_LISTO_MS = 8000;

/** Intervalo de polling contra `/api/v1/pedidos?estado=cocina` (demo; produccion = WebSocket, ADR-0003). */
export const POLLING_MS = 2500;

const ETIQUETAS_CANAL: Record<CanalPedido, string> = {
  mostrador: "Mostrador",
  kiosco: "Kiosco",
  online: "Online",
  delivery: "Delivery",
  catering: "Catering",
};

/** Etiqueta corta para mostrar el canal de origen del pedido en la tarjeta. */
export function etiquetaCanal(canal: CanalPedido): string {
  return ETIQUETAS_CANAL[canal] ?? canal;
}

/** Milisegundos transcurridos desde una fecha ISO hasta `ahoraMs`. Nunca negativo. */
export function msTranscurridos(desdeIso: string, ahoraMs: number): number {
  const desde = new Date(desdeIso).getTime();
  if (Number.isNaN(desde)) return 0;
  return Math.max(0, ahoraMs - desde);
}

/** Formatea milisegundos como cronometro mm:ss (ej. 325000 -> "05:25"). */
export function formatearCronometro(ms: number): string {
  const totalSeg = Math.floor(ms / 1000);
  const min = Math.floor(totalSeg / 60);
  const seg = totalSeg % 60;
  return `${String(min).padStart(2, "0")}:${String(seg).padStart(2, "0")}`;
}

/** true si el pedido supero el SLA de servicio (para resaltar en rojo). */
export function excedeSla(desdeIso: string, ahoraMs: number): boolean {
  return msTranscurridos(desdeIso, ahoraMs) > SLA_MS;
}

/** Formatea la hora actual (reloj de cabecera) como HH:MM:SS. */
export function formatearReloj(ahoraMs: number): string {
  return new Date(ahoraMs).toLocaleTimeString("es-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/**
 * Normaliza la respuesta de `GET /api/v1/pedidos?estado=cocina`: acepta tanto
 * `Pedido[]` como `{ pedidos: Pedido[] }` (tolerante a variaciones menores del
 * contrato) y nunca lanza: ante JSON inesperado o corrupto devuelve `[]`, para
 * que un fetch offline/erroneo nunca rompa la UI del KDS.
 */
export function normalizarRespuestaPedidos(json: unknown): Pedido[] {
  if (Array.isArray(json)) return json as Pedido[];
  if (
    json &&
    typeof json === "object" &&
    Array.isArray((json as { pedidos?: unknown }).pedidos)
  ) {
    return (json as { pedidos: Pedido[] }).pedidos;
  }
  return [];
}

/**
 * Estado de cocina agregado a nivel de TARJETA (pedido completo), derivado del
 * estado por linea (`LineaDePedido.estadoCocina`):
 *  - Si alguna linea sigue "recibido"  -> la tarjeta es "recibido" (gris).
 *  - Si ninguna esta "recibido" pero alguna "preparando" -> "preparando" (ambar).
 *  - Si todas estan "listo" -> "listo" (verde).
 */
export function estadoCocinaAgregado(pedido: Pedido): EstadoCocina {
  const lineas = pedido.lineas ?? [];
  if (lineas.length === 0) return "recibido";
  if (lineas.some((l) => l.estadoCocina === "recibido")) return "recibido";
  if (lineas.some((l) => l.estadoCocina === "preparando")) return "preparando";
  return "listo";
}

/** Ordena pedidos FIFO por hora de creacion (mas antiguo primero). */
export function ordenarFifo(pedidos: Pedido[]): Pedido[] {
  return [...pedidos].sort((a, b) => {
    const ta = new Date(a.creadoEn).getTime();
    const tb = new Date(b.creadoEn).getTime();
    if (ta !== tb) return ta - tb;
    return a.numeroOrden - b.numeroOrden;
  });
}

/**
 * Adelanta OPTIMISTAMENTE (solo en cliente, sin llamar al backend) el estado
 * de cocina de un pedido completo: si hay lineas en "recibido" las pasa todas
 * a "preparando"; si no, pasa las que esten en "preparando" a "listo".
 *
 * Se usa para dar feedback tactil instantaneo al tocar "Empezar"/"Listo"
 * mientras se confirma la transicion real vía `POST /api/v1/pedidos/[id]/cocina`.
 * El siguiente polling reconcilia con el estado real del servidor.
 */
export function avanzarLocalOptimista(pedido: Pedido): Pedido {
  const hayRecibido = pedido.lineas.some((l) => l.estadoCocina === "recibido");
  const lineas: LineaDePedido[] = pedido.lineas.map((l) => {
    if (hayRecibido) {
      return l.estadoCocina === "recibido"
        ? { ...l, estadoCocina: "preparando" as EstadoCocina }
        : l;
    }
    return l.estadoCocina === "preparando"
      ? { ...l, estadoCocina: "listo" as EstadoCocina }
      : l;
  });
  return { ...pedido, lineas };
}

/** Clases utilitarias Tailwind por estado de cocina agregado (fondo/borde de tarjeta). */
export function clasesEstado(estado: EstadoCocina): {
  borde: string;
  franja: string;
  texto: string;
  etiqueta: string;
} {
  switch (estado) {
    case "recibido":
      return {
        borde: "border-neutral-500",
        franja: "bg-neutral-500",
        texto: "text-neutral-200",
        etiqueta: "Recibido",
      };
    case "preparando":
      return {
        borde: "border-amber-500",
        franja: "bg-amber-500",
        texto: "text-amber-300",
        etiqueta: "Preparando",
      };
    case "listo":
    default:
      return {
        borde: "border-emerald-500",
        franja: "bg-emerald-500",
        texto: "text-emerald-300",
        etiqueta: "Listo",
      };
  }
}
