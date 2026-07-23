"use client";

/**
 * Reporte de tiempos operativos — sub-pagina de /reportes (Fase A, revision
 * 2026-07-22 seccion 6.1). Por pedido, dentro de un rango de fechas
 * seleccionable: quien lo tomo, cuando entro a cocina, cuando salio hacia
 * caja/se cerro, y las duraciones derivadas. Pensado para que un gerente
 * resuelva disputas de "quien causo la demora" y detecte patrones de cuello
 * de botella por hora del dia (ej. la hora pico del almuerzo).
 *
 * Fuente de datos: `GET /api/v1/reportes/tiempos?desde=...&hasta=...` (join
 * server-side con Turno/Usuario, ver ese route handler para la resolucion de
 * nombres). El calculo de duraciones y la agrupacion por hora se hacen aqui
 * en el cliente con las funciones puras de lib/reportes/tiempos.ts (mismo
 * patron que app/pos/historial usa lib/kitchen/kds.ts).
 *
 * LIMITACION CONOCIDA (ver tambien el comentario de cabecera del route
 * handler y Pedido.creadoPorUsuarioId en lib/domain/types.ts): la columna
 * "Tomado por" solo se puebla para pedidos creados por un cliente que envie
 * `usuarioId` al crear el pedido — el cliente de POS actual (components/pos/*,
 * fuera del alcance editable de esta tarea) TODAVIA no lo hace, asi que hoy
 * esa columna aparece vacia para pedidos reales de la demo. Se muestra
 * "Cajero de turno" como referencia de respaldo siempre disponible (ver nota
 * en la UI, `reportes.tiempos.notaCreadoPor`).
 */

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@/lib/shell/I18nProvider";
import FondoFoto from "@/components/shell/FondoFoto";
import { formatearCronometro } from "@/lib/kitchen/kds";
import {
  agruparPorHoraDelDia,
  calcularDuraciones,
  type FilaTiempoPedido,
  type FilaTiempoPedidoConDuraciones,
} from "@/lib/reportes/tiempos";

const CLAVE_CANAL: Record<string, string> = {
  mostrador: "kds.canal.mostrador",
  kiosco: "kds.canal.kiosco",
  online: "kds.canal.online",
  delivery: "kds.canal.delivery",
  catering: "kds.canal.catering",
};

function fechaISOHaceDias(dias: number): string {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  return d.toISOString().slice(0, 10);
}

