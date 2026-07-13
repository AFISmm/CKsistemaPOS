"use client";

import { useState } from "react";
import type { Empleado } from "@/lib/domain/types";
import { darDeBajaEmpleado } from "@/components/empleados/api";
import { useI18n } from "@/lib/shell/I18nProvider";
import { textoErrorApi } from "@/lib/i18n/erroresApi";

/** Modal "Dar de baja": baja LOGICA (estado -> "inactivo" + motivo), nunca borra el registro. */
export default function BajaModal({
  empleado,
  onBaja,
  onCancelar,
}: {
  empleado: Empleado;
  onBaja: (empleado: Empleado) => void;
  onCancelar: () => void;
}) {
  const { t } = useI18n();
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function manejarSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      const actualizado = await darDeBajaEmpleado(empleado.id, motivo);
      onBaja(actualizado);
    } catch (err) {
      setError(textoErrorApi(err, t, "empleados.modal.errorNoPudoDarBaja"));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-neutral-900">
        <h2 className="mb-1 text-lg font-bold text-ck-dark dark:text-neutral-100">{t("empleados.modal.bajaTitulo")}</h2>
        <p className="mb-4 text-sm text-neutral-600 dark:text-neutral-400">
          {t("empleados.modal.bajaDescripcion", { nombre: empleado.nombre })}
        </p>

        {error && (
          <div className="mb-3 rounded-lg bg-red-50 p-2 text-sm text-ck-red dark:bg-red-950/40 dark:text-red-300">{error}</div>
        )}

        <form onSubmit={manejarSubmit} className="space-y-3">
          <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400">
            {t("empleados.modal.campoMotivo")}
            <textarea
              required
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm text-ck-dark dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
              rows={3}
              placeholder={t("empleados.modal.motivoPlaceholder")}
            />
          </label>
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={onCancelar}
              className="rounded-xl border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-600 dark:border-neutral-600 dark:text-neutral-300"
            >
              {t("empleados.modal.cancelar")}
            </button>
            <button
              type="submit"
              disabled={enviando}
              className="rounded-xl bg-ck-red px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              {enviando ? t("empleados.modal.guardando") : t("empleados.modal.confirmarBaja")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
