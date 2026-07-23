/**
 * Pruebas del bloqueo por intentos fallidos de PIN (lib/auth/bloqueoPin.ts +
 * su cableado en lib/auth/autenticacion.ts, `iniciarSesion`).
 *
 * Runner: Vitest (ver vitest.config.ts / package.json "test"), mismo patron
 * que lib/offline/__tests__ y components/pos/__tests__ (los tests nuevos de
 * este repo ya NO usan node:test, ver la nota de exclusion en vitest.config.ts).
 */

import { describe, expect, it } from "vitest";

import { getDb, resetDb } from "../../db/store";
import { bloqueadoHastaPin, registrarIntentoFallidoPin, reiniciarIntentosPin } from "../bloqueoPin";
import { ErrorAuth } from "../errores";
import { iniciarSesion } from "../autenticacion";

// Empleado + Usuario sembrados (ver lib/data/rrhh-seed.ts / lib/db/store.ts):
// ana.rodriguez@chickenkitchen.demo -> usuarioId "user-cajero-demo", PIN 1234.
const EMAIL_CAJERO = "ana.rodriguez@chickenkitchen.demo";
const PIN_CORRECTO = "1234";
const PIN_INCORRECTO = "0000";
const USUARIO_ID_CAJERO = "user-cajero-demo";

describe("iniciarSesion + bloqueo por PIN", () => {
  it("3 intentos fallidos consecutivos bloquean el login por PIN por 5 minutos", () => {
    resetDb();

    for (let i = 0; i < 3; i++) {
      expect(() => iniciarSesion(EMAIL_CAJERO, PIN_INCORRECTO)).toThrowError(
        expect.objectContaining({ codigo: "credenciales_invalidas" })
      );
    }

    // El 4to intento, AUNQUE el PIN sea el correcto, debe rechazarse por el
    // bloqueo (no por PIN incorrecto) -- es la prueba central pedida por la tarea.
    let error: unknown;
    try {
      iniciarSesion(EMAIL_CAJERO, PIN_CORRECTO);
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(ErrorAuth);
    expect((error as ErrorAuth).codigo).toBe("pin_bloqueado_temporalmente");
    expect((error as ErrorAuth).status).toBe(423);
  });

  it("un login exitoso antes de agotar los 3 intentos reinicia el contador", () => {
    resetDb();

    expect(() => iniciarSesion(EMAIL_CAJERO, PIN_INCORRECTO)).toThrow();
    expect(() => iniciarSesion(EMAIL_CAJERO, PIN_INCORRECTO)).toThrow();

    // 2 fallos, todavia no bloqueado: el PIN correcto debe funcionar.
    const { usuario } = iniciarSesion(EMAIL_CAJERO, PIN_CORRECTO);
    expect(usuario.id).toBe(USUARIO_ID_CAJERO);

    // El contador quedo en 0: otro fallo despues no deberia bloquear de inmediato.
    expect(() => iniciarSesion(EMAIL_CAJERO, PIN_INCORRECTO)).toThrowError(
      expect.objectContaining({ codigo: "credenciales_invalidas" })
    );
    expect(bloqueadoHastaPin(USUARIO_ID_CAJERO)).toBeNull();
  });

  it("un correo que no resuelve a ningun Usuario nunca activa el bloqueo", () => {
    resetDb();

    for (let i = 0; i < 5; i++) {
      expect(() => iniciarSesion("nadie@chickenkitchen.demo", PIN_INCORRECTO)).toThrowError(
        expect.objectContaining({ codigo: "credenciales_invalidas" })
      );
    }
    // Sin Usuario real detras del correo, no hay nada que bloquear ni contar.
    expect(getDb().bloqueosPin.length).toBe(0);
  });
});

describe("bloqueoPin (unidad)", () => {
  it("registrarIntentoFallidoPin activa el bloqueo solo al 3er fallo consecutivo", () => {
    resetDb();
    const usuarioId = "usuario-test-bloqueo-pin";

    expect(registrarIntentoFallidoPin(usuarioId).bloqueadoHasta).toBeNull();
    expect(registrarIntentoFallidoPin(usuarioId).bloqueadoHasta).toBeNull();
    const resultado = registrarIntentoFallidoPin(usuarioId);
    expect(resultado.bloqueadoHasta).not.toBeNull();
    expect(bloqueadoHastaPin(usuarioId)).toBe(resultado.bloqueadoHasta);
  });

  it("bloqueadoHastaPin devuelve null si el bloqueo ya vencio (expiracion por tiempo)", () => {
    resetDb();
    const usuarioId = "usuario-test-vencimiento";

    registrarIntentoFallidoPin(usuarioId);
    registrarIntentoFallidoPin(usuarioId);
    registrarIntentoFallidoPin(usuarioId);
    expect(bloqueadoHastaPin(usuarioId)).not.toBeNull();

    // Simula que ya paso el tiempo de bloqueo, manipulando directamente el
    // estado en memoria (evita depender de temporizadores reales/fake timers).
    const estado = getDb().bloqueosPin.find((b) => b.usuarioId === usuarioId)!;
    estado.bloqueadoHasta = new Date(Date.now() - 1000).toISOString();

    expect(bloqueadoHastaPin(usuarioId)).toBeNull();
  });

  it("reiniciarIntentosPin limpia el contador y levanta el bloqueo", () => {
    resetDb();
    const usuarioId = "usuario-test-reinicio";

    registrarIntentoFallidoPin(usuarioId);
    registrarIntentoFallidoPin(usuarioId);
    registrarIntentoFallidoPin(usuarioId);
    expect(bloqueadoHastaPin(usuarioId)).not.toBeNull();

    reiniciarIntentosPin(usuarioId);
    expect(bloqueadoHastaPin(usuarioId)).toBeNull();
  });
});