function formatearHora(iso: string | null): string {
  if (!iso) return "—";
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

function formatearMs(ms: number | null): string {
  return ms === null ? "—" : formatearCronometro(ms);
}

/** Etiqueta de la hora del dia como rango "HH:00–HH:59" (mas facil de leer que un solo numero). */
function etiquetaHora(hora: number): string {
  return `${String(hora).padStart(2, "0")}:00–${String(hora).padStart(2, "0")}:59`;
}

export default function ReporteTiemposPage() {
  const { t } = useI18n();
  const [desde, setDesde] = useState(fechaISOHaceDias(6));
  const [hasta, setHasta] = useState(fechaISOHaceDias(0));
  const [filas, setFilas] = useState<FilaTiempoPedidoConDuraciones[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const params = new URLSearchParams({ desde, hasta });
      const resp = await fetch(`/api/v1/reportes/tiempos?${params.toString()}`, { cache: "no-store" });
      if (!resp.ok) throw new Error("http_error");
      const datos = await resp.json();
      const pedidos: FilaTiempoPedido[] = Array.isArray(datos.pedidos) ? datos.pedidos : [];
      setFilas(pedidos.map(calcularDuraciones));
    } catch {
      setError(t("reportes.tiempos.errorCarga"));
    } finally {
      setCargando(false);
    }
  }, [desde, hasta, t]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const conCocina = filas.filter((f) => f.msEnCocina !== null);
  const conTotal = filas.filter((f) => f.msTotal !== null);
  const promedioCocina =
    conCocina.length > 0
      ? Math.round(conCocina.reduce((s, f) => s + (f.msEnCocina ?? 0), 0) / conCocina.length)
      : null;
  const promedioTotal =
    conTotal.length > 0
      ? Math.round(conTotal.reduce((s, f) => s + (f.msTotal ?? 0), 0) / conTotal.length)
      : null;
  const cubetasHora = agruparPorHoraDelDia(filas);
  const maxPromedioCocinaHora = Math.max(1, ...cubetasHora.map((c) => c.promedioMsCocina ?? 0));

  return (
    <main className="relative min-h-screen overflow-hidden bg-ck-cream p-6 dark:bg-neutral-950">
      <FondoFoto />
      <div className="relative z-10 mx-auto max-w-6xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-ck-dark dark:text-neutral-100">
              {t("reportes.tiempos.titulo")}
            </h1>
            <p className="max-w-2xl text-sm text-neutral-600 dark:text-neutral-400">
              {t("reportes.tiempos.subtitulo")}
            </p>
          </div>
          <Link href="/reportes" className="text-sm text-ck-red underline dark:text-red-400">
            &larr; {t("reportes.tiempos.volver")}
          </Link>
        </div>

        <div className="mb-4 rounded-xl border border-ck-gold/40 bg-ck-gold/10 p-3 text-xs leading-snug text-ck-dark dark:text-neutral-100">
          {t("reportes.tiempos.notaCreadoPor")}
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-100 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </div>
        )}

        <div className="mb-6 flex flex-wrap items-end gap-3 rounded-xl bg-white p-4 shadow-sm dark:bg-neutral-900">
          <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">
            {t("reportes.tiempos.desde")}
            <input
              type="date"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
              className="mt-1 block rounded-lg border border-neutral-300 px-2 py-1 text-sm text-ck-dark dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
            />
          </label>
          <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">
            {t("reportes.tiempos.hasta")}
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
            {t("reportes.tiempos.actualizar")}
          </button>
        </div>

        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <Tarjeta titulo={t("reportes.tiempos.resumenPedidos")} valor={String(filas.length)} />
          <Tarjeta
            titulo={t("reportes.tiempos.resumenPromedioCocina")}
            valor={promedioCocina !== null ? formatearMs(promedioCocina) : t("reportes.tiempos.sinDatoPromedio")}
          />
          <Tarjeta
            titulo={t("reportes.tiempos.resumenPromedioTotal")}
            valor={promedioTotal !== null ? formatearMs(promedioTotal) : t("reportes.tiempos.sinDatoPromedio")}
          />
        </div>

        {cargando ? (
          <p className="text-sm text-neutral-600 dark:text-neutral-400">{t("reportes.tiempos.cargando")}</p>
        ) : filas.length === 0 ? (
          <div className="rounded-2xl bg-white p-6 text-center text-sm text-neutral-600 shadow-sm dark:bg-neutral-900 dark:text-neutral-400">
            {t("reportes.tiempos.sinPedidos")}
          </div>
        ) : (
          <>
            <div className="mb-8 overflow-x-auto rounded-2xl bg-white shadow-sm dark:bg-neutral-900">
              <table className="w-full min-w-[1080px] text-left text-sm">
                <thead className="border-b border-neutral-200 text-xs uppercase text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
                  <tr>
                    <th className="px-3 py-3">{t("reportes.tiempos.colOrden")}</th>
                    <th className="px-3 py-3">{t("reportes.tiempos.colCliente")}</th>
                    <th className="px-3 py-3">{t("reportes.tiempos.colCanal")}</th>
                    <th className="px-3 py-3">{t("reportes.tiempos.colEstado")}</th>
                    <th className="px-3 py-3">{t("reportes.tiempos.colCreadoEn")}</th>
                    <th className="px-3 py-3">{t("reportes.tiempos.colTomadoPor")}</th>
                    <th className="px-3 py-3">{t("reportes.tiempos.colCajeroTurno")}</th>
                    <th className="px-3 py-3">{t("reportes.tiempos.colEnviadoCocina")}</th>
                    <th className="px-3 py-3">{t("reportes.tiempos.colSalidaCocina")}</th>
                    <th className="px-3 py-3 text-right">{t("reportes.tiempos.colArmado")}</th>
                    <th className="px-3 py-3 text-right">{t("reportes.tiempos.colTiempoCocina")}</th>
                    <th className="px-3 py-3 text-right">{t("reportes.tiempos.colTiempoTotal")}</th>
                  </tr>
                </thead>
                <tbody>
                  {filas.map((f) => (
                    <tr key={f.id} className="border-b border-neutral-100 last:border-0 dark:border-neutral-800">
                      <td className="px-3 py-2 font-bold text-ck-dark dark:text-neutral-100">#{f.numeroOrden}</td>
                      <td className="px-3 py-2 text-neutral-700 dark:text-neutral-300">
                        {f.nombreCliente || t("kds.cliente")}
                      </td>
                      <td className="px-3 py-2 text-neutral-700 dark:text-neutral-300">
                        {t(CLAVE_CANAL[f.canal] ?? "kds.canal.mostrador")}
                      </td>
                      <td className="px-3 py-2 text-neutral-700 dark:text-neutral-300">
                        {t(`reportes.estadoPedido.${f.estado}`)}
                      </td>
                      <td className="px-3 py-2 font-mono text-neutral-700 dark:text-neutral-300">
                        {formatearHora(f.creadoEn)}
                      </td>
                      <td className="px-3 py-2 text-neutral-700 dark:text-neutral-300">
                        {f.creadoPorNombre ?? t("reportes.tiempos.sinDato")}
                      </td>
                      <td className="px-3 py-2 text-neutral-700 dark:text-neutral-300">
                        {f.cajeroTurnoNombre ?? t("reportes.tiempos.sinDato")}
                      </td>
                      <td className="px-3 py-2 font-mono text-neutral-700 dark:text-neutral-300">
                        {formatearHora(f.enviadoACocinaEn)}
                      </td>
                      <td className="px-3 py-2 font-mono text-neutral-700 dark:text-neutral-300">
                        {formatearHora(f.entregadoEn)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-neutral-700 dark:text-neutral-300">
                        {formatearMs(f.msArmadoMostrador)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-neutral-700 dark:text-neutral-300">
                        {formatearMs(f.msEnCocina)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono font-bold text-ck-dark dark:text-neutral-100">
                        {formatearMs(f.msTotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h2 className="mb-1 text-lg font-semibold text-ck-dark dark:text-neutral-100">
              {t("reportes.tiempos.horaTitulo")}
            </h2>
            <p className="mb-3 text-sm text-neutral-600 dark:text-neutral-400">
              {t("reportes.tiempos.horaSubtitulo")}
            </p>
            {cubetasHora.length === 0 ? (
              <p className="text-sm text-neutral-600 dark:text-neutral-400">{t("reportes.tiempos.sinDatosHora")}</p>
            ) : (
              <div className="overflow-x-auto rounded-2xl bg-white shadow-sm dark:bg-neutral-900">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="border-b border-neutral-200 text-xs uppercase text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
                    <tr>
                      <th className="px-3 py-3">{t("reportes.tiempos.colHora")}</th>
                      <th className="px-3 py-3 text-right">{t("reportes.tiempos.colNumPedidos")}</th>
                      <th className="px-3 py-3 text-right">{t("reportes.tiempos.colPromedioCocina")}</th>
                      <th className="px-3 py-3 text-right">{t("reportes.tiempos.colPromedioTotal")}</th>
                      <th className="px-3 py-3">{/* barra visual */}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cubetasHora.map((c) => (
                      <tr key={c.hora} className="border-b border-neutral-100 last:border-0 dark:border-neutral-800">
                        <td className="px-3 py-2 font-mono text-neutral-700 dark:text-neutral-300">
                          {etiquetaHora(c.hora)}
                        </td>
                        <td className="px-3 py-2 text-right text-neutral-700 dark:text-neutral-300">
                          {c.numeroPedidos}
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-neutral-700 dark:text-neutral-300">
                          {formatearMs(c.promedioMsCocina)}
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-neutral-700 dark:text-neutral-300">
                          {formatearMs(c.promedioMsTotal)}
                        </td>
                        <td className="w-40 px-3 py-2">
                          <div className="h-2 rounded-full bg-neutral-100 dark:bg-neutral-800">
                            <div
                              className="h-2 rounded-full bg-ck-red"
                              style={{
                                width: `${Math.max(4, Math.round(((c.promedioMsCocina ?? 0) / maxPromedioCocinaHora) * 100))}%`,
                              }}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
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
