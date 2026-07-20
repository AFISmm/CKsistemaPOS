/**
 * Dayparts (franjas horarias) para el analisis de ventas — HU-REP-01 CA3.
 *
 * docs/requisitos.md S-04 deja los horarios EXACTOS como
 * "[SUPUESTO] ... franjas configurables ... horarios exactos a confirmar por
 * operaciones" (pendiente #5 de la seccion "Pendientes"). Este modulo
 * implementa el mecanismo CONFIGURABLE que pide S-04 (no hace falta tabla
 * nueva ni migracion: un array `{nombre, horaInicio, horaFin}` cargado por
 * env var, con un default QSR razonable como semilla documentada aqui) para
 * no bloquear F2-T3 en la validacion final de operaciones.
 *
 * Default elegido (cubre las 24h SIN huecos, cada hora cae en exactamente un
 * daypart): Madrugada 00-06, Desayuno 06-11, Almuerzo 11-15, Tarde 15-18,
 * Cena 18-24. Coincide con la lista de ejemplo de S-04
 * (Desayuno/Almuerzo/Tarde/Cena) + un bucket de madrugada para no perder
 * ventas nocturnas/de catering tardio.
 *
 * Configurable sin tocar codigo via `REPORTES_DAYPARTS_JSON` (JSON de
 * `DefinicionDaypart[]`); si falta, no parsea, o no es una lista valida, se
 * usa el default. Cuando operaciones confirme los horarios oficiales (S-04
 * pendiente), basta con setear esa env var por tienda — sin migracion.
 */
export interface DefinicionDaypart {
  nombre: string;
  /** Hora local INCLUSIVE de inicio del daypart, 0-23. */
  horaInicio: number;
  /** Hora local EXCLUSIVE de fin del daypart, 1-24. */
  horaFin: number;
}

export const DAYPARTS_DEFAULT: DefinicionDaypart[] = [
  { nombre: "Madrugada", horaInicio: 0, horaFin: 6 },
  { nombre: "Desayuno", horaInicio: 6, horaFin: 11 },
  { nombre: "Almuerzo", horaInicio: 11, horaFin: 15 },
  { nombre: "Tarde", horaInicio: 15, horaFin: 18 },
  { nombre: "Cena", horaInicio: 18, horaFin: 24 },
];

function esDefinicionValida(d: unknown): d is DefinicionDaypart {
  if (typeof d !== "object" || d === null) return false;
  const candidato = d as Record<string, unknown>;
  return (
    typeof candidato.nombre === "string" &&
    candidato.nombre.length > 0 &&
    Number.isInteger(candidato.horaInicio) &&
    Number.isInteger(candidato.horaFin) &&
    (candidato.horaInicio as number) >= 0 &&
    (candidato.horaFin as number) > (candidato.horaInicio as number) &&
    (candidato.horaFin as number) <= 24
  );
}

/**
 * Lee `REPORTES_DAYPARTS_JSON`; si falta, no parsea como JSON, no es un
 * array, esta vacio o algun elemento no cumple el shape minimo, cae al
 * default (nunca lanza — un daypart mal configurado no puede tumbar el
 * reporte del dia).
 */
export function obtenerDefinicionesDaypart(env: NodeJS.ProcessEnv = process.env): DefinicionDaypart[] {
  const raw = env.REPORTES_DAYPARTS_JSON;
  if (!raw) return DAYPARTS_DEFAULT;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return DAYPARTS_DEFAULT;
    return parsed.every(esDefinicionValida) ? (parsed as DefinicionDaypart[]) : DAYPARTS_DEFAULT;
  } catch {
    return DAYPARTS_DEFAULT;
  }
}

/**
 * Hora local (0-23) de un instante UTC en una zona horaria IANA (`Ubicacion.zonaHoraria`).
 * Pura: usa `Intl.DateTimeFormat` (sin I/O, sin Prisma) — testeable en aislamiento.
 */
export function horaLocal(fechaHora: Date, zonaHoraria: string): number {
  const formateador = new Intl.DateTimeFormat("en-US", {
    timeZone: zonaHoraria,
    hourCycle: "h23",
    hour: "2-digit",
  });
  const hora = Number(formateador.format(fechaHora));
  // Defensivo: algunas versiones de ICU devuelven "24" para la medianoche
  // incluso con hourCycle "h23"; normalizamos a 0.
  return hora === 24 ? 0 : hora;
}

/**
 * Determina el nombre del daypart de una fecha/hora dada su hora local en
 * `zonaHoraria`. Con el default (u cualquier configuracion que cubra 0-24
 * sin huecos, ver `esDefinicionValida`) siempre encuentra un match.
 */
export function bucketDaypart(
  fechaHora: Date,
  zonaHoraria: string,
  definiciones: DefinicionDaypart[] = DAYPARTS_DEFAULT,
): string {
  const hora = horaLocal(fechaHora, zonaHoraria);
  const match = definiciones.find((d) => hora >= d.horaInicio && hora < d.horaFin);
  return match?.nombre ?? "Sin clasificar";
}
