"use client";

/**
 * Pantalla de cocina (KDS) — DEMO Chicken Kitchen.
 *
 * Componente CLIENTE puro: solo habla con el backend por `fetch` a los
 * endpoints REST de `backend-ventas-pos` (contrato en README-DEMO.md).
 * NO importa `lib/db`, `lib/sales` ni ningun modulo de servidor: solo tipos
 * de `lib/domain/types` y helpers puros de `lib/kitchen/kds.ts`.
 *
 * Sincronizacion en vivo: POLLING HTTP cada `POLLING_MS` (~2.5s). Es una
 * simplificacion de demo documentada en README-DEMO.md / ADR-0003; produccion
 * usaria un bus WebSocket/NATS en LAN de la tienda para push en tiempo real.
 *
 * Offline-first (demo): si el fetch falla (sin red / backend caido), la cola
 * NO se borra — se sigue mostrando la ultima version conocida (guardada
 * tambien en localStorage para sobrevivir a un recargo de pagina) y se avisa
 * con un banner, tal como exige el KDS de una cocina abierta que no puede
 * detenerse por una falla de nube.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { Pedido } from "@/lib/domain/types";
import OrderCard from "@/components/kds/OrderCard";
import {
  GRACIA_LISTO_MS,
  POLLING_MS,
  avanzarLocalOptimista,
  estadoCocinaAgregado,
  formatearReloj,
  normalizarRespuestaPedidos,
  ordenarFifo,
} from "@/lib/kitchen/kds";

/** Clave de cache local (demo de resiliencia offline ante recarga de pagina). */
const CACHE_KEY = "ck-kds-cache-v1";

interface EntradaCola {
  pedido: Pedido;
  /** timestamp (ms) desde que la tarjeta quedo "lista"; null si no lo esta. */
  listoDesde: number | null;
}

