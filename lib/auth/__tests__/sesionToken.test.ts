/**
 * Pruebas de lib/auth/sesionToken.ts (Fase B/seguridad — tokens de sesion
 * firmados que reemplazan el `usuarioId` en crudo de localStorage).
 *
 * Runner: Vitest (ver vitest.config.ts / package.json "test"), mismo patron
 * que lib/auth/__tests__/bloqueoPin.test.ts y lib/jornada/__tests__/totp.test.ts
 * para un mecanismo de seguridad.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ErrorAuth } from "../errores";
import {
  asegurarUsuarioCoincide,
  emitirTokenSesion,
  requerirSesionValida,
  SESSION_TOKEN_TTL_SEGUNDOS,
  verificarTokenSesion,
} from "../sesionToken";

const USUARIO_ID = "user-cajero-demo";

function requestConHeader(header: Record<string, string> = {}): Request {
  return new Request("https://ejemplo.local/api/v1/pedidos/x/descuento", {
    method: "POST",
    headers: header,
  });
}

/**
 * Corrompe la firma del JWT de forma que SIEMPRE cambien los bytes decodificados.
 *
 * Nota: alterar el ULTIMO caracter del token (ultimo char base64url de la firma
 * HS256 de 32 bytes) no sirve como tamper confiable: ese grupo final codifica
 * solo 2 bytes en 3 caracteres, y los 2 bits menos significativos del ultimo
 * caracter son padding que se descarta al decodificar. Alternar 'a'<->'b' ahi
 * solo cambia ese bit de padding en algunas firmas (segun el ultimo byte real),
 * por lo que a veces el token "tamperizado" decodifica a los mismos bytes de
 * firma y verifica como valido — una falla de test intermitente, no una falla
 * de seguridad real. En vez de eso, mutamos un byte real dentro de la firma.
 */
function tamperizarFirma(token: string): string {
  const [header, payload, firma] = token.split(".");
  const bytes = Buffer.from(firma, "base64url");
  bytes[0] = bytes[0] ^ 0xff;
  const firmaTamperizada = bytes.toString("base64url");
  return `${header}.${payload}.${firmaTamperizada}`;
}

