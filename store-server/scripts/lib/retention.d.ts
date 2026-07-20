/**
 * Declaraciones de tipos para retention.js (implementacion en JS plano a
 * proposito, ver comentario de cabecera de ese archivo: se ejecuta con
 * `node` puro en el Store Server de produccion, sin depender de ts-node/build
 * de TypeScript en el camino de cron). Este .d.ts existe UNICAMENTE para que
 * `test/unit/backup-retention.spec.ts` pueda importarlo con tipos, sin tener
 * que activar `allowJs` en el tsconfig compartido con la app NestJS.
 */

export interface BackupInfo {
  nombre: string;
  fecha: Date;
}

export interface PoliticaRetencion {
  retenerDiasCompletos: number;
  retenerSemanas: number;
}

export function calcularBackupsAEliminar(
  backups: BackupInfo[],
  politica: PoliticaRetencion,
  ahora?: Date,
): string[];

export function claveIsoSemana(fecha: Date): string;

export const MS_POR_DIA: number;
