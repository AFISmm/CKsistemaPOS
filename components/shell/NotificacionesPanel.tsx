"use client";

/**
 * Panel LATERAL DERECHO de notificaciones (distinto del sidebar de
 * navegacion, que es izquierdo). Presentacional: el estado (lista, abierto/
 * cerrado, fetch, marcar-leida) vive en components/shell/Topbar.tsx, que es
 * quien renderiza este panel.
 */

import { useEffect, useRef } from "react";
import type { Notificacion } from "@/lib/domain/types";
import { useI18n } from "@/lib/shell/I18nProvider";

interface NotificacionesPanelProps {
  abierto: boolean;
  notificaciones: Notificacion[];
  onCerrar: () => void;
  onClicNotificacion: (notificacion: Notificacion) => void;
}

export default function NotificacionesPanel({
  abierto,
  notificaciones,
  onCerrar,
  onClicNotificacion,
}: NotificacionesPanelProps) {
  const { t } = useI18n();
  const panelRef = useRef<HTMLDivElement>(null);

  // Cerrar al hacer click fuera del panel.
  useEffect(() => {
    if (!abierto) return;
    function manejarClicFuera(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onCerrar();
      }
    }
    document.addEventListener("mousedown", manejarClicFuera);
    return () => document.removeEventListener("mousedown", manejarClicFuera);
  }, [abierto, onCerrar]);

  if (!abierto) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-30 bg-black/20"
        onClick={onCerrar}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-label={t("notificaciones.titulo")}
        className="fixed inset-y-0 right-0 z-40 flex w-full max-w-sm flex-col border-l border-neutral-200 bg-white shadow-xl dark:border-neutral-800 dark:bg-neutral-900"
      >
        <div className="flex min-h-[56px] items-center justify-between border-b border-neutral-200 px-4 dark:border-neutral-800">
          <h2 className="text-sm font-bold text-ck-dark dark:text-neutral-100">
            {t("notificaciones.titulo")}
          </h2>
          <button
            type="button"
            onClick={onCerrar}
            aria-label={t("notificaciones.cerrar")}
            className="grid h-11 w-11 place-items-center rounded-lg text-lg text-neutral-500 hover:bg-ck-cream dark:text-neutral-400 dark:hover:bg-neutral-800"
          >
            &times;
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {notificaciones.length === 0 ? (
            <p className="p-4 text-sm text-neutral-500 dark:text-neutral-400">
              {t("notificaciones.vacio")}
            </p>
          ) : (
            <ul>
              {notificaciones.map((n) => (
                <li key={n.id} className="border-b border-neutral-100 dark:border-neutral-800">
                  <button
                    type="button"
                    onClick={() => onClicNotificacion(n)}
                    className={`flex min-h-[44px] w-full flex-col gap-1 px-4 py-3 text-left transition hover:bg-ck-cream dark:hover:bg-neutral-800 ${
                      n.leida ? "opacity-60" : ""
                    }`}
                  >
                    <span className="flex items-center gap-2 text-sm font-semibold text-ck-dark dark:text-neutral-100">
                      {!n.leida && (
                        <span
                          className="h-2 w-2 shrink-0 rounded-full bg-ck-red"
                          aria-hidden="true"
                        />
                      )}
                      {n.titulo}
                    </span>
                    <span className="text-xs text-neutral-500 dark:text-neutral-400">
                      {n.mensaje}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
