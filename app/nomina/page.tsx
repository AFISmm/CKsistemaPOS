"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { Empleado, ReciboDePago } from "@/lib/domain/types";
import { formatearDinero } from "@/lib/domain/types";
import { listarEmpleados } from "@/components/empleados/api";
import { ErrorApi, correrNomina, listarRecibos } from "@/components/nomina/api";

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
      setError(err instanceof ErrorApi ? err.message : "No se pudo cargar la nomina.");
    } finally {
      setCargando(false);
    }
  }, []);

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
      setError(err instanceof ErrorApi ? err.message : "No se pudo correr la nomina.");
    } finally {
      setCorriendo(false);
    }
  }

  return (
    <main className="min-h-screen bg-ck-cream p-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-ck-dark">Nomina</h1>
            <p className="text-sm text-neutral-600">Calculo de pago a partir de asistencia y propinas.</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/" className="text-sm text-ck-red underline">
              Inicio
            </Link>
            <Link href="/empleados" className="text-sm text-ck-red underline">
              Ir a Empleados
            </Link>
          </div>
        </div>

        <div className="mb-4 rounded-xl border border-ck-gold/40 bg-ck-gold/10 p-3 text-xs text-ck-dark">
          <strong>DEMO</strong> — tasas de retencion (10% federal generico) y la regla de horas
          extra (&gt;40h/semana, FLSA simplificado) son ficticias. A validar con nomina/legal real
          antes de produccion. FL y TX no tienen impuesto estatal sobre ingreso personal (correcto
          en la vida real); solo se simula una retencion federal.
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-100 p-3 text-sm text-red-700">{error}</div>
        )}

        <div className="mb-6 flex flex-wrap items-end gap-3 rounded-xl bg-white p-4 shadow-sm">
          <label className="text-xs font-semibold text-neutral-600">
            Desde
            <input
              type="date"
              value={periodoInicio}
              onChange={(e) => setPeriodoInicio(e.target.value)}
              className="mt-1 block rounded-lg border border-neutral-300 px-2 py-1 text-sm"
            />
          </label>
          <label className="text-xs font-semibold text-neutral-600">
            Hasta
            <input
              type="date"
              value={periodoFin}
              onChange={(e) => setPeriodoFin(e.target.value)}
              className="mt-1 block rounded-lg border border-neutral-300 px-2 py-1 text-sm"
            />
          </label>
          <label className="text-xs font-semibold text-neutral-600">
            Empleado (opcional)
            <select
              value={empleadoId}
              onChange={(e) => setEmpleadoId(e.target.value)}
              className="mt-1 block rounded-lg border border-neutral-300 px-2 py-1 text-sm"
            >
              <option value="">Todos los empleados activos</option>
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
            {corriendo ? "Corriendo nomina..." : "Correr nomina"}
          </button>
        </div>

        {cargando ? (
          <p className="text-sm text-neutral-500">Cargando...</p>
        ) : (
          <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-neutral-100 text-neutral-600">
                <tr>
                  <th className="p-3">Empleado</th>
                  <th className="p-3">Periodo</th>
                  <th className="p-3 text-right">Hrs regulares</th>
                  <th className="p-3 text-right">Hrs extra</th>
                  <th className="p-3 text-right">Propinas</th>
                  <th className="p-3 text-right">Bruto</th>
                  <th className="p-3 text-right">Retencion</th>
                  <th className="p-3 text-right">Neto</th>
                </tr>
              </thead>
              <tbody>
                {recibos.map((r) => (
                  <tr key={r.id} className="border-t border-neutral-100">
                    <td className="p-3 font-semibold">{nombreEmpleado(r.empleadoId)}</td>
                    <td className="p-3 text-xs text-neutral-500">
                      {r.periodoInicio} a {r.periodoFin}
                    </td>
                    <td className="p-3 text-right">{formatearMinutos(r.horasRegularesMin)}</td>
                    <td className="p-3 text-right">{formatearMinutos(r.horasExtraMin)}</td>
                    <td className="p-3 text-right">{formatearDinero(r.propinasCentavos)}</td>
                    <td className="p-3 text-right">{formatearDinero(r.brutoCentavos)}</td>
                    <td className="p-3 text-right text-neutral-500">
                      -{formatearDinero(r.retencionCentavos)}
                    </td>
                    <td className="p-3 text-right font-bold text-ck-dark">
                      {formatearDinero(r.netoCentavos)}
                    </td>
                  </tr>
                ))}
                {recibos.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-6 text-center text-neutral-400">
                      Sin recibos generados todavia. Elige un periodo y corre la nomina.
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
