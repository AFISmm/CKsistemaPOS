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
  hayTurnoAbiertoDeUsuario,
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
  /**
   * Cierra sesion — SALVO que el usuario actual tenga un `Turno` (cajon de
   * caja) todavia abierto que el mismo abrio (ver `hayTurnoAbiertoDeUsuario`,
   * gate de "no permitir clock-out con turno abierto", revision 2026-07-22).
   * En ese caso muestra un aviso y NO limpia la sesion. Es `async` (a
   * diferencia de la version anterior) porque ese chequeo requiere una
   * llamada de red; `Sidebar.tsx` (fuera del alcance editable de esta tarea)
   * la invoca sin `await` y navega a "/login" de inmediato de todas formas —
   * eso esta CONTEMPLADO: `/login` ya redirige solo de vuelta a "/" si
   * `usuarioActual` sigue activo (ver app/login/page.tsx), asi que un
   * clock-out bloqueado simplemente rebota al usuario de regreso a la app
   * tras el aviso, en vez de dejarlo "a medio salir".
   */
  logout: () => Promise<void>;
  /**
   * Vuelve a resolver usuario+rol contra el servidor para el usuario
   * logueado actual (no cambia de sesion). Uso previsto: "Mi Perfil"
   * (app/mi-perfil/page.tsx) llama esto tras editar el propio nombre, para
   * que el saludo del Topbar (`usuarioActual.nombre`) quede sincronizado sin
   * necesitar cerrar sesion y volver a entrar. No-op si no hay sesion activa;
   * si falla (ej. sin red), se mantiene el estado actual sin lanzar.
   */
  refrescarSesion: () => Promise<void>;
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

  async function logout(): Promise<void> {
    if (usuarioActual) {
      const bloqueadoPorTurno = await hayTurnoAbiertoDeUsuario(
        usuarioActual.id,
        usuarioActual.ubicacionId
      );
      if (bloqueadoPorTurno) {
        try {
          window.alert(
            "No puedes cerrar sesion: todavia tienes un turno de caja abierto. " +
              "Corre el cierre Z (arqueo/cierre de turno) antes de salir."
          );
        } catch {
          // Sin `window.alert` disponible (SSR/tests): igual no limpiamos la
          // sesion, que es lo que realmente importa del bloqueo.
        }
        return;
      }
    }
    setUsuarioActual(null);
    try {
      window.localStorage.removeItem(CLAVE_STORAGE);
    } catch {
      // Sin localStorage: no hay nada que limpiar.
    }
  }

  async function refrescarSesion(): Promise<void> {
    if (!usuarioActual) return;
    try {
      const { usuario, rol } = await obtenerSesionActual(usuarioActual.id);
      setUsuarioActual({ ...usuario, rol });
    } catch {
      // Si falla (ej. sin red), se mantiene el estado actual: no es critico.
    }
  }

  return (
    <SesionContext.Provider value={{ usuarioActual, cargando, login, logout, refrescarSesion }}>
      {children}
    </SesionContext.Provider>
  );
}

export function useSesion(): SesionContextValue {
  const ctx = useContext(SesionContext);
  if (!ctx) throw new Error("useSesion debe usarse dentro de <SesionProvider>.");
  return ctx;
}
