"use client";

/**
 * Historial de pedidos — submodulo de Terminal de Cajero (app/pos), no un
 * modulo nuevo del sidebar principal (mismo patron que app/empleados/[id] es
 * submodulo de Empleados). Lista los pedidos que YA completaron su paso por
 * cocina ("entregado") y/o ya fueron cobrados ("cobrado"), mas recientes
 * primero, con la hora en que entraron a cocina, la hora en que salieron
 * hacia caja, y cuanto tiempo total tomaron en cocina.
 *
 * Fuente de datos: `GET /api/v1/pedidos?estado=historial` (filtro especial
 * agregado en app/api/v1/pedidos/route.ts que trae "entregado" + "cobrado"
 * en una sola llamada; ver comentario ESTADOS_HISTORIAL ahi).
 */

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { Pedido } from "@/lib/domain/types";
import { formatearDinero } from "@/lib/domain/types";
import { useI18n } from "@/lib/shell/I18nProvider";
import { textoErrorApi } from "@/lib/i18n/erroresApi";
import { listarPedidosPorEstado } from "@/components/pos/api";
import FondoFoto from "@/components/shell/FondoFoto";
import { formatearCronometro } from "@/lib/kitchen/kds";

const CLAVE_CANAL: Record<Pedido["canal"], string> = {
  mostrador: "kds.canal.mostrador",
  kiosco: "kds.canal.kiosco",
  online: "kds.canal.online",
  delivery: "kds.canal.delivery",
  catering: "kds.canal.catering",
};

function formatearHora(iso: string | null): string {
  if (!iso) return "—";
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return "—";
  return fecha.toLocaleTimeString("es-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/**
 * Tiempo total en cocina: desde que entro (enviadoACocinaEn) hasta que salio
 * hacia caja (entregadoEn). Si el pedido no paso por este flujo nuevo (dato
 * legado sin enviadoACocinaEn/entregadoEn), se muestra "—" en vez de un
 * numero enganoso.
 */
function duracionEnCocina(pedido: Pedido): string {
  if (!pedido.enviadoACocinaEn || !pedido.entregadoEn) return "—";
  const inicio = new Date(pedido.enviadoACocinaEn).getTime();
  const fin = new Date(pedido.entregadoEn).getTime();
  if (Number.isNaN(inicio) || Number.isNaN(fin) || fin < inicio) return "—";
  return formatearCronometro(fin - inicio);
}

export default function HistorialPedidosPage() {
  const { t } = useI18n();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const lista = await listarPedidosPorEstado("historial");
      const ordenados = [...lista].sort((a, b) => b.creadoEn.localeCompare(a.creadoEn));
      setPedidos(ordenados);
    } catch (err) {
      setError(textoErrorApi(err, t, "pos.historial.errorCarga"));
    } finally {
      setCargando(false);
    }
  }, [t]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  return (
    <main className="relative min-h-screen overflow-hidden bg-ck-cream p-6 dark:bg-neutral-950">
      <FondoFoto />
      <div className="relative z-10 mx-auto max-w-5xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Link href="/pos" className="text-sm text-ck-red underline dark:text-red-400">
            &larr; {t("pos.historial.volver")}
          </Link>
          <h1 className="text-2xl font-bold text-ck-dark dark:text-neutral-100">
            {t("pos.historial.titulo")}
          </h1>
          <button
            type="button"
            onClick={cargar}
            className="text-sm text-ck-red underline dark:text-red-400"
          >
            {t("pos.historial.actualizar")}
          </button>
        </div>

        {cargando ? (
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            {t("pos.historial.cargando")}
          </p>
        ) : error ? (
          <div className="rounded-lg bg-red-100 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </div>
        ) : pedidos.length === 0 ? (
          <div className="rounded-2xl bg-white p-6 text-center text-sm text-neutral-600 shadow-sm dark:bg-neutral-900 dark:text-neutral-400">
            {t("pos.historial.sinPedidos")}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl bg-white shadow-sm dark:bg-neutral-900">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-neutral-200 text-xs uppercase text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
                <tr>
                  <th className="px-4 py-3">{t("pos.historial.colOrden")}</th>
                  <th className="px-4 py-3">{t("pos.historial.colCliente")}</th>
                  <th className="px-4 py-3">{t("pos.historial.colCanal")}</th>
                  <th className="px-4 py-3">{t("pos.historial.colEstado")}</th>
                  <th className="px-4 py-3">{t("pos.historial.colEnviadoCocina")}</th>
                  <th className="px-4 py-3">{t("pos.historial.colEnviadoCaja")}</th>
                  <th className="px-4 py-3">{t("pos.historial.colDuracion")}</th>
                  <th className="px-4 py-3 text-right">{t("pos.historial.colTotal")}</th>
                </tr>
              </thead>
              <tbody>
                {pedidos.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-neutral-100 last:border-0 dark:border-neutral-800"
                  >
                    <td className="px-4 py-3 font-bold text-ck-dark dark:text-neutral-100">
                      #{p.numeroOrden}
                    </td>
                    <td className="px-4 py-3 text-neutral-700 dark:text-neutral-300">
                      {p.nombreCliente || t("kds.cliente")}
                    </td>
                    <td className="px-4 py-3 text-neutral-700 dark:text-neutral-300">
                      {t(CLAVE_CANAL[p.canal] ?? "kds.canal.mostrador")}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          p.estado === "cobrado"
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                            : "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
                        }`}
                      >
                        {p.estado === "cobrado"
                          ? t("pos.historial.estadoCobrado")
                          : t("pos.historial.estadoEntregado")}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-neutral-700 dark:text-neutral-300">
                      {formatearHora(p.enviadoACocinaEn)}
                    </td>
                    <td className="px-4 py-3 font-mono text-neutral-700 dark:text-neutral-300">
                      {formatearHora(p.entregadoEn)}
                    </td>
                    <td className="px-4 py-3 font-mono text-neutral-700 dark:text-neutral-300">
                      {duracionEnCocina(p)}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-ck-dark dark:text-neutral-100">
                      {formatearDinero(p.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
