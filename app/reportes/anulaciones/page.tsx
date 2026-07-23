"use client";

/**
 * Reporte de anulaciones/reembolsos por empleado — sub-pagina de /reportes
 * (Fase A, revision 2026-07-22, "autorizacion de anulacion: mecanismo +
 * registro de patrones por empleado"). Por empleado, dentro de un rango de
 * fechas seleccionable: cuantas anulaciones (pre-cobro) y reembolsos
 * (post-cobro) hizo, el monto total de los pedidos involucrados y que
 * PRODUCTOS aparecen mas seguido — la senal clasica que un gerente usa para
 * detectar abuso/fraude de mostrador (ej. un cajero que anula sistematicamente
 * el mismo producto caro).
 *
 * Fuente de datos: `GET /api/v1/reportes/anulaciones?desde=...&hasta=...`
 * (join server-side con Usuario/Pedido, ver ese route handler). La
 * agrupacion por empleado se hace en el cliente con la funcion pura
 * `agruparAnulacionesPorEmpleado` de lib/reportes/anulaciones.ts (mismo
 * patron que app/reportes/tiempos usa lib/reportes/tiempos.ts).
 */

import Link from "next/link";
import { Fragment, useCallback, useEffect, useState } from "react";
import { formatearDinero } from "@/lib/domain/types";
import { useI18n } from "@/lib/shell/I18nProvider";
import FondoFoto from "@/components/shell/FondoFoto";
import {
  agruparAnulacionesPorEmpleado,
  type EventoAnulacion,
  type FilaAnulacionPorEmpleado,
} from "@/lib/reportes/anulaciones";

function fechaISOHaceDias(dias: number): string {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  return d.toISOString().slice(0, 10);
}

