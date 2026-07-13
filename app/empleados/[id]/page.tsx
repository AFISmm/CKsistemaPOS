"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { Empleado, Marcaje, Rol, Ubicacion } from "@/lib/domain/types";
import { formatearDinero } from "@/lib/domain/types";
import { useI18n } from "@/lib/shell/I18nProvider";
import { textoErrorApi } from "@/lib/i18n/erroresApi";
import { nombreRolTraducido } from "@/lib/i18n/roles";
import {
  listarMarcajes,
  listarRoles,
  listarUbicaciones,
  obtenerEmpleado,
  obtenerResumenHoras,
  type ResumenHorasResponse,
} from "@/components/empleados/api";
import MarcajeControles from "@/components/empleados/MarcajeControles";
import FondoFoto from "@/components/shell/FondoFoto";

const CLAVE_ESTADO_EMPLEADO: Record<Empleado["estado"], string> = {
  onboarding: "empleados.estado.onboarding",
  activo: "empleados.estado.activo",
  inactivo: "empleados.estado.inactivo",
};

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

function formatearFechaHora(iso: string): string {
  return new Date(iso).toLocaleString("es-US", {
    weekday: "short",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** /empleados/[id] — detalle: datos, marcajes recientes, marcar entrada/salida, resumen de horas. */
export default function EmpleadoDetallePage() {
  const { t } = useI18n();
  const params = useParams<{ id: string }>();
  const empleadoId = params.id;

  const [empleado, setEmpleado] = useState<Empleado | null>(null);
  const [roles, setRoles] = useState<Rol[]>([]);
  const [ubicaciones, setUbicaciones] = useState<Ubicacion[]>([]);
  const [marcajes, setMarcajes] = useState<Marcaje[]>([]);
  const [resumen, setResumen] = useState<ResumenHorasResponse | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const desdePeriodo = fechaISOHaceDias(6);
  const hastaPeriodo = fechaISOHaceDias(0);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const [emp, rolesData, ubicacionesData, marcajesData, resumenData] = await Promise.all([
        obtenerEmpleado(empleadoId),
        listarRoles(),
        listarUbicaciones(),
        listarMarcajes({ empleadoId }),
        obtenerResumenHoras(empleadoId, `${desdePeriodo}T00:00:00.000Z`, `${hastaPeriodo}T23:59:59.999Z`),
      ]);
      setEmpleado(emp);
      setRoles(rolesData);
      setUbicaciones(ubicacionesData);
      setMarcajes(marcajesData);
      setResumen(resumenData);
    } catch (err) {
      setError(textoErrorApi(err, t, "empleados.detalle.errorCargaEmpleado"));
    } finally {
      setCargando(false);
    }
  }, [empleadoId, desdePeriodo, hastaPeriodo, t]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  if (cargando) {
    return (
      <main className="relative min-h-screen overflow-hidden bg-ck-cream p-6 dark:bg-neutral-950">
        <FondoFoto />
        <p className="relative z-10 text-sm text-neutral-600 dark:text-neutral-400">{t("empleados.detalle.cargando")}</p>
      </main>
    );
  }

  if (error || !empleado) {
    return (
      <main className="relative min-h-screen overflow-hidden bg-ck-cream p-6 dark:bg-neutral-950">
        <FondoFoto />
        <div className="relative z-10">
          <div className="rounded-lg bg-red-100 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
            {error ?? t("empleados.detalle.errorNoEncontrado")}
          </div>
          <Link href="/empleados" className="mt-4 inline-block text-sm text-ck-red underline dark:text-red-400">
            {t("empleados.detalle.volverAEmpleados")}
          </Link>
        </div>
      </main>
    );
  }

  const rol = nombreRolTraducido(
    roles.find((r) => r.id === empleado.rolId)?.nombre ?? empleado.rolId,
    t
  );
  const ubicacion = ubicaciones.find((u) => u.id === empleado.ubicacionId);
  const ultimoMarcaje = marcajes[marcajes.length - 1];
  const marcajesRecientes = [...marcajes].reverse().slice(0, 20);

  return (
    <main className="relative min-h-screen overflow-hidden bg-ck-cream p-6 dark:bg-neutral-950">
      <FondoFoto />
      <div className="relative z-10 mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/empleados" className="text-sm text-ck-red underline dark:text-red-400">
            &larr; {t("empleados.detalle.volver")}
          </Link>
          <Link href="/nomina" className="text-sm text-ck-red underline dark:text-red-400">
            {t("empleados.detalle.irANomina")}
          </Link>
        </div>

        <div className="mb-6 rounded-2xl bg-white p-6 shadow-sm dark:bg-neutral-900">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-ck-dark dark:text-neutral-100">{empleado.nombre}</h1>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                {rol} &middot; {ubicacion ? `${ubicacion.codigo} (${ubicacion.estado})` : empleado.ubicacionId}
              </p>
            </div>
            <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
              {t(CLAVE_ESTADO_EMPLEADO[empleado.estado])}
            </span>
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-xs uppercase text-neutral-500 dark:text-neutral-400">{t("empleados.detalle.email")}</dt>
              <dd className="text-ck-dark dark:text-neutral-100">{empleado.email}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-neutral-500 dark:text-neutral-400">{t("empleados.detalle.telefono")}</dt>
              <dd className="text-ck-dark dark:text-neutral-100">{empleado.telefono}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-neutral-500 dark:text-neutral-400">{t("empleados.detalle.contratado")}</dt>
              <dd className="text-ck-dark dark:text-neutral-100">{empleado.fechaContratacion}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-neutral-500 dark:text-neutral-400">{t("empleados.detalle.tarifaHora")}</dt>
              <dd className="text-ck-dark dark:text-neutral-100">{formatearDinero(empleado.tarifaHoraCentavos)}</dd>
            </div>
          </dl>
          {empleado.motivoBaja && (
            <p className="mt-3 text-xs text-neutral-600 dark:text-neutral-400">
              {t("empleados.detalle.motivoBaja", { motivo: "" })}
              <span className="italic">{empleado.motivoBaja}</span>
            </p>
          )}
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            {empleado.estado === "activo" ? (
              <MarcajeControles
                empleadoId={empleado.id}
                ultimoTipo={ultimoMarcaje?.tipo ?? null}
                onMarcado={(m) => setMarcajes((prev) => [...prev, m])}
              />
            ) : (
              <div className="rounded-xl border border-neutral-200 bg-white p-4 text-sm text-neutral-600 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400">
                {t("empleados.detalle.soloActivosMarcan", {
                  estado: t(CLAVE_ESTADO_EMPLEADO[empleado.estado]),
                })}
              </div>
            )}

            <div className="mt-4 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900">
              <h3 className="mb-2 text-sm font-bold text-ck-dark dark:text-neutral-100">
                {t("empleados.detalle.horasTitulo", { desde: desdePeriodo, hasta: hastaPeriodo })}
              </h3>
              <p className="text-2xl font-black text-ck-dark dark:text-neutral-100">
                {formatearMinutos(resumen?.minutosTrabajados ?? 0)}
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {t("empleados.detalle.horasNota")}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900">
            <h3 className="mb-2 text-sm font-bold text-ck-dark dark:text-neutral-100">
              {t("empleados.detalle.marcajesRecientes")}
            </h3>
            {marcajesRecientes.length === 0 ? (
              <p className="text-sm text-neutral-500 dark:text-neutral-400">{t("empleados.detalle.sinMarcajes")}</p>
            ) : (
              <ul className="max-h-96 space-y-1 overflow-y-auto text-sm">
                {marcajesRecientes.map((m) => (
                  <li
                    key={m.id}
                    className="flex items-center justify-between rounded-lg bg-neutral-50 px-2 py-1 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200"
                  >
                    <span>
                      <span
                        className={`mr-2 font-semibold ${
                          m.tipo === "entrada" ? "text-green-700 dark:text-green-400" : "text-ck-red dark:text-red-400"
                        }`}
                      >
                        {m.tipo === "entrada"
                          ? t("jornada.marcar.tipoEntrada")
                          : t("jornada.marcar.tipoSalida")}
                      </span>
                      {formatearFechaHora(m.timestamp)}
                    </span>
                    <span className="flex gap-1">
                      {m.tardanza && (
                        <Etiqueta texto={t("empleados.detalle.etiquetaTarde")} color="bg-ck-gold/20 text-ck-gold" />
                      )}
                      {!m.dentroDeGeofence && (
                        <Etiqueta texto={t("empleados.detalle.etiquetaFueraZona")} color="bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300" />
                      )}
                      {!m.identidadVerificada && (
                        <Etiqueta texto={t("empleados.detalle.etiquetaSinVerificar")} color="bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300" />
                      )}
                      {m.metodoVerificacion === "facial" && (
                        <Etiqueta
                          texto={t("empleados.detalle.etiquetaFacialTotp")}
                          color="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                        />
                      )}
                      {m.metodoVerificacion === "pinRespaldo" && (
                        <Etiqueta texto={t("empleados.detalle.etiquetaPinRespaldo")} color="bg-ck-gold/20 text-ck-gold" />
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

function Etiqueta({ texto, color }: { texto: string; color: string }) {
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${color}`}>{texto}</span>;
}
