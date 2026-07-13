"use client";

import { useState } from "react";
import type { Pedido } from "@/lib/domain/types";
import { aCentavos, formatearDinero } from "@/lib/domain/types";
import { useI18n } from "@/lib/shell/I18nProvider";

interface Props {
  pedido: Pedido;
  enviando: boolean;
  error: string | null;
  onConfirmar: (input: { tipo: "monto" | "porcentaje"; valor: number; motivo: string }) => void;
  onCancelar: () => void;
}

const PORCENTAJES_RAPIDOS = [10, 15, 20];

/**
 * Descuento / cortesia de lealtad. El backend (backend-ventas-pos) es el unico
 * que recalcula subtotal/impuesto/total tras aplicar el descuento; aqui solo
 * enviamos la intencion (tipo, valor, motivo) y refrescamos el pedido despues.
 */
export default function DescuentoModal({ pedido, enviando, error, onConfirmar, onCancelar }: Props) {
  const { t } = useI18n();
  const [tipo, setTipo] = useState<"porcentaje" | "monto">("porcentaje");
  const [porcentaje, setPorcentaje] = useState<number | null>(10);
  const [montoTexto, setMontoTexto] = useState("");
  const [motivo, setMotivo] = useState("");

  const valorValido =
    tipo === "porcentaje"
      ? typeof porcentaje === "number" && porcentaje > 0 && porcentaje <= 100
      : Number(montoTexto) > 0;
  const formularioValido = valorValido && motivo.trim().length >= 3;

  function confirmar() {
    if (!formularioValido || enviando) return;
    if (tipo === "porcentaje") {
      onConfirmar({ tipo: "porcentaje", valor: Math.round(porcentaje ?? 0), motivo: motivo.trim() });
    } else {
      onConfirmar({ tipo: "monto", valor: aCentavos(Number(montoTexto)), motivo: motivo.trim() });
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl dark:bg-neutral-900">
        <h2 className="mb-1 text-lg font-bold text-ck-dark dark:text-neutral-100">{t("pos.descuento.titulo")}</h2>
        <p className="mb-4 text-xs text-neutral-600 dark:text-neutral-400">
          {t("pos.descuento.subtotalActual", { monto: formatearDinero(pedido.subtotal) })}
        </p>

        <div className="mb-3 flex gap-2">
          <button
            type="button"
            onClick={() => setTipo("porcentaje")}
            className={`flex-1 rounded-xl py-2 text-sm font-semibold ${
              tipo === "porcentaje" ? "bg-ck-red text-white" : "bg-neutral-100 text-ck-dark dark:bg-neutral-800 dark:text-neutral-100"
            }`}
          >
            {t("pos.descuento.porcentaje")}
          </button>
          <button
            type="button"
            onClick={() => setTipo("monto")}
            className={`flex-1 rounded-xl py-2 text-sm font-semibold ${
              tipo === "monto" ? "bg-ck-red text-white" : "bg-neutral-100 text-ck-dark dark:bg-neutral-800 dark:text-neutral-100"
            }`}
          >
            {t("pos.descuento.montoFijo")}
          </button>
        </div>

        {tipo === "porcentaje" ? (
          <div className="mb-4 flex gap-2">
            {PORCENTAJES_RAPIDOS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPorcentaje(p)}
                className={`flex-1 rounded-xl border py-2 text-sm font-semibold ${
                  porcentaje === p
                    ? "border-ck-red bg-ck-red text-white"
                    : "border-neutral-300 text-ck-dark dark:border-neutral-600 dark:text-neutral-100"
                }`}
              >
                {p}%
              </button>
            ))}
          </div>
        ) : (
          <div className="mb-4">
            <label className="mb-1 block text-xs font-semibold text-neutral-600 dark:text-neutral-400">
              {t("pos.descuento.montoLabel")}
            </label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={montoTexto}
              onChange={(e) => setMontoTexto(e.target.value)}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-ck-dark dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
              placeholder="0.00"
            />
          </div>
        )}

        <div className="mb-4">
          <label className="mb-1 block text-xs font-semibold text-neutral-600 dark:text-neutral-400">
            {t("pos.descuento.motivoLabel")}
          </label>
          <input
            type="text"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder={t("pos.descuento.motivoPlaceholder")}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-ck-dark dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
            maxLength={140}
          />
        </div>

        {error && <p className="mb-3 text-sm font-semibold text-ck-red dark:text-red-400">{error}</p>}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancelar}
            className="flex-1 rounded-xl border border-neutral-300 py-3 text-sm font-semibold text-neutral-600 dark:border-neutral-600 dark:text-neutral-300"
          >
            {t("pos.descuento.cancelar")}
          </button>
          <button
            type="button"
            disabled={!formularioValido || enviando}
            onClick={confirmar}
            className={`flex-1 rounded-xl py-3 text-sm font-bold text-white ${
              !formularioValido || enviando ? "cursor-not-allowed bg-neutral-300 dark:bg-neutral-700" : "bg-ck-red"
            }`}
          >
            {enviando ? t("pos.descuento.aplicando") : t("pos.descuento.aplicar")}
          </button>
        </div>
      </div>
    </div>
  );
}
