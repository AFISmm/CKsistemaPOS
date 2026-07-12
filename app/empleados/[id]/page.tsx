"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { Empleado, Marcaje, Rol, Ubicacion } from "@/lib/domain/types";
import { formatearDinero } from "@/lib/domain/types";
import {
  ErrorApi,
  listarMarcajes,
  listarRoles,
  listarUbicaciones,
  obtenerEmpleado,
  obtenerResumenHoras,
  type ResumenHorasResponse,
} from "@/components/empleados/api";
import MarcajeControles from "@/components/empleados/MarcajeControles";

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
      setError(err instanceof ErrorApi ? err.message : "No se pudo cargar el empleado.");
    } finally {
      setCargando(false);
    }
  }, [empleadoId, desdePeriodo, hastaPeriodo]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  if (cargando) {
    return (
      <main className="min-h-screen bg-ck-cream p-6">
        <p className="text-sm text-neutral-500">Cargando...</p>
      </main>
    );
  }

  if (error || !empleado) {
    return (
      <main className="min-h-screen bg-ck-cream p-6">
        <div className="rounded-lg bg-red-100 p-3 text-sm text-red-700">
          {error ?? "Empleado no encontrado."}
        </div>
        <Link href="/empleados" className="mt-4 inline-block text-sm text-ck-red underline">
          Volver a Empleados
        </Link>
      </main>
    );
  }

  const rol = roles.find((r) => r.id === empleado.rolId)?.nombre ?? empleado.rolId;
  const ubicacion = ubicaciones.find((u) => u.id === empleado.ubicacionId);
  const ultimoMarcaje = marcajes[marcajes.length - 1];
  const marcajesRecientes = [...marcajes].reverse().slice(0, 20);

  return (
    <main className="min-h-screen bg-ck-cream p-6">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/empleados" className="text-sm text-ck-red underline">
            &larr; Empleados
          </Link>
          <Link href="/nomina" className="text-sm text-ck-red underline">
            Ir a Nomina
          </Link>
        </div>

        <div className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-ck-dark">{empleado.nombre}</h1>
              <p className="text-sm text-neutral-600">
                {rol} &middot; {ubicacion ? `${ubicacion.codigo} (${ubicacion.estado})` : empleado.ubicacionId}
              </p>
            </div>
            <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-600">
              {empleado.estado}
            </span>
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-xs uppercase text-neutral-400">Email</dt>
              <dd>{empleado.email}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-neutral-400">Telefono</dt>
              <dd>{empleado.telefono}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-neutral-400">Contratado</dt>
              <dd>{empleado.fechaContratacion}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-neutral-400">Tarifa/hora</dt>
              <dd>{formatearDinero(empleado.tarifaHoraCentavos)}</dd>
            </div>
          </dl>
          {empleado.motivoBaja && (
            <p className="mt-3 text-xs text-neutral-500">
              Motivo de baja: <span className="italic">{empleado.motivoBaja}</span>
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
              <div className="rounded-xl border border-neutral-200 bg-white p-4 text-sm text-neutral-500">
                Solo empleados <span className="font-semibold">activos</span> pueden marcar
                asistencia. Este empleado esta en estado &quot;{empleado.estado}&quot;.
              </div>
            )}

            <div className="mt-4 rounded-xl border border-neutral-200 bg-white p-4">
              <h3 className="mb-2 text-sm font-bold text-ck-dark">
                Horas ultimos 7 dias ({desdePeriodo} a {hastaPeriodo})
              </h3>
              <p className="text-2xl font-black text-ck-dark">
                {formatearMinutos(resumen?.minutosTrabajados ?? 0)}
              </p>
              <p className="text-xs text-neutral-400">
                Regular vs. extra (&gt;40h/semana) se calcula al correr nomina.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white p-4">
            <h3 className="mb-2 text-sm font-bold text-ck-dark">Marcajes recientes</h3>
            {marcajesRecientes.length === 0 ? (
              <p className="text-sm text-neutral-400">Sin marcajes registrados.</p>
            ) : (
              <ul className="max-h-96 space-y-1 overflow-y-auto text-sm">
                {marcajesRecientes.map((m) => (
                  <li
                    key={m.id}
                    className="flex items-center justify-between rounded-lg bg-neutral-50 px-2 py-1"
                  >
                    <span>
                      <span
                        className={`mr-2 font-semibold ${
                          m.tipo === "entrada" ? "text-green-700" : "text-ck-red"
                        }`}
                      >
                        {m.tipo}
                      </span>
                      {formatearFechaHora(m.timestamp)}
                    </span>
                    <span className="flex gap-1">
                      {m.tardanza && <Etiqueta texto="tarde" color="bg-ck-gold/20 text-ck-gold" />}
                      {!m.dentroDeGeofence && (
                        <Etiqueta texto="fuera de zona" color="bg-red-100 text-red-700" />
                      )}
                      {!m.identidadVerificada && (
                        <Etiqueta texto="sin verificar" color="bg-red-100 text-red-700" />
                      )}
                      {m.metodoVerificacion === "facial" && (
                        <Etiqueta texto="facial+TOTP" color="bg-green-100 text-green-700" />
                      )}
                      {m.metodoVerificacion === "pinRespaldo" && (
                        <Etiqueta texto="PIN respaldo" color="bg-ck-gold/20 text-ck-gold" />
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
