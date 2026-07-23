/**
 * Pruebas unitarias de la logica PURA de reparto de propinas por rol
 * (lib/propinas/reparto.ts) — Fase B, revision 2026-07-22 seccion "reparto
 * de propinas por rol/puntos". Runner: Vitest (mismo patron que
 * lib/reportes/tiempos.test.ts / lib/nomina/__tests__/calculo.test.ts).
 */

import { describe, expect, test } from "vitest";
import type { Rol } from "../../domain/types";
import {
  calcularRepartoPropinas,
  empleadosQueTrabajaronTurno,
  propinaEfectivoDeTurno,
  validarPorcentajesReparto,
  type EmpleadoPresente,
} from "../reparto";

function rol(overrides: Partial<Rol> = {}): Rol {
  return {
    id: overrides.id ?? "rol-x",
    nombre: overrides.nombre ?? "rol-x",
    permisos: overrides.permisos ?? [],
    porcentajePropinaDemo: overrides.porcentajePropinaDemo,
  };
}

const ROLES_DEMO: Rol[] = [
  rol({ id: "rol-cajero", nombre: "cajero", porcentajePropinaDemo: 60 }),
  rol({ id: "rol-cocina", nombre: "cocina", porcentajePropinaDemo: 40 }),
  rol({ id: "rol-gerente", nombre: "gerenteTienda", porcentajePropinaDemo: 0 }),
];

describe("validarPorcentajesReparto", () => {
  test("suma 100 entre cajero(60)+cocina(40)+gerente(0) => sensata", () => {
    const v = validarPorcentajesReparto(ROLES_DEMO);
    expect(v.sumaPorcentajes).toBe(100);
    expect(v.sumaEsSensata).toBe(true);
  });

  test("suma distinta de 100 => NO sensata, pero no lanza", () => {
    const roles: Rol[] = [
      rol({ id: "a", porcentajePropinaDemo: 50 }),
      rol({ id: "b", porcentajePropinaDemo: 20 }),
    ];
    const v = validarPorcentajesReparto(roles);
    expect(v.sumaPorcentajes).toBe(70);
    expect(v.sumaEsSensata).toBe(false);
  });

  test("rol sin porcentajePropinaDemo configurado cuenta como 0", () => {
    const roles: Rol[] = [rol({ id: "a" }), rol({ id: "b", porcentajePropinaDemo: 100 })];
    const v = validarPorcentajesReparto(roles);
    expect(v.filas.find((f) => f.rolId === "a")?.porcentaje).toBe(0);
    expect(v.sumaPorcentajes).toBe(100);
  });
});

