"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { Empleado, HorarioTurno, Marcaje, Rol, Ubicacion } from "@/lib/domain/types";
import { formatearDinero } from "@/lib/domain/types";
import { useI18n } from "@/lib/shell/I18nProvider";
import { textoErrorApi } from "@/lib/i18n/erroresApi";
import { nombreRolTraducido } from "@/lib/i18n/roles";
import {
  agruparHorariosPorEmpleado,
  domingoDeSemana,
  formatearResumenHorarioSemana,
  lunesDeSemanaActual,
} from "@/lib/rrhh/formatoHorario";
import {
  listarEmpleados,
  listarHorarios,
  listarMarcajes,
  listarRoles,
  listarUbicaciones,
} from "@/components/empleados/api";
import OnboardingModal from "@/components/empleados/OnboardingModal";
import CompletarOnboardingModal from "@/components/empleados/CompletarOnboardingModal";
import BajaModal from "@/components/empleados/BajaModal";
import AgregarHorarioModal from "@/components/empleados/AgregarHorarioModal";
import FondoFoto from "@/components/shell/FondoFoto";

/** Ultimo marcaje de "entrada" y de "salida" por empleado (para las columnas Check In / Check Out). */
interface UltimoMarcajePorTipo {
  entrada?: string;
  salida?: string;
}

/**
 * Agrupa TODOS los marcajes (ya vienen ordenados ascendente por timestamp,
 * ver lib/rrhh/asistencia.ts `listarMarcajes`) y se queda con el mas
 * reciente de cada tipo por empleado (la ultima ocurrencia de cada tipo en
 * el arreglo ordenado ES la mas reciente).
 */
function ultimoMarcajePorEmpleado(marcajes: Marcaje[]): Map<string, UltimoMarcajePorTipo> {
  const mapa = new Map<string, UltimoMarcajePorTipo>();
  for (const m of marcajes) {
    const actual = mapa.get(m.empleadoId) ?? {};
    actual[m.tipo] = m.timestamp;
    mapa.set(m.empleadoId, actual);
  }
  return mapa;
}

/**
 * /empleados — lista de personal (rrhh-personal-pos).
 *
 * Ciclo de vida visible aqui: "onboarding" (recien dado de alta, sin acceso de
 * login todavia) -> "activo" (onboarding completado) -> "inactivo" (baja
 * logica, el registro nunca se borra).
 */
