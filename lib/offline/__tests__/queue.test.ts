/**
 * Pruebas de la cola de escritura offline (lib/offline/queue.ts + db.ts) —
 * F1-T3 (DUENO: frontend-mostrador-kiosco-pos). Runner: Vitest.
 *
 * Se corre en entorno Node (sin `indexedDB`), por lo que lib/offline/db.ts
 * cae automaticamente a su almacen en memoria (ver comentario de cabecera de
 * ese archivo) — es exactamente el mismo codigo de orden/CRUD que corre en
 * el navegador contra IndexedDB real, asi que estas pruebas cubren la logica
 * de negocio de la cola sin necesitar un shim de IndexedDB.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { _reiniciarParaPruebas, listarCola } from "../db";
import { contarPendientes, drenarCola, encolarEscritura } from "../queue";

beforeEach(async () => {
  await _reiniciarParaPruebas();
});

function respuestaOk(body: unknown = {}) {
  return new Response(JSON.stringify(body), { status: 200 });
}

function respuestaConflicto() {
  return new Response(JSON.stringify({ codigo: "ya_aplicado" }), { status: 409 });
}

describe("encolarEscritura", () => {
  it("agrega una escritura fallida a la cola y actualiza el contador de pendientes", async () => {
    expect(await contarPendientes()).toBe(0);

    const entrada = await encolarEscritura("POST", "/api/v1/pedidos/p1/lineas", {
      productoId: "prod-1",
      cantidad: 1,
    });

    expect(entrada.metodo).toBe("POST");
    expect(entrada.intentos).toBe(0);
    expect(await contarPendientes()).toBe(1);

    const cola = await listarCola();
    expect(cola).toHaveLength(1);
    expect(cola[0].id).toBe(entrada.id);
    expect(cola[0].cuerpo).toEqual({ productoId: "prod-1", cantidad: 1 });
  });
});

describe("drenarCola", () => {
  it("reproduce las escrituras encoladas EN ORDEN ORIGINAL y las retira solo tras 2xx real", async () => {
    await encolarEscritura("POST", "/api/v1/pedidos", { paso: 1 });
    await encolarEscritura("POST", "/api/v1/pedidos/p1/lineas", { paso: 2 });
    await encolarEscritura("POST", "/api/v1/pedidos/p1/enviar-cocina", { paso: 3 });

    const urlsLlamadas: string[] = [];
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      urlsLlamadas.push(String(input));
      return respuestaOk({ ok: true });
    });

    const resultado = await drenarCola(fetchMock as unknown as typeof fetch);

    expect(resultado).toEqual({
      sincronizados: 3,
      conflictosIdempotentes: 0,
      detenidoPorFallo: false,
    });
    // Orden preservado: pedido -> linea -> enviar a cocina.
    expect(urlsLlamadas).toEqual([
      "/api/v1/pedidos",
      "/api/v1/pedidos/p1/lineas",
      "/api/v1/pedidos/p1/enviar-cocina",
    ]);
    expect(await contarPendientes()).toBe(0);
  });

  it("un fallo detiene el drenado en su lugar (no se salta al siguiente) y conserva el orden para el proximo intento", async () => {
    await encolarEscritura("POST", "/api/v1/pedidos", { paso: 1 });
    await encolarEscritura("POST", "/api/v1/pedidos/p1/lineas", { paso: 2 });

    // La primera escritura sigue fallando (red caida de nuevo a mitad del
    // drenado); la segunda NUNCA deberia intentarse en esta corrida.
    const fetchMock = vi.fn(async () => {
      throw new Error("network down");
    });

    const resultado = await drenarCola(fetchMock as unknown as typeof fetch);

    expect(resultado.sincronizados).toBe(0);
    expect(resultado.detenidoPorFallo).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1); // no se salto a la segunda
    expect(await contarPendientes()).toBe(2); // ninguna se perdio

    const cola = await listarCola();
    expect(cola[0].intentos).toBe(1); // se registro el reintento fallido
  });

  it("retoma donde quedo: tras un fallo, un segundo drenado exitoso completa la cola en orden", async () => {
    await encolarEscritura("POST", "/api/v1/pedidos", { paso: 1 });
    await encolarEscritura("POST", "/api/v1/pedidos/p1/lineas", { paso: 2 });

    let fallar = true;
    const urlsLlamadas: string[] = [];
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      if (fallar) throw new Error("network down");
      urlsLlamadas.push(String(input));
      return respuestaOk();
    });

    await drenarCola(fetchMock as unknown as typeof fetch); // falla, no avanza
    fallar = false;
    const resultado = await drenarCola(fetchMock as unknown as typeof fetch); // ahora si hay red

    expect(resultado.sincronizados).toBe(2);
    expect(urlsLlamadas).toEqual(["/api/v1/pedidos", "/api/v1/pedidos/p1/lineas"]);
    expect(await contarPendientes()).toBe(0);
  });

  it("trata un 409 en el reintento como ya-aplicado: retira de la cola sin reintentar y sin duplicar", async () => {
    await encolarEscritura("POST", "/api/v1/pagos", {
      pedidoId: "p1",
      metodo: "efectivo",
      monto: 1070,
      montoRecibido: 2000,
    });

    const fetchMock = vi.fn(async () => respuestaConflicto());

    const resultado = await drenarCola(fetchMock as unknown as typeof fetch);

    expect(resultado.conflictosIdempotentes).toBe(1);
    expect(resultado.sincronizados).toBe(0);
    expect(resultado.detenidoPorFallo).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    // Se retiro de la cola (no queda pendiente ni se reintenta indefinidamente).
    expect(await contarPendientes()).toBe(0);

    // Un drenado posterior no vuelve a llamar a fetch: ya no hay nada encolado,
    // asi que no puede "duplicar" el pago.
    const segundoResultado = await drenarCola(fetchMock as unknown as typeof fetch);
    expect(segundoResultado).toEqual({
      sincronizados: 0,
      conflictosIdempotentes: 0,
      detenidoPorFallo: false,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("una mezcla de exito + 409 en la misma corrida vacia toda la cola", async () => {
    await encolarEscritura("POST", "/api/v1/pedidos/p1/lineas", { paso: 1 });
    await encolarEscritura("POST", "/api/v1/pedidos/p1/descuento", { paso: 2 });

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(respuestaOk())
      .mockResolvedValueOnce(respuestaConflicto());

    const resultado = await drenarCola(fetchMock as unknown as typeof fetch);

    expect(resultado.sincronizados).toBe(1);
    expect(resultado.conflictosIdempotentes).toBe(1);
    expect(resultado.detenidoPorFallo).toBe(false);
    expect(await contarPendientes()).toBe(0);
  });
});
