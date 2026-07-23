/**
 * Token de sesion FIRMADO — DUENO: shell de UI (etapa 1 de 3 de este proyecto,
 * pieza de "Fase B/seguridad": reemplazar el `usuarioId` de texto plano en
 * localStorage por algo que el cliente NO pueda falsificar).
 *
 * ============================================================================
 * QUE ES REAL Y QUE SIGUE SIENDO UNA SIMPLIFICACION DE DEMO (leer con el
 * mismo cuidado que las notas de TOTP en lib/jornada/totp.ts y las de PIN en
 * lib/auth/autenticacion.ts):
 *
 * REAL a partir de este cambio:
 *  - El token es un JWT (JSON Web Token) firmado con HMAC-SHA256, usando la
 *    libreria `jose` (no HMAC hecho a mano). `jose` se eligio sobre
 *    `jsonwebtoken` porque es ESM-nativo y funciona igual en el runtime Node
 *    normal de las API routes de Next.js y en un futuro Edge Runtime, sin
 *    dependencias nativas — encaja mejor con como esta armado este proyecto
 *    (Next 14 App Router, `export const dynamic = "force-dynamic"` en las
 *    rutas) que `jsonwebtoken`, que asume Node "clasico".
 *  - El servidor SIEMPRE verifica la firma Y la expiracion antes de confiar
 *    en el `usuarioId` que el token dice llevar (`verificarTokenSesion`).
 *    Antes de este cambio, CUALQUIER string escrito en localStorage (por la
 *    consola del navegador, por ejemplo) era aceptado tal cual como
 *    `usuarioId` real — ver el comentario anterior de este archivo/
 *    SesionProvider.tsx ("MECANISMO 100% DEMO"). Eso ya NO es posible: sin la
 *    firma correcta (que requiere conocer `SESSION_TOKEN_SECRET`), el token
 *    es rechazado.
 *  - Expira a las 12 horas (`SESSION_TOKEN_TTL_SEGUNDOS`), pensado para cubrir
 *    un turno de tienda largo (apertura -> cierre Z) sin forzar un re-login a
 *    mitad de turno, pero sin dejar sesiones vivas indefinidamente si alguien
 *    se olvida un dispositivo abierto.
 *
 * TODAVIA SIMPLIFICADO (no ocultar esto — es la brecha honesta que queda):
 *  - El token vive en `localStorage` (ver lib/shell/tokenSesionCliente.ts),
 *    NO en una cookie `httpOnly`. Un XSS en el frontend podria robarlo igual
 *    que hoy roba cualquier otro dato de la pagina. La solucion real
 *    (cookie httpOnly + SameSite, fuera de alcance de esta tarea puntual)
 *    es la etapa 2 mencionada en SesionProvider.tsx (TOTP + verificacion
 *    facial + sesion de servidor real).
 *  - No hay revocacion server-side (no hay "cerrar todas mis sesiones" ni
 *    lista de tokens invalidados): un token robado sigue siendo valido hasta
 *    que expira por su cuenta (max. 12h). En produccion real esto pediria
 *    una tabla de sesiones o un "jti" con denylist.
 *  - El secreto de firma tiene un FALLBACK inseguro para no romper el deploy
 *    actual de Vercel (ver `obtenerSecreto` abajo) — ver advertencia ahi.
 * ============================================================================
 */

import { jwtVerify, SignJWT } from "jose";

import { ErrorAuth } from "./errores";

/**
 * Duracion del token: 12 horas. Se eligio ese numero porque cubre un turno de
 * tienda tipico completo (apertura de caja -> cierre Z) sin necesidad de
 * volver a loguearse a mitad de turno, que seria una friccion real para el
 * cajero/gerente en piso. Mas corto (ej. 1h) forzaria re-logins molestos
 * durante un turno normal; mucho mas largo (ej. dias) alargaria de mas la
 * ventana de exposicion de un token robado (ver nota de "sin revocacion"
 * arriba).
 */
export const SESSION_TOKEN_TTL_SEGUNDOS = 60 * 60 * 12;

const NOMBRE_ENV_SECRETO = "SESSION_TOKEN_SECRET";

/**
 * Fallback SOLO para desarrollo local / para que el deploy de Vercel
 * existente no se rompa el dia que este cambio se publica sin que alguien
 * haya configurado todavia la variable de entorno real. NUNCA usar esto a
 * proposito en produccion: cualquiera que lea este archivo (o el codigo
 * fuente publico del repo) puede firmar tokens validos para CUALQUIER
 * usuarioId si el servidor esta corriendo con este fallback.
 *
 * Por eso se emite una advertencia fuerte por consola (una sola vez por
 * proceso, ver `advertenciaEmitida`) cada vez que se usa este fallback en vez
 * del secreto real — mismo patron de honestidad que otros modulos de
 * seguridad de este repo (ver p.ej. lib/jornada/totp.ts, lib/auth/autenticacion.ts).
 */
const SECRETO_FALLBACK_DEMO = "ck-pos-demo-INSEGURO-configura-SESSION_TOKEN_SECRET-en-produccion";

let advertenciaEmitida = false;
let secretoCodificadoCache: { valor: string; encoded: Uint8Array } | null = null;

