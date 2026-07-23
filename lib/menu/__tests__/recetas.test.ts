/**
 * Pruebas unitarias de lib/menu/recetas.ts — Fase A (revision 2026-07-22,
 * hallazgo "gestion de menu: editar insumos de receta"): cubre agregar,
 * quitar y cambiar cantidad de ingredientes de la receta de un producto via
 * `guardarRecetaProducto` (reemplazo completo), incluyendo el caso de un
 * producto que todavia no tenia Receta. Runner: Vitest.
 */

import { beforeEach, describe, expect, it } from "vitest";
import { getDb, resetDb } from "../../db/store";
import { guardarRecetaProducto, listarInsumosCatalogo, obtenerRecetaProducto } from "../recetas";
import { ErrorMenu } from "../errores";

beforeEach(() => {
  resetDb();
});

function productoConRecetaDePrueba() {
  const db = getDb();
  const receta = db.recetas.find(
    (r) => r.activo && db.recetaInsumos.some((ri) => ri.recetaId === r.id)
  );
  if (!receta) throw new Error("No hay ninguna receta con insumos en la semilla — no se puede probar.");
  const producto = db.productos.find((p) => p.id === receta.productoId)!;
  return producto;
}

function productoSinRecetaDePrueba() {
  const db = getDb();
  const productosConReceta = new Set(db.recetas.filter((r) => r.activo).map((r) => r.productoId));
  const producto = db.productos.find((p) => !productosConReceta.has(p.id));
  if (!producto) throw new Error("No hay ningun producto sin receta en la semilla — no se puede probar.");
  return producto;
}

describe("obtenerRecetaProducto", () => {
  it("devuelve receta null para un producto sin receta", () => {
    const producto = productoSinRecetaDePrueba();
    const resultado = obtenerRecetaProducto(producto.id);
    expect(resultado.receta).toBeNull();
    expect(resultado.items).toEqual([]);
  });

  it("lanza ErrorMenu si el producto no existe", () => {
    expect(() => obtenerRecetaProducto("producto-inexistente")).toThrow(ErrorMenu);
  });
});

describe("guardarRecetaProducto", () => {
  it("crea una receta nueva para un producto que no tenia (agregar ingredientes desde cero)", () => {
    const producto = productoSinRecetaDePrueba();
    const insumos = listarInsumosCatalogo();
    const dosInsumos = insumos.slice(0, 2);

    const resultado = guardarRecetaProducto(producto.id, [
      { insumoId: dosInsumos[0].id, cantidad: 2 },
      { insumoId: dosInsumos[1].id, cantidad: 0.5 },
    ]);

    expect(resultado.receta).not.toBeNull();
    expect(resultado.receta!.activo).toBe(true);
    expect(resultado.items).toHaveLength(2);
    expect(resultado.items.map((i) => i.insumoId).sort()).toEqual(
      [dosInsumos[0].id, dosInsumos[1].id].sort()
    );
  });

  it("cambia la cantidad de un ingrediente existente", () => {
    const producto = productoConRecetaDePrueba();
    const original = obtenerRecetaProducto(producto.id);
    const primerItem = original.items[0];

    const nuevaCantidad = primerItem.cantidad + 5;
    const nuevosItems = original.items.map((i) =>
      i.insumoId === primerItem.insumoId ? { insumoId: i.insumoId, cantidad: nuevaCantidad } : { insumoId: i.insumoId, cantidad: i.cantidad }
    );

    const resultado = guardarRecetaProducto(producto.id, nuevosItems);
    const actualizado = resultado.items.find((i) => i.insumoId === primerItem.insumoId)!;
    expect(actualizado.cantidad).toBe(nuevaCantidad);
    // Misma receta (mismo id), no se creo una nueva.
    expect(resultado.receta!.id).toBe(original.receta!.id);
  });

  it("quita un ingrediente (reemplazo completo sin ese item)", () => {
    const producto = productoConRecetaDePrueba();
    const original = obtenerRecetaProducto(producto.id);
    expect(original.items.length).toBeGreaterThan(1);

    const itemsSinElUltimo = original.items
      .slice(0, -1)
      .map((i) => ({ insumoId: i.insumoId, cantidad: i.cantidad }));

    const resultado = guardarRecetaProducto(producto.id, itemsSinElUltimo);
    expect(resultado.items).toHaveLength(original.items.length - 1);
  });

  it("agrega un ingrediente nuevo a una receta existente", () => {
    const producto = productoConRecetaDePrueba();
    const original = obtenerRecetaProducto(producto.id);
    const idsExistentes = new Set(original.items.map((i) => i.insumoId));
    const insumoNuevo = listarInsumosCatalogo().find((i) => !idsExistentes.has(i.id))!;

    const nuevosItems = [
      ...original.items.map((i) => ({ insumoId: i.insumoId, cantidad: i.cantidad })),
      { insumoId: insumoNuevo.id, cantidad: 1 },
    ];

    const resultado = guardarRecetaProducto(producto.id, nuevosItems);
    expect(resultado.items).toHaveLength(original.items.length + 1);
    expect(resultado.items.some((i) => i.insumoId === insumoNuevo.id)).toBe(true);
  });

  it("rechaza un insumoId que no existe en el catalogo", () => {
    const producto = productoSinRecetaDePrueba();
    expect(() =>
      guardarRecetaProducto(producto.id, [{ insumoId: "insumo-inexistente", cantidad: 1 }])
    ).toThrow(ErrorMenu);
  });

  it("rechaza cantidad <= 0", () => {
    const producto = productoSinRecetaDePrueba();
    const insumo = listarInsumosCatalogo()[0];
    expect(() => guardarRecetaProducto(producto.id, [{ insumoId: insumo.id, cantidad: 0 }])).toThrow(
      ErrorMenu
    );
    expect(() => guardarRecetaProducto(producto.id, [{ insumoId: insumo.id, cantidad: -1 }])).toThrow(
      ErrorMenu
    );
  });

  it("rechaza insumoId duplicado dentro del mismo request", () => {
    const producto = productoSinRecetaDePrueba();
    const insumo = listarInsumosCatalogo()[0];
    expect(() =>
      guardarRecetaProducto(producto.id, [
        { insumoId: insumo.id, cantidad: 1 },
        { insumoId: insumo.id, cantidad: 2 },
      ])
    ).toThrow(ErrorMenu);
  });

  it("rechaza producto inexistente", () => {
    const insumo = listarInsumosCatalogo()[0];
    expect(() =>
      guardarRecetaProducto("producto-inexistente", [{ insumoId: insumo.id, cantidad: 1 }])
    ).toThrow(ErrorMenu);
  });
});