describe("emitirTokenSesion / verificarTokenSesion", () => {
  it("un token recien emitido verifica OK y devuelve el mismo usuarioId", async () => {
    const token = await emitirTokenSesion(USUARIO_ID);
    expect(typeof token).toBe("string");
    expect(token.split(".").length).toBe(3); // header.payload.firma (formato JWT)

    const usuarioId = await verificarTokenSesion(token);
    expect(usuarioId).toBe(USUARIO_ID);
  });

  it("SESSION_TOKEN_TTL_SEGUNDOS es 12 horas (duracion de turno tipica documentada)", () => {
    expect(SESSION_TOKEN_TTL_SEGUNDOS).toBe(12 * 60 * 60);
  });

  it("rechaza un token vacio/ausente con token_requerido (401)", async () => {
    await expect(verificarTokenSesion(null)).rejects.toMatchObject({
      codigo: "token_requerido",
      status: 401,
    });
    await expect(verificarTokenSesion("")).rejects.toMatchObject({
      codigo: "token_requerido",
      status: 401,
    });
  });

  it("rechaza un token con la firma alterada (tamperizado) con token_invalido (401)", async () => {
    const token = await emitirTokenSesion(USUARIO_ID);
    const tamperizado = tamperizarFirma(token);

    const error = await verificarTokenSesion(tamperizado).catch((e) => e);
    expect(error).toBeInstanceOf(ErrorAuth);
    expect((error as ErrorAuth).codigo).toBe("token_invalido");
    expect((error as ErrorAuth).status).toBe(401);
  });

  it("rechaza un token con payload manipulado (usuarioId distinto) sin resfirmar", async () => {
    const token = await emitirTokenSesion(USUARIO_ID);
    const [header, payload, firma] = token.split(".");
    const payloadDecodificado = JSON.parse(Buffer.from(payload, "base64url").toString("utf-8"));
    const payloadFalsificado = Buffer.from(
      JSON.stringify({ ...payloadDecodificado, usuarioId: "user-gerente-demo" }),
      "utf-8"
    ).toString("base64url");
    const tokenFalsificado = `${header}.${payloadFalsificado}.${firma}`;

    await expect(verificarTokenSesion(tokenFalsificado)).rejects.toMatchObject({
      codigo: "token_invalido",
      status: 401,
    });
  });

  it("rechaza un string cualquiera que no sea un JWT valido (equivalente al usuarioId plano de antes)", async () => {
    await expect(verificarTokenSesion(USUARIO_ID)).rejects.toMatchObject({
      codigo: "token_invalido",
      status: 401,
    });
  });

  describe("expiracion", () => {
    beforeEach(() => {
      vi.useFakeTimers({ shouldAdvanceTime: false });
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it("un token todavia dentro de las 12h sigue siendo valido", async () => {
      const ahora = Date.UTC(2026, 6, 22, 9, 0, 0);
      vi.setSystemTime(ahora);
      const token = await emitirTokenSesion(USUARIO_ID);

      vi.setSystemTime(ahora + (SESSION_TOKEN_TTL_SEGUNDOS - 60) * 1000); // 1 min antes de expirar
      await expect(verificarTokenSesion(token)).resolves.toBe(USUARIO_ID);
    });

    it("un token expira pasadas las 12h y se rechaza con token_invalido (401)", async () => {
      const ahora = Date.UTC(2026, 6, 22, 9, 0, 0);
      vi.setSystemTime(ahora);
      const token = await emitirTokenSesion(USUARIO_ID);

      vi.setSystemTime(ahora + (SESSION_TOKEN_TTL_SEGUNDOS + 60) * 1000); // 1 min despues de expirar
      await expect(verificarTokenSesion(token)).rejects.toMatchObject({
        codigo: "token_invalido",
        status: 401,
      });
    });
  });
});

describe("requerirSesionValida (helper de una linea para route handlers)", () => {
  it("con un token valido en 'Authorization: Bearer <token>', devuelve el usuarioId", async () => {
    const token = await emitirTokenSesion(USUARIO_ID);
    const usuarioId = await requerirSesionValida(requestConHeader({ Authorization: `Bearer ${token}` }));
    expect(usuarioId).toBe(USUARIO_ID);
  });

  it("sin header Authorization, rechaza con token_requerido (401)", async () => {
    await expect(requerirSesionValida(requestConHeader())).rejects.toMatchObject({
      codigo: "token_requerido",
      status: 401,
    });
  });

  it("con un header mal formado (sin prefijo 'Bearer '), rechaza con token_requerido (401)", async () => {
    const token = await emitirTokenSesion(USUARIO_ID);
    await expect(
      requerirSesionValida(requestConHeader({ Authorization: token }))
    ).rejects.toMatchObject({ codigo: "token_requerido", status: 401 });
  });

  it("con un token tamperizado en el header, rechaza con token_invalido (401) aunque el body diga otra cosa", async () => {
    const token = await emitirTokenSesion(USUARIO_ID);
    const tamperizado = tamperizarFirma(token);
    await expect(
      requerirSesionValida(requestConHeader({ Authorization: `Bearer ${tamperizado}` }))
    ).rejects.toMatchObject({ codigo: "token_invalido", status: 401 });
  });
});

describe("asegurarUsuarioCoincide", () => {
  it("no lanza si el body no manda usuarioId (undefined/null)", () => {
    expect(() => asegurarUsuarioCoincide(USUARIO_ID, undefined)).not.toThrow();
    expect(() => asegurarUsuarioCoincide(USUARIO_ID, null)).not.toThrow();
  });

  it("no lanza si el usuarioId del body coincide con el verificado", () => {
    expect(() => asegurarUsuarioCoincide(USUARIO_ID, USUARIO_ID)).not.toThrow();
  });

  it("lanza ErrorAuth 403 si el usuarioId del body NO coincide con el verificado (suplantacion)", () => {
    let error: unknown;
    try {
      asegurarUsuarioCoincide(USUARIO_ID, "user-gerente-demo");
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(ErrorAuth);
    expect((error as ErrorAuth).codigo).toBe("usuario_no_coincide");
    expect((error as ErrorAuth).status).toBe(403);
  });
});

describe("fallback del secreto (SESSION_TOKEN_SECRET sin configurar)", () => {
  it("advierte por consola UNA sola vez por proceso cuando usa el secreto fallback de demo", async () => {
    vi.resetModules();
    const advertirSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const fresco = await import("../sesionToken");
      await fresco.emitirTokenSesion(USUARIO_ID);
      await fresco.emitirTokenSesion(USUARIO_ID);
      const llamadasDeAdvertencia = advertirSpy.mock.calls.filter((args) =>
        String(args[0]).includes("SESSION_TOKEN_SECRET")
      );
      expect(llamadasDeAdvertencia.length).toBe(1);
    } finally {
      advertirSpy.mockRestore();
      vi.resetModules();
    }
  });
});
