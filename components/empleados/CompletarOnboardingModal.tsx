"use client";

import { useState } from "react";
import type { Empleado } from "@/lib/domain/types";
import { completarOnboarding } from "@/components/empleados/api";
import { useI18n } from "@/lib/shell/I18nProvider";
import { textoErrorApi } from "@/lib/i18n/erroresApi";

/** Modal "Completar onboarding": crea el Usuario de login (PIN) y pasa el empleado a "activo". */
export default function CompletarOnboardingModal({
  empleado,
  onCompletado,
  onCancelar,
}: {
  empleado: Empleado;
  onCompletado: (empleado: Empleado) => void;
  onCancelar: () => void;
}) {
  const { t } = useI18n();
  const [pin, setPin] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function manejarSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      const actualizado = await completarOnboarding(empleado.id, pin);
      onCompletado(actualizado);
    } catch (err) {
      setError(textoErrorApi(err, t, "empleados.modal.errorNoPudoCompletar"));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-neutral-900">
        <h2 className="mb-1 text-lg font-bold text-ck-dark dark:text-neutral-100">{t("empleados.modal.completarTitulo")}</h2>
        <p className="mb-4 text-sm text-neutral-600 dark:text-neutral-400">
          {t("empleados.modal.completarDescripcion", { nombre: empleado.nombre })}
        </p>

        {error && (
          <div className="mb-3 rounded-lg bg-red-50 p-2 text-sm text-ck-red dark:bg-red-950/40 dark:text-red-300">{error}</div>
        )}

        <form onSubmit={manejarSubmit} className="space-y-3">
          <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400">
            {t("empleados.modal.campoPin")}
            <input
              required
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              inputMode="numeric"
              minLength={4}
              maxLength={6}
              className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm tracking-widest text-ck-dark dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
              placeholder="1234"
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
              {enviando ? t("empleados.modal.guardando") : t("empleados.modal.completarTitulo")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
