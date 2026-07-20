"use client";

/**
 * Hook compartido de estado offline para las pantallas del terminal de
 * cajero (app/pos/page.tsx, app/pos/nuevo/page.tsx) — F1-T3
 * (DUENO: frontend-mostrador-kiosco-pos).
 *
 * Centraliza lo que antes cada pagina repetia a mano (deteccion de
 * navigator.onLine + listeners online/offline) y agrega lo nuevo de esta
 * tarea: arranca el drenado automatico de la cola (lib/offline/autoDrenado.ts)
 * y expone `pendientes` (numero de escrituras en `colaEscritura`) para el
 * indicador sutil "sin conexion, N pendientes de sincronizar".
 *
 * `sinConexion` sigue siendo solo una senal informativa basada en
 * navigator.onLine (no 100% confiable, ver autoDrenado.ts); `pendientes` es
 * la senal fuerte real: si es > 0, hay escrituras del cajero que todavia no
 * se confirmaron contra el servidor, sin importar lo que diga navigator.onLine.
 */

import { useEffect, useState } from "react";
import { iniciarAutoDrenado } from "./autoDrenado";
import { alCambiarPendientes, contarPendientes } from "./queue";
import { registrarServiceWorker } from "./registrarServiceWorker";

export interface EstadoSync {
  sinConexion: boolean;
  pendientes: number;
}

export function useEstadoSync(): EstadoSync {
  const [sinConexion, setSinConexion] = useState(false);
  const [pendientes, setPendientes] = useState(0);

  useEffect(() => {
    if (typeof navigator !== "undefined") setSinConexion(!navigator.onLine);
    const marcarOnline = () => setSinConexion(false);
    const marcarOffline = () => setSinConexion(true);
    window.addEventListener("online", marcarOnline);
    window.addEventListener("offline", marcarOffline);

    registrarServiceWorker();
    iniciarAutoDrenado();
    contarPendientes()
      .then(setPendientes)
      .catch(() => {});
    const cancelarSuscripcion = alCambiarPendientes(setPendientes);

    return () => {
      window.removeEventListener("online", marcarOnline);
      window.removeEventListener("offline", marcarOffline);
      cancelarSuscripcion();
    };
  }, []);

  return { sinConexion, pendientes };
}
