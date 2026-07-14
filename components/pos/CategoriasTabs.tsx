"use client";

import type { Categoria } from "@/lib/domain/types";
import { useI18n } from "@/lib/shell/I18nProvider";

interface Props {
  categorias: Categoria[];
  categoriaActivaId: string | null;
  onSeleccionar: (categoriaId: string) => void;
}

/**
 * Pestanas de categorias: se AJUSTAN a la pantalla envolviendo en varias
 * filas (flex-wrap) en vez de desbordar horizontalmente fuera de la vista
 * (antes usaba scroll horizontal sin ninguna pista visual de que habia mas
 * categorias fuera de pantalla, lo que las hacia parecer "cortadas"/rotas).
 * Con flex-wrap TODAS las categorias quedan siempre visibles sin necesidad
 * de desplazar nada. Botones de toque amplio (min 44px alto) para uso rapido
 * en pantalla tactil.
 */
export default function CategoriasTabs({ categorias, categoriaActivaId, onSeleccionar }: Props) {
  const { t } = useI18n();
  const activas = categorias.filter((c) => c.activo).sort((a, b) => a.orden - b.orden);

  if (activas.length === 0) {
    return (
      <p className="p-4 text-sm text-neutral-600 dark:text-neutral-400">{t("pos.categorias.vacio")}</p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2 pb-2" role="tablist" aria-label={t("pos.categorias.ariaLabel")}>
      {activas.map((cat) => {
        const activa = cat.id === categoriaActivaId;
        return (
          <button
            key={cat.id}
            type="button"
            role="tab"
            aria-selected={activa}
            onClick={() => onSeleccionar(cat.id)}
            className={`min-h-[44px] whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm transition active:scale-95 sm:px-5 sm:py-3 sm:text-base ${
              activa
                ? "bg-ck-red text-white"
                : "border border-neutral-200 bg-white text-ck-dark hover:border-ck-red dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
            }`}
          >
            {cat.nombre}
          </button>
        );
      })}
    </div>
  );
}
