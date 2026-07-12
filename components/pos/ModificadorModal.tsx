"use client";

import { useMemo, useState } from "react";
import type { GrupoModificador, Modificador, Producto } from "@/lib/domain/types";
import { formatearDinero } from "@/lib/domain/types";
import { useI18n } from "@/lib/shell/I18nProvider";

interface Props {
  producto: Producto;
  grupos: GrupoModificador[];
  modificadores: Modificador[];
  enviando: boolean;
  onConfirmar: (datos: { modificadorIds: string[]; cantidad: number; notas: string }) => void;
  onCancelar: () => void;
}

/**
 * Modal de seleccion de modificadores (salsas/extras) respetando min/max por
 * grupo. Botones grandes, un toque por opcion. El precio mostrado aqui es solo
 * un ESTIMADO para el cajero/cliente: el precio real (snapshot) siempre lo
 * calcula el backend y se refleja en el ticket tras la respuesta del API.
 */
export default function ModificadorModal({
  producto,
  grupos,
  modificadores,
  enviando,
  onConfirmar,
  onCancelar,
}: Props) {
  const { t } = useI18n();
  const gruposOrdenados = useMemo(
    () => [...grupos].sort((a, b) => (a.obligatorio === b.obligatorio ? 0 : a.obligatorio ? -1 : 1)),
    [grupos]
  );

  const [seleccion, setSeleccion] = useState<Record<string, string[]>>(() => {
    const inicial: Record<string, string[]> = {};
    for (const g of gruposOrdenados) inicial[g.id] = [];
    return inicial;
  });
  const [cantidad, setCantidad] = useState(1);
  const [notas, setNotas] = useState("");

  function modificadoresDeGrupo(grupoId: string): Modificador[] {
    return modificadores.filter((m) => m.grupoModificadorId === grupoId);
  }

  function alternarSeleccion(grupo: GrupoModificador, modificadorId: string) {
    setSeleccion((prev) => {
      const actual = prev[grupo.id] ?? [];
      const yaElegido = actual.includes(modificadorId);
      let nuevo: string[];
      if (yaElegido) {
        nuevo = actual.filter((id) => id !== modificadorId);
      } else if (grupo.maxSelecciones <= 1) {
        // Seleccion unica: reemplaza cualquier eleccion previa del grupo.
        nuevo = [modificadorId];
      } else if (actual.length >= grupo.maxSelecciones) {
        // Ya se alcanzo el maximo: ignora el toque (evita error del cajero).
        return prev;
      } else {
        nuevo = [...actual, modificadorId];
      }
      return { ...prev, [grupo.id]: nuevo };
    });
  }

  const gruposInvalidos = gruposOrdenados.filter((g) => {
    const cuenta = seleccion[g.id]?.length ?? 0;
    return cuenta < g.minSelecciones || cuenta > g.maxSelecciones;
  });
  const formularioValido = gruposInvalidos.length === 0;

  const precioEstimadoUnitario =
    producto.precioBase +
    Object.values(seleccion)
      .flat()
      .reduce((acc, modId) => {
        const mod = modificadores.find((m) => m.id === modId);
        return acc + (mod?.precioDelta ?? 0);
      }, 0);

  function confirmar() {
    if (!formularioValido || enviando) return;
    onConfirmar({
      modificadorIds: Object.values(seleccion).flat(),
      cantidad,
      notas: notas.trim(),
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-t-2xl bg-white shadow-xl sm:rounded-2xl">
        <div className="flex items-start justify-between border-b border-neutral-200 p-4">
          <div>
            <h2 className="text-lg font-bold text-ck-dark">{producto.nombre}</h2>
            <p className="text-sm text-neutral-500">{producto.descripcion}</p>
          </div>
          <button
            type="button"
            onClick={onCancelar}
            className="rounded-full p-2 text-2xl leading-none text-neutral-400 hover:bg-neutral-100"
            aria-label={t("pos.modificador.cerrar")}
          >
            &times;
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {gruposOrdenados.map((grupo) => {
            const opciones = modificadoresDeGrupo(grupo.id);
            const cuenta = seleccion[grupo.id]?.length ?? 0;
            const invalido = cuenta < grupo.minSelecciones || cuenta > grupo.maxSelecciones;
            return (
              <div key={grupo.id} className="mb-5">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-bold uppercase tracking-wide text-ck-dark">
                    {grupo.nombre}
                    {grupo.obligatorio && <span className="ml-1 text-ck-red">*</span>}
                  </h3>
                  <span
                    className={`text-xs font-medium ${invalido ? "text-ck-red" : "text-neutral-500"}`}
                  >
                    {grupo.minSelecciones === grupo.maxSelecciones
                      ? t("pos.modificador.elige", { min: grupo.minSelecciones })
                      : t("pos.modificador.eligeRango", {
                          min: grupo.minSelecciones,
                          max: grupo.maxSelecciones,
                        })}
                    {" · "}
                    {cuenta}/{grupo.maxSelecciones}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {opciones.map((mod) => {
                    const elegido = seleccion[grupo.id]?.includes(mod.id) ?? false;
                    const agotado = mod.disponible86 === false;
                    return (
                      <button
                        key={mod.id}
                        type="button"
                        disabled={agotado}
                        onClick={() => alternarSeleccion(grupo, mod.id)}
                        className={`min-h-[52px] rounded-lg border px-3 py-2 text-sm font-medium transition active:scale-95 ${
                          agotado
                            ? "cursor-not-allowed border-neutral-200 bg-neutral-100 text-neutral-400 line-through"
                            : elegido
                            ? "border-ck-red bg-ck-red text-white"
                            : "border-neutral-200 bg-white text-ck-dark hover:border-ck-red"
                        }`}
                      >
                        {mod.nombre}
                        {mod.precioDelta !== 0 && (
                          <span className="block text-xs opacity-80">
                            {mod.precioDelta > 0 ? "+" : ""}
                            {formatearDinero(mod.precioDelta)}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          <div className="mb-4">
            <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-ck-dark">
              {t("pos.modificador.cantidad")}
            </h3>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setCantidad((c) => Math.max(1, c - 1))}
                className="h-11 w-11 rounded-full bg-neutral-200 text-xl font-bold text-ck-dark active:scale-95"
                aria-label={t("pos.modificador.restarCantidad")}
              >
                -
              </button>
              <span className="w-8 text-center text-lg font-bold">{cantidad}</span>
              <button
                type="button"
                onClick={() => setCantidad((c) => Math.min(20, c + 1))}
                className="h-11 w-11 rounded-full bg-neutral-200 text-xl font-bold text-ck-dark active:scale-95"
                aria-label={t("pos.modificador.sumarCantidad")}
              >
                +
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-bold uppercase tracking-wide text-ck-dark">
              {t("pos.modificador.notaOpcional")}
            </label>
            <input
              type="text"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder={t("pos.modificador.notaPlaceholder")}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              maxLength={140}
            />
          </div>
        </div>

        <div className="border-t border-neutral-200 p-4">
          <div className="mb-3 flex items-center justify-between text-sm text-neutral-500">
            <span>{t("pos.modificador.precioEstimado")}</span>
            <span className="font-semibold text-ck-dark">
              {formatearDinero(precioEstimadoUnitario * cantidad)}
            </span>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancelar}
              className="flex-1 rounded-xl border border-neutral-300 py-3 text-base font-semibold text-neutral-600 active:scale-95"
            >
              {t("pos.modificador.cancelar")}
            </button>
            <button
              type="button"
              disabled={!formularioValido || enviando}
              onClick={confirmar}
              className={`flex-1 rounded-xl py-3 text-base font-bold text-white active:scale-95 ${
                !formularioValido || enviando
                  ? "cursor-not-allowed bg-neutral-300"
                  : "bg-ck-red hover:bg-red-700"
              }`}
            >
              {enviando ? t("pos.modificador.agregando") : t("pos.modificador.agregarAlPedido")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
