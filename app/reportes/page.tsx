"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatearDinero, type Pedido, type Stock } from "@/lib/domain/types";
import { useI18n } from "@/lib/shell/I18nProvider";
import FondoFoto from "@/components/shell/FondoFoto";

const CLAVE_ESTADO_PEDIDO: Record<string, string> = {
  abierto: "reportes.estadoPedido.abierto",
  enviadoCocina: "reportes.estadoPedido.enviadoCocina",
  enPreparacion: "reportes.estadoPedido.enPreparacion",
  listo: "reportes.estadoPedido.listo",
  entregado: "reportes.estadoPedido.entregado",
  cobrado: "reportes.estadoPedido.cobrado",
  cancelado: "reportes.estadoPedido.cancelado",
};

/**
 * Reportes DEMO (placeholder). El modulo completo de reportes/analitica es Fase 3
 * (reportes-analitica-pos). Esta pagina evita un enlace roto y muestra en vivo un
 * resumen basico del dia a partir de la API de ventas e inventario.
 */
export default function ReportesPage() {
  const { t } = useI18n();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [bajoStock, setBajoStock] = useState<
    { nombre: string; cantidadActual: number; umbral: number }[]
  >([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    async function cargar() {
      try {
        const [rp, rs] = await Promise.all([
          fetch("/api/v1/pedidos", { cache: "no-store" }),
          fetch("/api/v1/stock", { cache: "no-store" }),
        ]);
        const dp = await rp.json();
        const ds = await rs.json();
        if (!vivo) return;
        const lista: Pedido[] = Array.isArray(dp) ? dp : dp.pedidos ?? [];
        setPedidos(lista);
        setBajoStock(ds.bajoUmbral ?? []);
        setError(null);
      } catch (e) {
        if (vivo) setError(t("reportes.errorCarga"));
      }
    }
    cargar();
    const intervalo = setInterval(cargar, 4000);
    return () => {
      vivo = false;
      clearInterval(intervalo);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cobrados = pedidos.filter((p) => p.estado === "cobrado");
  const ventas = cobrados.reduce((s, p) => s + (p.total ?? 0), 0);
  const impuestos = cobrados.reduce((s, p) => s + (p.impuestoTotal ?? 0), 0);
  const propinas = cobrados.reduce((s, p) => s + (p.propinaTotal ?? 0), 0);

  return (
    <main className="relative min-h-screen overflow-hidden bg-ck-cream p-6 dark:bg-neutral-950">
      <FondoFoto />
      <div className="relative z-10 mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-ck-dark dark:text-neutral-100">{t("reportes.titulo")}</h1>
          <Link href="/" className="text-sm text-ck-red underline dark:text-red-400">
            {t("reportes.inicio")}
          </Link>
        </div>
        <p className="mb-2 text-sm text-neutral-600 dark:text-neutral-400">
          {t("reportes.subtitulo")}
        </p>
        {/* Fase A (revision 2026-07-22, seccion 6.1): reporte historico de
            trazabilidad de tiempos por pedido (quien lo tomo, cuando entro/
            salio de cocina), separado de este resumen en vivo del dia. */}
        <Link
          href="/reportes/tiempos"
          className="mb-2 inline-block text-sm font-semibold text-ck-red underline dark:text-red-400"
        >
          {t("reportes.verTiempos")}
        </Link>
        {/* Fase A (revision 2026-07-22, "autorizacion de anulacion":
            registro de patrones por empleado): anulaciones y reembolsos
            agrupados por empleado, para deteccion de fraude/abuso. */}
        <Link
          href="/reportes/anulaciones"
          className="mb-6 block text-sm font-semibold text-ck-red underline dark:text-red-400"
        >
          {t("reportes.verAnulaciones")}
        </Link>

        {error && (
          <div className="mb-4 rounded-lg bg-red-100 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-4">
          <Tarjeta titulo={t("reportes.pedidosCobrados")} valor={String(cobrados.length)} />
          <Tarjeta titulo={t("reportes.ventas")} valor={formatearDinero(ventas)} />
          <Tarjeta titulo={t("reportes.impuestos")} valor={formatearDinero(impuestos)} />
          <Tarjeta titulo={t("reportes.propinas")} valor={formatearDinero(propinas)} />
        </div>

        <h2 className="mb-2 mt-8 text-lg font-semibold text-ck-dark dark:text-neutral-100">
          {t("reportes.stockBajoTitulo")}
        </h2>
        {bajoStock.length === 0 ? (
          <p className="text-sm text-neutral-600 dark:text-neutral-400">{t("reportes.sinAlertasStock")}</p>
        ) : (
          <ul className="space-y-1">
            {bajoStock.map((b, i) => (
              <li
                key={i}
                className="rounded-lg bg-white p-3 text-sm text-neutral-800 shadow-sm dark:bg-neutral-900 dark:text-neutral-200"
              >
                <span className="font-medium text-ck-dark dark:text-neutral-100">{b.nombre}</span>: {b.cantidadActual}{" "}
                ({t("reportes.umbral", { umbral: b.umbral })})
              </li>
            ))}
          </ul>
        )}

        <h2 className="mb-2 mt-8 text-lg font-semibold text-ck-dark dark:text-neutral-100">
          {t("reportes.pedidosTitulo", { n: pedidos.length })}
        </h2>
        <div className="overflow-hidden rounded-lg bg-white shadow-sm dark:bg-neutral-900">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
              <tr>
                <th className="p-2">#</th>
                <th className="p-2">{t("reportes.colCliente")}</th>
                <th className="p-2">{t("reportes.colEstado")}</th>
                <th className="p-2 text-right">{t("reportes.colTotal")}</th>
              </tr>
            </thead>
            <tbody>
              {pedidos.map((p) => (
                <tr key={p.id} className="border-t border-neutral-100 text-neutral-800 dark:border-neutral-800 dark:text-neutral-200">
                  <td className="p-2">{p.numeroOrden}</td>
                  <td className="p-2">{p.nombreCliente || "—"}</td>
                  <td className="p-2">{t(CLAVE_ESTADO_PEDIDO[p.estado] ?? "") || p.estado}</td>
                  <td className="p-2 text-right">{formatearDinero(p.total ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}

function Tarjeta({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm dark:bg-neutral-900">
      <div className="text-xs uppercase tracking-wide text-neutral-600 dark:text-neutral-400">
        {titulo}
      </div>
      <div className="mt-1 text-xl font-bold text-ck-dark dark:text-neutral-100">{valor}</div>
    </div>
  );
}
