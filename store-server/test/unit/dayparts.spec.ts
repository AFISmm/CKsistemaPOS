/**
 * Unit tests puros (sin DB, sin Prisma) del bucketing de dayparts —
 * HU-REP-01 CA3 / S-04 (F2-T3). Mismo patron que
 * `test/unit/calculo-totales.spec.ts`.
 */
import {
  DAYPARTS_DEFAULT,
  bucketDaypart,
  horaLocal,
  obtenerDefinicionesDaypart,
  type DefinicionDaypart,
} from "../../src/reportes/dayparts";

describe("horaLocal", () => {
  it("convierte un instante UTC a la hora local de una zona horaria IANA", () => {
    // 2026-01-01T05:00:00Z = 2026-01-01T00:00:00-05:00 (America/New_York, EST en enero)
    expect(horaLocal(new Date("2026-01-01T05:00:00Z"), "America/New_York")).toBe(0);
    expect(horaLocal(new Date("2026-01-01T17:00:00Z"), "America/New_York")).toBe(12);
  });

  it("con zona UTC, la hora local es la hora UTC", () => {
    expect(horaLocal(new Date("2026-07-18T13:45:00Z"), "UTC")).toBe(13);
  });
});

describe("bucketDaypart (default DAYPARTS_DEFAULT)", () => {
  it.each([
    ["2026-07-18T00:30:00Z", "Madrugada"],
    ["2026-07-18T05:59:00Z", "Madrugada"],
    ["2026-07-18T06:00:00Z", "Desayuno"],
    ["2026-07-18T10:59:00Z", "Desayuno"],
    ["2026-07-18T11:00:00Z", "Almuerzo"],
    ["2026-07-18T14:59:00Z", "Almuerzo"],
    ["2026-07-18T15:00:00Z", "Tarde"],
    ["2026-07-18T17:59:00Z", "Tarde"],
    ["2026-07-18T18:00:00Z", "Cena"],
    ["2026-07-18T23:59:00Z", "Cena"],
  ])("clasifica %s como %s (zona UTC)", (isoUtc, esperado) => {
    expect(bucketDaypart(new Date(isoUtc), "UTC")).toBe(esperado);
  });

  it("las 5 franjas default cubren las 24h sin huecos ni solapes", () => {
    for (let hora = 0; hora < 24; hora++) {
      const matches = DAYPARTS_DEFAULT.filter((d) => hora >= d.horaInicio && hora < d.horaFin);
      expect(matches).toHaveLength(1);
    }
  });

  it("usa la zona horaria de la ubicacion, no UTC (RN implicita de S-04)", () => {
    // 2026-07-18T13:00:00Z = 09:00 en America/New_York (EDT, UTC-4 en julio) -> Desayuno
    const instante = new Date("2026-07-18T13:00:00Z");
    expect(bucketDaypart(instante, "America/New_York")).toBe("Desayuno");
    // El mismo instante en UTC cae en Almuerzo (13h)
    expect(bucketDaypart(instante, "UTC")).toBe("Almuerzo");
  });
});

describe("bucketDaypart con definiciones custom", () => {
  const definiciones: DefinicionDaypart[] = [
    { nombre: "Solo-manana", horaInicio: 0, horaFin: 12 },
    { nombre: "Solo-tarde", horaInicio: 12, horaFin: 24 },
  ];

  it("respeta las definiciones inyectadas en vez del default", () => {
    expect(bucketDaypart(new Date("2026-01-01T05:00:00Z"), "UTC", definiciones)).toBe("Solo-manana");
    expect(bucketDaypart(new Date("2026-01-01T15:00:00Z"), "UTC", definiciones)).toBe("Solo-tarde");
  });

  it("si las definiciones no cubren una hora, retorna 'Sin clasificar' (defensivo)", () => {
    const incompleto: DefinicionDaypart[] = [{ nombre: "SoloManana", horaInicio: 0, horaFin: 6 }];
    expect(bucketDaypart(new Date("2026-01-01T12:00:00Z"), "UTC", incompleto)).toBe("Sin clasificar");
  });
});

describe("obtenerDefinicionesDaypart", () => {
  it("sin REPORTES_DAYPARTS_JSON, retorna el default", () => {
    expect(obtenerDefinicionesDaypart({})).toEqual(DAYPARTS_DEFAULT);
  });

  it("con un JSON valido en la env var, lo usa en vez del default", () => {
    const custom = [{ nombre: "TodoElDia", horaInicio: 0, horaFin: 24 }];
    const resultado = obtenerDefinicionesDaypart({ REPORTES_DAYPARTS_JSON: JSON.stringify(custom) });
    expect(resultado).toEqual(custom);
  });

  it("con JSON invalido (no parsea), cae al default sin lanzar", () => {
    expect(obtenerDefinicionesDaypart({ REPORTES_DAYPARTS_JSON: "{no-es-json" })).toEqual(DAYPARTS_DEFAULT);
  });

  it("con un array vacio o con un elemento invalido, cae al default", () => {
    expect(obtenerDefinicionesDaypart({ REPORTES_DAYPARTS_JSON: "[]" })).toEqual(DAYPARTS_DEFAULT);
    expect(
      obtenerDefinicionesDaypart({ REPORTES_DAYPARTS_JSON: JSON.stringify([{ nombre: "X", horaInicio: 5 }]) }),
    ).toEqual(DAYPARTS_DEFAULT);
  });
});
