/**
 * Pruebas de integracion del cliente HTTP del cajero (components/pos/api.ts)
 * con la cola offline (lib/offline/*) — F1-T3
 * (DUENO: frontend-mostrador-kiosco-pos). Runner: Vitest.
 *
 * Cubre el camino real que usa la UI (agregarLinea/registrarPago/etc, no solo
 * lib/offline/queue.ts en aislado): cuando `fetch` global falla por red, la
 * escritura debe quedar en `colaEscritura` (no perderse) y el error mostrado
 * al cajero debe distinguirse ("ENCOLADO_SIN_CONEXION") del "sin conexion"
 * generico que se usa para lecturas (GET).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { _reiniciarParaPruebas, listarCola } from "@/lib/offline/db";
import { contarPendientes } from "@/lib/offline/queue";
import { agregarLinea, ErrorApi, obtenerCatalogo, registrarPago } from "../api";

const fetchOriginal = global.fetch;

beforeEach(async () => {
  await _reiniciarParaPruebas();
});

afterEach(() => {
  global.fetch = fetchOriginal;
  vi.restoreAllMocks();
});

describe("components/pos/api.ts + cola offline", () => {
  it("agregarLinea: si el fetch falla por red, encola la escritura (en vez de perderla) y lanza ENCOLADO_SIN_CONEXION", async () => {
    global.fetch = vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    }) as unknown as typeof fetch;

    await expect(
      agregarLinea("pedido-123", { productoId: "prod-1", cantidad: 2 })
    ).rejects.toMatchObject({ codigo: "ENCOLADO_SIN_CONEXION" } satisfies Partial<ErrorApi>);

    expect(await contarPendientes()).toBe(1);
    const [entrada] = await listarCola();
    expect(entrada.metodo).toBe("POST");
    expect(entrada.url).toBe("/api/v1/pedidos/pedido-123/lineas");
    expect(entrada.cuerpo).toEqual({ productoId: "prod-1", cantidad: 2 });
  });

  it("registrarPago: tambien encola en vez de bloquear al cajero cuando no hay red", async () => {
    global.fetch = vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    }) as unknown as typeof fetch;

    await expect(
      registrarPago({ pedidoId: "pedido-9", metodo: "efectivo", monto: 1000, montoRecibido: 1000 })
    ).rejects.toMatchObject({ codigo: "ENCOLADO_SIN_CONEXION" });

    const [entrada] = await listarCola();
    expect(entrada.url).toBe("/api/v1/pagos");
    // La idempotencyKey (uuid v7) generada por el cliente viaja en el cuerpo.
    expect(typeof (entrada.cuerpo as { idempotencyKey?: string }).idempotencyKey).toBe("string");
  });

  it("obtenerCatalogo: una lectura (GET) fallida NO se encola (solo escrituras se encolan)", async () => {
    global.fetch = vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    }) as unknown as typeof fetch;

    await expect(obtenerCatalogo()).rejects.toBeInstanceOf(ErrorApi);
    expect(await contarPendientes()).toBe(0);
  });

  it("obtenerCatalogo: si hay un catalogo cacheado de una carga exitosa previa, sirve ese cache cuando la red falla despues", async () => {
    const catalogoDeEjemplo = {
      categorias: [],
      productos: [{ id: "prod-1", nombre: "Combo Test" }],
      gruposModificador: [],
      modificadores: [],
      combos: [],
    };

    global.fetch = vi.fn(async () => new Response(JSON.stringify(catalogoDeEjemplo), { status: 200 })) as unknown as typeof fetch;
    const primeraCarga = await obtenerCatalogo();
    expect(primeraCarga).toEqual(catalogoDeEjemplo);

    global.fetch = vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    }) as unknown as typeof fetch;
    const segundaCarga = await obtenerCatalogo(); // sin red: cae al cache
    expect(segundaCarga).toEqual(catalogoDeEjemplo);
  });
});
