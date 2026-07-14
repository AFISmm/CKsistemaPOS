"use client";

import { useState } from "react";
import { aCentavos, type Categoria, type Producto } from "@/lib/domain/types";
import { crearProducto, type NuevoProductoBody } from "@/components/menu/api";
import { useI18n } from "@/lib/shell/I18nProvider";
import { textoErrorApi } from "@/lib/i18n/erroresApi";

/** Modal "Nuevo plato" — alta de Producto en el catalogo (menu-inventario-pos). */
export default function NuevoProductoModal({
  categorias,
  onCreado,
  onCancelar,
}: {
  categorias: Categoria[];
  onCreado: (producto: Producto) => void;
  onCancelar: () => void;
}) {
  const { t } = useI18n();
  const [categoriaId, setCategoriaId] = useState(categorias[0]?.id ?? "");
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [precio, setPrecio] = useState("9.99");
  const [gravable, setGravable] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function manejarSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    setError(null);

    if (!nombre.trim()) {
      setError(t("menu.modal.errorNombreRequerido"));
      return;
    }

    const precioBaseCentavos = aCentavos(Number(precio));
    if (!Number.isInteger(precioBaseCentavos) || precioBaseCentavos <= 0) {
      setError(t("menu.modal.errorPrecioInvalido"));
      return;
    }

    const body: NuevoProductoBody = {
      categoriaId,
      nombre,
      descripcion,
      precioBaseCentavos,
      gravable,
    };

    setEnviando(true);
    try {
      const producto = await crearProducto(body);
      onCreado(producto);
    } catch (err) {
      setError(textoErrorApi(err, t, "menu.modal.errorNoPudoCrear"));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-neutral-900">
        <h2 className="mb-1 text-lg font-bold text-ck-dark dark:text-neutral-100">{t("menu.modal.nuevoTitulo")}</h2>
        <p className="mb-4 text-xs text-neutral-600 dark:text-neutral-400">
          {t("menu.modal.nuevoDescripcion")}
        </p>

        {error && (
          <div className="mb-3 rounded-lg bg-red-50 p-2 text-sm text-ck-red dark:bg-red-950/40 dark:text-red-300">{error}</div>
        )}

        <form onSubmit={manejarSubmit} className="space-y-3">
          <Campo etiqueta={t("menu.modal.campoCategoria")}>
            <select
              value={categoriaId}
              onChange={(e) => setCategoriaId(e.target.value)}
              className="input"
            >
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </Campo>
          <Campo etiqueta={t("menu.modal.campoNombre")}>
            <input
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="input"
              placeholder="Spicy Chop-Chop Bowl"
            />
          </Campo>
          <Campo etiqueta={t("menu.modal.campoDescripcion")}>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              className="input"
              rows={2}
              placeholder="Grilled chicken, rice, black beans, pico de gallo..."
            />
          </Campo>
          <Campo etiqueta={t("menu.modal.campoPrecio")}>
            <input
              required
              type="number"
              min="0"
              step="0.01"
              value={precio}
              onChange={(e) => setPrecio(e.target.value)}
              className="input"
            />
          </Campo>
          <label className="flex items-center gap-2 text-xs font-semibold text-neutral-600 dark:text-neutral-400">
            <input
              type="checkbox"
              checked={gravable}
              onChange={(e) => setGravable(e.target.checked)}
              className="h-4 w-4"
            />
            {t("menu.modal.campoGravable")}
          </label>

          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={onCancelar}
              className="rounded-xl border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-600 dark:border-neutral-600 dark:text-neutral-300"
            >
              {t("menu.modal.cancelar")}
            </button>
            <button
              type="submit"
              disabled={enviando}
              className="rounded-xl bg-ck-red px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              {enviando ? t("menu.modal.creando") : t("menu.modal.crearProducto")}
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
          color: #1a1a1a;
          background-color: #ffffff;
        }
        .dark .input {
          border-color: #525252;
          background-color: #262626;
          color: #f5f5f5;
        }
      `}</style>
    </div>
  );
}

function Campo({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400">
      {etiqueta}
      <div className="mt-1">{children}</div>
    </label>
  );
}