export default function EmpleadosPage() {
  const { t, idioma } = useI18n();
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [roles, setRoles] = useState<Rol[]>([]);
  const [ubicaciones, setUbicaciones] = useState<Ubicacion[]>([]);
  const [ultimosMarcajes, setUltimosMarcajes] = useState<Map<string, UltimoMarcajePorTipo>>(new Map());
  const [horariosPorEmpleado, setHorariosPorEmpleado] = useState<Map<string, HorarioTurno[]>>(new Map());
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [mostrarAlta, setMostrarAlta] = useState(false);
  const [onboardingDe, setOnboardingDe] = useState<Empleado | null>(null);
  const [bajaDe, setBajaDe] = useState<Empleado | null>(null);
  const [horarioDe, setHorarioDe] = useState<Empleado | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const lunes = lunesDeSemanaActual();
      const domingo = domingoDeSemana(lunes);
      const [emps, rolesData, ubicacionesData, marcajes, horarios] = await Promise.all([
        listarEmpleados(),
        listarRoles(),
        listarUbicaciones(),
        listarMarcajes({}),
        listarHorarios({ desde: lunes, hasta: domingo }),
      ]);
      setEmpleados(emps);
      setRoles(rolesData);
      setUbicaciones(ubicacionesData);
      setUltimosMarcajes(ultimoMarcajePorEmpleado(marcajes));
      setHorariosPorEmpleado(agruparHorariosPorEmpleado(horarios));
    } catch (err) {
      setError(textoErrorApi(err, t, "empleados.errorCarga"));
    } finally {
      setCargando(false);
    }
  }, [t]);

  function formatearHoraMarcaje(iso: string | undefined): string {
    if (!iso) return t("empleados.sinMarcaje");
    return new Date(iso).toLocaleTimeString(idioma === "en" ? "en-US" : "es-ES", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  useEffect(() => {
    cargar();
  }, [cargar]);

  function nombreRol(rolId: string): string {
    const interno = roles.find((r) => r.id === rolId)?.nombre ?? rolId;
    return nombreRolTraducido(interno, t);
  }
  function codigoUbicacion(ubicacionId: string): string {
    const u = ubicaciones.find((x) => x.id === ubicacionId);
    return u ? `${u.codigo} (${u.estado})` : ubicacionId;
  }

  function actualizarEnLista(empleado: Empleado) {
    setEmpleados((prev) => {
      const existe = prev.some((e) => e.id === empleado.id);
      return existe
        ? prev.map((e) => (e.id === empleado.id ? empleado : e))
        : [...prev, empleado];
    });
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-ck-cream p-6 dark:bg-neutral-950">
      <FondoFoto />
      <div className="relative z-10 mx-auto max-w-5xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-ck-dark dark:text-neutral-100">{t("empleados.titulo")}</h1>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              {t("empleados.subtitulo")}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/" className="text-sm text-ck-red underline dark:text-red-400">
              {t("empleados.inicio")}
            </Link>
            <Link href="/nomina" className="text-sm text-ck-red underline dark:text-red-400">
              {t("empleados.irANomina")}
            </Link>
            <button
              type="button"
              onClick={() => setMostrarAlta(true)}
              className="rounded-xl bg-ck-red px-4 py-2 text-sm font-bold text-white active:scale-95"
            >
              {t("empleados.nuevoEmpleado")}
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-100 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</div>
        )}

        {cargando ? (
          <p className="text-sm text-neutral-600 dark:text-neutral-400">{t("empleados.cargandoPersonal")}</p>
        ) : (
          <div className="overflow-hidden rounded-xl bg-white shadow-sm dark:bg-neutral-900">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                <tr>
                  <th className="p-3">{t("empleados.colNombre")}</th>
                  <th className="p-3">{t("empleados.colRol")}</th>
                  <th className="p-3">{t("empleados.colTienda")}</th>
                  <th className="p-3">{t("empleados.colTarifa")}</th>
                  <th className="p-3">{t("empleados.colHorario")}</th>
                  <th className="p-3">{t("empleados.colEstado")}</th>
                  <th className="p-3">{t("empleados.colCheckIn")}</th>
                  <th className="p-3">{t("empleados.colCheckOut")}</th>
                  <th className="p-3 text-right">{t("empleados.colAcciones")}</th>
                </tr>
              </thead>
              <tbody>
                {empleados.map((e) => {
                  const ultimo = ultimosMarcajes.get(e.id);
                  return (
                  <tr key={e.id} className="border-t border-neutral-100 text-neutral-800 dark:border-neutral-800 dark:text-neutral-200">
                    <td className="p-3">
                      <Link href={`/empleados/${e.id}`} className="font-semibold text-ck-red hover:underline dark:text-red-400">
                        {e.nombre}
                      </Link>
                      <div className="text-xs text-neutral-500 dark:text-neutral-400">{e.email}</div>
                    </td>
                    <td className="p-3">{nombreRol(e.rolId)}</td>
                    <td className="p-3">{codigoUbicacion(e.ubicacionId)}</td>
                    <td className="p-3">{formatearDinero(e.tarifaHoraCentavos)}/hr</td>
                    <td className="p-3 text-xs text-neutral-600 dark:text-neutral-400">
                      {formatearResumenHorarioSemana(horariosPorEmpleado.get(e.id) ?? [], idioma) ||
                        t("empleados.sinHorario")}
                    </td>
                    <td className="p-3">
                      <EstadoBadge estado={e.estado} />
                    </td>
                    <td className="p-3">{formatearHoraMarcaje(ultimo?.entrada)}</td>
                    <td className="p-3">{formatearHoraMarcaje(ultimo?.salida)}</td>
                    <td className="p-3 text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        {e.estado === "onboarding" && (
                          <button
                            type="button"
                            onClick={() => setOnboardingDe(e)}
                            className="rounded-lg border border-ck-red px-3 py-1 text-xs font-semibold text-ck-red dark:text-red-400"
                          >
                            {t("empleados.completarOnboarding")}
                          </button>
                        )}
                        {e.estado === "activo" && (
                          <button
                            type="button"
                            onClick={() => setHorarioDe(e)}
                            className="rounded-lg border border-ck-gold px-3 py-1 text-xs font-semibold text-ck-gold"
                          >
                            {t("empleados.agregarHorario")}
                          </button>
                        )}
                        {e.estado !== "inactivo" && (
                          <button
                            type="button"
                            onClick={() => setBajaDe(e)}
                            className="rounded-lg border border-neutral-300 px-3 py-1 text-xs font-semibold text-neutral-600 dark:border-neutral-600 dark:text-neutral-300"
                          >
                            {t("empleados.darDeBaja")}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  );
                })}
                {empleados.length === 0 && (
                  <tr>
                    <td colSpan={9} className="p-6 text-center text-neutral-500 dark:text-neutral-400">
                      {t("empleados.sinEmpleados")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {mostrarAlta && (
        <OnboardingModal
          roles={roles}
          ubicaciones={ubicaciones}
          onCreado={(empleado) => {
            actualizarEnLista(empleado);
            setMostrarAlta(false);
          }}
          onCancelar={() => setMostrarAlta(false)}
        />
      )}

      {onboardingDe && (
        <CompletarOnboardingModal
          empleado={onboardingDe}
          onCompletado={(empleado) => {
            actualizarEnLista(empleado);
            setOnboardingDe(null);
          }}
          onCancelar={() => setOnboardingDe(null)}
        />
      )}

      {bajaDe && (
        <BajaModal
          empleado={bajaDe}
          onBaja={(empleado) => {
            actualizarEnLista(empleado);
            setBajaDe(null);
          }}
          onCancelar={() => setBajaDe(null)}
        />
      )}

      {horarioDe && (
        <AgregarHorarioModal
          empleado={horarioDe}
          onCreado={() => setHorarioDe(null)}
          onCancelar={() => setHorarioDe(null)}
        />
      )}
    </main>
  );
}

function EstadoBadge({ estado }: { estado: Empleado["estado"] }) {
  const { t } = useI18n();
  const estilos: Record<Empleado["estado"], string> = {
    onboarding: "bg-ck-gold/20 text-ck-gold",
    activo: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
    inactivo: "bg-neutral-200 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300",
  };
  const claves: Record<Empleado["estado"], string> = {
    onboarding: "empleados.estado.onboarding",
    activo: "empleados.estado.activo",
    inactivo: "empleados.estado.inactivo",
  };
  return (
    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${estilos[estado]}`}>
      {t(claves[estado])}
    </span>
  );
}
