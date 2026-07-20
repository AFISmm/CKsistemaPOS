/**
 * Unit tests PUROS (sin red, sin Prisma, sin timers) de la maquina de estado
 * de conectividad (F3-T2): src/conectividad/estado-conectividad.ts.
 * Cubre exactamente lo pedido por la tarea:
 *  - Transiciones en_linea -> degradado -> sin_conexion -> en_linea.
 *  - Umbral N-de-M (minFallosParaDegradado).
 *  - Debounce/anti-flapping (confirmacionesRequeridas): un blip aislado no
 *    dispara una transicion.
 */
import {
  calcularEstadoDesdeResultados,
  MaquinaEstadoConectividad,
} from "../../src/conectividad/estado-conectividad";

describe("calcularEstadoDesdeResultados (clasificacion N-de-M pura, sin debounce)", () => {
  it("en_linea si ningun host configurado falla", () => {
    expect(calcularEstadoDesdeResultados([true, true, true])).toBe("en_linea");
  });

  it("sin_conexion si TODOS los hosts fallan, sin importar cuantos sean", () => {
    expect(calcularEstadoDesdeResultados([false])).toBe("sin_conexion");
    expect(calcularEstadoDesdeResultados([false, false, false])).toBe("sin_conexion");
  });

  it("degradado si fallan >= minFallosParaDegradado pero no todos", () => {
    expect(calcularEstadoDesdeResultados([false, true, true], 1)).toBe("degradado");
    expect(calcularEstadoDesdeResultados([false, false, true], 2)).toBe("degradado");
  });

  it("en_linea si fallan menos que el umbral configurado (un blip no basta con umbral > 1)", () => {
    expect(calcularEstadoDesdeResultados([false, true, true], 2)).toBe("en_linea");
  });

  it("lista vacia (sin hosts configurados) es en_linea por diseno (sin datos no se afirma una caida)", () => {
    expect(calcularEstadoDesdeResultados([])).toBe("en_linea");
  });

  it("un umbral <= 0 se trata como 1 (nunca permite degradar con 0 fallos exigidos)", () => {
    expect(calcularEstadoDesdeResultados([false, true, true], 0)).toBe("degradado");
    expect(calcularEstadoDesdeResultados([true, true], 0)).toBe("en_linea");
  });
});