function formatearHora(iso: string): string {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return "—";
  return fecha.toLocaleString("es-US", {
    month: "2-digit",
    day: "2-digit",
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ReporteAnulacionesPage() {
  const { t } = useI18n();
  const [desde, setDesde] = useState(fechaISOHaceDias(29));
  const [hasta, setHasta] = useState(fechaISOHaceDias(0));
  const [filas, setFilas] = useState<FilaAnulacionPorEmpleado[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [empleadoExpandidoId, setEmpleadoExpandidoId] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const params = new URLSearchParams({ desde, hasta });
      const resp = await fetch(`/api/v1/reportes/anulaciones?${params.toString()}`, {
        cache: "no-store",
      });
      if (!resp.ok) throw new Error("http_error");
      const datos = await resp.json();
      const eventos: EventoAnulacion[] = Array.isArray(datos.eventos) ? datos.eventos : [];
      setFilas(agruparAnulacionesPorEmpleado(eventos));
    } catch {
      setError(t("reportes.anulaciones.errorCarga"));
    } finally {
      setCargando(false);
    }
  }, [desde, hasta, t]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const totalEventos = filas.reduce((s, f) => s + f.total, 0);
  const totalMonto = filas.reduce((s, f) => s + f.montoTotalInvolucrado, 0);

  return (
    <main className="relative min-h-screen overflow-hidden bg-ck-cream p-6 dark:bg-neutral-950">
      <FondoFoto />
      <div className="relative z-10 mx-auto max-w-6xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-ck-dark dark:text-neutral-100">
              {t("reportes.anulaciones.titulo")}
            </h1>
            <p className="max-w-2xl text-sm text-neutral-600 dark:text-neutral-400">
              {t("reportes.anulaciones.subtitulo")}
            </p>
          </div>
          <Link href="/reportes" className="text-sm text-ck-red underline dark:text-red-400">
            &larr; {t("reportes.anulaciones.volver")}
          </Link>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-100 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </div>
        )}

        <div className="mb-6 flex flex-wrap items-end gap-3 rounded-xl bg-white p-4 shadow-sm dark:bg-neutral-900">
          <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">
            {t("reportes.anulaciones.desde")}
            <input
              type="date"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
              className="mt-1 block rounded-lg border border-neutral-300 px-2 py-1 text-sm text-ck-dark dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
            />
          </label>
          <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">
            {t("reportes.anulaciones.hasta")}
            <input
              type="date"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
              className="mt-1 block rounded-lg border border-neutral-300 px-2 py-1 text-sm text-ck-dark dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
            />
          </label>
          <button
            type="button"
            onClick={cargar}
            className="rounded-xl bg-ck-red px-5 py-2 text-sm font-bold text-white"
          >
            {t("reportes.anulaciones.actualizar")}
          </button>
        </div>

        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <Tarjeta titulo={t("reportes.anulaciones.resumenEmpleados")} valor={String(filas.length)} />
          <Tarjeta titulo={t("reportes.anulaciones.resumenEventos")} valor={String(totalEventos)} />
          <Tarjeta
            titulo={t("reportes.anulaciones.resumenMonto")}
            valor={formatearDinero(totalMonto)}
          />
        </div>

        {cargando ? (
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            {t("reportes.anulaciones.cargando")}
          </p>
        ) : filas.length === 0 ? (
          <div className="rounded-2xl bg-white p-6 text-center text-sm text-neutral-600 shadow-sm dark:bg-neutral-900 dark:text-neutral-400">
            {t("reportes.anulaciones.sinEventos")}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl bg-white shadow-sm dark:bg-neutral-900">
            <table className="w-full min-w-[880px] text-left text-sm">
              <thead className="border-b border-neutral-200 text-xs uppercase text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
                <tr>
                  <th className="px-3 py-3">{t("reportes.anulaciones.colEmpleado")}</th>
                  <th className="px-3 py-3 text-right">{t("reportes.anulaciones.colCancelaciones")}</th>
                  <th className="px-3 py-3 text-right">{t("reportes.anulaciones.colReembolsos")}</th>
                  <th className="px-3 py-3 text-right">{t("reportes.anulaciones.colTotal")}</th>
                  <th className="px-3 py-3 text-right">{t("reportes.anulaciones.colMonto")}</th>
                  <th className="px-3 py-3">{t("reportes.anulaciones.colProductos")}</th>
                  <th className="px-3 py-3">{/* expandir */}</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((fila) => {
                  const clave = fila.usuarioId ?? "sin_usuario";
                  const expandido = empleadoExpandidoId === clave;
                  return (
                    <Fragment key={clave}>
                      <tr
                        key={clave}
                        className="border-b border-neutral-100 last:border-0 dark:border-neutral-800"
                      >
                        <td className="px-3 py-2 font-semibold text-ck-dark dark:text-neutral-100">
                          {fila.nombreUsuario}
                        </td>
                        <td className="px-3 py-2 text-right text-neutral-700 dark:text-neutral-300">
                          {fila.cancelaciones}
                        </td>
                        <td className="px-3 py-2 text-right text-neutral-700 dark:text-neutral-300">
                          {fila.reembolsos}
                        </td>
                        <td className="px-3 py-2 text-right font-bold text-ck-dark dark:text-neutral-100">
                          {fila.total}
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-neutral-700 dark:text-neutral-300">
                          {formatearDinero(fila.montoTotalInvolucrado)}
                        </td>
                        <td className="px-3 py-2 text-neutral-700 dark:text-neutral-300">
                          {fila.productos.slice(0, 3).map((p) => `${p.cantidad}× ${p.descripcion}`).join(", ") ||
                            "—"}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <button
                            type="button"
                            onClick={() => setEmpleadoExpandidoId(expandido ? null : clave)}
                            className="text-xs font-semibold text-ck-red underline dark:text-red-400"
                          >
                            {expandido
                              ? t("reportes.anulaciones.ocultarDetalle")
                              : t("reportes.anulaciones.verDetalle")}
                          </button>
                        </td>
                      </tr>
                      {expandido && (
                        <tr key={`${clave}-detalle`} className="border-b border-neutral-100 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-800/40">
                          <td colSpan={7} className="px-3 py-3">
                            <ul className="space-y-1 text-xs text-neutral-700 dark:text-neutral-300">
                              {fila.eventos
                                .slice()
                                .sort((a, b) => b.ocurridoEn.localeCompare(a.ocurridoEn))
                                .map((ev) => (
                                  <li key={ev.id} className="flex flex-wrap items-center gap-2">
                                    <span className="font-mono">{formatearHora(ev.ocurridoEn)}</span>
                                    <span
                                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                                        ev.tipo === "cancelacion"
                                          ? "bg-neutral-200 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-200"
                                          : "bg-ck-gold/20 text-ck-gold"
                                      }`}
                                    >
                                      {ev.tipo === "cancelacion"
                                        ? t("reportes.anulaciones.tipoCancelacion")
                                        : t("reportes.anulaciones.tipoReembolso")}
                                    </span>
                                    <span>
                                      {ev.numeroOrden !== null ? `#${ev.numeroOrden}` : ev.pedidoId}
                                    </span>
                                    {ev.totalPedido !== null && (
                                      <span className="font-mono">{formatearDinero(ev.totalPedido)}</span>
                                    )}
                                    <span className="italic text-neutral-500 dark:text-neutral-400">
                                      {ev.motivo}
                                    </span>
                                  </li>
                                ))}
                            </ul>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}

function Tarjeta({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm dark:bg-neutral-900">
      <div className="text-xs uppercase tracking-wide text-neutral-600 dark:text-neutral-400">{titulo}</div>
      <div className="mt-1 text-xl font-bold text-ck-dark dark:text-neutral-100">{valor}</div>
    </div>
  );
}
