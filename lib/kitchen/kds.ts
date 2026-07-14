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

/**
 * Temporizador de cocina de 3 niveles (reemplaza el SLA_MS/excedeSla de 5 min
 * de la version anterior de esta demo):
 *  - "normal":   transcurrido <= TIEMPO_OBJETIVO_MS (15 min).
 *  - "amarillo": transcurrido >  TIEMPO_ALERTA_AMARILLA_MS (a partir del
 *                minuto 15:01). TIEMPO_ALERTA_AMARILLA_MS es literalmente el
 *                mismo valor que TIEMPO_OBJETIVO_MS (15 min); se exportan dos
 *                constantes separadas porque conceptualmente responden a
 *                preguntas distintas ("¿cual es el objetivo?" vs "¿desde
 *                cuando alerto en amarillo?"), aunque hoy compartan el numero.
 *  - "rojo":     transcurrido >= TIEMPO_ALERTA_ROJA_MS (18 min). Ademas de la
 *                alerta visual, esto dispara UNA notificacion al gerente (ver
 *                lib/notificaciones/notificaciones.ts + app/kds/page.tsx).
 *
 * El transcurrido se mide siempre desde `enviadoACocinaEn` (momento real de
 * entrada a cocina), NUNCA desde `creadoEn` (momento en que el cajero abrio el
 * pedido en el mostrador, que puede ser minutos antes). Se usa `creadoEn` solo
 * como fallback defensivo si `enviadoACocinaEn` viniera `null` (dato legado o
 * inconsistente), para que el cronometro nunca quede sin referencia.
 *
 * CRITERIO DOCUMENTADO: esta alerta de tiempo se sigue calculando y mostrando
 * incluso cuando el pedido ya esta "listo" (todas sus lineas listas) y hasta
 * que se envia a caja (`enviarACaja`): a un gerente/cajero le interesa saber
 * cuanto tiempo REAL lleva el pedido en cocina de punta a punta, incluyendo el
 * tiempo que quedo "listo" esperando que alguien lo retire hacia caja. Una vez
 * el pedido sale del KDS (estado "entregado"), deja de mostrarse en esta
 * pantalla y por lo tanto deja de evaluarse aqui.
 */
export const TIEMPO_OBJETIVO_MS = 15 * 60 * 1000;
export const TIEMPO_ALERTA_AMARILLA_MS = TIEMPO_OBJETIVO_MS;
export const TIEMPO_ALERTA_ROJA_MS = 18 * 60 * 1000;

export type NivelAlertaTiempo = "normal" | "amarillo" | "rojo";

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

/**
 * Milisegundos RESTANTES hasta el objetivo de cocina (TIEMPO_OBJETIVO_MS,
 * 15 min), contrapartida de `msTranscurridos`. A diferencia de esa funcion,
 * ESTA SI puede devolver un numero negativo a proposito: una vez superado el
 * objetivo, el valor absoluto representa cuanto tiempo de "overtime" lleva el
 * pedido (ver `formatearRestante`, que antepone "+" en ese caso) — un
 * cajero/gerente necesita distinguir "todavia falta X" de "ya se paso por Y".
 */
export function msRestantes(desdeIso: string, ahoraMs: number): number {
  return TIEMPO_OBJETIVO_MS - msTranscurridos(desdeIso, ahoraMs);
}

/**
 * Formatea el tiempo RESTANTE (ver `msRestantes`) reusando `formatearCronometro`
 * para el formato mm:ss: "07:28" mientras queda tiempo, "+02:15" en overtime
 * (superado el objetivo de 15 min) en vez de mostrar un engañoso "00:00".
 */
export function formatearRestante(restanteMs: number): string {
  if (restanteMs < 0) return `+${formatearCronometro(Math.abs(restanteMs))}`;
  return formatearCronometro(restanteMs);
}

/**
 * Nivel de alerta de tiempo del pedido, puro y facil de probar con `ahoraMs`
 * simulado (no depende del reloj real): pasa `pedido.enviadoACocinaEn ??
 * pedido.creadoEn` como `enviadoACocinaEnOCreadoEn`. Ver documentacion de los
 * umbrales arriba (TIEMPO_OBJETIVO_MS / TIEMPO_ALERTA_AMARILLA_MS /
 * TIEMPO_ALERTA_ROJA_MS).
 */
export function nivelAlertaTiempo(
  enviadoACocinaEnOCreadoEn: string,
  ahoraMs: number
): NivelAlertaTiempo {
  const transcurrido = msTranscurridos(enviadoACocinaEnOCreadoEn, ahoraMs);
  if (transcurrido >= TIEMPO_ALERTA_ROJA_MS) return "rojo";
  if (transcurrido > TIEMPO_ALERTA_AMARILLA_MS) return "amarillo";
  return "normal";
}

/** Referencia de tiempo a usar para el temporizador de cocina de un pedido (ver nivelAlertaTiempo). */
export function referenciaTiempoCocina(pedido: Pedido): string {
  return pedido.enviadoACocinaEn ?? pedido.creadoEn;
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
