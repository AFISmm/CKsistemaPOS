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
import { useI18n } from "@/lib/shell/I18nProvider";
import OrderCard from "@/components/kds/OrderCard";
import FondoFoto from "@/components/shell/FondoFoto";
import {
  POLLING_MS,
  avanzarLocalOptimista,
  formatearReloj,
  nivelAlertaTiempo,
  normalizarRespuestaPedidos,
  ordenarFifo,
  referenciaTiempoCocina,
  type NivelAlertaTiempo,
} from "@/lib/kitchen/kds";

/** Clave de cache local (demo de resiliencia offline ante recarga de pagina). */
const CACHE_KEY = "ck-kds-cache-v1";

/** Cuanto dura el flash de confirmacion visual al pulsar "Enviar a caja" antes de retirar la tarjeta localmente. */
const FLASH_SALIENDO_MS = 500;

interface EntradaCola {
  pedido: Pedido;
}

export default function KdsPage() {
  const { t } = useI18n();
  const [entradas, setEntradas] = useState<Record<string, EntradaCola>>({});
  const [ahoraMs, setAhoraMs] = useState<number>(() => Date.now());
  const [conError, setConError] = useState(false);
  const [cargandoInicial, setCargandoInicial] = useState(true);
  const [enProgreso, setEnProgreso] = useState<Record<string, boolean>>({});
  const [saliendoIds, setSaliendoIds] = useState<Record<string, boolean>>({});

  const enVueloRef = useRef(false);
  // Nivel de alerta de tiempo visto en el poll anterior, por pedido (fuera de
  // React state a proposito: es solo para DETECTAR la transicion a "rojo" y
  // disparar la notificacion una vez; no debe causar re-renders por si solo).
  const nivelAlertaPrevioRef = useRef<Record<string, NivelAlertaTiempo>>({});

  /**
   * Fusiona la respuesta mas reciente del backend con el estado local. Desde
   * que el backend incluye "listo" en `?estado=cocina` (ver
   * app/api/v1/pedidos/route.ts) y el pedido solo sale de esta cola cuando su
   * `Pedido.estado` pasa a "entregado" (accion explicita "Enviar a caja"), ya
   * NO hace falta retener localmente tarjetas que el backend dejo de devolver
   * (el viejo esquema de "gracia" de GRACIA_LISTO_MS): si el backend no la
   * trae, es porque ya se envio a caja, y debe desaparecer de inmediato.
   */
  const fusionar = useCallback(
    (
      _previas: Record<string, EntradaCola>,
      nuevos: Pedido[]
    ): Record<string, EntradaCola> => {
      const resultado: Record<string, EntradaCola> = {};
      for (const pedido of nuevos) {
        resultado[pedido.id] = { pedido };
      }
      return resultado;
    },
    []
  );

  /**
   * Detecta pedidos que ACABAN de cruzar a nivel de alerta "rojo" (18+ min sin
   * salir de cocina) comparando contra el nivel visto en el poll anterior, y
   * dispara la notificacion al gerente una sola vez por pedido (Feature 2). El
   * backend tambien deduplica por si esto se llamara mas de una vez (ver
   * lib/notificaciones/notificaciones.ts, crearNotificacion), asi que esto es
   * seguro incluso si el poll se reintenta o el pedido desaparece y reaparece.
   */
  const detectarYNotificarDemoras = useCallback(
    (pedidos: Pedido[]) => {
      const ahora = Date.now();
      const nivelesActuales: Record<string, NivelAlertaTiempo> = {};
      for (const pedido of pedidos) {
        const nivel = nivelAlertaTiempo(referenciaTiempoCocina(pedido), ahora);
        nivelesActuales[pedido.id] = nivel;
        const anterior = nivelAlertaPrevioRef.current[pedido.id];
        if (nivel === "rojo" && anterior !== "rojo") {
          fetch("/api/v1/notificaciones", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ubicacionId: pedido.ubicacionId,
              tipo: "pedido",
              titulo: t("kds.notificacionDemoraTitulo"),
              mensaje: t("kds.notificacionDemoraMensaje", { numero: pedido.numeroOrden }),
              entidadRelacionadaHref: `/kds?pedidoId=${pedido.id}`,
            }),
          }).catch(() => {
            // Best-effort: si falla la notificacion no se rompe el KDS; el
            // proximo poll (si el pedido sigue en rojo) lo vuelve a intentar.
          });
        }
      }
      nivelAlertaPrevioRef.current = nivelesActuales;
    },
    [t]
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
      detectarYNotificarDemoras(pedidos);
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
  }, [fusionar, detectarYNotificarDemoras]);

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
        return { ...prev, [pedido.id]: { pedido: siguiente } };
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

  /**
   * "Enviar a caja" (Feature 3): transicion "listo" -> "entregado". Al
   * confirmar con el backend, se muestra un flash breve (`saliendoIds`,
   * `FLASH_SALIENDO_MS`) y luego se retira la tarjeta localmente; el
   * siguiente poll de todas formas ya no la traeria (el backend deja de
   * devolver pedidos "entregado" en `?estado=cocina`), asi que este retiro
   * local solo adelanta el feedback visual sin depender del timing exacto
   * del proximo poll.
   */
  const enviarACaja = useCallback(
    async (pedido: Pedido) => {
      if (enProgreso[pedido.id]) return;
      setEnProgreso((prev) => ({ ...prev, [pedido.id]: true }));
      try {
        const res = await fetch(`/api/v1/pedidos/${pedido.id}/enviar-caja`, {
          method: "POST",
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setConError(false);
        setSaliendoIds((prev) => ({ ...prev, [pedido.id]: true }));
        setTimeout(() => {
          setEntradas((prev) => {
            if (!(pedido.id in prev)) return prev;
            const { [pedido.id]: _quitado, ...resto } = prev;
            return resto;
          });
          setSaliendoIds((prev) => {
            if (!(pedido.id in prev)) return prev;
            const { [pedido.id]: _quitado, ...resto } = prev;
            return resto;
          });
        }, FLASH_SALIENDO_MS);
      } catch {
        // Sin conexion: no marcamos "saliendo" (seguiria visible en el KDS
        // hasta que el proximo poll exitoso confirme el estado real).
        setConError(true);
      } finally {
        setEnProgreso((prev) => ({ ...prev, [pedido.id]: false }));
        consultar();
      }
    },
    [enProgreso, consultar]
  );

  const listaOrdenada = ordenarFifo(Object.values(entradas).map((e) => e.pedido));
  const visibles = listaOrdenada;

  return (
    <main className="pos-notouch relative min-h-screen overflow-hidden bg-neutral-100 p-4 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
      <FondoFoto />
      <div className="relative z-10">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-neutral-300 pb-3 dark:border-neutral-800">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-neutral-900 dark:text-white">
            {t("kds.titulo")} <span className="text-ck-red">—</span> Chicken Kitchen
          </h1>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            {t("kds.sync", { seg: (POLLING_MS / 1000).toFixed(1) })}
          </p>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <div className="text-xs uppercase tracking-wide text-neutral-600 dark:text-neutral-500">
              {t("kds.comandasActivas")}
            </div>
            <div className="text-3xl font-black text-neutral-900 dark:text-white">
              {visibles.length}
            </div>
          </div>
          <div className="rounded-xl bg-white px-4 py-2 text-right shadow-sm dark:bg-neutral-900">
            <div className="text-xs uppercase tracking-wide text-neutral-600 dark:text-neutral-500">
              {t("kds.hora")}
            </div>
            <div className="font-mono text-2xl font-bold tabular-nums text-neutral-900 dark:text-white">
              {formatearReloj(ahoraMs)}
            </div>
          </div>
        </div>
      </header>

      {conError && (
        <div
          role="status"
          className="mb-4 rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 dark:border-red-700 dark:bg-red-950 dark:text-red-300"
        >
          {t("kds.sinConexionBanner")}
        </div>
      )}

      {cargandoInicial ? (
        <div className="grid place-items-center py-24 text-xl text-neutral-600 dark:text-neutral-500">
          {t("kds.cargandoComandas")}
        </div>
      ) : visibles.length === 0 ? (
        <div className="grid place-items-center py-24 text-center text-neutral-600 dark:text-neutral-500">
          <div className="text-2xl font-bold">{t("kds.sinComandas")}</div>
          <div className="mt-1 text-sm">{t("kds.cocinaAlDia")}</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visibles.map((pedido) => (
            <OrderCard
              key={pedido.id}
              pedido={pedido}
              ahoraMs={ahoraMs}
              saliendo={!!saliendoIds[pedido.id]}
              enProgreso={!!enProgreso[pedido.id]}
              onAvanzar={avanzar}
              onEnviarACaja={enviarACaja}
            />
          ))}
        </div>
      )}
      </div>
    </main>
  );
}