describe("calcularRepartoPropinas", () => {
  test("caso guiado: $100 en efectivo, 2 cajero + 1 cocina => 30/30/40, suma exacta", () => {
    const presentes: EmpleadoPresente[] = [
      { empleadoId: "emp-1", nombre: "Cajero Uno", rolId: "rol-cajero" },
      { empleadoId: "emp-2", nombre: "Cajero Dos", rolId: "rol-cajero" },
      { empleadoId: "emp-3", nombre: "Cocinero Uno", rolId: "rol-cocina" },
    ];

    const resultado = calcularRepartoPropinas(10000, presentes, ROLES_DEMO);

    expect(resultado.advertencia).toBeNull();
    expect(resultado.empleadosPresentes).toBe(3);

    const porId = new Map(resultado.filas.map((f) => [f.empleadoId, f]));
    expect(porId.get("emp-1")!.montoCentavos).toBe(3000);
    expect(porId.get("emp-2")!.montoCentavos).toBe(3000);
    expect(porId.get("emp-3")!.montoCentavos).toBe(4000);

    const sumaTotal = resultado.filas.reduce((acc, f) => acc + f.montoCentavos, 0);
    expect(sumaTotal).toBe(10000); // nunca se pierde ni se inventa un centavo
  });

  test("gerente presente pero con 0% configurado recibe 0, no rompe la normalizacion", () => {
    const presentes: EmpleadoPresente[] = [
      { empleadoId: "emp-1", nombre: "Cajero Uno", rolId: "rol-cajero" },
      { empleadoId: "emp-g", nombre: "Gerente Uno", rolId: "rol-gerente" },
    ];
    const resultado = calcularRepartoPropinas(10000, presentes, ROLES_DEMO);
    const porId = new Map(resultado.filas.map((f) => [f.empleadoId, f]));
    // Solo rol-cajero tiene % > 0 entre los presentes -> normalizado se lleva el 100%.
    expect(porId.get("emp-1")!.montoCentavos).toBe(10000);
    expect(porId.get("emp-g")!.montoCentavos).toBe(0);
    const sumaTotal = resultado.filas.reduce((acc, f) => acc + f.montoCentavos, 0);
    expect(sumaTotal).toBe(10000);
  });

  test("redondeo con residuo: $99.99, 2 cajero + 1 cocina reparte los 2 centavos sobrantes por mayor fraccion (empate -> mayor % de rol)", () => {
    const presentes: EmpleadoPresente[] = [
      { empleadoId: "emp-1", nombre: "Cajero Uno", rolId: "rol-cajero" },
      { empleadoId: "emp-2", nombre: "Cajero Dos", rolId: "rol-cajero" },
      { empleadoId: "emp-3", nombre: "Cocinero Uno", rolId: "rol-cocina" },
    ];

    const resultado = calcularRepartoPropinas(9999, presentes, ROLES_DEMO);
    const porId = new Map(resultado.filas.map((f) => [f.empleadoId, f]));

    // Exacto: cajero 9999*0.3=2999.7 (piso 2999, resto .7); cocina 9999*0.4=3999.6 (piso 3999, resto .6).
    // Sobran 9999 - (2999+2999+3999) = 2 centavos; ganan los 2 cajeros (mayor resto .7 > .6 de cocina).
    expect(porId.get("emp-1")!.montoCentavos).toBe(3000);
    expect(porId.get("emp-2")!.montoCentavos).toBe(3000);
    expect(porId.get("emp-3")!.montoCentavos).toBe(3999);

    const sumaTotal = resultado.filas.reduce((acc, f) => acc + f.montoCentavos, 0);
    expect(sumaTotal).toBe(9999);
  });

  test("ningun rol presente tiene % configurado => fallback en partes iguales, con advertencia", () => {
    const rolesSinConfigurar: Rol[] = [
      rol({ id: "rol-a", porcentajePropinaDemo: 0 }),
      rol({ id: "rol-b" }), // undefined -> 0
    ];
    const presentes: EmpleadoPresente[] = [
      { empleadoId: "emp-1", nombre: "Uno", rolId: "rol-a" },
      { empleadoId: "emp-2", nombre: "Dos", rolId: "rol-b" },
    ];
    const resultado = calcularRepartoPropinas(10000, presentes, rolesSinConfigurar);
    expect(resultado.advertencia).not.toBeNull();
    const porId = new Map(resultado.filas.map((f) => [f.empleadoId, f]));
    expect(porId.get("emp-1")!.montoCentavos).toBe(5000);
    expect(porId.get("emp-2")!.montoCentavos).toBe(5000);
  });

  test("sin empleados presentes => filas vacias, con advertencia, no lanza", () => {
    const resultado = calcularRepartoPropinas(10000, [], ROLES_DEMO);
    expect(resultado.filas).toHaveLength(0);
    expect(resultado.advertencia).not.toBeNull();
  });

  test("propina de 0 centavos => todas las filas en 0, sin advertencia (config normal)", () => {
    const presentes: EmpleadoPresente[] = [
      { empleadoId: "emp-1", nombre: "Cajero Uno", rolId: "rol-cajero" },
    ];
    const resultado = calcularRepartoPropinas(0, presentes, ROLES_DEMO);
    expect(resultado.filas[0].montoCentavos).toBe(0);
    expect(resultado.advertencia).toBeNull();
  });

  test("lanza si propinaTotalCentavos no es entero >= 0", () => {
    expect(() => calcularRepartoPropinas(-1, [], ROLES_DEMO)).toThrow();
    expect(() => calcularRepartoPropinas(1.5, [], ROLES_DEMO)).toThrow();
  });
});

