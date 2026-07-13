"use client";

/**
 * Barra superior del shell: hamburguesa (< lg, abre el sidebar izquierdo),
 * saludo del usuario, selector de idioma, toggle de tema y campana de
 * notificaciones (abre el panel DERECHO).
 *
 * El boton de logout ("Cerrar sesion") vivia aqui antes; se movio al bloque
 * inferior del sidebar izquierdo (ver components/shell/Sidebar.tsx,
 * `manejarLogout`) a pedido de producto, junto al nuevo boton "Gestionar
 * perfiles". El saludo al usuario SIGUE aqui.
 */

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Notificacion } from "@/lib/domain/types";
import { useSesion } from "@/lib/shell/SesionProvider";
import { useI18n } from "@/lib/shell/I18nProvider";
import {
  ErrorApi,
  listarNotificaciones,
  marcarNotificacionLeida,
} from "./api";
import SelectorIdioma from "./SelectorIdioma";
import ToggleTema from "./ToggleTema";
import NotificacionesPanel from "./NotificacionesPanel";

interface TopbarProps {
  onAbrirSidebar: () => void;
}

export default function Topbar({ onAbrirSidebar }: TopbarProps) {
  const { usuarioActual } = useSesion();
  const { t } = useI18n();
  const router = useRouter();

  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [panelAbierto, setPanelAbierto] = useState(false);

  const cargarNotificaciones = useCallback(async () => {
    try {
      const lista = await listarNotificaciones();
      setNotificaciones(lista);
    } catch {
      // Silencioso: si falla el fetch, la campana simplemente no se actualiza.
    }
  }, []);

  useEffect(() => {
    cargarNotificaciones();
  }, [cargarNotificaciones]);

  const noLeidas = notificaciones.filter((n) => !n.leida).length;

  async function manejarClicNotificacion(n: Notificacion) {
    setPanelAbierto(false);
    if (!n.leida) {
      // Optimista: refleja "leida" de inmediato, revierte si falla el backend.
      setNotificaciones((prev) => prev.map((x) => (x.id === n.id ? { ...x, leida: true } : x)));
      try {
        await marcarNotificacionLeida(n.id);
      } catch (e) {
        if (e instanceof ErrorApi) {
          setNotificaciones((prev) => prev.map((x) => (x.id === n.id ? { ...x, leida: false } : x)));
        }
      }
    }
    if (n.entidadRelacionadaHref) router.push(n.entidadRelacionadaHref);
  }

  return (
    <header className="sticky top-0 z-20 flex min-h-[56px] items-center justify-between gap-2 border-b border-neutral-200 bg-white px-2 dark:border-neutral-800 dark:bg-neutral-900 sm:px-4">
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          onClick={onAbrirSidebar}
          aria-label={t("sidebar.abrirMenu")}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-neutral-600 hover:bg-ck-cream dark:text-neutral-300 dark:hover:bg-neutral-800 lg:hidden"
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
            <path
              d="M4 6h16M4 12h16M4 18h16"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </button>

        {usuarioActual && (
          <span className="truncate text-sm font-semibold text-neutral-600 dark:text-neutral-300">
            {t("topbar.usuarioSaludo", { nombre: usuarioActual.nombre })}
          </span>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <SelectorIdioma />
        <ToggleTema />

        <div className="relative">
          <button
            type="button"
            onClick={() => setPanelAbierto((v) => !v)}
            aria-label={t("topbar.notificaciones")}
            className="relative grid h-11 w-11 place-items-center rounded-lg text-neutral-600 hover:bg-ck-cream dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
              <path
                d="M18 16v-5a6 6 0 1 0-12 0v5l-1.5 2.5h15L18 16Z"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinejoin="round"
              />
              <path
                d="M9.5 21a2.5 2.5 0 0 0 5 0"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
              />
            </svg>
            {noLeidas > 0 && (
              <span className="absolute right-1 top-1 grid h-4 min-w-[16px] place-items-center rounded-full bg-ck-red px-1 text-[10px] font-bold text-white">
                {noLeidas > 9 ? "9+" : noLeidas}
              </span>
            )}
          </button>

          <NotificacionesPanel
            abierto={panelAbierto}
            notificaciones={notificaciones}
            onCerrar={() => setPanelAbierto(false)}
            onClicNotificacion={manejarClicNotificacion}
          />
        </div>
      </div>
    </header>
  );
}
