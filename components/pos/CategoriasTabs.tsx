"use client";

import type { Categoria } from "@/lib/domain/types";

interface Props {
  categorias: Categoria[];
  categoriaActivaId: string | null;
  onSeleccionar: (categoriaId: string) => void;
}

/**
 * Pestanas grandes de categorias (rejilla horizontal con scroll).
 * Botones de toque amplio (min 56px alto) para uso rapido en pantalla tactil.
 */
export default function CategoriasTabs({ categorias, categoriaActivaId, onSeleccionar }: Props) {
  const activas = categorias.filter((c) => c.activo).sort((a, b) => a.orden - b.orden);

  if (activas.length === 0) {
    return (
      <p className="p-4 text-sm text-neutral-500">No hay categorias en el catalogo.</p>
    );
  }

  return (
    <div className="flex gap-2 overflow-x-auto pb-2" role="tablist" aria-label="Categorias del menu">
      {activas.map((cat) => {
        const activa = cat.id === categoriaActivaId;
        return (
          <button
            key={cat.id}
            type="button"
            role="tab"
            aria-selected={activa}
            onClick={() => onSeleccionar(cat.id)}
            className={`min-h-[56px] flex-shrink-0 whitespace-nowrap rounded-xl px-5 py-3 text-base font-semibold shadow-sm transition active:scale-95 ${
              activa
                ? "bg-ck-red text-white"
                : "bg-white text-ck-dark border border-neutral-200 hover:border-ck-red"
            }`}
          >
            {cat.nombre}
          </button>
        );
      })}
    </div>
  );
}
