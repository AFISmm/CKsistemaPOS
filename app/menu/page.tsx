"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { Categoria, Producto } from "@/lib/domain/types";
import { formatearDinero } from "@/lib/domain/types";
import { useI18n } from "@/lib/shell/I18nProvider";
import { textoErrorApi } from "@/lib/i18n/erroresApi";
import { obtenerCatalogoMenu } from "@/components/menu/api";
import NuevoProductoModal from "@/components/menu/NuevoProductoModal";
import FondoFoto from "@/components/shell/FondoFoto";

/**
 * /menu — Gestion de Menu (menu-inventario-pos).
 *
 * Solo lectura para el catalogo existente (agrupado por categoria) + alta de
 * un plato nuevo. Editar/eliminar productos, combos y modificadores quedan
 * fuera de este alcance (no se pidieron en esta vuelta). Visible solo para
 * roles con el permiso "menu.gestionar" (gerente de tienda y developer, ver
 * lib/db/store.ts y lib/navigation/modulos.ts).
 */
export default function MenuPage() {
  const { t } = useI18n();
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [mostrarAlta, setMostrarAlta] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const { categorias: cats, productos: prods } = await obtenerCatalogoMenu();
      setCategorias([...cats].sort((a, b) => a.orden - b.orden));
      setProductos(prods);
    } catch (err) {
      setError(textoErrorApi(err, t, "menu.errorCarga"));
    } finally {
      setCargando(false);
    }
  }, [t]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  function agregarProductoALista(producto: Producto) {
    setProductos((prev) => [...prev, producto]);
    setMostrarAlta(false);
  }

  const productosPorCategoria = new Map<string, Producto[]>();
  for (const p of productos) {
    const lista = productosPorCategoria.get(p.categoriaId) ?? [];
    lista.push(p);
    productosPorCategoria.set(p.categoriaId, lista);
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-ck-cream p-6 dark:bg-neutral-950">
      <FondoFoto />
      <div className="relative z-10 mx-auto max-w-5xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-ck-dark dark:text-neutral-100">{t("menu.titulo")}</h1>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">{t("menu.subtitulo")}</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/" className="text-sm text-ck-red underline dark:text-red-400">
              {t("menu.inicio")}
            </Link>
            <button
              type="button"
              onClick={() => setMostrarAlta(true)}
              className="rounded-xl bg-ck-red px-4 py-2 text-sm font-bold text-white active:scale-95"
            >
              {t("menu.nuevoPlato")}
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-100 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</div>
        )}

        {cargando ? (
          <p className="text-sm text-neutral-600 dark:text-neutral-400">{t("menu.cargando")}</p>
        ) : productos.length === 0 ? (
          <div className="rounded-xl bg-white p-6 text-center text-sm text-neutral-500 shadow-sm dark:bg-neutral-900 dark:text-neutral-400">
            {t("menu.sinProductos")}
          </div>
        ) : (
          <div className="space-y-6">
            {categorias
              .filter((c) => (productosPorCategoria.get(c.id) ?? []).length > 0)
              .map((categoria) => (
                <div key={categoria.id} className="overflow-hidden rounded-xl bg-white shadow-sm dark:bg-neutral-900">
                  <div className="border-b border-neutral-100 bg-neutral-50 px-4 py-2 dark:border-neutral-800 dark:bg-neutral-800">
                    <h2 className="text-sm font-bold text-ck-dark dark:text-neutral-100">{categoria.nombre}</h2>
                  </div>
                  <table className="w-full text-left text-sm">
                    <thead className="text-neutral-700 dark:text-neutral-300">
                      <tr>
                        <th className="p-3">{t("menu.colNombre")}</th>
                        <th className="p-3">{t("menu.colDescripcion")}</th>
                        <th className="p-3">{t("menu.colPrecio")}</th>
                        <th className="p-3">{t("menu.colGravable")}</th>
                        <th className="p-3">{t("menu.colEstado")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(productosPorCategoria.get(categoria.id) ?? []).map((p) => (
                        <tr key={p.id} className="border-t border-neutral-100 text-neutral-800 dark:border-neutral-800 dark:text-neutral-200">
                          <td className="p-3 font-semibold">{p.nombre}</td>
                          <td className="p-3 text-xs text-neutral-500 dark:text-neutral-400">{p.descripcion || "—"}</td>
                          <td className="p-3">{formatearDinero(p.precioBase)}</td>
                          <td className="p-3">{p.gravable ? t("menu.si") : t("menu.no")}</td>
                          <td className="p-3">
                            {p.disponible86 ? (
                              <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-300">
                                {t("menu.estadoDisponible")}
                              </span>
                            ) : (
                              <span className="rounded-full bg-neutral-200 px-2 py-1 text-xs font-semibold text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300">
                                {t("menu.estado86")}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
          </div>
        )}
      </div>

      {mostrarAlta && (
        <NuevoProductoModal
          categorias={categorias}
          onCreado={agregarProductoALista}
          onCancelar={() => setMostrarAlta(false)}
        />
      )}
    </main>
  );
}
