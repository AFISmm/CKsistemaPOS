/**
 * Unit tests de `evaluarUmbralMerma` (F3-T1, S-13). PUROS: no tocan
 * Prisma/DB, mismo patron que test/unit/costeo.spec.ts — todos los valores en
 * dolares ya vienen resueltos por el llamador (ver src/bajas/bajas.service.ts
 * para el envoltorio real que SI consulta Postgres).
 */
import { Decimal } from "@prisma/client/runtime/library";
import { evaluarUmbralMerma } from "../../src/bajas/merma-umbral";

describe("evaluarUmbralMerma (F3-T1, S-13)", () => {
  it("merma acumulada por debajo del umbral: no dispara alerta", () => {
    const resultado = evaluarUmbralMerma({
      valorMermaPrevia: new Decimal(1), // $1 ya aprobado en el periodo
      valorMermaNueva: new Decimal(1), // +$1 de esta aprobacion
      valorBaseRecibido: new Decimal(1000), // base de $1000
      umbralPorcentaje: new Decimal(3), // 3%
    });
    // 2 / 1000 * 100 = 0.2% < 3%
    expect(resultado.porcentajeMermaAcumulada).toBe("0.2");
    expect(resultado.yaEstabaSobreUmbralAntes).toBe(false);
    expect(resultado.superaUmbralAhora).toBe(false);
    expect(resultado.cruzoUmbralEnEstaAprobacion).toBe(false);
  });

  it("esta aprobacion es la que CRUZA el umbral (no estaba antes, si despues)", () => {
    const resultado = evaluarUmbralMerma({
      valorMermaPrevia: new Decimal(20), // 2% de 1000, todavia bajo el umbral de 3%
      valorMermaNueva: new Decimal(15), // +1.5% => total 3.5%
      valorBaseRecibido: new Decimal(1000),
      umbralPorcentaje: new Decimal(3),
    });
    expect(resultado.valorMermaAcumulada).toBe("35");
    expect(resultado.porcentajeMermaAcumulada).toBe("3.5");
    expect(resultado.yaEstabaSobreUmbralAntes).toBe(false); // 20/1000*100 = 2% <= 3%
    expect(resultado.superaUmbralAhora).toBe(true); // 35/1000*100 = 3.5% > 3%
    expect(resultado.cruzoUmbralEnEstaAprobacion).toBe(true);
  });

  it("YA estaba por encima del umbral ANTES de esta aprobacion (esta aprobacion no es la que cruza, pero sigue alertando)", () => {
    const resultado = evaluarUmbralMerma({
      valorMermaPrevia: new Decimal(50), // 5% de 1000, YA por encima del 3%
      valorMermaNueva: new Decimal(5), // +0.5%, el acumulado sigue por encima
      valorBaseRecibido: new Decimal(1000),
      umbralPorcentaje: new Decimal(3),
    });
    expect(resultado.yaEstabaSobreUmbralAntes).toBe(true); // 50/1000*100 = 5% > 3%
    expect(resultado.superaUmbralAhora).toBe(true);
    // Distincion clave: superaUmbralAhora=true pero cruzoUmbralEnEstaAprobacion=false,
    // porque YA se superaba antes de contar esta aprobacion (no es la "causante").
    expect(resultado.cruzoUmbralEnEstaAprobacion).toBe(false);
  });

  it("exactamente en el umbral (no estrictamente mayor) NO dispara alerta", () => {
    const resultado = evaluarUmbralMerma({
      valorMermaPrevia: new Decimal(0),
      valorMermaNueva: new Decimal(30), // exactamente 3% de 1000
      valorBaseRecibido: new Decimal(1000),
      umbralPorcentaje: new Decimal(3),
    });
    expect(resultado.porcentajeMermaAcumulada).toBe("3");
    expect(resultado.superaUmbralAhora).toBe(false);
  });

  it("sin base valida (0) no calcula porcentaje ni dispara alerta (evita division por cero)", () => {
    const resultado = evaluarUmbralMerma({
      valorMermaPrevia: new Decimal(0),
      valorMermaNueva: new Decimal(100),
      valorBaseRecibido: new Decimal(0),
      umbralPorcentaje: new Decimal(3),
    });
    expect(resultado.porcentajeMermaAcumulada).toBe("0");
    expect(resultado.superaUmbralAhora).toBe(false);
    expect(resultado.cruzoUmbralEnEstaAprobacion).toBe(false);
    expect(resultado.valorMermaAcumulada).toBe("100"); // el acumulado en dolares SI se calcula igual
  });

  it("base negativa (dato invalido) se trata igual que 0: no dispara alerta", () => {
    const resultado = evaluarUmbralMerma({
      valorMermaPrevia: new Decimal(0),
      valorMermaNueva: new Decimal(100),
      valorBaseRecibido: new Decimal(-10),
      umbralPorcentaje: new Decimal(3),
    });
    expect(resultado.superaUmbralAhora).toBe(false);
  });

  it("umbral configurable por Ubicacion: el mismo acumulado dispara con un umbral mas estricto y no con uno mas laxo", () => {
    const base = { valorMermaPrevia: new Decimal(0), valorMermaNueva: new Decimal(40), valorBaseRecibido: new Decimal(1000) };
    const conUmbralEstricto = evaluarUmbralMerma({ ...base, umbralPorcentaje: new Decimal(2) }); // 4% > 2%
    const conUmbralLaxo = evaluarUmbralMerma({ ...base, umbralPorcentaje: new Decimal(10) }); // 4% < 10%
    expect(conUmbralEstricto.superaUmbralAhora).toBe(true);
    expect(conUmbralLaxo.superaUmbralAhora).toBe(false);
  });
});
