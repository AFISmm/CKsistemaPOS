/**
 * Formateo y utilidades de fecha PURAS para horarios programados
 * (HorarioTurno) — DUENO: rrhh-personal-pos.
 *
 * Vive SEPARADO de lib/rrhh/horarios.ts a proposito: ese modulo importa
 * lib/db/store (el almacen en memoria), que por convencion del proyecto es
 * server-only (ver REGLA DURA en components/*\/api.ts: el cliente solo habla
 * con el backend via fetch, nunca importa lib/db/lib/rrhh en runtime). Este
 * archivo NO importa lib/db/store — solo funciones puras sobre datos ya
 * cargados — por lo que es seguro importarlo en runtime tanto desde el
 * backend como desde componentes "use client".
 *
 * El calculo de "lunes de la semana" (lunes-domingo, UTC) se duplica aqui a
 * proposito frente a lib/rrhh/horarios.ts (claveSemanaDeFecha/claveFinDeSemana)
 * y components/empleados/AgregarHorarioModal.tsx (lunesDeSemana/domingoDeSemana):
 * es solo aritmetica de fechas (no logica de negocio como el aviso de
 * horas extra), y duplicarla evita un import runtime cruzado hacia
 * lib/db/store. Lo que SI se centraliza aqui (para NO duplicarlo) es el
 * formateo del RESUMEN de horario semanal, compartido por
 * components/shell/GestionarPerfilesModal.tsx y la columna "Horario" de
 * app/empleados/page.tsx.
 */

import type { HorarioTurno } from "../domain/types";

const DIAS_ABREV: Record<"es" | "en", string[]> = {
  es: ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"],
  en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
};

/** Lunes (YYYY-MM-DD) de la semana ISO (lunes-domingo) a la que pertenece `fechaIso`. */
export function lunesDeSemana(fechaIso: string): string {
  const d = new Date(`${fechaIso}T00:00:00.000Z`);
  const dia = d.getUTCDay(); // 0 = domingo .. 6 = sabado
  const diferenciaALunes = dia === 0 ? -6 : 1 - dia;
  const lunes = new Date(d);
  lunes.setUTCDate(d.getUTCDate() + diferenciaALunes);
  return lunes.toISOString().slice(0, 10);
}

/** Domingo (YYYY-MM-DD) de la semana ISO que empieza en el lunes dado. */
export function domingoDeSemana(lunesIso: string): string {
  const d = new Date(`${lunesIso}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + 6);
  return d.toISOString().slice(0, 10);
}

/** Lunes (YYYY-MM-DD) de la semana ISO en curso ("hoy", hora del navegador/servidor). */
export function lunesDeSemanaActual(): string {
  return lunesDeSemana(new Date().toISOString().slice(0, 10));
}

/**
 * Agrupa una lista de HorarioTurno (de cualquier cantidad de empleados) por
 * empleadoId. Util para pintar una tabla/lista de varios empleados con una
 * sola llamada a GET /api/v1/horarios?desde=&hasta= en vez de N llamadas
 * (una por empleado).
 */
export function agruparHorariosPorEmpleado(horarios: HorarioTurno[]): Map<string, HorarioTurno[]> {
  const mapa = new Map<string, HorarioTurno[]>();
  for (const h of horarios) {
    const lista = mapa.get(h.empleadoId) ?? [];
    lista.push(h);
    mapa.set(h.empleadoId, lista);
  }
  return mapa;
}

/**
 * Resumen compacto en una linea de los HorarioTurno (normalmente los de la
 * semana actual) de UN empleado, ej. "Mon 09:00-17:00, Wed 09:00-17:00, Fri
 * 09:00-17:00". Devuelve "" si `horarios` esta vacio — el llamador decide el
 * texto de "sin horario asignado" (i18n).
 *
 * UNICA fuente de este formateo: la usan components/shell/GestionarPerfilesModal.tsx
 * (panel "Gestionar perfiles") y la columna "Horario" de app/empleados/page.tsx,
 * para no duplicar el mismo string-building en los dos componentes.
 */
export function formatearResumenHorarioSemana(
  horarios: HorarioTurno[],
  idioma: "es" | "en" = "es"
): string {
  if (horarios.length === 0) return "";
  const dias = DIAS_ABREV[idioma] ?? DIAS_ABREV.es;
  const ordenados = [...horarios].sort(
    (a, b) => a.fecha.localeCompare(b.fecha) || a.horaInicioProgramada.localeCompare(b.horaInicioProgramada)
  );
  return ordenados
    .map((h) => {
      const diaSemana = new Date(`${h.fecha}T00:00:00.000Z`).getUTCDay();
      return `${dias[diaSemana]} ${h.horaInicioProgramada}-${h.horaFinProgramada}`;
    })
    .join(", ");
}
