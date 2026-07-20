/**
 * Unit test de VerificadorRed (F3-T2) SIN red real: este sandbox no
 * garantiza acceso a internet (mismo criterio que el resto de la suite
 * unit), asi que solo se cubre el camino que falla ANTES de abrir cualquier
 * socket (URL invalida) — confirma el contrato "verificar() nunca lanza".
 * El comportamiento real de red (HEAD/GET contra hosts reales) se mockea por
 * completo en test/unit/conectividad-service.spec.ts, que es donde se
 * ejercita la logica de negocio que consume este resultado.
 */
import { VerificadorRed } from "../../src/conectividad/verificador-red";

describe("VerificadorRed.verificar (sin red real)", () => {
  it("resuelve false (no alcanzable) para una URL invalida, sin lanzar", async () => {
    const verificador = new VerificadorRed();
    await expect(verificador.verificar("no-es-una-url", 1000)).resolves.toBe(false);
  });

  it("resuelve false (no lanza) para una URL invalida tanto en el intento HEAD como en el fallback GET", async () => {
    // "definitivamente-no-es-una-url-valida" no tiene esquema -> new URL()
    // lanza ANTES de intentar abrir cualquier socket, para las DOS llamadas a
    // intentar() (HEAD y el fallback GET) — cubre que ninguna de las dos
    // rutas internas se cuelgue o propague la excepcion de parseo.
    const verificador = new VerificadorRed();
    await expect(verificador.verificar("definitivamente-no-es-una-url-valida", 500)).resolves.toBe(false);
  });
});
