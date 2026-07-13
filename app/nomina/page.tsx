"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { Empleado, ReciboDePago } from "@/lib/domain/types";
import { formatearDinero } from "@/lib/domain/types";
import { listarEmpleados } from "@/components/empleados/api";
import { correrNomina, listarRecibos } from "@/components/nomina/api";
import { useI18n } from "@/lib/shell/I18nProvider";
import { textoErrorApi } from "@/lib/i18n/erroresApi";
import FondoFoto from "@/components/shell/FondoFoto";

function fechaISOHaceDias(dias: number): string {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  return d.toISOString().slice(0, 10);
}

function formatearMinutos(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}h ${m.toString().padStart(2, "0")}m`;
}

/**
 * /nomina — correr nomina de un periodo y ver recibos de pago (nomina-pos).
 *
 * DEMO: tasas de retencion y regla de horas extra (>40h/semana) son
 * ficticias/simplificadas; ver README-DEMO.md y lib/nomina/calculo.ts.
 */
export default function NominaPage() {
  const { t } = useI18n();
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [recibos, setRecibos] = useState<ReciboDePago[]>([]);
  const [periodoInicio, setPeriodoInicio] = useState(fechaISOHaceDias(6));
  const [periodoFin, setPeriodoFin] = useState(fechaISOHaceDias(0));
  const [empleadoId, setEmpleadoId] = useState<string>("");
  const [cargando, setCargando] = useState(true);
  const [corriendo, setCorriendo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const [emps, recibosData] = await Promise.all([listarEmpleados(), listarRecibos()]);
      setEmpleados(emps);
      setRecibos(recibosData);
    } catch (err) {
      setError(textoErrorApi(err, t, "nomina.errorCarga"));
    } finally {
      setCargando(false);
    }
  }, [t]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  function nombreEmpleado(id: string): string {
    return empleados.find((e) => e.id === id)?.nombre ?? id;
  }

  async function manejarCorrerNomina() {
    setCorriendo(true);
    setError(null);
    try {
      const nuevos = await correrNomina({
        periodoInicio,
        periodoFin,
        empleadoId: empleadoId || undefined,
      });
      setRecibos((prev) => [...nuevos, ...prev]);
    } catch (err) {
      setError(textoErrorApi(err, t, "nomina.errorCorrer"));
    } finally {
      setCorriendo(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-ck-cream p-6 dark:bg-neutral-950">
      <FondoFoto />
      <div className="relative z-10 mx-auto max-w-5xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-ck-dark dark:text-neutral-100">{t("nomina.titulo")}</h1>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">{t("nomina.subtitulo")}</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/" className="text-sm text-ck-red underline dark:text-red-400">
              {t("nomina.inicio")}
            </Link>
            <Link href="/empleados" className="text-sm text-ck-red underline dark:text-red-400">
              {t("nomina.irAEmpleados")}
            </Link>
          </div>
        </div>

        <div className="mb-4 rounded-xl border border-ck-gold/40 bg-ck-gold/10 p-3 text-xs text-ck-dark dark:text-neutral-100">
          <strong>DEMO</strong> — {t("nomina.demoAviso")}
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-100 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</div>
        )}

        <div className="mb-6 flex flex-wrap items-end gap-3 rounded-xl bg-white p-4 shadow-sm dark:bg-neutral-900">
          <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">
            {t("nomina.desde")}
            <input
              type="date"
              value={periodoInicio}
              onChange={(e) => setPeriodoInicio(e.target.value)}
              className="mt-1 block rounded-lg border border-neutral-300 px-2 py-1 text-sm text-ck-dark dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
            />
          </label>
          <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">
            {t("nomina.hasta")}
            <input
              type="date"
              value={periodoFin}
              onChange={(e) => setPeriodoFin(e.target.value)}
              className="mt-1 block rounded-lg border border-neutral-300 px-2 py-1 text-sm text-ck-dark dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
            />
          </label>
          <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">
            {t("nomina.empleadoOpcional")}
            <select
              value={empleadoId}
              onChange={(e) => setEmpleadoId(e.target.value)}
              className="mt-1 block rounded-lg border border-neutral-300 px-2 py-1 text-sm text-ck-dark dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
            >
              <option value="">{t("nomina.todosActivos")}</option>
              {empleados
                .filter((e) => e.estado !== "onboarding")
                .map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nombre}
                  </option>
                ))}
            </select>
          </label>
          <button
            type="button"
            onClick={manejarCorrerNomina}
            disabled={corriendo}
            className="rounded-xl bg-ck-red px-5 py-2 text-sm font-bold text-white disabled:opacity-50"
          >
            {corriendo ? t("nomina.corriendo") : t("nomina.correrNomina")}
          </button>
        </div>

        {cargando ? (
          <p className="text-sm text-neutral-600 dark:text-neutral-400">{t("nomina.cargando")}</p>
        ) : (
          <div className="overflow-x-auto rounded-xl bg-white shadow-sm dark:bg-neutral-900">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                <tr>
                  <th className="p-3">{t("nomina.colEmpleado")}</th>
                  <th className="p-3">{t("nomina.colPeriodo")}</th>
                  <th className="p-3 text-right">{t("nomina.colHorasRegulares")}</th>
                  <th className="p-3 text-right">{t("nomina.colHorasExtra")}</th>
                  <th className="p-3 text-right">{t("nomina.colPropinas")}</th>
                  <th className="p-3 text-right">{t("nomina.colBruto")}</th>
                  <th className="p-3 text-right">{t("nomina.colRetencion")}</th>
                  <th className="p-3 text-right">{t("nomina.colNeto")}</th>
                </tr>
              </thead>
              <tbody>
                {recibos.map((r) => (
                  <tr key={r.id} className="border-t border-neutral-100 text-neutral-800 dark:border-neutral-800 dark:text-neutral-200">
                    <td className="p-3 font-semibold text-ck-dark dark:text-neutral-100">{nombreEmpleado(r.empleadoId)}</td>
                    <td className="p-3 text-xs text-neutral-600 dark:text-neutral-400">
                      {t("nomina.periodoSeparador", { inicio: r.periodoInicio, fin: r.periodoFin })}
                    </td>
                    <td className="p-3 text-right">{formatearMinutos(r.horasRegularesMin)}</td>
                    <td className="p-3 text-right">{formatearMinutos(r.horasExtraMin)}</td>
                    <td className="p-3 text-right">{formatearDinero(r.propinasCentavos)}</td>
                    <td className="p-3 text-right">{formatearDinero(r.brutoCentavos)}</td>
                    <td className="p-3 text-right text-neutral-600 dark:text-neutral-400">
                      -{formatearDinero(r.retencionCentavos)}
                    </td>
                    <td className="p-3 text-right font-bold text-ck-dark dark:text-neutral-100">
                      {formatearDinero(r.netoCentavos)}
                    </td>
                  </tr>
                ))}
                {recibos.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-6 text-center text-neutral-500 dark:text-neutral-400">
                      {t("nomina.sinRecibos")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
