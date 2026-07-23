/**
 * Cliente HTTP del modulo de Gestion de Menu (menu-inventario-pos).
 *
 * REGLA DURA (igual que components/empleados/api.ts y components/pos/api.ts):
 * este modulo SOLO habla con el backend via `fetch` a /api/v1/... Nunca
 * importa lib/db ni lib/menu (romperia el bundle de cliente). Tipos de
 * dominio importados con `import type`.
 */

import type { Categoria, Insumo, Producto, Receta, RecetaInsumo } from "@/lib/domain/types";

const BASE_URL = "/api/v1";

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
    const candidato = registro.mensaje ?? registro.error ?? registro.message;
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
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
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

export interface CatalogoMenuResponse {
  categorias: Categoria[];
  productos: Producto[];
}

/** Reutiliza GET /api/v1/catalogo (categorias + productos) para agrupar por categoria en /menu. */
export async function obtenerCatalogoMenu(): Promise<CatalogoMenuResponse> {
  return solicitar<CatalogoMenuResponse>("/catalogo");
}

export interface NuevoProductoBody {
  categoriaId: string;
  nombre: string;
  descripcion?: string;
  precioBaseCentavos: number;
  gravable: boolean;
}

export async function crearProducto(body: NuevoProductoBody): Promise<Producto> {
  const { producto } = await solicitar<{ producto: Producto }>("/productos", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return producto;
}

export async function marcar86Producto(id: string, disponible: boolean, usuarioId?: string): Promise<Producto> {
  const { producto } = await solicitar<{ producto: Producto }>(`/productos/${id}/86`, {
    method: "POST",
    body: JSON.stringify({ disponible, usuarioId }),
  });
  return producto;
}

// ---------------------------------------------------------------------------
// Edicion de receta (RecetaInsumo) de un producto — AGREGADO Fase A (2026-07-22).
// ---------------------------------------------------------------------------

export interface RecetaInsumoConNombre extends RecetaInsumo {
  nombreInsumo: string;
  unidadMedida: string;
}

export interface RecetaDeProducto {
  productoId: string;
  receta: Receta | null;
  items: RecetaInsumoConNombre[];
}

export interface ItemRecetaBody {
  insumoId: string;
  cantidad: number;
}

/** GET /api/v1/productos/[id]/receta */
export async function obtenerRecetaProducto(productoId: string): Promise<RecetaDeProducto> {
  return solicitar<RecetaDeProducto>(`/productos/${productoId}/receta`);
}

/** PUT /api/v1/productos/[id]/receta — reemplaza la lista completa de ingredientes. */
export async function guardarRecetaProducto(
  productoId: string,
  items: ItemRecetaBody[]
): Promise<RecetaDeProducto> {
  return solicitar<RecetaDeProducto>(`/productos/${productoId}/receta`, {
    method: "PUT",
    body: JSON.stringify({ items }),
  });
}

/** GET /api/v1/insumos — catalogo de insumos, para el selector de ingredientes. */
export async function listarInsumos(): Promise<Insumo[]> {
  const { insumos } = await solicitar<{ insumos: Insumo[] }>("/insumos");
  return insumos;
}
