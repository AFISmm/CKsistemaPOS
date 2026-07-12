"use client";

import { useState } from "react";
import type { Empleado } from "@/lib/domain/types";
import { darDeBajaEmpleado, ErrorApi } from "@/components/empleados/api";

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
      setError(err instanceof ErrorApi ? err.message : "No se pudo dar de baja al empleado.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="mb-1 text-lg font-bold text-ck-dark">Dar de baja</h2>
        <p className="mb-4 text-sm text-neutral-600">
          Baja logica de <span className="font-semibold">{empleado.nombre}</span>. El registro no
          se borra (historial de nomina/auditoria); su acceso de login se desactiva.
        </p>

        {error && (
          <div className="mb-3 rounded-lg bg-red-50 p-2 text-sm text-ck-red">{error}</div>
        )}

        <form onSubmit={manejarSubmit} className="space-y-3">
          <label className="block text-xs font-semibold text-neutral-600">
            Motivo
            <textarea
              required
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm"
              rows={3}
              placeholder="Renuncia voluntaria, fin de contrato, etc."
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
              {enviando ? "Guardando..." : "Confirmar baja"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
