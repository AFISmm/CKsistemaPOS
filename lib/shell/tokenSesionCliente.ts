/**
 * Utilidad 100% CLIENTE para el token de sesion — DUENO: shell de UI.
 *
 * Unico lugar donde vive la clave de `localStorage` donde se guarda el TOKEN
 * DE SESION firmado (ver lib/auth/sesionToken.ts para la emision/verificacion
 * server-side de ese token). Se separa de `SesionProvider.tsx` para que los
 * modulos `api.ts` de cada feature (components/pos/api.ts,
 * components/empleados/api.ts, etc.) puedan adjuntar el header
 * `Authorization` sin importar React ni el contexto de sesion completo — y
 * sin romper la "regla dura" de esos modulos de "nunca importar lib/db,
 * lib/auth ni lib/notificaciones" (este archivo no es ninguno de esos: solo
 * lee/escribe una clave de `localStorage`, cero dependencias de servidor).
 *
 * IMPORTANTE (honestidad sobre lo que sigue siendo una simplificacion, ver
 * tambien la nota completa en lib/auth/sesionToken.ts): esto sigue siendo
 * `localStorage` plano, NO una cookie `httpOnly`. Un XSS en el frontend
 * podria robar este token igual que hoy roba cualquier otro dato del
 * navegador. Lo que SI cambio es que el valor guardado ahora es un JWT
 * firmado con expiracion (12h) — ya no alcanza con escribir cualquier string
 * en localStorage para hacerse pasar por otro usuario, como si se podia
 * antes de este cambio (ver el comentario historico "MECANISMO 100% DEMO" al
 * inicio de SesionProvider.tsx).
 */

export const CLAVE_STORAGE_SESION = "ck-pos:sesion";

/** Lee el token de sesion guardado, o null si no hay sesion / no hay localStorage (SSR). */
export function obtenerTokenSesionGuardado(): string | null {
  try {
    return window.localStorage.getItem(CLAVE_STORAGE_SESION);
  } catch {
    return null;
  }
}

/**
 * Header `Authorization` listo para adjuntar a un `fetch` a una ruta que
 * exija sesion valida (ver `requerirSesionValida` en lib/auth/sesionToken.ts).
 * Devuelve `{}` (ningun header) si no hay token guardado — la ruta rechazara
 * la request con 401, que es el comportamiento correcto sin sesion.
 */
export function headerAutorizacionSesion(): Record<string, string> {
  const token = obtenerTokenSesionGuardado();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