function obtenerSecreto(): Uint8Array {
  const secretoEnv = process.env[NOMBRE_ENV_SECRETO];
  const secreto = secretoEnv && secretoEnv.trim() ? secretoEnv.trim() : SECRETO_FALLBACK_DEMO;

  if (!secretoEnv || !secretoEnv.trim()) {
    if (!advertenciaEmitida) {
      advertenciaEmitida = true;
      // eslint-disable-next-line no-console
      console.warn(
        `[sesionToken] ADVERTENCIA DE SEGURIDAD: la variable de entorno ${NOMBRE_ENV_SECRETO} ` +
          "no esta configurada. Usando un secreto FALLBACK de demo (INSEGURO) para firmar " +
          "los tokens de sesion. Esto es aceptable SOLO en desarrollo local o para no romper " +
          `el deploy actual mientras se configura el secreto real. Configura ${NOMBRE_ENV_SECRETO} ` +
          "(un string aleatorio largo) en las variables de entorno del deploy antes de considerar " +
          "esto listo para produccion."
      );
    }
  }

  if (secretoCodificadoCache && secretoCodificadoCache.valor === secreto) {
    return secretoCodificadoCache.encoded;
  }
  const encoded = new TextEncoder().encode(secreto);
  secretoCodificadoCache = { valor: secreto, encoded };
  return encoded;
}

/**
 * Emite un token de sesion firmado para `usuarioId`, valido por
 * `SESSION_TOKEN_TTL_SEGUNDOS`. Se llama SOLO tras un login exitoso
 * (`iniciarSesion` en lib/auth/autenticacion.ts ya valido email+PIN).
 */
export async function emitirTokenSesion(usuarioId: string): Promise<string> {
  const secreto = obtenerSecreto();
  return new SignJWT({ usuarioId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TOKEN_TTL_SEGUNDOS}s`)
    .sign(secreto);
}

/**
 * Verifica firma Y expiracion de `token`. Devuelve el `usuarioId` que
 * contiene SOLO si el token es autentico y todavia esta vigente; en
 * cualquier otro caso (firma invalida, expirado, payload mal formado, string
 * vacio/indefinido) lanza `ErrorAuth("token_invalido", ..., 401)`.
 *
 * Esto es lo que hace que el `usuarioId` ya no se pueda falsificar: a
 * diferencia del `obtenerSesion(usuarioId)` original (que confiaba en
 * cualquier id recibido), ningun `usuarioId` sale de aca sin haber pasado por
 * la verificacion criptografica de `jwtVerify`.
 */
export async function verificarTokenSesion(token: string | null | undefined): Promise<string> {
  const tokenLimpio = (token ?? "").trim();
  if (!tokenLimpio) {
    throw new ErrorAuth("token_requerido", "Se requiere un token de sesion valido.", 401);
  }

  try {
    const secreto = obtenerSecreto();
    const { payload } = await jwtVerify(tokenLimpio, secreto);
    const usuarioId = payload.usuarioId;
    if (typeof usuarioId !== "string" || !usuarioId) {
      throw new ErrorAuth("token_invalido", "Sesion invalida. Inicia sesion de nuevo.", 401);
    }
    return usuarioId;
  } catch (e) {
    if (e instanceof ErrorAuth) throw e;
    // jose lanza sus propios errores tipados (JWTExpired, JWSSignatureVerificationFailed,
    // etc.) para firma invalida/token expirado/formato invalido: todos se
    // traducen al mismo mensaje generico (no distinguir "expirado" de
    // "invalido" al cliente evita darle pistas utiles a un atacante).
    throw new ErrorAuth("token_invalido", "Sesion invalida o expirada. Inicia sesion de nuevo.", 401);
  }
}

/** Header `Authorization: Bearer <token>` -> el token, o null si no vino. */
function extraerTokenDeHeader(request: Request): string | null {
  const header = request.headers.get("authorization") ?? request.headers.get("Authorization");
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match ? match[1].trim() : null;
}

/**
 * Helper de una sola linea para que cualquier route handler exija una sesion
 * valida: lee el header `Authorization: Bearer <token>` de `request`, lo
 * verifica (firma + expiracion) y devuelve el `usuarioId` autentico.
 *
 * Lanza `ErrorAuth` (401) si falta el header o el token no es valido —
 * los `respuestaError*` de cada dominio (lib/sales/http.ts, lib/rrhh/http.ts,
 * lib/auth/http.ts) ya saben traducir `ErrorAuth` a la respuesta HTTP
 * correspondiente.
 *
 * Uso tipico en un route handler:
 * ```ts
 * const usuarioIdVerificado = await requerirSesionValida(request);
 * ```
 */
export async function requerirSesionValida(request: Request): Promise<string> {
  const token = extraerTokenDeHeader(request);
  return verificarTokenSesion(token);
}

/**
 * Si el cliente mando un `usuarioId` en el body (compatibilidad con el
 * formato viejo) y NO coincide con el `usuarioId` verificado del token,
 * rechaza con 403 en vez de confiar en ninguno de los dos silenciosamente.
 * Si el cliente no mando `usuarioId` en el body, no hay nada que comparar:
 * el llamador debe usar `usuarioIdVerificado` de todas formas.
 */
export function asegurarUsuarioCoincide(
  usuarioIdVerificado: string,
  usuarioIdBody: string | null | undefined
): void {
  if (usuarioIdBody && usuarioIdBody !== usuarioIdVerificado) {
    throw new ErrorAuth(
      "usuario_no_coincide",
      "El usuarioId del cuerpo no coincide con la sesion autenticada.",
      403
    );
  }
}