describe("MaquinaEstadoConectividad — transiciones con debounce (confirmacionesRequeridas)", () => {
  it("transiciona en_linea -> degradado -> sin_conexion -> en_linea cuando cada estado se confirma N veces seguidas", () => {
    const ahora = new Date("2026-07-18T14:00:00Z");
    const maquina = new MaquinaEstadoConectividad({ confirmacionesRequeridas: 2 }, "en_linea", ahora);

    // Ciclo 1: un host falla (degradado observado) -> primera confirmacion, TODAVIA no transiciona.
    let t = new Date(ahora.getTime() + 15_000);
    expect(maquina.evaluar([false, true, true], t)).toBeNull();
    expect(maquina.estado).toBe("en_linea");

    // Ciclo 2: mismo resultado -> segunda confirmacion consecutiva -> transiciona.
    t = new Date(ahora.getTime() + 30_000);
    const t1 = maquina.evaluar([false, true, true], t);
    expect(t1).toEqual({
      estadoAnterior: "en_linea",
      estadoNuevo: "degradado",
      desde: ahora,
      hasta: t,
      duracionMs: 30_000,
    });
    expect(maquina.estado).toBe("degradado");
    expect(maquina.desde).toEqual(t);

    // Ciclo 3: TODOS fallan (sin_conexion observado) -> primera confirmacion.
    let t2 = new Date(t.getTime() + 15_000);
    expect(maquina.evaluar([false, false, false], t2)).toBeNull();
    expect(maquina.estado).toBe("degradado");

    // Ciclo 4: TODOS fallan de nuevo -> segunda confirmacion -> transiciona a sin_conexion.
    t2 = new Date(t.getTime() + 30_000);
    const t2Confirmado = maquina.evaluar([false, false, false], t2);
    expect(t2Confirmado?.estadoAnterior).toBe("degradado");
    expect(t2Confirmado?.estadoNuevo).toBe("sin_conexion");
    expect(maquina.estado).toBe("sin_conexion");

    // Ciclo 5-6: todos vuelven a responder -> dos confirmaciones -> vuelve a en_linea.
    let t3 = new Date(t2.getTime() + 15_000);
    expect(maquina.evaluar([true, true, true], t3)).toBeNull();
    expect(maquina.estado).toBe("sin_conexion");

    t3 = new Date(t2.getTime() + 30_000);
    const t3Confirmado = maquina.evaluar([true, true, true], t3);
    expect(t3Confirmado?.estadoAnterior).toBe("sin_conexion");
    expect(t3Confirmado?.estadoNuevo).toBe("en_linea");
    expect(maquina.estado).toBe("en_linea");
  });

  it("un UNICO blip aislado (rodeado de ciclos buenos) NUNCA transiciona (anti-flapping)", () => {
    const ahora = new Date("2026-07-18T14:00:00Z");
    const maquina = new MaquinaEstadoConectividad({ confirmacionesRequeridas: 2 }, "en_linea", ahora);

    expect(maquina.evaluar([true, true, true], new Date(ahora.getTime() + 10_000))).toBeNull();
    // Ciclo aislado malo: cuenta como primera confirmacion de "sin_conexion" candidato.
    expect(maquina.evaluar([false, false, false], new Date(ahora.getTime() + 20_000))).toBeNull();
    expect(maquina.estado).toBe("en_linea");
    // Vuelve a estar bien INMEDIATAMENTE: el candidato se descarta (nunca llego a 2 seguidas).
    expect(maquina.evaluar([true, true, true], new Date(ahora.getTime() + 30_000))).toBeNull();
    expect(maquina.estado).toBe("en_linea");

    // Confirmarlo ahora requeriria volver a empezar el conteo desde cero.
    expect(maquina.evaluar([false, false, false], new Date(ahora.getTime() + 40_000))).toBeNull();
    expect(maquina.estado).toBe("en_linea");
    const confirmado = maquina.evaluar([false, false, false], new Date(ahora.getTime() + 50_000));
    expect(confirmado?.estadoNuevo).toBe("sin_conexion");
  });

  it("con confirmacionesRequeridas=1 (debounce deshabilitado), transiciona en el primer ciclo observado", () => {
    const ahora = new Date("2026-07-18T14:00:00Z");
    const maquina = new MaquinaEstadoConectividad({ confirmacionesRequeridas: 1 }, "en_linea", ahora);

    const transicion = maquina.evaluar([false, false, false], new Date(ahora.getTime() + 5_000));
    expect(transicion?.estadoNuevo).toBe("sin_conexion");
  });

  it("un candidato que cambia de tipo entre ciclos reinicia el conteo de confirmaciones", () => {
    const ahora = new Date("2026-07-18T14:00:00Z");
    const maquina = new MaquinaEstadoConectividad({ confirmacionesRequeridas: 2, minFallosParaDegradado: 1 }, "en_linea", ahora);

    // Primera confirmacion de "degradado".
    expect(maquina.evaluar([false, true, true], new Date(ahora.getTime() + 10_000))).toBeNull();
    // Ahora el candidato observado es "sin_conexion" (todos fallan): reinicia el contador a 1, no acumula con el anterior.
    expect(maquina.evaluar([false, false, false], new Date(ahora.getTime() + 20_000))).toBeNull();
    expect(maquina.estado).toBe("en_linea");
    // Segunda confirmacion consecutiva de "sin_conexion" -> ahora si transiciona.
    const confirmado = maquina.evaluar([false, false, false], new Date(ahora.getTime() + 30_000));
    expect(confirmado?.estadoNuevo).toBe("sin_conexion");
  });

  it("restaurar() re-siembra el estado sin disparar una transicion", () => {
    const maquina = new MaquinaEstadoConectividad({}, "en_linea", new Date("2026-07-18T10:00:00Z"));
    maquina.restaurar("sin_conexion", new Date("2026-07-18T12:00:00Z"));
    expect(maquina.estado).toBe("sin_conexion");
    expect(maquina.desde).toEqual(new Date("2026-07-18T12:00:00Z"));

    // Confirma que no quedo un candidato "colgado": evaluar el mismo estado no transiciona.
    expect(maquina.evaluar([false], new Date("2026-07-18T12:00:10Z"))).toBeNull();
  });
});
