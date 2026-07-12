"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { Empleado, Rol, Ubicacion } from "@/lib/domain/types";
import { formatearDinero } from "@/lib/domain/types";
import { useI18n } from "@/lib/shell/I18nProvider";
import { textoErrorApi } from "@/lib/i18n/erroresApi";
import { nombreRolTraducido } from "@/lib/i18n/roles";
import {
  listarEmpleados,
  listarRoles,
  listarUbicaciones,
} from "@/components/empleados/api";
import OnboardingModal from "@/components/empleados/OnboardingModal";
import CompletarOnboardingModal from "@/components/empleados/CompletarOnboardingModal";
import BajaModal from "@/components/empleados/BajaModal";

/**
 * /empleados — lista de personal (rrhh-personal-pos).
 *
 * Ciclo de vida visible aqui: "onboarding" (recien dado de alta, sin acceso de
 * login todavia) -> "activo" (onboarding completado) -> "inactivo" (baja
 * logica, el registro nunca se borra).
 */
export default function EmpleadosPage() {
  const { t } = useI18n();
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [roles, setRoles] = useState<Rol[]>([]);
  const [ubicaciones, setUbicaciones] = useState<Ubicacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [mostrarAlta, setMostrarAlta] = useState(false);
  const [onboardingDe, setOnboardingDe] = useState<Empleado | null>(null);
  const [bajaDe, setBajaDe] = useState<Empleado | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const [emps, rolesData, ubicacionesData] = await Promise.all([
        listarEmpleados(),
        listarRoles(),
        listarUbicaciones(),
      ]);
      setEmpleados(emps);
      setRoles(rolesData);
      setUbicaciones(ubicacionesData);
    } catch (err) {
      setError(textoErrorApi(err, t, "empleados.errorCarga"));
    } finally {
      setCargando(false);
    }
  }, [t]);

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
    <main className="min-h-screen bg-ck-cream p-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-ck-dark">{t("empleados.titulo")}</h1>
            <p className="text-sm text-neutral-600">
              {t("empleados.subtitulo")}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/" className="text-sm text-ck-red underline">
              {t("empleados.inicio")}
            </Link>
            <Link href="/nomina" className="text-sm text-ck-red underline">
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
          <div className="mb-4 rounded-lg bg-red-100 p-3 text-sm text-red-700">{error}</div>
        )}

        {cargando ? (
          <p className="text-sm text-neutral-500">{t("empleados.cargandoPersonal")}</p>
        ) : (
          <div className="overflow-hidden rounded-xl bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-100 text-neutral-600">
                <tr>
                  <th className="p-3">{t("empleados.colNombre")}</th>
                  <th className="p-3">{t("empleados.colRol")}</th>
                  <th className="p-3">{t("empleados.colTienda")}</th>
                  <th className="p-3">{t("empleados.colTarifa")}</th>
                  <th className="p-3">{t("empleados.colEstado")}</th>
                  <th className="p-3 text-right">{t("empleados.colAcciones")}</th>
                </tr>
              </thead>
              <tbody>
                {empleados.map((e) => (
                  <tr key={e.id} className="border-t border-neutral-100">
                    <td className="p-3">
                      <Link href={`/empleados/${e.id}`} className="font-semibold text-ck-red hover:underline">
                        {e.nombre}
                      </Link>
                      <div className="text-xs text-neutral-400">{e.email}</div>
                    </td>
                    <td className="p-3">{nombreRol(e.rolId)}</td>
                    <td className="p-3">{codigoUbicacion(e.ubicacionId)}</td>
                    <td className="p-3">{formatearDinero(e.tarifaHoraCentavos)}/hr</td>
                    <td className="p-3">
                      <EstadoBadge estado={e.estado} />
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex justify-end gap-2">
                        {e.estado === "onboarding" && (
                          <button
                            type="button"
                            onClick={() => setOnboardingDe(e)}
                            className="rounded-lg border border-ck-red px-3 py-1 text-xs font-semibold text-ck-red"
                          >
                            {t("empleados.completarOnboarding")}
                          </button>
                        )}
                        {e.estado !== "inactivo" && (
                          <button
                            type="button"
                            onClick={() => setBajaDe(e)}
                            className="rounded-lg border border-neutral-300 px-3 py-1 text-xs font-semibold text-neutral-600"
                          >
                            {t("empleados.darDeBaja")}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {empleados.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-neutral-400">
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
    </main>
  );
}

function EstadoBadge({ estado }: { estado: Empleado["estado"] }) {
  const { t } = useI18n();
  const estilos: Record<Empleado["estado"], string> = {
    onboarding: "bg-ck-gold/20 text-ck-gold",
    activo: "bg-green-100 text-green-700",
    inactivo: "bg-neutral-200 text-neutral-500",
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
