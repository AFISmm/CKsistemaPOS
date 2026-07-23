"use client";

import { useCallback, useEffect, useState } from "react";
import type { Insumo, Producto } from "@/lib/domain/types";
import {
  guardarRecetaProducto,
  listarInsumos,
  obtenerRecetaProducto,
  type ItemRecetaBody,
} from "@/components/menu/api";
import { useI18n } from "@/lib/shell/I18nProvider";
import { textoErrorApi } from "@/lib/i18n/erroresApi";

interface FilaEdicion {
  /** Clave local estable para el renderizado de la lista (no viaja al backend). */
  key: string;
  insumoId: string;
  cantidad: string; // se maneja como texto en el input, se valida/convierte al guardar
}

let contadorFila = 0;
function nuevaClave(): string {
  contadorFila += 1;
  return `fila-${contadorFila}`;
}

/**
 * Modal "Editar receta" — agregar/quitar/cambiar cantidad de los insumos de la
 * receta de un producto (menu-inventario-pos, Fase A 2026-07-22). Reemplazo
 * completo: al guardar se manda la lista entera de {insumoId, cantidad} y el
 * backend reemplaza la receta activa del producto (ver lib/menu/recetas.ts).
 */
export default function EditarRecetaModal({
  producto,
  onGuardado,
  onCancelar,
}: {
  producto: Producto;
  onGuardado: () => void;
  onCancelar: () => void;
}) {
  const { t } = useI18n();
  const [insumosCatalogo, setInsumosCatalogo] = useState<Insumo[]>([]);
  const [filas, setFilas] = useState<FilaEdicion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const [insumos, recetaActual] = await Promise.all([
        listarInsumos(),
        obtenerRecetaProducto(producto.id),
      ]);
      setInsumosCatalogo(insumos);
      setFilas(
        recetaActual.items.map((item) => ({
          key: nuevaClave(),
          insumoId: item.insumoId,
          cantidad: String(item.cantidad),
        }))
      );
    } catch (err) {
      setError(textoErrorApi(err, t, "menu.receta.errorCarga"));
    } finally {
      setCargando(false);
    }
  }, [producto.id, t]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  function agregarFila() {
    setFilas((prev) => [
      ...prev,
      { key: nuevaClave(), insumoId: insumosCatalogo[0]?.id ?? "", cantidad: "1" },
    ]);
  }

  function quitarFila(key: string) {
    setFilas((prev) => prev.filter((f) => f.key !== key));
  }

  function actualizarFila(key: string, cambios: Partial<FilaEdicion>) {
    setFilas((prev) => prev.map((f) => (f.key === key ? { ...f, ...cambios } : f)));
  }

  function unidadDe(insumoId: string): string {
    return insumosCatalogo.find((i) => i.id === insumoId)?.unidadMedida ?? "";
  }

  async function manejarSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    setError(null);

    const ids = new Set<string>();
    const items: ItemRecetaBody[] = [];
    for (const fila of filas) {
      if (!fila.insumoId) {
        setError(t("menu.receta.errorInsumoRequerido"));
        return;
      }
      if (ids.has(fila.insumoId)) {
        setError(t("menu.receta.errorInsumoDuplicado"));
        return;
      }
      ids.add(fila.insumoId);

      const cantidad = Number(fila.cantidad);
      if (!Number.isFinite(cantidad) || cantidad <= 0) {
        setError(t("menu.receta.errorCantidadInvalida"));
        return;
      }
      items.push({ insumoId: fila.insumoId, cantidad });
    }

    setGuardando(true);
    try {
      await guardarRecetaProducto(producto.id, items);
      onGuardado();
    } catch (err) {
      setError(textoErrorApi(err, t, "menu.receta.errorNoPudoGuardar"));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-neutral-900">
        <h2 className="mb-1 text-lg font-bold text-ck-dark dark:text-neutral-100">
          {t("menu.receta.titulo")}
        </h2>
        <p className="mb-4 text-xs text-neutral-600 dark:text-neutral-400">{producto.nombre}</p>

        {error && (
          <div className="mb-3 rounded-lg bg-red-50 p-2 text-sm text-ck-red dark:bg-red-950/40 dark:text-red-300">
            {error}
          </div>
        )}

        {cargando ? (
          <p className="text-sm text-neutral-600 dark:text-neutral-400">{t("menu.receta.cargando")}</p>
        ) : (
          <form onSubmit={manejarSubmit} className="space-y-3">
            {insumosCatalogo.length === 0 ? (
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                {t("menu.receta.sinInsumosCatalogo")}
              </p>
            ) : filas.length === 0 ? (
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                {t("menu.receta.sinIngredientes")}
              </p>
            ) : (
              <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                {filas.map((fila) => (
                  <div key={fila.key} className="flex items-center gap-2">
                    <select
                      value={fila.insumoId}
                      onChange={(e) => actualizarFila(fila.key, { insumoId: e.target.value })}
                      className="input flex-1"
                    >
                      {insumosCatalogo.map((insumo) => (
                        <option key={insumo.id} value={insumo.id}>
                          {insumo.nombre}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={fila.cantidad}
                      onChange={(e) => actualizarFila(fila.key, { cantidad: e.target.value })}
                      className="input w-24"
                    />
                    <span className="w-14 shrink-0 text-xs text-neutral-500 dark:text-neutral-400">
                      {unidadDe(fila.insumoId)}
                    </span>
                    <button
                      type="button"
                      onClick={() => quitarFila(fila.key)}
                      className="shrink-0 rounded-lg border border-neutral-300 px-2 py-1 text-xs font-semibold text-neutral-600 dark:border-neutral-600 dark:text-neutral-300"
                      aria-label={t("menu.receta.quitarIngrediente")}
                    >
                      {t("menu.receta.quitar")}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {insumosCatalogo.length > 0 && (
              <button
                type="button"
                onClick={agregarFila}
                className="rounded-xl border border-dashed border-neutral-300 px-3 py-2 text-xs font-semibold text-neutral-600 dark:border-neutral-600 dark:text-neutral-300"
              >
                {t("menu.receta.agregarIngrediente")}
              </button>
            )}

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
                disabled={guardando}
                className="rounded-xl bg-ck-red px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
              >
                {guardando ? t("menu.receta.guardando") : t("menu.receta.guardar")}
              </button>
            </div>
          </form>
        )}
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
