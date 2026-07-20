/**
 * Logica PURA de retencion de respaldos locales (F-BACKUP, ver
 * docs/operaciones/respaldo-y-recuperacion-store-server.md y
 * store-server/scripts/backup-local.sh).
 *
 * Esquema "diario denso + semanal esparcido" (variante simplificada de
 * grandfather-father-son):
 *   - Cualquier respaldo con antiguedad <= `retenerDiasCompletos` dias se
 *     conserva COMPLETO (todos los respaldos de esa ventana, sin importar
 *     cuantos se tomaron por dia — la tienda puede correr el cron varias
 *     veces al dia, ver seccion de cron en el .sh).
 *   - Mas alla de esa ventana, y hasta `retenerDiasCompletos +
 *     retenerSemanas*7` dias de antiguedad, se conserva SOLO UN respaldo por
 *     semana ISO (el mas reciente de cada semana) — suficiente para poder
 *     volver a un punto de una semana pasada sin acumular espacio en disco
 *     indefinidamente.
 *   - Cualquier respaldo mas viejo que ambas ventanas se marca para borrar.
 *
 * Deliberadamente NO toca el sistema de archivos (sin fs, sin process.env) —
 * es puro y determinista dado `ahora`, por eso es 100% testeable sin mockear
 * nada (mismo criterio que src/reportes/dayparts.ts y src/sync/backoff.ts en
 * la app NestJS, aunque este archivo vive fuera de src/ a proposito: es
 * tooling de operaciones, no codigo de la aplicacion — ver restriccion en
 * PLAN_DE_PRODUCCION.md de no tocar store-server/src/* para esta tarea).
 */

"use strict";

const MS_POR_DIA = 24 * 60 * 60 * 1000;

/**
 * @typedef {{ nombre: string, fecha: Date }} BackupInfo
 * @typedef {{ retenerDiasCompletos: number, retenerSemanas: number }} PoliticaRetencion
 */

/**
 * Clave de semana ISO-8601 ("YYYY-Www") para una fecha, en UTC. Usa el
 * algoritmo estandar (jueves de la semana define el año ISO) para que
 * respaldos tomados el domingo de una semana y el lunes de la siguiente NUNCA
 * colapsen accidentalmente en la misma clave por un desfase de zona horaria:
 * todo el calculo es en UTC, consistente con los timestamps UTC que
 * `backup-local.sh` usa para nombrar los archivos.
 *
 * @param {Date} fecha
 * @returns {string}
 */
function claveIsoSemana(fecha) {
  const d = new Date(Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth(), fecha.getUTCDate()));
  const diaIso = d.getUTCDay() || 7; // lunes=1 ... domingo=7
  d.setUTCDate(d.getUTCDate() + 4 - diaIso); // jueves de la semana ISO actual
  const inicioAno = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const numeroSemana = Math.ceil((((d.getTime() - inicioAno.getTime()) / MS_POR_DIA) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(numeroSemana).padStart(2, "0")}`;
}

/**
 * Dada una lista de respaldos y la politica de retencion, devuelve los
 * NOMBRES de los que deben eliminarse. No muta `backups`. No falla si la
 * lista viene vacia o desordenada.
 *
 * @param {BackupInfo[]} backups
 * @param {PoliticaRetencion} politica
 * @param {Date} [ahora]
 * @returns {string[]} nombres a eliminar, en el mismo orden en que aparecian en `backups`
 */
function calcularBackupsAEliminar(backups, politica, ahora = new Date()) {
  const retenerDiasCompletos = Math.max(0, Math.trunc(politica.retenerDiasCompletos));
  const retenerSemanas = Math.max(0, Math.trunc(politica.retenerSemanas));

  const limiteDiario = new Date(ahora.getTime() - retenerDiasCompletos * MS_POR_DIA);
  const limiteSemanal = new Date(limiteDiario.getTime() - retenerSemanas * 7 * MS_POR_DIA);

  const aConservar = new Set();
  /** @type {Map<string, BackupInfo>} */
  const mejorPorSemana = new Map();

  for (const backup of backups) {
    if (backup.fecha >= limiteDiario) {
      // Dentro de la ventana diaria densa: se conserva TODO.
      aConservar.add(backup.nombre);
      continue;
    }
    if (backup.fecha >= limiteSemanal) {
      // Dentro de la ventana semanal: solo el mas reciente de cada semana ISO sobrevive.
      const clave = claveIsoSemana(backup.fecha);
      const actual = mejorPorSemana.get(clave);
      if (!actual || backup.fecha.getTime() > actual.fecha.getTime()) {
        mejorPorSemana.set(clave, backup);
      }
      continue;
    }
    // Mas viejo que ambas ventanas: se elimina (no entra a ningun set de conservacion).
  }

  for (const backup of mejorPorSemana.values()) {
    aConservar.add(backup.nombre);
  }

  return backups.filter((b) => !aConservar.has(b.nombre)).map((b) => b.nombre);
}

module.exports = { calcularBackupsAEliminar, claveIsoSemana, MS_POR_DIA };

// --------------------------------------------------------------------------
// Modo CLI: usado por backup-local.sh para decidir que archivos borrar sin
// duplicar esta logica en bash. Entrada por stdin, una linea por respaldo:
//   <epoch_ms>|<nombre_de_archivo>
// Salida por stdout: un nombre de archivo a eliminar por linea (puede ser
// vacia si no hay nada que borrar). Nunca escribe en stderr salvo error de
// parseo de argumentos (para no ensuciar la salida que bash consume).
if (require.main === module) {
  const retenerDiasCompletos = Number(process.argv[2]);
  const retenerSemanas = Number(process.argv[3]);

  if (!Number.isFinite(retenerDiasCompletos) || !Number.isFinite(retenerSemanas)) {
    process.stderr.write(
      "Uso: node retention.js <retenerDiasCompletos> <retenerSemanas> < lista_de_backups\n" +
        "  (cada linea de stdin: <epoch_ms>|<nombre_de_archivo>)\n",
    );
    process.exit(2);
  }

  let entrada = "";
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (chunk) => {
    entrada += chunk;
  });
  process.stdin.on("end", () => {
    const backups = entrada
      .split("\n")
      .map((linea) => linea.trim())
      .filter((linea) => linea.length > 0)
      .map((linea) => {
        const separador = linea.indexOf("|");
        if (separador === -1) return null;
        const epochMs = Number(linea.slice(0, separador));
        const nombre = linea.slice(separador + 1);
        if (!Number.isFinite(epochMs) || nombre.length === 0) return null;
        return { nombre, fecha: new Date(epochMs) };
      })
      .filter((x) => x !== null);

    const aEliminar = calcularBackupsAEliminar(backups, { retenerDiasCompletos, retenerSemanas });
    for (const nombre of aEliminar) {
      process.stdout.write(nombre + "\n");
    }
  });
}