describe("propinaEfectivoDeTurno", () => {
  test("suma solo pagos en efectivo Y aprobados de ESE turno", () => {
    const pagos = [
      { turnoId: "t1", metodo: "efectivo", estado: "aprobado", propina: 500 },
      { turnoId: "t1", metodo: "tarjeta", estado: "aprobado", propina: 300 }, // excluido: tarjeta
      { turnoId: "t1", metodo: "efectivo", estado: "rechazado", propina: 200 }, // excluido: no aprobado
      { turnoId: "t2", metodo: "efectivo", estado: "aprobado", propina: 999 }, // excluido: otro turno
      { turnoId: "t1", metodo: "efectivo", estado: "aprobado", propina: 100 },
    ];
    expect(propinaEfectivoDeTurno("t1", pagos)).toBe(600);
  });

  test("turno sin pagos en efectivo aprobados => 0", () => {
    expect(propinaEfectivoDeTurno("t-vacio", [])).toBe(0);
  });
});

describe("empleadosQueTrabajaronTurno", () => {
  const empleados = [
    { id: "e1", nombre: "Empleado Uno", rolId: "rol-cajero", ubicacionId: "ubic-1" },
    { id: "e2", nombre: "Empleado Dos", rolId: "rol-cocina", ubicacionId: "ubic-1" },
    { id: "e3", nombre: "Empleado Otra Tienda", rolId: "rol-cajero", ubicacionId: "ubic-2" },
  ];

  test("incluye empleados con intervalo que se solapa con la ventana del turno", () => {
    const turno = {
      ubicacionId: "ubic-1",
      abiertoEn: "2026-07-22T12:00:00.000Z",
      cerradoEn: "2026-07-22T20:00:00.000Z",
    };
    const intervalos = [
      { empleadoId: "e1", inicio: "2026-07-22T11:00:00.000Z", fin: "2026-07-22T15:00:00.000Z" }, // se solapa
      { empleadoId: "e2", inicio: "2026-07-22T19:00:00.000Z", fin: "2026-07-22T23:00:00.000Z" }, // se solapa
    ];
    const presentes = empleadosQueTrabajaronTurno(turno, intervalos, empleados);
    expect(presentes.map((p) => p.empleadoId).sort()).toEqual(["e1", "e2"]);
  });

  test("excluye intervalos que NO se solapan (antes o despues del turno)", () => {
    const turno = {
      ubicacionId: "ubic-1",
      abiertoEn: "2026-07-22T12:00:00.000Z",
      cerradoEn: "2026-07-22T20:00:00.000Z",
    };
    const intervalos = [
      { empleadoId: "e1", inicio: "2026-07-22T08:00:00.000Z", fin: "2026-07-22T11:00:00.000Z" }, // termina antes
      { empleadoId: "e2", inicio: "2026-07-22T21:00:00.000Z", fin: "2026-07-22T23:00:00.000Z" }, // empieza despues
    ];
    const presentes = empleadosQueTrabajaronTurno(turno, intervalos, empleados);
    expect(presentes).toHaveLength(0);
  });

  test("excluye empleados de OTRA ubicacion aunque el intervalo se solape", () => {
    const turno = {
      ubicacionId: "ubic-1",
      abiertoEn: "2026-07-22T12:00:00.000Z",
      cerradoEn: "2026-07-22T20:00:00.000Z",
    };
    const intervalos = [
      { empleadoId: "e3", inicio: "2026-07-22T12:00:00.000Z", fin: "2026-07-22T15:00:00.000Z" },
    ];
    const presentes = empleadosQueTrabajaronTurno(turno, intervalos, empleados);
    expect(presentes).toHaveLength(0);
  });

  test("turno todavia abierto (cerradoEn null) usa el parametro `ahora` como fin provisional", () => {
    const turno = { ubicacionId: "ubic-1", abiertoEn: "2026-07-22T12:00:00.000Z", cerradoEn: null };
    const intervalos = [
      { empleadoId: "e1", inicio: "2026-07-22T13:00:00.000Z", fin: "2026-07-22T14:00:00.000Z" },
    ];
    const presentes = empleadosQueTrabajaronTurno(
      turno,
      intervalos,
      empleados,
      "2026-07-22T18:00:00.000Z"
    );
    expect(presentes.map((p) => p.empleadoId)).toEqual(["e1"]);
  });
});