export default function KdsPage() {
  const [entradas, setEntradas] = useState<Record<string, EntradaCola>>({});
  const [ahoraMs, setAhoraMs] = useState<number>(() => Date.now());
  const [conError, setConError] = useState(false);
  const [cargandoInicial, setCargandoInicial] = useState(true);
  const [enProgreso, setEnProgreso] = useState<Record<string, boolean>>({});

  const enVueloRef = useRef(false);

  /**
   * Fusiona la respuesta mas reciente del backend con el estado local:
   *  - Detecta cuando una tarjeta pasa a "listo" (todas sus lineas listas) y
   *    marca `listoDesde` para poder atenuarla/retirarla tras `GRACIA_LISTO_MS`.
   *  - Conserva por un rato tarjetas que el backend dejo de devolver (porque
   *    el pedido salio de la cola de cocina) si acababan de quedar listas,
   *    para no hacerlas desaparecer de golpe de la pantalla.
   */
  const fusionar = useCallback(
    (
      previas: Record<string, EntradaCola>,
      nuevos: Pedido[]
    ): Record<string, EntradaCola> => {
      const ahora = Date.now();
      const idsNuevos = new Set(nuevos.map((p) => p.id));
      const resultado: Record<string, EntradaCola> = {};

      for (const pedido of nuevos) {
        const previa = previas[pedido.id];
        const estado = estadoCocinaAgregado(pedido);
        let listoDesde = previa?.listoDesde ?? null;
        if (estado === "listo" && listoDesde === null) {
          listoDesde = ahora;
        } else if (estado !== "listo") {
          listoDesde = null;
        }
        resultado[pedido.id] = { pedido, listoDesde };
      }

      for (const [id, previa] of Object.entries(previas)) {
        if (
          !idsNuevos.has(id) &&
          previa.listoDesde !== null &&
          ahora - previa.listoDesde < GRACIA_LISTO_MS
        ) {
          resultado[id] = previa;
        }
      }

      return resultado;
    },
    []
  );

  // Hidratar desde cache local (si existe) antes del primer fetch: permite
  // seguir viendo la ultima cola conocida si se recarga la pagina sin red.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(CACHE_KEY);
      if (raw) {
        const pedidosCache = normalizarRespuestaPedidos(JSON.parse(raw));
        if (pedidosCache.length > 0) {
          setEntradas((prev) => fusionar(prev, pedidosCache));
          setCargandoInicial(false);
        }
      }
    } catch {
      // Cache no disponible o corrupta: no es critico, se ignora.
    }
    // Solo al montar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const consultar = useCallback(async () => {
    if (enVueloRef.current) return;
    enVueloRef.current = true;
    try {
      const res = await fetch("/api/v1/pedidos?estado=cocina", {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: unknown = await res.json();
      const pedidos = normalizarRespuestaPedidos(json);
      setEntradas((prev) => fusionar(prev, pedidos));
      setConError(false);
      try {
        window.localStorage.setItem(CACHE_KEY, JSON.stringify(pedidos));
      } catch {
        // Sin localStorage disponible: seguimos operando solo en memoria.
      }
    } catch {
      // Backend caido / sin red: no rompemos la UI. Conservamos la ultima
      // cola conocida (offline-first) y avisamos con un banner.
      setConError(true);
    } finally {
      enVueloRef.current = false;
      setCargandoInicial(false);
    }
  }, [fusionar]);

  // Polling principal.
  useEffect(() => {
    consultar();
    const id = setInterval(consultar, POLLING_MS);
    return () => clearInterval(id);
  }, [consultar]);

  // Reloj / cronometros: tick cada segundo, independiente del polling.
  useEffect(() => {
    const id = setInterval(() => setAhoraMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const avanzar = useCallback(
    async (pedido: Pedido) => {
      if (enProgreso[pedido.id]) return;
      setEnProgreso((prev) => ({ ...prev, [pedido.id]: true }));

      // Optimista: feedback tactil inmediato mientras se confirma con el backend.
      setEntradas((prev) => {
        const previa = prev[pedido.id];
        if (!previa) return prev;
        const siguiente = avanzarLocalOptimista(previa.pedido);
        const estado = estadoCocinaAgregado(siguiente);
        return {
          ...prev,
          [pedido.id]: {
            pedido: siguiente,
            listoDesde: estado === "listo" ? Date.now() : null,
          },
        };
      });

      try {
        const res = await fetch(`/api/v1/pedidos/${pedido.id}/cocina`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setConError(false);
      } catch {
        // No revertimos el cambio optimista: si el backend esta caido, la
        // cocina sigue operando localmente y el proximo poll exitoso
        // reconcilia el estado real (offline-first, ADR-0002).
        setConError(true);
      } finally {
        setEnProgreso((prev) => ({ ...prev, [pedido.id]: false }));
        consultar();
      }
    },
    [enProgreso, consultar]
  );

  const listaOrdenada = ordenarFifo(Object.values(entradas).map((e) => e.pedido));
  const visibles = listaOrdenada.filter((p) => {
    const entrada = entradas[p.id];
    if (!entrada || entrada.listoDesde === null) return true;
    return ahoraMs - entrada.listoDesde <= GRACIA_LISTO_MS;
  });

  return (
    <main className="pos-notouch min-h-screen bg-neutral-950 p-4 text-neutral-100">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-neutral-800 pb-3">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white">
            Cocina <span className="text-ck-red">—</span> Chicken Kitchen
          </h1>
          <p className="text-sm text-neutral-400">
            KDS · sincronizacion cada {(POLLING_MS / 1000).toFixed(1)}s (demo;
            produccion = WebSocket, ADR-0003)
          </p>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <div className="text-xs uppercase tracking-wide text-neutral-500">
              Comandas activas
            </div>
            <div className="text-3xl font-black text-white">
              {visibles.length}
            </div>
          </div>
          <div className="rounded-xl bg-neutral-900 px-4 py-2 text-right">
            <div className="text-xs uppercase tracking-wide text-neutral-500">
              Hora
            </div>
            <div className="font-mono text-2xl font-bold tabular-nums text-white">
              {formatearReloj(ahoraMs)}
            </div>
          </div>
        </div>
      </header>

      {conError && (
        <div
          role="status"
          className="mb-4 rounded-lg border border-red-700 bg-red-950 px-4 py-2 text-sm font-semibold text-red-300"
        >
          Sin conexion con el servidor de pedidos. Mostrando la ultima cola
          conocida (modo offline) — se reintenta automaticamente.
        </div>
      )}

      {cargandoInicial ? (
        <div className="grid place-items-center py-24 text-xl text-neutral-500">
          Cargando comandas…
        </div>
      ) : visibles.length === 0 ? (
        <div className="grid place-items-center py-24 text-center text-neutral-500">
          <div className="text-2xl font-bold">Sin comandas pendientes</div>
          <div className="mt-1 text-sm">La cocina esta al dia.</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visibles.map((pedido) => {
            const entrada = entradas[pedido.id];
            const atenuado = !!entrada && entrada.listoDesde !== null;
            return (
              <OrderCard
                key={pedido.id}
                pedido={pedido}
                ahoraMs={ahoraMs}
                atenuado={atenuado}
                enProgreso={!!enProgreso[pedido.id]}
                onAvanzar={avanzar}
              />
            );
          })}
        </div>
      )}
    </main>
  );
}
