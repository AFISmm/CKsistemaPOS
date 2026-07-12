"use client";

import { useState } from "react";
import { aCentavos, type Empleado, type Rol, type Ubicacion } from "@/lib/domain/types";
import { crearEmpleado, type NuevoEmpleadoBody } from "@/components/empleados/api";
import { useI18n } from "@/lib/shell/I18nProvider";
import { textoErrorApi } from "@/lib/i18n/erroresApi";
import { nombreRolTraducido } from "@/lib/i18n/roles";

/** Modal "Nuevo empleado" — alta en estado "onboarding" (rrhh-personal-pos). */
export default function OnboardingModal({
  roles,
  ubicaciones,
  onCreado,
  onCancelar,
}: {
  roles: Rol[];
  ubicaciones: Ubicacion[];
  onCreado: (empleado: Empleado) => void;
  onCancelar: () => void;
}) {
  const { t } = useI18n();
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [rolId, setRolId] = useState(roles[0]?.id ?? "");
  const [ubicacionId, setUbicacionId] = useState(ubicaciones[0]?.id ?? "");
  const [tarifaHora, setTarifaHora] = useState("15.00");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function manejarSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    setError(null);
    const tarifaHoraCentavos = aCentavos(Number(tarifaHora));
    if (!Number.isInteger(tarifaHoraCentavos) || tarifaHoraCentavos <= 0) {
      setError(t("empleados.modal.errorTarifaInvalida"));
      return;
    }
    const body: NuevoEmpleadoBody = {
      nombre,
      email,
      telefono,
      rolId,
      ubicacionId,
      tarifaHoraCentavos,
    };
    setEnviando(true);
    try {
      const empleado = await crearEmpleado(body);
      onCreado(empleado);
    } catch (err) {
      setError(textoErrorApi(err, t, "empleados.modal.errorNoPudoCrear"));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="mb-1 text-lg font-bold text-ck-dark">{t("empleados.modal.nuevoTitulo")}</h2>
        <p className="mb-4 text-xs text-neutral-500">
          {t("empleados.modal.nuevoDescripcion")}
        </p>

        {error && (
          <div className="mb-3 rounded-lg bg-red-50 p-2 text-sm text-ck-red">{error}</div>
        )}

        <form onSubmit={manejarSubmit} className="space-y-3">
          <Campo etiqueta={t("empleados.modal.campoNombre")}>
            <input
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="input"
              placeholder="Ana Rodriguez"
            />
          </Campo>
          <Campo etiqueta={t("empleados.modal.campoEmail")}>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              placeholder="ana@chickenkitchen.demo"
            />
          </Campo>
          <Campo etiqueta={t("empleados.modal.campoTelefono")}>
            <input
              required
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              className="input"
              placeholder="305-555-0100"
            />
          </Campo>
          <div className="grid grid-cols-2 gap-3">
            <Campo etiqueta={t("empleados.modal.campoRol")}>
              <select
                value={rolId}
                onChange={(e) => setRolId(e.target.value)}
                className="input"
              >
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {nombreRolTraducido(r.nombre, t)}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo etiqueta={t("empleados.modal.campoTienda")}>
              <select
                value={ubicacionId}
                onChange={(e) => setUbicacionId(e.target.value)}
                className="input"
              >
                {ubicaciones.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.codigo} ({u.estado})
                  </option>
                ))}
              </select>
            </Campo>
          </div>
          <Campo etiqueta={t("empleados.modal.campoTarifa")}>
            <input
              required
              type="number"
              min="0"
              step="0.01"
              value={tarifaHora}
              onChange={(e) => setTarifaHora(e.target.value)}
              className="input"
            />
          </Campo>

          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={onCancelar}
              className="rounded-xl border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-600"
            >
              {t("empleados.modal.cancelar")}
            </button>
            <button
              type="submit"
              disabled={enviando}
              className="rounded-xl bg-ck-red px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              {enviando ? t("empleados.modal.creando") : t("empleados.modal.crearEmpleado")}
            </button>
          </div>
        </form>
      </div>
      <style jsx global>{`
        .input {
          width: 100%;
          border-radius: 0.75rem;
          border: 1px solid #d4d4d4;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
        }
      `}</style>
    </div>
  );
}

function Campo({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <label className="block text-xs font-semibold text-neutral-600">
      {etiqueta}
      <div className="mt-1">{children}</div>
    </label>
  );
}
