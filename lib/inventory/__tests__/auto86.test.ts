/**
 * Pruebas unitarias de lib/inventory/inventario.ts — Fase A (revision
 * 2026-07-22, idea de innovacion "auto-86 al llegar a stock cero"): cubre que
 * `descontarStockPorVenta` (llamado al confirmar una venta) dispara
 * `verificarAuto86PorInsumo` y marca 86 automaticamente cualquier producto
 * cuya receta dependa de un insumo que llego a cero. Runner: Vitest (mismo
 * patron que lib/rrhh/__tests__).
 */

import { beforeEach, describe, expect, it } from "vitest";
import { UBICACION_PILOTO_ID, getDb, resetDb } from "../../db/store";
import { descontarStockPorVenta, verificarAuto86PorInsumo } from "../inventario";
import type { LineaDePedido, Pedido } from "../../domain/types";

beforeEach(() => {
  resetDb();
});

/** Toma el primer producto del catalogo sembrado que SI tenga receta (RecetaInsumo). */
function productoConRecetaDePrueba() {
  const db = getDb();
  const receta = db.recetas.find(
    (r) => r.activo && db.recetaInsumos.some((ri) => ri.recetaId === r.id)
  );
  if (!receta) throw new Error("No hay ninguna receta con insumos en la semilla — no se puede probar.");
  const producto = db.productos.find((p) => p.id === receta.productoId);
  if (!producto) throw new Error("Receta de prueba sin producto asociado.");
  const primerInsumo = db.recetaInsumos.find((ri) => ri.recetaId === receta.id)!;
  return { producto, receta, primerInsumo };
}

function pedidoDePrueba(productoId: string, cantidad: number): Pedido {
  const linea: LineaDePedido = {
    id: "linea-test-1",
    pedidoId: "pedido-test-1",
    productoId,
    descripcion: "linea de prueba",
    cantidad,
    precioUnitario: 100,
    subtotalLinea: 100 * cantidad,
    gravable: true,
    notas: "",
    estadoCocina: "recibido",
    modificadores: [],
  };
  return {
    id: "pedido-test-1",
    ubicacionId: UBICACION_PILOTO_ID,
    turnoId: "turno-test",
    numeroOrden: 1,
    nombreCliente: "Cliente Test",
    canal: "mostrador",
    estado: "abierto",
    subtotal: linea.subtotalLinea,
    descuentoTotal: 0,
    impuestoTotal: 0,
    propinaTotal: 0,
    total: linea.subtotalLinea,
    lineas: [linea],
    creadoEn: new Date().toISOString(),
    enviadoACocinaEn: null,
    entregadoEn: null,
    cerradoEn: null,
  };
}

describe("auto-86 al llegar a stock cero", () => {
  it("marca 86 el producto cuando la venta deja su insumo en cero", () => {
    const { producto, primerInsumo } = productoConRecetaDePrueba();
    const db = getDb();

    // Deja el stock del insumo EXACTAMENTE en la cantidad que consume 1 unidad
    // de este producto, para que una sola venta lo deje en cero.
    const stock = db.stock.find(
      (s) => s.ubicacionId === UBICACION_PILOTO_ID && s.insumoId === primerInsumo.insumoId
    )!;
    stock.cantidadActual = primerInsumo.cantidad;

    expect(producto.disponible86).toBe(true);

    descontarStockPorVenta(pedidoDePrueba(producto.id, 1));

    const stockDespues = db.stock.find(
      (s) => s.ubicacionId === UBICACION_PILOTO_ID && s.insumoId === primerInsumo.insumoId
    )!;
    expect(stockDespues.cantidadActual).toBeLessThanOrEqual(0);

    const productoDespues = db.productos.find((p) => p.id === producto.id)!;
    expect(productoDespues.disponible86).toBe(false);

    // Se registro el evento de auditoria "producto86" marcado como automatico.
    const evento = db.eventos.find(
      (e) => e.tipo === "producto86" && e.agregadoId === producto.id
    );
    expect(evento).toBeDefined();
    expect((evento!.payload as any).automatico).toBe(true);
  });

  it("NO marca 86 si el stock del insumo sigue por encima de cero", () => {
    const { producto, primerInsumo } = productoConRecetaDePrueba();
    const db = getDb();

    const stock = db.stock.find(
      (s) => s.ubicacionId === UBICACION_PILOTO_ID && s.insumoId === primerInsumo.insumoId
    )!;
    stock.cantidadActual = primerInsumo.cantidad * 100; // bien por encima de lo que consume 1 venta

    descontarStockPorVenta(pedidoDePrueba(producto.id, 1));

    const productoDespues = db.productos.find((p) => p.id === producto.id)!;
    expect(productoDespues.disponible86).toBe(true);
  });

  it("verificarAuto86PorInsumo no hace nada si el insumo no existe en stock para la ubicacion", () => {
    // No debe lanzar ni afectar productos si no hay registro de Stock para el insumo/ubicacion.
    expect(() => verificarAuto86PorInsumo("insumo-inexistente", UBICACION_PILOTO_ID)).not.toThrow();
  });

  it("un producto ya marcado 86 manualmente no genera un segundo evento al re-verificar", () => {
    const { producto, primerInsumo } = productoConRecetaDePrueba();
    const db = getDb();

    const stock = db.stock.find(
      (s) => s.ubicacionId === UBICACION_PILOTO_ID && s.insumoId === primerInsumo.insumoId
    )!;
    stock.cantidadActual = 0;

    verificarAuto86PorInsumo(primerInsumo.insumoId, UBICACION_PILOTO_ID);
    const eventosTrasPrimeraVerificacion = db.eventos.filter(
      (e) => e.tipo === "producto86" && e.agregadoId === producto.id
    ).length;
    expect(eventosTrasPrimeraVerificacion).toBe(1);

    verificarAuto86PorInsumo(primerInsumo.insumoId, UBICACION_PILOTO_ID);
    const eventosTrasSegundaVerificacion = db.eventos.filter(
      (e) => e.tipo === "producto86" && e.agregadoId === producto.id
    ).length;
    expect(eventosTrasSegundaVerificacion).toBe(1);
  });
});
