import { abrirTurno, type AbrirTurnoInput } from "@/lib/sales/turnos";
import { respuestaError } from "@/lib/sales/http";

import { conPersistencia, getDb } from "@/lib/db/store";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/turnos?ubicacionId=&estado=&usuarioAperturaId=
 *
 * AGREGADO (Fase A, revision 2026-07-22 seccion "apertura/cierre de caja con
 * bloqueos duros"): consulta de turnos, usada por el gate de clock-out
 * (lib/shell/SesionProvider.tsx `logout`) para saber si el usuario que intenta
 * cerrar sesion tiene un `Turno` (cajon de caja) todavia abierto antes de
 * permitirle salir. Sin filtros devuelve TODOS los turnos (uso interno/QA);
 * el filtro tipico del cliente es `?ubicacionId=X&estado=abierto`.
 */
export async function GET(request: Request) {
  return conPersistencia(async () => {
    try {
      const { searchParams } = new URL(request.url);
      const ubicacionId = searchParams.get("ubicacionId");
      const estado = searchParams.get("estado");
      const usuarioAperturaId = searchParams.get("usuarioAperturaId");

      let turnos = getDb().turnos;
      if (ubicacionId) turnos = turnos.filter((t) => t.ubicacionId === ubicacionId);
      if (estado) turnos = turnos.filter((t) => t.estado === estado);
      if (usuarioAperturaId) {
        turnos = turnos.filter((t) => t.usuarioAperturaId === usuarioAperturaId);
      }

      return Response.json({ turnos });
    } catch (e) {
      return respuestaError(e);
    }
  });
}

/** POST /api/v1/turnos — abre un turno {ubicacionId?, usuarioAperturaId, fondoInicial?}. */
export async function POST(request: Request) {
  return conPersistencia(async () => {
    try {
      const body = (await request.json().catch(() => ({}))) as AbrirTurnoInput;
      const turno = abrirTurno(body);
      return Response.json({ turno }, { status: 201 });
    } catch (e) {
      return respuestaError(e);
    }
  });
}
