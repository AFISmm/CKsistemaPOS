/**
 * Unit test puro (sin FS, sin proceso hijo, sin Postgres) de la logica de
 * retencion de respaldos usada por `scripts/backup-local.sh` via
 * `scripts/lib/retention.js`. Ver el comentario de cabecera de ese archivo
 * para el esquema completo ("diario denso + semanal esparcido").
 *
 * Nota deliberada: este archivo vive en store-server/test/unit igual que el
 * resto de la suite unit (mismo runner, mismo `npm test`), pero importa un
 * modulo de `scripts/lib/`, NO de `src/` — la tarea de respaldo/recuperacion
 * es tooling de operaciones, no codigo de la aplicacion NestJS (no se toco
 * nada bajo store-server/src/*).
 */
import { calcularBackupsAEliminar, claveIsoSemana } from "../../scripts/lib/retention";

const DIA_MS = 24 * 60 * 60 * 1000;

function fechaHaceDias(ahora: Date, dias: number): Date {
  return new Date(ahora.getTime() - dias * DIA_MS);
}

describe("calcularBackupsAEliminar", () => {
  const ahora = new Date("2026-07-20T12:00:00.000Z");

  it("no elimina nada si la lista de respaldos esta vacia", () => {
    expect(calcularBackupsAEliminar([], { retenerDiasCompletos: 7, retenerSemanas: 4 }, ahora)).toEqual([]);
  });

  it("conserva TODOS los respaldos dentro de la ventana diaria, aunque haya varios el mismo dia", () => {
    const backups = [
      { nombre: "b1", fecha: fechaHaceDias(ahora, 0) },
      { nombre: "b2", fecha: fechaHaceDias(ahora, 0.25) }, // 6h antes, mismo dia
      { nombre: "b3", fecha: fechaHaceDias(ahora, 0.5) },
      { nombre: "b4", fecha: fechaHaceDias(ahora, 6.9) }, // todavia dentro de 7 dias
    ];
    const aEliminar = calcularBackupsAEliminar(backups, { retenerDiasCompletos: 7, retenerSemanas: 4 }, ahora);
    expect(aEliminar).toEqual([]);
  });

  it("fuera de la ventana diaria, conserva solo el respaldo MAS RECIENTE de cada semana ISO", () => {
    // Semana ISO 2026-W25: 15-jun al 21-jun. Dos respaldos esa semana, fuera
    // de la ventana diaria de 7 dias (ahora = 2026-07-20).
    const backups = [
      { nombre: "semana25-lunes", fecha: new Date("2026-06-15T08:00:00.000Z") },
      { nombre: "semana25-viernes", fecha: new Date("2026-06-19T20:00:00.000Z") },
    ];
    const aEliminar = calcularBackupsAEliminar(backups, { retenerDiasCompletos: 7, retenerSemanas: 8 }, ahora);
    expect(aEliminar).toEqual(["semana25-lunes"]);
  });

  it("elimina respaldos mas viejos que la ventana diaria + semanal combinada", () => {
    // retenerDiasCompletos=7 + retenerSemanas=4 => todo lo anterior a 35 dias se borra.
    const backups = [
      { nombre: "viejo", fecha: fechaHaceDias(ahora, 40) },
    ];
    const aEliminar = calcularBackupsAEliminar(backups, { retenerDiasCompletos: 7, retenerSemanas: 4 }, ahora);
    expect(aEliminar).toEqual(["viejo"]);
  });

  it("caso combinado: mezcla de diario conservado, semanal esparcido y descartes", () => {
    const backups = [
      { nombre: "hoy", fecha: fechaHaceDias(ahora, 0) }, // conservar (diario)
      { nombre: "hace3dias", fecha: fechaHaceDias(ahora, 3) }, // conservar (diario)
      { nombre: "semana2-viejo", fecha: fechaHaceDias(ahora, 12) }, // misma semana ISO que el siguiente
      { nombre: "semana2-nuevo", fecha: fechaHaceDias(ahora, 10) }, // conservar (mas reciente de su semana)
      { nombre: "muyviejo", fecha: fechaHaceDias(ahora, 100) }, // eliminar (fuera de toda ventana)
    ];
    const aEliminar = calcularBackupsAEliminar(backups, { retenerDiasCompletos: 7, retenerSemanas: 4 }, ahora);
    expect(aEliminar.sort()).toEqual(["muyviejo", "semana2-viejo"].sort());
  });

  it("con retenerSemanas=0, todo lo anterior a la ventana diaria se elimina (sin adelgazado semanal)", () => {
    const backups = [
      { nombre: "hoy", fecha: fechaHaceDias(ahora, 0) },
      { nombre: "hace10dias", fecha: fechaHaceDias(ahora, 10) },
    ];
    const aEliminar = calcularBackupsAEliminar(backups, { retenerDiasCompletos: 7, retenerSemanas: 0 }, ahora);
    expect(aEliminar).toEqual(["hace10dias"]);
  });

  it("trunca valores no enteros/negativos de la politica de forma defensiva (nunca lanza)", () => {
    const backups = [{ nombre: "b1", fecha: fechaHaceDias(ahora, 0) }];
    expect(() =>
      calcularBackupsAEliminar(backups, { retenerDiasCompletos: -5, retenerSemanas: -1 }, ahora),
    ).not.toThrow();
  });

  it("preserva el orden original de entrada en la lista de eliminados", () => {
    const backups = [
      { nombre: "viejo-a", fecha: fechaHaceDias(ahora, 50) },
      { nombre: "hoy", fecha: fechaHaceDias(ahora, 0) },
      { nombre: "viejo-b", fecha: fechaHaceDias(ahora, 60) },
    ];
    const aEliminar = calcularBackupsAEliminar(backups, { retenerDiasCompletos: 7, retenerSemanas: 4 }, ahora);
    expect(aEliminar).toEqual(["viejo-a", "viejo-b"]);
  });
});

describe("claveIsoSemana", () => {
  it("agrupa dos fechas de la misma semana ISO bajo la misma clave", () => {
    const lunes = new Date("2026-06-15T08:00:00.000Z");
    const viernes = new Date("2026-06-19T20:00:00.000Z");
    expect(claveIsoSemana(lunes)).toBe(claveIsoSemana(viernes));
  });

  it("distingue semanas ISO consecutivas", () => {
    const domingoSemanaA = new Date("2026-06-21T23:00:00.000Z");
    const lunesSemanaB = new Date("2026-06-22T01:00:00.000Z");
    expect(claveIsoSemana(domingoSemanaA)).not.toBe(claveIsoSemana(lunesSemanaB));
  });

  it("maneja el cruce de año (semana ISO que empieza en diciembre, año ISO distinto al calendario)", () => {
    // 31-dic-2025 es miercoles; su semana ISO pertenece a 2026 (jueves de esa
    // semana, 1-ene-2026, cae en 2026) — caso clasico de borde ISO-8601.
    const clave = claveIsoSemana(new Date("2025-12-31T00:00:00.000Z"));
    expect(clave.startsWith("2026-W")).toBe(true);
  });
});
