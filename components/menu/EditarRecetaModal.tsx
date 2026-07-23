"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Insumo, Producto, TipoAlergeno } from "@/lib/domain/types";
import { formatearDinero } from "@/lib/domain/types";
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

  // AGREGADO (Fase B, 2026-07-22): costo/alergenos DEMO de la receta GUARDADA
  // actualmente (calculados server-side, ver lib/menu/costeo.ts / alergenos.ts
  // — ya atraviesan el BOM multi-nivel si aplica). Se refrescan al cargar y
  // al guardar.
  const [costoEstimadoCentavos, setCostoEstimadoCentavos] = useState<number | null>(null);
  const [costoIncompleto, setCostoIncompleto] = useState(false);
  const [alergenosGuardados, setAlergenosGuardados] = useState<TipoAlergeno[]>([]);

  // AGREGADO (Fase B, 2026-07-22): simulador "sin X" 100% cliente (no importa
  // lib/menu/lib/db, ver regla dura de este archivo/components/pos/api.ts) —
  // vista previa SIMPLIFICADA: union de `Insumo.alergenos` de las filas
  // actuales del formulario (SIN atravesar insumos compuestos/BOM, a
  // diferencia del calculo server-side de arriba). Demuestra la idea de S-16
  // ("sin X" ya no aporta el alergeno de ese insumo) de forma interactiva.
  const [insumosQuitadosSimulacion, setInsumosQuitadosSimulacion] = useState<Set<string>>(new Set());

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
      setCostoEstimadoCentavos(recetaActual.costoEstimadoCentavos);
      setCostoIncompleto(recetaActual.costoIncompleto);
      setAlergenosGuardados(recetaActual.alergenos);
      setInsumosQuitadosSimulacion(new Set());
    } catch (err) {
      setError(textoErrorApi(err, t, "menu.receta.errorCarga"));
    } finally {
      setCargando(false);
    }
  }, [producto.id, t]);

  /** Vista previa SIMPLIFICADA (sin BOM) de alergenos si se "quitan" (simulacion) los insumos marcados. */
  const alergenosPreviaSimulacion = useMemo(() => {
    const encontrados = new Set<TipoAlergeno>();
    for (const fila of filas) {
      if (insumosQuitadosSimulacion.has(fila.insumoId)) continue;
      const insumo = insumosCatalogo.find((i) => i.id === fila.insumoId);
      for (const a of insumo?.alergenos ?? []) encontrados.add(a);
    }
    return Array.from(encontrados);
  }, [filas, insumosQuitadosSimulacion, insumosCatalogo]);

  function alternarQuitadoSimulacion(insumoId: string) {
    setInsumosQuitadosSimulacion((prev) => {
      const nuevo = new Set(prev);
      if (nuevo.has(insumoId)) nuevo.delete(insumoId);
      else nuevo.add(insumoId);
      return nuevo;
    });
  }

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
      const actualizado = await guardarRecetaProducto(producto.id, items);
      setCostoEstimadoCentavos(actualizado.costoEstimadoCentavos);
      setCostoIncompleto(actualizado.costoIncompleto);
      setAlergenosGuardados(actualizado.alergenos);
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
            <div className="rounded-xl border border-dashed border-neutral-300 p-3 text-xs dark:border-neutral-700">
              <p className="font-semibold text-ck-dark dark:text-neutral-100">
                {t("menu.receta.costoTitulo")}:{" "}
                <span className="font-normal">
                  {costoEstimadoCentavos == null ? t("menu.receta.sinCosto") : formatearDinero(costoEstimadoCentavos)}
                  {costoIncompleto && costoEstimadoCentavos != null ? ` (${t("menu.receta.costoIncompleto")})` : ""}
                </span>
              </p>
              <p className="mt-0.5 text-neutral-500 dark:text-neutral-400">{t("menu.receta.costoAviso")}</p>

              <p className="mt-2 font-semibold text-ck-dark dark:text-neutral-100">{t("menu.receta.alergenosTitulo")}</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {alergenosGuardados.length === 0 ? (
                  <span className="text-neutral-500 dark:text-neutral-400">{t("menu.receta.sinAlergenos")}</span>
                ) : (
                  alergenosGuardados.map((a) => (
                    <span
                      key={a}
                      className="rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                    >
                      {t(`menu.alergeno.${a}`)}
                    </span>
                  ))
                )}
              </div>
              <p className="mt-1 text-neutral-500 dark:text-neutral-400">{t("menu.receta.alergenosAviso")}</p>

              {filas.length > 0 && (
                <>
                  <p className="mt-2 font-semibold text-ck-dark dark:text-neutral-100">
                    {t("menu.receta.simularQuitarTitulo")}
                  </p>
                  <p className="text-neutral-500 dark:text-neutral-400">{t("menu.receta.simularQuitarAviso")}</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {alergenosPreviaSimulacion.length === 0 ? (
                      <span className="text-neutral-500 dark:text-neutral-400">{t("menu.receta.sinAlergenos")}</span>
                    ) : (
                      alergenosPreviaSimulacion.map((a) => (
                        <span
                          key={a}
                          className="rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                        >
                          {t(`menu.alergeno.${a}`)}
                        </span>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>

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
                    <label
                      className="flex shrink-0 items-center gap-1 text-[10px] text-neutral-500 dark:text-neutral-400"
                      title={t("menu.receta.simularQuitarAviso")}
                    >
                      <input
                        type="checkbox"
                        checked={insumosQuitadosSimulacion.has(fila.insumoId)}
                        onChange={() => alternarQuitadoSimulacion(fila.insumoId)}
                      />
                      {t("menu.receta.simularQuitar")}
                    </label>
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
