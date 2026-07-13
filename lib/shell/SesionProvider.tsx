"use client";

/**
 * Sesion DEMO del shell — DUENO: shell de UI (etapa 1 de 3 de este proyecto).
 *
 * MECANISMO 100% DEMO: no hay JWT ni cookies de servidor. Solo se guarda el
 * `usuarioId` en localStorage (namespace `ck-pos:sesion`); en cada carga se
 * vuelve a resolver usuario+rol contra el servidor (GET /api/v1/auth/sesion)
 * para no confiar en datos viejos del navegador (ej. usuario dado de baja).
 * La etapa 2 de este proyecto reemplazara este flujo por TOTP + verificacion
 * facial (ver ADRs de seguridad); ese reemplazo deberia poder conservar la
 * misma forma de `useSesion()` (usuarioActual/login/logout) que consume el
 * resto del shell, cambiando solo la implementacion interna.
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Rol } from "@/lib/domain/types";
import {
  iniciarSesionPin,
  obtenerSesionActual,
  type UsuarioSinPin,
} from "@/components/shell/api";

const CLAVE_STORAGE = "ck-pos:sesion";

export interface UsuarioActual extends UsuarioSinPin {
  rol: Rol;
}

interface SesionContextValue {
  usuarioActual: UsuarioActual | null;
  /** true mientras se resuelve la sesion guardada (evita parpadeos/redirects prematuros). */
  cargando: boolean;
  login: (email: string, pin: string) => Promise<void>;
  logout: () => void;
}

const SesionContext = createContext<SesionContextValue | null>(null);

export function SesionProvider({ children }: { children: ReactNode }) {
  const [usuarioActual, setUsuarioActual] = useState<UsuarioActual | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let vivo = true;

    async function restaurar() {
      let usuarioId: string | null = null;
      try {
        usuarioId = window.localStorage.getItem(CLAVE_STORAGE);
      } catch {
        usuarioId = null;
      }

      if (!usuarioId) {
        if (vivo) setCargando(false);
        return;
      }

      try {
        const { usuario, rol } = await obtenerSesionActual(usuarioId);
        if (vivo) setUsuarioActual({ ...usuario, rol });
      } catch {
        try {
          window.localStorage.removeItem(CLAVE_STORAGE);
        } catch {
          // Sin localStorage: no hay nada que limpiar.
        }
        if (vivo) setUsuarioActual(null);
      } finally {
        if (vivo) setCargando(false);
      }
    }

    restaurar();
    return () => {
      vivo = false;
    };
  }, []);

  async function login(email: string, pin: string): Promise<void> {
    const { usuario, rol } = await iniciarSesionPin(email, pin);
    setUsuarioActual({ ...usuario, rol });
    try {
      window.localStorage.setItem(CLAVE_STORAGE, usuario.id);
    } catch {
      // Sin localStorage: la sesion sigue activa en memoria para esta pestana.
    }
  }

  function logout() {
    setUsuarioActual(null);
    try {
      window.localStorage.removeItem(CLAVE_STORAGE);
    } catch {
      // Sin localStorage: no hay nada que limpiar.
    }
  }

  return (
    <SesionContext.Provider value={{ usuarioActual, cargando, login, logout }}>
      {children}
    </SesionContext.Provider>
  );
}

export function useSesion(): SesionContextValue {
  const ctx = useContext(SesionContext);
  if (!ctx) throw new Error("useSesion debe usarse dentro de <SesionProvider>.");
  return ctx;
}
