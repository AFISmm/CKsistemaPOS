/**
 * Alta de productos del catalogo — DUENO: menu-inventario-pos.
 *
 * Hasta ahora el catalogo era 100% semilla estatica (lib/data/catalog.ts, ver
 * getSeedCatalogo). A pedido de producto ("el perfil de desarrollador tiene
 * todos los permisos para... agregar platos"), este modulo agrega la unica
 * operacion de escritura sobre el catalogo hoy: crear un Producto nuevo dentro
 * de una categoria existente. Editar/eliminar productos y gestionar
 * combos/modificadores/recetas quedan fuera de este alcance (no se pidieron).
 *
 * Mismo patron que lib/rrhh/empleados.ts (crearEmpleado): valida, empuja al
 * store en memoria via getDb(), usa uid()/ahora() para el registro.
 */

import { getDb, uid } from "../db/store";
import type { Producto } from "../domain/types";
import { ErrorMenu } from "./errores";

export interface NuevoProductoInput {
  categoriaId: string;
  nombre: string;
  descripcion?: string;
  /** Precio base en CENTAVOS enteros (C-DINERO). */
  precioBaseCentavos: number;
  gravable: boolean;
}

function validarCategoria(categoriaId: string): void {
  const existe = getDb().categorias.some((c) => c.id === categoriaId);
  if (!existe) {
    throw new ErrorMenu("categoria_no_encontrada", `Categoria ${categoriaId} no existe`, 422);
  }
}

/**
 * Crea un Producto nuevo dentro de una categoria existente. Por defecto nace
 * disponible (no 86), activo y NO es combo (crear combos no esta en este
 * alcance).
 */
export function crearProducto(input: NuevoProductoInput): Producto {
  if (!input.categoriaId) {
    throw new ErrorMenu("categoria_requerida", "categoriaId es requerido", 422);
  }
  validarCategoria(input.categoriaId);

  if (!input.nombre?.trim()) {
    throw new ErrorMenu("nombre_requerido", "nombre es requerido", 422);
  }

  if (!Number.isInteger(input.precioBaseCentavos) || input.precioBaseCentavos <= 0) {
    throw new ErrorMenu(
      "precio_invalido",
      "precioBaseCentavos debe ser un entero de centavos > 0",
      422
    );
  }

  const producto: Producto = {
    id: uid(),
    categoriaId: input.categoriaId,
    nombre: input.nombre.trim(),
    descripcion: input.descripcion?.trim() ?? "",
    precioBase: input.precioBaseCentavos,
    gravable: input.gravable,
    esCombo: false,
    disponible86: true,
    activo: true,
  };

  getDb().productos.push(producto);

  return producto;
}

/** Lista todos los productos del catalogo (para la pantalla /menu). */
export function listarProductos(): Producto[] {
  return getDb().productos;
}
