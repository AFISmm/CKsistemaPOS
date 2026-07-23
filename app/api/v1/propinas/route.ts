/**
 * GET /api/v1/propinas?desde=&hasta=&ubicacionId= — Fase B (revision
 * 2026-07-22 seccion "reparto de propinas por rol/puntos"). DUENO: nomina-pos.
 *
 * Reporte de REFERENCIA (herramienta operativa, NO contable — ver doc-comment
 * largo en lib/propinas/reparto.ts): por cada Turno de caja YA CERRADO
 * (cierre Z) cuyo `cerradoEn` cae en el rango [desde, hasta], calcula:
 *  1) la propina EN EFECTIVO de ese turno (`propinaEfectivoDeTurno`),
 *  2) los empleados que trabajaron ese turno (via marcajes/asistencia ya
 *     existentes, `empleadosQueTrabajaronTurno` — NO se toca lib/sales/engine.ts),
 *  3) el reparto calculado por rol (`calcularRepartoPropinas`), usando los %
 *     DEMO configurados en `Rol.porcentajePropinaDemo` (editables via PATCH
 *     /api/v1/roles).
 * Ademas agrega un total por empleado a lo largo de TODO el rango, para que
 * la UI (/propinas) pueda mostrar tanto el detalle por turno como un resumen
 * del periodo (mismo espiritu que /api/v1/nomina, pero por turno/efectivo en
 * vez de por periodo/horas).
 *
 * Trae marcajes de la ubicacion COMPLETOS (sin filtro de fecha): el volumen
 * de esta demo es pequeno (ver nota de escala en lib/db/store.ts) y asi se
 * evita perder intervalos que arrancan antes de `desde` o terminan despues de
 * `hasta` pero SI se solapan con un turno dentro del rango.
 */

import { conPersistencia, getDb } from "@/lib/db/store";
import { listarMarcajes, emparejarIntervalos } from "@/lib/rrhh/asistencia";
import {
  calcularRepartoPropinas,
  empleadosQueTrabajaronTurno,
  propinaEfectivoDeTurno,
  validarPorcentajesReparto,
  type ResultadoRepartoPropinas,
} from "@/lib/propinas/reparto";
import { respuestaErrorPropinas } from "@/lib/propinas/http";

export const dynamic = "force-dynamic";

function fechaISO(diasAtras: number): string {
  const d = new Date();
  d.setDate(d.getDate() - diasAtras);
  return d.toISOString().slice(0, 10);
}

/** true si `cerradoEn` (ISO datetime) cae dentro de [desde, hasta] (fechas YYYY-MM-DD, inclusive). */
function turnoEnRangoFecha(cerradoEn: string, desde: string, hasta: string): boolean {
  const fecha = cerradoEn.slice(0, 10);
  return fecha >= desde && fecha <= hasta;
}

export interface FilaTurnoPropinas {
  turnoId: string;
  ubicacionId: string;
  abiertoEn: string;
  cerradoEn: string;
  propinaEfectivoCentavos: number;
  resultado: ResultadoRepartoPropinas;
}

export async function GET(request: Request) {
  return conPersistencia(async () => {
    try {
      const { searchParams } = new URL(request.url);
      const desde = searchParams.get("desde") || fechaISO(6);
      const hasta = searchParams.get("hasta") || fechaISO(0);
      const ubicacionId = searchParams.get("ubicacionId");

      const db = getDb();

      let turnosCerrados = db.turnos.filter(
        (t) => t.estado === "cerrado" && t.cerradoEn && turnoEnRangoFecha(t.cerradoEn, desde, hasta)
      );
      if (ubicacionId) {
        turnosCerrados = turnosCerrados.filter((t) => t.ubicacionId === ubicacionId);
      }

      const validacion = validarPorcentajesReparto(db.roles);

      const empleadosBasicos = db.empleados.map((e) => ({
        id: e.id,
        nombre: e.nombre,
        rolId: e.rolId,
        ubicacionId: e.ubicacionId,
      }));

      // Marcajes/intervalos de TODAS las ubicaciones involucradas, calculados
      // una sola vez y reutilizados para cada turno (ver nota de cabecera).
      const marcajes = listarMarcajes({});
      const intervalos = emparejarIntervalos(marcajes);

      const filasTurno: FilaTurnoPropinas[] = turnosCerrados
        .sort((a, b) => (b.cerradoEn ?? "").localeCompare(a.cerradoEn ?? ""))
        .map((turno) => {
          const propinaEfectivoCentavos = propinaEfectivoDeTurno(turno.id, db.pagos);
          const presentes = empleadosQueTrabajaronTurno(turno, intervalos, empleadosBasicos);
          const resultado = calcularRepartoPropinas(propinaEfectivoCentavos, presentes, db.roles);
          return {
            turnoId: turno.id,
            ubicacionId: turno.ubicacionId,
            abiertoEn: turno.abiertoEn,
            cerradoEn: turno.cerradoEn as string,
            propinaEfectivoCentavos,
            resultado,
          };
        });

      const totalesPorEmpleado = new Map<string, { empleadoId: string; nombre: string; totalCentavos: number }>();
      for (const fila of filasTurno) {
        for (const filaEmpleado of fila.resultado.filas) {
          const actual = totalesPorEmpleado.get(filaEmpleado.empleadoId) ?? {
            empleadoId: filaEmpleado.empleadoId,
            nombre: filaEmpleado.nombre,
            totalCentavos: 0,
          };
          actual.totalCentavos += filaEmpleado.montoCentavos;
          totalesPorEmpleado.set(filaEmpleado.empleadoId, actual);
        }
      }

      return Response.json({
        desde,
        hasta,
        validacion,
        turnos: filasTurno,
        totalesPorEmpleado: [...totalesPorEmpleado.values()].sort(
          (a, b) => b.totalCentavos - a.totalCentavos
        ),
      });
    } catch (e) {
      return respuestaErrorPropinas(e);
    }
  });
}
