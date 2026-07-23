"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Rol } from "@/lib/domain/types";
import { formatearDinero } from "@/lib/domain/types";
import { listarRoles } from "@/components/empleados/api";
import {
  actualizarPorcentajePropinaRol,
  obtenerReportePropinas,
  type ReportePropinasApi,
} from "@/components/propinas/api";
import { useI18n } from "@/lib/shell/I18nProvider";
import { textoErrorApi } from "@/lib/i18n/erroresApi";
import FondoFoto from "@/components/shell/FondoFoto";

// DECISION DE ALCANCE (Fase B, revision 2026-07-22 seccion "reparto de
// propinas por rol/puntos"): esta pantalla es una HERRAMIENTA OPERATIVA DE
// REFERENCIA, no un registro contable/fiscal (ver doc-comment largo en
// lib/propinas/reparto.ts) — la propina en efectivo se autorreporta y NO es
// 100% rastreable por el sistema. NO hay boton de "pagar" ni movimiento real
// de dinero, mismo criterio que /nomina (S-17).

function fechaISOHaceDias(dias: number): string {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  return d.toISOString().slice(0, 10);
}

export default function RepartoDePropinasPage() {
  const { t } = useI18n();

  const [roles, setRoles] = useState<Rol[]>([]);
  const [valoresEnEdicion, setValoresEnEdicion] = useState<Record<string, string>>({});
  const [guardandoRolId, setGuardandoRolId] = useState<string | null>(null);

  const [desde, setDesde] = useState(fechaISOHaceDias(6));
  const [hasta, setHasta] = useState(fechaISOHaceDias(0));
  const [reporte, setReporte] = useState<ReportePropinasApi | null>(null);

  const [cargandoRoles, setCargandoRoles] = useState(true);
  const [cargandoReporte, setCargandoReporte] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargarRoles = useCallback(async () => {
    setCargandoRoles(true);
    try {
      const rolesData = await listarRoles();
      setRoles(rolesData);
    } catch (err) {
      setError(textoErrorApi(err, t, "propinas.errorCargaRoles"));
    } finally {
      setCargandoRoles(false);
    }
  }, [t]);

  const cargarReporte = useCallback(async () => {
    setCargandoReporte(true);
    setError(null);
    try {
      const data = await obtenerReportePropinas({ desde, hasta });
      setReporte(data);
    } catch (err) {
      setError(textoErrorApi(err, t, "propinas.errorCargaReporte"));
    } finally {
      setCargandoReporte(false);
    }
  }, [desde, hasta, t]);

  useEffect(() => {
    cargarRoles();
  }, [cargarRoles]);

  useEffect(() => {
    cargarReporte();
  }, [cargarReporte]);

  const sumaPorcentajes = useMemo(
    () => roles.reduce((acc, r) => acc + (r.porcentajePropinaDemo ?? 0), 0),
    [roles]
  );
  const sumaEsSensata = sumaPorcentajes === 100;

  function valorEditado(rol: Rol): string {
    return valoresEnEdicion[rol.id] ?? String(rol.porcentajePropinaDemo ?? 0);
  }

  async function guardarPorcentaje(rol: Rol) {
    const texto = valorEditado(rol);
    const valor = Number(texto);
    if (!Number.isInteger(valor) || valor < 0 || valor > 100) {
      setError(t("propinas.errorPorcentajeInvalido"));
      return;
    }
    setGuardandoRolId(rol.id);
    setError(null);
    try {
      const rolActualizado = await actualizarPorcentajePropinaRol(rol.id, valor);
      setRoles((prev) => prev.map((r) => (r.id === rol.id ? rolActualizado : r)));
      setValoresEnEdicion((prev) => {
        const copia = { ...prev };
        delete copia[rol.id];
        return copia;
      });
      await cargarReporte();
    } catch (err) {
      setError(textoErrorApi(err, t, "propinas.errorGuardarPorcentaje"));
    } finally {
      setGuardandoRolId(null);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-ck-cream p-6 dark:bg-neutral-950">
      <FondoFoto />
      <div className="relative z-10 mx-auto max-w-5xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-ck-dark dark:text-neutral-100">
              {t("propinas.titulo")}
            </h1>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">{t("propinas.subtitulo")}</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/" className="text-sm text-ck-red underline dark:text-red-400">
              {t("nomina.inicio")}
            </Link>
            <Link href="/nomina" className="text-sm text-ck-red underline dark:text-red-400">
              {t("propinas.irANomina")}
            </Link>
            <Link href="/empleados" className="text-sm text-ck-red underline dark:text-red-400">
              {t("nomina.irAEmpleados")}
            </Link>
          </div>
        </div>

        <div className="mb-4 rounded-xl border border-ck-gold/40 bg-ck-gold/10 p-3 text-xs text-ck-dark dark:text-neutral-100">
          <strong>DEMO</strong> — {t("propinas.demoAviso")}
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-100 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </div>
        )}

        {/* ---------- Configuracion: % por rol ---------- */}
        <section className="mb-6 rounded-xl bg-white p-4 shadow-sm dark:bg-neutral-900">
          <h2 className="mb-1 text-lg font-bold text-ck-dark dark:text-neutral-100">
            {t("propinas.configTitulo")}
          </h2>
          <p className="mb-3 text-xs text-neutral-600 dark:text-neutral-400">
            {t("propinas.configDescripcion")}
          </p>

          <div
            className={`mb-3 rounded-lg p-2 text-xs ${
              sumaEsSensata
                ? "bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300"
                : "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
            }`}
          >
            {sumaEsSensata
              ? t("propinas.sumaOk", { suma: sumaPorcentajes })
              : t("propinas.sumaAdvertencia", { suma: sumaPorcentajes })}
          </div>

          {cargandoRoles ? (
            <p className="text-sm text-neutral-600 dark:text-neutral-400">{t("nomina.cargando")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-left text-sm">
                <thead className="bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                  <tr>
                    <th className="p-2">{t("propinas.colRol")}</th>
                    <th className="p-2 text-right">{t("propinas.colPorcentaje")}</th>
                    <th className="p-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {roles.map((rol) => (
                    <tr
                      key={rol.id}
                      className="border-t border-neutral-100 text-neutral-800 dark:border-neutral-800 dark:text-neutral-200"
                    >
                      <td className="p-2 font-semibold text-ck-dark dark:text-neutral-100">
                        {rol.nombre}
                      </td>
                      <td className="p-2 text-right">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          step={1}
                          value={valorEditado(rol)}
                          onChange={(e) =>
                            setValoresEnEdicion((prev) => ({ ...prev, [rol.id]: e.target.value }))
                          }
                          className="w-20 rounded-lg border border-neutral-300 px-2 py-1 text-right text-sm text-ck-dark dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                        />
                        %
                      </td>
                      <td className="p-2 text-right">
                        <button
                          type="button"
                          onClick={() => guardarPorcentaje(rol)}
                          disabled={guardandoRolId === rol.id}
                          className="rounded-lg bg-ck-red px-3 py-1 text-xs font-bold text-white disabled:opacity-50"
                        >
                          {guardandoRolId === rol.id ? t("propinas.guardando") : t("propinas.guardar")}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ---------- Reporte por periodo ---------- */}
        <section className="mb-6 rounded-xl bg-white p-4 shadow-sm dark:bg-neutral-900">
          <h2 className="mb-3 text-lg font-bold text-ck-dark dark:text-neutral-100">
            {t("propinas.reporteTitulo")}
          </h2>

          <div className="mb-4 flex flex-wrap items-end gap-3">
            <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">
              {t("nomina.desde")}
              <input
                type="date"
                value={desde}
                onChange={(e) => setDesde(e.target.value)}
                className="mt-1 block rounded-lg border border-neutral-300 px-2 py-1 text-sm text-ck-dark dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
              />
            </label>
            <label className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">
              {t("nomina.hasta")}
              <input
                type="date"
                value={hasta}
                onChange={(e) => setHasta(e.target.value)}
                className="mt-1 block rounded-lg border border-neutral-300 px-2 py-1 text-sm text-ck-dark dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
              />
            </label>
            <button
              type="button"
              onClick={cargarReporte}
              disabled={cargandoReporte}
              className="rounded-xl bg-ck-red px-5 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              {cargandoReporte ? t("propinas.actualizando") : t("propinas.actualizar")}
            </button>
          </div>

          {cargandoReporte ? (
            <p className="text-sm text-neutral-600 dark:text-neutral-400">{t("nomina.cargando")}</p>
          ) : reporte && reporte.totalesPorEmpleado.length > 0 ? (
            <div className="mb-6 overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-800">
              <table className="w-full min-w-[500px] text-left text-sm">
                <thead className="bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                  <tr>
                    <th className="p-2">{t("propinas.colEmpleado")}</th>
                    <th className="p-2 text-right">{t("propinas.colTotalPeriodo")}</th>
                  </tr>
                </thead>
                <tbody>
                  {reporte.totalesPorEmpleado.map((fila) => (
                    <tr
                      key={fila.empleadoId}
                      className="border-t border-neutral-100 text-neutral-800 dark:border-neutral-800 dark:text-neutral-200"
                    >
                      <td className="p-2 font-semibold text-ck-dark dark:text-neutral-100">
                        {fila.nombre}
                      </td>
                      <td className="p-2 text-right">{formatearDinero(fila.totalCentavos)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mb-6 text-sm text-neutral-500 dark:text-neutral-400">
              {t("propinas.sinTurnos")}
            </p>
          )}

          {reporte && reporte.turnos.length > 0 && (
            <>
              <h3 className="mb-2 text-sm font-bold text-ck-dark dark:text-neutral-100">
                {t("propinas.detallePorTurno")}
              </h3>
              <div className="space-y-4">
                {reporte.turnos.map((turno) => (
                  <div
                    key={turno.turnoId}
                    className="rounded-xl border border-neutral-200 p-3 dark:border-neutral-800"
                  >
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-600 dark:text-neutral-400">
                      <span>{t("propinas.turnoCerradoEn", { fecha: turno.cerradoEn.slice(0, 16).replace("T", " ") })}</span>
                      <span className="font-semibold text-ck-dark dark:text-neutral-100">
                        {t("propinas.propinaEfectivoTurno", {
                          monto: formatearDinero(turno.propinaEfectivoCentavos),
                        })}
                      </span>
                    </div>
                    {turno.resultado.advertencia && (
                      <div className="mb-2 rounded-lg bg-amber-100 p-2 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                        {turno.resultado.advertencia}
                      </div>
                    )}
                    {turno.resultado.filas.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[500px] text-left text-xs">
                          <thead className="text-neutral-500 dark:text-neutral-400">
                            <tr>
                              <th className="p-1">{t("propinas.colEmpleado")}</th>
                              <th className="p-1">{t("propinas.colRol")}</th>
                              <th className="p-1 text-right">{t("propinas.colPorcentaje")}</th>
                              <th className="p-1 text-right">{t("propinas.colMonto")}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {turno.resultado.filas.map((fila) => (
                              <tr
                                key={fila.empleadoId}
                                className="border-t border-neutral-100 text-neutral-800 dark:border-neutral-800 dark:text-neutral-200"
                              >
                                <td className="p-1">{fila.nombre}</td>
                                <td className="p-1">{fila.nombreRol}</td>
                                <td className="p-1 text-right">{fila.porcentajeNormalizado}%</td>
                                <td className="p-1 text-right">{formatearDinero(fila.montoCentavos)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        {t("propinas.sinEmpleadosPresentes")}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
