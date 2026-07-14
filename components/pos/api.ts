/**
 * Cliente HTTP del terminal de cajero (frontend-mostrador-kiosco-pos).
 *
 * REGLA DURA: este modulo SOLO habla con el backend via `fetch` a /api/v1/...
 * Nunca importa lib/db, lib/sales ni lib/payments (romperia el bundle de cliente
 * y duplicaria logica de negocio). Los tipos de dominio se importan como
 * `import type` desde lib/domain/types (sin runtime, salvo formatearDinero/aCentavos
 * que son funciones puras sin dependencias de servidor).
 */

import type {
  Categoria,
  Combo,
  GrupoModificador,
  Modificador,
  Pedido,
  Pago,
  Producto,
} from "@/lib/domain/types";

export interface CatalogoResponse {
  categorias: Categoria[];
  productos: Producto[];
  gruposModificador: GrupoModificador[];
  modificadores: Modificador[];
  combos: Combo[];
}

export interface PagoResponse {
  pago: Pago;
  saldoPendiente: number;
  pedido: Pedido;
}

export type MetodoCobro = "efectivo" | "tarjeta";

export interface NuevaLineaBody {
  productoId: string;
  cantidad: number;
  modificadorIds?: string[];
  notas?: string;
}

export interface CambioLineaBody {
  cantidad?: number;
  eliminar?: boolean;
}

export interface DescuentoBody {
  tipo: "monto" | "porcentaje";
  valor: number;
  motivo: string;
  usuarioId: string;
}

export interface PagoBody {
  pedidoId: string;
  metodo: MetodoCobro;
  monto: number;
  propina?: number;
  montoRecibido?: number;
  offline?: boolean;
  forzarRechazo?: boolean;
}

const BASE_URL = "/api/v1";

/**
 * Error de API con mensaje amigable para mostrar en pantalla al cajero.
 *
 * `codigo` distingue los dos casos generados en el CLIENTE (sin conexion /
 * respuesta sin cuerpo JSON util, ver lib/i18n/erroresApi.ts) de los codigos
 * de dominio que ya vienen del backend (ej. "pedido_no_encontrado").
 */
export class ErrorApi extends Error {
  status: number;
  codigo?: string;
  constructor(message: string, status: number, codigo?: string) {
    super(message);
    this.name = "ErrorApi";
    this.status = status;
    this.codigo = codigo;
  }
}

async function leerCuerpoSeguro(res: Response): Promise<unknown> {
  const texto = await res.text().catch(() => "");
  if (!texto) return null;
  try {
    return JSON.parse(texto);
  } catch {
    return null;
  }
}

function extraerMensajeError(cuerpo: unknown, status: number): string {
  if (cuerpo && typeof cuerpo === "object") {
    const registro = cuerpo as Record<string, unknown>;
    const candidato = registro.error ?? registro.mensaje ?? registro.message;
    if (typeof candidato === "string" && candidato.trim()) return candidato;
  }
  if (status === 0) {
    return "No hay conexion con el servidor. Verifica la red e intenta de nuevo.";
  }
  return `Ocurrio un error inesperado (codigo ${status}). Intenta de nuevo.`;
}

function extraerCodigoError(cuerpo: unknown): string | undefined {
  if (cuerpo && typeof cuerpo === "object") {
    const registro = cuerpo as Record<string, unknown>;
    if (typeof registro.codigo === "string") return registro.codigo;
  }
  return undefined;
}

async function solicitar<T>(ruta: string, init?: RequestInit): Promise<T> {
  let respuesta: Response;
  try {
    respuesta = await fetch(`${BASE_URL}${ruta}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
      cache: "no-store",
    });
  } catch {
    throw new ErrorApi(
      "No hay conexion con el servidor. Revisa tu red e intenta de nuevo.",
      0,
      "SIN_CONEXION"
    );
  }

  const cuerpo = await leerCuerpoSeguro(respuesta);

  if (!respuesta.ok) {
    throw new ErrorApi(
      extraerMensajeError(cuerpo, respuesta.status),
      respuesta.status,
      extraerCodigoError(cuerpo) ?? "ERROR_INESPERADO_CLIENTE"
    );
  }

  return cuerpo as T;
}

/**
 * Todas las rutas de /api/v1/pedidos/** devuelven el Pedido envuelto como
 * `{ pedido }` (igual que /api/v1/pagos devuelve `{ pago, pedido, ... }`,
 * pero ESE ya se consume completo via PagoResponse). Este helper desenvuelve
 * ese campo para las funciones que exponen `Promise<Pedido>` directamente.
 * BUG CORREGIDO: antes se hacia `return cuerpo as T` tratando el objeto
 * envuelto completo como si fuera el Pedido, lo que dejaba `pedido.lineas`
 * (y el resto de sus campos) en `undefined` y tronaba Ticket.tsx con
 * "Cannot read properties of undefined (reading 'length')".
 */
async function solicitarPedido(ruta: string, init?: RequestInit): Promise<Pedido> {
  const { pedido } = await solicitar<{ pedido: Pedido }>(ruta, init);
  return pedido;
}

export function obtenerCatalogo(): Promise<CatalogoResponse> {
  return solicitar<CatalogoResponse>("/catalogo");
}

export function crearPedido(input?: {
  nombreCliente?: string;
  canal?: string;
}): Promise<Pedido> {
  return solicitarPedido("/pedidos", {
    method: "POST",
    body: JSON.stringify(input ?? {}),
  });
}

export function obtenerPedido(pedidoId: string): Promise<Pedido> {
  return solicitarPedido(`/pedidos/${pedidoId}`);
}

/**
 * Lista pedidos por estado agrupado o exacto (ver app/api/v1/pedidos/route.ts):
 * "cocina" (enviadoCocina/enPreparacion/listo), "historial" (entregado/cobrado)
 * o cualquier EstadoPedido exacto. Usado por app/pos/historial/page.tsx.
 */
export function listarPedidosPorEstado(estado: string): Promise<Pedido[]> {
  return solicitar<{ pedidos: Pedido[] }>(
    `/pedidos?estado=${encodeURIComponent(estado)}`
  ).then((r) => r.pedidos);
}

export function agregarLinea(pedidoId: string, body: NuevaLineaBody): Promise<Pedido> {
  return solicitarPedido(`/pedidos/${pedidoId}/lineas`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function actualizarLinea(
  pedidoId: string,
  lineaId: string,
  body: CambioLineaBody
): Promise<Pedido> {
  return solicitarPedido(`/pedidos/${pedidoId}/lineas/${lineaId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function enviarACocina(pedidoId: string): Promise<Pedido> {
  return solicitarPedido(`/pedidos/${pedidoId}/enviar-cocina`, {
    method: "POST",
  });
}

export function aplicarDescuento(pedidoId: string, body: DescuentoBody): Promise<Pedido> {
  return solicitarPedido(`/pedidos/${pedidoId}/descuento`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function registrarPago(body: PagoBody): Promise<PagoResponse> {
  return solicitar<PagoResponse>("/pagos", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
