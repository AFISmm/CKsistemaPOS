"use client";

import type { Producto } from "@/lib/domain/types";
import { formatearDinero } from "@/lib/domain/types";
import { useI18n } from "@/lib/shell/I18nProvider";

interface Props {
  productos: Producto[];
  onSeleccionar: (producto: Producto) => void;
}

/**
 * Rejilla de productos como botones grandes (min 96px alto) con precio visible.
 * Productos 86 (agotados) se muestran atenuados y deshabilitados: dificil de
 * pulsar por error, sin necesidad de leer texto para saber que no aplica.
 */
export default function ProductosGrid({ productos, onSeleccionar }: Props) {
  const { t } = useI18n();
  const visibles = productos.filter((p) => p.activo);

  if (visibles.length === 0) {
    return <p className="p-4 text-sm text-neutral-600 dark:text-neutral-400">{t("pos.productos.vacio")}</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {visibles.map((prod) => {
        const agotado = prod.disponible86 === false;
        return (
          <button
            key={prod.id}
            type="button"
            disabled={agotado}
            onClick={() => onSeleccionar(prod)}
            aria-disabled={agotado}
            className={`flex min-h-[96px] flex-col items-start justify-between rounded-xl border p-3 text-left shadow-sm transition active:scale-95 ${
              agotado
                ? "cursor-not-allowed border-neutral-200 bg-neutral-100 opacity-50 dark:border-neutral-700 dark:bg-neutral-800"
                : "border-neutral-200 bg-white hover:border-ck-red hover:shadow-md dark:border-neutral-700 dark:bg-neutral-900"
            }`}
          >
            <span className="text-sm font-semibold leading-snug text-ck-dark dark:text-neutral-100">
              {prod.nombre}
            </span>
            <div className="mt-2 flex w-full items-center justify-between">
              <span className="text-base font-bold text-ck-red dark:text-red-400">
                {formatearDinero(prod.precioBase)}
              </span>
              {agotado && (
                <span className="rounded bg-neutral-300 px-2 py-0.5 text-xs font-semibold text-neutral-700 dark:bg-neutral-700 dark:text-neutral-300">
                  {t("pos.productos.agotado")}
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
