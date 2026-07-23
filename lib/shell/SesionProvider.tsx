"use client";

/**
 * Sesion del shell — DUENO: shell de UI (etapa 1 de 3 de este proyecto).
 *
 * ============================================================================
 * QUE ES REAL Y QUE SIGUE SIENDO UNA SIMPLIFICACION (Fase B/seguridad,
 * revision 2026-07-22 — reemplazo del mecanismo anterior "100% DEMO"):
 *
 * REAL a partir de este cambio: lo que se guarda en localStorage (namespace
 * `ck-pos:sesion`, ver lib/shell/tokenSesionCliente.ts) ya NO es el
 * `usuarioId` en texto plano — es un TOKEN DE SESION FIRMADO (JWT, ver
 * lib/auth/sesionToken.ts) con expiracion (12h). El servidor SIEMPRE
 * verifica la firma y la expiracion de ese token (nunca solo lo decodifica y
 * confia) antes de resolver ningun `usuarioId` a partir de el — tanto al
 * restaurar la sesion en cada carga (GET /api/v1/auth/sesion) como en las
 * rutas sensibles que lo exigen (descuentos, reembolsos, cierre Z, baja de
 * empleado; ver la lista completa en lib/auth/sesionToken.ts). Antes de este
 * cambio, escribir CUALQUIER string en localStorage alcanzaba para hacerse
 * pasar por ese usuario; ahora hace falta la firma criptografica del
 * servidor, que el cliente no puede producir.
 *
 * TODAVIA UNA SIMPLIFICACION (limitacion real que queda, no ocultarla):
 *  - El token sigue viviendo en `localStorage`, no en una cookie `httpOnly`.
 *    Un XSS en el frontend podria robarlo igual que hoy roba cualquier otro
 *    dato de la pagina — la diferencia es que YA NO alcanza con inventar un
 *    string cualquiera, hace falta robar un token real y vigente.
 *  - No hay revocacion server-side de tokens individuales (sin "cerrar todas
 *    mis sesiones"): un token robado sigue siendo valido hasta que expira
 *    por su cuenta (max. 12h).
 *  - Esto sigue siendo login por PIN de 4 digitos (ver lib/auth/autenticacion.ts
 *    para el detalle de esa simplificacion, sin relacion con este cambio).
 *  - La MAYORIA de las rutas de la API (fuera de la lista puntual de arriba)
 *    todavia reciben `usuarioId` del body/query tal cual lo manda el cliente,
 *    sin verificar el token — ver el listado explicito en
 *    lib/auth/sesionToken.ts de que quedo cubierto y que no.
 *
 * La etapa 2 de este proyecto reemplazara ademas el metodo de login por TOTP
 * + verificacion facial (ver ADRs de seguridad); ese reemplazo deberia poder
 * conservar la misma forma de `useSesion()` (usuarioActual/login/logout) que
 * consume el resto del shell, cambiando solo la implementacion interna.
 * ============================================================================
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
import { CLAVE_STORAGE_SESION } from "./tokenSesionCliente";

const CLAVE_STORAGE = CLAVE_STORAGE_SESION;

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
      let token: string | null = null;
      try {
        token = window.localStorage.getItem(CLAVE_STORAGE);
      } catch {
        token = null;
      }

      if (!token) {
        if (vivo) setCargando(false);
        return;
      }

      try {
        // El servidor verifica firma + expiracion del token ANTES de resolver
        // usuario+rol (ver GET /api/v1/auth/sesion); si el token es invalido/
        // expirado, esto lanza y el catch de abajo limpia localStorage.
        const { usuario, rol } = await obtenerSesionActual(token);
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
    const { usuario, rol, token } = await iniciarSesionPin(email, pin);
    setUsuarioActual({ ...usuario, rol });
    try {
      // Se guarda el TOKEN firmado (no el usuarioId en crudo, ver el aviso de
      // cabecera de este archivo) — es lo unico que las rutas sensibles
      // (descuentos, reembolsos, cierre Z, baja de empleado) aceptaran de
      // aca en adelante para resolver la identidad del cajero/gerente.
      window.localStorage.setItem(CLAVE_STORAGE, token);
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
    let token: string | null = null;
    try {
      token = window.localStorage.getItem(CLAVE_STORAGE);
    } catch {
      token = null;
    }
    if (!token) return;
    try {
      const { usuario, rol } = await obtenerSesionActual(token);
      setUsuarioActual({ ...usuario, rol });
    } catch {
      // Si falla (ej. sin red, o el token ya expiro), se mantiene el estado
      // actual: no es critico para este refresco puntual (el proximo reload
      // de pagina de todas formas pasa por `restaurar()`, que si limpia la
      // sesion si el token ya no es valido).
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
