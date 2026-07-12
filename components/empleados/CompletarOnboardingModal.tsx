"use client";

import { useState } from "react";
import type { Empleado } from "@/lib/domain/types";
import { completarOnboarding, ErrorApi } from "@/components/empleados/api";

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
      setError(err instanceof ErrorApi ? err.message : "No se pudo completar el onboarding.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="mb-1 text-lg font-bold text-ck-dark">Completar onboarding</h2>
        <p className="mb-4 text-sm text-neutral-600">
          Asigna un PIN de acceso para <span className="font-semibold">{empleado.nombre}</span>.
          Al confirmar se crea su usuario de login y pasa a estado{" "}
          <span className="font-semibold">activo</span>.
        </p>

        {error && (
          <div className="mb-3 rounded-lg bg-red-50 p-2 text-sm text-ck-red">{error}</div>
        )}

        <form onSubmit={manejarSubmit} className="space-y-3">
          <label className="block text-xs font-semibold text-neutral-600">
            PIN (4-6 digitos)
            <input
              required
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              inputMode="numeric"
              minLength={4}
              maxLength={6}
              className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm tracking-widest"
              placeholder="1234"
            />
          </label>
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={onCancelar}
              className="rounded-xl border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-600"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={enviando}
              className="rounded-xl bg-ck-red px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              {enviando ? "Guardando..." : "Completar onboarding"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
